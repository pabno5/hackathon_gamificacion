const { z } = require('zod');

const tipoDocumento = z.enum(['CC', 'TI', 'CE', 'PAS', 'NIT']);
const rolEnum = z.enum(['admin', 'medico', 'recepcionista']);

const crear = z.object({
  tipo_documento: tipoDocumento,
  numero_documento: z.string().trim().min(5).max(30),
  nombres: z.string().trim().min(2).max(100),
  apellidos: z.string().trim().min(2).max(100),
  correo: z.string().email(),
  password: z.string().min(8, 'password debe tener al menos 8 caracteres').max(72),
  rol: rolEnum,
  telefono: z.string().trim().min(7).max(20).optional().nullable(),
  direccion: z.string().max(200).optional().nullable(),
  fecha_nacimiento: z.string().date().optional().nullable(),
});

const reiniciarTour = z.object({
  motivo: z.string().min(1).max(500).optional().nullable(),
});

module.exports = { crear, reiniciarTour };
