const express = require('express');
const router = express.Router();
const { register, login, logout, getProfile } = require('../controller/authController');
const { verifyToken } = require('../utils/authMiddleware');

// Rutas públicas (no requieren autenticación)
router.post('/register', register);
router.post('/login', login);

// Rutas protegidas (requieren autenticación)
router.post('/logout', verifyToken, logout);
router.get('/profile', verifyToken, getProfile);

module.exports = router;



