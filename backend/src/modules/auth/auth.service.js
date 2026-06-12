const { getPool } = require('../../infrastructure/db');
const { getSupabaseClient } = require('../../infrastructure/supabase');
const {
  UnauthorizedError, NotFoundError, ConflictError, ValidationError,
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

  /** Marca `primer_login = false` (idempotente). */
  async marcarPrimerLoginCompletado(idEmpleado) {
    await pool.query(
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
   * Registra una persona y la vincula como empleado del usuario autenticado.
   * Usado en el flujo "primer login → completar perfil" del frontend.
   *
   * Crea la persona; si el `auth_uid` no tiene empleado, lo crea con rol
   * recepcionista por defecto (autorregistro). Solo lo invoca un usuario
   * ya autenticado en Supabase Auth.
   */
  async registrarPersona(datos, authUid, email) {
    const req = ['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'telefono'];
    for (const k of req) {
      if (!datos[k] || String(datos[k]).trim() === '') {
        throw new ValidationError(`${k} es requerido`);
      }
    }
    const dup = await pool.query(
      'SELECT id_persona FROM personas WHERE numero_documento = $1 LIMIT 1',
      [datos.numero_documento]
    );
    if (dup.rows.length > 0) {
      throw new ConflictError('El número de documento ya está registrado');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const pIns = await client.query(
        `INSERT INTO personas (tipo_documento, numero_documento, nombres, apellidos,
                               fecha_nacimiento, telefono, direccion, correo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_persona`,
        [
          datos.tipo_documento, datos.numero_documento, datos.nombres, datos.apellidos,
          datos.fecha_nacimiento || null, datos.telefono, datos.direccion || null,
          datos.correo || email || null,
        ]
      );
      const id_persona = pIns.rows[0].id_persona;

      // Si auth_uid no tiene empleado, vincular como recepcionista por defecto
      const ya = await client.query(
        'SELECT 1 FROM empleados WHERE auth_uid = $1 LIMIT 1', [authUid]
      );
      if (ya.rows.length === 0) {
        const rolRes = await client.query(
          "SELECT id_rol FROM roles WHERE nombre = 'recepcionista' LIMIT 1"
        );
        await client.query(
          `INSERT INTO empleados (id_persona, id_rol, auth_uid, primer_login)
           VALUES ($1, $2, $3, TRUE)`,
          [id_persona, rolRes.rows[0].id_rol, authUid]
        );
      }
      await client.query('COMMIT');
      return { id_persona };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /** Solicita correo de recuperación de contraseña (Supabase Auth). */
  async solicitarReset(email, redirectTo) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new UnauthorizedError(error.message);
  }
}

module.exports = AuthService;
