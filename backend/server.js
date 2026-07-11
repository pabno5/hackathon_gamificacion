const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

dotenv.config();

// Módulos
const createAuthRouter = require('./src/modules/auth/auth.routes');
const createPacientesModule = require('./src/modules/pacientes');
const createHistoriasModule = require('./src/modules/historias-clinicas');
const createEspecialidadesModule = require('./src/modules/especialidades');
const createSedesModule = require('./src/modules/sedes');
const createMedicosModule = require('./src/modules/medicos');
const createEmpleadosModule = require('./src/modules/empleados');
const createCitasModule = require('./src/modules/citas');
const createGamificacionModule = require('./src/modules/gamificacion');
const createAuditModule = require('./src/modules/audit');
const createAgendaModule = require('./src/modules/agenda');
const createChatbotDocsModule = require('./src/modules/chatbot-docs');

// Shared / infrastructure
const errorHandler = require('./src/shared/middleware/errorHandler.middleware');
const { generalRateLimit } = require('./src/shared/middleware/rateLimit.middleware');
const eventBus = require('./src/shared/events/eventBus');
const { registerCalendarListeners } = require('./src/infrastructure/calendarListeners');
const calendarCron = require('./src/infrastructure/calendarCron');
const { getPool } = require('./src/infrastructure/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// 1. CORS
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001', 'http://localhost:4173'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 2. Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 3. Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 4. Rate limit global
app.use(generalRateLimit);

// 5. Estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Health
app.get('/', (_req, res) => {
  res.send('Servidor Clínica Cárdenas Visión — Supabase Auth + PostgreSQL');
});

app.get('/test-connection', async (_req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT NOW() as now, version() as version');
    res.json({
      success: true,
      database: {
        status: 'Conectado a Supabase PostgreSQL',
        serverTime: result.rows[0].now,
        version: result.rows[0].version,
      },
      auth: { provider: 'Supabase Auth' },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. Routes — /api/v1
app.use('/api/v1/auth', createAuthRouter());
app.use('/api/v1/pacientes', createPacientesModule());
app.use('/api/v1/historias-clinicas', createHistoriasModule());
app.use('/api/v1/especialidades', createEspecialidadesModule());
app.use('/api/v1/sedes', createSedesModule());
app.use('/api/v1/medicos', createMedicosModule());
app.use('/api/v1/empleados', createEmpleadosModule());
app.use('/api/v1/gamificacion', createGamificacionModule());
app.use('/api/v1/audit', createAuditModule());
app.use('/api/v1/agenda', createAgendaModule());
app.use('/api/v1/chatbot-docs', createChatbotDocsModule());

// Citas: módulo expone repo para listeners de Calendar
const citasModule = createCitasModule();
app.use('/api/v1/citas', citasModule.router);
registerCalendarListeners(citasModule.repo);

// Callcenter (BE-03): endpoint máquina-a-máquina para n8n/Vapi. API key, sin login.
const buildCallcenterRouter = require('./src/modules/citas/citas.callcenter');
app.use('/api/v1/callcenter', buildCallcenterRouter(citasModule.service));

// Stats del cron de Calendar
app.get('/api/v1/calendar/sync-stats', (_req, res) => res.json(calendarCron.getStats()));

// 7. EventBus listeners
eventBus.onSafe('tour.completado', ({ idEmpleado }) => {
  console.log(`[event] tour.completado idEmpleado=${idEmpleado}`);
});

// 8. Error handler global
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS origins: ${corsOrigins.join(', ')}`);

  const syncInterval = process.env.GOOGLE_CALENDAR_SYNC_INTERVAL || '*/15 * * * *';
  if (process.env.GOOGLE_CALENDAR_AUTO_SYNC !== 'false') {
    calendarCron.start(syncInterval);
  } else {
    console.log('⚠️  Sincronización Google Calendar deshabilitada');
  }
});

module.exports = app;
