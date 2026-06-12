const express = require('express');
const Repo = require('./medicos.repository');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const {
  ValidationError, NotFoundError, ConflictError,
} = require('../../shared/errors/AppError');

function createMedicosModule() {
  const repo = new Repo();
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', asyncHandler(async (_req, res) => {
    res.json(ApiResponse.success(await repo.findAll()));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const m = await repo.findById(req.params.id);
    if (!m) throw new NotFoundError('Médico');
    res.json(ApiResponse.success(m));
  }));

  // Crear médico (solo admin): liga un empleado existente con un número de licencia
  router.post('/', requireRol('admin'), asyncHandler(async (req, res) => {
    const { id_empleado, numero_licencia } = req.body || {};
    if (!id_empleado) throw new ValidationError('id_empleado requerido');
    if (!numero_licencia) throw new ValidationError('numero_licencia requerido');

    if (await repo.findByEmpleado(id_empleado)) {
      throw new ConflictError('Este empleado ya está registrado como médico');
    }
    if (await repo.findByLicencia(numero_licencia)) {
      throw new ConflictError('Ya existe un médico con esa licencia');
    }
    const m = await repo.create({ id_empleado, numero_licencia }, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(m, 'Médico creado'));
  }));

  // Especialidades del médico
  router.post('/:id/especialidades', requireRol('admin'), asyncHandler(async (req, res) => {
    const { id_especialidad } = req.body || {};
    if (!id_especialidad) throw new ValidationError('id_especialidad requerido');
    await repo.asignarEspecialidad(req.params.id, id_especialidad, req.user.id_empleado);
    res.json(ApiResponse.success({ asignada: true }));
  }));

  router.delete('/:id/especialidades/:id_esp', requireRol('admin'), asyncHandler(async (req, res) => {
    const ok = await repo.removerEspecialidad(req.params.id, req.params.id_esp);
    if (!ok) throw new NotFoundError('Especialidad asignada');
    res.json(ApiResponse.success({ removida: true }));
  }));

  // Sedes del médico
  router.post('/:id/sedes', requireRol('admin'), asyncHandler(async (req, res) => {
    const { id_sede } = req.body || {};
    if (!id_sede) throw new ValidationError('id_sede requerido');
    await repo.asignarSede(req.params.id, id_sede, req.user.id_empleado);
    res.json(ApiResponse.success({ asignada: true }));
  }));

  router.delete('/:id/sedes/:id_sede', requireRol('admin'), asyncHandler(async (req, res) => {
    const ok = await repo.removerSede(req.params.id, req.params.id_sede);
    if (!ok) throw new NotFoundError('Sede asignada');
    res.json(ApiResponse.success({ removida: true }));
  }));

  return router;
}

module.exports = createMedicosModule;
