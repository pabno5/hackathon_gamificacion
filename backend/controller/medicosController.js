const { query, transaction } = require('../config/dataconnect');

// Crear un médico
const createMedico = async (req, res) => {
  try {
    const { id_persona, numero_licencia } = req.body;

    if (!id_persona || !numero_licencia) {
      return res.status(400).json({
        success: false,
        message: 'id_persona y numero_licencia son obligatorios'
      });
    }

    // Verificar que la persona existe
    const personaCheck = await query(
      'SELECT id_persona FROM personas WHERE id_persona = $1',
      [id_persona]
    );

    if (personaCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // Verificar que el número de licencia no existe
    const licenciaCheck = await query(
      'SELECT id_medico FROM medicos WHERE numero_licencia = $1',
      [numero_licencia]
    );

    if (licenciaCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El número de licencia ya está registrado'
      });
    }

    // Verificar que la persona no es ya un médico
    const medicoCheck = await query(
      'SELECT id_medico FROM medicos WHERE id_persona = $1',
      [id_persona]
    );

    if (medicoCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Esta persona ya está registrada como médico'
      });
    }

    // Insertar médico
    const result = await query(
      'INSERT INTO medicos (id_persona, numero_licencia) VALUES ($1, $2) RETURNING *',
      [id_persona, numero_licencia]
    );

    res.status(201).json({
      success: true,
      message: 'Médico creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear médico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear médico',
      error: error.message
    });
  }
};

// Obtener todos los médicos con información de persona
const getMedicos = async (req, res) => {
  try {
    const { limit, offset } = req.query;

    let sqlQuery = `
      SELECT 
        m.id_medico, m.numero_licencia,
        p.id_persona, p.nombres, p.apellidos, p.correo, 
        p.telefono, p.numero_documento, p.tipo_documento
      FROM medicos m
      INNER JOIN personas p ON m.id_persona = p.id_persona
      ORDER BY p.apellidos, p.nombres ASC
    `;

    const params = [];
    let paramCount = 1;

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

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener médicos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener médicos',
      error: error.message
    });
  }
};

// Obtener un médico por ID con sus especialidades
const getMedicoById = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener médico con información de persona
    const medicoResult = await query(
      `SELECT 
        m.id_medico, m.numero_licencia,
        p.id_persona, p.nombres, p.apellidos, p.correo, 
        p.telefono, p.numero_documento, p.tipo_documento
      FROM medicos m
      INNER JOIN personas p ON m.id_persona = p.id_persona
      WHERE m.id_medico = $1`,
      [id]
    );

    if (medicoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Médico no encontrado'
      });
    }

    const medico = medicoResult.rows[0];

    // Obtener especialidades del médico
    const especialidadesResult = await query(
      `SELECT e.id_especialidad, e.nombre, e.descripcion
       FROM especialidades e
       INNER JOIN medico_especialidad me ON e.id_especialidad = me.id_especialidad
       WHERE me.id_medico = $1`,
      [id]
    );

    medico.especialidades = especialidadesResult.rows;

    res.json({
      success: true,
      data: medico
    });
  } catch (error) {
    console.error('Error al obtener médico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener médico',
      error: error.message
    });
  }
};

// Actualizar un médico
const updateMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_licencia } = req.body;

    if (!numero_licencia) {
      return res.status(400).json({
        success: false,
        message: 'numero_licencia es obligatorio'
      });
    }

    // Verificar que el médico existe
    const medicoCheck = await query(
      'SELECT * FROM medicos WHERE id_medico = $1',
      [id]
    );

    if (medicoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Médico no encontrado'
      });
    }

    // Verificar que el número de licencia no esté en uso
    const licenciaCheck = await query(
      'SELECT id_medico FROM medicos WHERE numero_licencia = $1 AND id_medico != $2',
      [numero_licencia, id]
    );

    if (licenciaCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El número de licencia ya está en uso'
      });
    }

    // Actualizar médico
    const result = await query(
      'UPDATE medicos SET numero_licencia = $1 WHERE id_medico = $2 RETURNING *',
      [numero_licencia, id]
    );

    res.json({
      success: true,
      message: 'Médico actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar médico:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar médico',
      error: error.message
    });
  }
};

// Eliminar un médico
const deleteMedico = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el médico existe
    const medicoCheck = await query(
      'SELECT * FROM medicos WHERE id_medico = $1',
      [id]
    );

    if (medicoCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Médico no encontrado'
      });
    }

    // Eliminar médico (CASCADE eliminará las relaciones con especialidades)
    await query('DELETE FROM medicos WHERE id_medico = $1', [id]);

    res.json({
      success: true,
      message: 'Médico eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar médico:', error);

    // Manejar error de foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el médico porque tiene citas asociadas',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar médico',
      error: error.message
    });
  }
};

// Asignar especialidad a un médico
const asignarEspecialidad = async (req, res) => {
  try {
    const { id_medico } = req.params;
    const { id_especialidad } = req.body;

    if (!id_especialidad) {
      return res.status(400).json({
        success: false,
        message: 'id_especialidad es obligatorio'
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
        message: 'Médico no encontrado'
      });
    }

    // Verificar que la especialidad existe
    const especialidadCheck = await query(
      'SELECT id_especialidad FROM especialidades WHERE id_especialidad = $1',
      [id_especialidad]
    );

    if (especialidadCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Especialidad no encontrada'
      });
    }

    // Verificar que la relación no existe ya
    const relacionCheck = await query(
      'SELECT * FROM medico_especialidad WHERE id_medico = $1 AND id_especialidad = $2',
      [id_medico, id_especialidad]
    );

    if (relacionCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El médico ya tiene asignada esta especialidad'
      });
    }

    // Crear relación
    const result = await query(
      'INSERT INTO medico_especialidad (id_medico, id_especialidad) VALUES ($1, $2) RETURNING *',
      [id_medico, id_especialidad]
    );

    res.status(201).json({
      success: true,
      message: 'Especialidad asignada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al asignar especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al asignar especialidad',
      error: error.message
    });
  }
};

// Remover especialidad de un médico
const removerEspecialidad = async (req, res) => {
  try {
    const { id_medico, id_especialidad } = req.params;

    // Verificar que la relación existe
    const relacionCheck = await query(
      'SELECT * FROM medico_especialidad WHERE id_medico = $1 AND id_especialidad = $2',
      [id_medico, id_especialidad]
    );

    if (relacionCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Relación no encontrada'
      });
    }

    // Eliminar relación
    await query(
      'DELETE FROM medico_especialidad WHERE id_medico = $1 AND id_especialidad = $2',
      [id_medico, id_especialidad]
    );

    res.json({
      success: true,
      message: 'Especialidad removida exitosamente'
    });
  } catch (error) {
    console.error('Error al remover especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al remover especialidad',
      error: error.message
    });
  }
};

module.exports = {
  createMedico,
  getMedicos,
  getMedicoById,
  updateMedico,
  deleteMedico,
  asignarEspecialidad,
  removerEspecialidad
};
