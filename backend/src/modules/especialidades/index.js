const express = require('express');
const Repo = require('./especialidades.repository');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const validate = require('../../shared/middleware/validate.middleware');
const { NotFoundError, ConflictError } = require('../../shared/errors/AppError');
const schema = require('./especialidades.schema');

function createEspecialidadesModule() {
  const repo = new Repo();
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', asyncHandler(async (req, res) => {
    const soloActivas = req.query.activas === 'true';
    const data = await repo.findAll({ soloActivas });
    res.json(ApiResponse.success(data));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const e = await repo.findById(req.params.id);
    if (!e) throw new NotFoundError('Especialidad');
    res.json(ApiResponse.success(e));
  }));

  router.post(
    '/',
    requireRol('admin'),
    validate(schema.crear),
    asyncHandler(async (req, res) => {
      const { nombre, descripcion } = req.body;
      const dup = await repo.findByNombre(nombre);
      if (dup) throw new ConflictError('La especialidad ya existe');
      const e = await repo.create({ nombre, descripcion }, req.user.id_empleado);
      res.status(201).json(ApiResponse.success(e, 'Especialidad creada'));
    })
  );

  router.put(
    '/:id',
    requireRol('admin'),
    validate(schema.actualizar),
    asyncHandler(async (req, res) => {
      const e = await repo.update(req.params.id, req.body);
      if (!e) throw new NotFoundError('Especialidad');
      res.json(ApiResponse.success(e, 'Especialidad actualizada'));
    })
  );

  return router;
}

module.exports = createEspecialidadesModule;
