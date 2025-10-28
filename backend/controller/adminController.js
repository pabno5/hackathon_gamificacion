const { admin } = require('../config/firebase');
const { supabase } = require('../db');

// Obtener todos los usuarios (solo administradores)
const getAllUsers = async (req, res) => {
  try {
    // Obtener usuarios de Supabase (base de datos)
    const { data: users, error } = await supabase
      .from('usuarios')
      .select('id, firebase_uid, email, nombre, rol, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Opcional: Enriquecer con datos de Firebase Auth
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      try {
        const firebaseUser = await admin.auth().getUser(user.firebase_uid);
        return {
          ...user,
          emailVerified: firebaseUser.emailVerified,
          disabled: firebaseUser.disabled,
          lastSignInTime: firebaseUser.metadata.lastSignInTime
        };
      } catch (err) {
        // Si no se encuentra en Firebase, devolver solo datos de Supabase
        return user;
      }
    }));

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener usuarios',
      error: error.message
    });
  }
};

// Eliminar un usuario (solo administradores)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener el usuario de la base de datos
    const { data: user, error: fetchError } = await supabase
      .from('usuarios')
      .select('firebase_uid')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Evitar que el administrador se elimine a sí mismo
    if (user.firebase_uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Eliminar usuario de Firebase Auth
    await admin.auth().deleteUser(user.firebase_uid);

    // Eliminar usuario de Supabase
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente de Firebase y base de datos'
    });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar usuario',
      error: error.message
    });
  }
};

// Actualizar rol de usuario (solo administradores)
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    // Validar que el rol sea válido
    if (rol !== 'administrador' && rol !== 'empleado') {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "administrador" o "empleado"'
      });
    }

    // Obtener el usuario de la base de datos
    const { data: user, error: fetchError } = await supabase
      .from('usuarios')
      .select('firebase_uid')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Evitar que el administrador cambie su propio rol
    if (user.firebase_uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    // Actualizar custom claims en Firebase
    await admin.auth().setCustomUserClaims(user.firebase_uid, {
      rol: rol
    });

    // Actualizar rol en Supabase
    const { data, error } = await supabase
      .from('usuarios')
      .update({ rol })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Rol actualizado exitosamente en Firebase y base de datos',
      user: {
        id: data.id,
        firebase_uid: data.firebase_uid,
        email: data.email,
        nombre: data.nombre,
        rol: data.rol
      }
    });
  } catch (error) {
    console.error('Error al actualizar rol:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar rol',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  deleteUser,
  updateUserRole
};



