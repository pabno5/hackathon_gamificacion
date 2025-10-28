const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const personasRoutes = require('./routes/personasRoutes');
const medicosRoutes = require('./routes/medicosRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const credencialesRoutes = require('./routes/credencialesRoutes');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
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

// Rutas de citas
const citasRoutes = require('./routes/citas');
app.use('/api/citas', citasRoutes);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔧 Modo: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Test conexión: http://localhost:${PORT}/test-connection`);
});

module.exports = app;