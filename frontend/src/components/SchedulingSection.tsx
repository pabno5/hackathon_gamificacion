import { Button } from "./ui/button";
import { ArrowLeft, Calendar, Check, X, MessageCircle, MessageSquare, Mail } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner@2.0.3";
import logoImage from "../assets/logo.png";

interface SchedulingSectionProps {
  selectedDate: string | null;
  setSelectedDate: (date: string | null) => void;
  selectedTime: string | null;
  setSelectedTime: (time: string | null) => void;
  selectedDoctor: string | null;
  setSelectedDoctor: (doctor: string | null) => void;
  showConfirmation: boolean;
  setShowConfirmation: (show: boolean) => void;
  onBack: () => void;
  onBackToMenu: () => void;
}

export function SchedulingSection({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  selectedDoctor,
  setSelectedDoctor,
  showConfirmation,
  setShowConfirmation,
  onBack,
  onBackToMenu,
}: SchedulingSectionProps) {
  return (
    <>
      {/* Navbar - Full Width */}
      <nav className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
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
              <a href="#servicios" className="text-gray-700 hover:text-[#03D4D9] transition-colors">
                Servicios
              </a>
              <a href="#contacto" className="text-gray-700 hover:text-[#03D4D9] transition-colors">
                Contacto
              </a>
            </div>

            {/* Back Button */}
            <Button
              onClick={onBack}
              variant="outline"
              className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pt-32 pb-20 px-4"
      >
        {!showConfirmation ? (
          // Scheduling Form
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center mb-8">
              <h1 className="text-gray-800 mb-2">Agendar Cita Médica</h1>
              <p className="text-gray-600">Seleccione la fecha, hora y especialista para su cita</p>
            </div>

            {/* Available Dates */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-gray-800 mb-6 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-[#038996]" />
                Fechas Disponibles
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { date: "2025-11-05", label: "5 Nov", available: true },
                  { date: "2025-11-06", label: "6 Nov", available: false },
                  { date: "2025-11-07", label: "7 Nov", available: true },
                  { date: "2025-11-08", label: "8 Nov", available: false },
                  { date: "2025-11-11", label: "11 Nov", available: true },
                  { date: "2025-11-12", label: "12 Nov", available: true },
                  { date: "2025-11-13", label: "13 Nov", available: false },
                  { date: "2025-11-14", label: "14 Nov", available: true },
                ].map((dateItem) => (
                  <button
                    key={dateItem.date}
                    onClick={() => dateItem.available && setSelectedDate(dateItem.date)}
                    disabled={!dateItem.available}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      !dateItem.available
                        ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                        : selectedDate === dateItem.date
                        ? "bg-[#038996] border-[#038996] text-white"
                        : "bg-white border-[#01EDDF] hover:bg-[#01EDDF]/10"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {dateItem.available ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      <span>{dateItem.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Available Times */}
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
              >
                <h2 className="text-gray-800 mb-6">Horarios Disponibles</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { time: "09:00", label: "9:00 a.m.", available: true },
                    { time: "10:30", label: "10:30 a.m.", available: true },
                    { time: "11:00", label: "11:00 a.m.", available: false },
                    { time: "14:00", label: "2:00 p.m.", available: true },
                    { time: "15:30", label: "3:30 p.m.", available: false },
                    { time: "16:30", label: "4:30 p.m.", available: true },
                  ].map((timeItem) => (
                    <button
                      key={timeItem.time}
                      onClick={() => timeItem.available && setSelectedTime(timeItem.time)}
                      disabled={!timeItem.available}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        !timeItem.available
                          ? "bg-gray-100 border-gray-300 cursor-not-allowed"
                          : selectedTime === timeItem.time
                          ? "bg-[#038996] border-[#038996] text-white"
                          : "bg-white border-[#01EDDF] hover:bg-[#01EDDF]/10"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{timeItem.label}</span>
                        {!timeItem.available && (
                          <span className="text-xs text-gray-500">Ocupado</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Available Doctors */}
            {selectedDate && selectedTime && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
              >
                <h2 className="text-gray-800 mb-6">Especialistas Disponibles</h2>
                <div className="space-y-4">
                  {[
                    {
                      id: "dr-martinez",
                      name: "Dr. Andrés Martínez Cárdenas",
                      specialty: "Oftalmólogo",
                      available: true,
                    },
                    {
                      id: "dra-pardo",
                      name: "Dra. Laura Pardo",
                      specialty: "Optometrista",
                      available: true,
                    },
                    {
                      id: "dr-gomez",
                      name: "Dr. Carlos Gómez",
                      specialty: "Cirujano Oftalmólogo",
                      available: false,
                    },
                  ].map((doctor) => (
                    <button
                      key={doctor.id}
                      onClick={() => doctor.available && setSelectedDoctor(doctor.id)}
                      disabled={!doctor.available}
                      className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                        !doctor.available
                          ? "bg-gray-100 border-gray-300 cursor-not-allowed opacity-60"
                          : selectedDoctor === doctor.id
                          ? "bg-[#038996] border-[#038996] text-white"
                          : "bg-white border-[#01EDDF] hover:bg-[#01EDDF]/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="mb-1">{doctor.name}</h3>
                          <p className={`text-sm ${selectedDoctor === doctor.id ? 'text-white/80' : 'text-gray-600'}`}>
                            {doctor.specialty}
                          </p>
                        </div>
                        {doctor.available ? (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            selectedDoctor === doctor.id ? 'border-white bg-white' : 'border-[#038996]'
                          }`}>
                            {selectedDoctor === doctor.id && (
                              <Check className="w-4 h-4 text-[#038996]" />
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No disponible</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Confirm Button */}
            {selectedDate && selectedTime && selectedDoctor && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-8"
              >
                <Button
                  onClick={() => setShowConfirmation(true)}
                  data-progress-id="confirmar-agendamiento"
                  className="h-16 px-12 bg-gradient-to-r from-[#038996] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-2xl transition-all duration-300 shadow-xl hover:shadow-2xl"
                >
                  <Check className="w-6 h-6 mr-2" />
                  Confirmar Agendamiento
                </Button>
              </motion.div>
            )}
          </div>
        ) : (
          // Confirmation Card
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] p-8 text-white">
                <div className="flex items-start justify-between mb-6">
                  <img 
                    src={logoImage} 
                    alt="Cárdenas Visión" 
                    className="h-16 w-auto brightness-0 invert"
                  />
                  <div className="bg-white/20 rounded-lg px-4 py-2">
                    <Check className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="mb-2">Confirmación de Cita Médica</h2>
                <p className="text-white/90">Su cita ha sido agendada exitosamente</p>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Paciente</label>
                    <p className="text-gray-800">Laura Gómez Ramírez</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Fecha de cita</label>
                    <p className="text-gray-800">5 de noviembre de 2025</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Hora</label>
                    <p className="text-gray-800">10:30 a.m.</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 mb-1 block">Doctor</label>
                    <p className="text-gray-800">Dr. Andrés Martínez Cárdenas</p>
                    <p className="text-sm text-gray-500">Oftalmólogo</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <label className="text-sm text-gray-500 mb-1 block">Motivo</label>
                  <p className="text-gray-800">Control visual y evaluación de ojo seco</p>
                </div>

                <div className="bg-[#01EDDF]/10 rounded-xl p-4 border border-[#01EDDF]/30">
                  <p className="text-sm text-gray-700">
                    <strong>Nota:</strong> Por favor llegue 15 minutos antes de su cita con su documento de identidad.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <Button
                onClick={() => {
                  toast.success("Enviando confirmación por WhatsApp...");
                }}
                data-progress-id="enviar-whatsapp"
                className="h-16 bg-[#25D366] hover:bg-[#20BD5C] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Enviar por WhatsApp
              </Button>
              <Button
                onClick={() => {
                  toast.success("Enviando confirmación por correo electrónico...");
                }}
                data-progress-id="enviar-correo"
                className="h-16 bg-gradient-to-r from-[#038996] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Mail className="w-5 h-5 mr-2" />
                Enviar por correo
              </Button>
              <Button
                data-progress-id="enviar-sms"
                onClick={() => {
                  /* Sin funcionalidad: botón placeholder para enviar por SMS */
                }}
                className="h-16 bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <MessageSquare className="w-5 h-5 mr-2 text-gray-800" />
                Enviar por SMS
              </Button>
            </div>

            {/* Back to Menu */}
            <div className="flex justify-center mt-8">
              <Button
                onClick={onBackToMenu}
                variant="outline"
                data-progress-id="volver-menu"
                className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-xl px-8 py-4"
              >
                Volver al Menú Principal
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
