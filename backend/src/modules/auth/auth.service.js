const { getPool, queryAs } = require('../../infrastructure/db');
const { getSupabaseClient } = require('../../infrastructure/supabase');
const {
  UnauthorizedError, NotFoundError, ForbiddenError,
} = require('../../shared/errors/AppError');

const pool = getPool();

class AuthService {
  /**
   * Login con email + password. Devuelve session de Supabase + perfil del empleado.
   * El frontend igual puede hacer login directo contra Supabase JS SDK;
   * este endpoint queda como conveniencia y para validar que el usuario sea empleado.
   */
  async login(email, password) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedError(error.message);

    const perfil = await this.perfilPorAuthUid(data.user.id);
    return { session: data.session, user: data.user, perfil };
  }

  async perfilPorAuthUid(authUid) {
    const sql = `
      SELECT
        e.id_empleado, e.id_persona, e.auth_uid, e.activo, e.primer_login,
        r.id_rol, r.nombre AS rol,
        p.nombres, p.apellidos, p.numero_documento, p.tipo_documento,
        p.correo, p.telefono, p.direccion, p.fecha_nacimiento
      FROM empleados e
      JOIN personas p ON e.id_persona = p.id_persona
      JOIN roles r    ON e.id_rol = r.id_rol
      WHERE e.auth_uid = $1
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [authUid]);
    if (rows.length === 0) throw new NotFoundError('Perfil');
    return rows[0];
  }

  /** Marca `primer_login = false` (idempotente). Actor = el propio empleado. */
  async marcarPrimerLoginCompletado(idEmpleado) {
    await queryAs(
      idEmpleado,
      'UPDATE empleados SET primer_login = FALSE WHERE id_empleado = $1',
      [idEmpleado]
    );
  }

  async existeAuthUid(authUid) {
    const { rows } = await pool.query(
      'SELECT 1 FROM empleados WHERE auth_uid = $1 LIMIT 1',
      [authUid]
    );
    return rows.length > 0;
  }

  /**
   * El alta de empleados es EXCLUSIVA del administrador (ADM-01 / PRD P-03).
   *
   * Este endpoint NO crea empleados ni asigna roles: hacerlo permitiría a
   * cualquier usuario de Supabase Auth auto-otorgarse rol recepcionista
   * (escalada de privilegios). Un empleado válido siempre es creado por el
   * admin con su persona vinculada, así que aquí solo devolvemos la persona
   * ya asociada. Si no existe empleado, se rechaza.
   */
  async registrarPersona(_datos, authUid) {
    const { rows } = await pool.query(
      'SELECT id_persona FROM empleados WHERE auth_uid = $1 LIMIT 1',
      [authUid]
    );
    if (rows.length === 0) {
      throw new ForbiddenError('El registro de empleados es exclusivo del administrador');
    }
    return { id_persona: rows[0].id_persona };
  }

  /** Solicita correo de recuperación de contraseña (Supabase Auth). */
  async solicitarReset(email, redirectTo) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new UnauthorizedError(error.message);
  }
}

module.exports = AuthService;
