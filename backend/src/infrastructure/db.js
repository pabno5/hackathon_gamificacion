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

/**
 * Setea el actor (empleado) en una GUC de transacción para que el trigger
 * `trigger_audit_log` registre `audit_log.id_empleado` (PRD NF-03).
 *
 * `set_config(..., true)` es LOCAL a la transacción: no filtra a la siguiente
 * consulta que reutilice la conexión del pool, y sobrevive el modo transaction
 * del pooler de Supabase (a diferencia de un SET de sesión).
 *
 * `idEmpleado` nulo/undefined → actor NULL (acciones de sistema: cron, sync).
 */
async function setActor(client, idEmpleado) {
  await client.query(
    "SELECT set_config('app.current_empleado', $1, true)",
    [idEmpleado ? String(idEmpleado) : '']
  );
}

/**
 * Escritura auditada de un solo statement. Abre transacción, fija el actor y
 * ejecuta la consulta. Usar en INSERT/UPDATE/DELETE sobre tablas con auditoría
 * (personas, citas, historias_clinicas, empleados).
 */
async function queryAs(idEmpleado, text, params) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await setActor(client, idEmpleado);
    const res = await client.query(text, params);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Escritura auditada multi-statement. Abre transacción, fija el actor y pasa
 * el `client` a `fn` para que todas las consultas compartan la misma sesión
 * (y por tanto el mismo actor). Ideal para operaciones que insertan/actualizan
 * varias filas atómicamente.
 */
async function withActor(idEmpleado, fn) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await setActor(client, idEmpleado);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { getPool, queryAs, withActor, setActor };
