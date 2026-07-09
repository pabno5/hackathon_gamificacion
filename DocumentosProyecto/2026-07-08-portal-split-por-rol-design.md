# Diseño — Split del portal por rol (FT-04)

**Fecha:** 2026-07-08
**Estado:** Aprobado — listo para plan de implementación
**Contexto:** Corrige FT-04 de [REVISION_TAREAS.md](REVISION_TAREAS.md). Desbloquea FE-02, FE-03, FE-04, FE-06.

---

## 1. Problema

`frontend/src/components/LoginPage.tsx` es un monolito de ~2300 líneas: máquina de
estados (`currentView`) que mezcla login, menú, registro de paciente, agendamiento
de citas e historia clínica en un solo componente, **sin ninguna ramificación por
rol**. Hoy recepcionista, médico y admin ven exactamente lo mismo; el backend
devuelve 403 cuando alguien intenta una acción que no le corresponde.

Consecuencias:
- Sin menor privilegio en la UI (un médico ve acciones de recepción y viceversa).
- Sin URLs navegables por vista (no deep-link, no historial, no auditable).
- `data-feature-id` imposible de anclar → el tour cae a modal centrado (FE-02).
- Tracking de features casi nulo (FE-03). Sin link a `/admin` (FE-04).
- Mantenibilidad baja: estado clínico + login entrelazados (riesgo en datos de paciente).

## 2. Objetivo

Disolver el monolito en un portal con **rutas por rol**, reusando el markup visual
existente (regla UIUX: no rediseñar). Destino arquitectónico correcto para software
médico; se alcanza **incrementalmente**, cada incremento shippeable y verificado.

La frontera de seguridad real ya vive en el backend (`requireRol`). Este split es
corrección/UX/mantenibilidad, no la defensa; hacerlo bien no debilita nada.

## 3. Arquitectura

### 3.1 Capa de auth — `src/lib/authContext.tsx`

`AuthProvider` + hook `useAuth()`:
- Al montar: `supabase.auth.getSession()`. Si hay sesión → `authAPI.profile()` →
  guarda `{ user, rol }`. Se suscribe a `onAuthStateChange` para limpiar al logout.
- Estado expuesto: `{ user, rol, loading, refresh() }`.
- `refresh()` re-consulta el perfil (se llama tras login exitoso).
- `<AuthProvider>` envuelve el árbol **dentro** del `<Router>` (usa navegación).

Decisión: Context sobre fetch-por-ruta o React Query. Rol en un solo lugar, sin
dependencias nuevas, guards baratos. React Query se puede adoptar después para
datos de pantalla si hace falta.

### 3.2 Rutas

```
/                    landing (público, sin cambios)
/login               LoginForm; si ya hay sesión → home del rol
/portal              PortalLayout (guard: autenticado). index → redirect a home del rol
  /portal/dashboard  admin        → gamificación (AdminDashboardPage actual)
  /portal/agenda     todos         → CitasCalendar actual
  /portal/citas      recepción+admin → agendar cita
  /portal/pacientes  recepción+admin → gestión de pacientes
  /portal/historias  médico+admin  → historias clínicas
/admin, /calendario  → redirect a /portal/dashboard y /portal/agenda (compat)
```

Home por rol: `admin → /portal/dashboard`, `medico → /portal/agenda`,
`recepcionista → /portal/citas`.

### 3.3 Componentes

| Componente | Responsabilidad | Depende de |
|---|---|---|
| `AuthProvider` / `useAuth` | Rol/sesión, fuente única | supabase, authAPI |
| `ProtectedRoute` (refactor) | Guard por sesión + `roles?` | `useAuth` |
| `PortalLayout` | Header (logo, barra progreso GAM-05, logout) + `PortalNav` + `<Outlet/>` | `useAuth`, progressTracker |
| `PortalNav` | Items de nav filtrados por rol, cada uno con `data-feature-id` | `useAuth` |
| `LoginForm` | Solo login; redirige por rol tras éxito | user.service, `useAuth` |
| `CitasNueva` | Flujo agendar (ex-`citas`/`userTypeSelection`/`existingUserForm`) | personasAPI, citasAPI |
| `HistoriasList` / `HistoriaNueva` | Historia clínica (ex-`historiaClinica`/`generarHistoria`) | historiasClinicasAPI |

`data-feature-id` en items de nav y botones de acción clave (`R-01`, `M-03`, ...)
para que `tour.factory` (que ya emite `[data-feature-id="..."]`) ancle por fin.

### 3.4 Preservar lo visual

Extracción = cortar/pegar el markup existente a archivos nuevos, no rediseñar.
Paleta teal (`#03D4D9`/`#01EDDF`/`#038996`), bordes redondeados, animaciones motion:
todo se conserva. Diffs visuales se revisan contra el estado actual.

## 4. Plan de incrementos (cada uno shippeable)

1. **Fundación (esta sesión).** AuthContext + AuthProvider. `PortalLayout` +
   `PortalNav` por rol. Montar las 2 páginas ya-standalone bajo el portal
   (`/portal/dashboard`, `/portal/agenda`) + redirects desde `/admin`, `/calendario`.
   Refactor `ProtectedRoute` a `useAuth`. Login monolito intacto.
   *Home temporal en Inc 1:* como `/portal/citas` y `/portal/historias` aún no
   existen, el índice `/portal` redirige admin→`dashboard` y médico/recepción→`agenda`
   (único destino válido para todos en Inc 1). El mapa final
   (recepción→`citas`, médico→`agenda`) se activa cuando esas rutas existan (Inc 2/3).
   *Aceptación:* login existente sigue funcionando; admin ve dashboard y agenda bajo
   `/portal/*` con nav por rol; `/admin` y `/calendario` redirigen; rol se resuelve
   una sola vez; ningún redirect apunta a una ruta inexistente.
2. **Login + reubicación.** Extraer `LoginForm` → `/login` redirige por rol. Montar
   los flujos citas/historia del monolito en `/portal/citas` y `/portal/historias`
   como componentes extraídos (markup reusado, lógica intacta).
3. **Citas limpio.** Partir `userTypeSelection`/`existingUserForm`/`citas` en
   `CitasNueva` con `data-feature-id` + tracking (cierra FE-03 para recepción).
4. **Historia limpio.** Partir `historiaClinica`/`generarHistoria`/`schedulingAppointment`
   en `/portal/historias` con `data-feature-id`.
5. **Pacientes + cierre.** Vista de gestión de pacientes (slice de FT-01) +
   `data-feature-id`/tracking en todo el nav. Cierra FE-02/03/04. Recuperar
   contraseña (FE-06) se reintroduce como pantalla en `/login`.

Al terminar, el monolito queda disuelto y FE-02/03/04/06 caen de paso.

## 5. Flujo de datos

1. Usuario entra a `/login`, envía credenciales → `login()` (user.service, Supabase).
2. Éxito → `useAuth().refresh()` trae perfil → `rol`.
3. `LoginForm` navega al home del rol.
4. `PortalLayout` monta; `useAuth` ya tiene el rol → `PortalNav` pinta solo lo del rol.
5. Cada ruta hija está envuelta en `ProtectedRoute roles={[...]}`; sin rol válido → `/login`.
6. La barra de progreso del header escucha `progressTracker:update` (sin cambios en el tracker).

## 6. Manejo de errores

- Sin sesión en cualquier `/portal/*` → redirect `/login` (toast).
- Perfil sin empleado vinculado (`403`/`404`) → logout + `/login` con aviso.
- Rol no autorizado para la ruta → redirect al home del rol (no a `/login`, ya está logueado).
- `loading` de `useAuth` → placeholder "Verificando acceso…" (no parpadeo de vista protegida).

## 7. Testing

- Unit (frontend no tiene runner aún; se puede diferir a incremento posterior o usar
  el render manual): la lógica pura a extraer es mínima en Inc 1.
- Verificación manual por incremento (el método): recorrer login → home del rol →
  navegar el nav del rol → confirmar que rutas ajenas al rol redirigen.
- Backend ya cubierto por `requireRol` (no cambia).

## 8. Fuera de alcance

- Rediseño visual (regla UIUX).
- React Query (se evalúa después).
- CRUD admin completo de empleados/especialidades/sedes (FT-01 full; solo slice de
  pacientes entra en Inc 5).
- Suite de tests frontend formal (se decide al llegar a Inc 3+).
