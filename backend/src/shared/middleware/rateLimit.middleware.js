const rateLimit = require('express-rate-limit');

/**
 * Limiter global de la API. Genérico contra abuso.
 * 300 req / 15 min por IP.
 */
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Demasiadas peticiones. Intenta más tarde.' },
  },
});

/**
 * Limiter estricto para endpoints de auth (login, recuperación).
 * 10 intentos / 15 min por IP.
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMIT', message: 'Demasiados intentos de login. Espera unos minutos.' },
  },
});

module.exports = { generalRateLimit, authRateLimit };
