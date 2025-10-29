import { MapPin, Phone, Mail, Facebook, Instagram } from "lucide-react";
import logoImage from "../assets/logo.png";

export function Footer() {
  return (
    <footer className="bg-[#03D4D9] text-white" id="contacto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Logo and Description */}
          <div>
            <img 
              src={logoImage} 
              alt="Cárdenas Visión" 
              className="h-16 w-auto mb-4 brightness-0 invert"
            />
            <p className="text-white/90 text-sm">
              Clínica especializada en oftalmología y optometría. 
              Tu salud visual es nuestra prioridad.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="mb-4 text-white">Contacto</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span className="text-white/90">
                  Calle Principal #123, Centro Médico<br />
                  Ciudad, País
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span className="text-white/90">+57 (1) 234-5678</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span className="text-white/90">info@cardenasvision.com</span>
              </div>
            </div>
          </div>

          {/* Hours and Social */}
          <div>
            <h4 className="mb-4 text-white">Horarios</h4>
            <div className="text-sm mb-6">
              <p className="text-white/90 mb-2">Lunes a Viernes: 8:00 AM - 6:00 PM</p>
              <p className="text-white/90">Sábados: 9:00 AM - 1:00 PM</p>
            </div>

            <h4 className="mb-4 text-white">Síguenos</h4>
            <div className="flex gap-4">
              <a 
                href="#" 
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm">
          <p className="text-white/80">
            © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
