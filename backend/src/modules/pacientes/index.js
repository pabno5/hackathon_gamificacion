/**
 * Wiring del módulo pacientes (DI manual).
 * Convención: cada módulo expone una factory que retorna un Router montable.
 */
const PacientesRepository = require('./pacientes.repository');
const PacientesService = require('./pacientes.service');
const PacientesController = require('./pacientes.controller');
const buildRouter = require('./pacientes.routes');

function createPacientesModule() {
  const repo = new PacientesRepository();
  const service = new PacientesService(repo);
  const controller = new PacientesController(service);
  return buildRouter(controller);
}

module.exports = createPacientesModule;
