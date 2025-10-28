const { admin } = require('../config/firebase');

// Obtener referencia a Firestore
const db = admin.firestore();

// Obtener todos los usuarios (solo administradores)
const getAllUsers = async (req, res) => {
  try {
    // Obtener usuarios de Firestore
    const usersSnapshot = await db.collection('usuarios').orderBy('created_at', 'desc').get();
    
    const users = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      try {
        // Enriquecer con datos de Firebase Auth
        const firebaseUser = await admin.auth().getUser(doc.id);
        users.push({
          uid: doc.id,
          email: firebaseUser.email,
          nombre: userData.nombre,
          rol: userData.rol,
          created_at: userData.created_at,
          emailVerified: firebaseUser.emailVerified,
          disabled: firebaseUser.disabled,
          lastSignInTime: firebaseUser.metadata.lastSignInTime
        });
      } catch (err) {
        // Si no se encuentra en Firebase, devolver solo datos de Firestore
        users.push({
          uid: doc.id,
          ...userData
        });
      }
    }

    res.status(200).json({
      success: true,
      count: users.length,
      users
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
    const { uid } = req.params;

    // Evitar que el administrador se elimine a sí mismo
    if (uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    // Verificar que el usuario existe en Firestore
    const userDoc = await db.collection('usuarios').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar usuario de Firebase Auth
    await admin.auth().deleteUser(uid);

    // Eliminar usuario de Firestore
    await db.collection('usuarios').doc(uid).delete();

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
    const { uid } = req.params;
    const { rol } = req.body;

    // Validar que el rol sea válido
    if (rol !== 'administrador' && rol !== 'empleado') {
      return res.status(400).json({
        success: false,
        message: 'El rol debe ser "administrador" o "empleado"'
      });
    }

    // Evitar que el administrador cambie su propio rol
    if (uid === req.user.uid) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    // Verificar que el usuario existe
    const userDoc = await db.collection('usuarios').doc(uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Actualizar custom claims en Firebase
    await admin.auth().setCustomUserClaims(uid, {
      rol: rol
    });

    // Actualizar rol en Firestore
    await db.collection('usuarios').doc(uid).update({
      rol: rol,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // Obtener datos actualizados
    const updatedDoc = await db.collection('usuarios').doc(uid).get();
    const userData = updatedDoc.data();

    res.status(200).json({
      success: true,
      message: 'Rol actualizado exitosamente en Firebase y base de datos',
      user: {
        uid: uid,
        email: userData.email,
        nombre: userData.nombre,
        rol: userData.rol
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
