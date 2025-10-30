import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

const STORAGE_KEY = 'highContrastMode';

export default function ContrastToggle() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === '1';
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (enabled) {
        document.body.classList.add('high-contrast');
        localStorage.setItem(STORAGE_KEY, '1');
      } else {
        document.body.classList.remove('high-contrast');
        localStorage.setItem(STORAGE_KEY, '0');
      }
    } catch (e) {
      // noop
    }
  }, [enabled]);

  // Keep the button visible while scrolling (fixed position)
  return (
    <button
      role="button"
      aria-pressed={enabled}
      aria-label={enabled ? 'Desactivar alto contraste' : 'Activar alto contraste'}
      title={enabled ? 'Desactivar alto contraste' : 'Activar alto contraste'}
      onClick={() => setEnabled((s) => !s)}
      // moved closer to the right edge per request
      style={{ position: 'fixed', right: '0.75rem', bottom: '6rem', zIndex: 99999 }}
      className={`contrast-toggle flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`}
    >
      {enabled ? (
        <Moon className="w-6 h-6 text-black" />
      ) : (
        <Sun className="w-6 h-6 text-yellow-400" />
      )}
    </button>
  );
}
