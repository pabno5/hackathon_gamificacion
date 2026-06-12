# PRD — Plataforma Web Clínica Cárdenas Visión

**Versión:** 1.1  
**Fecha:** 2026-06-08  
**Estado:** Borrador — preguntas abiertas resueltas

---

## 1. Resumen Ejecutivo

Plataforma web para Clínica Cárdenas Visión (oftalmología y optometría). Combina una landing pública con chatbot IA, un portal de empleados con gestión de pacientes y agendamiento, y un sistema de gamificación para onboarding de nuevos empleados.

---

## 2. Problema

La clínica opera sin sistema digital unificado:
- Agendamiento manual (teléfono o presencial) sin trazabilidad centralizada.
- Historias clínicas en papel o formatos dispersos.
- Empleados nuevos aprenden el sistema sin guía estructurada, generando errores y pérdida de tiempo.
- Pacientes no tienen canal digital de información 24/7 sobre servicios y EPS.

---

## 3. Objetivos

| # | Objetivo | Métrica de éxito |
|---|----------|-----------------|
| 1 | Centralizar agendamiento de citas | 100% citas creadas en sistema |
| 2 | Digitalizar historia clínica | Historia clínica creada por paciente en sistema |
| 3 | Reducir curva de aprendizaje empleados nuevos | 80% features visitadas en primera semana |
| 4 | Canal de información al paciente | Chatbot responde >90% preguntas frecuentes |
| 5 | Visibilidad del progreso de onboarding | Admin ve % por empleado en tiempo real |

---

## 4. Usuarios y Roles

### 4.1 Usuarios Públicos (no autenticados)
Pacientes o visitantes que acceden a la landing page. Solo lectura + chatbot.

### 4.2 Recepcionista
- Registra nuevos pacientes.
- Agenda, modifica y cancela citas (presencial y callcenter).
- Consulta historia clínica básica.
- NO puede crear/editar diagnósticos médicos.

### 4.3 Médico
- Accede a agenda propia.
- Crea y edita historia clínica completa de sus pacientes.
- Consulta historial de citas.
- NO gestiona empleados ni configuración.

### 4.4 Administrador
- Acceso total a todas las vistas.
- Gestiona empleados (crear, desactivar, asignar roles).
- Ve dashboard de gamificación: progreso de todos los empleados.
- Configura especialidades, médicos, sedes.
- Ve reportes y auditoría.

---

## 5. Requerimientos Funcionales

### 5.1 Landing Pública

| ID | Requerimiento |
|----|--------------|
| LP-01 | Página principal con información de servicios, especialidades y EPS |
| LP-02 | Sección de contacto con información de la clínica (teléfono, dirección, horarios) — **SIN formulario de agendamiento web** |
| LP-03 | Chatbot IA disponible 24/7, entrenado sobre documentos de la clínica |
| LP-04 | Botón de acceso al portal de empleados |
| LP-05 | Toggle de alto contraste (accesibilidad) |

### 5.2 Autenticación

| ID | Requerimiento |
|----|--------------|
| AU-01 | Login con correo y contraseña (Supabase Auth) |
| AU-02 | Sesión persistente con JWT |
| AU-03 | Recuperación de contraseña por correo |
| AU-04 | Primer login detectado automáticamente para activar tour |
| AU-05 | Logout con limpieza de sesión |
| AU-06 | Empleado nuevo: primer acceso dispara flujo de completar perfil |

### 5.3 Gestión de Pacientes

| ID | Requerimiento |
|----|--------------|
| PAC-01 | Registrar nuevo paciente: tipo doc, num doc, nombres, apellidos, fecha nacimiento, teléfono, correo, dirección |
| PAC-02 | Buscar paciente por número de documento |
| PAC-03 | Ver ficha completa del paciente |
| PAC-04 | Editar datos del paciente |
| PAC-05 | Listar pacientes con paginación y filtros |

### 5.4 Historia Clínica

| ID | Requerimiento |
|----|--------------|
| HC-01 | Crear historia clínica vinculada a paciente existente |
| HC-02 | Campos: identificación, motivo consulta, enfermedad actual, antecedentes (patológicos, quirúrgicos, alergias, traumáticos, farmacológicos, gineco-obstétricos, hábitos), antecedentes familiares, revisión por sistemas, examen físico (signos vitales, agudeza visual, fondo de ojo, reflejos pupilares), diagnóstico, plan de manejo, evolución/seguimiento, firma médico |
| HC-03 | Historial de historias clínicas por paciente (varias consultas) |
| HC-04 | Solo médicos y admin pueden crear/editar diagnóstico y plan de manejo |
| HC-05 | Recepcionista solo puede ver datos de identificación y motivo de consulta |
| HC-06 | Exportar historia clínica a PDF |

### 5.5 Agendamiento de Citas

> **RESTRICCIÓN CLAVE:** El agendamiento es EXCLUSIVO del portal de empleados. Los pacientes NO pueden agendar citas por la web. Solo recepcionistas (presencial o callcenter) crean citas en el sistema.

| ID | Requerimiento |
|----|--------------|
| CIT-01 | Crear cita: paciente, médico, especialidad, fecha, hora, **sede**, motivo |
| CIT-02 | Flujo presencial (recepcionista en establecimiento) |
| CIT-03 | Flujo callcenter (recepcionista por teléfono) — mismo formulario, campo "canal" = telefónico/presencial |
| CIT-04 | Estados de cita: pendiente, confirmada, en atención, completada, cancelada, no asistió |
| CIT-05 | Calendario visual de citas (por día, semana, mes) |
| CIT-06 | Cada sede tiene su propio calendario de Google Calendar — sincronización por sede |
| CIT-07 | Sincronización bidireccional Google Calendar por sede |
| CIT-08 | Validar disponibilidad del médico antes de confirmar |
| CIT-09 | Buscar próxima disponibilidad por especialidad y sede |
| CIT-10 | Cancelar cita con motivo obligatorio |

### 5.6 Panel de Administración

| ID | Requerimiento |
|----|--------------|
| ADM-01 | Crear empleado: asignar correo, rol, y datos de persona |
| ADM-02 | Desactivar/reactivar empleado |
| ADM-03 | Ver lista de empleados con rol, estado y progreso de onboarding |
| ADM-04 | Dashboard de gamificación: tabla con % de features visitadas por empleado |
| ADM-05 | Gestionar especialidades (crear, editar, activar/desactivar) |
| ADM-06 | Gestionar médicos y sus especialidades |
| ADM-07 | Ver log de auditoría (quién hizo qué y cuándo) |

### 5.7 Gamificación — Onboarding

| ID | Requerimiento |
|----|--------------|
| GAM-01 | Al primer login, activar tour automático paso a paso por todas las secciones del rol |
| GAM-02 | Tour no saltable — el empleado debe pasar por cada sección |
| GAM-03 | Cada sección/funcionalidad tiene un ID único y un estado: visitada / no visitada |
| GAM-04 | Porcentaje de progreso = (secciones visitadas / total secciones del rol) × 100 — persiste en BD |
| GAM-05 | Barra de progreso visible al empleado en todo momento (header/sidebar) |
| GAM-06 | Progreso persiste en base de datos (no localStorage) |
| GAM-07 | Admin ve tabla: empleado, rol, % completado, última actividad |
| GAM-08 | Notificación/badge cuando empleado completa 100% |
| GAM-09 | Features a trackear por rol: ver sección correspondiente en Anexo A |

### 5.8 Chatbot IA

| ID | Requerimiento |
|----|--------------|
| BOT-01 | Disponible SOLO en landing pública sin autenticación — no aparece en portal de empleados |
| BOT-02 | RAG sobre documentos de la clínica (PDFs de protocolos, servicios, EPS) |
| BOT-03 | Responde preguntas sobre servicios, horarios, EPS, cómo agendar |
| BOT-04 | Inferencia vía **Groq API** (nube) — Ollama no compatible con Railway. Modelo: `llama-3.1-8b-instant`. Capa gratuita: 14,400 req/día |
| BOT-05 | Fallback si no tiene respuesta: redirige a contacto de la clínica |

---

## 6. Requerimientos No Funcionales

| ID | Categoría | Requerimiento |
|----|-----------|--------------|
| NF-01 | Seguridad | Autenticación obligatoria para portal empleados. JWT en cada request |
| NF-02 | Seguridad | RLS (Row Level Security) en Supabase por rol |
| NF-03 | Seguridad | Audit trail en tablas críticas (personas, citas, historias_clinicas) |
| NF-04 | Rendimiento | Carga inicial < 3s en conexión 4G |
| NF-05 | Disponibilidad | 99% uptime en horario laboral (lun-sáb 7am-7pm) |
| NF-06 | Accesibilidad | Toggle de alto contraste, texto escalable |
| NF-07 | Usabilidad | Empleado nuevo puede completar primera cita sin capacitación previa (guiado por tour) |
| NF-08 | Escalabilidad | Arquitectura soporta múltiples sedes |
| NF-09 | Privacidad | Datos de pacientes cumplen mínimos de protección de datos (Ley 1581 Colombia) |
| NF-10 | Deploy | Backend en Railway, Frontend en Vercel, gratuitos o bajo costo |

---

## 7. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | React 18 + TypeScript + Vite | Ya implementado |
| UI | Tailwind CSS + Radix UI (shadcn) | Ya implementado |
| Backend | Node.js + Express | Ya implementado |
| Base de datos | PostgreSQL vía Supabase | Ya implementado |
| Autenticación | **Supabase Auth** | Reemplaza Firebase — integración nativa con Supabase DB, capa gratuita suficiente |
| Storage | Supabase Storage | Documentos y archivos médicos |
| Chatbot | Python + FastAPI + **Groq** + ChromaDB + sentence-transformers | Ollama reemplazado por Groq (Railway no soporta modelos locales) |
| Calendario | Google Calendar API | Ya implementado |
| Deploy Backend | Railway | Fácil deploy Node.js, DB separada en Supabase |
| Deploy Frontend | Vercel | CI/CD automático desde Git |

### 7.1 Decisión: Supabase Auth vs Firebase

**Firebase Auth — problemas identificados:**
- Separación entre auth (Firebase) y datos (Supabase) genera complejidad: dos tokens, dos sistemas de usuarios, sincronización manual via `uid`
- Capa gratuita de Firebase tiene límites en funciones avanzadas
- Migrar UID entre sistemas es frágil (bug activo: `uid` en `personas` no está en schema)

**Supabase Auth — ventajas:**
- Auth y DB en el mismo sistema → `auth.users` linkea directamente a tablas de la app
- RLS nativo con `auth.uid()` en políticas de Postgres
- Capa gratuita: 50,000 MAU, suficiente para MVP y beta
- SDK JS unificado, sin Firebase Admin SDK en backend
- JWT incluido automáticamente, verificable con `supabase-js` o `jsonwebtoken`

---

## 8. Arquitectura de Datos — Tablas Requeridas (Alto Nivel)

> El esquema detallado se documentará en `SCHEMA.md`. Este PRD define qué debe existir.

### Tablas principales
- `personas` — pacientes y empleados (con campo `uid` de Supabase Auth)
- `roles` — recepcionista, médico, admin
- `empleados` — vínculo persona ↔ rol ↔ credenciales (solo admin puede crear)
- `medicos` — datos profesionales del médico (solo admin puede crear)
- `especialidades` — catálogo
- `medico_especialidad` — N:N
- `sedes` — catálogo de sedes de la clínica
- `medico_sede` — médicos habilitados por sede
- `citas` — con estado, canal (presencial/telefónico), FK médico + paciente + **sede**
- `historias_clinicas` — campos médicos completos
- `documentos` — archivos adjuntos

### Tablas de gamificación (nuevas)
- `gamificacion_features` — catálogo de funcionalidades por rol (id, nombre, descripcion, rol, orden)
- `gamificacion_progreso` — estado por empleado (id_empleado, id_feature, visitada, fecha_visita)
- `gamificacion_sesiones_tour` — registro de activaciones del tour (id_empleado, activado_por, fecha_activacion, completado, fecha_completado) — soporta reactivación por admin

### Tablas de auditoría (nuevas)
- `audit_log` — tabla genérica: tabla_afectada, accion, id_registro, datos_anteriores (JSONB), datos_nuevos (JSONB), id_empleado, ip, timestamp

---

## 9. Fuera de Alcance (v1.0)

- App móvil nativa
- **Agendamiento web por pacientes** — citas SOLO vía empleados (presencial o callcenter)
- Facturación / cobros
- Integración con sistemas de EPS para autorización de citas
- Telemedicina / videoconsulta
- Módulo de laboratorios y exámenes (placeholder en UI, sin backend)
- Reportes avanzados / BI

---

## 10. Anexo A — Features de Gamificación por Rol

### Recepcionista
| ID | Feature | Descripción |
|----|---------|-------------|
| R-01 | Dashboard principal | Visitar panel de inicio |
| R-02 | Buscar paciente | Usar búsqueda por documento |
| R-03 | Registrar paciente nuevo | Completar formulario de nuevo paciente |
| R-04 | Agendar cita presencial | Crear cita en modo presencial |
| R-05 | Agendar cita callcenter | Crear cita en modo telefónico |
| R-06 | Ver calendario de citas | Navegar vista de calendario |
| R-07 | Cancelar cita | Ejecutar cancelación con motivo |
| R-08 | Consultar historia clínica | Ver datos básicos de historia |

### Médico
| ID | Feature | Descripción |
|----|---------|-------------|
| M-01 | Dashboard principal | Visitar panel de inicio |
| M-02 | Ver agenda del día | Revisar citas del día |
| M-03 | Acceder a historia clínica | Abrir historia de un paciente |
| M-04 | Crear historia clínica | Completar formulario clínico completo |
| M-05 | Registrar diagnóstico | Completar sección diagnóstico + plan de manejo |
| M-06 | Ver historial de citas del paciente | Consultar citas previas |
| M-07 | Exportar historia clínica PDF | Generar y descargar PDF |

### Administrador
| ID | Feature | Descripción |
|----|---------|-------------|
| A-01 | Dashboard principal | Visitar panel de inicio |
| A-02 | Ver dashboard gamificación | Revisar progreso de empleados |
| A-03 | Crear empleado | Registrar nuevo empleado con rol |
| A-04 | Gestionar especialidades | Crear/editar especialidad |
| A-05 | Gestionar médicos | Asignar médico a especialidad |
| A-06 | Ver log de auditoría | Revisar acciones del sistema |
| A-07 | Ver reportes de citas | Consultar estadísticas |

---

## 11. Preguntas Abiertas — RESUELTAS

| # | Pregunta | Decisión |
|---|----------|---------|
| P-01 | ¿La clínica tiene múltiples sedes? | ✅ Sí — múltiples sedes, cada una con su propio Google Calendar |
| P-02 | ¿Chatbot en portal de empleados? | ✅ No — solo landing pública |
| P-03 | ¿Médicos se registran solos? | ✅ No — solo el admin puede crear médicos |
| P-04 | ¿Tour re-activable por admin? | ✅ Sí — admin puede reiniciar tour de cualquier empleado |
| P-05 | ¿Migración de datos previos? | ✅ No — base limpia, sin migración |
| P-06 | ¿Pacientes agendan por web? | ✅ No — agendamiento exclusivo de empleados (presencial/callcenter) |
 
---

*Documento vivo — actualizar ante cambios de alcance o decisiones técnicas.*
