-- ==========================================
-- TABLA: Historias Clínicas (Solo datos específicos)
-- ==========================================

CREATE TABLE IF NOT EXISTS historias_clinicas (
    -- Identificación del registro
    id_historia_clinica UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente UUID NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 1. Motivo de consulta
    motivo_consulta TEXT,
    
    -- 2. Enfermedad actual
    enfermedad_actual TEXT,
    
    -- 3. Antecedentes personales
    antecedentes_patologicos TEXT,
    antecedentes_quirurgicos TEXT,
    alergias TEXT,
    antecedentes_traumaticos TEXT,
    antecedentes_farmacologicos TEXT,
    antecedentes_gineco_obstetricos TEXT,
    habitos TEXT,
    
    -- 4. Antecedentes familiares
    antecedentes_familiares TEXT,
    
    -- 5. Revisión por sistemas
    revision_general TEXT,
    revision_cardiovascular TEXT,
    revision_respiratorio TEXT,
    revision_digestivo TEXT,
    revision_urinario TEXT,
    revision_nervioso TEXT,
    revision_musculo_esqueletico TEXT,
    revision_sensorial TEXT,
    
    -- 6. Examen físico
    tension_arterial VARCHAR(50),
    frecuencia_cardiaca VARCHAR(50),
    frecuencia_respiratoria VARCHAR(50),
    temperatura VARCHAR(50),
    peso VARCHAR(50),
    talla VARCHAR(50),
    exploracion_sistemas TEXT,
    agudeza_visual VARCHAR(100),
    fondo_ojo VARCHAR(100),
    reflejos_pupilares VARCHAR(100),
    
    -- 7. Diagnóstico
    diagnostico_principal VARCHAR(255),
    diagnostico_secundario VARCHAR(255),
    
    -- 8. Plan de manejo
    medicamentos_recetados TEXT,
    indicaciones_paciente TEXT,
    recomendaciones TEXT,
    interconsultas_examenes TEXT,
    
    -- 9. Evolución y seguimiento
    evolucion_seguimiento TEXT,
    
    -- Relaciones
    FOREIGN KEY (id_paciente) REFERENCES personas (id_persona)
        ON UPDATE CASCADE ON DELETE CASCADE
);

-- Índice para búsquedas rápidas por paciente
CREATE INDEX IF NOT EXISTS idx_historias_clinicas_paciente ON historias_clinicas(id_paciente);

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_historias_clinicas_fecha ON historias_clinicas(fecha_creacion DESC);

COMMENT ON TABLE historias_clinicas IS 'Registros de historia clínica específicos de pacientes';