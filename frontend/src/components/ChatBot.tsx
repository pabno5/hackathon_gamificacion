import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "¡Hola! 👋 Soy Cardenitas, tu asistente personal. Estoy aquí para ayudarte con cualquier duda sobre el proceso." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔸 Función para enviar mensaje al backend
  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const CHATBOT = (import.meta as any).env?.VITE_CHATBOT_URL || "http://localhost:8000";
      const res = await fetch(`${CHATBOT}/buscar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: input })
      });

      const data = await res.json();
      const botMessage = {
        from: "bot",
        text: data.respuesta || "Lo siento, no pude procesar tu consulta."
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [...prev, { from: "bot", text: "⚠️ Error al conectar con el servidor." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Chat Bubble */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full shadow-lg flex items-center justify-center transition-colors z-50 hover:scale-110 transform duration-200"
      >
        {isOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-7 h-7" />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
              className="fixed bottom-32 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col chat-window"
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
            <div className="p-4 flex-1 overflow-y-auto bg-gray-50 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                      className={`p-3 rounded-2xl max-w-[80%] text-sm shadow ${
                        msg.from === "user"
                          ? "user-bubble bg-[#03D4D9] text-white rounded-br-none"
                          : "bot-bubble bg-white text-gray-800 rounded-bl-none"
                      }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                  <div className="typing-indicator text-gray-400 text-xs italic">Cardenitas está escribiendo...</div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe tu mensaje..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-[#03D4D9] text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white px-5 py-2 rounded-full transition-colors text-sm"
                >
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
