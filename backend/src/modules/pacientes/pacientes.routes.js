const express = require('express');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const validate = require('../../shared/middleware/validate.middleware');
const schema = require('./pacientes.schema');

function buildRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);

  router.get(
    '/documento/:numero_documento',
    controller.buscarPorDocumento
  );

  router.get(
    '/',
    validate(schema.listar, 'query'),
    controller.listar
  );

  router.get('/:id', controller.obtenerPorId);

  router.post(
    '/',
    requireRol('recepcionista', 'admin'),
    validate(schema.crear),
    controller.crear
  );

  router.put(
    '/:id',
    requireRol('recepcionista', 'admin'),
    validate(schema.actualizar),
    controller.actualizar
  );

  router.delete('/:id', requireRol('admin'), controller.eliminar);

  return router;
}

module.exports = buildRouter;
