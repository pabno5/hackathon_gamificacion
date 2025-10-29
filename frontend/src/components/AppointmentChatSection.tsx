import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import cardenitasIcon from "figma:asset/0f81a79a7598f5738326e881447109f058b5b8ff.png";

interface Message {
  id: number;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
  fuente?: string; // 📄 Manual | 💡 Recomendación general
}

const quickOptions = [
  "Agendar consulta oftalmológica",
  "Agendar examen de optometría",
  "Cirugía de cataratas",
  "Consultar horarios disponibles"
];

export function AppointmentChatSection() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "¡Hola! Soy Cardenitas 👋 Tu asistente virtual de Cárdenas Visión. ¿En qué puedo ayudarte hoy?",
      sender: "bot",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  // 🚀 Enviar mensaje al backend FastAPI
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text,
      sender: "user",
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      // Llamada al backend (ajusta la URL si lo despliegas)
      const res = await fetch("http://localhost:8000/buscar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text })
      });

      const data = await res.json();

      const fuenteEtiqueta =
        data.fuente === "pdf"
          ? "📄 Basado en el manual"
          : data.fuente === "conocimiento_general"
          ? "💡 Recomendación general"
          : "⚙️ Respuesta automática";

      const botMessage: Message = {
        id: messages.length + 2,
        text: data.respuesta || "Lo siento, no pude procesar tu consulta.",
        sender: "bot",
        timestamp: new Date(),
        fuente: fuenteEtiqueta
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error al conectar con el backend:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: messages.length + 2,
          text: "⚠️ No se pudo conectar con el servidor. Verifica que el backend esté activo.",
          sender: "bot",
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickOption = (option: string) => {
    handleSendMessage(option);
  };

  return (
    <section className="py-20 bg-white" id="agendar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[#03D4D9] mb-4">Agendar Cita</h2>
          <div className="w-20 h-1 bg-[#01EDDF] mx-auto mb-4"></div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Chatea con Cardenitas, nuestro asistente virtual, para agendar tu cita de forma rápida y sencilla
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-gray-50 to-[#01EDDF]/5 rounded-3xl shadow-xl overflow-hidden border border-gray-200">
            
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-full p-2 flex items-center justify-center shadow-lg">
                  <img 
                    src={cardenitasIcon} 
                    alt="Cardenitas" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-white">
                  <h3 className="text-white">Cardenitas</h3>
                  <p className="text-white/90 text-sm">Asistente Virtual • En línea</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="p-6 min-h-[400px] max-h-[500px] overflow-y-auto space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="flex items-start gap-3 max-w-[80%]">
                    {message.sender === "bot" && (
                      <div className="w-10 h-10 bg-gradient-to-br from-[#01EDDF] to-[#03D4D9] rounded-full p-1.5 flex-shrink-0">
                        <img 
                          src={cardenitasIcon} 
                          alt="Cardenitas" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.sender === "user"
                          ? "bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white"
                          : "bg-white border border-gray-200 text-gray-800"
                      }`}
                    >
                      <p>{message.text}</p>

                      {/* 🏷️ Fuente de información */}
                      {message.sender === "bot" && message.fuente && (
                        <p className="text-xs mt-1 text-gray-500">{message.fuente}</p>
                      )}

                      <p
                        className={`text-xs mt-1 ${
                          message.sender === "user"
                            ? "text-white/80"
                            : "text-gray-400"
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Estado de escritura */}
              {loading && (
                <div className="text-gray-400 text-sm italic">
                  Cardenitas está escribiendo...
                </div>
              )}
            </div>

            {/* Quick Options */}
            <div className="px-6 pb-4">
              <p className="text-sm text-gray-600 mb-3">Opciones rápidas:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickOption(option)}
                    className="text-sm text-left px-4 py-2 bg-white border border-[#03D4D9]/30 rounded-full hover:bg-[#01EDDF]/10 hover:border-[#03D4D9] transition-all text-gray-700"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-6 pt-0">
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleSendMessage(inputValue);
                  }}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 rounded-full border-gray-300 focus:border-[#03D4D9] focus:ring-[#03D4D9]"
                />
                <Button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={loading}
                  className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:opacity-90 text-white rounded-full px-6"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
