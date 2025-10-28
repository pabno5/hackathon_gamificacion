const { query } = require('../config/dataconnect');

// Crear un rol
const createRol = async (req, res) => {
  try {
    const { nombre, descripcion, activo } = req.body;

    if (!nombre) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del rol es obligatorio'
      });
    }

    // Verificar que el nombre no existe
    const checkNombre = await query(
      'SELECT id_rol FROM roles WHERE nombre = $1',
      [nombre]
    );

    if (checkNombre.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un rol con ese nombre'
      });
    }

    // Insertar rol
    const result = await query(
      `INSERT INTO roles (nombre, descripcion, activo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [nombre, descripcion || null, activo !== undefined ? activo : true]
    );

    res.status(201).json({
      success: true,
      message: 'Rol creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear rol',
      error: error.message
    });
  }
};

// Obtener todos los roles
const getRoles = async (req, res) => {
  try {
    const { activo, limit, offset } = req.query;

    let sqlQuery = 'SELECT * FROM roles WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (activo !== undefined) {
      sqlQuery += ` AND activo = $${paramCount}`;
      params.push(activo === 'true');
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
    console.error('Error al obtener roles:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener roles',
      error: error.message
    });
  }
};

// Obtener un rol por ID
const getRolById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM roles WHERE id_rol = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener rol',
      error: error.message
    });
  }
};

// Actualizar un rol
const updateRol = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el rol existe
    const checkRol = await query(
      'SELECT * FROM roles WHERE id_rol = $1',
      [id]
    );

    if (checkRol.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Si se actualiza el nombre, verificar que no esté en uso
    if (updates.nombre && updates.nombre !== checkRol.rows[0].nombre) {
      const checkNombre = await query(
        'SELECT id_rol FROM roles WHERE nombre = $1 AND id_rol != $2',
        [updates.nombre, id]
      );

      if (checkNombre.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un rol con ese nombre'
        });
      }
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = ['nombre', 'descripcion', 'activo'];

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
      `UPDATE roles SET ${campos.join(', ')} WHERE id_rol = $${paramCount} RETURNING *`,
      valores
    );

    res.json({
      success: true,
      message: 'Rol actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar rol',
      error: error.message
    });
  }
};

// Eliminar un rol
const deleteRol = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el rol existe
    const checkRol = await query(
      'SELECT * FROM roles WHERE id_rol = $1',
      [id]
    );

    if (checkRol.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Eliminar rol
    await query('DELETE FROM roles WHERE id_rol = $1', [id]);

    res.json({
      success: true,
      message: 'Rol eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar rol:', error);

    // Manejar error de foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el rol porque está siendo usado por credenciales',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar rol',
      error: error.message
    });
  }
};

module.exports = {
  createRol,
  getRoles,
  getRolById,
  updateRol,
  deleteRol
};
