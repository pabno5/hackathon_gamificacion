const { getPool } = require('../../infrastructure/db');

const pool = getPool();

const SELECT_MEDICO_COMPLETO = `
  SELECT
    m.id_medico, m.numero_licencia, m.id_empleado,
    p.id_persona, p.nombres, p.apellidos, p.numero_documento, p.correo, p.telefono,
    e.activo,
    COALESCE(
      (SELECT json_agg(json_build_object('id_especialidad', es.id_especialidad, 'nombre', es.nombre))
       FROM medico_especialidad mes
       JOIN especialidades es ON mes.id_especialidad = es.id_especialidad
       WHERE mes.id_medico = m.id_medico), '[]'::json
    ) AS especialidades,
    COALESCE(
      (SELECT json_agg(json_build_object('id_sede', s.id_sede, 'nombre', s.nombre))
       FROM medico_sede ms
       JOIN sedes s ON ms.id_sede = s.id_sede
       WHERE ms.id_medico = m.id_medico AND ms.activo = TRUE), '[]'::json
    ) AS sedes
  FROM medicos m
  JOIN empleados e  ON m.id_empleado = e.id_empleado
  JOIN personas p   ON e.id_persona = p.id_persona
`;

class MedicosRepository {
  async findAll() {
    const { rows } = await pool.query(`${SELECT_MEDICO_COMPLETO} ORDER BY p.apellidos, p.nombres`);
    return rows;
  }

  async findById(id) {
    const { rows } = await pool.query(
      `${SELECT_MEDICO_COMPLETO} WHERE m.id_medico = $1 LIMIT 1`, [id]
    );
    return rows[0] || null;
  }

  async findByEmpleado(idEmpleado) {
    const { rows } = await pool.query(
      'SELECT * FROM medicos WHERE id_empleado = $1 LIMIT 1', [idEmpleado]
    );
    return rows[0] || null;
  }

  async findByLicencia(licencia) {
    const { rows } = await pool.query(
      'SELECT * FROM medicos WHERE numero_licencia = $1 LIMIT 1', [licencia]
    );
    return rows[0] || null;
  }

  async create({ id_empleado, numero_licencia }, createdBy) {
    const { rows } = await pool.query(
      `INSERT INTO medicos (id_empleado, numero_licencia, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [id_empleado, numero_licencia, createdBy]
    );
    return rows[0];
  }

  async asignarEspecialidad(idMedico, idEspecialidad, createdBy) {
    const { rows } = await pool.query(
      `INSERT INTO medico_especialidad (id_medico, id_especialidad, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_medico, id_especialidad) DO NOTHING
       RETURNING *`,
      [idMedico, idEspecialidad, createdBy]
    );
    return rows[0] || null;
  }

  async removerEspecialidad(idMedico, idEspecialidad) {
    const { rowCount } = await pool.query(
      'DELETE FROM medico_especialidad WHERE id_medico = $1 AND id_especialidad = $2',
      [idMedico, idEspecialidad]
    );
    return rowCount > 0;
  }

  async asignarSede(idMedico, idSede, createdBy) {
    const { rows } = await pool.query(
      `INSERT INTO medico_sede (id_medico, id_sede, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (id_medico, id_sede) DO UPDATE SET activo = TRUE
       RETURNING *`,
      [idMedico, idSede, createdBy]
    );
    return rows[0] || null;
  }

  async removerSede(idMedico, idSede) {
    const { rowCount } = await pool.query(
      'UPDATE medico_sede SET activo = FALSE WHERE id_medico = $1 AND id_sede = $2',
      [idMedico, idSede]
    );
    return rowCount > 0;
  }
}

module.exports = MedicosRepository;
