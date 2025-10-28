const { query } = require('../config/dataconnect');

// Crear un documento
const createDocumento = async (req, res) => {
  try {
    const { id_persona, tipo_documento, enlace } = req.body;

    // Validar campos requeridos
    if (!id_persona || !tipo_documento || !enlace) {
      return res.status(400).json({
        success: false,
        message: 'id_persona, tipo_documento y enlace son obligatorios'
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

    // Insertar documento
    const result = await query(
      `INSERT INTO documentos (id_persona, tipo_documento, enlace)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_persona, tipo_documento, enlace]
    );

    res.status(201).json({
      success: true,
      message: 'Documento creado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al crear documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear documento',
      error: error.message
    });
  }
};

// Obtener todos los documentos con filtros
const getDocumentos = async (req, res) => {
  try {
    const { id_persona, tipo_documento, limit, offset } = req.query;

    let sqlQuery = `
      SELECT 
        d.*,
        p.nombres, p.apellidos, p.numero_documento
      FROM documentos d
      INNER JOIN personas p ON d.id_persona = p.id_persona
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (id_persona) {
      sqlQuery += ` AND d.id_persona = $${paramCount}`;
      params.push(id_persona);
      paramCount++;
    }

    if (tipo_documento) {
      sqlQuery += ` AND d.tipo_documento = $${paramCount}`;
      params.push(tipo_documento);
      paramCount++;
    }

    sqlQuery += ' ORDER BY d.fecha_subida DESC';

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
    console.error('Error al obtener documentos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos',
      error: error.message
    });
  }
};

// Obtener un documento por ID
const getDocumentoById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        d.*,
        p.nombres, p.apellidos, p.numero_documento, p.correo
      FROM documentos d
      INNER JOIN personas p ON d.id_persona = p.id_persona
      WHERE d.id_documento = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documento',
      error: error.message
    });
  }
};

// Obtener todos los documentos de una persona
const getDocumentosByPersona = async (req, res) => {
  try {
    const { id_persona } = req.params;

    // Verificar que la persona existe
    const personaCheck = await query(
      'SELECT id_persona, nombres, apellidos FROM personas WHERE id_persona = $1',
      [id_persona]
    );

    if (personaCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Persona no encontrada'
      });
    }

    const persona = personaCheck.rows[0];

    // Obtener documentos
    const result = await query(
      `SELECT * FROM documentos 
       WHERE id_persona = $1 
       ORDER BY fecha_subida DESC`,
      [id_persona]
    );

    res.json({
      success: true,
      persona: {
        id_persona: persona.id_persona,
        nombres: persona.nombres,
        apellidos: persona.apellidos
      },
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error al obtener documentos de persona:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener documentos',
      error: error.message
    });
  }
};

// Actualizar un documento
const updateDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Verificar que el documento existe
    const checkDocumento = await query(
      'SELECT * FROM documentos WHERE id_documento = $1',
      [id]
    );

    if (checkDocumento.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Construir query de actualización
    const campos = [];
    const valores = [];
    let paramCount = 1;

    const camposPermitidos = ['tipo_documento', 'enlace'];

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
      `UPDATE documentos SET ${campos.join(', ')} WHERE id_documento = $${paramCount} RETURNING *`,
      valores
    );

    res.json({
      success: true,
      message: 'Documento actualizado exitosamente',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar documento',
      error: error.message
    });
  }
};

// Eliminar un documento
const deleteDocumento = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el documento existe
    const checkDocumento = await query(
      'SELECT * FROM documentos WHERE id_documento = $1',
      [id]
    );

    if (checkDocumento.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Documento no encontrado'
      });
    }

    // Eliminar documento
    await query('DELETE FROM documentos WHERE id_documento = $1', [id]);

    res.json({
      success: true,
      message: 'Documento eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar documento:', error);

    // Manejar error de foreign key constraint (citas que referencian este documento)
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar el documento porque está asociado a una cita',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar documento',
      error: error.message
    });
  }
};

// Obtener tipos de documentos disponibles (helper)
const getTiposDocumento = async (req, res) => {
  try {
    const result = await query(
      `SELECT DISTINCT tipo_documento 
       FROM documentos 
       ORDER BY tipo_documento`
    );

    const tipos = result.rows.map(row => row.tipo_documento);

    res.json({
      success: true,
      data: tipos
    });
  } catch (error) {
    console.error('Error al obtener tipos de documento:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener tipos de documento',
      error: error.message
    });
  }
};

module.exports = {
  createDocumento,
  getDocumentos,
  getDocumentoById,
  getDocumentosByPersona,
  updateDocumento,
  deleteDocumento,
  getTiposDocumento
};

