# TRD — Technical Requirements Document
## Plataforma Web Clínica Cárdenas Visión

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Estado:** Borrador

---

## 1. Stack Tecnológico — Decisiones y Justificaciones

### 1.1 Frontend

| Tecnología | Versión | Rol | Justificación |
|-----------|---------|-----|---------------|
| React | 18.x | UI framework | Ya implementado, component model adecuado |
| TypeScript | 5.x | Tipado estático | Previene errores en formularios médicos complejos |
| Vite | 6.x | Build tool | HMR rápido, ESM nativo |
| Tailwind CSS | 3.x | Estilos | Utility-first, consistente con diseño actual |
| shadcn/ui (Radix) | latest | Componentes | Accesible por defecto, sin overhead de runtime |
| React Router v7 | 7.x | Enrutamiento | Ya implementado; soporta loaders y protección de rutas |
| React Query (TanStack) | 5.x | Server state | Cache, invalidación, loading states — reemplaza fetch manual |
| React Hook Form | 7.x | Formularios | Ya implementado; validación performante sin re-renders |
| Zod | 3.x | Validación schemas | Tipado end-to-end desde schema hasta formulario |
| driver.js | 1.x | Tour gamificación | Librería de tour/onboarding ligera, sin dependencias |
| Recharts | 2.x | Gráficas admin | Ya implementado; dashboard gamificación |

### 1.2 Backend

| Tecnología | Versión | Rol | Justificación |
|-----------|---------|-----|---------------|
| Node.js | 20 LTS | Runtime | Ya implementado |
| Express | 5.x | Framework HTTP | Ya implementado |
| @supabase/supabase-js | 2.x | DB + Auth client | Reemplaza Firebase Admin + pg manual |
| Zod | 3.x | Validación inputs | Mismos schemas que frontend (monorepo o shared) |
| googleapis | 164.x | Google Calendar | Ya implementado |
| node-cron | 4.x | Sync periódico | Ya implementado |
| multer | 2.x | Upload archivos | Ya implementado |
| dotenv | 17.x | Variables de entorno | Ya implementado |

**Removidos:**
- `firebase-admin` — reemplazado por Supabase Auth
- `bcryptjs` — passwords manejados por Supabase Auth
- `pg` directo — reemplazado por `@supabase/supabase-js`

### 1.3 Base de Datos

| Tecnología | Rol |
|-----------|-----|
| PostgreSQL 15 (Supabase) | Base de datos principal |
| Supabase Auth | Autenticación (reemplaza Firebase) |
| Supabase Storage | Archivos médicos (PDFs, imágenes) |
| Supabase Realtime | Notificaciones en tiempo real (progreso gamificación) |

### 1.4 Chatbot

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Python | 3.11+ | Runtime |
| FastAPI | 0.100+ | API HTTP |
| **Groq SDK** (`groq`) | latest | Inference en la nube (reemplaza Ollama) |
| LangChain + `langchain-groq` | latest | Orquestación LLM |
| ChromaDB | 0.5+ | Vector store (embeddings locales) |
| sentence-transformers | 5.x | Embeddings (sin costo — corren en Railway) |
| PyPDF | 4.x | Extracción PDF |
| uvicorn | 0.23+ | ASGI server |

> **Decisión: Groq en lugar de Ollama**  
> Ollama requiere GPU local o servidor con recursos dedicados — incompatible con Railway free tier.  
> Groq ofrece inferencia LLM en la nube con capa gratuita (14,400 requests/día, ~30 RPM).  
> Modelo recomendado: `llama-3.1-8b-instant` (rápido, gratuito) o `mixtral-8x7b-32768` (mayor contexto).  
> Los embeddings siguen siendo locales con `sentence-transformers` — no requieren GPU para el tamaño de dataset de la clínica.

### 1.5 Infraestructura y Deploy

| Servicio | Capa | Costo | Uso |
|---------|------|-------|-----|
| Supabase | Free / Pro | $0–$25/mes | DB + Auth + Storage + Realtime |
| Railway | Starter | ~$5/mes | Backend Node.js + Chatbot Python (sentence-transformers corre aquí) |
| Groq | Free / Dev | $0 | Inferencia LLM para chatbot (14,400 req/día, 30 RPM) |
| Vercel | Hobby | $0 | Frontend React |
| Google Calendar API | Free quota | $0 | Sync citas por sede |
| GitHub Actions | Free | $0 | CI/CD |

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    INTERNET                              │
└─────────────┬───────────────────────┬───────────────────┘
              │                       │
              ▼                       ▼
┌─────────────────────┐   ┌─────────────────────────────┐
│   VERCEL (CDN)      │   │   RAILWAY                   │
│                     │   │                             │
│  React SPA          │   │  ┌─────────────────────┐   │
│  - Landing pública  │◄──┼─►│  Node.js / Express  │   │
│  - Portal empleados │   │  │  :3000              │   │
│  - Chatbot UI       │   │  └──────────┬──────────┘   │
└─────────────────────┘   │             │               │
                          │  ┌──────────▼──────────┐   │
                          │  │  Python / FastAPI   │   │
                          │  │  Chatbot RAG :8000  │   │
                          │  └──────────┬──────────┘   │
                          │             │               │
                          └─────────────┼───────────────┘
                                        │
              ┌─────────────────────────┼──────────────────┐
              │         SUPABASE        │                  │
              │                         ▼                  │
              │  ┌────────────────────────────────────┐   │
              │  │  PostgreSQL 15                     │   │
              │  │  - Tablas de negocio               │   │
              │  │  - RLS por rol                     │   │
              │  │  - Triggers de auditoría           │   │
              │  └────────────────────────────────────┘   │
              │  ┌────────────┐  ┌────────────────────┐   │
              │  │ Auth       │  │ Storage            │   │
              │  │ JWT / JWK  │  │ Archivos médicos   │   │
              │  └────────────┘  └────────────────────┘   │
              └────────────────────────────────────────────┘
                                        │
                          ┌─────────────▼──────────────┐
                          │  GOOGLE CALENDAR API        │
                          │  Un calendario por sede     │
                          └────────────────────────────┘
```

---

## 3. Autenticación y Autorización

### 3.1 Flujo de Autenticación (Supabase Auth)

```
Usuario ingresa email/password
        │
        ▼
Frontend: supabase.auth.signInWithPassword()
        │
        ▼
Supabase Auth valida credenciales
        │
        ├─► Retorna { access_token (JWT), refresh_token, user.id }
        │
        ▼
Frontend almacena tokens en memory/cookie httpOnly
        │
        ▼
Cada request al backend incluye: Authorization: Bearer <access_token>
        │
        ▼
Backend middleware verifica JWT con Supabase JWK
        │
        ├─► Extrae user.id (= empleados.auth_uid)
        │
        ▼
Backend consulta: SELECT rol FROM empleados WHERE auth_uid = $1
        │
        ▼
Adjunta { empleado_id, rol } al request context
        │
        ▼
Controller aplica lógica de autorización por rol
```

### 3.2 Detección de Primer Login (Tour)

```
Login exitoso
        │
        ▼
Backend: SELECT primer_login FROM empleados WHERE auth_uid = $1
        │
        ├─ primer_login = TRUE ──► respuesta incluye { primer_login: true }
        │                         Frontend activa driver.js tour
        │
        └─ primer_login = FALSE ─► flujo normal
                │
                ▼
Al completar primer paso del tour:
UPDATE empleados SET primer_login = FALSE WHERE id_empleado = $1
```

### 3.3 Jerarquía de Permisos

```
admin
  └── acceso total (todas las rutas, todos los datos)

medico
  └── citas propias
  └── historias clínicas (read + write completo)
  └── pacientes (read)
  └── SIN acceso: empleados, sedes config, audit

recepcionista
  └── pacientes (read + write)
  └── citas (read + write, todas las sedes)
  └── historias clínicas (read parcial: sin diagnóstico/plan)
  └── SIN acceso: empleados, historias write, audit
```

---

## 4. API REST — Contratos

### Convenciones

- Base URL: `https://api-cardenas.railway.app/api/v1`
- Autenticación: `Authorization: Bearer <supabase_jwt>`
- Respuesta exitosa: `{ success: true, data: {...}, meta?: { page, total } }`
- Respuesta error: `{ success: false, error: { code, message, details? } }`
- Fechas: ISO 8601 (`2026-06-08T14:30:00-05:00`)
- Paginación: query params `?page=1&limit=20`

### 4.1 Auth

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/auth/me` | Todos | Perfil del usuario autenticado + rol + primer_login |
| POST | `/auth/complete-profile` | Todos | Completar perfil en primer login |

> Login/logout/recovery: directo desde frontend con `supabase.auth.*` — no pasan por backend.

### 4.2 Pacientes

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/pacientes` | R, M, A | Listar con paginación y filtros |
| GET | `/pacientes/:id` | R, M, A | Ficha completa |
| GET | `/pacientes/buscar?documento=` | R, M, A | Búsqueda por número de documento |
| POST | `/pacientes` | R, A | Crear nuevo paciente |
| PUT | `/pacientes/:id` | R, A | Actualizar datos |
| DELETE | `/pacientes/:id` | A | Soft delete |

### 4.3 Historias Clínicas

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/historias-clinicas?paciente=` | R(parcial), M, A | Historial de un paciente |
| GET | `/historias-clinicas/:id` | R(parcial), M, A | Historia específica |
| POST | `/historias-clinicas` | M, A | Crear historia |
| PUT | `/historias-clinicas/:id` | M, A | Actualizar historia |
| GET | `/historias-clinicas/:id/pdf` | M, A | Generar y descargar PDF |

> Recepcionista recibe respuesta sin campos: `diagnostico_principal`, `diagnostico_secundario`, `medicamentos_recetados`, `indicaciones_paciente`, `recomendaciones`.

### 4.4 Citas

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/citas` | R, M(propias), A | Listar citas con filtros (fecha, sede, médico, estado) |
| GET | `/citas/:id` | R, M(propias), A | Detalle cita |
| POST | `/citas` | R, A | Crear cita |
| PUT | `/citas/:id` | R, A | Actualizar cita |
| PATCH | `/citas/:id/estado` | R, M, A | Cambiar estado |
| DELETE | `/citas/:id` | R, A | Cancelar cita (soft delete + motivo) |
| GET | `/citas/disponibilidad?medico=&fecha=&sede=` | R, A | Slots disponibles |

### 4.5 Médicos

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/medicos` | R, M, A | Listar médicos activos |
| GET | `/medicos/:id` | R, M, A | Detalle médico |
| POST | `/medicos` | A | Crear médico (solo admin) |
| PUT | `/medicos/:id` | A | Actualizar médico |
| POST | `/medicos/:id/especialidades` | A | Asignar especialidad |
| DELETE | `/medicos/:id/especialidades/:esp` | A | Remover especialidad |
| POST | `/medicos/:id/sedes` | A | Habilitar en sede |

### 4.6 Sedes

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/sedes` | R, M, A | Listar sedes activas |
| POST | `/sedes` | A | Crear sede |
| PUT | `/sedes/:id` | A | Actualizar sede |
| PATCH | `/sedes/:id/calendario` | A | Actualizar Google Calendar ID |

### 4.7 Empleados (solo admin)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/empleados` | A | Listar empleados |
| GET | `/empleados/:id` | A | Detalle empleado |
| POST | `/empleados` | A | Crear empleado (invita por email vía Supabase Auth) |
| PATCH | `/empleados/:id/estado` | A | Activar / desactivar |
| PATCH | `/empleados/:id/rol` | A | Cambiar rol |

### 4.8 Gamificación

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/gamificacion/progreso` | Todos | Progreso propio del empleado autenticado |
| PATCH | `/gamificacion/progreso/:feature_id` | Todos | Marcar feature como visitada |
| GET | `/gamificacion/resumen` | A | Resumen de todos los empleados (admin) |
| POST | `/gamificacion/tour/reactivar/:empleado_id` | A | Reactivar tour para un empleado |

### 4.9 Especialidades

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/especialidades` | R, M, A | Listar especialidades activas |
| POST | `/especialidades` | A | Crear especialidad |
| PUT | `/especialidades/:id` | A | Actualizar |
| PATCH | `/especialidades/:id/estado` | A | Activar / desactivar |

### 4.10 Auditoría

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/audit?tabla=&desde=&hasta=&empleado=` | A | Consultar log de auditoría |

### 4.11 Chatbot (Python / FastAPI)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/chat/query` | Ninguna | Consulta RAG al chatbot |
| GET | `/chat/health` | Ninguna | Health check del servicio |

```json
// POST /chat/query - Request
{ "query": "¿Qué EPS acepta la clínica?" }

// Response
{
  "response": "La clínica acepta las siguientes EPS...",
  "sources": ["Organización Información Cárdenas Visión.pdf"],
  "confidence": 0.87
}
```

---

## 5. Integración Google Calendar

### 5.1 Configuración por Sede

Cada sede tiene un `google_calendar_id` propio en la tabla `sedes`. El backend mantiene credenciales OAuth2 compartidas (una cuenta de servicio para toda la clínica).

### 5.2 Flujo de Sincronización

```
Crear cita en sistema
        │
        ▼
calendarSyncService.createEvent({
    calendarId: sede.google_calendar_id,
    summary: `Cita: ${paciente.nombre} - ${especialidad.nombre}`,
    start: { dateTime: fecha_cita + hora_inicio, timeZone: 'America/Bogota' },
    end:   { dateTime: fecha_cita + hora_fin,    timeZone: 'America/Bogota' },
    description: motivo,
    attendees: [] // sin invitaciones externas
})
        │
        ▼
Guardar google_calendar_event_id en citas
        │
        ▼
node-cron sync cada 15 min: detecta cambios externos en GCal y actualiza estados
```

### 5.3 Operaciones por Estado de Cita

| Acción en sistema | Efecto en Google Calendar |
|------------------|--------------------------|
| Crear cita | Crear evento en calendario de la sede |
| Confirmar cita | Actualizar título/color del evento |
| Cancelar cita | Eliminar evento del calendario |
| Completar cita | Actualizar descripción del evento |

---

## 6. Sistema de Gamificación — Implementación Técnica

### 6.1 Tour (driver.js)

```typescript
// Inicialización al detectar primer_login = true desde /auth/me
import Driver from 'driver.js';

const steps = buildTourSteps(rol); // genera pasos según rol del empleado

const driver = new Driver({
    showProgress: true,
    allowClose: false,        // GAM-02: tour no saltable
    overlayClickBehavior: 'none',
    onNextClick: (element) => {
        const featureId = element.dataset.featureId;
        if (featureId) markFeatureVisited(featureId); // PATCH /gamificacion/progreso/:id
    },
    onDestroyed: () => {
        // Tour completado
        api.post('/gamificacion/tour/completar');
    }
});

driver.setSteps(steps);
driver.drive();
```

### 6.2 Tracking de Progreso

Cada sección del portal tiene un `data-feature-id="R-01"` en su elemento raíz. Al navegar a la sección (o completar la acción guiada), el frontend llama `PATCH /gamificacion/progreso/:feature_id`.

El backend:
1. Valida que la feature pertenece al rol del empleado
2. Hace `UPDATE gamificacion_progreso SET visitada=true, fecha_visita=NOW() WHERE id_empleado=$1 AND id_feature=$2 AND visitada=FALSE`
3. Calcula nuevo porcentaje y lo retorna

### 6.3 Barra de Progreso Persistente

```typescript
// Hook global, activo en todo el portal de empleados
function useProgressBar() {
    const { data: progreso } = useQuery({
        queryKey: ['progreso'],
        queryFn: () => api.get('/gamificacion/progreso'),
        refetchInterval: 30_000  // re-fetch cada 30s como fallback
    });
    return progreso?.porcentaje_completado ?? 0;
}
```

Supabase Realtime puede emitir cambios en `gamificacion_progreso` para actualización instantánea sin polling.

### 6.4 Reactivación de Tour por Admin

```
Admin hace POST /gamificacion/tour/reactivar/:empleado_id
        │
        ▼
Backend:
  INSERT INTO gamificacion_sesiones_tour (id_empleado, activado_por, motivo_reactivacion)
  UPDATE empleados SET primer_login = TRUE WHERE id_empleado = $1
  UPDATE gamificacion_progreso SET visitada=FALSE, fecha_visita=NULL WHERE id_empleado = $1
        │
        ▼
Próximo login del empleado: /auth/me retorna primer_login=true → tour se activa
```

---

## 7. Estructura de Carpetas — Código

### 7.1 Frontend

```
frontend/src/
├── app/
│   ├── App.tsx                  # Router principal con rutas protegidas
│   └── routes.tsx               # Definición de rutas por rol
├── components/
│   ├── ui/                      # shadcn/ui (sin modificar)
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx          # Portal empleados
│   │   └── ProgressBar.tsx      # Barra gamificación
│   ├── public/                  # Componentes landing
│   │   ├── HeroSlider.tsx
│   │   ├── ServicesSection.tsx
│   │   ├── EPSSection.tsx
│   │   └── ChatBot.tsx
│   └── portal/                  # Componentes portal empleados
│       ├── pacientes/
│       ├── citas/
│       ├── historia-clinica/
│       ├── admin/
│       └── gamificacion/
├── pages/
│   ├── public/
│   │   └── LandingPage.tsx
│   ├── auth/
│   │   └── LoginPage.tsx
│   └── portal/
│       ├── DashboardPage.tsx
│       ├── PacientesPage.tsx
│       ├── CitasPage.tsx
│       ├── HistoriaClinicaPage.tsx
│       ├── CalendarioPage.tsx
│       └── admin/
│           ├── EmpleadosPage.tsx
│           ├── GamificacionPage.tsx
│           ├── AuditPage.tsx
│           └── ConfigPage.tsx
├── hooks/
│   ├── useAuth.ts               # Supabase Auth state
│   ├── useProgress.ts           # Gamificación tracking
│   └── useRol.ts                # Rol del usuario actual
├── lib/
│   ├── supabase.ts              # Cliente Supabase
│   ├── api.ts                   # Axios instance con interceptors
│   └── tour.ts                  # driver.js config por rol
├── services/                    # React Query hooks por entidad
│   ├── pacientes.service.ts
│   ├── citas.service.ts
│   ├── historias.service.ts
│   └── gamificacion.service.ts
└── types/
    └── index.ts                 # Tipos TypeScript globales
```

### 7.2 Backend

```
backend/
├── server.js                    # Entry point, Express setup
├── config/
│   ├── supabase.js              # Cliente Supabase (reemplaza firebase.js + dataconnect.js)
│   ├── googleCalendar.js        # Google Calendar OAuth
│   └── schema.sql               # Schema actualizado (= SCHEMA.md)
├── middleware/
│   ├── auth.js                  # Verificación JWT Supabase
│   └── requireRol.js            # Guard de rol: requireRol('admin')
├── controllers/
│   ├── authController.js
│   ├── pacientesController.js   # Renombrado de personasController
│   ├── citasController.js
│   ├── historiasClinicasController.js
│   ├── medicosController.js
│   ├── sedesController.js       # Nuevo
│   ├── especialidadesController.js
│   ├── empleadosController.js   # Refactored de authController
│   ├── gamificacionController.js # Nuevo
│   └── auditController.js       # Nuevo
├── routes/
│   ├── auth.routes.js
│   ├── pacientes.routes.js
│   ├── citas.routes.js
│   ├── historias.routes.js
│   ├── medicos.routes.js
│   ├── sedes.routes.js
│   ├── especialidades.routes.js
│   ├── empleados.routes.js
│   ├── gamificacion.routes.js
│   └── audit.routes.js
├── services/
│   ├── calendarSyncService.js   # Google Calendar sync
│   └── pdfService.js            # Generación PDF historia clínica
└── utils/
    └── validators.js            # Schemas Zod compartidos
```

---

## 8. Seguridad

### 8.1 Autenticación
- JWT firmados por Supabase (RS256). Backend verifica con JWK público — sin secret compartido.
- `access_token` expira en 1 hora. `refresh_token` en 7 días.
- Tokens NO se almacenan en `localStorage` — usar `supabase.auth` con storage en memory o cookie httpOnly.

### 8.2 Autorización
- Doble capa: RLS en Supabase (base de datos) + middleware en Express (API).
- El backend nunca confía solo en el frontend: siempre valida rol antes de operar.

### 8.3 Inputs
- Validación con Zod en cada endpoint. Rechazar requests malformados antes de tocar BD.
- Sanitizar texto libre antes de insertar (strip HTML).
- Parámetros SQL siempre por `$1, $2` — nunca interpolación de strings.

### 8.4 Archivos
- Upload solo a Supabase Storage, nunca al servidor.
- Validar MIME type y tamaño máximo (10 MB) antes de aceptar.
- URLs de Storage firmadas con expiración (no públicas permanentes).

### 8.5 CORS
- Origen permitido: solo dominio de Vercel en producción.
- En desarrollo: `localhost:5173`.

### 8.6 Rate Limiting
- `express-rate-limit` en endpoints de auth: máx 10 intentos/minuto por IP.
- Chatbot: máx 30 queries/minuto por IP.

### 8.7 Variables de Entorno
- Nunca commitear `.env`. Usar `.env.example` documentado.
- En Railway y Vercel: variables de entorno del dashboard, no archivos.

---

## 9. Performance

### 9.1 Frontend
- Code splitting por ruta: landing y portal son bundles separados.
- Imágenes: WebP, lazy loading, `srcset` para responsive.
- React Query: cache de 5 minutos para listas (pacientes, médicos). Invalidar en mutaciones.
- Tour (driver.js): cargar dinámicamente solo si `primer_login = true`.

### 9.2 Backend
- Connection pooling: Supabase usa PgBouncer automático en capa gratuita.
- Índices en columnas de búsqueda frecuente (ver SCHEMA.md sección por tabla).
- Paginación obligatoria en todos los listados (máx 50 registros por página).
- Audit log: índice por `created_at DESC` para queries recientes. Archivar registros > 1 año.

### 9.3 Chatbot
- Embeddings (`sentence-transformers`) y ChromaDB index cargados en memoria al iniciar — no por request.
- ChromaDB index persistido en disco (`CHROMA_PERSIST_DIR`), no reconstruido en cada restart.
- Timeout de 15s por query a Groq API (la inferencia es rápida, ~1–3s).
- Rate limit Groq free: 30 RPM. Implementar cola simple si hay picos — no crítico para clínica pequeña.
- Si Groq no responde: fallback con mensaje fijo redirigiendo a contacto de la clínica (BOT-05).

---

## 10. Variables de Entorno

### Backend (`.env`)

```env
# Supabase
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>    # Solo backend — nunca al frontend
SUPABASE_ANON_KEY=<anon_key>

# Google Calendar
GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json
GOOGLE_CALENDAR_SYNC_INTERVAL=*/15 * * * *

# App
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://cardenas-vision.vercel.app

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Frontend (`.env`)

```env
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>              # Solo anon key — nunca service role
VITE_API_URL=https://api-cardenas.railway.app/api/v1
VITE_CHATBOT_URL=https://chatbot-cardenas.railway.app
```

### Chatbot (`.env`)

```env
GROQ_API_KEY=<groq_api_key>
GROQ_MODEL=llama-3.1-8b-instant          # o mixtral-8x7b-32768 para mayor contexto
EMBEDDING_MODEL=all-MiniLM-L6-v2         # sentence-transformers, corre local en Railway
CHROMA_PERSIST_DIR=./data/chroma
PDF_DIR=./documentos
PORT=8000
CORS_ORIGINS=https://cardenas-vision.vercel.app
```

---

## 11. CI/CD

### GitHub Actions — Backend (Railway autodeploy)

```yaml
# .github/workflows/backend.yml
on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm test   # cuando existan tests
  # Railway autodeploy desde main — no requiere paso extra
```

### Vercel — Frontend (autodeploy desde main)

Configuración en `vercel.json`:
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 12. Migración de Firebase a Supabase Auth

### Pasos

1. **Crear usuarios en Supabase Auth** — admin invita empleados con `supabase.auth.admin.inviteUserByEmail()`
2. **Actualizar `empleados.auth_uid`** con el nuevo UUID de Supabase Auth
3. **Reemplazar en backend:**
   - `firebase-admin` → `@supabase/supabase-js` con `service_role_key`
   - Verificación JWT: `supabase.auth.getUser(token)` en middleware
   - Eliminar `config/firebase.js`, `utils/authMiddleware.js` (reescribir)
4. **Reemplazar en frontend:**
   - `firebase/auth` → `supabase.auth.signInWithPassword()`
   - `localStorage.setItem('authToken')` → manejo automático por `supabase-js`
   - Eliminar `config/firebase.config.js`, `service/user.service.js` (reescribir)
5. **Eliminar archivos Firebase:** `firebase.config.js`, `firestore.rules`, `diagnose-credentials.js`, `convert-credentials-to-env.js`

### Middleware de Auth (nuevo)

```javascript
// backend/middleware/auth.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function requireAuth(req, res, next) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ success: false, error: 'No token' });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ success: false, error: 'Invalid token' });

    // Obtener empleado y rol
    const { data: empleado } = await supabase
        .from('empleados')
        .select('id_empleado, id_rol, primer_login, activo, roles(nombre)')
        .eq('auth_uid', user.id)
        .eq('activo', true)
        .single();

    if (!empleado) return res.status(403).json({ success: false, error: 'Empleado no encontrado' });

    req.user = {
        auth_uid: user.id,
        id_empleado: empleado.id_empleado,
        rol: empleado.roles.nombre,
        primer_login: empleado.primer_login
    };

    next();
}

function requireRol(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.rol)) {
            return res.status(403).json({ success: false, error: 'Sin permisos' });
        }
        next();
    };
}

module.exports = { requireAuth, requireRol };
```

---

## 13. Consideraciones para Deploy en Capa Gratuita

| Servicio | Límite Free | Mitigación |
|---------|-------------|------------|
| Supabase DB | 500 MB | Suficiente para MVP; audit_log con TTL de 1 año |
| Supabase Auth | 50,000 MAU | Más que suficiente para clínica pequeña |
| Supabase Storage | 1 GB | Comprimir PDFs antes de subir; limpiar archivos huérfanos |
| Railway | $5 crédito/mes | Backend + Chatbot en mismo servicio si necesario |
| Vercel Hobby | 100 GB bandwidth | Suficiente; imágenes en CDN externo si crece |
| Google Calendar | 1M requests/día | Sync cada 15min es ~96 requests/día — muy dentro del límite |

---

*Documento vivo — actualizar al tomar decisiones técnicas de implementación.*
