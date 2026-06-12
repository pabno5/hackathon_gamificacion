# BACKEND ARCHITECTURE
## Plataforma Web Clínica Cárdenas Visión

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Stack:** Node.js 20 + Express 5 + Supabase PostgreSQL

---

## 1. Decisión Arquitectónica: Monolito Modular

### Por qué NO microservices

| Criterio | Microservices | Monolito Modular |
|---------|---------------|-----------------|
| Tamaño de equipo | Equipos grandes (5+ por servicio) | Equipo pequeño ✅ |
| Complejidad operacional | Alta (service mesh, discovery, tracing) | Baja ✅ |
| Latencia inter-servicio | Overhead de red por cada call | Llamadas en memoria ✅ |
| Railway free tier | Múltiples servicios = múltiples instancias de pago | Un solo proceso ✅ |
| Consistencia transaccional | Sagas / eventual consistency | Transacciones ACID nativas ✅ |
| Escalabilidad futura | Excelente (si se necesita) | Extraíble a microservices cuando se justifique |

**Decisión:** Monolito Modular con fronteras de módulo bien definidas. Cada módulo es un dominio independiente internamente — si algún día se necesita extraer (ej. gamificación como servicio separado), la separación ya existe en el código.

---

## 2. Arquitectura de Capas (Layered Architecture)

Cada request pasa por estas capas en orden. Cada capa tiene **una sola responsabilidad**.

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────────────┐
│  MIDDLEWARE CHAIN                               │
│  cors → rateLimit → bodyParser → auth → role   │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  ROUTES LAYER                                   │
│  Solo mapea: verbo HTTP + path → controller    │
│  No lógica. No validación.                      │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  CONTROLLER LAYER                               │
│  Extrae datos del req (params, body, query)     │
│  Llama al service                               │
│  Serializa la respuesta HTTP                    │
│  NUNCA toca la base de datos directamente       │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  SERVICE LAYER  ← toda la lógica de negocio    │
│  Orquesta operaciones entre repositories        │
│  Dispara eventos internos (gamificación, audit) │
│  Valida reglas de negocio (no de formato)       │
│  Maneja transacciones                           │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  REPOSITORY LAYER                               │
│  Único punto de acceso a la base de datos       │
│  Solo queries SQL / Supabase client calls       │
│  Nunca contiene lógica de negocio               │
│  Retorna entidades de dominio (no rows crudas)  │
└─────────────────────┬───────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│  INFRASTRUCTURE LAYER                           │
│  supabase.js — cliente único (Singleton)        │
│  googleCalendar.js — OAuth + API client         │
│  eventEmitter.js — bus de eventos interno       │
└─────────────────────────────────────────────────┘
```

---

## 3. Estructura de Carpetas

```
backend/
├── server.js                    # Entry point: crea servidor HTTP
├── src/
│   ├── app.js                   # Express app: middlewares + routes
│   │
│   ├── modules/                 # Un directorio por dominio
│   │   ├── auth/
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   └── auth.schema.js
│   │   │
│   │   ├── pacientes/
│   │   │   ├── pacientes.routes.js
│   │   │   ├── pacientes.controller.js
│   │   │   ├── pacientes.service.js
│   │   │   ├── pacientes.repository.js
│   │   │   └── pacientes.schema.js
│   │   │
│   │   ├── citas/
│   │   │   ├── citas.routes.js
│   │   │   ├── citas.controller.js
│   │   │   ├── citas.service.js
│   │   │   ├── citas.repository.js
│   │   │   ├── citas.schema.js
│   │   │   └── citas.strategies/      # Strategy Pattern
│   │   │       ├── CalendarStrategy.js
│   │   │       ├── PresencialStrategy.js
│   │   │       └── TelefonicoStrategy.js
│   │   │
│   │   ├── historias-clinicas/
│   │   │   ├── historias.routes.js
│   │   │   ├── historias.controller.js
│   │   │   ├── historias.service.js
│   │   │   ├── historias.repository.js
│   │   │   ├── historias.schema.js
│   │   │   └── historias.pdf.js       # PDF generation
│   │   │
│   │   ├── medicos/
│   │   ├── sedes/
│   │   ├── especialidades/
│   │   ├── empleados/
│   │   ├── gamificacion/
│   │   │   ├── gamificacion.routes.js
│   │   │   ├── gamificacion.controller.js
│   │   │   ├── gamificacion.service.js
│   │   │   ├── gamificacion.repository.js
│   │   │   └── tour.factory.js        # Factory Pattern
│   │   │
│   │   └── audit/
│   │       ├── audit.routes.js
│   │       ├── audit.controller.js
│   │       └── audit.repository.js    # No service: solo lectura
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      # JWT verify
│   │   │   ├── role.middleware.js      # requireRol('admin')
│   │   │   ├── validate.middleware.js  # Zod validation
│   │   │   ├── rateLimit.middleware.js
│   │   │   └── errorHandler.middleware.js
│   │   │
│   │   ├── errors/
│   │   │   └── AppError.js            # Jerarquía de errores custom
│   │   │
│   │   ├── events/
│   │   │   └── eventBus.js            # Observer Pattern (EventEmitter)
│   │   │
│   │   ├── response/
│   │   │   └── ApiResponse.js         # Factory de respuestas HTTP
│   │   │
│   │   └── utils/
│   │       ├── asyncHandler.js        # Wrapper try/catch
│   │       └── pagination.js
│   │
│   └── infrastructure/
│       ├── supabase.js               # Singleton Supabase client
│       ├── googleCalendar.js         # Google Calendar OAuth client
│       └── index.js                  # Exporta todos los clientes
│
├── .env
├── .env.example
└── package.json
```

---

## 4. Patrones de Diseño Implementados

### 4.1 Repository Pattern

**Problema:** Si los controllers o services hacen queries directamente, un cambio en la BD (ej. migrar de Supabase a otra DB) rompe todo el código de negocio.

**Solución:** Un Repository es la única clase que conoce cómo hablar con la BD. El service solo llama métodos del repo — no sabe qué hay abajo.

```javascript
// src/modules/pacientes/pacientes.repository.js
class PacientesRepository {
  constructor(supabase) {
    this.db = supabase;
  }

  async findByDocumento(numeroDocumento) {
    const { data, error } = await this.db
      .from('personas')
      .select('*')
      .eq('numero_documento', numeroDocumento)
      .is('deleted_at', null)
      .single();

    if (error?.code === 'PGRST116') return null; // not found
    if (error) throw error;
    return data;
  }

  async create(pacienteData) {
    const { data, error } = await this.db
      .from('personas')
      .insert(pacienteData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll({ page = 1, limit = 20, search } = {}) {
    let query = this.db
      .from('personas')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (search) {
      query = query.or(
        `nombres.ilike.%${search}%,apellidos.ilike.%${search}%,numero_documento.ilike.%${search}%`
      );
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, total: count, page, limit };
  }

  async softDelete(id, deletedBy) {
    const { error } = await this.db
      .from('personas')
      .update({ deleted_at: new Date().toISOString(), updated_by: deletedBy })
      .eq('id_persona', id);

    if (error) throw error;
  }
}

module.exports = PacientesRepository;
```

---

### 4.2 Service Layer Pattern

**Problema:** La lógica de negocio dispersa en controllers es imposible de testear y de reusar.

**Solución:** Los services concentran TODA la lógica. Los controllers son delgados.

```javascript
// src/modules/pacientes/pacientes.service.js
class PacientesService {
  constructor(pacientesRepository, eventBus) {
    this.repo = pacientesRepository;
    this.events = eventBus;
  }

  async buscarPorDocumento(numeroDocumento) {
    const paciente = await this.repo.findByDocumento(numeroDocumento);
    if (!paciente) throw new NotFoundError('Paciente no encontrado');
    return paciente;
  }

  async crear(datos, creadoPor) {
    // Regla de negocio: verificar duplicado
    const existente = await this.repo.findByDocumento(datos.numero_documento);
    if (existente) throw new ConflictError('El número de documento ya está registrado');

    const paciente = await this.repo.create({ ...datos, created_by: creadoPor });

    // Evento de auditoría (Observer)
    this.events.emit('entity.created', {
      tabla: 'personas',
      id: paciente.id_persona,
      datos: paciente,
      empleadoId: creadoPor
    });

    return paciente;
  }
}

module.exports = PacientesService;
```

---

### 4.3 Controller — Solo HTTP

```javascript
// src/modules/pacientes/pacientes.controller.js
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');

class PacientesController {
  constructor(pacientesService) {
    this.service = pacientesService;
  }

  buscarPorDocumento = asyncHandler(async (req, res) => {
    const { documento } = req.query;
    const paciente = await this.service.buscarPorDocumento(documento);
    res.json(ApiResponse.success(paciente));
  });

  crear = asyncHandler(async (req, res) => {
    const paciente = await this.service.crear(req.body, req.user.id_empleado);
    res.status(201).json(ApiResponse.success(paciente, 'Paciente registrado correctamente'));
  });
}

module.exports = PacientesController;
```

---

### 4.4 Strategy Pattern — Agendamiento de Citas

**Problema:** Las citas presenciales y callcenter tienen diferencias en validación, notificaciones y logging. Si se agrega un tercer canal (ej. web en el futuro), hay que modificar código existente.

**Solución:** Una estrategia por canal. El service delega al strategy correcto.

```javascript
// src/modules/citas/citas.strategies/PresencialStrategy.js
class PresencialStrategy {
  async validar(citaData) {
    // Validaciones específicas de cita presencial
    if (!citaData.id_sede) throw new ValidationError('La sede es requerida para citas presenciales');
  }

  async postCrear(cita, dependencies) {
    // Crear evento en Google Calendar de la sede
    await dependencies.calendarService.crearEvento(cita);
  }

  getCanalLabel() { return 'presencial'; }
}

// src/modules/citas/citas.strategies/TelefonicoStrategy.js
class TelefonicoStrategy {
  async validar(citaData) {
    // Callcenter puede no tener sede definida al inicio
  }

  async postCrear(cita, dependencies) {
    // También sincroniza con Google Calendar
    await dependencies.calendarService.crearEvento(cita);
  }

  getCanalLabel() { return 'telefonico'; }
}

// src/modules/citas/citas.service.js
class CitasService {
  #strategies = {
    presencial: new PresencialStrategy(),
    telefonico: new TelefonicoStrategy(),
  };

  async crear(datos, creadoPor) {
    const strategy = this.#strategies[datos.canal];
    if (!strategy) throw new ValidationError(`Canal inválido: ${datos.canal}`);

    await strategy.validar(datos);
    // Validar disponibilidad del médico (regla de negocio compartida)
    await this.#validarDisponibilidad(datos);

    const cita = await this.repo.create({ ...datos, created_by: creadoPor });
    await strategy.postCrear(cita, this.dependencies);

    this.events.emit('cita.created', { cita, empleadoId: creadoPor });
    return cita;
  }
}
```

---

### 4.5 Factory Pattern — Tour de Gamificación

**Problema:** Los pasos del tour son distintos para cada rol. La lógica de construir los pasos no debe vivir en el controller ni en el service.

**Solución:** Una factory que recibe un rol y retorna el array de pasos correcto.

```javascript
// src/modules/gamificacion/tour.factory.js
const TOUR_STEPS = {
  recepcionista: [
    { featureId: 'R-01', element: '[data-feature-id="R-01"]', title: 'Dashboard Principal',       description: 'Aquí verás un resumen de las citas del día y accesos rápidos.' },
    { featureId: 'R-02', element: '[data-feature-id="R-02"]', title: 'Buscar Paciente',           description: 'Busca cualquier paciente por su número de documento.' },
    { featureId: 'R-03', element: '[data-feature-id="R-03"]', title: 'Registrar Nuevo Paciente',  description: 'Registra a un nuevo paciente en el sistema.' },
    { featureId: 'R-04', element: '[data-feature-id="R-04"]', title: 'Agendar Cita Presencial',   description: 'Agenda citas para pacientes que llegan físicamente.' },
    { featureId: 'R-05', element: '[data-feature-id="R-05"]', title: 'Agendar Cita Callcenter',   description: 'Agenda citas para pacientes que llaman por teléfono.' },
    { featureId: 'R-06', element: '[data-feature-id="R-06"]', title: 'Calendario de Citas',       description: 'Visualiza todas las citas por día, semana o mes.' },
    { featureId: 'R-07', element: '[data-feature-id="R-07"]', title: 'Cancelar Cita',             description: 'Cancela una cita indicando siempre el motivo.' },
    { featureId: 'R-08', element: '[data-feature-id="R-08"]', title: 'Consultar Historia Clínica',description: 'Accede a los datos básicos de la historia clínica del paciente.' },
  ],
  medico: [ /* M-01 a M-07 */ ],
  admin:  [ /* A-01 a A-07 */ ],
};

class TourFactory {
  static crearPasos(rol) {
    const pasos = TOUR_STEPS[rol];
    if (!pasos) throw new ValidationError(`Rol sin tour definido: ${rol}`);
    return pasos;
  }

  static totalPasos(rol) {
    return TOUR_STEPS[rol]?.length ?? 0;
  }
}

module.exports = TourFactory;
```

---

### 4.6 Observer Pattern — EventBus Interno

**Problema:** El service de citas no debería saber sobre gamificación ni auditoría. Si mañana se agrega notificación por SMS, no queremos tocar `CitasService`.

**Solución:** EventBus interno. El service emite un evento. Los listeners reaccionan de forma desacoplada.

```javascript
// src/shared/events/eventBus.js
const EventEmitter = require('events');

class EventBus extends EventEmitter {
  static #instance = null;

  static getInstance() {
    if (!EventBus.#instance) {
      EventBus.#instance = new EventBus();
    }
    return EventBus.#instance;
  }
}

module.exports = EventBus.getInstance();

// --- Listeners registrados en src/app.js al iniciar ---

// Auditoría
eventBus.on('entity.created', async ({ tabla, id, datos, empleadoId }) => {
  await auditRepository.log({ tabla, accion: 'INSERT', id, datosNuevos: datos, empleadoId });
});

eventBus.on('entity.updated', async ({ tabla, id, anterior, nuevo, empleadoId }) => {
  await auditRepository.log({ tabla, accion: 'UPDATE', id, datosAnteriores: anterior, datosNuevos: nuevo, empleadoId });
});

// Google Calendar sync al crear/cancelar cita
eventBus.on('cita.created', async ({ cita }) => {
  await calendarService.crearEvento(cita);
});

eventBus.on('cita.cancelada', async ({ cita }) => {
  await calendarService.eliminarEvento(cita.google_calendar_event_id, cita.id_sede);
});
```

---

### 4.7 Singleton Pattern — Clientes de Infraestructura

Un único cliente Supabase para toda la app. Sin reconexiones innecesarias, sin múltiples instancias.

```javascript
// src/infrastructure/supabase.js
const { createClient } = require('@supabase/supabase-js');

let instance = null;

function getSupabaseClient() {
  if (!instance) {
    instance = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        db: { schema: 'public' }
      }
    );
  }
  return instance;
}

module.exports = { getSupabaseClient };
```

---

### 4.8 Middleware Chain Pattern

El pipeline de middlewares es la primera línea de defensa. Orden importa.

```javascript
// src/app.js — orden de middlewares
app.use(cors(corsOptions));                       // 1. CORS
app.use(helmet());                                // 2. Security headers
app.use(express.json({ limit: '10mb' }));         // 3. Body parsing
app.use(generalRateLimit);                        // 4. Rate limiting global

// Rutas públicas (sin auth)
app.use('/api/v1/chat', chatRoutes);

// Rutas protegidas
app.use('/api/v1', requireAuth);                  // 5. JWT verificación
app.use('/api/v1/pacientes',    pacientesRoutes);
app.use('/api/v1/citas',        citasRoutes);
app.use('/api/v1/historias',    historiasRoutes);
app.use('/api/v1/medicos',      medicosRoutes);
app.use('/api/v1/sedes',        sedesRoutes);
app.use('/api/v1/especialidades', especialidadesRoutes);
app.use('/api/v1/empleados',    requireRol('admin'), empleadosRoutes);  // solo admin
app.use('/api/v1/gamificacion', gamificacionRoutes);
app.use('/api/v1/audit',        requireRol('admin'), auditRoutes);      // solo admin
app.use('/api/v1/auth',         authRoutes);

app.use(errorHandler);                            // 6. Error handler global (último siempre)
```

---

### 4.9 Validate Middleware — Zod

Validación declarativa en la ruta, antes del controller.

```javascript
// src/shared/middleware/validate.middleware.js
const { ZodError } = require('zod');
const AppError = require('../errors/AppError');

function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed; // reemplaza con datos limpios y tipados
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map(e => ({
          campo: e.path.join('.'),
          mensaje: e.message
        }));
        return next(new ValidationError('Datos de entrada inválidos', details));
      }
      next(err);
    }
  };
}

module.exports = validate;

// Uso en routes:
// router.post('/', validate(pacientesSchema.crear), controller.crear);
```

---

## 5. Jerarquía de Errores Custom

```javascript
// src/shared/errors/AppError.js

class AppError extends Error {
  constructor(message, statusCode, code, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // errores esperados vs crashes inesperados
  }
}

class ValidationError extends AppError {
  constructor(message, details) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Sin permisos suficientes') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

module.exports = { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
```

---

## 6. Error Handler Global

Un solo lugar donde todos los errores terminan. No try/catch en cada controller.

```javascript
// src/shared/middleware/errorHandler.middleware.js
const { AppError } = require('../errors/AppError');

function errorHandler(err, req, res, next) {
  // Error operacional conocido
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details })
      }
    });
  }

  // Error inesperado (bug) — loggear, no exponer internals
  console.error('ERROR NO OPERACIONAL:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor'
    }
  });
}

module.exports = errorHandler;
```

---

## 7. AsyncHandler — Eliminar try/catch repetitivo

```javascript
// src/shared/utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;

// Los controllers quedan limpios:
// crear = asyncHandler(async (req, res) => { ... });
// Cualquier error lanzado llega automáticamente al errorHandler.
```

---

## 8. ApiResponse Factory

Formato de respuesta 100% consistente en toda la API.

```javascript
// src/shared/response/ApiResponse.js
class ApiResponse {
  static success(data, message = null, meta = null) {
    return {
      success: true,
      ...(message && { message }),
      data,
      ...(meta && { meta })
    };
  }

  static paginated(data, total, page, limit) {
    return ApiResponse.success(data, null, {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    });
  }
}

module.exports = ApiResponse;
```

---

## 9. Dependency Injection (sin framework)

Los módulos reciben sus dependencias — no las importan directamente. Facilita testing y swapping.

```javascript
// src/modules/pacientes/index.js — wiring del módulo
const PacientesRepository = require('./pacientes.repository');
const PacientesService    = require('./pacientes.service');
const PacientesController = require('./pacientes.controller');
const router              = require('./pacientes.routes');
const { getSupabaseClient } = require('../../infrastructure/supabase');
const eventBus            = require('../../shared/events/eventBus');

function createPacientesModule() {
  const supabase   = getSupabaseClient();
  const repo       = new PacientesRepository(supabase);
  const service    = new PacientesService(repo, eventBus);
  const controller = new PacientesController(service);
  return router(controller);
}

module.exports = createPacientesModule;

// src/app.js
app.use('/api/v1/pacientes', createPacientesModule());
```

---

## 10. Zod Schemas por Módulo

```javascript
// src/modules/pacientes/pacientes.schema.js
const { z } = require('zod');

const tipoDocumento = z.enum(['CC', 'TI', 'CE', 'PAS', 'NIT']);

const crear = z.object({
  tipo_documento:   tipoDocumento,
  numero_documento: z.string().min(5).max(30),
  nombres:          z.string().min(2).max(100),
  apellidos:        z.string().min(2).max(100),
  fecha_nacimiento: z.string().date().optional(),
  telefono:         z.string().min(7).max(20),
  correo:           z.string().email().optional(),
  direccion:        z.string().max(200).optional(),
});

const actualizar = crear.partial().omit({ numero_documento: true });

const buscar = z.object({
  documento: z.string().min(1),
});

module.exports = { crear, actualizar, buscar };

// Uso en routes:
// router.post('/',  validate(schema.crear),   controller.crear);
// router.put('/:id', validate(schema.actualizar), controller.actualizar);
// router.get('/buscar', validate(schema.buscar, 'query'), controller.buscar);
```

---

## 11. Google Calendar — Strategy por Sede

Cada sede tiene su propio `google_calendar_id`. El servicio de calendario recibe el ID de sede y usa las credenciales compartidas de la clínica.

```javascript
// src/infrastructure/googleCalendar.js
class GoogleCalendarService {
  #client = null;

  async #getClient() {
    if (this.#client) return this.#client;
    // OAuth2 con service account de la clínica
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/calendar']
    });
    this.#client = google.calendar({ version: 'v3', auth });
    return this.#client;
  }

  async crearEvento(cita) {
    const client = await this.#getClient();
    const sede   = await sedesRepo.findById(cita.id_sede);

    const event = {
      summary:     `${cita.paciente.nombres} ${cita.paciente.apellidos} - ${cita.especialidad}`,
      description: cita.motivo || '',
      start: { dateTime: `${cita.fecha_cita}T${cita.hora_inicio}`, timeZone: 'America/Bogota' },
      end:   { dateTime: `${cita.fecha_cita}T${cita.hora_fin}`,    timeZone: 'America/Bogota' },
    };

    const { data } = await client.events.insert({
      calendarId: sede.google_calendar_id,
      resource:   event
    });

    // Actualizar cita con event_id
    await citasRepo.updateCalendarEventId(cita.id_cita, data.id);
    return data;
  }

  async eliminarEvento(eventId, idSede) {
    const client = await this.#getClient();
    const sede   = await sedesRepo.findById(idSede);

    await client.events.delete({
      calendarId: sede.google_calendar_id,
      eventId
    });
  }
}
```

---

## 12. Cron Job — Sync Google Calendar

Detecta cambios externos en Google Calendar (cancelaciones desde fuera del sistema) y actualiza estados en BD.

```javascript
// src/infrastructure/calendarCron.js
const cron = require('node-cron');

// Cada 15 minutos
cron.schedule(process.env.GOOGLE_CALENDAR_SYNC_INTERVAL || '*/15 * * * *', async () => {
  const sedes = await sedesRepo.findAllActivas();

  for (const sede of sedes) {
    const eventosGCal = await calendarService.listarEventos(sede.google_calendar_id);
    const citasLocales = await citasRepo.findBySede(sede.id_sede, { estado: 'pendiente' });

    // Detectar cancelaciones externas
    for (const cita of citasLocales) {
      const eventoExiste = eventosGCal.find(e => e.id === cita.google_calendar_event_id);
      if (!eventoExiste) {
        await citasService.actualizarEstado(cita.id_cita, 'cancelada', 'Cancelada desde Google Calendar', null);
      }
    }
  }
});
```

---

## 13. Gamificación — Flujo de Tracking en Backend

```javascript
// src/modules/gamificacion/gamificacion.service.js
class GamificacionService {
  async marcarVisitada(idEmpleado, featureId) {
    // Validar que la feature pertenece al rol del empleado
    const empleado = await empleadosRepo.findById(idEmpleado);
    const feature  = await this.repo.findFeatureById(featureId);

    if (feature.rol !== empleado.rol_nombre) {
      throw new ForbiddenError('Esta feature no pertenece a tu rol');
    }

    // Idempotente: si ya fue visitada, no falla ni recalcula
    const progreso = await this.repo.findProgreso(idEmpleado, featureId);
    if (progreso?.visitada) {
      return await this.calcularResumen(idEmpleado);
    }

    await this.repo.marcarVisitada(idEmpleado, featureId);

    const resumen = await this.calcularResumen(idEmpleado);

    // Si llegó a 100%, emitir evento de completado
    if (resumen.porcentaje === 100) {
      this.events.emit('tour.completado', { idEmpleado, resumen });
    }

    return resumen;
  }

  async calcularResumen(idEmpleado) {
    const { total, visitadas } = await this.repo.contarProgreso(idEmpleado);
    return {
      total,
      visitadas,
      porcentaje: total > 0 ? Math.round((visitadas / total) * 100) : 0
    };
  }
}
```

---

## 14. PDF Service — Historia Clínica

```javascript
// src/modules/historias-clinicas/historias.pdf.js
const PDFDocument = require('pdfkit');

class HistoriaPDFService {
  async generar(historia, paciente, medico) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Header con logo clínica
    // doc.image(logoPath, ...) si está disponible

    doc.fontSize(18).text('HISTORIA CLÍNICA', { align: 'center' });
    doc.fontSize(12).text('Clínica Cárdenas Visión', { align: 'center' });
    doc.moveDown();

    // Sección 1: Datos del paciente
    this.#seccion(doc, '1. DATOS DE IDENTIFICACIÓN');
    this.#campo(doc, 'Nombre', `${paciente.nombres} ${paciente.apellidos}`);
    this.#campo(doc, 'Documento', `${paciente.tipo_documento} ${paciente.numero_documento}`);
    // ... resto de secciones

    // Sección 8: Diagnóstico (solo si existe)
    if (historia.diagnostico_principal) {
      this.#seccion(doc, '8. DIAGNÓSTICO');
      this.#campo(doc, 'Principal', historia.diagnostico_principal);
    }

    // Footer con firma
    doc.fontSize(10).text(
      `${medico.nombres} ${medico.apellidos} — Reg. ${medico.numero_licencia}`,
      { align: 'right' }
    );

    doc.end();
    return doc; // stream al controller para res.pipe(doc)
  }

  #seccion(doc, titulo) {
    doc.moveDown().fillColor('#038996').fontSize(13).text(titulo);
    doc.fillColor('#000000').fontSize(11);
  }

  #campo(doc, label, valor) {
    doc.text(`${label}: `, { continued: true }).font('Helvetica').text(valor || '—');
  }
}
```

---

## 15. Escalabilidad — Decisiones para Crecer

| Escenario de crecimiento | Solución ya preparada |
|--------------------------|----------------------|
| Más sedes | `sedes` es tabla propia, `medico_sede` ya existe |
| Más canales de cita (ej. web, app) | Strategy Pattern — agregar `WebStrategy` sin tocar código existente |
| Extraer gamificación a microservicio | Módulo ya aislado, EventBus ya desacopla la comunicación |
| Más roles | `roles` es tabla, TourFactory y RLS son data-driven |
| Alta concurrencia | Connection pooling via Supabase PgBouncer; stateless Express (sin sesión en memoria) |
| Cache | Repository layer es el lugar correcto para agregar Redis sin tocar services |
| Tests | DI manual permite mockear repos en tests sin tocar BD |
| Nuevo proveedor de auth | `requireAuth` middleware es el único punto a cambiar |
| Migrar de Supabase | Repository pattern: cambiar la implementación interna, la interfaz pública no cambia |

---

## 16. Convenciones de Código

| Aspecto | Convención |
|---------|-----------|
| Módulos | CommonJS (`require/module.exports`) — consistente con Node.js nativo |
| Async | `async/await` siempre, nunca callbacks |
| Error handling | Lanzar errores (`throw`), nunca retornar `{ error }` |
| Nombres archivos | `kebab-case.tipo.js` — ej: `pacientes.service.js` |
| Nombres clases | PascalCase |
| Nombres métodos | camelCase, verbos: `crear`, `buscarPorDocumento`, `marcarVisitada` |
| Variables env | UPPER_SNAKE_CASE, siempre validadas al iniciar con Zod |
| Logs | `console.error` para errores no operacionales; no loggear datos sensibles (passwords, tokens) |
| Comentarios | Solo para el POR QUÉ, nunca para el QUÉ |

---

*Documento vivo — actualizar al agregar módulos nuevos o cambiar patrones.*
