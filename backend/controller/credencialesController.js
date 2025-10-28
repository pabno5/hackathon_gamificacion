const { query, transaction, admin } = require('../config/dataconnect');
const bcrypt = require('bcryptjs');

// Crear credenciales para una persona
const createCredencial = async (req, res) => {
  try {
    const { id_persona, id_rol, usuario, contrasena, firebase_uid } = req.body;

    // Validar campos requeridos
    if (!id_persona || !id_rol || !usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'id_persona, id_rol, usuario y contraseña son obligatorios'
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

    // Verificar que el rol existe
    const rolCheck = await query(
      'SELECT id_rol FROM roles WHERE id_rol = $1',
      [id_rol]
    );

    if (rolCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Rol no encontrado'
      });
    }

    // Verificar que el usuario no existe
    const usuarioCheck = await query(
      'SELECT id_credencial FROM credenciales WHERE usuario = $1',
      [usuario]
    );

    if (usuarioCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de usuario ya está en uso'
      });
    }

    // Hashear contraseña
    const contrasenaHash = await bcrypt.hash(contrasena, 10);

    // Insertar credencial
    const result = await query(
      `INSERT INTO credenciales (
        id_persona, id_rol, usuario, contrasena_hash, firebase_uid, activo
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_credencial, id_persona, id_rol, usuario, firebase_uid, activo, fecha_creacion`,
      [id_persona, id_rol, usuario, contrasenaHash, firebase_uid || null, true]
    );

    res.status(201).json({
      success: true,
      message: 'Credencial creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear credencial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear credencial',
      error: error.message
    });
  }
};

// Obtener todas las credenciales con información de persona y rol
const getCredenciales = async (req, res) => {
  try {
    const { activo, limit, offset } = req.query;

    let sqlQuery = `
      SELECT 
        c.id_credencial, c.usuario, c.firebase_uid, c.activo, c.fecha_creacion,
        p.id_persona, p.nombres, p.apellidos, p.correo, p.numero_documento,
        r.id_rol, r.nombre as rol_nombre
      FROM credenciales c
      INNER JOIN personas p ON c.id_persona = p.id_persona
      INNER JOIN roles r ON c.id_rol = r.id_rol
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;

    if (activo !== undefined) {
      sqlQuery += ` AND c.activo = $${paramCount}`;
      params.push(activo === 'true');
      paramCount++;
    }

    sqlQuery += ' ORDER BY c.fecha_creacion DESC';

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
    console.error('Error al obtener credenciales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener credenciales',
      error: error.message
    });
  }
};

// Obtener credencial por ID
const getCredencialById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        c.id_credencial, c.usuario, c.firebase_uid, c.activo, c.fecha_creacion,
        p.id_persona, p.nombres, p.apellidos, p.correo, p.numero_documento,
        r.id_rol, r.nombre as rol_nombre
      FROM credenciales c
      INNER JOIN personas p ON c.id_persona = p.id_persona
      INNER JOIN roles r ON c.id_rol = r.id_rol
      WHERE c.id_credencial = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credencial no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener credencial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener credencial',
      error: error.message
    });
  }
};

// Buscar credencial por usuario
const getCredencialByUsuario = async (req, res) => {
  try {
    const { usuario } = req.params;

    const result = await query(
      `SELECT 
        c.id_credencial, c.usuario, c.firebase_uid, c.activo, c.fecha_creacion,
        p.id_persona, p.nombres, p.apellidos, p.correo, p.numero_documento,
        r.id_rol, r.nombre as rol_nombre
      FROM credenciales c
      INNER JOIN personas p ON c.id_persona = p.id_persona
      INNER JOIN roles r ON c.id_rol = r.id_rol
      WHERE c.usuario = $1`,
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credencial no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al buscar credencial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar credencial',
      error: error.message
    });
  }
};

// Actualizar credencial (cambiar contraseña, activar/desactivar, cambiar rol)
const updateCredencial = async (req, res) => {
  try {
    const { id } = req.params;
    const { contrasena, id_rol, activo, firebase_uid } = req.body;

    // Verificar que la credencial existe
    const checkCredencial = await query(
      'SELECT * FROM credenciales WHERE id_credencial = $1',
      [id]
    );

    if (checkCredencial.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credencial no encontrada'
      });
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];
    let paramCount = 1;

    if (contrasena) {
      const contrasenaHash = await bcrypt.hash(contrasena, 10);
      campos.push(`contrasena_hash = $${paramCount}`);
      valores.push(contrasenaHash);
      paramCount++;
    }

    if (id_rol) {
      // Verificar que el rol existe
      const rolCheck = await query('SELECT id_rol FROM roles WHERE id_rol = $1', [id_rol]);
      if (rolCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Rol no encontrado'
        });
      }
      campos.push(`id_rol = $${paramCount}`);
      valores.push(id_rol);
      paramCount++;
    }

    if (activo !== undefined) {
      campos.push(`activo = $${paramCount}`);
      valores.push(activo);
      paramCount++;
    }

    if (firebase_uid !== undefined) {
      campos.push(`firebase_uid = $${paramCount}`);
      valores.push(firebase_uid);
      paramCount++;
    }

    if (campos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay campos para actualizar'
      });
    }

    valores.push(id);

    const result = await query(
      `UPDATE credenciales SET ${campos.join(', ')} WHERE id_credencial = $${paramCount} 
       RETURNING id_credencial, id_persona, id_rol, usuario, firebase_uid, activo, fecha_creacion`,
      valores
    );

    res.json({
      success: true,
      message: 'Credencial actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar credencial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar credencial',
      error: error.message
    });
  }
};

// Eliminar credencial
const deleteCredencial = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la credencial existe
    const checkCredencial = await query(
      'SELECT * FROM credenciales WHERE id_credencial = $1',
      [id]
    );

    if (checkCredencial.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Credencial no encontrada'
      });
    }

    // Eliminar credencial
    await query('DELETE FROM credenciales WHERE id_credencial = $1', [id]);

    res.json({
      success: true,
      message: 'Credencial eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar credencial:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar credencial',
      error: error.message
    });
  }
};

// Verificar contraseña
const verifyPassword = async (usuario, contrasena) => {
  try {
    const result = await query(
      `SELECT c.*, r.nombre as rol_nombre
       FROM credenciales c
       INNER JOIN roles r ON c.id_rol = r.id_rol
       WHERE c.usuario = $1 AND c.activo = true`,
      [usuario]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const credencial = result.rows[0];
    const isValid = await bcrypt.compare(contrasena, credencial.contrasena_hash);

    if (!isValid) {
      return null;
    }

    // No devolver el hash de contraseña
    delete credencial.contrasena_hash;
    return credencial;
  } catch (error) {
    console.error('Error al verificar contraseña:', error);
    throw error;
  }
};

module.exports = {
  createCredencial,
  getCredenciales,
  getCredencialById,
  getCredencialByUsuario,
  updateCredencial,
  deleteCredencial,
  verifyPassword
};
