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
- [~] **FE-02** `data-feature-id` en elementos del portal (tour cae a modal centrado).
  *FT-01: + anclas A-03 (empleados), A-04 (especialidades), A-05 (médicos), A-06 (auditoría). Sin ancla (fallback modal centrado, aceptable): R-05/R-07 (dentro del modal de cita), R-08 (recepción no tiene vista de historia read-only).*
- [~] **FE-03** Tracking real por acciones.
  *FT-01: + A-03 (crear empleado), A-04 (especialidad), A-05 (médico), A-06 (auditoría). Cubiertos casi todos los 22 features salvo R-08 (sin vista) y A-07 (reportes, sin implementar).*
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
  *`/portal/admin` (admin-only) con tabs: Empleados (crear con rol + activar/desactivar + reiniciar tour, ADM-01/02/03), Especialidades (A-04), Sedes (con Google Calendar ID, CIT-06), Médicos (crear + asignar especialidad/sede, A-05), Auditoría (tabla paginada + filtros, A-06). Pacientes ya estaba (PAC-05). Falta solo A-07 (reportes/estadísticas de citas) — no crítico. Desbloquea crear médico/recepcionista para probar roles.*
- [x] **FT-02** `ProtectedRoute` creado y aplicado a `/calendario` y `/admin`.
- [~] **FT-03** Suite de tests: arrancada con `node --test` (sin deps nuevas). 6 tests pasando.
  *Cubre filtro de campos HC (HC-05) y tour.factory. Falta: choque de citas, auth middleware (necesitan mocks de DB).*
- [x] **FT-04** Partir monolito LoginPage (2300+ líneas) en rutas por rol.
  *5/5 incrementos completos: monolito eliminado; portal con AuthContext + PortalLayout + rutas por rol (`/portal/inicio|dashboard|agenda|citas|pacientes|historias`), tracking real de gamificación, ficha de paciente con PDF, gestión de pacientes y reset de contraseña. Specs/planes en `2026-07-08/09-portal-split-*`. Deuda restante fuera del split: FT-01 (CRUD admin) y verificación runtime autenticada.*
- [x] **FT-05** JWT: interceptor usa token vigente de Supabase; localStorage se sincroniza en cada refresh.
  *`api.js`, `supabaseClient.ts`.*

---

## Resumen final

**Corregido (17):** SEC-03, FE-01/04/05/06, CL-01..04, BE-04/05/06, FT-01/02/04/05, + FT-03 arrancado.
**Parcial (2):** FE-02/FE-03 — cubiertos ~20 de 22 features de gamificación; faltan R-08 y A-07.
**Diferido por decisión (2):** SEC-01, SEC-02 — rotar antes de deploy.
**Pendiente real (5):** BE-01 (decisión de producto), BE-02, BE-03, A-07, R-08, FT-03 completo.

**Verificado end-to-end contra la BD viva:** BE-06 (actor en auditoría). El resto del portal fue confirmado por el dueño con un recorrido manual como admin (2026-07-10) — roles médico/recepcionista y varios flujos (crear cita real, export PDF, tour, reset password por correo) siguen sin probar.
