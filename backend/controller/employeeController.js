const { admin } = require('../config/firebase');

// Obtener referencia a Firestore
const db = admin.firestore();

// Obtener datos del dashboard (administradores y empleados)
const getDashboardData = async (req, res) => {
  try {
    // Obtener estadísticas básicas
    const usersSnapshot = await db.collection('usuarios').get();
    const userCount = usersSnapshot.size;

    res.status(200).json({
      success: true,
      data: {
        totalUsers: userCount,
        accessedBy: {
          uid: req.user.uid,
          email: req.user.email,
          rol: req.user.rol
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error al obtener datos del dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos del dashboard',
      error: error.message
    });
  }
};

// Obtener listado simple de usuarios (administradores y empleados)
const getUsersList = async (req, res) => {
  try {
    const usersSnapshot = await db.collection('usuarios').orderBy('nombre').get();
    
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({
        uid: doc.id,
        ...doc.data()
      });
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Error al obtener lista de usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener lista de usuarios',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardData,
  getUsersList
};
