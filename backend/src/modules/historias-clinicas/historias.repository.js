const { getPool, queryAs } = require('../../infrastructure/db');

const pool = getPool();

// Todos los campos clínicos en orden estable.
const ALL_FIELDS = [
  'id_paciente', 'id_medico', 'id_cita',
  'motivo_consulta', 'enfermedad_actual',
  'antecedentes_patologicos', 'antecedentes_quirurgicos', 'alergias',
  'antecedentes_traumaticos', 'antecedentes_farmacologicos',
  'antecedentes_gineco_obstetricos', 'habitos', 'antecedentes_familiares',
  'revision_general', 'revision_cardiovascular', 'revision_respiratorio',
  'revision_digestivo', 'revision_urinario', 'revision_nervioso',
  'revision_musculo_esqueletico', 'revision_sensorial',
  'tension_arterial', 'frecuencia_cardiaca', 'frecuencia_respiratoria',
  'temperatura', 'peso', 'talla', 'exploracion_sistemas',
  'agudeza_visual', 'fondo_ojo', 'reflejos_pupilares',
  'diagnostico_principal', 'diagnostico_secundario',
  'medicamentos_recetados', 'indicaciones_paciente', 'recomendaciones',
  'interconsultas_examenes', 'evolucion_seguimiento',
  'nombre_medico', 'especialidad_medico', 'registro_profesional', 'fecha_firma',
];

class HistoriasRepository {
  async findById(id) {
    const sql = `
      SELECT *, id_historia
      FROM historias_clinicas
      WHERE id_historia = $1 AND deleted_at IS NULL
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [id]);
    return rows[0] || null;
  }

  async findByPaciente(idPaciente) {
    const sql = `
      SELECT *
      FROM historias_clinicas
      WHERE id_paciente = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(sql, [idPaciente]);
    return rows;
  }

  async create(data, createdBy) {
    const cols = [];
    const vals = [];
    const placeholders = [];
    let idx = 1;
    for (const f of ALL_FIELDS) {
      if (data[f] !== undefined) {
        cols.push(f);
        vals.push(data[f]);
        placeholders.push(`$${idx++}`);
      }
    }
    cols.push('created_by');
    vals.push(createdBy);
    placeholders.push(`$${idx}`);

    const sql = `
      INSERT INTO historias_clinicas (${cols.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;
    const { rows } = await queryAs(createdBy, sql, vals);
    return rows[0];
  }

  async update(id, data, updatedBy) {
    const sets = [];
    const vals = [];
    let idx = 1;
    for (const f of ALL_FIELDS) {
      if (data[f] !== undefined) {
        sets.push(`${f} = $${idx++}`);
        vals.push(data[f]);
      }
    }
    if (sets.length === 0) return await this.findById(id);

    sets.push(`updated_by = $${idx++}`);
    vals.push(updatedBy);
    vals.push(id);

    const sql = `
      UPDATE historias_clinicas
         SET ${sets.join(', ')}
       WHERE id_historia = $${idx} AND deleted_at IS NULL
      RETURNING *
    `;
    const { rows } = await queryAs(updatedBy, sql, vals);
    return rows[0] || null;
  }
}

HistoriasRepository.ALL_FIELDS = ALL_FIELDS;
module.exports = HistoriasRepository;
