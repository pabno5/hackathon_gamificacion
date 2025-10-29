const { query, transaction, admin } = require('../config/dataconnect');

// Crear una persona
const createPersona = async (req, res) => {
  try {
    const { 
      tipo_documento, 
      numero_documento, 
      nombres, 
      apellidos, 
      fecha_nacimiento,
      telefono, 
      correo, 
      direccion 
    } = req.body;

    // Validar campos requeridos
    if (!tipo_documento || !numero_documento || !nombres || !apellidos) {
      return res.status(400).json({
        success: false,
        message: 'tipo_documento, numero_documento, nombres y apellidos son obligatorios'
      });
    }

    // Validar tipo de documento
    const tiposValidos = ['CC', 'TI', 'CE', 'PAS', 'NIT'];
    if (!tiposValidos.includes(tipo_documento)) {
      return res.status(400).json({
        success: false,
        message: `El tipo_documento debe ser uno de: ${tiposValidos.join(', ')}`
      });
    }

    // Verificar si el numero_documento ya existe
    const checkDoc = await query(
      'SELECT id_persona FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (checkDoc.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'El número de documento ya está registrado'
      });
    }

    // Verificar si el correo ya existe (si se proporciona)
    if (correo) {
      const checkCorreo = await query(
        'SELECT id_persona FROM personas WHERE correo = $1',
        [correo]
      );

      if (checkCorreo.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El correo ya está registrado'
        });
      }
    }

    // Insertar persona
    const result = await query(
      `INSERT INTO personas (
        tipo_documento, numero_documento, nombres, apellidos,
        fecha_nacimiento, telefono, correo, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        fecha_nacimiento || null,
        telefono || null,
        correo || null,
        direccion || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Persona creada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear persona',
      error: error.message
    });
  }
};

// Obtener todas las personas con filtros
const getPersonas = async (req, res) => {
  try {
    const { tipo_documento, search, limit, offset } = req.query;

    let sqlQuery = 'SELECT * FROM personas WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Aplicar filtros
    if (tipo_documento) {
      sqlQuery += ` AND tipo_documento = $${paramCount}`;
      params.push(tipo_documento);
      paramCount++;
    }

    if (search) {
      sqlQuery += ` AND (
        LOWER(nombres) LIKE $${paramCount} OR
        LOWER(apellidos) LIKE $${paramCount} OR
        numero_documento LIKE $${paramCount} OR
        LOWER(correo) LIKE $${paramCount}
      )`;
      params.push(`%${search.toLowerCase()}%`);
      paramCount++;
    }

    // Ordenar
    sqlQuery += ' ORDER BY fecha_registro DESC';

    // Paginación
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
    console.error('Error al obtener personas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener personas',
      error: error.message
    });
  }
};

// Obtener una persona por ID
const getPersonaById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT * FROM personas WHERE id_persona = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener persona',
      error: error.message
    });
  }
};

// Actualizar una persona
const updatePersona = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que la persona existe
    const checkPersona = await query(
      'SELECT * FROM personas WHERE id_persona = $1',
      [id]
    );

    if (checkPersona.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    const personaActual = checkPersona.rows[0];

    // Si se actualiza el correo, verificar que no esté en uso
    if (updates.correo && updates.correo !== personaActual.correo) {
      const checkCorreo = await query(
        'SELECT id_persona FROM personas WHERE correo = $1 AND id_persona != $2',
        [updates.correo, id]
      );

      if (checkCorreo.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El correo ya está en uso'
        });
      }
    }

    // Si se actualiza el numero_documento, verificar que no esté en uso
    if (updates.numero_documento && updates.numero_documento !== personaActual.numero_documento) {
      const checkDoc = await query(
        'SELECT id_persona FROM personas WHERE numero_documento = $1 AND id_persona != $2',
        [updates.numero_documento, id]
      );

      if (checkDoc.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'El número de documento ya está en uso'
        });
      }
    }

    // Construir query de actualización dinámicamente
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = [
      'tipo_documento', 'numero_documento', 'nombres', 'apellidos',
      'fecha_nacimiento', 'telefono', 'correo', 'direccion'
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
      `UPDATE personas SET ${campos.join(', ')} WHERE id_persona = $${paramCount} RETURNING *`,
      valores
    );

    res.json({
      success: true,
      message: 'Persona actualizada exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar persona',
      error: error.message
    });
  }
};

// Eliminar una persona
const deletePersona = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la persona existe
    const checkPersona = await query(
      'SELECT * FROM personas WHERE id_persona = $1',
      [id]
    );

    if (checkPersona.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    // Eliminar (las foreign keys CASCADE eliminarán registros relacionados)
    await query('DELETE FROM personas WHERE id_persona = $1', [id]);

    res.json({
      success: true,
      message: 'Persona eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    
    // Manejar error de foreign key constraint
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar la persona porque tiene registros relacionados',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar persona',
      error: error.message
    });
  }
};

// Buscar persona por documento
const getPersonaByDocumento = async (req, res) => {
  try {
    const { numero_documento } = req.params;

    const result = await query(
      'SELECT * FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    console.log(result);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al buscar persona por documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al buscar persona',
      error: error.message
    });
  }
};

module.exports = {
  createPersona,
  getPersonas,
  getPersonaById,
  updatePersona,
  deletePersona,
  getPersonaByDocumento
};
