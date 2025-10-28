const express = require('express');
const router = express.Router();
const { query, admin } = require('../config/dataconnect');
const { verifyToken } = require('../utils/authMiddleware');

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

// Create a new cita
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, fecha_cita, motivo, estado, observaciones } = req.body;

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

    // Insertar cita
    const result = await query(
      `INSERT INTO citas (
        id_paciente, id_medico, fecha_cita, motivo, estado, observaciones
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        id_paciente,
        id_medico,
        fecha_cita,
        motivo || null,
        estado || 'pendiente',
        observaciones || null
      ]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
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

    return res.json({ 
      success: true, 
      count: result.rows.length,
      data: result.rows 
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

    return res.json({
      success: true,
      data: result.rows[0]
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

    return res.json({
      success: true,
      data: result.rows[0]
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

    // Eliminar cita
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

module.exports = router;
