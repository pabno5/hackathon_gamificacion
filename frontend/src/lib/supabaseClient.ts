import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  // No tirar el bundle — solo avisar; sin Supabase el login no funcionará.
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no definidos en .env');
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Mantener sincronizado el token cacheado en localStorage con el JWT vigente
// (FT-05). Así los lectores directos (progressTracker, tourManager) nunca usan
// un token expirado tras un auto-refresh de Supabase.
supabase.auth.onAuthStateChange((_event, session) => {
  try {
    if (session?.access_token) {
      localStorage.setItem('authToken', session.access_token);
    } else {
      localStorage.removeItem('authToken');
    }
  } catch {
    /* noop */
  }
});
