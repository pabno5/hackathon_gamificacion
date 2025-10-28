const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser, updateUserRole } = require('../controller/adminController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');

// Todas estas rutas requieren autenticación y rol de administrador
router.use(verifyToken);
router.use(verifyAdmin);

// Gestión de usuarios (solo administradores)
router.get('/users', getAllUsers);
router.delete('/users/:uid', deleteUser);
router.put('/users/:uid/role', updateUserRole);

module.exports = router;



