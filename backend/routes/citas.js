const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase');
const { verifyToken } = require('../utils/authMiddleware');

// Obtener referencia a Firestore
const db = admin.firestore();

// Proteger todas las rutas de citas con autenticación de Firebase
router.use(verifyToken);

// Helper para manejar errores
const handleError = (res, error, message = 'Error en la operación') => {
  console.error(message + ':', error);
  return res.status(500).json({ 
    success: false, 
    error: error.message || message 
  });
};

// Validar formato de ID de Firestore (puede ser autogenerado o UUID)
const isValidId = (id) => {
  return id && typeof id === 'string' && id.length > 0;
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

    const payload = {
      id_paciente,
      id_medico,
      fecha_cita: admin.firestore.Timestamp.fromDate(new Date(fecha_cita)),
      motivo: motivo || null,
      estado: estado || 'pendiente',
      observaciones: observaciones || null,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: req.user.uid
    };

    // Crear documento con ID autogenerado
    const citaRef = await db.collection('citas').add(payload);
    
    // Obtener el documento creado
    const citaDoc = await citaRef.get();
    const citaData = citaDoc.data();

    return res.status(201).json({ 
      success: true, 
      data: {
        id: citaDoc.id,
        ...citaData,
        fecha_cita: citaData.fecha_cita.toDate().toISOString()
      }
    });
  } catch (err) {
    return handleError(res, err, 'Error al crear cita');
  }
});

// List citas (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, estado, from, to, limit, offset } = req.query;
    
    let query = db.collection('citas');

    // Aplicar filtros
    if (id_paciente) {
      query = query.where('id_paciente', '==', id_paciente);
    }
    if (id_medico) {
      query = query.where('id_medico', '==', id_medico);
    }
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    if (from) {
      const fromDate = admin.firestore.Timestamp.fromDate(new Date(from));
      query = query.where('fecha_cita', '>=', fromDate);
    }
    if (to) {
      const toDate = admin.firestore.Timestamp.fromDate(new Date(to));
      query = query.where('fecha_cita', '<=', toDate);
    }

    // Ordenar por fecha
    query = query.orderBy('fecha_cita', 'asc');

    // Aplicar límite y offset
    if (offset) {
      query = query.offset(parseInt(offset, 10));
    }
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    } else {
      query = query.limit(100); // Límite por defecto
    }

    const snapshot = await query.get();
    
    const citas = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      citas.push({
        id: doc.id,
        ...data,
        fecha_cita: data.fecha_cita ? data.fecha_cita.toDate().toISOString() : null,
        created_at: data.created_at ? data.created_at.toDate().toISOString() : null
      });
    });

    return res.json({ success: true, data: citas });
  } catch (err) {
    return handleError(res, err, 'Error al listar citas');
  }
});

// Get single cita
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }

    const citaDoc = await db.collection('citas').doc(id).get();
    
    if (!citaDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cita no encontrada' 
      });
    }

    const data = citaDoc.data();
    
    return res.json({ 
      success: true, 
      data: {
        id: citaDoc.id,
        ...data,
        fecha_cita: data.fecha_cita ? data.fecha_cita.toDate().toISOString() : null,
        created_at: data.created_at ? data.created_at.toDate().toISOString() : null
      }
    });
  } catch (err) {
    return handleError(res, err, 'Error al obtener cita');
  }
});

// Update cita
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }

    const updates = { ...req.body };
    
    // Agregar timestamp de actualización
    updates.updated_at = admin.firestore.FieldValue.serverTimestamp();
    updates.updated_by = req.user.uid;

    // Convertir fecha si existe
    if (updates.fecha_cita) {
      updates.fecha_cita = admin.firestore.Timestamp.fromDate(new Date(updates.fecha_cita));
    }

    // Verificar que la cita existe
    const citaRef = db.collection('citas').doc(id);
    const citaDoc = await citaRef.get();
    
    if (!citaDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cita no encontrada' 
      });
    }

    // Actualizar documento
    await citaRef.update(updates);
    
    // Obtener documento actualizado
    const updatedDoc = await citaRef.get();
    const data = updatedDoc.data();

    return res.json({ 
      success: true, 
      data: {
        id: updatedDoc.id,
        ...data,
        fecha_cita: data.fecha_cita ? data.fecha_cita.toDate().toISOString() : null,
        created_at: data.created_at ? data.created_at.toDate().toISOString() : null,
        updated_at: data.updated_at ? data.updated_at.toDate().toISOString() : null
      }
    });
  } catch (err) {
    return handleError(res, err, 'Error al actualizar cita');
  }
});

// Delete cita
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    
    if (!isValidId(id)) {
      return res.status(400).json({ 
        success: false, 
        error: 'ID inválido' 
      });
    }

    const citaRef = db.collection('citas').doc(id);
    const citaDoc = await citaRef.get();
    
    if (!citaDoc.exists) {
      return res.status(404).json({ 
        success: false, 
        error: 'Cita no encontrada' 
      });
    }

    const data = citaDoc.data();
    
    // Eliminar documento
    await citaRef.delete();

    return res.json({ 
      success: true, 
      data: {
        id: citaDoc.id,
        ...data,
        fecha_cita: data.fecha_cita ? data.fecha_cita.toDate().toISOString() : null
      },
      message: 'Cita eliminada exitosamente'
    });
  } catch (err) {
    return handleError(res, err, 'Error al eliminar cita');
  }
});

module.exports = router;
