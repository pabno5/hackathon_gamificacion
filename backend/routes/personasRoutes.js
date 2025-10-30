const express = require('express');
const router = express.Router();
const {
  createPersona,
  getPersonas,
  getPersonaById,
  updatePersona,
  deletePersona,
  getPersonaByDocumento,
  getPersonaByUID
} = require('../controller/personasController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// TEMPORALMENTE DESHABILITADO PARA TESTING
// TODO: Habilitar autenticación en producción
// router.use(verifyToken);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/documento/:numero_documento', getPersonaByDocumento);
// Obtener persona del usuario autenticado
router.get('/me', verifyToken, getPersonaByUID);

// CRUD de personas
router.post('/', createPersona); // verifyAdminOrEmployee deshabilitado temporalmente
router.get('/', getPersonas); // verifyAdminOrEmployee deshabilitado temporalmente
router.get('/:id', getPersonaById);
router.put('/:id', updatePersona); // verifyAdminOrEmployee deshabilitado temporalmente
router.delete('/:id', deletePersona); // verifyAdminOrEmployee deshabilitado temporalmente

module.exports = router;

