const crypto = require('crypto');
const { UnauthorizedError } = require('../errors/AppError');

/** Comparación en tiempo constante: no filtra por timing cuántos caracteres coinciden. */
function iguales(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

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
    if (typeof provided !== 'string' || !iguales(provided, expected)) {
      return next(new UnauthorizedError('API key inválida'));
    }
    next();
  };
}

module.exports = { requireApiKey };
