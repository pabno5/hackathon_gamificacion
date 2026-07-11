const { UnauthorizedError } = require('../errors/AppError');

/**
 * Autenticación por API key para integraciones máquina-a-máquina (BE-03: el
 * callcenter con IA vía n8n/Vapi). No hay empleado detrás, así que NO usa
 * Supabase Auth: valida el header `X-API-Key` contra una variable de entorno.
 *
 * `envVar` es el nombre de la env con la key esperada (p.ej. CALLCENTER_API_KEY).
 * Si la env no está configurada, el endpoint queda cerrado (rechaza todo).
 */
function requireApiKey(envVar) {
  return (req, _res, next) => {
    const expected = process.env[envVar];
    const provided = req.headers['x-api-key'];
    if (!expected) {
      return next(new UnauthorizedError('Integración no configurada'));
    }
    if (!provided || provided !== expected) {
      return next(new UnauthorizedError('API key inválida'));
    }
    next();
  };
}

module.exports = { requireApiKey };
