-- ===================================
-- DATOS DE INICIALIZACIÓN
-- Script para insertar datos de prueba
-- ===================================

-- Verificar roles (ya deberían existir del schema.sql)
SELECT * FROM roles;

-- Si no existen, crearlos:
INSERT INTO roles (nombre, descripcion) VALUES 
  ('administrador', 'Administrador del sistema con acceso completo'),
  ('medico', 'Profesional de la salud'),
  ('paciente', 'Paciente del sistema'),
  ('empleado', 'Empleado administrativo')
ON CONFLICT (nombre) DO NOTHING;

-- Crear especialidades de ejemplo
INSERT INTO especialidades (nombre, descripcion, activa) VALUES
  ('Medicina General', 'Atención médica general y preventiva', true),
  ('Cardiología', 'Especialista en enfermedades del corazón', true),
  ('Pediatría', 'Atención médica para niños y adolescentes', true),
  ('Dermatología', 'Especialista en enfermedades de la piel', true),
  ('Oftalmología', 'Especialista en enfermedades de los ojos', true),
  ('Traumatología', 'Especialista en lesiones musculoesqueléticas', true),
  ('Psiquiatría', 'Especialista en salud mental', true),
  ('Ginecología', 'Especialista en salud femenina', true)
ON CONFLICT (nombre) DO NOTHING;

-- Verificar que se crearon
SELECT * FROM especialidades;

-- ===================================
-- DATOS DE PRUEBA (OPCIONAL)
-- Descomenta estas líneas si deseas crear usuarios de prueba
-- ===================================

/*
-- Crear persona de administrador
INSERT INTO personas (tipo_documento, numero_documento, nombres, apellidos, correo, telefono)
VALUES ('CC', '1000000001', 'Admin', 'Sistema', 'admin@sistema.com', '+57 300 0000001');

-- Obtener el id_persona del admin (necesitarás este UUID)
SELECT id_persona FROM personas WHERE numero_documento = '1000000001';

-- Obtener el id_rol de administrador
SELECT id_rol FROM roles WHERE nombre = 'administrador';

-- Crear credencial de administrador (reemplaza los UUIDs)
-- La contraseña es: Admin123!
INSERT INTO credenciales (id_persona, id_rol, usuario, contrasena_hash, activo)
VALUES (
  'UUID_DE_PERSONA',
  'UUID_DE_ROL_ADMIN',
  'admin',
  '$2a$10$X8qZ.nFzHxXL0Y3nXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX',
  true
);
*/

-- ===================================
-- VERIFICAR DATOS
-- ===================================
SELECT COUNT(*) as total_roles FROM roles;
SELECT COUNT(*) as total_especialidades FROM especialidades;
SELECT COUNT(*) as total_personas FROM personas;
SELECT COUNT(*) as total_credenciales FROM credenciales;

