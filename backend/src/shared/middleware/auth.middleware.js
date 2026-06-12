const { getSupabaseClient } = require('../../infrastructure/supabase');
const { UnauthorizedError, ForbiddenError } = require('../errors/AppError');
const { getPool } = require('../../infrastructure/db');

const pool = getPool();

/**
 * Verifica JWT de Supabase Auth y carga datos del empleado.
 *
 * Header esperado: `Authorization: Bearer <jwt>`.
 *
 * En `req.user` deja:
 *   - auth_uid     UUID de auth.users
 *   - email
 *   - id_empleado  PK en tabla empleados
 *   - id_persona
 *   - rol          'admin' | 'medico' | 'recepcionista'
 *   - primer_login boolean
 */
async function requireAuth(req, _res, next) {
  try {
    let token = null;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) token = header.substring(7);
    else if (req.cookies && req.cookies.authToken) token = req.cookies.authToken;

    if (!token) throw new UnauthorizedError('No se proporcionó token');

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) throw new UnauthorizedError('Token inválido o expirado');

    const authUid = data.user.id;
    const email = data.user.email;

    // Cargar empleado + rol vía SQL directo (más rápido que round-trip Supabase REST)
    const sql = `
      SELECT e.id_empleado, e.id_persona, e.primer_login, e.activo, r.nombre AS rol
      FROM empleados e
      JOIN roles r ON e.id_rol = r.id_rol
      WHERE e.auth_uid = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [authUid]);
    if (rows.length === 0) {
      throw new ForbiddenError('Usuario autenticado sin empleado vinculado');
    }
    const emp = rows[0];
    if (!emp.activo) throw new ForbiddenError('Empleado desactivado');

    req.user = {
      auth_uid: authUid,
      email,
      id_empleado: emp.id_empleado,
      id_persona: emp.id_persona,
      rol: emp.rol,
      primer_login: emp.primer_login,
      // Compatibilidad con código legacy que aún usa req.user.uid
      uid: authUid,
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth };
