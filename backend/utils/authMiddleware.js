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
    
    // Agregar los datos del usuario al request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      rol: decodedToken.rol || null // El rol está en custom claims
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
const verifyAdmin = (req, res, next) => {
  if (req.user.rol !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador.'
    });
  }
  next();
};

// Middleware para verificar si el usuario es administrador o empleado
const verifyAdminOrEmployee = (req, res, next) => {
  if (req.user.rol !== 'administrador' && req.user.rol !== 'empleado') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requiere rol de administrador o empleado.'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyAdminOrEmployee
};



