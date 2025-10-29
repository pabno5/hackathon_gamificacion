const express = require('express');
const router = express.Router();
const {
  createDocumento,
  getDocumentos,
  getDocumentoById,
  getDocumentosByPersona,
  updateDocumento,
  deleteDocumento,
  getTiposDocumento
} = require('../controller/documentosController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas específicas (deben ir antes de las rutas con parámetros)
router.get('/tipos', getTiposDocumento);
router.get('/persona/:id_persona', getDocumentosByPersona);

// CRUD de documentos
router.post('/', verifyAdminOrEmployee, createDocumento);
router.get('/', getDocumentos);
router.get('/:id', getDocumentoById);
router.put('/:id', verifyAdminOrEmployee, updateDocumento);
router.delete('/:id', verifyAdminOrEmployee, deleteDocumento);

module.exports = router;

