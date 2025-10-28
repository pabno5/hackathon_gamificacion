const express = require('express');
const router = express.Router();
const {
  createMedico,
  getMedicos,
  getMedicoById,
  updateMedico,
  deleteMedico,
  asignarEspecialidad,
  removerEspecialidad
} = require('../controller/medicosController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verifyToken);

// CRUD de médicos
router.post('/', verifyAdminOrEmployee, createMedico);
router.get('/', getMedicos);
router.get('/:id', getMedicoById);
router.put('/:id', verifyAdminOrEmployee, updateMedico);
router.delete('/:id', verifyAdminOrEmployee, deleteMedico);

// Gestión de especialidades
router.post('/:id_medico/especialidades', verifyAdminOrEmployee, asignarEspecialidad);
router.delete('/:id_medico/especialidades/:id_especialidad', verifyAdminOrEmployee, removerEspecialidad);

module.exports = router;
