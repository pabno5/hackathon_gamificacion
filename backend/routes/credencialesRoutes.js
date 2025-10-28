const express = require('express');
const router = express.Router();
const {
  createCredencial,
  getCredenciales,
  getCredencialById,
  getCredencialByUsuario,
  updateCredencial,
  deleteCredencial
} = require('../controller/credencialesController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación y rol de administrador
router.use(verifyToken);
router.use(verifyAdmin);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/usuario/:usuario', getCredencialByUsuario);

// CRUD de credenciales
router.post('/', createCredencial);
router.get('/', getCredenciales);
router.get('/:id', getCredencialById);
router.put('/:id', updateCredencial);
router.delete('/:id', deleteCredencial);

module.exports = router;
