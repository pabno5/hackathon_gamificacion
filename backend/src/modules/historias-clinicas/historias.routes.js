const express = require('express');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');

function buildRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);

  // Listar por paciente (todos los roles, recepcionista ve filtrado)
  router.get('/paciente/:id_paciente', controller.listarPorPaciente);

  // Obtener una historia
  router.get('/:id', controller.obtenerPorId);

  // Export PDF
  router.get('/:id/pdf', controller.exportarPDF);

  // Crear: solo médico/admin
  router.post('/', requireRol('medico', 'admin'), controller.crear);

  // Editar: solo médico/admin
  router.put('/:id', requireRol('medico', 'admin'), controller.actualizar);

  return router;
}

module.exports = buildRouter;
