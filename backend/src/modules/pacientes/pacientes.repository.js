/**
 * Acceso a tabla `personas` para pacientes.
 *
 * Nota: en el modelo, `personas` contiene a pacientes Y a empleados.
 * Un "paciente" es una persona que NO tiene fila en `empleados`.
 * Las queries filtran por `deleted_at IS NULL` (soft delete).
 */
const { getPool } = require('../../infrastructure/db');

const pool = getPool();

// Columnas con alias `p.` para SELECT con JOIN/FROM personas p
const COLS_P = `
  p.id_persona, p.tipo_documento, p.numero_documento,
  p.nombres, p.apellidos, p.fecha_nacimiento, p.telefono,
  p.correo, p.direccion, p.created_at, p.updated_at
`;
// Columnas sin alias para INSERT/UPDATE RETURNING
const COLS_PLAIN = `
  id_persona, tipo_documento, numero_documento,
  nombres, apellidos, fecha_nacimiento, telefono,
  correo, direccion, created_at, updated_at
`;

class PacientesRepository {
  async findByDocumento(numeroDocumento) {
    const sql = `
      SELECT ${COLS_P}
      FROM personas p
      WHERE p.numero_documento = $1 AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [numeroDocumento]);
    return rows[0] || null;
  }

  async findById(id) {
    const sql = `
      SELECT ${COLS_P}
      FROM personas p
      WHERE p.id_persona = $1 AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  /**
   * Paginado + búsqueda libre por nombre/apellido/documento.
   * Excluye personas que son empleados (solo pacientes).
   */
  async findAll({ page = 1, limit = 20, search = null } = {}) {
    const offset = (page - 1) * limit;
    const params = [];
    const where = [
      'p.deleted_at IS NULL',
      'NOT EXISTS (SELECT 1 FROM empleados e WHERE e.id_persona = p.id_persona)',
    ];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      where.push(
        `(p.nombres ILIKE $${idx} OR p.apellidos ILIKE $${idx} OR p.numero_documento ILIKE $${idx})`
      );
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total FROM personas p ${whereSql}`;
    const totalRes = await pool.query(countSql, params);
    const total = totalRes.rows[0].total;

    params.push(limit, offset);
    const dataSql = `
      SELECT ${COLS_P}
      FROM personas p
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await pool.query(dataSql, params);
    return { data: rows, total };
  }

  async create(data, createdBy) {
    const sql = `
      INSERT INTO personas (
        tipo_documento, numero_documento, nombres, apellidos,
        fecha_nacimiento, telefono, correo, direccion, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${COLS_PLAIN}
    `;
    const { rows } = await pool.query(sql, [
      data.tipo_documento,
      data.numero_documento,
      data.nombres,
      data.apellidos,
      data.fecha_nacimiento || null,
      data.telefono || null,
      data.correo || null,
      data.direccion || null,
      createdBy,
    ]);
    return rows[0];
  }

  async update(id, data) {
    const campos = [];
    const valores = [];
    let idx = 1;
    for (const k of [
      'tipo_documento',
      'nombres',
      'apellidos',
      'fecha_nacimiento',
      'telefono',
      'correo',
      'direccion',
    ]) {
      if (data[k] !== undefined) {
        campos.push(`${k} = $${idx++}`);
        valores.push(data[k]);
      }
    }
    if (campos.length === 0) return await this.findById(id);

    valores.push(id);
    const sql = `
      UPDATE personas
         SET ${campos.join(', ')}
       WHERE id_persona = $${idx} AND deleted_at IS NULL
      RETURNING ${COLS_PLAIN}
    `;
    const { rows } = await pool.query(sql, valores);
    return rows[0] || null;
  }

  async softDelete(id, deletedBy) {
    const sql = `
      UPDATE personas
         SET deleted_at = NOW()
       WHERE id_persona = $1 AND deleted_at IS NULL
      RETURNING id_persona
    `;
    const { rowCount } = await pool.query(sql, [id]);
    return rowCount > 0;
  }

  async correoExiste(correo, excluirId = null) {
    const sql = excluirId
      ? 'SELECT 1 FROM personas WHERE correo = $1 AND id_persona <> $2 AND deleted_at IS NULL LIMIT 1'
      : 'SELECT 1 FROM personas WHERE correo = $1 AND deleted_at IS NULL LIMIT 1';
    const params = excluirId ? [correo, excluirId] : [correo];
    const { rows } = await pool.query(sql, params);
    return rows.length > 0;
  }
}

module.exports = PacientesRepository;
