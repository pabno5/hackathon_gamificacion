const { query } = require('../config/dataconnect');

// Crear una especialidad
const createEspecialidad = async (req, res) => {
  try {
    const { nombre, descripcion, activa } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la especialidad es obligatorio'
      });
    }

    // Verificar que el nombre no existe
    const checkNombre = await query(
      'SELECT id_especialidad FROM especialidades WHERE nombre = $1',
      [nombre]
    );

    if (checkNombre.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una especialidad con ese nombre'
      });
    }

    // Insertar especialidad
    const result = await query(
      `INSERT INTO especialidades (nombre, descripcion, activa)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, descripcion || null, activa !== undefined ? activa : true]
    );

    res.status(201).json({
      success: true,
      message: 'Especialidad creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear especialidad',
      error: error.message
    });
  }
};

// Obtener todas las especialidades
const getEspecialidades = async (req, res) => {
  try {
    const { activa, limit, offset } = req.query;

    let sqlQuery = 'SELECT * FROM especialidades WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (activa !== undefined) {
      sqlQuery += ` AND activa = $${paramCount}`;
      params.push(activa === 'true');
      paramCount++;
    }

    sqlQuery += ' ORDER BY nombre ASC';

    if (limit) {
      sqlQuery += ` LIMIT $${paramCount}`;
      params.push(parseInt(limit, 10));
      paramCount++;
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
    console.error('Error al obtener especialidades:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener especialidades',
      error: error.message
    });
  }
};

// Obtener una especialidad por ID con sus médicos
const getEspecialidadById = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener especialidad
    const especialidadResult = await query(
      'SELECT * FROM especialidades WHERE id_especialidad = $1',
      [id]
    );

    if (especialidadResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Especialidad no encontrada'
      });
    }

    const especialidad = especialidadResult.rows[0];

    // Obtener médicos asociados a esta especialidad
    const medicosResult = await query(
      `SELECT 
        m.id_medico, m.numero_licencia,
        p.id_persona, p.nombres, p.apellidos, p.correo, p.telefono
       FROM medicos m
       INNER JOIN personas p ON m.id_persona = p.id_persona
       INNER JOIN medico_especialidad me ON m.id_medico = me.id_medico
       WHERE me.id_especialidad = $1
       ORDER BY p.apellidos, p.nombres`,
      [id]
    );

    especialidad.medicos = medicosResult.rows;

    res.json({
      success: true,
      data: especialidad
    });
  } catch (error) {
    console.error('Error al obtener especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener especialidad',
      error: error.message
    });
  }
};

// Actualizar una especialidad
const updateEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que la especialidad existe
    const checkEspecialidad = await query(
      'SELECT * FROM especialidades WHERE id_especialidad = $1',
      [id]
    );

    if (checkEspecialidad.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Especialidad no encontrada'
      });
    }

    // Si se actualiza el nombre, verificar que no esté en uso
    if (updates.nombre && updates.nombre !== checkEspecialidad.rows[0].nombre) {
      const checkNombre = await query(
        'SELECT id_especialidad FROM especialidades WHERE nombre = $1 AND id_especialidad != $2',
        [updates.nombre, id]
      );

      if (checkNombre.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una especialidad con ese nombre'
        });
      }
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = ['nombre', 'descripcion', 'activa'];

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
      `UPDATE especialidades SET ${campos.join(', ')} WHERE id_especialidad = $${paramCount} RETURNING *`,
      valores
    );

    res.json({
      success: true,
      message: 'Especialidad actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar especialidad:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar especialidad',
      error: error.message
    });
  }
};

// Eliminar una especialidad
const deleteEspecialidad = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la especialidad existe
    const checkEspecialidad = await query(
      'SELECT * FROM especialidades WHERE id_especialidad = $1',
      [id]
    );

    if (checkEspecialidad.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Especialidad no encontrada'
      });
    }

    // Eliminar especialidad (CASCADE eliminará las relaciones con médicos)
    await query('DELETE FROM especialidades WHERE id_especialidad = $1', [id]);

    res.json({
      success: true,
      message: 'Especialidad eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar especialidad:', error);

    // Manejar error de foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la especialidad porque tiene médicos asociados',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar especialidad',
      error: error.message
    });
  }
};

module.exports = {
  createEspecialidad,
  getEspecialidades,
  getEspecialidadById,
  updateEspecialidad,
  deleteEspecialidad
};

