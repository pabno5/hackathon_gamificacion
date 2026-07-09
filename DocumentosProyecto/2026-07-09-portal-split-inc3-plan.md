# Portal split — Incremento 3 (Citas limpio + tracking real) — Plan

**Goal:** Feature-tracking real por acciones (FE-03), anclas de tour restantes en citas, y arreglo del formulario de cita del calendario (faltaban `sede` y `canal` — crear cita fallaba con 400 por schema).

**Base:** spec `2026-07-08-portal-split-por-rol-design.md` (Inc 3). Verificación: build + preview.

| # | Tarea | Detalle |
|---|---|---|
| 1 | `lib/useFeatureVisit.ts` | Hook: `notifyClick(code)` al montar la vista. Backend ya filtra por rol (403 → ignorado). |
| 2 | CitaModal + CitasCalendar | Selects `sede` (requerido, CIT-01) y `canal` (CIT-02/03) en el modal; `sedesAPI.getAll` en calendario. Cancelar pide motivo (CIT-10) vía prompt → `citasAPI.cancelar`. Tracking: crear → R-04/R-05 según canal; cancelar → R-07. |
| 3 | Visitas por vista | PortalInicio → R-01/M-01/A-01 · Agenda → R-06/M-02/A-07 · Dashboard → A-02 · Historias → M-03. |
| 4 | Acciones en flujos | CitasFlow: R-02 (búsqueda cédula OK), R-03 (paciente creado). HistoriasFlow: M-04 (historia guardada), M-05 (si trae diagnóstico principal). |
| 5 | PortalInicio por rol | Card "Citas" solo recepción+admin (médico no pasa el guard de la ruta). |
| 6 | Verificar + docs | Build, preview, actualizar REVISION_TAREAS (FE-02/FE-03). |
