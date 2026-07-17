import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { logout } from "../../service/user.service";
import { initProgressTracker, refreshProgress } from "../../lib/progressTracker";
import { startTourIfFirstLogin } from "../../lib/tourManager";
import { useAuth } from "../../lib/authContext";
import PortalNav from "./PortalNav";
import logoImage from "../../assets/logo.png";

/**
 * Shell del portal de empleados: header (logo, barra de progreso GAM-05, logout)
 * + nav por rol + <Outlet/> para la vista activa.
 *
 * Aquí también viven el init del tracker de gamificación y el arranque del
 * tour de primer login (antes en el monolito LoginPage).
 */
export default function PortalLayout() {
  const navigate = useNavigate();
  const { user, rol, loading } = useAuth();
  const [progress, setProgress] = useState(0);
  const tourLanzado = useRef(false);

  // Barra de progreso de gamificación (GAM-05) + badge al 100% (GAM-08)
  useEffect(() => {
    const handler = (e: Event) => {
      const pct = (e as CustomEvent)?.detail?.percent;
      if (typeof pct === "number") {
        setProgress((prev) => {
          if (pct === 100 && prev < 100 && prev > 0) {
            toast.success("🎉 ¡Completaste tu onboarding! Exploraste el 100% de tu rol.");
          }
          return pct;
        });
      }
    };
    window.addEventListener("progressTracker:update", handler as EventListener);
    return () => window.removeEventListener("progressTracker:update", handler as EventListener);
  }, []);

  // Init del tracker + tour de primer login (GAM-01), una vez con rol resuelto
  useEffect(() => {
    if (loading || !rol || tourLanzado.current) return;
    tourLanzado.current = true;
    try {
      initProgressTracker((user?.correo as string) || "guest");
    } catch { /* noop */ }
    refreshProgress();
    // Deja montar la vista antes de resaltar elementos (comportamiento del monolito)
    const t = setTimeout(() => { startTourIfFirstLogin(); }, 600);
    return () => clearTimeout(t);
  }, [loading, rol, user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-[#01EDDF]/5">
      {/* z-50 (no z-40): index.css es Tailwind precompilado del export de Figma
          y solo trae las clases del monolito original — .z-40 no existe ahí. */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 gap-4">
          <div className="flex items-center gap-4">
            <img src={logoImage} alt="Cárdenas Visión" className="h-12 w-auto" />
            <PortalNav />
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2" title="Progreso de onboarding">
              <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-9 text-right">{progress}%</span>
            </div>
            <Button variant="outline" className="rounded-full" onClick={handleLogout}>
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
