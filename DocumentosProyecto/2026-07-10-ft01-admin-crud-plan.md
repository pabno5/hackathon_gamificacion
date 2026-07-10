# FT-01 — UI de administración (CRUD) — Plan

**Goal:** Panel admin para gestionar empleados, especialidades, sedes, médicos y ver auditoría. Cierra A-03..A-06 y ADM-01/02/05/06/07. Desbloquea crear médico/recepcionista para probar roles.

**Arquitectura:** `/portal/admin` (admin-only) = `GestionPage` con tabs; un componente por entidad. APIs ya existen en `service/api.js` (empleadosAPI, especialidadesAPI, sedesAPI, medicosAPI, auditAPI). Verificación: build + preview boot por tarea.

**Base:** spec del split (fuera de alcance de FT-04, deuda listada en REVISION_TAREAS FT-01).

| # | Tarea | Componente / detalle |
|---|---|---|
| 1 | Contenedor + Empleados | `GestionPage` (tabs) + `EmpleadosAdmin`: crear (tipo/num doc, nombres, apellidos, correo, password, rol, tel), lista con estado + rol + % onboarding, desactivar/reactivar, reiniciar tour. Feature A-03. Nav "Administración" (admin). Ruta `/portal/admin`. |
| 2 | Especialidades + Sedes | `EspecialidadesAdmin`: crear (nombre, descripción) + lista + activar/desactivar. `SedesAdmin`: crear (nombre, ciudad, dirección, teléfono, google_calendar_id) + lista + editar activa. Feature A-04. |
| 3 | Médicos | `MedicosAdmin`: crear médico (empleado con rol médico + número de licencia), asignar especialidad y sede. Feature A-05. |
| 4 | Auditoría | `AuditoriaAdmin`: tabla paginada (tabla, acción, registro, empleado, fecha) + filtros tabla/acción. Feature A-06. |
| 5 | Verificar + docs | Build, preview, REVISION_TAREAS FT-01 → hecho. |
