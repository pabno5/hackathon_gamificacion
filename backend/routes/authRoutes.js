const express = require('express');
const router = express.Router();
const { register, getProfile, getUID } = require('../controller/authController');
const { verifyToken } = require('../utils/authMiddleware');

// Registro de empleados (requiere autenticación para capturar UID)
router.post('/register', verifyToken, register);

// Rutas protegidas (requieren autenticación)
router.get('/profile', verifyToken, getProfile);
router.get('/uid', verifyToken, getUID);

module.exports = router;