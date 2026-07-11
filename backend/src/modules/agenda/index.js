const express = require('express');
const { getPool, queryAs } = require('../../infrastructure/db');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const { ValidationError, NotFoundError } = require('../../shared/errors/AppError');
const { calcularSlotsLibres } = require('../citas/disponibilidad.logic');

const pool = getPool();
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/** Configuración de turnos (BE-02): jornada global, almuerzo por médico,
 *  bloqueos y cálculo de disponibilidad real. */
function createAgendaModule() {
  const router = express.Router();
  router.use(requireAuth);

  // ---- Configuración global de jornada ----
  router.get('/config', asyncHandler(async (_req, res) => {
    const { rows } = await pool.query('SELECT * FROM configuracion_agenda WHERE id = 1');
    res.json(ApiResponse.success(rows[0] || null));
  }));

  router.put('/config', requireRol('admin'), asyncHandler(async (req, res) => {
    const { jornada_inicio, jornada_fin, duracion_slot_min } = req.body || {};
    if (jornada_inicio && !HORA_RE.test(jornada_inicio)) throw new ValidationError('jornada_inicio inválida');
    if (jornada_fin && !HORA_RE.test(jornada_fin)) throw new ValidationError('jornada_fin inválida');
    if (jornada_inicio && jornada_fin && jornada_fin <= jornada_inicio) {
      throw new ValidationError('jornada_fin debe ser mayor que jornada_inicio');
    }
    const dur = duracion_slot_min != null ? parseInt(duracion_slot_min, 10) : null;
    if (dur != null && (Number.isNaN(dur) || dur < 5 || dur > 240)) {
      throw new ValidationError('duracion_slot_min debe estar entre 5 y 240');
    }
    const { rows } = await pool.query(
      `UPDATE configuracion_agenda
          SET jornada_inicio = COALESCE($1, jornada_inicio),
              jornada_fin    = COALESCE($2, jornada_fin),
              duracion_slot_min = COALESCE($3, duracion_slot_min),
              updated_at = NOW()
        WHERE id = 1
        RETURNING *`,
      [jornada_inicio || null, jornada_fin || null, dur]
    );
    res.json(ApiResponse.success(rows[0], 'Configuración actualizada'));
  }));

  // ---- Almuerzo por médico ----
  router.put('/medicos/:id/almuerzo', requireRol('admin'), asyncHandler(async (req, res) => {
    const { almuerzo_inicio, almuerzo_fin } = req.body || {};
    // Ambos nulos = quitar almuerzo. Si viene uno, deben venir los dos y válidos.
    const limpiar = !almuerzo_inicio && !almuerzo_fin;
    if (!limpiar) {
      if (!HORA_RE.test(almuerzo_inicio || '') || !HORA_RE.test(almuerzo_fin || '')) {
        throw new ValidationError('almuerzo_inicio y almuerzo_fin deben ser horas válidas');
      }
      if (almuerzo_fin <= almuerzo_inicio) {
        throw new ValidationError('almuerzo_fin debe ser mayor que almuerzo_inicio');
      }
    }
    const { rowCount } = await pool.query(
      'UPDATE medicos SET almuerzo_inicio = $1, almuerzo_fin = $2, updated_at = NOW() WHERE id_medico = $3',
      [limpiar ? null : almuerzo_inicio, limpiar ? null : almuerzo_fin, req.params.id]
    );
    if (rowCount === 0) throw new NotFoundError('Médico');
    res.json(ApiResponse.success({ almuerzo_inicio: limpiar ? null : almuerzo_inicio, almuerzo_fin: limpiar ? null : almuerzo_fin }));
  }));

  // ---- Bloqueos de agenda ----
  router.get('/bloqueos', asyncHandler(async (req, res) => {
    const { id_medico, from, to } = req.query;
    const where = [];
    const params = [];
    if (id_medico) { params.push(id_medico); where.push(`id_medico = $${params.length}`); }
    if (from) { params.push(from); where.push(`fecha >= $${params.length}`); }
    if (to) { params.push(to); where.push(`fecha <= $${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT id_bloqueo, id_medico, fecha, hora_inicio, hora_fin, motivo, created_at
         FROM bloqueos_agenda ${whereSql} ORDER BY fecha, hora_inicio`,
      params
    );
    res.json(ApiResponse.success(rows));
  }));

  router.post('/bloqueos', requireRol('admin'), asyncHandler(async (req, res) => {
    const { id_medico, fecha, hora_inicio, hora_fin, motivo } = req.body || {};
    if (!id_medico) throw new ValidationError('id_medico es requerido');
    if (!fecha) throw new ValidationError('fecha es requerida');
    if (!HORA_RE.test(hora_inicio || '') || !HORA_RE.test(hora_fin || '')) {
      throw new ValidationError('hora_inicio y hora_fin deben ser horas válidas');
    }
    if (hora_fin <= hora_inicio) throw new ValidationError('hora_fin debe ser mayor que hora_inicio');

    const { rows } = await queryAs(
      req.user.id_empleado,
      `INSERT INTO bloqueos_agenda (id_medico, fecha, hora_inicio, hora_fin, motivo, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id_bloqueo, id_medico, fecha, hora_inicio, hora_fin, motivo`,
      [id_medico, fecha, hora_inicio, hora_fin, motivo || null, req.user.id_empleado]
    );
    res.status(201).json(ApiResponse.success(rows[0], 'Bloqueo creado'));
  }));

  router.delete('/bloqueos/:id', requireRol('admin'), asyncHandler(async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM bloqueos_agenda WHERE id_bloqueo = $1', [req.params.id]);
    if (rowCount === 0) throw new NotFoundError('Bloqueo');
    res.json(ApiResponse.success({ eliminado: true }));
  }));

  // ---- Disponibilidad real (BE-02 / CIT-09) ----
  // GET /disponibilidad?id_medico=&id_especialidad=&id_sede=&fecha=&dias=
  router.get('/disponibilidad', asyncHandler(async (req, res) => {
    const { id_medico, id_especialidad, id_sede } = req.query;
    const fechaBase = req.query.fecha || new Date().toISOString().slice(0, 10);
    const dias = Math.min(14, Math.max(1, parseInt(req.query.dias, 10) || 5));

    const cfg = (await pool.query('SELECT * FROM configuracion_agenda WHERE id = 1')).rows[0];
    if (!cfg) throw new NotFoundError('Configuración de agenda');

    // Médicos objetivo
    const medWhere = ['emp.activo = TRUE'];
    const medParams = [];
    if (id_medico) { medParams.push(id_medico); medWhere.push(`m.id_medico = $${medParams.length}`); }
    if (id_especialidad) { medParams.push(id_especialidad); medWhere.push(`mesp.id_especialidad = $${medParams.length}`); }
    if (id_sede) { medParams.push(id_sede); medWhere.push(`ms.id_sede = $${medParams.length}`); }

    const { rows: medicos } = await pool.query(
      `SELECT DISTINCT m.id_medico, m.almuerzo_inicio, m.almuerzo_fin,
              pm.nombres, pm.apellidos
         FROM medicos m
         JOIN empleados emp ON m.id_empleado = emp.id_empleado
         JOIN personas pm   ON emp.id_persona = pm.id_persona
         LEFT JOIN medico_especialidad mesp ON m.id_medico = mesp.id_medico
         LEFT JOIN medico_sede ms           ON m.id_medico = ms.id_medico
        WHERE ${medWhere.join(' AND ')}`,
      medParams
    );

    const fechas = Array.from({ length: dias }, (_, i) => {
      const d = new Date(`${fechaBase}T00:00:00`);
      d.setDate(d.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
    const fechaFin = fechas[fechas.length - 1];

    const resultado = [];
    for (const med of medicos) {
      // Bloqueos y citas del médico en el rango, agrupados por fecha
      const [{ rows: bloqueos }, { rows: citas }] = await Promise.all([
        pool.query(
          `SELECT fecha::text AS fecha, hora_inicio::text, hora_fin::text
             FROM bloqueos_agenda WHERE id_medico = $1 AND fecha BETWEEN $2 AND $3`,
          [med.id_medico, fechaBase, fechaFin]
        ),
        pool.query(
          `SELECT fecha_cita::text AS fecha, hora_inicio::text, hora_fin::text
             FROM citas
            WHERE id_medico = $1 AND deleted_at IS NULL
              AND estado NOT IN ('cancelada', 'no_asistio')
              AND fecha_cita BETWEEN $2 AND $3`,
          [med.id_medico, fechaBase, fechaFin]
        ),
      ]);

      const dispPorFecha = fechas.map((fecha) => {
        const slots = calcularSlotsLibres({
          jornadaInicio: cfg.jornada_inicio,
          jornadaFin: cfg.jornada_fin,
          duracionMin: cfg.duracion_slot_min,
          almuerzo: med.almuerzo_inicio ? { inicio: med.almuerzo_inicio, fin: med.almuerzo_fin } : null,
          bloqueos: bloqueos.filter((b) => b.fecha === fecha),
          ocupados: citas.filter((c) => c.fecha === fecha),
        });
        return { fecha, slots };
      });

      resultado.push({
        id_medico: med.id_medico,
        nombre_medico: `${med.nombres} ${med.apellidos}`,
        disponibilidad: dispPorFecha,
      });
    }

    res.json(ApiResponse.success({
      duracion_slot_min: cfg.duracion_slot_min,
      medicos: resultado,
    }));
  }));

  return router;
}

module.exports = createAgendaModule;
