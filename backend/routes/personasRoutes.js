const express = require('express');
const router = express.Router();
const {
  createPersona,
  getPersonas,
  getPersonaById,
  updatePersona,
  deletePersona,
  getPersonaByDocumento
} = require('../controller/personasController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/documento/:numero_documento', getPersonaByDocumento);

// CRUD de personas
router.post('/', verifyAdminOrEmployee, createPersona);
router.get('/', verifyAdminOrEmployee, getPersonas);
router.get('/:id', getPersonaById);
router.put('/:id', verifyAdminOrEmployee, updatePersona);
router.delete('/:id', verifyAdminOrEmployee, deletePersona);

module.exports = router;

