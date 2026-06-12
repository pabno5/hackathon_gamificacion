-- ============================================================
-- SEED — Datos base Clínica Cárdenas Visión
-- Idempotente: usa ON CONFLICT para poder re-correr.
-- ============================================================

-- ROLES
INSERT INTO roles (nombre, descripcion) VALUES
    ('admin',         'Acceso total al sistema'),
    ('medico',        'Gestión de historia clínica y agenda propia'),
    ('recepcionista', 'Registro de pacientes y agendamiento de citas')
ON CONFLICT (nombre) DO NOTHING;

-- GAMIFICACIÓN — FEATURES (Anexo A del PRD)
INSERT INTO gamificacion_features (codigo, nombre, descripcion, rol, orden) VALUES
    -- Recepcionista
    ('R-01', 'Dashboard principal',         'Visitar panel de inicio',                     'recepcionista', 1),
    ('R-02', 'Buscar paciente',             'Usar búsqueda por número de documento',       'recepcionista', 2),
    ('R-03', 'Registrar paciente nuevo',    'Completar formulario de nuevo paciente',      'recepcionista', 3),
    ('R-04', 'Agendar cita presencial',     'Crear cita en modo presencial',               'recepcionista', 4),
    ('R-05', 'Agendar cita callcenter',     'Crear cita en modo telefónico',               'recepcionista', 5),
    ('R-06', 'Ver calendario de citas',     'Navegar vista de calendario',                 'recepcionista', 6),
    ('R-07', 'Cancelar cita',               'Ejecutar cancelación con motivo',             'recepcionista', 7),
    ('R-08', 'Consultar historia clínica',  'Ver datos básicos de historia del paciente',  'recepcionista', 8),
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
    ('A-07', 'Ver reportes de citas',       'Consultar estadísticas y reportes',           'admin', 7)
ON CONFLICT (codigo) DO NOTHING;

-- SEDE inicial
INSERT INTO sedes (nombre, direccion, telefono, ciudad)
SELECT 'Sede Principal', 'Por definir', 'Por definir', 'Tunja'
WHERE NOT EXISTS (SELECT 1 FROM sedes);

-- ESPECIALIDADES iniciales
INSERT INTO especialidades (nombre, descripcion) VALUES
    ('Oftalmología', 'Diagnóstico y tratamiento de enfermedades de los ojos'),
    ('Optometría',   'Evaluación de la salud visual y prescripción de lentes')
ON CONFLICT (nombre) DO NOTHING;
