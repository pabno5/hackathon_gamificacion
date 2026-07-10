import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import logoImage from "../../assets/logo.png";
import { login } from "../../service/user.service";
import { authAPI } from "../../service/api";
import { useAuth } from "../../lib/authContext";

/**
 * Login del portal de empleados — extraído del monolito LoginPage (Inc 2 FT-04).
 * Markup del card conservado tal cual. Tras login exitoso: refresca el perfil
 * (rol) y navega a /portal; PortalIndexRedirect resuelve el home del rol.
 *
 * El flujo de auto-registro ("notRegister") murió con SEC-03: solo el admin
 * crea empleados, así que un usuario sin vincular recibe un aviso.
 */
export default function LoginForm() {
  const navigate = useNavigate();
  const { rol, loading, refresh } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modoReset, setModoReset] = useState(false);
  const [enviandoReset, setEnviandoReset] = useState(false);

  // Sesión ya activa → directo al portal
  if (!loading && rol) return <Navigate to="/portal" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const auth = await login(correo, contrasena);
      if (auth === true) {
        await refresh();
        navigate("/portal");
        return;
      }
      if (auth === "notRegister") {
        toast.error("Tu usuario no está vinculado como empleado. Contacta al administrador.");
        return;
      }
      toast.error("Credenciales inválidas. Verifica tu correo y contraseña.");
    } catch {
      toast.error("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo) {
      toast.error("Ingresa tu correo para enviarte el enlace.");
      return;
    }
    setEnviandoReset(true);
    try {
      await authAPI.recuperarPassword({
        email: correo,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      toast.success("Si el correo existe, te enviamos un enlace para restablecer la contraseña.");
      setModoReset(false);
    } catch {
      // No revelar si el correo existe o no (seguridad)
      toast.success("Si el correo existe, te enviamos un enlace para restablecer la contraseña.");
      setModoReset(false);
    } finally {
      setEnviandoReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorative background elements - eye inspired */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#01EDDF]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-[#03D4D9]/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#01EDDF]/3 rounded-full blur-3xl"></div>

      {/* Decorative curves */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,200 Q400,100 800,200 T1600,200" fill="none" stroke="#03D4D9" strokeWidth="2"/>
        <path d="M0,400 Q400,300 800,400 T1600,400" fill="none" stroke="#03D4D9" strokeWidth="2"/>
        <path d="M0,600 Q400,500 800,600 T1600,600" fill="none" stroke="#03D4D9" strokeWidth="2"/>
      </svg>

      {/* Main content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img
              src={logoImage}
              alt="Cárdenas Visión"
              className="h-24 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-10">
            <h1 className="text-gray-800 mb-3">Portal de Empleados</h1>
            <p className="text-gray-600">Ingresa tus credenciales para acceder al sistema</p>
          </div>

          {/* Form */}
          {modoReset ? (
            <form onSubmit={handleReset} className="space-y-6">
              <p className="text-sm text-gray-600 text-center">
                Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <div className="space-y-2">
                <Label htmlFor="correoReset" className="text-gray-700">Correo</Label>
                <Input
                  id="correoReset"
                  type="email"
                  placeholder="Ingresa tu correo"
                  className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={enviandoReset}
                className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
              >
                {enviandoReset ? "Enviando..." : "Enviar enlace"}
              </Button>

              <button
                type="button"
                onClick={() => setModoReset(false)}
                className="w-full text-sm text-[#03D4D9] hover:text-[#01EDDF] transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="correo" className="text-gray-700">Correo</Label>
                <Input
                  id="correo"
                  type="email"
                  placeholder="Ingresa tu correo"
                  className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={enviando}
                className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
              >
                {enviando ? "Verificando..." : "Acceder"}
              </Button>

              <button
                type="button"
                onClick={() => setModoReset(true)}
                className="w-full text-sm text-[#03D4D9] hover:text-[#01EDDF] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-10 pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500">
              © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
