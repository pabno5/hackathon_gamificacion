const { z } = require('zod');

const canal = z.enum(['presencial', 'telefonico']);
const estado = z.enum([
  'pendiente', 'confirmada', 'en_atencion', 'completada', 'cancelada', 'no_asistio',
]);

const uuid = z.string().uuid();
const fecha = z.string().date();   // YYYY-MM-DD
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'formato HH:MM[:SS]');

const crear = z.object({
  id_paciente: uuid,
  id_medico: uuid,
  id_sede: uuid,
  id_especialidad: uuid.optional().nullable(),
  fecha_cita: fecha,
  hora_inicio: hora,
  hora_fin: hora,
  motivo: z.string().max(255).optional().nullable(),
  canal,
}).refine(
  (v) => v.hora_fin > v.hora_inicio,
  { message: 'hora_fin debe ser mayor que hora_inicio', path: ['hora_fin'] }
);

const actualizar = z.object({
  id_medico: uuid.optional(),
  id_sede: uuid.optional(),
  id_especialidad: uuid.optional().nullable(),
  fecha_cita: fecha.optional(),
  hora_inicio: hora.optional(),
  hora_fin: hora.optional(),
  motivo: z.string().max(255).optional().nullable(),
  estado: estado.optional(),
});

const cancelar = z.object({
  motivo_cancelacion: z.string().min(3).max(500),
});

const listar = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  id_paciente: uuid.optional(),
  id_medico: uuid.optional(),
  id_sede: uuid.optional(),
  estado: estado.optional(),
  canal: canal.optional(),
  from: fecha.optional(),
  to: fecha.optional(),
});

const disponibilidad = z.object({
  id_especialidad: uuid.optional(),
  id_sede: uuid.optional(),
});

module.exports = { crear, actualizar, cancelar, listar, disponibilidad };
