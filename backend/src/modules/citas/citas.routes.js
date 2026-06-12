const express = require('express');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const validate = require('../../shared/middleware/validate.middleware');
const schema = require('./citas.schema');

function buildRouter(controller) {
  const router = express.Router();
  router.use(requireAuth);

  // Disponibilidad (cualquier rol)
  router.get(
    '/disponibilidad',
    validate(schema.disponibilidad, 'query'),
    controller.disponibilidad
  );

  // Listar con filtros + paginación
  router.get('/', validate(schema.listar, 'query'), controller.listar);

  // Obtener una
  router.get('/:id', controller.obtenerPorId);

  // Crear: recepcionista y admin
  router.post(
    '/',
    requireRol('recepcionista', 'admin'),
    validate(schema.crear),
    controller.crear
  );

  // Editar: recepcionista y admin
  router.put(
    '/:id',
    requireRol('recepcionista', 'admin'),
    validate(schema.actualizar),
    controller.actualizar
  );

  // Cancelar: recepcionista y admin (médico cancela vía actualizar)
  router.post(
    '/:id/cancelar',
    requireRol('recepcionista', 'admin', 'medico'),
    validate(schema.cancelar),
    controller.cancelar
  );

  return router;
}

module.exports = buildRouter;
