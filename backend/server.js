const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const personasRoutes = require('./routes/personasRoutes');
const medicosRoutes = require('./routes/medicosRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const credencialesRoutes = require('./routes/credencialesRoutes');
const especialidadesRoutes = require('./routes/especialidadesRoutes');
const documentosRoutes = require('./routes/documentosRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
// CORS - Permitir peticiones desde el frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json()); // Para parsear JSON
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando correctamente con Supabase + Firebase Auth!');
});

// Ruta de prueba para verificar la conexión
app.get('/test-connection', async (req, res) => {
  try {
    const { query, admin } = require('./config/dataconnect');

    // Verificar conexión a PostgreSQL
    const result = await query('SELECT NOW() as now, version() as version');
    const dbTime = result.rows[0];

    // Verificar que Firebase Admin esté inicializado
    const firebaseApp = admin.app();

    res.json({
      success: true,
      database: {
        status: 'Conectado a Supabase PostgreSQL',
        serverTime: dbTime.now,
        version: dbTime.version
      },
      firebase: {
        status: 'Firebase Auth inicializado',
        projectId: firebaseApp.options.projectId
      },
      message: '¡Conexión establecida exitosamente!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code
      }
    });
  }
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de administrador (requieren rol de administrador)
app.use('/api/admin', adminRoutes);

// Rutas de personas
app.use('/api/personas', personasRoutes);

// Rutas de médicos
app.use('/api/medicos', medicosRoutes);

// Rutas de roles
app.use('/api/roles', rolesRoutes);

// Rutas de credenciales (autenticación)
app.use('/api/credenciales', credencialesRoutes);

// Rutas de especialidades
app.use('/api/especialidades', especialidadesRoutes);

// Rutas de documentos
app.use('/api/documentos', documentosRoutes);

// Rutas de citas
const citasRoutes = require('./routes/citas');
app.use('/api/citas', citasRoutes);

// Ruta para ver estadísticas de sincronización
const calendarSyncService = require('./services/calendarSyncService');
app.get('/api/calendar/sync-stats', (req, res) => {
  res.json(calendarSyncService.getStats());
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Test conexión: http://localhost:${PORT}/test-connection`);
  
  // Iniciar sincronización automática de Google Calendar
  // Configuración desde .env o por defecto cada 15 minutos
  const syncInterval = process.env.GOOGLE_CALENDAR_SYNC_INTERVAL || '*/15 * * * *';
  
  if (process.env.GOOGLE_CALENDAR_AUTO_SYNC !== 'false') {
    calendarSyncService.start(syncInterval);
  } else {
    console.log('⚠️  Sincronización automática de Google Calendar deshabilitada (GOOGLE_CALENDAR_AUTO_SYNC=false)');
  }
});

module.exports = app;