/**
 * Tracker de progreso de gamificación — respaldado por backend (GAM-06).
 *
 * Mantiene la firma legacy (initProgressTracker, registerButton, notifyClick,
 * getProgressInfo) para no tocar LoginPage/button.tsx, pero el estado vive en BD:
 *   - init: carga GET /gamificacion/mi-progreso
 *   - click de un botón mapeado a feature: POST /gamificacion/visitar
 *   - sin sesión backend (visitante/landing): cae a modo local (localStorage)
 *
 * El evento `progressTracker:update` se mantiene — la barra de progreso
 * existente sigue funcionando sin cambios.
 */

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
const API_V1 = API_URL.replace(/\/api$/, '/api/v1');

// Solo ids que YA son códigos de feature (R-01, M-03, A-07) van al backend.
// El mapa legacy botón→feature murió con el monolito: las features se marcan
// donde la acción ocurre de verdad (useFeatureVisit + notifyClick con código).
const FEATURE_CODE_RE = /^[RMA]-\d{2}$/;

type Resumen = { total: number; visitadas: number; porcentaje: number };

let backendMode = false;
let resumen: Resumen | null = null;

// Estado local (fallback sin sesión)
let userKey = 'guest';
let clicked = new Set<string>();
let registered = new Set<string>();

const storageKey = (u: string) => `buttonProgress:${u}`;

function getToken(): string | null {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
}

function featureCodeFor(id: string): string | null {
  return FEATURE_CODE_RE.test(id) ? id : null;
}

function loadLocal(u: string) {
  userKey = u || 'guest';
  clicked = new Set<string>();
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (raw) JSON.parse(raw).clickedIds?.forEach((id: string) => clicked.add(id));
  } catch {
    /* noop */
  }
}

function persistLocal() {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify({ clickedIds: Array.from(clicked) }));
  } catch {
    /* noop */
  }
}

async function fetchResumen(): Promise<Resumen | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_V1}/gamificacion/mi-progreso`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data?.resumen ?? null;
  } catch {
    return null;
  }
}

async function postVisitar(codigo: string): Promise<Resumen | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_V1}/gamificacion/visitar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
    });
    if (!res.ok) return null; // 403 = feature de otro rol; ignorar
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export function initProgressTracker(forUserKey?: string) {
  loadLocal(forUserKey || 'guest');
  // Intentar modo backend
  fetchResumen().then((r) => {
    if (r) {
      backendMode = true;
      resumen = r;
    }
    dispatchUpdate();
  });
  dispatchUpdate();
}

export function registerButton(id: string) {
  if (!id) return;
  registered.add(id);
  dispatchUpdate();
}

export function notifyClick(id: string) {
  if (!id) return;
  registered.add(id);

  // Backend: mapear a feature y persistir en BD
  const codigo = featureCodeFor(id);
  if (codigo && getToken()) {
    postVisitar(codigo).then((r) => {
      if (r) {
        backendMode = true;
        resumen = r;
        dispatchUpdate();
      }
    });
  }

  // Local siempre (UX inmediata + fallback)
  if (!clicked.has(id)) {
    clicked.add(id);
    persistLocal();
    dispatchUpdate();
  }
}

export function getProgressInfo() {
  if (backendMode && resumen) {
    return {
      total: resumen.total,
      clickedCount: resumen.visitadas,
      percent: resumen.porcentaje,
      clicked: Array.from(clicked),
    };
  }
  const total = registered.size;
  const clickedCount = clicked.size;
  const percent = total > 0 ? Math.round((clickedCount / total) * 100) : 0;
  return { total, clickedCount, percent, clicked: Array.from(clicked) };
}

/** Fuerza recarga del resumen desde backend (p.ej. tras login). */
export async function refreshProgress() {
  const r = await fetchResumen();
  if (r) {
    backendMode = true;
    resumen = r;
    dispatchUpdate();
  }
}

function dispatchUpdate() {
  try {
    window.dispatchEvent(new CustomEvent('progressTracker:update', { detail: getProgressInfo() }));
  } catch {
    /* noop */
  }
}

export function resetForUser(u?: string) {
  const k = u || userKey || 'guest';
  localStorage.removeItem(storageKey(k));
  if (k === userKey) {
    clicked.clear();
    registered.clear();
    backendMode = false;
    resumen = null;
    dispatchUpdate();
  }
}

export default {
  initProgressTracker,
  registerButton,
  notifyClick,
  getProgressInfo,
  refreshProgress,
  resetForUser,
};
