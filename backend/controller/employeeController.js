const { supabase } = require('../db');

// Obtener datos del dashboard (administradores y empleados)
const getDashboardData = async (req, res) => {
  try {
    // Obtener estadísticas básicas
    const { count: userCount, error: userError } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    if (userError) {
      throw userError;
    }

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
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, firebase_uid, nombre, email, rol')
      .order('nombre', { ascending: true });

    if (error) {
      throw error;
    }

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



