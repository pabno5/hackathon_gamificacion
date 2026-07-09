import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../lib/supabaseClient";
import { authAPI } from "../service/api";

/**
 * Guard de rutas del portal (NF-01 + restricción de agendamiento del PRD).
 *
 * - Sin sesión Supabase → redirige a /login.
 * - `roles` opcional: si se pasa, exige que el rol del empleado esté en la lista;
 *   si no, redirige a /login con aviso.
 *
 * Mientras verifica muestra un placeholder para no exponer la vista protegida.
 */
export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<"verificando" | "ok">("verificando");

  useEffect(() => {
    let activo = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (activo) {
          toast.error("Debes iniciar sesión");
          navigate("/login");
        }
        return;
      }
      // Si se exige rol, validarlo contra el backend.
      if (roles && roles.length > 0) {
        try {
          const { data: perfil } = await authAPI.profile();
          const rol = perfil?.data?.rol;
          if (!rol || !roles.includes(rol)) {
            if (activo) {
              toast.error("No tienes permisos para acceder a esta sección");
              navigate("/login");
            }
            return;
          }
        } catch {
          if (activo) {
            toast.error("Sesión inválida");
            navigate("/login");
          }
          return;
        }
      }
      if (activo) setEstado("ok");
    })();
    return () => {
      activo = false;
    };
  }, [navigate, roles]);

  if (estado === "verificando") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Verificando acceso…</div>
      </div>
    );
  }

  return <>{children}</>;
}
