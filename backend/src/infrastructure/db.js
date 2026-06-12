/**
 * Pool singleton de PostgreSQL (Supabase pooler).
 *
 * Antes había 13 pools separados — cada uno reservaba conexiones del
 * Supabase pooler hasta agotar la cuota. Singleton arregla eso.
 *
 * Tamaño máx: 10 (suficiente para un Express monolito en Railway free).
 */
const { Pool } = require('pg');
require('dotenv').config();

let pool = null;

function getPool() {
  if (!pool) {
    const connectionString = process.env.SUPABASE_DATABASE_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DATABASE_URL no está definido');
    }
    pool = new Pool({
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX, 10) || 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on('error', (err) => {
      console.error('[db] error inesperado en pool:', err.message);
    });
  }
  return pool;
}

module.exports = { getPool };
