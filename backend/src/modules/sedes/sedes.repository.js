const { getPool } = require('../../infrastructure/db');

const pool = getPool();

class SedesRepository {
  async findAll({ soloActivas = false } = {}) {
    const sql = soloActivas
      ? 'SELECT * FROM sedes WHERE activa = TRUE ORDER BY nombre'
      : 'SELECT * FROM sedes ORDER BY nombre';
    const { rows } = await pool.query(sql);
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM sedes WHERE id_sede = $1 LIMIT 1', [id]
    );
    return rows[0] || null;
  }

  async create(data, createdBy) {
    const { rows } = await pool.query(
      `INSERT INTO sedes (nombre, direccion, telefono, ciudad, google_calendar_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [data.nombre, data.direccion || null, data.telefono || null,
       data.ciudad || null, data.google_calendar_id || null, createdBy]
    );
    return rows[0];
  }

  async update(id, data) {
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const k of ['nombre', 'direccion', 'telefono', 'ciudad', 'google_calendar_id', 'activa']) {
      if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
    }
    if (sets.length === 0) return await this.findById(id);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE sedes SET ${sets.join(', ')} WHERE id_sede = $${idx} RETURNING *`, vals
    );
    return rows[0] || null;
  }
}

module.exports = SedesRepository;
