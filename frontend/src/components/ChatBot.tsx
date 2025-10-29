import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50 hover:scale-110 transform duration-200"
      >
        {isOpen ? (
          <X className="w-7 h-7" />
        ) : (
          <MessageCircle className="w-7 h-7" />
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-32 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#03D4D9] to-[#01EDDF] p-4 text-white flex items-center justify-between">
              <div>
                <h4 className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Cardenitas
                </h4>
                <p className="text-sm text-white/90">Asistente de empleados</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="p-4 h-96 overflow-y-auto bg-gray-50">
              <div className="mb-4">
                <div className="bg-white rounded-2xl rounded-tl-none p-4 shadow-sm inline-block max-w-[85%]">
                  <p className="text-sm">
                    ¡Hola! 👋 Soy Cardenitas, tu asistente personal. Estoy aquí para ayudarte con cualquier duda sobre el proceso.
                  </p>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <button 
                  onClick={() => toast.info("Las citas incluyen consultas, controles y procedimientos programados.")}
                  className="w-full text-left bg-white hover:bg-gray-100 p-3 rounded-xl shadow-sm transition-colors text-sm border border-gray-200"
                >
                  🗓️ ¿Qué son las citas?
                </button>
                <button 
                  onClick={() => toast.info("Los exámenes incluyen pruebas diagnósticas y análisis especializados.")}
                  className="w-full text-left bg-white hover:bg-gray-100 p-3 rounded-xl shadow-sm transition-colors text-sm border border-gray-200"
                >
                  🧪 ¿Qué tipo de exámenes hay?
                </button>
                <button 
                  onClick={() => toast.info("Contamos con especialidades en oftalmología, optometría, cirugía refractiva y más.")}
                  className="w-full text-left bg-white hover:bg-gray-100 p-3 rounded-xl shadow-sm transition-colors text-sm border border-gray-200"
                >
                  👁️ ¿Qué especialidades ofrecen?
                </button>
                <button 
                  onClick={() => toast.info("Los laboratorios realizan análisis clínicos y pruebas especializadas.")}
                  className="w-full text-left bg-white hover:bg-gray-100 p-3 rounded-xl shadow-sm transition-colors text-sm border border-gray-200"
                >
                  🧬 ¿Qué hacen los laboratorios?
                </button>
                <button 
                  onClick={() => toast.info("La barra de progreso te muestra el avance en el proceso de agendamiento. Avanza con cada acción correcta que realizas.")}
                  className="w-full text-left bg-white hover:bg-gray-100 p-3 rounded-xl shadow-sm transition-colors text-sm border border-gray-200"
                >
                  📊 ¿Qué es la barra de progreso?
                </button>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-[#03D4D9] text-sm"
                />
                <button className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white px-5 py-2 rounded-full transition-colors text-sm">
                  Enviar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
