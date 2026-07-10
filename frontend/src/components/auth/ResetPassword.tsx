import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import logoImage from "../../assets/logo.png";
import { supabase } from "../../lib/supabaseClient";

/**
 * Página de restablecimiento de contraseña (AU-03 / FE-06).
 *
 * Supabase abre esta ruta desde el enlace del correo; con detectSessionInUrl
 * (ver supabaseClient) crea una sesión de recovery. Aquí el usuario fija su
 * nueva contraseña vía supabase.auth.updateUser. No manejamos credenciales:
 * el usuario escribe su propia contraseña.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);

  // Verifica que llegamos con una sesión de recovery válida
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setListo(!!data.session);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmar) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "No se pudo actualizar la contraseña.");
        return;
      }
      toast.success("Contraseña actualizada. Inicia sesión con la nueva.");
      await supabase.auth.signOut();
      navigate("/login");
    } catch {
      toast.error("Error al actualizar la contraseña.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#01EDDF]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-[#03D4D9]/5 rounded-full blur-3xl"></div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10">
          <div className="flex justify-center mb-8">
            <img src={logoImage} alt="Cárdenas Visión" className="h-20 w-auto" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-gray-800 mb-3">Nueva contraseña</h1>
            <p className="text-gray-600">Define una nueva contraseña para tu cuenta</p>
          </div>

          {!listo ? (
            <p className="text-center text-sm text-gray-500">
              Este enlace no es válido o ya expiró. Solicita uno nuevo desde
              “¿Olvidaste tu contraseña?” en el inicio de sesión.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nueva" className="text-gray-700">Nueva contraseña</Label>
                <Input
                  id="nueva"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmar" className="text-gray-700">Confirmar contraseña</Label>
                <Input
                  id="confirmar"
                  type="password"
                  placeholder="Repite la contraseña"
                  className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={guardando}
                className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
              >
                {guardando ? "Guardando..." : "Actualizar contraseña"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
