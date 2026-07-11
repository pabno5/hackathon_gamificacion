/**
 * Tour de onboarding con driver.js (GAM-01/02).
 *
 * - Pasos vienen del backend (GET /gamificacion/tour) según el rol.
 * - Arranca automático si primer_login = true.
 * - NO saltable: sin botón de cierre, sin click en overlay, sin ESC.
 * - El tour SOLO guía; NO marca features como visitadas (BE-01). El progreso
 *   de gamificación se marca cuando el empleado USA cada feature de verdad
 *   (useFeatureVisit al entrar a la vista + notifyClick en cada acción).
 * - Al terminar: POST /auth/tour-completado (apaga primer_login).
 *
 * Uso (después de login exitoso, con la vista del portal montada):
 *   import { startTourIfFirstLogin } from '../lib/tourManager';
 *   startTourIfFirstLogin();
 */
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { refreshProgress } from './progressTracker';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';
const API_V1 = API_URL.replace(/\/api$/, '/api/v1');

type PasoBackend = {
  featureId: string;
  element: string;
  popover: { title: string; description: string };
  orden: number;
};

function getToken(): string | null {
  try {
    return localStorage.getItem('authToken');
  } catch {
    return null;
  }
}

async function api(path: string, init: RequestInit = {}) {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_V1}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function marcarTourCompletado() {
  await api('/auth/tour-completado', { method: 'POST' });
}

// Colores del design system (UIUX.md)
const TOUR_STYLE_ID = 'cv-tour-style';
function injectTourStyles() {
  if (document.getElementById(TOUR_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = TOUR_STYLE_ID;
  style.textContent = `
    .driver-popover.cv-tour {
      border: 2px solid #03D4D9;
      border-radius: 1rem;
    }
    .driver-popover.cv-tour .driver-popover-title {
      color: #038996;
      font-weight: 700;
    }
    .driver-popover.cv-tour .driver-popover-next-btn {
      background: linear-gradient(to right, #01EDDF, #03D4D9);
      color: #fff;
      border: none;
      border-radius: 9999px;
      padding: 0.4rem 1.2rem;
      text-shadow: none;
    }
    .driver-popover.cv-tour .driver-popover-prev-btn {
      border-radius: 9999px;
    }
    .driver-popover.cv-tour .driver-popover-progress-text {
      color: #6b7280;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Lanza el tour con los pasos del rol. Resuelve cuando el tour termina.
 */
export async function startTour(): Promise<void> {
  const body = await api('/gamificacion/tour');
  const pasos: PasoBackend[] = body?.data?.pasos || [];
  if (pasos.length === 0) return;

  injectTourStyles();

  return new Promise((resolve) => {
    const d = driver({
      showProgress: true,
      progressText: 'Paso {{current}} de {{total}}',
      nextBtnText: 'Siguiente',
      prevBtnText: 'Anterior',
      doneBtnText: 'Finalizar',
      // No saltable (GAM-02)
      allowClose: false,
      allowKeyboardControl: false,
      overlayClickBehavior: undefined as any, // no cierra al click
      popoverClass: 'cv-tour',
      steps: pasos.map((p) => ({
        element: p.element,
        popover: {
          title: p.popover.title,
          description: p.popover.description,
        },
      })),
      // Sin onHighlightStarted: el tour NO marca progreso (BE-01). Las features
      // se marcan por uso real en cada vista/acción.
      onDestroyed: async () => {
        await marcarTourCompletado();
        // Refresca por si el empleado ya usó algo mientras recorría el tour.
        refreshProgress();
        resolve();
      },
    });
    d.drive();
  });
}

/**
 * Arranca el tour solo si el backend dice primer_login = true.
 * Llamar después de login, con el dashboard montado.
 */
export async function startTourIfFirstLogin(): Promise<void> {
  const body = await api('/gamificacion/tour');
  if (body?.data?.primer_login === true) {
    await startTour();
  }
}

export default { startTour, startTourIfFirstLogin };
