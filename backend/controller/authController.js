const { admin } = require('../config/firebase');
const { supabase } = require('../db');

// Registrar un nuevo usuario con Firebase
const register = async (req, res) => {
  try {
    const { email, password, nombre, rol } = req.body;

    // Validar campos requeridos
    if (!email || !password || !nombre || !rol) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos (email, password, nombre, rol)'
      });
    }

    // Validar que el rol sea válido
    if (rol !== 'administrador' && rol !== 'empleado') {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "administrador" o "empleado"'
      });
    }

    // Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: nombre,
      emailVerified: false
    });

    // Establecer custom claims para el rol
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      rol: rol
    });

    // Guardar datos adicionales en Supabase
    const { data: newUser, error } = await supabase
      .from('usuarios')
      .insert([
        {
          firebase_uid: userRecord.uid,
          email,
          nombre,
          rol
        }
      ])
      .select()
      .single();

    if (error) {
      // Si falla guardar en Supabase, eliminar usuario de Firebase
      await admin.auth().deleteUser(userRecord.uid);
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        uid: userRecord.uid,
        id: newUser.id,
        email: userRecord.email,
        nombre: nombre,
        rol: rol
      }
    });
  } catch (error) {
    console.error('Error en registro:', error);
    
    // Mensajes de error específicos de Firebase
    let errorMessage = 'Error al registrar usuario';
    if (error.code === 'auth/email-already-exists') {
      errorMessage = 'El correo electrónico ya está en uso';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'El correo electrónico no es válido';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres';
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
};

// Iniciar sesión con Firebase
const login = async (req, res) => {
  try {
    const { idToken } = req.body;

    // Validar que se haya proporcionado el token
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el token de Firebase (idToken)'
      });
    }

    // Verificar el token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Obtener información del usuario de Firebase
    const userRecord = await admin.auth().getUser(uid);

    // Obtener datos adicionales de Supabase (incluyendo rol)
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('firebase_uid', uid)
      .single();

    if (error || !userData) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado en la base de datos'
      });
    }

    // Crear un custom token para mantener la sesión
    const customToken = await admin.auth().createCustomToken(uid, {
      rol: userData.rol
    });

    // Configurar la cookie con el idToken
    res.cookie('authToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hora
    });

    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      customToken,
      user: {
        uid: userRecord.uid,
        id: userData.id,
        email: userRecord.email,
        nombre: userData.nombre,
        rol: userData.rol
      }
    });
  } catch (error) {
    console.error('Error en login:', error);
    
    let errorMessage = 'Error al iniciar sesión';
    if (error.code === 'auth/id-token-expired') {
      errorMessage = 'El token ha expirado';
    } else if (error.code === 'auth/invalid-id-token') {
      errorMessage = 'Token inválido';
    } else if (error.code === 'auth/user-not-found') {
      errorMessage = 'Usuario no encontrado';
    }

    res.status(401).json({
      success: false,
      message: errorMessage,
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
    const uid = req.user.uid;

    // Obtener datos de Firebase
    const userRecord = await admin.auth().getUser(uid);

    // Obtener datos de Supabase
    const { data: userData, error } = await supabase
      .from('usuarios')
      .select('id, firebase_uid, email, nombre, rol, created_at')
      .eq('firebase_uid', uid)
      .single();

    if (error || !userData) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        uid: userRecord.uid,
        id: userData.id,
        email: userRecord.email,
        nombre: userData.nombre,
        rol: userData.rol,
        emailVerified: userRecord.emailVerified,
        created_at: userData.created_at
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



