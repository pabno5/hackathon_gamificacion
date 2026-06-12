const { getPool } = require('../../infrastructure/db');

const pool = getPool();

const SELECT_EMPLEADO = `
  SELECT
    e.id_empleado, e.id_persona, e.auth_uid, e.activo, e.primer_login,
    e.created_at, e.updated_at,
    r.id_rol, r.nombre AS rol,
    p.nombres, p.apellidos, p.numero_documento, p.tipo_documento,
    p.correo, p.telefono, p.direccion, p.fecha_nacimiento
  FROM empleados e
  JOIN personas p ON e.id_persona = p.id_persona
  JOIN roles r    ON e.id_rol = r.id_rol
`;

class EmpleadosRepository {
  async findAll({ soloActivos = false } = {}) {
    const sql = soloActivos
      ? `${SELECT_EMPLEADO} WHERE e.activo = TRUE ORDER BY p.apellidos, p.nombres`
      : `${SELECT_EMPLEADO} ORDER BY p.apellidos, p.nombres`;
    const { rows } = await pool.query(sql);
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `${SELECT_EMPLEADO} WHERE e.id_empleado = $1 LIMIT 1`, [id]
    );
    return rows[0] || null;
  }

  async existeDocumento(numeroDocumento) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM personas WHERE numero_documento = $1 LIMIT 1', [numeroDocumento]
    );
    return rowCount > 0;
  }

  async existeCorreo(correo) {
    const { rowCount } = await pool.query(
      'SELECT 1 FROM personas WHERE correo = $1 LIMIT 1', [correo]
    );
    return rowCount > 0;
  }

  async getRolIdPorNombre(nombre) {
    const { rows } = await pool.query(
      'SELECT id_rol FROM roles WHERE nombre = $1 LIMIT 1', [nombre]
    );
    return rows[0]?.id_rol || null;
  }

  /**
   * Crea persona + empleado en una sola transacción.
   * El trigger de gamificación inicializa progreso automáticamente.
   */
  async crearPersonaYEmpleado(
    { personaData, id_rol, auth_uid, createdBy }
  ) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const personaIns = await client.query(
        `INSERT INTO personas (
          tipo_documento, numero_documento, nombres, apellidos,
          fecha_nacimiento, telefono, correo, direccion, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id_persona`,
        [
          personaData.tipo_documento, personaData.numero_documento,
          personaData.nombres, personaData.apellidos,
          personaData.fecha_nacimiento || null,
          personaData.telefono || null, personaData.correo || null,
          personaData.direccion || null, createdBy,
        ]
      );
      const id_persona = personaIns.rows[0].id_persona;

      const empIns = await client.query(
        `INSERT INTO empleados (id_persona, id_rol, auth_uid, primer_login, created_by)
         VALUES ($1, $2, $3, TRUE, $4)
         RETURNING id_empleado`,
        [id_persona, id_rol, auth_uid, createdBy]
      );
      const id_empleado = empIns.rows[0].id_empleado;

      await client.query('COMMIT');
      return { id_persona, id_empleado };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async setActivo(idEmpleado, activo) {
    const { rowCount } = await pool.query(
      'UPDATE empleados SET activo = $1 WHERE id_empleado = $2', [activo, idEmpleado]
    );
    return rowCount > 0;
  }

  async reiniciarTour(idEmpleado, activadoPor, motivo) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Resetear progreso
      await client.query(
        'UPDATE gamificacion_progreso SET visitada = FALSE, fecha_visita = NULL WHERE id_empleado = $1',
        [idEmpleado]
      );
      // Marcar empleado como primer_login = TRUE
      await client.query(
        'UPDATE empleados SET primer_login = TRUE WHERE id_empleado = $1', [idEmpleado]
      );
      // Nueva sesión de tour
      await client.query(
        `INSERT INTO gamificacion_sesiones_tour (id_empleado, activado_por, motivo_reactivacion)
         VALUES ($1, $2, $3)`,
        [idEmpleado, activadoPor, motivo || null]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

module.exports = EmpleadosRepository;
