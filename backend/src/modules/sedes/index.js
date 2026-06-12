const express = require('express');
const Repo = require('./sedes.repository');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const validate = require('../../shared/middleware/validate.middleware');
const { NotFoundError } = require('../../shared/errors/AppError');
const schema = require('./sedes.schema');

function createSedesModule() {
  const repo = new Repo();
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', asyncHandler(async (req, res) => {
    const soloActivas = req.query.activas === 'true';
    const data = await repo.findAll({ soloActivas });
    res.json(ApiResponse.success(data));
  }));

  router.get('/:id', asyncHandler(async (req, res) => {
    const s = await repo.findById(req.params.id);
    if (!s) throw new NotFoundError('Sede');
    res.json(ApiResponse.success(s));
  }));

  router.post(
    '/',
    requireRol('admin'),
    validate(schema.crear),
    asyncHandler(async (req, res) => {
      const s = await repo.create(req.body, req.user.id_empleado);
      res.status(201).json(ApiResponse.success(s, 'Sede creada'));
    })
  );

  router.put(
    '/:id',
    requireRol('admin'),
    validate(schema.actualizar),
    asyncHandler(async (req, res) => {
      const s = await repo.update(req.params.id, req.body);
      if (!s) throw new NotFoundError('Sede');
      res.json(ApiResponse.success(s, 'Sede actualizada'));
    })
  );

  return router;
}

module.exports = createSedesModule;
