-- ============================================================
-- SCHEMA — Clínica Cárdenas Visión
-- Fuente de verdad: DocumentosProyecto/SCHEMA.md (v1.0)
-- Motor: PostgreSQL 15 (Supabase) · Auth: Supabase Auth (auth.users)
-- ============================================================

-- 0. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. PERSONAS (pacientes + empleados)
-- ============================================================
CREATE TABLE personas (
    id_persona       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento   VARCHAR(10) NOT NULL,
    numero_documento VARCHAR(30) UNIQUE NOT NULL,
    nombres          VARCHAR(100) NOT NULL,
    apellidos        VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono         VARCHAR(20),
    correo           VARCHAR(150),
    direccion        VARCHAR(200),
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at       TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at       TIMESTAMP,
    created_by       UUID
);
CREATE INDEX idx_personas_numero_documento ON personas(numero_documento);
CREATE INDEX idx_personas_correo ON personas(correo);
CREATE INDEX idx_personas_deleted_at ON personas(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================
-- 2. ROLES
-- ============================================================
CREATE TABLE roles (
    id_rol      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================================
-- 3. EMPLEADOS
-- ============================================================
CREATE TABLE empleados (
    id_empleado  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona   UUID NOT NULL UNIQUE REFERENCES personas(id_persona)
                     ON UPDATE CASCADE ON DELETE RESTRICT,
    id_rol       UUID NOT NULL REFERENCES roles(id_rol)
                     ON UPDATE CASCADE ON DELETE RESTRICT,
    auth_uid     UUID UNIQUE,
    activo       BOOLEAN DEFAULT TRUE,
    primer_login BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by   UUID REFERENCES empleados(id_empleado)
);
CREATE INDEX idx_empleados_auth_uid ON empleados(auth_uid);
CREATE INDEX idx_empleados_id_rol ON empleados(id_rol);
CREATE INDEX idx_empleados_activo ON empleados(activo) WHERE activo = TRUE;

-- FK diferida de personas.created_by -> empleados
ALTER TABLE personas
    ADD CONSTRAINT fk_personas_created_by
    FOREIGN KEY (created_by) REFERENCES empleados(id_empleado)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================
-- 4. MÉDICOS
-- ============================================================
CREATE TABLE medicos (
    id_medico       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado     UUID NOT NULL UNIQUE REFERENCES empleados(id_empleado)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado)
);

-- ============================================================
-- 5. ESPECIALIDADES
-- ============================================================
CREATE TABLE especialidades (
    id_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) UNIQUE NOT NULL,
    descripcion     TEXT,
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado)
);

-- ============================================================
-- 6. MÉDICO ↔ ESPECIALIDAD (N:N)
-- ============================================================
CREATE TABLE medico_especialidad (
    id_medico_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico              UUID NOT NULL REFERENCES medicos(id_medico)
                               ON UPDATE CASCADE ON DELETE CASCADE,
    id_especialidad        UUID NOT NULL REFERENCES especialidades(id_especialidad)
                               ON UPDATE CASCADE ON DELETE CASCADE,
    created_at             TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by             UUID REFERENCES empleados(id_empleado),
    UNIQUE (id_medico, id_especialidad)
);

-- ============================================================
-- 7. SEDES
-- ============================================================
CREATE TABLE sedes (
    id_sede            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre             VARCHAR(100) NOT NULL,
    direccion          VARCHAR(200),
    telefono           VARCHAR(20),
    ciudad             VARCHAR(100),
    google_calendar_id VARCHAR(255),
    activa             BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at         TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by         UUID REFERENCES empleados(id_empleado)
);

-- ============================================================
-- 8. MÉDICO ↔ SEDE (N:N)
-- ============================================================
CREATE TABLE medico_sede (
    id_medico_sede UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico      UUID NOT NULL REFERENCES medicos(id_medico)
                       ON UPDATE CASCADE ON DELETE CASCADE,
    id_sede        UUID NOT NULL REFERENCES sedes(id_sede)
                       ON UPDATE CASCADE ON DELETE CASCADE,
    activo         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by     UUID REFERENCES empleados(id_empleado),
    UNIQUE (id_medico, id_sede)
);

-- ============================================================
-- 9. CITAS
-- ============================================================
CREATE TYPE estado_cita AS ENUM (
    'pendiente','confirmada','en_atencion','completada','cancelada','no_asistio'
);
CREATE TYPE canal_cita AS ENUM ('presencial','telefonico');

CREATE TABLE citas (
    id_cita                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente              UUID NOT NULL REFERENCES personas(id_persona)
                                 ON UPDATE CASCADE ON DELETE RESTRICT,
    id_medico                UUID NOT NULL REFERENCES medicos(id_medico)
                                 ON UPDATE CASCADE ON DELETE RESTRICT,
    id_sede                  UUID NOT NULL REFERENCES sedes(id_sede)
                                 ON UPDATE CASCADE ON DELETE RESTRICT,
    id_especialidad          UUID REFERENCES especialidades(id_especialidad)
                                 ON UPDATE CASCADE ON DELETE SET NULL,
    fecha_cita               DATE NOT NULL,
    hora_inicio              TIME NOT NULL,
    hora_fin                 TIME NOT NULL,
    motivo                   VARCHAR(255),
    estado                   estado_cita DEFAULT 'pendiente' NOT NULL,
    canal                    canal_cita NOT NULL,
    motivo_cancelacion       TEXT,
    google_calendar_event_id VARCHAR(255) UNIQUE,
    created_at               TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at               TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by               UUID REFERENCES empleados(id_empleado),
    updated_by               UUID REFERENCES empleados(id_empleado),
    deleted_at               TIMESTAMP
);
CREATE INDEX idx_citas_paciente ON citas(id_paciente);
CREATE INDEX idx_citas_medico ON citas(id_medico);
CREATE INDEX idx_citas_sede ON citas(id_sede);
CREATE INDEX idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_gcal ON citas(google_calendar_event_id);
CREATE INDEX idx_citas_activas ON citas(fecha_cita, id_medico) WHERE deleted_at IS NULL;
ALTER TABLE citas ADD CONSTRAINT chk_cita_horas CHECK (hora_fin > hora_inicio);
ALTER TABLE citas ADD CONSTRAINT chk_motivo_cancelacion
    CHECK (estado != 'cancelada' OR motivo_cancelacion IS NOT NULL);

-- ============================================================
-- 10. DOCUMENTOS
-- ============================================================
CREATE TABLE documentos (
    id_documento   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona     UUID NOT NULL REFERENCES personas(id_persona)
                       ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_documento VARCHAR(50) NOT NULL,
    nombre_archivo VARCHAR(255),
    enlace         TEXT NOT NULL,
    tamanio_bytes  BIGINT,
    mime_type      VARCHAR(100),
    created_at     TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by     UUID REFERENCES empleados(id_empleado),
    deleted_at     TIMESTAMP
);
CREATE INDEX idx_documentos_persona ON documentos(id_persona);

-- ============================================================
-- 11. HISTORIAS CLÍNICAS
-- ============================================================
CREATE TABLE historias_clinicas (
    id_historia                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente                     UUID NOT NULL REFERENCES personas(id_persona)
                                        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_medico                       UUID REFERENCES medicos(id_medico)
                                        ON UPDATE CASCADE ON DELETE SET NULL,
    id_cita                         UUID REFERENCES citas(id_cita)
                                        ON UPDATE CASCADE ON DELETE SET NULL,
    motivo_consulta                 TEXT,
    enfermedad_actual               TEXT,
    antecedentes_patologicos        TEXT,
    antecedentes_quirurgicos        TEXT,
    alergias                        TEXT,
    antecedentes_traumaticos        TEXT,
    antecedentes_farmacologicos     TEXT,
    antecedentes_gineco_obstetricos TEXT,
    habitos                         TEXT,
    antecedentes_familiares         TEXT,
    revision_general                TEXT,
    revision_cardiovascular         TEXT,
    revision_respiratorio           TEXT,
    revision_digestivo              TEXT,
    revision_urinario               TEXT,
    revision_nervioso               TEXT,
    revision_musculo_esqueletico    TEXT,
    revision_sensorial              TEXT,
    tension_arterial                VARCHAR(20),
    frecuencia_cardiaca             VARCHAR(20),
    frecuencia_respiratoria         VARCHAR(20),
    temperatura                     VARCHAR(10),
    peso                            VARCHAR(10),
    talla                           VARCHAR(10),
    exploracion_sistemas            TEXT,
    agudeza_visual                  TEXT,
    fondo_ojo                       TEXT,
    reflejos_pupilares              TEXT,
    diagnostico_principal           TEXT,
    diagnostico_secundario          TEXT,
    medicamentos_recetados          TEXT,
    indicaciones_paciente           TEXT,
    recomendaciones                 TEXT,
    interconsultas_examenes         TEXT,
    evolucion_seguimiento           TEXT,
    nombre_medico                   VARCHAR(200),
    especialidad_medico             VARCHAR(100),
    registro_profesional            VARCHAR(50),
    fecha_firma                     DATE,
    created_at                      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at                      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by                      UUID REFERENCES empleados(id_empleado),
    updated_by                      UUID REFERENCES empleados(id_empleado),
    deleted_at                      TIMESTAMP
);
CREATE INDEX idx_hc_paciente ON historias_clinicas(id_paciente);
CREATE INDEX idx_hc_medico ON historias_clinicas(id_medico);
CREATE INDEX idx_hc_created_at ON historias_clinicas(created_at DESC);

-- ============================================================
-- 12. GAMIFICACIÓN — CATÁLOGO DE FEATURES
-- ============================================================
CREATE TABLE gamificacion_features (
    id_feature  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(10) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    rol         VARCHAR(50) NOT NULL CHECK (rol IN ('recepcionista','medico','admin')),
    orden       INTEGER NOT NULL,
    activa      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_gf_rol ON gamificacion_features(rol) WHERE activa = TRUE;

-- ============================================================
-- 13. GAMIFICACIÓN — PROGRESO POR EMPLEADO
-- ============================================================
CREATE TABLE gamificacion_progreso (
    id_progreso  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado  UUID NOT NULL REFERENCES empleados(id_empleado)
                     ON UPDATE CASCADE ON DELETE CASCADE,
    id_feature   UUID NOT NULL REFERENCES gamificacion_features(id_feature)
                     ON UPDATE CASCADE ON DELETE CASCADE,
    visitada     BOOLEAN DEFAULT FALSE,
    fecha_visita TIMESTAMP,
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at   TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE (id_empleado, id_feature)
);
CREATE INDEX idx_gp_empleado ON gamificacion_progreso(id_empleado);
CREATE INDEX idx_gp_empleado_visitada ON gamificacion_progreso(id_empleado, visitada);

-- ============================================================
-- 14. GAMIFICACIÓN — SESIONES DE TOUR
-- ============================================================
CREATE TABLE gamificacion_sesiones_tour (
    id_sesion           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado         UUID NOT NULL REFERENCES empleados(id_empleado)
                            ON UPDATE CASCADE ON DELETE CASCADE,
    activado_por        UUID REFERENCES empleados(id_empleado),
    motivo_reactivacion TEXT,
    completado          BOOLEAN DEFAULT FALSE,
    fecha_completado    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_tour_empleado ON gamificacion_sesiones_tour(id_empleado);

-- ============================================================
-- 15. AUDIT LOG
-- ============================================================
CREATE TABLE audit_log (
    id_audit         BIGSERIAL PRIMARY KEY,
    tabla_afectada   VARCHAR(100) NOT NULL,
    accion           VARCHAR(10) NOT NULL CHECK (accion IN ('INSERT','UPDATE','DELETE')),
    id_registro      UUID,
    datos_anteriores JSONB,
    datos_nuevos     JSONB,
    id_empleado      UUID REFERENCES empleados(id_empleado),
    ip_address       VARCHAR(45),
    user_agent       VARCHAR(500),
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada);
CREATE INDEX idx_audit_registro ON audit_log(id_registro);
CREATE INDEX idx_audit_empleado ON audit_log(id_empleado);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);

-- ============================================================
-- 16. TRIGGERS
-- ============================================================

-- 16.1 updated_at automático
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_personas    BEFORE UPDATE ON personas           FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_empleados   BEFORE UPDATE ON empleados          FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_medicos     BEFORE UPDATE ON medicos            FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_especialid  BEFORE UPDATE ON especialidades     FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_sedes       BEFORE UPDATE ON sedes              FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_citas       BEFORE UPDATE ON citas              FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_historias   BEFORE UPDATE ON historias_clinicas FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_at_gp          BEFORE UPDATE ON gamificacion_progreso FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- 16.2 Audit automático
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_id_registro UUID;
    v_datos_ant   JSONB;
    v_datos_nue   JSONB;
    v_pk_col      TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_datos_nue := to_jsonb(NEW);
        v_datos_ant := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := NULL;
    END IF;

    -- Nombre de la PK por tabla (extraída del JSONB para evitar
    -- referenciar NEW.campo en tablas que no lo tienen).
    v_pk_col := CASE TG_TABLE_NAME
        WHEN 'personas'           THEN 'id_persona'
        WHEN 'citas'              THEN 'id_cita'
        WHEN 'historias_clinicas' THEN 'id_historia'
        WHEN 'empleados'          THEN 'id_empleado'
        ELSE NULL END;

    IF v_pk_col IS NOT NULL THEN
        v_id_registro := (COALESCE(v_datos_nue, v_datos_ant) ->> v_pk_col)::UUID;
    END IF;

    INSERT INTO audit_log (tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, TG_OP, v_id_registro, v_datos_ant, v_datos_nue);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_personas  AFTER INSERT OR UPDATE OR DELETE ON personas           FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
CREATE TRIGGER audit_citas     AFTER INSERT OR UPDATE OR DELETE ON citas              FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
CREATE TRIGGER audit_historias AFTER INSERT OR UPDATE OR DELETE ON historias_clinicas FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
CREATE TRIGGER audit_empleados AFTER INSERT OR UPDATE OR DELETE ON empleados          FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

-- 16.3 Inicializar progreso de gamificación al crear empleado
CREATE OR REPLACE FUNCTION inicializar_progreso_empleado()
RETURNS TRIGGER AS $$
DECLARE
    v_rol_nombre VARCHAR;
BEGIN
    SELECT nombre INTO v_rol_nombre FROM roles WHERE id_rol = NEW.id_rol;

    INSERT INTO gamificacion_progreso (id_empleado, id_feature, visitada)
    SELECT NEW.id_empleado, id_feature, FALSE
    FROM gamificacion_features
    WHERE rol = v_rol_nombre AND activa = TRUE;

    INSERT INTO gamificacion_sesiones_tour (id_empleado, activado_por)
    VALUES (NEW.id_empleado, NULL);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER init_gamificacion_on_empleado
    AFTER INSERT ON empleados
    FOR EACH ROW EXECUTE FUNCTION inicializar_progreso_empleado();

-- ============================================================
-- 17. VISTAS
-- ============================================================
CREATE VIEW v_gamificacion_resumen AS
SELECT
    e.id_empleado,
    p.nombres || ' ' || p.apellidos AS nombre_completo,
    r.nombre                         AS rol,
    e.activo,
    COUNT(gp.id_progreso)            AS total_features,
    COUNT(gp.id_progreso) FILTER (WHERE gp.visitada = TRUE) AS features_visitadas,
    ROUND(
        COUNT(gp.id_progreso) FILTER (WHERE gp.visitada = TRUE)::DECIMAL
        / NULLIF(COUNT(gp.id_progreso), 0) * 100, 1
    )                                AS porcentaje_completado,
    MAX(gp.fecha_visita)             AS ultima_actividad
FROM empleados e
JOIN personas p ON e.id_persona = p.id_persona
JOIN roles r    ON e.id_rol = r.id_rol
LEFT JOIN gamificacion_progreso gp ON e.id_empleado = gp.id_empleado
GROUP BY e.id_empleado, p.nombres, p.apellidos, r.nombre, e.activo;

CREATE VIEW v_disponibilidad_medicos AS
SELECT
    m.id_medico,
    p.nombres || ' ' || p.apellidos AS nombre_medico,
    s.id_sede,
    s.nombre                         AS sede,
    me.nombre                        AS especialidad
FROM medicos m
JOIN empleados emp        ON m.id_empleado = emp.id_empleado
JOIN personas p           ON emp.id_persona = p.id_persona
JOIN medico_sede ms       ON m.id_medico = ms.id_medico AND ms.activo = TRUE
JOIN sedes s              ON ms.id_sede = s.id_sede AND s.activa = TRUE
JOIN medico_especialidad mesp ON m.id_medico = mesp.id_medico
JOIN especialidades me    ON mesp.id_especialidad = me.id_especialidad AND me.activa = TRUE
WHERE emp.activo = TRUE;

-- ============================================================
-- 18. RLS — Row Level Security
-- ============================================================
ALTER TABLE personas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados             ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE historias_clinicas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamificacion_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_rol_actual()
RETURNS VARCHAR AS $$
    SELECT r.nombre
    FROM empleados e
    JOIN roles r ON e.id_rol = r.id_rol
    WHERE e.auth_uid = auth.uid() AND e.activo = TRUE
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_empleado_actual()
RETURNS UUID AS $$
    SELECT id_empleado FROM empleados
    WHERE auth_uid = auth.uid() AND activo = TRUE
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE POLICY "empleados_leen_personas" ON personas FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "recepcionista_admin_crean_personas" ON personas FOR INSERT
    WITH CHECK (get_rol_actual() IN ('recepcionista','admin'));
CREATE POLICY "recepcionista_admin_editan_personas" ON personas FOR UPDATE
    USING (get_rol_actual() IN ('recepcionista','admin'));

CREATE POLICY "recepcionista_admin_ven_citas" ON citas FOR SELECT
    USING (get_rol_actual() IN ('recepcionista','admin'));
CREATE POLICY "medico_ve_sus_citas" ON citas FOR SELECT
    USING (
        get_rol_actual() = 'medico'
        AND id_medico = (SELECT id_medico FROM medicos WHERE id_empleado = get_empleado_actual())
    );

CREATE POLICY "medico_admin_leen_historias" ON historias_clinicas FOR SELECT
    USING (get_rol_actual() IN ('medico','admin'));
CREATE POLICY "recepcionista_lee_historias_basico" ON historias_clinicas FOR SELECT
    USING (get_rol_actual() = 'recepcionista');

CREATE POLICY "empleado_ve_su_progreso" ON gamificacion_progreso FOR SELECT
    USING (id_empleado = get_empleado_actual() OR get_rol_actual() = 'admin');
CREATE POLICY "empleado_actualiza_su_progreso" ON gamificacion_progreso FOR UPDATE
    USING (id_empleado = get_empleado_actual());

CREATE POLICY "admin_lee_audit" ON audit_log FOR SELECT
    USING (get_rol_actual() = 'admin');

-- Tablas de referencia: lectura para cualquier empleado autenticado.
-- Necesario para Supabase Realtime y queries directas del frontend.
CREATE POLICY "empleados_leen_roles" ON roles FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_sedes" ON sedes FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_especialidades" ON especialidades FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_features" ON gamificacion_features FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_medicos" ON medicos FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_medico_especialidad" ON medico_especialidad FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_medico_sede" ON medico_sede FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleados_leen_documentos" ON documentos FOR SELECT
    USING (get_rol_actual() IS NOT NULL);
CREATE POLICY "empleado_ve_sus_sesiones_tour" ON gamificacion_sesiones_tour FOR SELECT
    USING (id_empleado = get_empleado_actual() OR get_rol_actual() = 'admin');
-- Empleados: cada uno se ve a sí mismo; admin ve todos
CREATE POLICY "empleado_se_ve" ON empleados FOR SELECT
    USING (auth_uid = auth.uid() OR get_rol_actual() = 'admin');
