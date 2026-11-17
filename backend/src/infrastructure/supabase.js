const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

let serviceInstance = null;

/**
 * Cliente Singleton con service_role — bypassea RLS.
 * Solo backend lo usa para operaciones de sistema (verificar tokens,
 * crear usuarios, leer/escribir saltando RLS de forma controlada).
 */
function getSupabaseClient() {
  if (!serviceInstance) {
    const url = process.env.SUPABASE_PROJECT_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        'Faltan SUPABASE_PROJECT_URL o SUPABASE_SERVICE_KEY en el entorno'
      );
    }
    serviceInstance = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    });
  }
  return serviceInstance;
}

/**
 * Cliente NUEVO y desechable para operaciones de un usuario final
 * (signInWithPassword, resetPasswordForEmail).
 *
 * No se usa el singleton de service_role para iniciar sesión: supabase-js guarda
 * en memoria la sesión del último usuario que hizo login, y las llamadas
 * siguientes del singleton saldrían con el JWT de ese usuario en vez de la
 * service key. Usa la anon key cuando existe (mínimo privilegio).
 */
function createUserAuthClient() {
  const url = process.env.SUPABASE_PROJECT_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Faltan SUPABASE_PROJECT_URL o SUPABASE_ANON_KEY en el entorno');
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

module.exports = { getSupabaseClient, createUserAuthClient };
