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

// TEMPORALMENTE DESHABILITADO PARA TESTING
// TODO: Habilitar autenticación en producción
// router.use(verifyToken);

// CRUD de médicos
router.post('/', createMedico); // verifyAdminOrEmployee deshabilitado temporalmente
router.get('/', getMedicos);
router.get('/:id', getMedicoById);
router.put('/:id', updateMedico); // verifyAdminOrEmployee deshabilitado temporalmente
router.delete('/:id', deleteMedico); // verifyAdminOrEmployee deshabilitado temporalmente

// Gestión de especialidades
router.post('/:id_medico/especialidades', asignarEspecialidad); // verifyAdminOrEmployee deshabilitado temporalmente
router.delete('/:id_medico/especialidades/:id_especialidad', removerEspecialidad); // verifyAdminOrEmployee deshabilitado temporalmente

module.exports = router;
