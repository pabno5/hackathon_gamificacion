const { z } = require('zod');

const tipoDocumento = z.enum(['CC', 'TI', 'CE', 'PAS', 'NIT']);

const crear = z.object({
  tipo_documento: tipoDocumento,
  numero_documento: z.string().trim().min(5).max(30),
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  fecha_nacimiento: z.string().date().optional().nullable(),
  telefono: z.string().trim().min(7).max(20).optional().nullable(),
  telefono_emergencia: z.string().trim().min(7).max(20).optional().nullable(),
  correo: z.string().email().optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
});

const actualizar = crear.partial().omit({ numero_documento: true });

const listar = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
});

module.exports = { crear, actualizar, listar };
