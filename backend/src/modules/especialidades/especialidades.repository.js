const { getPool } = require('../../infrastructure/db');

const pool = getPool();

class EspecialidadesRepository {
  async findAll({ soloActivas = false } = {}) {
    const sql = soloActivas
      ? 'SELECT * FROM especialidades WHERE activa = TRUE ORDER BY nombre'
      : 'SELECT * FROM especialidades ORDER BY nombre';
    const { rows } = await pool.query(sql);
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query(
      'SELECT * FROM especialidades WHERE id_especialidad = $1 LIMIT 1', [id]
    );
    return rows[0] || null;
  }

  async findByNombre(nombre) {
    const { rows } = await pool.query(
      'SELECT * FROM especialidades WHERE nombre = $1 LIMIT 1', [nombre]
    );
    return rows[0] || null;
  }

  async create({ nombre, descripcion = null }, createdBy) {
    const { rows } = await pool.query(
      `INSERT INTO especialidades (nombre, descripcion, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [nombre, descripcion, createdBy]
    );
    return rows[0];
  }

  async update(id, data) {
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const k of ['nombre', 'descripcion', 'activa']) {
      if (data[k] !== undefined) { sets.push(`${k} = $${idx++}`); vals.push(data[k]); }
    }
    if (sets.length === 0) return await this.findById(id);
    vals.push(id);
    const { rows } = await pool.query(
      `UPDATE especialidades SET ${sets.join(', ')}
        WHERE id_especialidad = $${idx} RETURNING *`,
      vals
    );
    return rows[0] || null;
  }
}

module.exports = EspecialidadesRepository;
