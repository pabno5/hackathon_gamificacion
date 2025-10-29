const { query, transaction, admin } = require('../config/dataconnect');
const { verifyPassword } = require('./credencialesController');
const bcrypt = require('bcryptjs');

// Registrar empleado: solo datos de persona (sin credenciales ni Firebase)
const register = async (req, res) => {
  try {
    const uid = req.user.uid;

    const {
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      direccion
    } = req.body;


    // Validar campos requeridos
    if (!tipo_documento || !numero_documento || !nombres || !apellidos || !telefono) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: tipo_documento, numero_documento, nombres, apellidos, telefono'
      });
    }

    // Verificar que el numero_documento no exista ya
    const checkDoc = await query(
      'SELECT id_persona FROM personas WHERE numero_documento = $1',
      [numero_documento]
    );

    if (checkDoc.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El número de documento ya está registrado'
      });
    }

    // Crear la persona (correo se guarda como NULL)
    const personaResult = await query(
      `INSERT INTO personas (
        uid, tipo_documento, numero_documento, nombres, apellidos,
        fecha_nacimiento, telefono, direccion
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_persona, tipo_documento, numero_documento, nombres, apellidos, fecha_nacimiento, telefono, direccion`,
      [
        uid,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        fecha_nacimiento || null,
        telefono,
        direccion || null
      ]
    );

    const persona = personaResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Empleado registrado exitosamente',
      data: {
        persona
      }
    });
  } catch (error) {
    console.error('Error en registro de empleado:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar empleado',
      error: error.message
    });
  }
};

// Obtener perfil del usuario autenticado
const getProfile = async (req, res) => {
  try {
    const firebase_uid = req.user.uid;

    // Buscar credencial por firebase_uid
    const credencialResult = await query(
      `SELECT 
        c.id_credencial, c.usuario, c.firebase_uid, c.activo,
        p.id_persona, p.nombres, p.apellidos, p.correo, p.telefono, 
        p.numero_documento, p.tipo_documento, p.direccion, p.fecha_nacimiento,
        r.nombre as rol_nombre, r.descripcion as rol_descripcion
      FROM credenciales c
      INNER JOIN personas p ON c.id_persona = p.id_persona
      INNER JOIN roles r ON c.id_rol = r.id_rol
      WHERE c.firebase_uid = $1 AND c.activo = true`,
      [firebase_uid]
    );

    if (credencialResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userData = credencialResult.rows[0];

    res.status(200).json({
      success: true,
      user: {
        id_credencial: userData.id_credencial,
        usuario: userData.usuario,
        rol: userData.rol_nombre,
        rol_descripcion: userData.rol_descripcion,
        firebase_uid: userData.firebase_uid,
        activo: userData.activo,
        persona: {
          id_persona: userData.id_persona,
          nombres: userData.nombres,
          apellidos: userData.apellidos,
          correo: userData.correo,
          telefono: userData.telefono,
          numero_documento: userData.numero_documento,
          tipo_documento: userData.tipo_documento,
          direccion: userData.direccion,
          fecha_nacimiento: userData.fecha_nacimiento
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil',
      error: error.message
    });
  }
};

// Obtener solo el UID del usuario autenticado
const getUID = async (req, res) => {
  try {
    const uid = req.user.uid;

    const checkUID = await query(
      'SELECT uid FROM personas WHERE uid = $1',
      [uid]
    );

    if (checkUID.rows.length > 0) {
      return res.status(200).json({
        code: 200,
        success: true,
        message: 'UID encontrado'
      });
    }

    return res.status(404).json({
      code: 404,
      success: false,
      message: 'UID no registrado en personas'
    });
    
  } catch (error) {
    console.error('Error al obtener UID:', error);
    res.status(500).json({
      code: 500,
      success: false,
      message: 'Error al obtener UID',
      error: error.message
    });
  }
};

module.exports = {
  register,
  getProfile,
  getUID
};