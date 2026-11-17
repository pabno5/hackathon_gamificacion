const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');

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
const { requireAuth } = require('./src/shared/middleware/auth.middleware');
const { requireRol } = require('./src/shared/middleware/role.middleware');
const { getAllowedOrigins } = require('./src/shared/utils/origins');
const eventBus = require('./src/shared/events/eventBus');
const { registerCalendarListeners } = require('./src/infrastructure/calendarListeners');
const calendarCron = require('./src/infrastructure/calendarCron');
const { getPool } = require('./src/infrastructure/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.disable('x-powered-by');

// 1. CORS
const corsOrigins = getAllowedOrigins();
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

// 3. Body parsing. 1 MB alcanza para cualquier JSON de la app (una historia
// clínica completa pesa pocos KB); los PDF del chatbot entran por multer, que
// tiene su propio límite. Un tope bajo evita agotar memoria con peticiones enormes.
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// 4. Rate limit global
app.use(generalRateLimit);

// Health
app.get('/', (_req, res) => {
  res.send('Servidor Clínica Cárdenas Visión — Supabase Auth + PostgreSQL');
});

// Chequeo de salud público: solo dice si la BD responde. No expone la versión
// del motor ni el mensaje de error (información útil para un atacante).
app.get('/test-connection', async (_req, res) => {
  try {
    await getPool().query('SELECT 1');
    res.json({ success: true, database: { status: 'ok' } });
  } catch (error) {
    console.error('[health] BD no responde:', error.message);
    res.status(503).json({ success: false, database: { status: 'unavailable' } });
  }
});

// 5. Routes — /api/v1
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

// Stats del cron de Calendar (solo admin: antes era público)
app.get(
  '/api/v1/calendar/sync-stats',
  requireAuth,
  requireRol('admin'),
  (_req, res) => res.json(calendarCron.getStats())
);

// 6. EventBus listeners
eventBus.onSafe('tour.completado', ({ idEmpleado }) => {
  console.log(`[event] tour.completado idEmpleado=${idEmpleado}`);
});

// 7. 404 en JSON (el default de Express responde HTML)
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
  });
});

// 8. Error handler global
app.use(errorHandler);

// Solo se levanta el servidor al ejecutar `node server.js`. Al importarlo
// (tests) se obtiene la app sin abrir el puerto ni arrancar el cron.
if (require.main === module) {
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
}

module.exports = app;
