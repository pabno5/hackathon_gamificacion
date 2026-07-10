# Portal split — Incremento 5 (Pacientes + reset password) — Plan

**Goal:** Cierra el spec del split. Vista de gestión de pacientes (PAC-05, slice de FT-01) y flujo real de recuperación de contraseña (AU-03/FE-06).

**Base:** spec `2026-07-08-portal-split-por-rol-design.md` (Inc 5). APIs: `personasAPI.getAll({page,limit,search})`, `authAPI.recuperarPassword`, `supabase.auth.updateUser`.

| # | Tarea | Detalle |
|---|---|---|
| 1 | `PacientesList.tsx` → `/portal/pacientes` (recepción+admin) | Tabla paginada (nombre, documento, teléfono, correo) + búsqueda (`search`, PAC-02/05). Botón "Registrar paciente" → `/portal/citas`. Médico/admin: link "Ver historias" → `/portal/historias {documento}`. Ancla + visita R-02. |
| 2 | Nav | Item "Pacientes" (recepción+admin) en `PortalNav`, feature R-02. |
| 3 | LoginForm reset (FE-06) | "¿Olvidaste tu contraseña?" abre campo de correo → `authAPI.recuperarPassword({email, redirectTo: origin + '/reset-password'})`. Toast de enviado. |
| 4 | `ResetPassword.tsx` → `/reset-password` (público) | Supabase ya detecta el token del enlace (detectSessionInUrl). Form nueva contraseña → `supabase.auth.updateUser({password})` → toast + `/login`. |
| 5 | Verificar + docs | Build, preview boot, REVISION_TAREAS (FE-06 hecho; FT-01 avance). Cierre del spec. |
