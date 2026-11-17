/**
 * Orígenes del frontend autorizados (fuente única para CORS y para validar
 * URLs de redirección que llegan del cliente).
 *
 * `CORS_ORIGINS` = lista separada por comas. Sin la env, se usan los puertos
 * de desarrollo local.
 */
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3001',
  'http://localhost:4173',
];

function getAllowedOrigins() {
  return process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : DEV_ORIGINS;
}

/** ¿La URL pertenece a uno de los orígenes autorizados? */
function esUrlPermitida(url) {
  if (typeof url !== 'string' || !url) return false;
  try {
    return getAllowedOrigins().includes(new URL(url).origin);
  } catch {
    return false;
  }
}

module.exports = { getAllowedOrigins, esUrlPermitida };
