# PLAN DE IMPLEMENTACIÓN — Clínica Cárdenas Visión

**Versión:** 1.0
**Fecha:** 2026-06-08
**Documentos base:** PRD.md · SCHEMA.md · TRD.md · UIUX.md · APPFLOW.md · BACKEND_ARCHITECTURE.md

---

## 0. Cómo leer este documento

El plan se organiza en **8 fases secuenciales**. Cada fase tiene:
- **Objetivo** — qué queda funcionando al terminarla.
- **Bloquea a** — qué fases no pueden empezar hasta cerrar esta.
- **Tareas** — unidades de trabajo con su entregable.
- **Criterio de aceptación** — cómo se valida que está lista.

Regla de oro del proyecto (de UIUX.md): **el frontend visual no se toca** salvo cambio necesario para funcionar. Se construye sobre lo existente.

### Estado actual (punto de partida)

| Área | Estado real hoy | Acción |
|------|----------------|--------|
| Backend | Estructura plana (`controller/`, `routes/`, `config/`, `services/`). Sin capas. | Refactor a `src/` modular (BACKEND_ARCHITECTURE.md) |
| Auth | Firebase Admin SDK + `firebase.config.js`, `convert-credentials-to-env.js`, `diagnose-credentials.js` | Migrar a Supabase Auth, eliminar Firebase |
| DB | `backend/config/schema.sql` desactualizado (falta `uid`, `credenciales`, auditoría, gamificación, sedes) | Reemplazar por SCHEMA.md completo |
| Frontend | `LoginPage.tsx` monolítico (2297 líneas, máquina de estados). 3 rutas: `/`, `/login`, `/calendario`. | Mantener visual; agregar capa de datos (React Query) + tracking BD |
| Gamificación | `progressTracker.ts` en localStorage, sin backend, sin vista admin | Migrar a BD + Realtime |
| Chatbot | ✅ Migrado a Groq (`busqueda_pdf.py`, `requirements.txt`) | Solo falta `GROQ_API_KEY` en deploy |

---

## FASE 1 — Base de Datos y Entorno

**Objetivo:** Schema completo corriendo en Supabase, con seed mínimo y RLS activo.
**Bloquea a:** todas las demás fases.

| # | Tarea | Entregable |
|---|-------|-----------|
| 1.1 | Crear proyecto Supabase (o usar existente). Habilitar extensiones `uuid-ossp`, `pgcrypto`. | Proyecto activo, URL + keys |
| 1.2 | Ejecutar SCHEMA.md completo en SQL Editor: 15 tablas, enums, índices. | Tablas creadas |
| 1.3 | Crear triggers: `updated_at`, `audit_log`, `inicializar_progreso_empleado`. | Triggers activos |
| 1.4 | Crear vistas: `v_gamificacion_resumen`, `v_disponibilidad_medicos`. | Vistas creadas |
| 1.5 | Aplicar RLS + helpers `get_rol_actual()`, `get_empleado_actual()`. | Políticas activas |
| 1.6 | Seed: roles (admin/medico/recepcionista), `gamificacion_features` (22 filas), ≥1 sede, ≥1 especialidad. | Datos base |
| 1.7 | Sincronizar `backend/config/schema.sql` con SCHEMA.md (fuente de verdad en repo). | Archivo actualizado |
| 1.8 | Crear admin inicial: usuario en Supabase Auth + fila en `personas` + `empleados` con `auth_uid` y rol admin. | Login admin posible |

**Criterio de aceptación:** se puede crear un empleado vía SQL y el trigger genera automáticamente sus filas en `gamificacion_progreso` + `gamificacion_sesiones_tour`. RLS bloquea lectura sin sesión.

---

## FASE 2 — Migración de Auth (Firebase → Supabase)

**Objetivo:** Login y sesión funcionan con Supabase Auth en frontend y backend. Firebase eliminado.
**Bloquea a:** Fases 4, 5, 6, 7 (todo lo protegido).

| # | Tarea | Entregable |
|---|-------|-----------|
| 2.1 | Backend: `src/infrastructure/supabase.js` — cliente Singleton con `SERVICE_ROLE_KEY`. | Cliente único |
| 2.2 | Backend: `auth.middleware.js` — verifica JWT con `supabase.auth.getUser(token)`, carga `empleado` + rol en `req.user`. | Middleware |
| 2.3 | Backend: `role.middleware.js` — `requireRol('admin')` etc. | Middleware |
| 2.4 | Backend: módulo `auth/` — login, perfil, detección `primer_login`, recuperación de contraseña. | Endpoints AU-01..06 |
| 2.5 | Frontend: reemplazar `service/user.service.js` (Firebase) por `@supabase/supabase-js` auth. | Login Supabase |
| 2.6 | Frontend: cliente Supabase en `src/lib/supabaseClient.ts`, sesión persistente, interceptor que adjunta JWT a llamadas API. | Sesión |
| 2.7 | **Eliminar Firebase:** `firebase.config.js` (front+back), `config/firebase.js`, `convert-credentials-to-env.js`, `diagnose-credentials.js`, `firestore.rules`, deps `firebase`/`firebase-admin`. | Repo limpio |
| 2.8 | `.env.example` actualizado (Supabase URL/keys, sin Firebase). | Docs env |

**Criterio de aceptación:** admin de Fase 1 inicia sesión, recibe JWT válido, `req.user.rol` resuelve correcto en backend. Ningún import de Firebase queda en el código.

> **Nota de riesgo:** esta es la fase de mayor riesgo (bug activo de desync `uid`). Hacerla temprano y aislada.

---

## FASE 3 — Esqueleto Backend Modular

**Objetivo:** Estructura `src/` de BACKEND_ARCHITECTURE.md operativa con piezas compartidas.
**Bloquea a:** Fases 4, 5, 6, 7.

> Puede solaparse con Fase 2 (la 2 ya crea las primeras piezas de `src/`).

| # | Tarea | Entregable |
|---|-------|-----------|
| 3.1 | `src/app.js` + `server.js`: middleware chain (cors→helmet→json→rateLimit→auth→routes→errorHandler). | App base |
| 3.2 | `shared/errors/AppError.js` — jerarquía completa. | Errores |
| 3.3 | `shared/middleware/errorHandler.middleware.js` + `utils/asyncHandler.js`. | Manejo errores |
| 3.4 | `shared/response/ApiResponse.js` — `success` + `paginated`. | Respuestas |
| 3.5 | `shared/middleware/validate.middleware.js` (Zod) + `rateLimit.middleware.js`. | Validación |
| 3.6 | `shared/events/eventBus.js` — Singleton EventEmitter. | EventBus |
| 3.7 | `shared/utils/pagination.js`. | Paginación |
| 3.8 | Patrón DI manual: `index.js` por módulo que cablea repo→service→controller→router. | Convención |

**Criterio de aceptación:** un módulo "hello" pasa por toda la cadena y un error lanzado en service sale formateado por `errorHandler`.

---

## FASE 4 — Módulos Núcleo (Pacientes, Historias, Catálogos)

**Objetivo:** CRUD de pacientes, historias clínicas y catálogos administrativos, end-to-end.
**Depende de:** Fases 2 y 3.

| # | Tarea | Entregable | Refs |
|---|-------|-----------|------|
| 4.1 | Módulo `pacientes/` (repo+service+controller+schema). Buscar por doc, crear, editar, listar paginado, soft delete. | PAC-01..05 | APPFLOW |
| 4.2 | Módulo `historias-clinicas/` con todos los campos de SCHEMA. Filtro de campos por rol (recepcionista no ve diagnóstico/plan). | HC-01..05 | PRD 5.4 |
| 4.3 | `historias.pdf.js` — export PDF con pdfkit. | HC-06 | BACKEND_ARCH 14 |
| 4.4 | Módulos `especialidades/`, `medicos/`, `sedes/` (CRUD admin). | ADM-05/06 | |
| 4.5 | Módulo `empleados/` — crear empleado (crea usuario Supabase Auth + persona + empleado), activar/desactivar. Solo admin. | ADM-01..03 | |
| 4.6 | Módulo `audit/` — solo lectura, solo admin. | ADM-07 | |
| 4.7 | Frontend: conectar `LoginPage.tsx` (vistas pacientes/historia) a los endpoints reales vía React Query, sin cambiar UI. | — | UIUX |

**Criterio de aceptación:** recepcionista registra paciente y crea historia básica; médico completa diagnóstico y exporta PDF; admin crea un médico que puede loguearse.

---

## FASE 5 — Citas + Google Calendar

**Objetivo:** Agendamiento presencial/telefónico con sincronización por sede.
**Depende de:** Fase 4 (médicos, sedes, especialidades existen).

| # | Tarea | Entregable | Refs |
|---|-------|-----------|------|
| 5.1 | Módulo `citas/` repo+service+controller+schema. Estados (enum), canal, soft delete, motivo cancelación obligatorio. | CIT-01..04,10 | SCHEMA 9 |
| 5.2 | Strategy Pattern: `PresencialStrategy`, `TelefonicoStrategy`, `CalendarStrategy`. | CIT-02/03 | BACKEND_ARCH 4.4 |
| 5.3 | Validación disponibilidad médico + búsqueda próxima disponibilidad por especialidad/sede. | CIT-08/09 | |
| 5.4 | `infrastructure/googleCalendar.js` — crear/eliminar evento usando `sede.google_calendar_id`. | CIT-06 | BACKEND_ARCH 11 |
| 5.5 | Listeners EventBus: `cita.created`/`cita.cancelada` → sync Calendar. | CIT-07 | BACKEND_ARCH 4.6 |
| 5.6 | `calendarCron.js` — sync bidireccional cada 15 min, detecta cancelaciones externas. | CIT-07 | BACKEND_ARCH 12 |
| 5.7 | Frontend: conectar `CitasCalendar.jsx` + `CitaModal.jsx` a endpoints reales. Vista calendario. | CIT-05 | |

**Criterio de aceptación:** crear cita presencial genera evento en el Calendar de la sede correcta; cancelar lo elimina; cancelar desde Google se refleja en BD tras el cron.

---

## FASE 6 — Gamificación (BD + Tour + Dashboard)

**Objetivo:** Onboarding persistido en BD, tour automático no saltable, dashboard admin en tiempo real.
**Depende de:** Fases 2, 4 (empleados + roles + features ya existen).

| # | Tarea | Entregable | Refs |
|---|-------|-----------|------|
| 6.1 | Módulo `gamificacion/` repo+service+controller. `marcarVisitada` idempotente, `calcularResumen`. | GAM-03/04/06 | BACKEND_ARCH 13 |
| 6.2 | `tour.factory.js` — pasos por rol (data-driven desde features). | GAM-01/09 | BACKEND_ARCH 4.5 |
| 6.3 | Listener `tour.completado` (100%) → badge/notificación. | GAM-08 | |
| 6.4 | Endpoint reactivar tour (admin). | P-04 | |
| 6.5 | Frontend: integrar **driver.js**, tour automático en primer login (`primer_login=true`), no saltable. Atributos `data-feature-id` en elementos. | GAM-01/02 | UIUX driver.js |
| 6.6 | Frontend: **reemplazar `progressTracker.ts`** localStorage por llamadas al backend; barra de progreso visible (header/sidebar). | GAM-05/06 | |
| 6.7 | Frontend: dashboard admin con `v_gamificacion_resumen` + **Supabase Realtime** para actualización viva. | GAM-07, ADM-04 | |

**Criterio de aceptación:** empleado nuevo entra, el tour arranca solo y recorre todas las features de su rol; el % persiste tras refrescar/limpiar cache; el admin ve el progreso actualizarse en vivo sin recargar.

---

## FASE 7 — Chatbot (integración final)

**Objetivo:** Chatbot Groq sirviendo en landing pública, conectado al frontend.
**Depende de:** nada de backend Node (es servicio Python aparte). Ya migrado a Groq.

| # | Tarea | Entregable | Refs |
|---|-------|-----------|------|
| 7.1 | Verificar `busqueda_pdf.py` con `GROQ_API_KEY`; regenerar `documentos.db` si se quiere reindexar. | Servicio activo | PRD BOT-04 |
| 7.2 | Frontend: `ChatBot.tsx` apunta al endpoint FastAPI (`/buscar`). Solo en landing, no en portal. | BOT-01 | PRD 5.8 |
| 7.3 | Fallback a contacto cuando `fuente = no_encontrado`. | BOT-05 | |

**Criterio de aceptación:** pregunta sobre servicios/EPS responde desde los PDFs; pregunta fuera de alcance cae al fallback de contacto. El chatbot no aparece autenticado.

---

## FASE 8 — Deploy y Hardening

**Objetivo:** App en producción: Backend Railway, Frontend Vercel, Chatbot servicio aparte.
**Depende de:** Fases 1–7.

| # | Tarea | Entregable | Refs |
|---|-------|-----------|------|
| 8.1 | Backend → Railway. Variables: Supabase, Google Calendar creds, `GROQ_API_KEY` (si el chatbot va junto). | Backend live | NF-10 |
| 8.2 | Frontend → Vercel. CI/CD desde Git. Variables Supabase públicas (anon key). | Front live | |
| 8.3 | Chatbot Python → Railway (servicio separado). `GROQ_API_KEY`. | Bot live | |
| 8.4 | CORS de producción (no `*`), Helmet, rate limits afinados. | Seguridad | NF-01/02 |
| 8.5 | Validar RLS en producción + audit trail escribiendo. | NF-03 | |
| 8.6 | Smoke test de los 24 flujos de APPFLOW.md por rol. | QA | APPFLOW |
| 8.7 | Verificar accesibilidad: alto contraste, carga < 3s 4G. | NF-04/06 | |

**Criterio de aceptación:** los tres servicios responden en producción; un recorrido completo (login → registrar paciente → agendar cita → historia → PDF) funciona end-to-end.

---

## Resumen de dependencias

```
Fase 1 (DB) ──┬──> Fase 2 (Auth) ──┬──> Fase 4 (Núcleo) ──> Fase 5 (Citas)
              │                     │
              └──> Fase 3 (Skeleton)┴──> Fase 6 (Gamificación)

Fase 7 (Chatbot) ── independiente, integrar cuando convenga
Fase 8 (Deploy) ── al final, requiere 1–7
```

Camino crítico: **1 → 2 → 3 → 4 → 5/6 → 8**.

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| Migración Firebase→Supabase rompe login | Alto | Fase 2 aislada y temprana; admin de prueba antes de seguir |
| Refactor backend grande de golpe | Medio | Módulo por módulo; el viejo código plano convive hasta migrar cada dominio |
| Cambiar UI sin querer | Medio | Regla: solo capa de datos; revisar diffs visuales contra UIUX.md |
| Rate limit Groq en primera indexación | Bajo | Resumen secuencial (ya implementado); `documentos.db` cacheado |
| Sync Google Calendar duplicados | Medio | `google_calendar_event_id UNIQUE`; cron idempotente |

---

## Orden recomendado de arranque

1. **Fase 1** completa (sin DB no hay nada).
2. **Fase 2** hasta login admin verde.
3. **Fase 3** en paralelo con cierre de 2.
4. **Fase 4** módulo a módulo (pacientes primero — es el más usado).
5. **Fase 5 y 6** pueden ir en paralelo si hay dos personas.
6. **Fase 7** en cualquier momento tras Fase 2 frontend.
7. **Fase 8** al final.

---

*Documento vivo — actualizar al cerrar cada fase o cambiar el alcance.*
