const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parsea `req.query` para extraer `page` y `limit` con clamps sanos.
 * Retorna `{ page, limit, offset }` listos para usar en queries.
 */
function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, rawLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = { parsePagination, DEFAULT_LIMIT, MAX_LIMIT };
