-- ===================================
-- SCHEMA DE BASE DE DATOS
-- Firebase Data Connect (Cloud SQL - PostgreSQL)
-- ===================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. TABLA: Personas
-- ===================================
CREATE TABLE IF NOT EXISTS personas (
    id_persona UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(20) NOT NULL,
    numero_documento VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    correo VARCHAR(150) UNIQUE,
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_personas_documento ON personas(numero_documento);
CREATE INDEX IF NOT EXISTS idx_personas_correo ON personas(correo);

-- ===================================
-- 2. TABLA: Roles
-- ===================================
CREATE TABLE IF NOT EXISTS roles (
    id_rol UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_nombre ON roles(nombre);

-- ===================================
-- 3. TABLA: Credenciales
-- ===================================
CREATE TABLE IF NOT EXISTS credenciales (
    id_credencial UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    id_rol UUID NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    firebase_uid VARCHAR(255) UNIQUE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_credenciales_usuario ON credenciales(usuario);
CREATE INDEX IF NOT EXISTS idx_credenciales_firebase_uid ON credenciales(firebase_uid);

-- ===================================
-- 4. TABLA: Médicos
-- ===================================
CREATE TABLE IF NOT EXISTS medicos (
    id_medico UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_medicos_licencia ON medicos(numero_licencia);

-- ===================================
-- 5. TABLA: Especialidades
-- ===================================
CREATE TABLE IF NOT EXISTS especialidades (
    id_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE
);

-- ===================================
-- 6. TABLA: Relación Médico ↔ Especialidad (N:N)
-- ===================================
CREATE TABLE IF NOT EXISTS medico_especialidad (
    id_medico_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico UUID NOT NULL,
    id_especialidad UUID NOT NULL,
    FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_especialidad) REFERENCES especialidades (id_especialidad)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (id_medico, id_especialidad)
);

-- ===================================
-- 7. TABLA: Documentos
-- ===================================
CREATE TABLE IF NOT EXISTS documentos (
    id_documento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    enlace TEXT NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ===================================
-- 8. TABLA: Citas
-- ===================================
CREATE TABLE IF NOT EXISTS citas (
    id_cita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente UUID NOT NULL,
    id_medico UUID NOT NULL,
    fecha_cita TIMESTAMP NOT NULL,
    motivo VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'pendiente',
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_paciente) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente ON citas(id_paciente);
CREATE INDEX IF NOT EXISTS idx_citas_medico ON citas(id_medico);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- ===================================
-- ROLES POR DEFECTO
-- ===================================
INSERT INTO roles (nombre, descripcion) 
VALUES 
    ('administrador', 'Administrador del sistema con acceso completo'),
    ('medico', 'Profesional de la salud'),
    ('paciente', 'Paciente del sistema'),
    ('empleado', 'Empleado administrativo')
ON CONFLICT (nombre) DO NOTHING;

