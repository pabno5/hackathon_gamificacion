const { Pool } = require('pg');
const { admin } = require('./firebase');
require('dotenv').config();

// Configuración de conexión a Supabase (PostgreSQL)
const pool = new Pool({
  // Usar SUPABASE_URL con transaction pooler de Supabase
  connectionString: process.env.SUPABASE_DATABASE_URL,
  
  // Configuración de pool
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Probar conexión
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Error conectando a Supabase PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a Supabase PostgreSQL');
    console.log('🕐 Server time:', res.rows[0].now);
  }
});

// Manejar errores de pool
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de Supabase:', err);
});

// Helper para ejecutar queries con manejo de errores
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query ejecutado:', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error en query:', { text, error: error.message });
    throw error;
  }
};

// Helper para transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  admin
};

