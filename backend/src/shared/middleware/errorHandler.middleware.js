/**
 * Errores de PostgreSQL que son culpa de la petición, no del servidor.
 * Sin este mapa, un UUID mal formado o un duplicado salían como 500.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERRORS = {
  '22P02': [400, 'VALIDATION_ERROR', 'Identificador o valor con formato inválido'],
  '22007': [400, 'VALIDATION_ERROR', 'Formato de fecha u hora inválido'],
  '22008': [400, 'VALIDATION_ERROR', 'Fecha u hora fuera de rango'],
  '22003': [400, 'VALIDATION_ERROR', 'Valor numérico fuera de rango'],
  '22001': [400, 'VALIDATION_ERROR', 'Un valor supera la longitud permitida'],
  '23502': [400, 'VALIDATION_ERROR', 'Falta un campo obligatorio'],
  '23514': [400, 'VALIDATION_ERROR', 'Un valor no cumple las reglas permitidas'],
  '23505': [409, 'CONFLICT', 'Ya existe un registro con esos datos'],
  '23503': [409, 'CONFLICT', 'El registro referenciado no existe o está en uso'],
};

function responder(res, status, code, message, details) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...(details && { details }) },
  });
}

function errorHandler(err, req, res, _next) {
  if (res.headersSent) return _next(err);

  if (err && err.isOperational) {
    return responder(res, err.statusCode, err.code, err.message, err.details);
  }

  // Cuerpo de la petición: JSON mal formado o demasiado grande (body-parser)
  if (err && err.type === 'entity.parse.failed') {
    return responder(res, 400, 'VALIDATION_ERROR', 'El cuerpo de la petición no es JSON válido');
  }
  if (err && err.type === 'entity.too.large') {
    return responder(res, 413, 'PAYLOAD_TOO_LARGE', 'La petición supera el tamaño permitido');
  }

  // Subida de archivos (multer)
  if (err && err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el tamaño permitido'
      : 'No se pudo procesar el archivo adjunto';
    return responder(res, 400, 'VALIDATION_ERROR', msg);
  }

  // Errores de PostgreSQL causados por los datos de la petición
  if (err && typeof err.code === 'string' && PG_ERRORS[err.code] && err.severity) {
    const [status, code, message] = PG_ERRORS[err.code];
    return responder(res, status, code, message);
  }

  console.error('ERROR NO OPERACIONAL:', err);
  // El detalle técnico solo sale en desarrollo explícito. Si NODE_ENV no está
  // definido (despliegue mal configurado) NO se filtra el stack.
  const debug = process.env.NODE_ENV === 'development';
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(debug && { debug: err?.message, stack: err?.stack?.split('\n').slice(0, 5) }),
    },
  });
}

module.exports = errorHandler;
