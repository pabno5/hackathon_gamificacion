const express = require('express');
const { z } = require('zod');
const { getPool, queryAs } = require('../../infrastructure/db');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const validate = require('../../shared/middleware/validate.middleware');
const { requireApiKey } = require('../../shared/middleware/apiKey.middleware');

const pool = getPool();

const tipoDocumento = z.enum(['CC', 'TI', 'CE', 'PAS', 'NIT']);
const uuid = z.string().uuid();
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'formato HH:MM[:SS]');

/**
 * Payload que envía n8n (a partir de lo que Vapi capturó en la llamada).
 * El paciente se busca por documento y se crea si no existe.
 */
const schema = z.object({
  paciente: z.object({
    tipo_documento: tipoDocumento,
    numero_documento: z.string().trim().min(5).max(30),
    nombres: z.string().trim().min(2).max(100),
    apellidos: z.string().trim().min(2).max(100),
    telefono: z.string().trim().min(7).max(20).optional().nullable(),
    correo: z.string().email().optional().nullable(),
  }),
  id_medico: uuid,
  id_sede: uuid,
  id_especialidad: uuid.optional().nullable(),
  fecha_cita: z.string().date(),
  hora_inicio: hora,
  hora_fin: hora.optional().nullable(),
  motivo: z.string().max(255).optional().nullable(),
});

/** Suma minutos a 'HH:MM[:SS]' → 'HH:MM'. */
function sumarMin(horaStr, min) {
  const [h, m] = String(horaStr).split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** Busca paciente por documento; si no existe lo crea (write de sistema). */
async function buscarOCrearPaciente(p) {
  const found = await pool.query(
    'SELECT id_persona FROM personas WHERE numero_documento = $1 AND deleted_at IS NULL LIMIT 1',
    [p.numero_documento]
  );
  if (found.rows.length > 0) return found.rows[0].id_persona;

  const { rows } = await queryAs(
    null, // actor de sistema (callcenter)
    `INSERT INTO personas (tipo_documento, numero_documento, nombres, apellidos, telefono, correo)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_persona`,
    [p.tipo_documento, p.numero_documento, p.nombres, p.apellidos, p.telefono || null, p.correo || null]
  );
  return rows[0].id_persona;
}

/**
 * Router del callcenter (BE-03). Autenticado por API key, sin login de empleado.
 * Reusa CitasService.crear → misma validación de choque + sync a Google Calendar.
 */
function buildCallcenterRouter(citasService) {
  const router = express.Router();

  router.post(
    '/citas',
    requireApiKey('CALLCENTER_API_KEY'),
    validate(schema),
    asyncHandler(async (req, res) => {
      const datos = req.body;

      // Duración de slot desde la config global si no viene hora_fin
      let horaFin = datos.hora_fin;
      if (!horaFin) {
        const cfg = await pool.query('SELECT duracion_slot_min FROM configuracion_agenda WHERE id = 1');
        const dur = cfg.rows[0]?.duracion_slot_min || 30;
        horaFin = sumarMin(datos.hora_inicio, dur);
      }

      const idPaciente = await buscarOCrearPaciente(datos.paciente);

      // Reusa el service: valida choque de médico + emite cita.created (Calendar sync).
      const cita = await citasService.crear(
        {
          id_paciente: idPaciente,
          id_medico: datos.id_medico,
          id_sede: datos.id_sede,
          id_especialidad: datos.id_especialidad || null,
          fecha_cita: datos.fecha_cita,
          hora_inicio: datos.hora_inicio,
          hora_fin: horaFin,
          motivo: datos.motivo || 'Agendada por callcenter',
          canal: 'telefonico',
        },
        null // actor de sistema
      );

      res.status(201).json(ApiResponse.success(cita, 'Cita agendada por callcenter'));
    })
  );

  return router;
}

module.exports = buildCallcenterRouter;
