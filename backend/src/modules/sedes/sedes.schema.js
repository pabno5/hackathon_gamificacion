const { z } = require('zod');

const crear = z.object({
  nombre: z.string().trim().min(2).max(100),
  direccion: z.string().max(200).optional().nullable(),
  telefono: z.string().max(20).optional().nullable(),
  ciudad: z.string().max(100).optional().nullable(),
  google_calendar_id: z.string().max(255).optional().nullable(),
});

const actualizar = crear.partial().extend({
  activa: z.boolean().optional(),
});

module.exports = { crear, actualizar };
