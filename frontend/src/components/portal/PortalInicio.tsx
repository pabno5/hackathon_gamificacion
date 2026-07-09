import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "motion/react";
import { useAuth } from "../../lib/authContext";
import { registerButton, notifyClick } from "../../lib/progressTracker";
import useFeatureVisit from "../../lib/useFeatureVisit";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import citasImage from "../../assets/citas.jpg";
import examenesImage from "../../assets/examenes.jpg";
import especialistasImage from "../../assets/especialista.jpg";

/**
 * Panel de inicio del portal — extraído de la vista "options" del monolito
 * (Inc 2 FT-04). Cards conservadas tal cual; el navbar fijo por-vista murió
 * (el shell lo da PortalLayout).
 *
 * data-feature-id ancla el paso "Dashboard principal" del tour por rol
 * (R-01 / M-01 / A-01).
 */
const INICIO_FEATURE: Record<string, string> = {
  recepcionista: "R-01",
  medico: "M-01",
  admin: "A-01",
};

export default function PortalInicio() {
  const navigate = useNavigate();
  const { rol } = useAuth();

  // Visitar el panel de inicio = feature R-01/M-01/A-01
  useFeatureVisit(rol ? INICIO_FEATURE[rol] : null);

  // Card "Citas" navega a /portal/citas (recepción+admin); médico no pasa
  // ese guard, así que no se le muestra.
  const muestraCitas = rol === "recepcionista" || rol === "admin";

  // Registrar las opciones para el tracker (comportamiento del monolito)
  useEffect(() => {
    ["Citas", "Exámenes", "Especialidades", "Laboratorios"].forEach((opt) => {
      try { registerButton(`option-${opt.toLowerCase()}`); } catch { /* noop */ }
    });
  }, []);

  const handleOptionClick = (option: string) => {
    const id = `option-${option.toLowerCase()}`;
    try { notifyClick(id); } catch { /* noop */ }

    if (option === "Citas") {
      navigate("/portal/citas");
    } else {
      // Exámenes/Laboratorios/Especialidades: fuera de alcance v1 (PRD §9).
      toast.info(`${option}: módulo próximamente disponible`);
    }
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="w-full max-w-5xl mx-auto"
      data-feature-id={rol ? INICIO_FEATURE[rol] : undefined}
    >
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-gray-800 mb-3">Selecciona una opción</h1>
        <p className="text-gray-600">¿Qué información deseas consultar?</p>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
        {/* Citas — solo roles que pasan el guard de /portal/citas */}
        {muestraCitas && (
          <motion.button
            onClick={() => handleOptionClick("Citas")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-64"
          >
            <img
              src={citasImage}
              alt="Citas"
              className="w-full h-full object-cover"
            />
          </motion.button>
        )}

        {/* Exámenes */}
        <motion.button
          onClick={() => handleOptionClick("Exámenes")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-64"
        >
          <img
            src={examenesImage}
            alt="Exámenes"
            className="w-full h-full object-cover"
          />
        </motion.button>

        {/* Especialistas */}
        <motion.button
          onClick={() => handleOptionClick("Especialidades")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-64"
        >
          <img
            src={especialistasImage}
            alt="Especialistas"
            className="w-full h-full object-cover"
          />
        </motion.button>

        {/* Laboratorios */}
        <motion.button
          onClick={() => handleOptionClick("Laboratorios")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[20px] shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-64"
        >
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1576669801838-1b1c52121e6a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwbGFib3JhdG9yeSUyMGVxdWlwbWVudHxlbnwxfHx8fDE3NjE3MDkwNDR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Laboratorios"
            className="w-full h-full object-cover"
          />
        </motion.button>
      </div>
    </motion.div>
  );
}
