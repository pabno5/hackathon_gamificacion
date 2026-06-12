const { z } = require('zod');

const crear = z.object({
  nombre: z.string().trim().min(2).max(100),
  descripcion: z.string().max(1000).optional().nullable(),
});

const actualizar = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  descripcion: z.string().max(1000).optional().nullable(),
  activa: z.boolean().optional(),
});

module.exports = { crear, actualizar };
