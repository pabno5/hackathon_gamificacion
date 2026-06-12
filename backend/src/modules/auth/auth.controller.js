const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { ValidationError } = require('../../shared/errors/AppError');

class AuthController {
  constructor(authService) {
    this.service = authService;
  }

  login = asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ValidationError('email y password son requeridos');
    const result = await this.service.login(email, password);
    res.json(ApiResponse.success(result));
  });

  profile = asyncHandler(async (req, res) => {
    const perfil = await this.service.perfilPorAuthUid(req.user.auth_uid);
    res.json(ApiResponse.success(perfil));
  });

  /** Compat: endpoint legacy del frontend para chequear si el usuario está vinculado. */
  uid = asyncHandler(async (req, res) => {
    const existe = await this.service.existeAuthUid(req.user.auth_uid);
    if (existe) {
      return res.status(200).json({ code: 200, success: true, message: 'UID encontrado' });
    }
    return res.status(404).json({ code: 404, success: false, message: 'UID no registrado' });
  });

  /** Marca primer login como completado (al terminar el tour de gamificación). */
  marcarTourCompletado = asyncHandler(async (req, res) => {
    await this.service.marcarPrimerLoginCompletado(req.user.id_empleado);
    res.json(ApiResponse.success({ primer_login: false }));
  });

  /** Registro de persona del usuario autenticado (flujo primer login). */
  register = asyncHandler(async (req, res) => {
    const result = await this.service.registrarPersona(
      req.body, req.user.auth_uid, req.user.email
    );
    res.status(201).json(ApiResponse.success(result, 'Persona registrada'));
  });

  /** Solicitud de recuperación de contraseña. */
  recuperarPassword = asyncHandler(async (req, res) => {
    const { email, redirectTo } = req.body || {};
    if (!email) throw new ValidationError('email es requerido');
    await this.service.solicitarReset(email, redirectTo);
    res.json(ApiResponse.success({ enviado: true }));
  });
}

module.exports = AuthController;
