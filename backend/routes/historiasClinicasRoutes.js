const express = require('express');
const router = express.Router();
const {
  createHistoriaClinica,
  getHistoriasClinicasByPaciente,
  getHistoriaClinicaById
} = require('../controller/historiasClinicasController');
const { verifyToken } = require('../utils/authMiddleware');

// Crear historia clínica (requiere autenticación)
router.post('/', verifyToken, createHistoriaClinica);

// Obtener historias clínicas por ID de paciente
router.get('/paciente/:id_paciente', verifyToken, getHistoriasClinicasByPaciente);

// Obtener historia clínica por ID
router.get('/:id', verifyToken, getHistoriaClinicaById);

module.exports = router;
