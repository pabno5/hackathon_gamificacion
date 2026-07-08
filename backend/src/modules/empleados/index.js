const express = require('express');
const EmpleadosRepository = require('./empleados.repository');
const EmpleadosService = require('./empleados.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const validate = require('../../shared/middleware/validate.middleware');
const eventBus = require('../../shared/events/eventBus');
const schema = require('./empleados.schema');

function createEmpleadosModule() {
  const repo = new EmpleadosRepository();
  const service = new EmpleadosService(repo, eventBus);
  const router = express.Router();

  router.use(requireAuth, requireRol('admin'));

  router.get('/', asyncHandler(async (req, res) => {
    const soloActivos = req.query.activos === 'true';
    res.json(ApiResponse.success(await service.listar({ soloActivos })));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    res.json(ApiResponse.success(await service.obtenerPorId(req.params.id)));
  }));

  router.post('/', validate(schema.crear), asyncHandler(async (req, res) => {
    const e = await service.crear(req.body, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(e, 'Empleado creado'));
  }));

  router.post('/:id/desactivar', asyncHandler(async (req, res) => {
    await service.desactivar(req.params.id, req.user.id_empleado);
    res.json(ApiResponse.success({ activo: false }));
  }));

  router.post('/:id/reactivar', asyncHandler(async (req, res) => {
    await service.reactivar(req.params.id, req.user.id_empleado);
    res.json(ApiResponse.success({ activo: true }));
  }));

  router.post(
    '/:id/reiniciar-tour',
    validate(schema.reiniciarTour),
    asyncHandler(async (req, res) => {
      await service.reiniciarTour(req.params.id, req.user.id_empleado, req.body?.motivo);
      res.json(ApiResponse.success({ tour_reiniciado: true }));
    })
  );

  return router;
}

module.exports = createEmpleadosModule;
