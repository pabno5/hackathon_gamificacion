/**
 * Auth contra Supabase. Firmas conservadas para compatibilidad con LoginPage:
 *   - login(email, password)  -> true | 'notRegister' | undefined
 *   - logout()                -> void
 *   - registerUser(persona)   -> { success, data }
 */
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const API_URL = API_BASE.replace(/\/api$/, '/api/v1');

function setToken(token) {
  if (token) localStorage.setItem('authToken', token);
}
function clearToken() {
  localStorage.removeItem('authToken');
}

export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const code = (error.message || '').toLowerCase();
      console.warn('Login error:', error.message);
      if (code.includes('invalid login')) return undefined;
      return undefined;
    }
    const token = data.session?.access_token;
    if (!token) return undefined;
    setToken(token);

    // Validar que el usuario tenga empleado vinculado
    const resp = await fetch(`${API_URL}/auth/uid`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const body = await resp.json().catch(() => ({}));
    if (body?.code === 200 && body?.success) return true;
    if (body?.code === 404) return 'notRegister';
    return undefined;
  } catch (e) {
    console.error('login fatal:', e);
    return undefined;
  }
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } finally {
    clearToken();
  }
}

export async function registerUser(persona) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(persona),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Error al registrar persona');
  return data;
}

// Helper para que `api.js` lea el JWT vigente de Supabase si localStorage está vacío.
export async function getCurrentToken() {
  const cached = localStorage.getItem('authToken');
  if (cached) return cached;
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token || null;
  if (t) setToken(t);
  return t;
}
