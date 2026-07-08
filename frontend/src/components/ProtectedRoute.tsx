import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/authContext";

/**
 * Guard de rutas del portal. Lee el rol de useAuth (una sola carga de perfil).
 * - Sin rol (sin sesión o perfil inválido) → /login.
 * - `roles` presente y el rol no está → /portal (ya logueado, va a su home).
 */
export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const navigate = useNavigate();
  const { rol, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!rol) {
      toast.error("Debes iniciar sesión");
      navigate("/login");
      return;
    }
    if (roles && roles.length > 0 && !roles.includes(rol)) {
      toast.error("No tienes permisos para esta sección");
      navigate("/portal");
    }
  }, [loading, rol, roles, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }
  if (!rol) return null;
  if (roles && roles.length > 0 && !roles.includes(rol)) return null;
  return <>{children}</>;
}
