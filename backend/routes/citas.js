const express = require('express');
const router = express.Router();
const multer = require('multer');
const { query, admin } = require('../config/dataconnect');
const { verifyToken } = require('../utils/authMiddleware');
const { uploadFile } = require('../config/supabase');
const { 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  syncFromGoogleCalendar
} = require('../config/googleCalendar');

// Configurar multer para almacenar archivos en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: (req, file, cb) => {
    // Aceptar cualquier tipo de archivo (puedes restringir si lo deseas)
    // Tipos permitidos comunes: pdf, jpg, png, docx, etc.
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten PDF, imágenes (JPG, PNG) y documentos (DOC, DOCX, XLS, XLSX).`), false);
    }
  }
});

// TEMPORALMENTE DESHABILITADO PARA TESTING
// TODO: Habilitar autenticación en producción
// router.use(verifyToken);

// Helper para manejar errores
const handleError = (res, error, message = 'Error en la operación') => {
  console.error(message + ':', error);
  return res.status(500).json({
    success: false,
    error: error.message || message
  });
};

// Validar UUID
const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Create a new cita (con documento opcional)
router.post('/', upload.single('documento'), async (req, res) => {
  try {
    const { id_paciente, id_medico, fecha_cita, motivo, estado, observaciones, tipo_documento } = req.body;
    const file = req.file; // Archivo opcional

    // Validar campos obligatorios
    if (!id_paciente || !id_medico || !fecha_cita) {
      return res.status(400).json({
        success: false,
        error: 'id_paciente, id_medico y fecha_cita son obligatorios'
      });
    }

    // Verificar que el paciente (persona) existe
    const pacienteCheck = await query(
      'SELECT id_persona FROM personas WHERE id_persona = $1',
      [id_paciente]
    );

    if (pacienteCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado'
      });
    }

    // Verificar que el médico existe
    const medicoCheck = await query(
      'SELECT id_medico FROM medicos WHERE id_medico = $1',
      [id_medico]
    );

    if (medicoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Médico no encontrado'
      });
    }

    let id_documento = null;

    // Si hay un archivo, procesarlo
    if (file) {
      console.log('📄 Archivo recibido:', file.originalname, `(${file.size} bytes)`);

      // Subir archivo a Supabase Storage
      const uploadResult = await uploadFile(file.buffer, file.originalname);

      if (!uploadResult.success) {
        return res.status(500).json({
          success: false,
          error: `Error al subir el archivo: ${uploadResult.error}`
        });
      }

      console.log('✅ Archivo subido a Supabase Storage:', uploadResult.url);

      // Crear registro en la tabla documentos
      const documentoResult = await query(
        `INSERT INTO documentos (id_persona, tipo_documento, enlace)
         VALUES ($1, $2, $3)
         RETURNING id_documento`,
        [
          id_paciente,
          tipo_documento || 'Documento de cita',
          uploadResult.url
        ]
      );

      id_documento = documentoResult.rows[0].id_documento;
      console.log('✅ Documento creado en BD con ID:', id_documento);
    }

    // Insertar cita (con o sin documento)
    const result = await query(
      `INSERT INTO citas (
        id_paciente, id_medico, fecha_cita, motivo, estado, observaciones, id_documento
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        id_paciente,
        id_medico,
        fecha_cita,
        motivo || null,
        estado || 'pendiente',
        observaciones || null,
        id_documento
      ]
    );

    let responseData = result.rows[0];

    // Crear evento en Google Calendar
    const googleEventId = await createCalendarEvent(responseData);
    
    // Si se creó el evento en Google Calendar, actualizar la cita con el ID
    if (googleEventId) {
      await query(
        'UPDATE citas SET google_calendar_event_id = $1 WHERE id_cita = $2',
        [googleEventId, responseData.id_cita]
      );
      responseData.google_calendar_event_id = googleEventId;
      console.log('📅 Cita sincronizada con Google Calendar');
    }

    // Si se creó un documento, incluir la información en la respuesta
    if (id_documento) {
      const documentoInfo = await query(
        'SELECT * FROM documentos WHERE id_documento = $1',
        [id_documento]
      );
      responseData.documento = documentoInfo.rows[0];
    }

    return res.status(201).json({
      success: true,
      data: responseData,
      message: file ? 'Cita creada con documento exitosamente' : 'Cita creada exitosamente'
    });
  } catch (err) {
    // Si es un error de multer
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Error al procesar el archivo: ${err.message}`
      });
    }
    
    return handleError(res, err, 'Error al crear cita');
  }
});

// List citas (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, estado, from, to, limit, offset } = req.query;

    let sqlQuery = 'SELECT * FROM citas WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (id_paciente) {
      sqlQuery += ` AND id_paciente = $${paramCount}`;
      params.push(id_paciente);
      paramCount++;
    }
    
    if (id_medico) {
      sqlQuery += ` AND id_medico = $${paramCount}`;
      params.push(id_medico);
      paramCount++;
    }
    
    if (estado) {
      sqlQuery += ` AND estado = $${paramCount}`;
      params.push(estado);
      paramCount++;
    }
    
    if (from) {
      sqlQuery += ` AND fecha_cita >= $${paramCount}`;
      params.push(from);
      paramCount++;
    }
    
    if (to) {
      sqlQuery += ` AND fecha_cita <= $${paramCount}`;
      params.push(to);
      paramCount++;
    }

    sqlQuery += ' ORDER BY fecha_cita ASC';

    if (limit) {
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit, 10));
      paramCount++;
    } else {
      sqlQuery += ' LIMIT 100';
    }

    if (offset) {
      sqlQuery += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset, 10));
    }

    const result = await query(sqlQuery, params);

    // Para cada cita, obtener el documento si existe
    const citasConDocumentos = await Promise.all(
      result.rows.map(async (cita) => {
        if (cita.id_documento) {
          const documentoResult = await query(
            'SELECT * FROM documentos WHERE id_documento = $1',
            [cita.id_documento]
          );
          
          if (documentoResult.rows.length > 0) {
            cita.documento = documentoResult.rows[0];
          }
        }
        return cita;
      })
    );

    return res.json({ 
      success: true, 
      count: citasConDocumentos.length,
      data: citasConDocumentos 
    });
  } catch (err) {
    return handleError(res, err, 'Error al listar citas');
  }
});

// Get single cita
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'ID de cita inválido' });
    }

    const result = await query(
      'SELECT * FROM citas WHERE id_cita = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    const citaData = result.rows[0];

    // Si la cita tiene un documento asociado, obtener su información
    if (citaData.id_documento) {
      const documentoResult = await query(
        'SELECT * FROM documentos WHERE id_documento = $1',
        [citaData.id_documento]
      );
      
      if (documentoResult.rows.length > 0) {
        citaData.documento = documentoResult.rows[0];
      }
    }

    return res.json({
      success: true,
      data: citaData
    });
  } catch (err) {
    return handleError(res, err, 'Error al obtener cita');
  }
});

// Update cita
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'ID de cita inválido' });
    }

    const updates = req.body;

    // Verificar que la cita existe
    const checkCita = await query(
      'SELECT * FROM citas WHERE id_cita = $1',
      [id]
    );

    if (checkCita.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    // Validar existencia de paciente/médico si se actualizan
    if (updates.id_paciente) {
      const pacienteCheck = await query(
        'SELECT id_persona FROM personas WHERE id_persona = $1',
        [updates.id_paciente]
      );
      if (pacienteCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Paciente no encontrado' });
      }
    }
    
    if (updates.id_medico) {
      const medicoCheck = await query(
        'SELECT id_medico FROM medicos WHERE id_medico = $1',
        [updates.id_medico]
      );
      if (medicoCheck.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Médico no encontrado' });
      }
    }

    // Construir query de actualización dinámicamente
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = [
      'id_paciente', 'id_medico', 'fecha_cita', 'motivo', 'estado', 'observaciones'
    ];

    camposPermitidos.forEach(campo => {
      if (updates[campo] !== undefined) {
        campos.push(`${campo} = $${paramCount}`);
        valores.push(updates[campo]);
        paramCount++;
      }
    });

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    valores.push(id);

    const result = await query(
      `UPDATE citas SET ${campos.join(', ')} WHERE id_cita = $${paramCount} RETURNING *`,
      valores
    );

    const updatedCita = result.rows[0];

    // Actualizar evento en Google Calendar si existe
    if (updatedCita.google_calendar_event_id) {
      const updated = await updateCalendarEvent(updatedCita.google_calendar_event_id, updatedCita);
      if (updated) {
        console.log('📅 Evento actualizado en Google Calendar');
      }
    }

    return res.json({
      success: true,
      data: updatedCita
    });
  } catch (err) {
    return handleError(res, err, 'Error al actualizar cita');
  }
});

// Delete cita
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, error: 'ID de cita inválido' });
    }

    // Verificar que la cita existe
    const checkCita = await query(
      'SELECT * FROM citas WHERE id_cita = $1',
      [id]
    );

    if (checkCita.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }

    const citaData = checkCita.rows[0];

    // Eliminar evento de Google Calendar si existe
    if (citaData.google_calendar_event_id) {
      const deleted = await deleteCalendarEvent(citaData.google_calendar_event_id);
      if (deleted) {
        console.log('📅 Evento eliminado de Google Calendar');
      }
    }

    // Eliminar cita de la base de datos
    await query('DELETE FROM citas WHERE id_cita = $1', [id]);

    return res.json({
      success: true,
      data: citaData,
      message: 'Cita eliminada exitosamente'
    });
  } catch (err) {
    return handleError(res, err, 'Error al eliminar cita');
  }
});

// Sincronizar citas desde Google Calendar
router.post('/sync-from-google-calendar', async (req, res) => {
  try {
    const { from, to } = req.body;

    // Validar fechas
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Las fechas "from" y "to" son obligatorias'
      });
    }

    const timeMin = new Date(from);
    const timeMax = new Date(to);

    // Obtener eventos desde Google Calendar
    const events = await syncFromGoogleCalendar(timeMin, timeMax);

    if (events.length === 0) {
      return res.json({
        success: true,
        message: 'No hay eventos nuevos para sincronizar',
        synced: 0
      });
    }

    let syncedCount = 0;
    const errors = [];

    // Procesar cada evento
    for (const event of events) {
      try {
        // Verificar si el evento ya existe en la BD
        const existingCita = await query(
          'SELECT * FROM citas WHERE google_calendar_event_id = $1',
          [event.id]
        );

        if (existingCita.rows.length > 0) {
          // El evento ya existe, saltarlo
          continue;
        }

        // Verificar si es un evento creado desde la app (tiene metadata)
        if (event.extendedProperties?.private?.citaId) {
          // Ya existe en la BD con otro ID, saltar
          continue;
        }

        // Crear nueva cita desde el evento de Google Calendar
        // Nota: Necesitarás tener paciente y médico por defecto o extraerlos de alguna manera
        const defaultPacienteResult = await query(
          'SELECT id_persona FROM personas LIMIT 1'
        );
        const defaultMedicoResult = await query(
          'SELECT id_medico FROM medicos LIMIT 1'
        );

        if (defaultPacienteResult.rows.length === 0 || defaultMedicoResult.rows.length === 0) {
          errors.push({
            eventId: event.id,
            error: 'No hay pacientes o médicos en la base de datos'
          });
          continue;
        }

        const newCita = await query(
          `INSERT INTO citas (
            id_paciente, 
            id_medico, 
            fecha_cita, 
            motivo, 
            estado, 
            observaciones,
            google_calendar_event_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *`,
          [
            defaultPacienteResult.rows[0].id_persona,
            defaultMedicoResult.rows[0].id_medico,
            new Date(event.start.dateTime || event.start.date),
            event.summary || 'Cita desde Google Calendar',
            event.status === 'cancelled' ? 'cancelada' : 'confirmada',
            event.description || null,
            event.id
          ]
        );

        syncedCount++;
        console.log('📅 Cita sincronizada desde Google Calendar:', event.id);

      } catch (error) {
        console.error('Error al sincronizar evento:', event.id, error);
        errors.push({
          eventId: event.id,
          error: error.message
        });
      }
    }

    return res.json({
      success: true,
      message: `Sincronización completada. ${syncedCount} citas importadas.`,
      synced: syncedCount,
      total: events.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (err) {
    return handleError(res, err, 'Error al sincronizar desde Google Calendar');
  }
});

module.exports = router;
