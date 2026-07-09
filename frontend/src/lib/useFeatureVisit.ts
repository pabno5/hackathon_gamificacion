import { useEffect } from "react";
import { notifyClick } from "./progressTracker";

/**
 * Marca una feature de gamificación como visitada al montar la vista (FE-03).
 *
 * `code` es un código del Anexo A del PRD (R-01, M-02, A-07...). El backend
 * valida que la feature pertenezca al rol del empleado — si no, responde 403
 * y el tracker lo ignora, así que es seguro disparar códigos de otro rol.
 * `code` undefined/null → no-op (útil cuando el rol aún no resuelve).
 */
export default function useFeatureVisit(code: string | null | undefined) {
  useEffect(() => {
    if (!code) return;
    try {
      notifyClick(code);
    } catch {
      /* noop */
    }
  }, [code]);
}
