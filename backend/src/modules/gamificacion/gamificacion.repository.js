const { getPool } = require('../../infrastructure/db');

const pool = getPool();

class GamificacionRepository {
  /** Features activas del rol, en orden de tour. */
  async featuresPorRol(rol) {
    const { rows } = await pool.query(
      `SELECT id_feature, codigo, nombre, descripcion, orden
         FROM gamificacion_features
        WHERE rol = $1 AND activa = TRUE
        ORDER BY orden`,
      [rol]
    );
    return rows;
  }

  async findFeaturePorCodigo(codigo) {
    const { rows } = await pool.query(
      'SELECT * FROM gamificacion_features WHERE codigo = $1 LIMIT 1',
      [codigo]
    );
    return rows[0] || null;
  }

  /** Progreso del empleado con detalle de cada feature. */
  async progresoDetalle(idEmpleado) {
    const { rows } = await pool.query(
      `SELECT gf.codigo, gf.nombre, gf.descripcion, gf.orden,
              gp.visitada, gp.fecha_visita
         FROM gamificacion_progreso gp
         JOIN gamificacion_features gf ON gp.id_feature = gf.id_feature
        WHERE gp.id_empleado = $1
        ORDER BY gf.orden`,
      [idEmpleado]
    );
    return rows;
  }

  async contarProgreso(idEmpleado) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE visitada = TRUE)::int AS visitadas
         FROM gamificacion_progreso
        WHERE id_empleado = $1`,
      [idEmpleado]
    );
    return rows[0];
  }

  async findProgreso(idEmpleado, idFeature) {
    const { rows } = await pool.query(
      `SELECT * FROM gamificacion_progreso
        WHERE id_empleado = $1 AND id_feature = $2 LIMIT 1`,
      [idEmpleado, idFeature]
    );
    return rows[0] || null;
  }

  async marcarVisitada(idEmpleado, idFeature) {
    await pool.query(
      `UPDATE gamificacion_progreso
          SET visitada = TRUE, fecha_visita = NOW()
        WHERE id_empleado = $1 AND id_feature = $2 AND visitada = FALSE`,
      [idEmpleado, idFeature]
    );
  }

  /** Marca la sesión de tour más reciente como completada. */
  async completarSesionTour(idEmpleado) {
    await pool.query(
      `UPDATE gamificacion_sesiones_tour
          SET completado = TRUE, fecha_completado = NOW()
        WHERE id_sesion = (
          SELECT id_sesion FROM gamificacion_sesiones_tour
           WHERE id_empleado = $1 AND completado = FALSE
           ORDER BY created_at DESC LIMIT 1
        )`,
      [idEmpleado]
    );
  }

  /** Dashboard admin: usa la vista v_gamificacion_resumen. */
  async resumenTodos() {
    const { rows } = await pool.query(
      `SELECT * FROM v_gamificacion_resumen ORDER BY porcentaje_completado DESC NULLS LAST`
    );
    return rows;
  }
}

module.exports = GamificacionRepository;
