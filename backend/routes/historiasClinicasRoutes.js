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

// Obtener historias clínicas por ID de paciente (temporalmente sin autenticación)
router.get('/paciente/:id_paciente', getHistoriasClinicasByPaciente);

// Obtener historia clínica por ID (temporalmente sin autenticación)
router.get('/:id', getHistoriaClinicaById);

module.exports = router;
