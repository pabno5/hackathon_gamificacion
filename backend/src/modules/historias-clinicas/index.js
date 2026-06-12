const HistoriasRepository = require('./historias.repository');
const HistoriasService = require('./historias.service');
const HistoriasController = require('./historias.controller');
const HistoriaPDFService = require('./historias.pdf');
const buildRouter = require('./historias.routes');

function createHistoriasModule() {
  const repo = new HistoriasRepository();
  const service = new HistoriasService(repo);
  const pdf = new HistoriaPDFService(service);
  const controller = new HistoriasController(service, pdf);
  return buildRouter(controller);
}

module.exports = createHistoriasModule;
