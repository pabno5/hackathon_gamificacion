# Revisión — Tareas de corrección

**Fecha revisión:** 2026-07-08
**Base:** PRD.md · IMPLEMENTATION_PLAN.md · código backend/frontend/chatbot

Estado: `[ ]` pendiente · `[x]` hecho · `[~]` parcial · `[-]` diferido

---

## 🔴 Seguridad

- [-] **SEC-01** `backend/.env` versionado (SUPABASE_SERVICE_KEY + credenciales admin en comentario).
  *Diferido por decisión del dueño: repo privado, un solo dev. Rotar TODO antes de desplegar en Vercel/Railway.*
- [-] **SEC-02** `backend/credentials/google-calendar-credentials.json` versionado (service account Google).
  *Diferido — mismo motivo. Regenerar service account antes de deploy.*
- [x] **SEC-03** Escalada de privilegios en `POST /auth/register` (auto-crea recepcionista).
  *Corregido: `registrarPersona` ya no crea empleados ni asigna roles; rechaza si no hay empleado vinculado por el admin. `auth.service.js`.*

---

## 🟠 Frontend funcional

- [x] **FE-01** ChatBot fuera del portal (BOT-01) + subtítulo/saludo corregidos a público.
  *`App.tsx` (quitado de `/login`), `ChatBot.tsx`.*
- [x] **FE-02** `data-feature-id` en elementos del portal.
  *Anclados los 22 features en nav/vistas/acciones (R-08 = ficha read-only de recepción añadida). Únicas sin ancla propia: R-05/R-07 (viven dentro del modal de cita, que no está montado durante el tour) → fallback modal centrado de driver.js, aceptable.*
- [x] **FE-03** Tracking real por acciones.
  *Los 22 features del Anexo A se marcan por uso real.*
- [x] **FE-04** Portal sin distinción de roles.
  *Resuelto en Inc 2 de FT-04: nav filtrado por rol, rutas con guards por rol (`/portal/citas` recepción+admin, `/portal/historias` médico+admin, `/portal/dashboard` admin), home común `/portal/inicio`. Refinamiento visual de cards por rol → Inc 3.*
- [x] **FE-05** `/calendario` protegido con `ProtectedRoute` (sin sesión → /login).
  *`App.tsx`. Nota: el botón "Agendar" del Navbar público ahora rebota a login — considerar cambiar su destino a la sección de contacto (decisión UX del dueño).*
- [x] **FE-06** UI recuperar contraseña (AU-03).
  *Inc 5: `LoginForm` modo reset envía enlace vía `authAPI.recuperarPassword` (redirectTo `/reset-password`, sin revelar si el correo existe); nueva página `ResetPassword` fija la contraseña con `supabase.auth.updateUser`. Falta probar el ciclo real de correo con backend/Supabase.*

---

## 🧹 Limpieza / deuda técnica

- [x] **CL-01** Eliminado `frontend/src/pages/LoginPage.tsx` (código muerto).
- [x] **CL-02** Quitadas deps muertas de `backend/package.json`: react-big-calendar, react-router-dom, multer, bcryptjs, moment, axios.
- [x] **CL-03** `.gitignore` raíz creado; `chatbot/__pycache__` destrackeado.
  *`documentos.db` se mantiene versionado a propósito (cache de indexación Groq).*
- [x] **CL-04** "Exámenes"/"Laboratorios" ahora muestran "módulo próximamente disponible".

---

## 🔵 Backend — mejoras

- [x] **BE-01** Semántica progreso: el tour ya NO marca features al mostrarlas.
  *Decisión del dueño (2026-07-10): el progreso cuenta uso real, no ver el tour. `tourManager` sin `onHighlightStarted`/`marcarVisitada`; las features se marcan por `useFeatureVisit` (al entrar a la vista) y `notifyClick` (en cada acción). El tour queda como guía pura; `tour.completado` solo apaga `primer_login`.*
- [ ] **BE-02** CIT-09: `/disponibilidad` lista médicos pero no busca el próximo slot libre.
  *Pendiente — requiere modelar horarios/jornadas del médico (no existen en el schema).*
- [ ] **BE-03** CIT-07: el cron detecta borrados en Google pero no importa cambios de hora.
  *Pendiente — requiere diseño de resolución de conflictos (quién gana ante edición en ambos lados).*
- [x] **BE-04** GAM-08: notificación al empleado al llegar a 100% (toast, una sola vez).
  *`LoginPage.tsx`. La visibilidad admin ya era realtime.*
- [x] **BE-05** Chatbot CORS por env `CHATBOT_CORS_ORIGINS` (default dev local, ya no `*`).
  *`busqueda_pdf.py`.*
- [x] **BE-06** `audit_log.id_empleado` ahora se registra (antes SIEMPRE NULL).
  *Plumbing de actor por transacción: `db.queryAs/withActor/setActor` fijan `set_config('app.current_empleado', ...)` (LOCAL, sobrevive el pooler de Supabase). Trigger lee la GUC. Threaded en las 4 tablas auditadas: pacientes (create/update/delete), historias (create/update), citas (create/update/cancel), empleados (crear/activar/reiniciar-tour/primer-login). Writes de sistema (cron, sync Calendar) → NULL a propósito.*
  *✅ Verificado en vivo: la función desplegada en Supabase ya tiene `current_setting('app.current_empleado')`; probado con INSERT+ROLLBACK real, `id_empleado` quedó correcto en `audit_log`.*

---

## ⚪ Faltantes (docs + opinión)

- [x] **FT-01** UI admin CRUD.
  *`/portal/admin` (admin-only) con tabs: Empleados (ADM-01/02/03), Especialidades (A-04), Sedes (con Google Calendar ID, CIT-06), Médicos (A-05), Reportes de citas por estado/canal/sede (A-07), Auditoría (A-06). Pacientes aparte (PAC-05). Completo.*
  *Bugfix de paso: PacientesList y AuditoriaAdmin leían el total de `pagination.total` (inexistente); `ApiResponse.paginated` lo pone en `meta.total` → paginación no aparecía. Corregido.*
- [x] **FT-02** `ProtectedRoute` creado y aplicado a `/calendario` y `/admin`.
- [~] **FT-03** Suite de tests: `node --test` (sin deps nuevas). 19 tests pasando.
  *Cubre lógica pura: filtro de campos HC (HC-05), tour.factory, setActor de auditoría (BE-06), parsePagination (clamps), schema Zod de citas (CIT-01/10, hora_fin>hora_inicio). Falta lo que necesita BD: choque de citas real (`hayChoqueMedico`) y auth middleware (requieren mocks de pg/Supabase).*
- [x] **FT-04** Partir monolito LoginPage (2300+ líneas) en rutas por rol.
  *5/5 incrementos completos: monolito eliminado; portal con AuthContext + PortalLayout + rutas por rol (`/portal/inicio|dashboard|agenda|citas|pacientes|historias`), tracking real de gamificación, ficha de paciente con PDF, gestión de pacientes y reset de contraseña. Specs/planes en `2026-07-08/09-portal-split-*`. Deuda restante fuera del split: FT-01 (CRUD admin) y verificación runtime autenticada.*
- [x] **FT-05** JWT: interceptor usa token vigente de Supabase; localStorage se sincroniza en cada refresh.
  *`api.js`, `supabaseClient.ts`.*

---

## Resumen final

**Corregido (21):** SEC-03, FE-01..06, CL-01..04, BE-01/04/05/06, FT-01/02/04/05, + FT-03 arrancado. Los 22 features de gamificación con disparador real.
**Diferido por decisión (2):** SEC-01, SEC-02 — rotar antes de deploy.
**Pendiente real (3):** BE-02 (próxima disponibilidad — falta modelar horarios), BE-03 (sync bidireccional Google Calendar — falta diseño de conflictos), FT-03 completo (más tests con mocks de DB).

**Verificado end-to-end contra la BD viva:** BE-06 (actor en auditoría). El portal fue confirmado por el dueño con recorrido manual como admin (2026-07-10). Sin probar aún: roles médico/recepcionista y flujos con datos reales (crear cita, export PDF, tour por uso, reset password por correo).
