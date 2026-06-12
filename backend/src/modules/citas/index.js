const CitasRepository = require('./citas.repository');
const CitasService = require('./citas.service');
const CitasController = require('./citas.controller');
const buildRouter = require('./citas.routes');
const eventBus = require('../../shared/events/eventBus');

function createCitasModule() {
  const repo = new CitasRepository();
  const service = new CitasService(repo, eventBus);
  const controller = new CitasController(service);
  return { router: buildRouter(controller), service, repo };
}

module.exports = createCitasModule;
