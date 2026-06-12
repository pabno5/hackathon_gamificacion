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

module.exports = { getSupabaseClient };
