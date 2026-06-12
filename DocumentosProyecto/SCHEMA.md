# SCHEMA — Base de Datos Clínica Cárdenas Visión

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Motor:** PostgreSQL 15 vía Supabase  
**Auth:** Supabase Auth (`auth.users`) — reemplaza Firebase

---

## Decisiones de Diseño

- **Supabase Auth** gestiona credenciales (email/password, JWT). La tabla `auth.users` es manejada por Supabase — no se toca directamente.
- **`personas`** almacena a todos: pacientes y empleados. Los empleados son el subconjunto que tiene fila en `empleados` con `auth_uid` vinculado.
- **Soft delete** en tablas críticas (`deleted_at`). Nunca borrar pacientes, citas ni historias clínicas.
- **Auditoría** vía tabla `audit_log` + triggers en tablas críticas.
- **RLS (Row Level Security)** de Supabase usa `auth.uid()` contra `empleados.auth_uid`.
- Todas las tablas tienen `created_at` y `updated_at`. Las tablas de escritura frecuente también tienen `created_by` y `updated_by`.

---

## 0. Extensiones Requeridas

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## 1. PERSONAS
> Contiene a todos: pacientes y empleados. Los empleados tienen además fila en `empleados`.

```sql
CREATE TABLE personas (
    id_persona      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo_documento  VARCHAR(10) NOT NULL,          -- CC, TI, CE, PAS, NIT
    numero_documento VARCHAR(30) UNIQUE NOT NULL,
    nombres         VARCHAR(100) NOT NULL,
    apellidos       VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE,
    telefono        VARCHAR(20),
    correo          VARCHAR(150),
    direccion       VARCHAR(200),

    -- Auditoría
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    deleted_at      TIMESTAMP,                     -- soft delete
    created_by      UUID                           -- FK a empleados.id_empleado (NULL si creado por sistema)
);

CREATE INDEX idx_personas_numero_documento ON personas(numero_documento);
CREATE INDEX idx_personas_correo ON personas(correo);
CREATE INDEX idx_personas_deleted_at ON personas(deleted_at) WHERE deleted_at IS NULL;
```

---

## 2. ROLES

```sql
CREATE TABLE roles (
    id_rol      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(50) UNIQUE NOT NULL,   -- 'recepcionista', 'medico', 'admin'
    descripcion TEXT,
    activo      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Datos iniciales
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin',          'Acceso total al sistema'),
    ('medico',         'Gestión de historia clínica y agenda propia'),
    ('recepcionista',  'Registro de pacientes y agendamiento de citas');
```

---

## 3. EMPLEADOS
> Subconjunto de personas con acceso al sistema. `auth_uid` vincula a `auth.users` de Supabase.

```sql
CREATE TABLE empleados (
    id_empleado     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona      UUID NOT NULL UNIQUE REFERENCES personas(id_persona)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_rol          UUID NOT NULL REFERENCES roles(id_rol)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    auth_uid        UUID UNIQUE,               -- auth.users.id de Supabase Auth
    activo          BOOLEAN DEFAULT TRUE,
    primer_login    BOOLEAN DEFAULT TRUE,      -- TRUE = nunca ha iniciado sesión

    -- Auditoría
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado)  -- admin que lo creó, NULL si seed
);

CREATE INDEX idx_empleados_auth_uid ON empleados(auth_uid);
CREATE INDEX idx_empleados_id_rol ON empleados(id_rol);
CREATE INDEX idx_empleados_activo ON empleados(activo) WHERE activo = TRUE;
```

---

## 4. MÉDICOS
> Empleados con rol médico que además tienen número de licencia.

```sql
CREATE TABLE medicos (
    id_medico       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado     UUID NOT NULL UNIQUE REFERENCES empleados(id_empleado)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    numero_licencia VARCHAR(50) UNIQUE NOT NULL,

    -- Auditoría
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado)
);
```

---

## 5. ESPECIALIDADES

```sql
CREATE TABLE especialidades (
    id_especialidad UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(100) UNIQUE NOT NULL,
    descripcion     TEXT,
    activa          BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado)
);
```

---

## 6. MÉDICO ↔ ESPECIALIDAD (N:N)

```sql
CREATE TABLE medico_especialidad (
    id_medico_especialidad  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico               UUID NOT NULL REFERENCES medicos(id_medico)
                                ON UPDATE CASCADE ON DELETE CASCADE,
    id_especialidad         UUID NOT NULL REFERENCES especialidades(id_especialidad)
                                ON UPDATE CASCADE ON DELETE CASCADE,
    created_at              TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by              UUID REFERENCES empleados(id_empleado),
    UNIQUE (id_medico, id_especialidad)
);
```

---

## 7. SEDES

```sql
CREATE TABLE sedes (
    id_sede             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre              VARCHAR(100) NOT NULL,
    direccion           VARCHAR(200),
    telefono            VARCHAR(20),
    ciudad              VARCHAR(100),
    google_calendar_id  VARCHAR(255),          -- ID del calendario de Google Calendar para esta sede
    activa              BOOLEAN DEFAULT TRUE,

    -- Auditoría
    created_at          TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at          TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by          UUID REFERENCES empleados(id_empleado)
);
```

---

## 8. MÉDICO ↔ SEDE (N:N)
> Controla en qué sedes atiende cada médico.

```sql
CREATE TABLE medico_sede (
    id_medico_sede  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_medico       UUID NOT NULL REFERENCES medicos(id_medico)
                        ON UPDATE CASCADE ON DELETE CASCADE,
    id_sede         UUID NOT NULL REFERENCES sedes(id_sede)
                        ON UPDATE CASCADE ON DELETE CASCADE,
    activo          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado),
    UNIQUE (id_medico, id_sede)
);
```

---

## 9. CITAS

```sql
CREATE TYPE estado_cita AS ENUM (
    'pendiente',
    'confirmada',
    'en_atencion',
    'completada',
    'cancelada',
    'no_asistio'
);

CREATE TYPE canal_cita AS ENUM (
    'presencial',
    'telefonico'
);

CREATE TABLE citas (
    id_cita                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente                 UUID NOT NULL REFERENCES personas(id_persona)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
    id_medico                   UUID NOT NULL REFERENCES medicos(id_medico)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
    id_sede                     UUID NOT NULL REFERENCES sedes(id_sede)
                                    ON UPDATE CASCADE ON DELETE RESTRICT,
    id_especialidad             UUID REFERENCES especialidades(id_especialidad)
                                    ON UPDATE CASCADE ON DELETE SET NULL,

    fecha_cita                  DATE NOT NULL,
    hora_inicio                 TIME NOT NULL,
    hora_fin                    TIME NOT NULL,
    motivo                      VARCHAR(255),
    estado                      estado_cita DEFAULT 'pendiente' NOT NULL,
    canal                       canal_cita NOT NULL,            -- presencial | telefonico
    motivo_cancelacion          TEXT,                           -- requerido si estado = cancelada

    -- Google Calendar
    google_calendar_event_id    VARCHAR(255) UNIQUE,

    -- Auditoría
    created_at                  TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at                  TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by                  UUID REFERENCES empleados(id_empleado),
    updated_by                  UUID REFERENCES empleados(id_empleado),
    deleted_at                  TIMESTAMP                       -- soft delete
);

CREATE INDEX idx_citas_paciente ON citas(id_paciente);
CREATE INDEX idx_citas_medico ON citas(id_medico);
CREATE INDEX idx_citas_sede ON citas(id_sede);
CREATE INDEX idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX idx_citas_estado ON citas(estado);
CREATE INDEX idx_citas_gcal ON citas(google_calendar_event_id);
CREATE INDEX idx_citas_activas ON citas(fecha_cita, id_medico) WHERE deleted_at IS NULL;

-- Constraint: hora_fin > hora_inicio
ALTER TABLE citas ADD CONSTRAINT chk_cita_horas CHECK (hora_fin > hora_inicio);
-- Constraint: motivo_cancelacion requerido si estado es cancelada
ALTER TABLE citas ADD CONSTRAINT chk_motivo_cancelacion 
    CHECK (estado != 'cancelada' OR motivo_cancelacion IS NOT NULL);
```

---

## 10. DOCUMENTOS
> Archivos adjuntos (PDFs, imágenes) vinculados a una persona.

```sql
CREATE TABLE documentos (
    id_documento    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_persona      UUID NOT NULL REFERENCES personas(id_persona)
                        ON UPDATE CASCADE ON DELETE RESTRICT,
    tipo_documento  VARCHAR(50) NOT NULL,        -- 'historia_clinica', 'examen', 'receta', etc.
    nombre_archivo  VARCHAR(255),
    enlace          TEXT NOT NULL,               -- URL en Supabase Storage
    tamanio_bytes   BIGINT,
    mime_type       VARCHAR(100),

    -- Auditoría
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by      UUID REFERENCES empleados(id_empleado),
    deleted_at      TIMESTAMP
);

CREATE INDEX idx_documentos_persona ON documentos(id_persona);
```

---

## 11. HISTORIAS CLÍNICAS

```sql
CREATE TABLE historias_clinicas (
    id_historia                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_paciente                     UUID NOT NULL REFERENCES personas(id_persona)
                                        ON UPDATE CASCADE ON DELETE RESTRICT,
    id_medico                       UUID REFERENCES medicos(id_medico)
                                        ON UPDATE CASCADE ON DELETE SET NULL,
    id_cita                         UUID REFERENCES citas(id_cita)
                                        ON UPDATE CASCADE ON DELETE SET NULL,

    -- 1. Motivo de consulta
    motivo_consulta                 TEXT,

    -- 2. Enfermedad actual
    enfermedad_actual               TEXT,

    -- 3. Antecedentes personales
    antecedentes_patologicos        TEXT,
    antecedentes_quirurgicos        TEXT,
    alergias                        TEXT,
    antecedentes_traumaticos        TEXT,
    antecedentes_farmacologicos     TEXT,
    antecedentes_gineco_obstetricos TEXT,
    habitos                         TEXT,

    -- 4. Antecedentes familiares
    antecedentes_familiares         TEXT,

    -- 5. Revisión por sistemas
    revision_general                TEXT,
    revision_cardiovascular         TEXT,
    revision_respiratorio           TEXT,
    revision_digestivo              TEXT,
    revision_urinario               TEXT,
    revision_nervioso               TEXT,
    revision_musculo_esqueletico    TEXT,
    revision_sensorial              TEXT,

    -- 6. Examen físico (signos vitales)
    tension_arterial                VARCHAR(20),
    frecuencia_cardiaca             VARCHAR(20),
    frecuencia_respiratoria         VARCHAR(20),
    temperatura                     VARCHAR(10),
    peso                            VARCHAR(10),
    talla                           VARCHAR(10),
    exploracion_sistemas            TEXT,

    -- 7. Examen oftalmológico (especialidad)
    agudeza_visual                  TEXT,
    fondo_ojo                       TEXT,
    reflejos_pupilares              TEXT,

    -- 8. Diagnóstico (solo médico/admin)
    diagnostico_principal           TEXT,
    diagnostico_secundario          TEXT,

    -- 9. Plan de manejo (solo médico/admin)
    medicamentos_recetados          TEXT,
    indicaciones_paciente           TEXT,
    recomendaciones                 TEXT,
    interconsultas_examenes         TEXT,

    -- 10. Evolución y seguimiento
    evolucion_seguimiento           TEXT,

    -- 11. Datos del profesional
    nombre_medico                   VARCHAR(200),
    especialidad_medico             VARCHAR(100),
    registro_profesional            VARCHAR(50),
    fecha_firma                     DATE,

    -- Auditoría
    created_at                      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at                      TIMESTAMP DEFAULT NOW() NOT NULL,
    created_by                      UUID REFERENCES empleados(id_empleado),
    updated_by                      UUID REFERENCES empleados(id_empleado),
    deleted_at                      TIMESTAMP
);

CREATE INDEX idx_hc_paciente ON historias_clinicas(id_paciente);
CREATE INDEX idx_hc_medico ON historias_clinicas(id_medico);
CREATE INDEX idx_hc_created_at ON historias_clinicas(created_at DESC);
```

---

## 12. GAMIFICACIÓN — CATÁLOGO DE FEATURES

```sql
CREATE TABLE gamificacion_features (
    id_feature      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo          VARCHAR(10) UNIQUE NOT NULL,   -- 'R-01', 'M-01', 'A-01'
    nombre          VARCHAR(100) NOT NULL,
    descripcion     TEXT,
    rol             VARCHAR(50) NOT NULL            -- 'recepcionista', 'medico', 'admin'
                        CHECK (rol IN ('recepcionista', 'medico', 'admin')),
    orden           INTEGER NOT NULL,              -- orden del tour
    activa          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_gf_rol ON gamificacion_features(rol) WHERE activa = TRUE;

-- Seed: features por rol (ver Anexo A del PRD)
INSERT INTO gamificacion_features (codigo, nombre, descripcion, rol, orden) VALUES
    -- Recepcionista
    ('R-01', 'Dashboard principal',         'Visitar panel de inicio',                     'recepcionista', 1),
    ('R-02', 'Buscar paciente',             'Usar búsqueda por número de documento',       'recepcionista', 2),
    ('R-03', 'Registrar paciente nuevo',    'Completar formulario de nuevo paciente',      'recepcionista', 3),
    ('R-04', 'Agendar cita presencial',     'Crear cita en modo presencial',               'recepcionista', 4),
    ('R-05', 'Agendar cita callcenter',     'Crear cita en modo telefónico',               'recepcionista', 5),
    ('R-06', 'Ver calendario de citas',     'Navegar vista de calendario',                 'recepcionista', 6),
    ('R-07', 'Cancelar cita',              'Ejecutar cancelación con motivo',              'recepcionista', 7),
    ('R-08', 'Consultar historia clínica', 'Ver datos básicos de historia del paciente',   'recepcionista', 8),
    -- Médico
    ('M-01', 'Dashboard principal',         'Visitar panel de inicio',                     'medico', 1),
    ('M-02', 'Ver agenda del día',          'Revisar citas programadas del día',           'medico', 2),
    ('M-03', 'Acceder a historia clínica',  'Abrir historia de un paciente',               'medico', 3),
    ('M-04', 'Crear historia clínica',      'Completar formulario clínico completo',       'medico', 4),
    ('M-05', 'Registrar diagnóstico',       'Completar diagnóstico y plan de manejo',      'medico', 5),
    ('M-06', 'Ver historial de citas',      'Consultar citas previas del paciente',        'medico', 6),
    ('M-07', 'Exportar historia PDF',       'Generar y descargar historia clínica en PDF', 'medico', 7),
    -- Admin
    ('A-01', 'Dashboard principal',         'Visitar panel de inicio',                     'admin', 1),
    ('A-02', 'Dashboard gamificación',      'Revisar progreso de onboarding de empleados', 'admin', 2),
    ('A-03', 'Crear empleado',              'Registrar nuevo empleado con rol asignado',   'admin', 3),
    ('A-04', 'Gestionar especialidades',    'Crear o editar una especialidad',             'admin', 4),
    ('A-05', 'Gestionar médicos',           'Asignar médico a especialidad o sede',        'admin', 5),
    ('A-06', 'Ver log de auditoría',        'Revisar acciones registradas en el sistema',  'admin', 6),
    ('A-07', 'Ver reportes de citas',       'Consultar estadísticas y reportes',           'admin', 7);
```

---

## 13. GAMIFICACIÓN — PROGRESO POR EMPLEADO

```sql
CREATE TABLE gamificacion_progreso (
    id_progreso     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado     UUID NOT NULL REFERENCES empleados(id_empleado)
                        ON UPDATE CASCADE ON DELETE CASCADE,
    id_feature      UUID NOT NULL REFERENCES gamificacion_features(id_feature)
                        ON UPDATE CASCADE ON DELETE CASCADE,
    visitada        BOOLEAN DEFAULT FALSE,
    fecha_visita    TIMESTAMP,                 -- NULL hasta que se visita

    created_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE (id_empleado, id_feature)
);

CREATE INDEX idx_gp_empleado ON gamificacion_progreso(id_empleado);
CREATE INDEX idx_gp_empleado_visitada ON gamificacion_progreso(id_empleado, visitada);
```

---

## 14. GAMIFICACIÓN — SESIONES DE TOUR

```sql
CREATE TABLE gamificacion_sesiones_tour (
    id_sesion           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empleado         UUID NOT NULL REFERENCES empleados(id_empleado)
                            ON UPDATE CASCADE ON DELETE CASCADE,
    activado_por        UUID REFERENCES empleados(id_empleado),  -- NULL = primer login automático
    motivo_reactivacion TEXT,                                    -- por qué el admin reactivó
    completado          BOOLEAN DEFAULT FALSE,
    fecha_completado    TIMESTAMP,
    created_at          TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_tour_empleado ON gamificacion_sesiones_tour(id_empleado);
```

---

## 15. AUDIT LOG

```sql
CREATE TABLE audit_log (
    id_audit            BIGSERIAL PRIMARY KEY,          -- BIGSERIAL: alto volumen, no UUID
    tabla_afectada      VARCHAR(100) NOT NULL,
    accion              VARCHAR(10) NOT NULL             -- INSERT, UPDATE, DELETE
                            CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
    id_registro         UUID,                           -- PK del registro afectado
    datos_anteriores    JSONB,                          -- NULL en INSERT
    datos_nuevos        JSONB,                          -- NULL en DELETE
    id_empleado         UUID REFERENCES empleados(id_empleado),  -- NULL si acción del sistema
    ip_address          VARCHAR(45),                    -- IPv4 o IPv6
    user_agent          VARCHAR(500),
    created_at          TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_tabla ON audit_log(tabla_afectada);
CREATE INDEX idx_audit_registro ON audit_log(id_registro);
CREATE INDEX idx_audit_empleado ON audit_log(id_empleado);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## 16. TRIGGERS

### 16.1 updated_at automático

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER set_updated_at_personas
    BEFORE UPDATE ON personas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_empleados
    BEFORE UPDATE ON empleados
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_medicos
    BEFORE UPDATE ON medicos
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_especialidades
    BEFORE UPDATE ON especialidades
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_sedes
    BEFORE UPDATE ON sedes
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_citas
    BEFORE UPDATE ON citas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_historias
    BEFORE UPDATE ON historias_clinicas
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_gp
    BEFORE UPDATE ON gamificacion_progreso
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

### 16.2 Audit automático en tablas críticas

```sql
CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_id_registro UUID;
    v_datos_ant   JSONB;
    v_datos_nue   JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_id_registro := NEW.id_persona;          -- se sobreescribe por tabla
        v_datos_nue   := to_jsonb(NEW);
        v_datos_ant   := NULL;
        -- Obtener PK dinámica según tabla
        v_id_registro := CASE TG_TABLE_NAME
            WHEN 'personas'           THEN NEW.id_persona
            WHEN 'citas'              THEN NEW.id_cita
            WHEN 'historias_clinicas' THEN NEW.id_historia
            WHEN 'empleados'          THEN NEW.id_empleado
            ELSE NULL
        END;
    ELSIF TG_OP = 'UPDATE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := to_jsonb(NEW);
        v_id_registro := CASE TG_TABLE_NAME
            WHEN 'personas'           THEN NEW.id_persona
            WHEN 'citas'              THEN NEW.id_cita
            WHEN 'historias_clinicas' THEN NEW.id_historia
            WHEN 'empleados'          THEN NEW.id_empleado
            ELSE NULL
        END;
    ELSIF TG_OP = 'DELETE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := NULL;
        v_id_registro := CASE TG_TABLE_NAME
            WHEN 'personas'           THEN OLD.id_persona
            WHEN 'citas'              THEN OLD.id_cita
            WHEN 'historias_clinicas' THEN OLD.id_historia
            WHEN 'empleados'          THEN OLD.id_empleado
            ELSE NULL
        END;
    END IF;

    INSERT INTO audit_log (tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos)
    VALUES (TG_TABLE_NAME, TG_OP, v_id_registro, v_datos_ant, v_datos_nue);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas críticas
CREATE TRIGGER audit_personas
    AFTER INSERT OR UPDATE OR DELETE ON personas
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_citas
    AFTER INSERT OR UPDATE OR DELETE ON citas
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_historias
    AFTER INSERT OR UPDATE OR DELETE ON historias_clinicas
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();

CREATE TRIGGER audit_empleados
    AFTER INSERT OR UPDATE OR DELETE ON empleados
    FOR EACH ROW EXECUTE FUNCTION trigger_audit_log();
```

### 16.3 Inicializar progreso de gamificación al crear empleado

```sql
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

    -- Crear sesión de tour inicial
    INSERT INTO gamificacion_sesiones_tour (id_empleado, activado_por)
    VALUES (NEW.id_empleado, NULL);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER init_gamificacion_on_empleado
    AFTER INSERT ON empleados
    FOR EACH ROW EXECUTE FUNCTION inicializar_progreso_empleado();
```

---

## 17. VISTAS ÚTILES

### 17.1 Progreso de gamificación por empleado (para dashboard admin)

```sql
CREATE VIEW v_gamificacion_resumen AS
SELECT
    e.id_empleado,
    p.nombres || ' ' || p.apellidos   AS nombre_completo,
    r.nombre                           AS rol,
    e.activo,
    COUNT(gp.id_progreso)              AS total_features,
    COUNT(gp.id_progreso) FILTER (WHERE gp.visitada = TRUE)  AS features_visitadas,
    ROUND(
        COUNT(gp.id_progreso) FILTER (WHERE gp.visitada = TRUE)::DECIMAL
        / NULLIF(COUNT(gp.id_progreso), 0) * 100, 1
    )                                  AS porcentaje_completado,
    MAX(gp.fecha_visita)               AS ultima_actividad
FROM empleados e
JOIN personas p      ON e.id_persona  = p.id_persona
JOIN roles r         ON e.id_rol      = r.id_rol
LEFT JOIN gamificacion_progreso gp ON e.id_empleado = gp.id_empleado
GROUP BY e.id_empleado, p.nombres, p.apellidos, r.nombre, e.activo;
```

### 17.2 Disponibilidad de médico por sede

```sql
CREATE VIEW v_disponibilidad_medicos AS
SELECT
    m.id_medico,
    p.nombres || ' ' || p.apellidos  AS nombre_medico,
    s.id_sede,
    s.nombre                          AS sede,
    me.nombre                         AS especialidad
FROM medicos m
JOIN empleados emp       ON m.id_empleado       = emp.id_empleado
JOIN personas p          ON emp.id_persona      = p.id_persona
JOIN medico_sede ms      ON m.id_medico         = ms.id_medico  AND ms.activo = TRUE
JOIN sedes s             ON ms.id_sede          = s.id_sede     AND s.activa  = TRUE
JOIN medico_especialidad mesp ON m.id_medico    = mesp.id_medico
JOIN especialidades me   ON mesp.id_especialidad = me.id_especialidad AND me.activa = TRUE
WHERE emp.activo = TRUE;
```

---

## 18. RLS — Row Level Security (Supabase)

> Se implementan en Supabase Dashboard o vía SQL. `auth.uid()` devuelve el UUID del usuario autenticado.

```sql
-- Habilitar RLS en tablas sensibles
ALTER TABLE personas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE historias_clinicas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamificacion_progreso ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- Helper: obtener rol del usuario autenticado
CREATE OR REPLACE FUNCTION get_rol_actual()
RETURNS VARCHAR AS $$
    SELECT r.nombre
    FROM empleados e
    JOIN roles r ON e.id_rol = r.id_rol
    WHERE e.auth_uid = auth.uid() AND e.activo = TRUE
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: obtener id_empleado del usuario autenticado
CREATE OR REPLACE FUNCTION get_empleado_actual()
RETURNS UUID AS $$
    SELECT id_empleado FROM empleados
    WHERE auth_uid = auth.uid() AND activo = TRUE
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PERSONAS: todos los roles pueden leer; solo admin puede insertar/actualizar
CREATE POLICY "empleados_leen_personas"
    ON personas FOR SELECT
    USING (get_rol_actual() IS NOT NULL);

CREATE POLICY "recepcionista_admin_crean_personas"
    ON personas FOR INSERT
    WITH CHECK (get_rol_actual() IN ('recepcionista', 'admin'));

CREATE POLICY "recepcionista_admin_editan_personas"
    ON personas FOR UPDATE
    USING (get_rol_actual() IN ('recepcionista', 'admin'));

-- CITAS: recepcionista ve todas, médico solo las suyas
CREATE POLICY "recepcionista_admin_ven_citas"
    ON citas FOR SELECT
    USING (get_rol_actual() IN ('recepcionista', 'admin'));

CREATE POLICY "medico_ve_sus_citas"
    ON citas FOR SELECT
    USING (
        get_rol_actual() = 'medico'
        AND id_medico = (
            SELECT id_medico FROM medicos
            WHERE id_empleado = get_empleado_actual()
        )
    );

-- HISTORIAS CLÍNICAS: médico y admin leen todas; recepcionista NO lee diagnóstico/plan
-- (filtro de campos se aplica en backend/API, no en RLS de Postgres)
CREATE POLICY "medico_admin_leen_historias"
    ON historias_clinicas FOR SELECT
    USING (get_rol_actual() IN ('medico', 'admin'));

CREATE POLICY "recepcionista_lee_historias_basico"
    ON historias_clinicas FOR SELECT
    USING (get_rol_actual() = 'recepcionista');

-- GAMIFICACIÓN: empleado ve solo su propio progreso; admin ve todo
CREATE POLICY "empleado_ve_su_progreso"
    ON gamificacion_progreso FOR SELECT
    USING (id_empleado = get_empleado_actual() OR get_rol_actual() = 'admin');

CREATE POLICY "empleado_actualiza_su_progreso"
    ON gamificacion_progreso FOR UPDATE
    USING (id_empleado = get_empleado_actual());

-- AUDIT LOG: solo admin puede leer
CREATE POLICY "admin_lee_audit"
    ON audit_log FOR SELECT
    USING (get_rol_actual() = 'admin');
```

---

## 19. Diagrama Entidad-Relación (Simplificado)

```
auth.users (Supabase)
    │ auth_uid
    ▼
empleados ──── personas (pacientes + empleados)
    │               │
    │           documentos
    ├── roles
    │
    ├── medicos ──── medico_especialidad ──── especialidades
    │       │
    │       └──── medico_sede ──────────────── sedes
    │
    ├── gamificacion_progreso ──── gamificacion_features
    │
    └── gamificacion_sesiones_tour

citas ──── personas (paciente)
      ──── medicos
      ──── sedes
      ──── especialidades
      ──── historias_clinicas

audit_log ◄── triggers en: personas, empleados, citas, historias_clinicas
```

---

## 20. Migración desde Schema Actual

El schema actual en `backend/config/schema.sql` está desactualizado. Los pasos para reemplazarlo:

1. Exportar cualquier dato de prueba existente en Supabase (si aplica)
2. Ejecutar este schema completo en Supabase SQL Editor
3. Actualizar `backend/config/schema.sql` con este archivo
4. Migrar autenticación: remover Firebase Admin SDK, implementar `@supabase/supabase-js` auth
5. Actualizar `authController.js` para usar `supabase.auth` en lugar de Firebase tokens
6. Eliminar archivos obsoletos: `firebase.config.js`, `firebase.js`, `firestore.rules`, `diagnose-credentials.js`, `convert-credentials-to-env.js`

---

*Documento vivo — actualizar al modificar tablas o agregar nuevas entidades.*
