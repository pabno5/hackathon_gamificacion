const { getPool, queryAs } = require('../../infrastructure/db');

const pool = getPool();

const SELECT_CITA_COMPLETA = `
  SELECT
    c.id_cita, c.fecha_cita, c.hora_inicio, c.hora_fin,
    c.motivo, c.estado, c.canal, c.motivo_cancelacion,
    c.google_calendar_event_id, c.created_at, c.updated_at,
    c.id_paciente, c.id_medico, c.id_sede, c.id_especialidad,
    json_build_object(
      'id_persona', p.id_persona,
      'nombres', p.nombres, 'apellidos', p.apellidos,
      'numero_documento', p.numero_documento,
      'tipo_documento', p.tipo_documento,
      'telefono', p.telefono, 'correo', p.correo
    ) AS paciente,
    json_build_object(
      'id_medico', m.id_medico,
      'nombres', pm.nombres, 'apellidos', pm.apellidos,
      'numero_licencia', m.numero_licencia
    ) AS medico,
    json_build_object(
      'id_sede', s.id_sede, 'nombre', s.nombre,
      'google_calendar_id', s.google_calendar_id
    ) AS sede,
    CASE WHEN c.id_especialidad IS NOT NULL THEN
      json_build_object('id_especialidad', e.id_especialidad, 'nombre', e.nombre)
    END AS especialidad
  FROM citas c
  JOIN personas p     ON c.id_paciente = p.id_persona
  JOIN medicos m      ON c.id_medico = m.id_medico
  JOIN empleados emp  ON m.id_empleado = emp.id_empleado
  JOIN personas pm    ON emp.id_persona = pm.id_persona
  JOIN sedes s        ON c.id_sede = s.id_sede
  LEFT JOIN especialidades e ON c.id_especialidad = e.id_especialidad
`;

class CitasRepository {
  async findById(id) {
    const { rows } = await pool.query(
      `${SELECT_CITA_COMPLETA} WHERE c.id_cita = $1 AND c.deleted_at IS NULL LIMIT 1`, [id]
    );
    return rows[0] || null;
  }

  async findAll({ page = 1, limit = 20, filtros = {} } = {}) {
    const offset = (page - 1) * limit;
    const where = ['c.deleted_at IS NULL'];
    const params = [];

    for (const [col, val] of [
      ['c.id_paciente', filtros.id_paciente],
      ['c.id_medico', filtros.id_medico],
      ['c.id_sede', filtros.id_sede],
      ['c.estado', filtros.estado],
      ['c.canal', filtros.canal],
    ]) {
      if (val !== undefined && val !== null && val !== '') {
        params.push(val);
        where.push(`${col} = $${params.length}`);
      }
    }
    if (filtros.from) { params.push(filtros.from); where.push(`c.fecha_cita >= $${params.length}`); }
    if (filtros.to)   { params.push(filtros.to);   where.push(`c.fecha_cita <= $${params.length}`); }

    const whereSql = `WHERE ${where.join(' AND ')}`;

    const totalRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM citas c ${whereSql}`, params
    );
    const total = totalRes.rows[0].total;

    params.push(limit, offset);
    const { rows } = await pool.query(
      `${SELECT_CITA_COMPLETA}
       ${whereSql}
       ORDER BY c.fecha_cita DESC, c.hora_inicio DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return { data: rows, total };
  }

  async create(data, createdBy) {
    const sqlInsert = `
      INSERT INTO citas (
        id_paciente, id_medico, id_sede, id_especialidad,
        fecha_cita, hora_inicio, hora_fin, motivo, estado, canal, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9::estado_cita, 'pendiente'), $10, $11)
      RETURNING id_cita`;
    const { rows } = await queryAs(createdBy, sqlInsert, [
      data.id_paciente, data.id_medico, data.id_sede,
      data.id_especialidad || null,
      data.fecha_cita, data.hora_inicio, data.hora_fin,
      data.motivo || null,
      data.estado || null,
      data.canal,
      createdBy,
    ]);
    return await this.findById(rows[0].id_cita);
  }

  async update(id, data, updatedBy) {
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const k of [
      'id_medico', 'id_sede', 'id_especialidad',
      'fecha_cita', 'hora_inicio', 'hora_fin',
      'motivo', 'estado', 'motivo_cancelacion',
    ]) {
      if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
    }
    if (sets.length === 0) return await this.findById(id);
    sets.push(`updated_by = $${idx++}`); vals.push(updatedBy);
    vals.push(id);
    const { rowCount } = await queryAs(
      updatedBy,
      `UPDATE citas SET ${sets.join(', ')}
        WHERE id_cita = $${idx} AND deleted_at IS NULL`,
      vals
    );
    if (rowCount === 0) return null;
    return await this.findById(id);
  }

  async setGoogleEventId(idCita, eventId) {
    await pool.query(
      'UPDATE citas SET google_calendar_event_id = $1 WHERE id_cita = $2',
      [eventId, idCita]
    );
  }

  async findByGoogleEventId(eventId) {
    const { rows } = await pool.query(
      'SELECT * FROM citas WHERE google_calendar_event_id = $1 LIMIT 1', [eventId]
    );
    return rows[0] || null;
  }

  /**
   * Choque de horario: misma fecha + médico + rango overlap, excluyendo cancelada/no_asistio.
   * Excluye opcional `excluirCitaId` para updates.
   */
  async hayChoqueMedico({ id_medico, fecha_cita, hora_inicio, hora_fin, excluirCitaId = null }) {
    const params = [id_medico, fecha_cita, hora_inicio, hora_fin];
    let sql = `
      SELECT 1 FROM citas
       WHERE id_medico = $1
         AND fecha_cita = $2
         AND deleted_at IS NULL
         AND estado NOT IN ('cancelada', 'no_asistio')
         AND (hora_inicio, hora_fin) OVERLAPS ($3::time, $4::time)
    `;
    if (excluirCitaId) {
      params.push(excluirCitaId);
      sql += ` AND id_cita <> $${params.length}`;
    }
    sql += ' LIMIT 1';
    const { rowCount } = await pool.query(sql, params);
    return rowCount > 0;
  }

  /**
   * Buscar próxima disponibilidad: devuelve médicos+sedes con N slots libres.
   * Versión simple: lista médicos que atienden la especialidad/sede; el frontend
   * elige el slot. (Slot search avanzado se puede agregar después.)
   */
  async medicosDisponibles({ id_especialidad, id_sede }) {
    const params = [];
    const where = ['emp.activo = TRUE', 'ms.activo = TRUE', 's.activa = TRUE'];
    if (id_especialidad) {
      params.push(id_especialidad);
      where.push(`mesp.id_especialidad = $${params.length}`);
    }
    if (id_sede) {
      params.push(id_sede);
      where.push(`s.id_sede = $${params.length}`);
    }
    // `json_agg(DISTINCT json_build_object(...))` no funciona en pg porque json
    // no tiene operador de igualdad. Usamos jsonb_agg sobre subquery DISTINCT-eada.
    const sql = `
      SELECT
        m.id_medico,
        pm.nombres || ' ' || pm.apellidos AS nombre_medico,
        s.id_sede, s.nombre AS sede,
        (SELECT jsonb_agg(jsonb_build_object('id_especialidad', e2.id_especialidad, 'nombre', e2.nombre))
           FROM medico_especialidad mesp2
           JOIN especialidades e2 ON mesp2.id_especialidad = e2.id_especialidad
          WHERE mesp2.id_medico = m.id_medico) AS especialidades
      FROM medicos m
      JOIN empleados emp           ON m.id_empleado = emp.id_empleado
      JOIN personas pm             ON emp.id_persona = pm.id_persona
      JOIN medico_sede ms          ON m.id_medico = ms.id_medico
      JOIN sedes s                 ON ms.id_sede = s.id_sede
      JOIN medico_especialidad mesp ON m.id_medico = mesp.id_medico
      WHERE ${where.join(' AND ')}
      GROUP BY m.id_medico, pm.nombres, pm.apellidos, s.id_sede, s.nombre
    `;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async findBySedeYRangoFechas(idSede, fromDate, toDate) {
    const { rows } = await pool.query(
      `SELECT id_cita, google_calendar_event_id, estado, fecha_cita
         FROM citas
        WHERE id_sede = $1 AND deleted_at IS NULL
          AND fecha_cita BETWEEN $2 AND $3`,
      [idSede, fromDate, toDate]
    );
    return rows;
  }
}

module.exports = CitasRepository;
