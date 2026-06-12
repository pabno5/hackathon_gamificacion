const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');

class HistoriasController {
  constructor(historiasService, pdfService) {
    this.service = historiasService;
    this.pdf = pdfService;
  }

  obtenerPorId = asyncHandler(async (req, res) => {
    const h = await this.service.obtenerPorId(req.params.id, req.user.rol);
    res.json(ApiResponse.success(h));
  });

  listarPorPaciente = asyncHandler(async (req, res) => {
    const lista = await this.service.listarPorPaciente(req.params.id_paciente, req.user.rol);
    res.json(ApiResponse.success(lista));
  });

  crear = asyncHandler(async (req, res) => {
    const h = await this.service.crear(req.body, req.user.rol, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(h, 'Historia clínica creada'));
  });

  actualizar = asyncHandler(async (req, res) => {
    const h = await this.service.actualizar(
      req.params.id, req.body, req.user.rol, req.user.id_empleado
    );
    res.json(ApiResponse.success(h, 'Historia clínica actualizada'));
  });

  exportarPDF = asyncHandler(async (req, res) => {
    if (!this.pdf) {
      return res.status(501).json({ success: false, message: 'PDF aún no implementado' });
    }
    await this.pdf.generar(req.params.id, req.user.rol, res);
  });
}

module.exports = HistoriasController;
