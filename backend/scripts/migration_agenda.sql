-- Migración BE-02: configuración de turnos + disponibilidad real.
--
-- Ejecutar contra la BD viva (Supabase → SQL Editor). Idempotente.
--
-- 1) Jornada global (un solo registro editable por admin), default 06:00–17:00.
-- 2) Hora de almuerzo por médico.
-- 3) Bloqueos puntuales de agenda por médico (vacaciones, reuniones, ausencias).

-- 1. Configuración global de la agenda -------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_agenda (
    id                 INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    jornada_inicio     TIME NOT NULL DEFAULT '06:00',
    jornada_fin        TIME NOT NULL DEFAULT '17:00',
    duracion_slot_min  INT  NOT NULL DEFAULT 30 CHECK (duracion_slot_min BETWEEN 5 AND 240),
    updated_at         TIMESTAMP DEFAULT NOW() NOT NULL
);
INSERT INTO configuracion_agenda (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Almuerzo por médico ----------------------------------------------------
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS almuerzo_inicio TIME;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS almuerzo_fin    TIME;

-- 3. Bloqueos de agenda -----------------------------------------------------
CREATE TABLE IF NOT EXISTS bloqueos_agenda (
    id_bloqueo  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico   UUID NOT NULL REFERENCES medicos(id_medico) ON DELETE CASCADE,
    fecha       DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    motivo      VARCHAR(255),
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by  UUID REFERENCES empleados(id_empleado),
    CHECK (hora_fin > hora_inicio)
);
CREATE INDEX IF NOT EXISTS idx_bloqueos_medico_fecha ON bloqueos_agenda(id_medico, fecha);
