-- ==========================================
-- 1. TABLA: Personas
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE personas (
    id_persona UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento VARCHAR(20) NOT NULL,  -- CC, TI, CE, PAS, etc.
    numero_documento VARCHAR(30) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono VARCHAR(20),
    correo VARCHAR(150) UNIQUE,
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. TABLA: Roles
-- ==========================================
CREATE TABLE roles (
    id_rol UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 3. TABLA: Credenciales
-- ==========================================
CREATE TABLE credenciales (
    id_credencial UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    id_rol UUID,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    firebase_id VARCHAR(200), -- 🔥 nuevo campo para ID de Firebase
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_rol) REFERENCES roles (id_rol)
        ON UPDATE CASCADE ON DELETE SET NULL
);

-- ==========================================
-- 4. TABLA: Médicos
-- ==========================================
CREATE TABLE medicos (
    id_medico UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ==========================================
-- 5. TABLA: Especialidades
-- ==========================================
CREATE TABLE especialidades (
    id_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    activa BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- 6. TABLA: Relación médico ↔ especialidad (N:N)
-- ==========================================
CREATE TABLE medico_especialidad (
    id_medico_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico UUID NOT NULL,
    id_especialidad UUID NOT NULL,
    FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_especialidad) REFERENCES especialidades (id_especialidad)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (id_medico, id_especialidad)
);

-- ==========================================
-- 7. TABLA: Documentos
-- ==========================================
CREATE TABLE documentos (
    id_documento UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona UUID NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL,   -- Ej: "Historia clínica", "Examen", "Receta"
    enlace TEXT NOT NULL,                  -- Enlace al archivo (PDF, imagen, etc.)
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_persona) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- ==========================================
-- 8. TABLA: Citas
-- ==========================================
CREATE TABLE citas (
    id_cita UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente UUID NOT NULL,
    id_medico UUID NOT NULL,
    id_documento UUID UNIQUE,  -- 🔗 cada cita puede tener un documento asociado
    fecha_cita TIMESTAMP NOT NULL,
    motivo VARCHAR(255),
    estado VARCHAR(50) DEFAULT 'pendiente',  -- pendiente, confirmada, cancelada, completada
    observaciones TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_paciente) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_medico) REFERENCES medicos (id_medico)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (id_documento) REFERENCES documentos (id_documento)
        ON UPDATE CASCADE ON DELETE SET NULL
);