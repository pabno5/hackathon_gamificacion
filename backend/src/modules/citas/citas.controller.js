const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { parsePagination } = require('../../shared/utils/pagination');

class CitasController {
  constructor(citasService) {
    this.service = citasService;
  }

  obtenerPorId = asyncHandler(async (req, res) => {
    res.json(ApiResponse.success(await this.service.obtenerPorId(req.params.id)));
  });

  listar = asyncHandler(async (req, res) => {
    const { data, total } = await this.service.listar(req.query);
    const { page, limit } = parsePagination(req.query);
    res.json(ApiResponse.paginated(data, total, page, limit));
  });

  crear = asyncHandler(async (req, res) => {
    const c = await this.service.crear(req.body, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(c, 'Cita creada'));
  });

  actualizar = asyncHandler(async (req, res) => {
    const c = await this.service.actualizar(req.params.id, req.body, req.user.id_empleado);
    res.json(ApiResponse.success(c, 'Cita actualizada'));
  });

  cancelar = asyncHandler(async (req, res) => {
    const c = await this.service.cancelar(
      req.params.id, req.body.motivo_cancelacion, req.user.id_empleado
    );
    res.json(ApiResponse.success(c, 'Cita cancelada'));
  });

  disponibilidad = asyncHandler(async (req, res) => {
    res.json(ApiResponse.success(await this.service.disponibilidad(req.query)));
  });
}

module.exports = CitasController;
