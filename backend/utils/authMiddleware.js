const { admin } = require('../config/firebase');

// Middleware para verificar si el usuario está autenticado con Firebase
const verifyToken = async (req, res, next) => {
  try {
    // Obtener el token de las cookies o del header Authorization
    let idToken = req.cookies.authToken;
    
    if (!idToken && req.headers.authorization) {
      // También permitir el token en el header Authorization
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        idToken = authHeader.substring(7);
      }
    }

    if (!idToken) {
      return res.status(401).json({
        success: false,
        message: 'Acceso denegado. No se proporcionó token de autenticación.'
      });
    }

    // Verificar el token de Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Agregar solo el UID del usuario al request
    req.user = {
      uid: decodedToken.uid
    };

    next();
  } catch (error) {
    console.error('Error en verificación de token:', error);
    
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado. Por favor, inicia sesión nuevamente.'
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Token inválido.',
      error: error.message
    });
  }
};

// Middleware para verificar si el usuario es administrador
const verifyAdmin = async (req, res, next) => {
  try {
    // Obtener el rol del usuario desde Firestore usando el UID
    const userDoc = await admin.firestore().collection('usuarios').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }
    
    const userData = userDoc.data();
    
    if (userData.rol !== 'administrador') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en verificación de administrador:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
};

// Middleware para verificar si el usuario es administrador o empleado
const verifyAdminOrEmployee = async (req, res, next) => {
  try {
    // Obtener el rol del usuario desde Firestore usando el UID
    const userDoc = await admin.firestore().collection('usuarios').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado.'
      });
    }
    
    const userData = userDoc.data();
    
    if (userData.rol !== 'administrador' && userData.rol !== 'empleado') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de administrador o empleado.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en verificación de rol:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor.'
    });
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyAdminOrEmployee
};