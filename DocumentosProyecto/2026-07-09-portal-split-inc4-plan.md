# Portal split — Incremento 4 (Historias con datos reales: M-06 + M-07) — Plan

**Goal:** Paso "paciente" en HistoriasFlow: buscar paciente por documento y ver sus historias clínicas reales (HC-03) con export a PDF (HC-06/M-07) y su historial de citas (M-06). Cierra los últimos features de médico sin disparador.

**Base:** spec `2026-07-08-portal-split-por-rol-design.md` (Inc 4). APIs ya existentes: `historiasClinicasAPI.getByPaciente/exportPdf`, `citasAPI.getByPaciente`.

| # | Tarea | Detalle |
|---|---|---|
| 1 | HistoriasFlow paso "paciente" (nuevo default) | Búsqueda por documento → ficha: lista de historias (fecha, motivo, diagnóstico) con botón "Exportar PDF" (blob download → M-07), historial de citas (fecha/hora/estado/médico → M-06 al cargar), botón "Nueva historia clínica" → paso formulario con prefill. Anclas `data-feature-id` M-06/M-07. |
| 2 | CitasFlow rama usuario antiguo | Navega a `/portal/historias { paso: "paciente", documento }` (antes iba a la demo "generar"). |
| 3 | Demo conservada | Pasos "generar"/"agendar" (GeneratedHistoriaClinica + SchedulingSection) siguen accesibles vía botón "Vista de demostración" — no se borra nada visual. |
| 4 | Verificar + docs | Build, preview boot, REVISION_TAREAS (FE-02/FE-03: M-06/M-07 cerrados). |
