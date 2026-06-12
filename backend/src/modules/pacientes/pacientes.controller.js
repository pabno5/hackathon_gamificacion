const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { parsePagination } = require('../../shared/utils/pagination');

class PacientesController {
  constructor(pacientesService) {
    this.service = pacientesService;
  }

  buscarPorDocumento = asyncHandler(async (req, res) => {
    const p = await this.service.buscarPorDocumento(req.params.numero_documento);
    res.json(ApiResponse.success(p));
  });

  obtenerPorId = asyncHandler(async (req, res) => {
    const p = await this.service.obtenerPorId(req.params.id);
    res.json(ApiResponse.success(p));
  });

  listar = asyncHandler(async (req, res) => {
    const { data, total } = await this.service.listar(req.query);
    const { page, limit } = parsePagination(req.query);
    res.json(ApiResponse.paginated(data, total, page, limit));
  });

  crear = asyncHandler(async (req, res) => {
    const p = await this.service.crear(req.body, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(p, 'Paciente creado'));
  });

  actualizar = asyncHandler(async (req, res) => {
    const p = await this.service.actualizar(req.params.id, req.body);
    res.json(ApiResponse.success(p, 'Paciente actualizado'));
  });

  eliminar = asyncHandler(async (req, res) => {
    await this.service.eliminar(req.params.id, req.user.id_empleado);
    res.json(ApiResponse.success({ id: req.params.id }, 'Paciente eliminado'));
  });
}

module.exports = PacientesController;
