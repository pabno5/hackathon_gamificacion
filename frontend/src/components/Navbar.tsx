import { Button } from "./ui/button";
import logoImage from "../assets/logo.png";

interface NavbarProps {
  onLoginClick: () => void;
  onAgendarClick?: () => void;
}

export function Navbar({ onLoginClick, onAgendarClick }: NavbarProps) {
  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img 
              src={logoImage} 
              alt="Cárdenas Visión" 
              className="h-16 w-auto"
            />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#inicio" className="text-gray-700 hover:text-[#03D4D9] transition-colors">
              Inicio
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Button 
              className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
              onClick={onAgendarClick}
            >
              Agendar cita
            </Button>
            <Button 
              variant="outline"
              className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
              onClick={onLoginClick}
            >
              Iniciar sesión
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
