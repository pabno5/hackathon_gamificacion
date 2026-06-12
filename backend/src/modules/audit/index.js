const express = require('express');
const { getPool } = require('../../infrastructure/db');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');

const pool = getPool();

const TABLAS_VALIDAS = ['personas', 'citas', 'historias_clinicas', 'empleados'];
const ACCIONES_VALIDAS = ['INSERT', 'UPDATE', 'DELETE'];

function createAuditModule() {
  const router = express.Router();
  router.use(requireAuth, requireRol('admin'));

  /**
   * GET /audit?tabla=&accion=&id_empleado=&from=&to=&page=&limit=
   */
  router.get('/', asyncHandler(async (req, res) => {
    const { tabla, accion, id_empleado, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (tabla && TABLAS_VALIDAS.includes(tabla)) {
      params.push(tabla);
      where.push(`tabla_afectada = $${params.length}`);
    }
    if (accion && ACCIONES_VALIDAS.includes(accion)) {
      params.push(accion);
      where.push(`accion = $${params.length}`);
    }
    if (id_empleado) {
      params.push(id_empleado);
      where.push(`id_empleado = $${params.length}`);
    }
    if (from) {
      params.push(from);
      where.push(`created_at >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`created_at <= $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM audit_log ${whereSql}`, params
    );
    const total = totalRes.rows[0].total;

    params.push(limit, offset);
    const { rows } = await pool.query(
      `SELECT id_audit, tabla_afectada, accion, id_registro,
              datos_anteriores, datos_nuevos, id_empleado, created_at
         FROM audit_log
         ${whereSql}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json(ApiResponse.paginated(rows, total, page, limit));
  }));

  return router;
}

module.exports = createAuditModule;
