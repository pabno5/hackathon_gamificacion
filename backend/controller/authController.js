const { query, transaction, admin } = require('../config/dataconnect');
const { verifyPassword } = require('./credencialesController');
const bcrypt = require('bcryptjs');

// Registrar un nuevo usuario (crea persona + credencial)
const register = async (req, res) => {
  try {
    const {
      // Datos de persona
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      fecha_nacimiento,
      telefono,
      correo,
      direccion,
      // Datos de credencial
      usuario,
      contrasena,
      rol_nombre
    } = req.body;

    // Validar campos requeridos
    if (!tipo_documento || !numero_documento || !nombres || !apellidos || !usuario || !contrasena || !rol_nombre) {
      return res.status(400).json({
        success: false,
        message: 'Campos requeridos: tipo_documento, numero_documento, nombres, apellidos, usuario, contraseña, rol_nombre'
      });
    }

    // Usar transacción para crear persona y credencial
    const result = await transaction(async (client) => {
      // 1. Verificar que el numero_documento no existe
      const checkDoc = await client.query(
        'SELECT id_persona FROM personas WHERE numero_documento = $1',
        [numero_documento]
      );

      if (checkDoc.rows.length > 0) {
        throw new Error('El número de documento ya está registrado');
      }

      // 2. Verificar que el correo no existe (si se proporciona)
      if (correo) {
        const checkCorreo = await client.query(
          'SELECT id_persona FROM personas WHERE correo = $1',
          [correo]
        );

        if (checkCorreo.rows.length > 0) {
          throw new Error('El correo ya está registrado');
        }
      }

      // 3. Verificar que el usuario no existe
      const checkUsuario = await client.query(
        'SELECT id_credencial FROM credenciales WHERE usuario = $1',
        [usuario]
      );

      if (checkUsuario.rows.length > 0) {
        throw new Error('El nombre de usuario ya está en uso');
      }

      // 4. Buscar el rol por nombre
      const rolResult = await client.query(
        'SELECT id_rol FROM roles WHERE nombre = $1 AND activo = true',
        [rol_nombre]
      );

      if (rolResult.rows.length === 0) {
        throw new Error(`El rol "${rol_nombre}" no existe o no está activo`);
      }

      const id_rol = rolResult.rows[0].id_rol;

      // 5. Crear la persona
      const personaResult = await client.query(
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

      const persona = personaResult.rows[0];

      // 6. Hashear la contraseña
      const contrasenaHash = await bcrypt.hash(contrasena, 10);

      // 7. Crear Firebase user (opcional, para tokens)
      let firebase_uid = null;
      try {
        const firebaseUser = await admin.auth().createUser({
          email: correo || `${usuario}@temp.local`,
          password: contrasena,
          displayName: `${nombres} ${apellidos}`
        });
        firebase_uid = firebaseUser.uid;

        // Establecer custom claims
        await admin.auth().setCustomUserClaims(firebase_uid, {
          rol: rol_nombre,
          id_persona: persona.id_persona
        });
      } catch (firebaseError) {
        console.warn('No se pudo crear usuario en Firebase:', firebaseError.message);
        // Continuar sin Firebase
      }

      // 8. Crear credencial
      const credencialResult = await client.query(
        `INSERT INTO credenciales (
          id_persona, id_rol, usuario, contrasena_hash, firebase_uid, activo
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id_credencial, id_persona, id_rol, usuario, firebase_uid, activo, fecha_creacion`,
        [persona.id_persona, id_rol, usuario, contrasenaHash, firebase_uid, true]
      );

      const credencial = credencialResult.rows[0];

      return { persona, credencial, rol_nombre, firebase_uid };
    });

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        persona: result.persona,
        credencial: {
          id_credencial: result.credencial.id_credencial,
          usuario: result.credencial.usuario,
          activo: result.credencial.activo,
          fecha_creacion: result.credencial.fecha_creacion
        },
        rol: result.rol_nombre
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error al registrar usuario',
      error: error.message
    });
  }
};

// Iniciar sesión con usuario y contraseña
const login = async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    // Validar campos requeridos
    if (!usuario || !contrasena) {
      return res.status(400).json({
        success: false,
        message: 'Usuario y contraseña son requeridos'
      });
    }

    // Verificar credenciales
    const credencial = await verifyPassword(usuario, contrasena);

    if (!credencial) {
      return res.status(401).json({
        success: false,
        message: 'Usuario o contraseña incorrectos'
      });
    }

    // Obtener información de la persona
    const personaResult = await query(
      'SELECT * FROM personas WHERE id_persona = $1',
      [credencial.id_persona]
    );

    if (personaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Datos de persona no encontrados'
      });
    }

    const persona = personaResult.rows[0];

    // Generar token de Firebase si tiene firebase_uid
    let idToken = null;
    let customToken = null;

    if (credencial.firebase_uid) {
      try {
        // Crear custom token
        customToken = await admin.auth().createCustomToken(credencial.firebase_uid, {
          rol: credencial.rol_nombre,
          id_persona: persona.id_persona,
          usuario: credencial.usuario
        });

        // El frontend deberá usar este customToken para obtener un idToken
        idToken = customToken;
      } catch (firebaseError) {
        console.warn('Error al generar token de Firebase:', firebaseError.message);
      }
    }

    // Configurar cookie con un identificador de sesión (si se usa idToken)
    if (idToken) {
      res.cookie('authToken', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
      });
    }

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      customToken,
      user: {
        id_credencial: credencial.id_credencial,
        usuario: credencial.usuario,
        rol: credencial.rol_nombre,
        firebase_uid: credencial.firebase_uid,
        persona: {
          id_persona: persona.id_persona,
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          correo: persona.correo,
          telefono: persona.telefono,
          numero_documento: persona.numero_documento
        }
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
      error: error.message
    });
  }
};

// Cerrar sesión
const logout = (req, res) => {
  try {
    // Limpiar la cookie
    res.clearCookie('authToken');

    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cerrar sesión',
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

module.exports = {
  register,
  login,
  logout,
  getProfile
};
