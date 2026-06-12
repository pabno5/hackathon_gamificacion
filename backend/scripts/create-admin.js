#!/usr/bin/env node
/**
 * Crea el primer usuario admin — Fase 1.8
 *
 * Crea el usuario en Supabase Auth (service role) y enlaza
 * personas + empleados con rol 'admin' y auth_uid.
 *
 * Uso:
 *   node scripts/create-admin.js <email> <password> <nombres> <apellidos> <numero_documento>
 *
 * Ejemplo:
 *   node scripts/create-admin.js admin@cardenas.co Clave1234 Pablo Cardenas 1098765432
 */
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');
require('dotenv').config();

async function main() {
  const [email, password, nombres, apellidos, documento] = process.argv.slice(2);
  if (!email || !password || !nombres || !apellidos || !documento) {
    console.error('Uso: node scripts/create-admin.js <email> <password> <nombres> <apellidos> <numero_documento>');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.SUPABASE_PROJECT_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Crear usuario en Supabase Auth (confirmado)
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr) {
    console.error('Error creando usuario Auth:', authErr.message);
    process.exit(1);
  }
  const authUid = authData.user.id;
  console.log('Usuario Auth creado:', authUid);

  // 2. Insertar persona + empleado vía SQL (rol admin)
  const pg = new Client({ connectionString: process.env.SUPABASE_DATABASE_URL });
  await pg.connect();
  try {
    await pg.query('BEGIN');

    const persona = await pg.query(
      `INSERT INTO personas (tipo_documento, numero_documento, nombres, apellidos, correo)
       VALUES ('CC', $1, $2, $3, $4)
       RETURNING id_persona`,
      [documento, nombres, apellidos, email]
    );
    const idPersona = persona.rows[0].id_persona;

    const rol = await pg.query("SELECT id_rol FROM roles WHERE nombre = 'admin' LIMIT 1");
    if (rol.rows.length === 0) throw new Error("Rol 'admin' no existe. Corre el seed primero.");
    const idRol = rol.rows[0].id_rol;

    const empleado = await pg.query(
      `INSERT INTO empleados (id_persona, id_rol, auth_uid, primer_login)
       VALUES ($1, $2, $3, FALSE)
       RETURNING id_empleado`,
      [idPersona, idRol, authUid]
    );

    await pg.query('COMMIT');
    console.log('Empleado admin creado:', empleado.rows[0].id_empleado);
    console.log('\nListo. Login:', email);
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('Error insertando admin, revirtiendo. Borra el usuario Auth manualmente si quedó:', authUid);
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main();
