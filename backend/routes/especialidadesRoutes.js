const express = require('express');
const router = express.Router();
const {
  createEspecialidad,
  getEspecialidades,
  getEspecialidadById,
  updateEspecialidad,
  deleteEspecialidad
} = require('../controller/especialidadesController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// Rutas públicas (para usuarios autenticados)
router.get('/', getEspecialidades);
router.get('/:id', getEspecialidadById);

// Rutas administrativas (solo admin o empleado)
router.post('/', verifyAdminOrEmployee, createEspecialidad);
router.put('/:id', verifyAdminOrEmployee, updateEspecialidad);
router.delete('/:id', verifyAdminOrEmployee, deleteEspecialidad);
module.exports = router;

