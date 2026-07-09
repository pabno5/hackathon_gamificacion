# Portal split por rol — Incremento 1 (Fundación) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introducir `AuthContext` + `PortalLayout` con navegación por rol, y montar las dos páginas ya-standalone (dashboard admin, agenda) bajo `/portal/*` con guards, sin tocar el monolito de login.

**Architecture:** React Context expone el rol una sola vez (`useAuth`). Un `PortalLayout` con `<Outlet/>` provee header + nav por rol; las rutas hijas se protegen con `ProtectedRoute`. Rutas viejas (`/admin`, `/calendario`) redirigen a las nuevas.

**Tech Stack:** React 18, react-router-dom 7, TypeScript, Vite, Tailwind, Supabase JS.

**Verificación:** el proyecto no tiene test runner ni type-check en el build. Cada tarea verifica con `cd frontend && npm run build` (atrapa errores de import/sintaxis) y hay una tarea final de verificación manual en navegador. Spec base: [2026-07-08-portal-split-por-rol-design.md](2026-07-08-portal-split-por-rol-design.md).

---

## File Structure

- Create: `frontend/src/lib/authContext.tsx` — `AuthProvider` + `useAuth`, rol/sesión (fuente única).
- Modify: `frontend/src/components/ProtectedRoute.tsx` — consumir `useAuth` en vez de fetch propio.
- Create: `frontend/src/components/portal/PortalNav.tsx` — items de nav filtrados por rol + `data-feature-id`.
- Create: `frontend/src/components/portal/PortalLayout.tsx` — shell: header (logo, barra progreso, logout) + `PortalNav` + `<Outlet/>`.
- Modify: `frontend/src/pages/AdminDashboardPage.tsx` — quitar nav/guard/shell propios; dejar solo el contenido.
- Modify: `frontend/src/pages/CalendarioPage.tsx` — simplificar (el shell lo da PortalLayout).
- Modify: `frontend/src/App.tsx` — envolver con `AuthProvider`; rutas `/portal/*`; redirects de compat.

---

## Task 1: AuthContext

**Files:**
- Create: `frontend/src/lib/authContext.tsx`

- [ ] **Step 1: Crear el contexto de auth**

```tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabaseClient";
import { authAPI } from "../service/api";

type Perfil = {
  id_empleado?: string;
  rol?: string;
  nombres?: string;
  apellidos?: string;
  [k: string]: unknown;
} | null;

type AuthState = {
  user: Perfil;
  rol: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  rol: null,
  loading: true,
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Perfil>(null);
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargarPerfil = useCallback(async () => {
    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        setUser(null);
        setRol(null);
        return;
      }
      const { data } = await authAPI.profile();
      const perfil = (data?.data ?? null) as Perfil;
      setUser(perfil);
      setRol(perfil?.rol ?? null);
    } catch {
      setUser(null);
      setRol(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarPerfil();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        setRol(null);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        cargarPerfil();
      }
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [cargarPerfil]);

  return (
    <AuthContext.Provider value={{ user, rol, loading, refresh: cargarPerfil }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores (el warning CSS de `.bg-[#01EDDF]` es preexistente y se ignora).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/authContext.tsx
git commit -m "feat(portal): AuthContext para rol/sesión (fuente única)"
```

---

## Task 2: Envolver App con AuthProvider y refactor de ProtectedRoute

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/ProtectedRoute.tsx`

- [ ] **Step 1: Reemplazar ProtectedRoute para consumir useAuth**

Reemplazar el contenido completo de `frontend/src/components/ProtectedRoute.tsx` por:

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/authContext";

/**
 * Guard de rutas del portal. Lee el rol de useAuth (una sola carga de perfil).
 * - Sin rol (sin sesión o perfil inválido) → /login.
 * - `roles` presente y el rol no está → /portal (ya logueado, va a su home).
 */
export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const navigate = useNavigate();
  const { rol, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!rol) {
      toast.error("Debes iniciar sesión");
      navigate("/login");
      return;
    }
    if (roles && roles.length > 0 && !roles.includes(rol)) {
      toast.error("No tienes permisos para esta sección");
      navigate("/portal");
    }
  }, [loading, rol, roles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
  if (!rol) return null;
  if (roles && roles.length > 0 && !roles.includes(rol)) return null;
  return <>{children}</>;
}
```

- [ ] **Step 2: Envolver el árbol con AuthProvider dentro del Router**

En `frontend/src/App.tsx`, agregar el import bajo los imports existentes:

```tsx
import { AuthProvider } from "./lib/authContext";
```

Y envolver el contenido del `<Router>`. Cambiar:

```tsx
    <Router>
      <Routes>
```

por:

```tsx
    <Router>
      <AuthProvider>
      <Routes>
```

Y cerrar: cambiar:

```tsx
      </Routes>
      <Toaster />
    </Router>
```

por:

```tsx
      </Routes>
      <Toaster />
      </AuthProvider>
    </Router>
```

- [ ] **Step 3: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/ProtectedRoute.tsx
git commit -m "refactor(portal): ProtectedRoute usa useAuth; App envuelto en AuthProvider"
```

---

## Task 3: PortalNav

**Files:**
- Create: `frontend/src/components/portal/PortalNav.tsx`

- [ ] **Step 1: Crear la navegación por rol**

```tsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../../lib/authContext";

type NavItem = { to: string; label: string; roles: string[] };

// En Inc 1 solo existen dashboard y agenda. Se agregan más items al crearse
// las rutas (citas/pacientes/historias en Inc 2+).
const ITEMS: NavItem[] = [
  { to: "/portal/dashboard", label: "Dashboard", roles: ["admin"] },
  { to: "/portal/agenda", label: "Agenda", roles: ["admin", "medico", "recepcionista"] },
];

// data-feature-id ancla el tour (tour.factory emite [data-feature-id="..."]).
// El id de "Agenda" depende del rol: R-06 recepción, M-02 médico, A-07 admin.
function featureIdFor(to: string, rol: string): string | undefined {
  if (to === "/portal/dashboard") return "A-02";
  if (to === "/portal/agenda") {
    if (rol === "medico") return "M-02";
    if (rol === "recepcionista") return "R-06";
    return "A-07";
  }
  return undefined;
}

export default function PortalNav() {
  const { rol } = useAuth();
  if (!rol) return null;
  const visibles = ITEMS.filter((i) => i.roles.includes(rol));
  return (
    <nav className="flex gap-2">
      {visibles.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          data-feature-id={featureIdFor(i.to, rol)}
          className={({ isActive }) =>
            `px-4 py-2 rounded-full text-sm transition-colors ${
              isActive ? "bg-[#03D4D9] text-white" : "text-gray-600 hover:bg-gray-100"
            }`
          }
        >
          {i.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/portal/PortalNav.tsx
git commit -m "feat(portal): PortalNav por rol con data-feature-id"
```

---

## Task 4: PortalLayout

**Files:**
- Create: `frontend/src/components/portal/PortalLayout.tsx`

- [ ] **Step 1: Crear el shell del portal**

```tsx
import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { logout } from "../../service/user.service";
import PortalNav from "./PortalNav";
import logoImage from "../../assets/logo.png";

/**
 * Shell del portal de empleados: header (logo, barra de progreso GAM-05, logout)
 * + nav por rol + <Outlet/> para la vista activa.
 */
export default function PortalLayout() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const pct = (e as CustomEvent)?.detail?.percent;
      if (typeof pct === "number") setProgress(pct);
    };
    window.addEventListener("progressTracker:update", handler as EventListener);
    return () => window.removeEventListener("progressTracker:update", handler as EventListener);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#01EDDF]/5">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 gap-4">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Cárdenas Visión" className="h-12 w-auto" />
            <PortalNav />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2" title="Progreso de onboarding">
              <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-9 text-right">{progress}%</span>
            </div>
            <Button variant="outline" className="rounded-full" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/portal/PortalLayout.tsx
git commit -m "feat(portal): PortalLayout (header + nav + progreso + outlet)"
```

---

## Task 5: Adaptar AdminDashboardPage y CalendarioPage al shell

El `PortalLayout` ya provee el fondo, header, nav y `<main>`. Hay que quitar de
`AdminDashboardPage` su propio `<div>` de página, su `<nav>`, su `<main>` y su
guard interno (lo cubre `ProtectedRoute roles={["admin"]}`), dejando solo el contenido.

**Files:**
- Modify: `frontend/src/pages/AdminDashboardPage.tsx`
- Modify: `frontend/src/pages/CalendarioPage.tsx`

- [ ] **Step 1: Quitar el guard interno de AdminDashboardPage**

En `frontend/src/pages/AdminDashboardPage.tsx`, borrar el bloque del efecto de
verificación de acceso (ya lo hace la ruta). Eliminar:

```tsx
  // 1. Verifica acceso (solo admin)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await authAPI.profile();
        if (data?.data?.rol !== "admin") {
          toast.error("Solo administradores pueden acceder al dashboard");
          navigate("/login");
          return;
        }
      } catch {
        toast.error("Sesión inválida");
        navigate("/login");
        return;
      }
      setVerificandoAcceso(false);
    })();
  }, [navigate]);
```

- [ ] **Step 2: Quitar el estado `verificandoAcceso` y arrancar la carga directo**

Eliminar la línea:

```tsx
  const [verificandoAcceso, setVerificandoAcceso] = useState(true);
```

Cambiar el efecto de carga inicial:

```tsx
  useEffect(() => {
    if (verificandoAcceso) return;
    cargar();
  }, [verificandoAcceso, cargar]);
```

por:

```tsx
  useEffect(() => {
    cargar();
  }, [cargar]);
```

Cambiar el efecto de realtime:

```tsx
  useEffect(() => {
    if (verificandoAcceso) return;
    const channel = supabase
```

por:

```tsx
  useEffect(() => {
    const channel = supabase
```

y su array de dependencias:

```tsx
  }, [verificandoAcceso, cargar]);
```

por:

```tsx
  }, [cargar]);
```

- [ ] **Step 3: Quitar el early-return de verificación**

Eliminar:

```tsx
  if (verificandoAcceso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-[#01EDDF]/5">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
```

- [ ] **Step 4: Reemplazar el shell propio por el contenido pelado**

Cambiar la apertura del return principal:

```tsx
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#01EDDF]/5">
      {/* Navbar admin */}
      <nav className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-20">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Cárdenas Visión" className="h-12 w-auto" />
            <div>
              <h1 className="text-lg font-semibold" style={{ color: TEAL_DARK }}>Panel Admin</h1>
              <p className="text-xs text-gray-500">Dashboard de Onboarding</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full"
              onClick={() => navigate("/login")}
            >
              Portal empleados
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={handleLogout}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
```

por:

```tsx
  return (
    <>
```

- [ ] **Step 5: Cerrar el fragmento en vez del div/main**

Al final del componente, cambiar el cierre:

```tsx
      </main>
    </div>
  );
}
```

por:

```tsx
    </>
  );
}
```

- [ ] **Step 6: Limpiar imports y handlers muertos de AdminDashboardPage**

Ya no se usan `handleLogout` ni `logoImage`. Eliminar la función:

```tsx
  const handleLogout = async () => {
    await logout();
    navigate("/");
  };
```

Eliminar los imports que quedan sin uso:

```tsx
import { logout } from "../service/user.service";
import logoImage from "../assets/logo.png";
```

Mantener `useNavigate`/`navigate` (lo usa `reiniciarTour` para nada — verificar: si `navigate` queda sin uso tras esto, eliminar también `const navigate = useNavigate();` y su import). Tras la limpieza, `navigate` ya no se usa: eliminar

```tsx
  const navigate = useNavigate();
```

y el import `useNavigate`:

```tsx
import { useNavigate } from "react-router-dom";
```

Mantener `authAPI` solo si se usa en otro lado; tras quitar el guard ya no. Eliminar `authAPI` de este import:

```tsx
import { gamificacionAPI, empleadosAPI, authAPI } from "../service/api";
```

dejándolo:

```tsx
import { gamificacionAPI, empleadosAPI } from "../service/api";
```

- [ ] **Step 7: Simplificar CalendarioPage**

Reemplazar el contenido completo de `frontend/src/pages/CalendarioPage.tsx` por:

```tsx
import CitasCalendar from '../components/citas/CitasCalendar';

// El shell (header/nav) lo provee PortalLayout; aquí solo la vista.
export default function CalendarioPage() {
  return <CitasCalendar />;
}
```

- [ ] **Step 8: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/AdminDashboardPage.tsx frontend/src/pages/CalendarioPage.tsx
git commit -m "refactor(portal): dashboard y agenda como contenido bajo el shell"
```

---

## Task 6: Rutas /portal + redirects + home por rol

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Importar piezas nuevas y helpers de routing**

En `frontend/src/App.tsx`, agregar a los imports de react-router-dom `Navigate`:

```tsx
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
```

Agregar imports:

```tsx
import PortalLayout from "./components/portal/PortalLayout";
import { useAuth } from "./lib/authContext";
```

- [ ] **Step 2: Componente de redirección al home del rol**

Agregar antes de `export default function App()`:

```tsx
// Home por rol. En Inc 1 solo existen dashboard y agenda, así que médico y
// recepción van a agenda; el mapa final (recepción→citas) llega en Inc 2/3.
function PortalIndexRedirect() {
  const { rol, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
  if (rol === "admin") return <Navigate to="/portal/dashboard" replace />;
  if (rol === "medico" || rol === "recepcionista") return <Navigate to="/portal/agenda" replace />;
  return <Navigate to="/login" replace />;
}
```

- [ ] **Step 3: Reescribir las rutas protegidas**

Reemplazar el bloque de rutas actual:

```tsx
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />
        <Route
          path="/calendario"
          element={
            <ProtectedRoute>
              <CalendarioPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
```

por:

```tsx
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPageWrapper />} />

        {/* Portal de empleados: shell + rutas por rol */}
        <Route
          path="/portal"
          element={
            <ProtectedRoute>
              <PortalLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<PortalIndexRedirect />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="agenda" element={<CalendarioPage />} />
        </Route>

        {/* Compat: rutas viejas redirigen a las nuevas */}
        <Route path="/admin" element={<Navigate to="/portal/dashboard" replace />} />
        <Route path="/calendario" element={<Navigate to="/portal/agenda" replace />} />
```

- [ ] **Step 4: Verificar build**

Run: `cd frontend && npm run build`
Expected: `✓ built` sin errores.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(portal): rutas /portal por rol + redirects de compat"
```

---

## Task 7: Verificación manual del incremento

**Files:** ninguno (verificación en navegador).

- [ ] **Step 1: Levantar frontend y backend**

Run: `cd frontend && npm run dev` (y el backend en otra terminal: `cd backend && npm run dev`).
Expected: Vite sirve en `http://localhost:5173`.

- [ ] **Step 2: Verificar login admin → dashboard bajo el portal**

Ir a `/login`, entrar como admin. Navegar manualmente a `/portal`.
Expected: redirige a `/portal/dashboard`; se ve el header con logo + nav (Dashboard, Agenda) + barra de progreso + "Cerrar sesión"; la tabla de gamificación carga; NO hay doble header.

- [ ] **Step 3: Verificar nav y agenda**

Click en "Agenda".
Expected: URL `/portal/agenda`, se ve el calendario dentro del mismo shell.

- [ ] **Step 4: Verificar redirects de compat**

Ir manualmente a `/admin` y a `/calendario`.
Expected: redirigen a `/portal/dashboard` y `/portal/agenda` respectivamente.

- [ ] **Step 5: Verificar guard por rol**

Cerrar sesión (o con un usuario médico/recepción) intentar `/portal/dashboard`.
Expected: sin sesión → `/login`; con rol no-admin → redirige a `/portal` (su home = agenda) con toast de permisos.

- [ ] **Step 6: Confirmar que el login monolito sigue intacto**

Volver a `/login` y verificar que el flujo actual (menú de opciones, citas, historia) sigue funcionando sin cambios.
Expected: idéntico a antes de Inc 1.

---

## Notas de handoff

- Inc 1 NO extrae el login del monolito ni migra citas/historia — eso es Inc 2+.
- El home de recepción/médico apunta a `agenda` temporalmente hasta que existan
  `/portal/citas` y `/portal/historias`.
- Al terminar Inc 1, actualizar FE-04 a `[~]` en [REVISION_TAREAS.md](REVISION_TAREAS.md)
  (nav por rol existe; falta migrar las vistas del monolito).
