#!/usr/bin/env node
/**
 * Runner de migración — Fase 1
 *
 * Ejecuta el schema y el seed contra la base de Supabase usando
 * SUPABASE_DATABASE_URL del .env.
 *
 * Uso:
 *   node scripts/migrate.js              # crea schema + seed
 *   node scripts/migrate.js --reset      # DROP destructivo + recrea + seed
 *   node scripts/migrate.js --seed-only  # solo seed
 *
 * El flag --reset borra TODAS las tablas del proyecto (schema public).
 * Solo úsalo en una base sin datos que quieras conservar.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

const args = process.argv.slice(2);
const RESET = args.includes('--reset');
const SEED_ONLY = args.includes('--seed-only');

const SCHEMA_FILE = path.join(__dirname, '..', 'config', 'schema.sql');
const SEED_FILE = path.join(__dirname, '..', 'config', 'seed.sql');

// DROP destructivo de todas las tablas/tipos del proyecto (orden por CASCADE)
const RESET_SQL = `
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;
`;

async function run() {
  const conn = process.env.SUPABASE_DATABASE_URL;
  if (!conn) {
    console.error('ERROR: SUPABASE_DATABASE_URL no está en .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: conn });
  await client.connect();
  console.log('Conectado a Supabase.');

  try {
    if (RESET) {
      console.log('--reset: borrando tablas y tipos existentes...');
      await client.query(RESET_SQL);
      console.log('  Limpieza completa.');
    }

    if (!SEED_ONLY) {
      console.log('Ejecutando schema.sql...');
      await client.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
      console.log('  Schema creado.');
    }

    console.log('Ejecutando seed.sql...');
    await client.query(fs.readFileSync(SEED_FILE, 'utf8'));
    console.log('  Seed aplicado.');

    // Verificación
    const t = await client.query(
      "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'"
    );
    const roles = await client.query('SELECT count(*)::int AS n FROM roles');
    const feats = await client.query('SELECT count(*)::int AS n FROM gamificacion_features');
    console.log(`\nVerificación: ${t.rows[0].n} tablas, ${roles.rows[0].n} roles, ${feats.rows[0].n} features.`);
    console.log('Fase 1 completa.');
  } catch (e) {
    console.error('\nERROR durante migración:', e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
