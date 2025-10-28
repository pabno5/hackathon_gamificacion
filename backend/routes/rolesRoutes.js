const express = require('express');
const router = express.Router();
const {
  createRol,
  getRoles,
  getRolById,
  updateRol,
  deleteRol
} = require('../controller/rolesController');
const { verifyToken, verifyAdmin } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Solo administradores pueden modificar roles
router.post('/', verifyAdmin, createRol);
router.get('/', getRoles);
router.get('/:id', getRolById);
router.put('/:id', verifyAdmin, updateRol);
router.delete('/:id', verifyAdmin, deleteRol);

module.exports = router;
