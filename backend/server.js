const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { supabase } = require('./db');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
// Parse JSON bodies
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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

// Citas routes
try {
  const citasRouter = require('./routes/citas');
  app.use('/api/citas', citasRouter);
} catch (err) {
  // If routes file doesn't exist yet, skip — it'll be added by the CRUD implementation.
  console.warn('Citas router not mounted yet:', err.message);
}

module.exports = app;