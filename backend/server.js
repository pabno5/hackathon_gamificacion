const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { supabase } = require('./db');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

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
  res.send('¡Servidor funcionando correctamente!');
});

// Ruta de prueba para verificar la conexión
app.get('/test-connection', async (req, res) => {
  try {
    // Probar conexión con Supabase
    const { data: version } = await supabase.rpc('version');
    
    res.json({
      success: true,
      status: 'Conectado a Supabase',
      url: process.env.SUPABASE_URL,
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

// Rutas de empleado (requieren rol de administrador o empleado)
app.use('/api/employee', employeeRoutes);

module.exports = app;