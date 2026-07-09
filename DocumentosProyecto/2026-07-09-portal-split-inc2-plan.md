# Portal split por rol — Incremento 2 (Disolución del monolito) — Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Disolver `components/LoginPage.tsx` (2300 líneas): login extraído a `/login`, menú de opciones a `/portal/inicio`, flujo citas a `/portal/citas`, flujo historia a `/portal/historias`. Monolito eliminado al final.

**Architecture:** Cada vista del state machine (`currentView`) se convierte en componente bajo una ruta. El shell (header/nav/logout) lo da `PortalLayout` (Inc 1) — los navbars fijos por-vista del monolito se eliminan. Navegación entre flujos vía rutas + `location.state` (prefill). Tour/tracker se inicializan en `PortalLayout`.

**Tech Stack:** React 18, react-router-dom 7, TypeScript, Vite.

**Verificación:** `npm run build` por tarea + preview manual al final. Spec: [2026-07-08-portal-split-por-rol-design.md](2026-07-08-portal-split-por-rol-design.md).

---

## Mapa de extracción (fuente: components/LoginPage.tsx)

| Vista monolito (líneas) | Destino | Adaptaciones |
|---|---|---|
| login (630-704) + handleSubmit (201-221) | `components/auth/LoginForm.tsx` → `/login` | éxito → `refresh()` + `navigate("/portal")`; `notRegister` → toast error "contacta al administrador" (registro auto eliminado por SEC-03); fondo decorativo (611-622) se conserva aquí |
| registration (706-862) + handleRegistrationSubmit | **MUERE** | backend rechaza auto-registro (SEC-03); flujo imposible |
| options (864-981) + handleOptionClick + registerButton effect (295-299) | `components/portal/PortalInicio.tsx` → `/portal/inicio` | navbar fijo fuera; Citas → `navigate("/portal/citas")`; resto → toast "próximamente"; tracking `notifyClick` se conserva; `data-feature-id` R-01/M-01/A-01 según rol |
| userTypeSelection (983-1079) + existingUserForm (1081-1180) + citas (1182-1459) + handlers (301-359, 366-436, 569-608) | `components/portal/CitasFlow.tsx` → `/portal/citas` (recepcionista, admin) | step local `"tipo"\|"cedula"\|"formulario"`; navbars fijos fuera, `pt-32` fuera; éxito de formulario: médico/admin → `/portal/historias` con prefill; recepcionista → toast + `/portal/inicio`; búsqueda cédula OK: médico/admin → `/portal/historias` step generar; recepcionista → toast "Paciente verificado" |
| historiaClinica (1461-2138) + generarHistoria (2140-2244) + scheduling (2247-2266) + handlers (361-364, 438-567) + estado historiaClinicaData/scheduling | `components/portal/HistoriasFlow.tsx` → `/portal/historias` (medico, admin) | step local `"formulario"\|"generar"\|"agendar"`; prefill vía `location.state`; guardar OK → toast + `/portal/inicio`; usa `GeneratedHistoriaClinica` y `SchedulingSection` (imports `../`) |
| Barra progreso proceso (2270-2303) + updateProgress | copia local en CitasFlow y HistoriasFlow | en monolito el estado `progress` mezclaba proceso y gamificación (el tracker lo sobreescribía); ahora: overlay inferior = progreso del proceso (local al flujo); header PortalLayout = gamificación. Se separan |
| initProgressTracker/tour (179-199, 213) | `PortalLayout` | init con correo de `useAuth().user`; `startTourIfFirstLogin` al montar; toast GAM-08 al 100% |

## Tasks

### Task 1: LoginForm + ruta /login
- [x] Crear `components/auth/LoginForm.tsx` (login card verbatim + fondo decorativo; handleSubmit adaptado; forgot-password → toast "Contacta al administrador").
- [x] `App.tsx`: `/login` renderiza `LoginForm` (sin ChatBot). Si ya hay sesión → `Navigate /portal`.
- [x] Build + commit.

### Task 2: PortalInicio + home por rol
- [x] Crear `components/portal/PortalInicio.tsx` (grid de cards verbatim, sin navbar fijo, `data-feature-id` por rol).
- [x] `App.tsx`: ruta `/portal/inicio`; `PortalIndexRedirect` → `/portal/inicio` (todos los roles).
- [x] Build + commit.

### Task 3: CitasFlow
- [x] Crear `components/portal/CitasFlow.tsx` (3 steps, estado y handlers movidos, ramificación por rol en éxito).
- [x] `App.tsx`: ruta `/portal/citas` con `roles={["recepcionista","admin"]}`.
- [x] Build + commit.

### Task 4: HistoriasFlow
- [x] Crear `components/portal/HistoriasFlow.tsx` (3 steps, formulario historia completo movido, prefill por `location.state`).
- [x] `App.tsx`: ruta `/portal/historias` con `roles={["medico","admin"]}`.
- [x] Build + commit.

### Task 5: PortalLayout (tour + tracker) y PortalNav (items nuevos)
- [x] `PortalLayout`: `initProgressTracker(correo)` + `refreshProgress()` + `startTourIfFirstLogin()` al montar con rol resuelto; toast GAM-08 al 100%.
- [x] `PortalNav`: items Inicio (todos, R-01/M-01/A-01), Dashboard (admin, A-02), Agenda (todos, R-06/M-02/A-07), Citas (recepción+admin, R-04), Historias (médico+admin, M-03).
- [x] Build + commit.

### Task 6: Eliminar monolito + verificación
- [x] Borrar `components/LoginPage.tsx`; limpiar `App.tsx` (LoginPageWrapper). Grep: cero referencias.
- [x] Build + preview: `/login` renderiza card; `/portal/*` sin sesión → `/login`; landing intacta.
- [x] Actualizar REVISION_TAREAS.md + commit.
