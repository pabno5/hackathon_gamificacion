-- Script de configuración de base de datos para el sistema de autenticación con Firebase
-- Ejecuta este script en tu base de datos Supabase

-- Crear tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('administrador', 'empleado')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice en firebase_uid para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_firebase_uid ON usuarios(firebase_uid);

-- Crear índice en email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Crear índice en rol para filtrado por rol
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- Comentarios para documentación
COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema con autenticación Firebase y roles';
COMMENT ON COLUMN usuarios.id IS 'Identificador único del usuario en la base de datos';
COMMENT ON COLUMN usuarios.firebase_uid IS 'UID del usuario en Firebase Authentication';
COMMENT ON COLUMN usuarios.email IS 'Correo electrónico único del usuario';
COMMENT ON COLUMN usuarios.nombre IS 'Nombre completo del usuario';
COMMENT ON COLUMN usuarios.rol IS 'Rol del usuario: administrador o empleado';
COMMENT ON COLUMN usuarios.created_at IS 'Fecha de creación del usuario';



