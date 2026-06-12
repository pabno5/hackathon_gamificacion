const express = require('express');
const GamificacionRepository = require('./gamificacion.repository');
const GamificacionService = require('./gamificacion.service');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const { ValidationError } = require('../../shared/errors/AppError');
const eventBus = require('../../shared/events/eventBus');

function createGamificacionModule() {
  const repo = new GamificacionRepository();
  const service = new GamificacionService(repo, eventBus);
  const router = express.Router();

  router.use(requireAuth);

  // Pasos del tour del rol del usuario autenticado
  router.get('/tour', asyncHandler(async (req, res) => {
    const pasos = await service.tourDelRol(req.user.rol);
    res.json(ApiResponse.success({
      pasos,
      primer_login: req.user.primer_login,
    }));
  }));

  // Progreso propio (detalle + resumen) — para barra de progreso
  router.get('/mi-progreso', asyncHandler(async (req, res) => {
    res.json(ApiResponse.success(await service.miProgreso(req.user.id_empleado)));
  }));

  // Marcar feature visitada (idempotente). Body: { codigo: 'R-01' }
  router.post('/visitar', asyncHandler(async (req, res) => {
    const { codigo } = req.body || {};
    if (!codigo) throw new ValidationError('codigo es requerido');
    const resumen = await service.marcarVisitada(
      req.user.id_empleado, req.user.rol, codigo
    );
    res.json(ApiResponse.success(resumen));
  }));

  // Dashboard admin: progreso de todos los empleados
  router.get('/resumen', requireRol('admin'), asyncHandler(async (_req, res) => {
    res.json(ApiResponse.success(await service.resumenTodos()));
  }));

  return router;
}

module.exports = createGamificacionModule;
