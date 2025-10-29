import { useState } from 'react';
import { Card } from './components/ui/card';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { Eye } from 'lucide-react';
import { login } from './service/user.service.js'
import logo from 'figma:asset/2b3771565ef8277b6c0f14cb804efe3e5eeb11aa.png';
import CitasCalendar from './components/citas/CitasCalendar.jsx'

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async(e: React.FormEvent) => {
    e.preventDefault();

    const credentials = await login(username, password);

    if (credentials) {
      console.log(credentials);
    } else {
      console.log('Error al iniciar sesión');
    }
  };

  const handleForgotPassword = () => {
    console.log('Forgot password clicked');
    // Aquí iría la lógica para recuperar contraseña
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col bg-white">
      {/* Elementos decorativos inspirados en el ojo */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Círculos concéntricos sutiles (iris) */}
        <div className="absolute top-20 right-20 w-96 h-96 rounded-full border-2 border-[#01EDDF]/20 animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute top-28 right-28 w-80 h-80 rounded-full border-2 border-[#03D4D9]/20 animate-pulse" 
             style={{ animationDuration: '5s' }} />
        <div className="absolute top-36 right-36 w-64 h-64 rounded-full border border-[#01EDDF]/30 animate-pulse" 
             style={{ animationDuration: '6s' }} />
        
        {/* Círculos decorativos en la izquierda */}
        <div className="absolute bottom-32 left-20 w-80 h-80 rounded-full border-2 border-[#03D4D9]/15 animate-pulse" 
             style={{ animationDuration: '5s' }} />
        <div className="absolute bottom-40 left-28 w-64 h-64 rounded-full border border-[#01EDDF]/20 animate-pulse" 
             style={{ animationDuration: '6s' }} />
        
        {/* Ondas en la parte inferior */}
        <div className="absolute bottom-0 left-0 w-full">
          <svg viewBox="0 0 1440 320" className="w-full h-auto opacity-5">
            <path fill="#01EDDF" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,165.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
        
        {/* Curvas superiores */}
        <div className="absolute top-0 left-0 w-full">
          <svg viewBox="0 0 1440 320" className="w-full h-auto opacity-5 transform rotate-180">
            <path fill="#03D4D9" fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1392,181.3L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
          </svg>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <img 
            src={logo} 
            alt="Cárdenas Visión" 
            className="h-32 w-auto drop-shadow-lg"
          />
        </div>

        {/* Tarjeta de Login */}
        <Card className="w-full max-w-md bg-white shadow-2xl p-8 rounded-2xl border border-gray-100 animate-slide-up">
          <div className="mb-6 text-center">
            <h2 className="text-gray-800 mb-2">Acceso de Empleados</h2>
            <p className="text-gray-500 text-sm">Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">
                Usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9]"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-gray-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Eye className="mr-2 h-5 w-5" />
              Acceder
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={handleForgotPassword}
              className="text-sm text-[#03D4D9] hover:text-[#01EDDF] transition-colors duration-200 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </Card>
      </div>

      <CitasCalendar/>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-gray-600 text-sm">
        <p>© 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría</p>
      </footer>

      {/* Estilos personalizados para animaciones */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.8s ease-out;
        }
      `}</style>
    </div>
  );
}
