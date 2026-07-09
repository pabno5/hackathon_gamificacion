import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { FileText } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { GeneratedHistoriaClinica } from "../GeneratedHistoriaClinica";
import { SchedulingSection } from "../SchedulingSection";
import { useAuth } from "../../lib/authContext";
import { notifyClick } from "../../lib/progressTracker";
import useFeatureVisit from "../../lib/useFeatureVisit";
import { personasAPI, historiasClinicasAPI, citasAPI } from "../../service/api";

/**
 * Flujo de historia clínica — extraído de las vistas historiaClinica /
 * generarHistoria / schedulingAppointment del monolito (Inc 2 FT-04).
 * Markup del formulario conservado tal cual; navbars fijos eliminados
 * (shell = PortalLayout).
 *
 * Entrada vía location.state:
 *   { paso: "formulario", prefill: {...} }       ← viene de CitasFlow (paciente nuevo)
 *   { paso: "paciente", documento: "123..." }    ← viene de búsqueda por cédula
 * Sin state: arranca en "paciente" (buscar paciente → ficha con historias
 * reales + export PDF (M-07) + historial de citas (M-06)).
 *
 * Los pasos "generar"/"agendar" (demo con datos ficticios) se conservan,
 * accesibles desde la ficha con "Vista de demostración".
 */
type Paso = "paciente" | "formulario" | "generar" | "agendar";

type Prefill = {
  nombreCompleto?: string;
  documentoIdentidad?: string;
  telefono?: string;
  fechaNacimiento?: string;
  direccion?: string;
};

export default function HistoriasFlow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const entrada = (location.state ?? {}) as { paso?: Paso; prefill?: Prefill; documento?: string };
  const prefill = entrada.prefill ?? {};

  // Acceder a historia clínica = M-03 (backend ignora el código para admin)
  useFeatureVisit("M-03");

  const [paso, setPaso] = useState<Paso>(
    entrada.paso === "formulario" ? "formulario" : entrada.paso === "generar" ? "generar" : "paciente"
  );
  const [showGeneratedHistoria, setShowGeneratedHistoria] = useState(false);

  // Ficha del paciente (paso "paciente")
  const [docBusqueda, setDocBusqueda] = useState(entrada.documento ?? "");
  const [paciente, setPaciente] = useState<any>(null);
  const [historias, setHistorias] = useState<any[]>([]);
  const [citasPaciente, setCitasPaciente] = useState<any[]>([]);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Completando historia clínica");

  // Scheduling appointment states (del monolito)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [historiaClinicaData, setHistoriaClinicaData] = useState({
    // 1. Datos de identificación
    nombreCompleto: prefill.nombreCompleto ?? "",
    edad: "",
    fechaNacimiento: prefill.fechaNacimiento ?? "",
    sexo: "",
    documentoIdentidad: prefill.documentoIdentidad ?? "",
    direccion: prefill.direccion ?? "",
    telefono: prefill.telefono ?? "",
    ocupacion: "",
    fechaElaboracion: new Date().toISOString().split('T')[0],
    // 2. Motivo de consulta
    motivoConsulta: "",
    // 3. Enfermedad actual
    enfermedadActual: "",
    // 4. Antecedentes personales
    antecedentesPatologicos: "",
    antecedentesQuirurgicos: "",
    alergias: "",
    antecedentesTraumaticos: "",
    antecedentesFarmacologicos: "",
    antecedentesGinecoObstetricos: "",
    habitos: "",
    // 5. Antecedentes familiares
    antecedentesFamiliares: "",
    // 6. Revisión por sistemas
    revisionGeneral: "",
    revisionCardiovascular: "",
    revisionRespiratorio: "",
    revisionDigestivo: "",
    revisionUrinario: "",
    revisionNervioso: "",
    revisionMusculoEsqueletico: "",
    revisionSensorial: "",
    // 7. Examen físico
    tensionArterial: "",
    frecuenciaCardiaca: "",
    frecuenciaRespiratoria: "",
    temperatura: "",
    peso: "",
    talla: "",
    exploracionSistemas: "",
    agudezaVisual: "",
    fondoOjo: "",
    reflejosPupilares: "",
    // 8. Diagnóstico
    diagnosticoPrincipal: "",
    diagnosticoSecundario: "",
    // 9. Plan de manejo
    medicamentosRecetados: "",
    indicacionesPaciente: "",
    recomendaciones: "",
    interconsultasExamenes: "",
    // 10. Evolución y seguimiento
    evolucionSeguimiento: "",
    // 11. Firma y datos del profesional
    nombreMedico: "",
    especialidadMedico: "",
    registroProfesional: "",
    fechaFirma: new Date().toISOString().split('T')[0]
  });

  /** Busca paciente por documento y carga historias + citas reales. */
  const buscarPaciente = async (documento: string) => {
    const doc = documento.trim();
    if (!doc) {
      toast.error("Ingresa un número de documento");
      return;
    }
    setCargandoFicha(true);
    try {
      const res = await personasAPI.getByDocumento(doc);
      const p = res.data?.data;
      if (!p) {
        toast.error("No se encontró ningún paciente con ese documento");
        return;
      }
      setPaciente(p);

      const [histRes, citasRes] = await Promise.all([
        historiasClinicasAPI.getByPaciente(p.id_persona).catch(() => null),
        citasAPI.getByPaciente(p.id_persona).catch(() => null),
      ]);
      setHistorias(histRes?.data?.data ?? []);
      setCitasPaciente(citasRes?.data?.data ?? []);

      // Ver historial de citas del paciente = M-06 (la ficha lo muestra)
      try { notifyClick("M-06"); } catch { /* noop */ }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error("No se encontró ningún paciente con ese documento");
      } else {
        toast.error("Error al buscar el paciente. Intenta de nuevo.");
      }
    } finally {
      setCargandoFicha(false);
    }
  };

  // Entrada directa desde CitasFlow con documento: buscar de una
  const autoBuscado = useRef(false);
  useEffect(() => {
    if (entrada.documento && !autoBuscado.current) {
      autoBuscado.current = true;
      buscarPaciente(entrada.documento);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Exporta una historia a PDF (HC-06 / M-07). */
  const exportarPdf = async (idHistoria: string) => {
    try {
      toast.loading("Generando PDF...");
      const res = await historiasClinicasAPI.exportPdf(idHistoria);
      toast.dismiss();
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `historia_${idHistoria}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      try { notifyClick("M-07"); } catch { /* noop */ }
    } catch {
      toast.dismiss();
      toast.error("No se pudo generar el PDF");
    }
  };

  /** Abre el formulario de nueva historia con los datos del paciente. */
  const nuevaHistoriaDePaciente = () => {
    if (!paciente) return;
    setHistoriaClinicaData((prev) => ({
      ...prev,
      nombreCompleto: `${paciente.nombres} ${paciente.apellidos}`,
      documentoIdentidad: paciente.numero_documento,
      telefono: paciente.telefono ?? "",
      fechaNacimiento: paciente.fecha_nacimiento?.slice(0, 10) ?? "",
      direccion: paciente.direccion ?? "",
    }));
    setPaso("formulario");
  };

  const formatFechaCita = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  const handleGenerarHistoria = () => {
    setShowGeneratedHistoria(true);
    toast.success("Historia clínica generada exitosamente");
  };

  const handleHistoriaClinicaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      toast.loading("Guardando historia clínica...");

      // Paso 1: Buscar o crear el paciente con los datos básicos
      let pacienteId;

      try {
        const pacienteResponse = await personasAPI.getByDocumento(historiaClinicaData.documentoIdentidad);
        if (pacienteResponse.data.success && pacienteResponse.data.data) {
          pacienteId = pacienteResponse.data.data.id_persona;
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          const nuevoPaciente = await personasAPI.create({
            tipo_documento: "CC",
            numero_documento: historiaClinicaData.documentoIdentidad,
            nombres: historiaClinicaData.nombreCompleto.split(' ')[0] || "",
            apellidos: historiaClinicaData.nombreCompleto.split(' ').slice(1).join(' ') || "",
            fecha_nacimiento: historiaClinicaData.fechaNacimiento,
            telefono: historiaClinicaData.telefono,
            direccion: historiaClinicaData.direccion,
            correo: (user?.correo as string) || undefined,
          });
          if (nuevoPaciente.data.success && nuevoPaciente.data.data) {
            pacienteId = nuevoPaciente.data.data.id_persona;
          }
        }
      }

      if (!pacienteId) {
        toast.dismiss();
        toast.error("No se pudo crear o encontrar el paciente");
        return;
      }

      // Paso 2: Crear la historia clínica (campos específicos, todos opcionales)
      const historiaClinicaPayload = {
        id_paciente: pacienteId,
        motivo_consulta: historiaClinicaData.motivoConsulta,
        enfermedad_actual: historiaClinicaData.enfermedadActual,
        antecedentes_patologicos: historiaClinicaData.antecedentesPatologicos,
        antecedentes_quirurgicos: historiaClinicaData.antecedentesQuirurgicos,
        alergias: historiaClinicaData.alergias,
        antecedentes_traumaticos: historiaClinicaData.antecedentesTraumaticos,
        antecedentes_farmacologicos: historiaClinicaData.antecedentesFarmacologicos,
        antecedentes_gineco_obstetricos: historiaClinicaData.antecedentesGinecoObstetricos,
        habitos: historiaClinicaData.habitos,
        antecedentes_familiares: historiaClinicaData.antecedentesFamiliares,
        revision_general: historiaClinicaData.revisionGeneral,
        revision_cardiovascular: historiaClinicaData.revisionCardiovascular,
        revision_respiratorio: historiaClinicaData.revisionRespiratorio,
        revision_digestivo: historiaClinicaData.revisionDigestivo,
        revision_urinario: historiaClinicaData.revisionUrinario,
        revision_nervioso: historiaClinicaData.revisionNervioso,
        revision_musculo_esqueletico: historiaClinicaData.revisionMusculoEsqueletico,
        revision_sensorial: historiaClinicaData.revisionSensorial,
        tension_arterial: historiaClinicaData.tensionArterial,
        frecuencia_cardiaca: historiaClinicaData.frecuenciaCardiaca,
        frecuencia_respiratoria: historiaClinicaData.frecuenciaRespiratoria,
        temperatura: historiaClinicaData.temperatura,
        peso: historiaClinicaData.peso,
        talla: historiaClinicaData.talla,
        exploracion_sistemas: historiaClinicaData.exploracionSistemas,
        agudeza_visual: historiaClinicaData.agudezaVisual,
        fondo_ojo: historiaClinicaData.fondoOjo,
        reflejos_pupilares: historiaClinicaData.reflejosPupilares,
        diagnostico_principal: historiaClinicaData.diagnosticoPrincipal,
        diagnostico_secundario: historiaClinicaData.diagnosticoSecundario,
        medicamentos_recetados: historiaClinicaData.medicamentosRecetados,
        indicaciones_paciente: historiaClinicaData.indicacionesPaciente,
        recomendaciones: historiaClinicaData.recomendaciones,
        interconsultas_examenes: historiaClinicaData.interconsultasExamenes,
        evolucion_seguimiento: historiaClinicaData.evolucionSeguimiento
      };

      const response = await historiasClinicasAPI.create(historiaClinicaPayload);

      toast.dismiss();

      if (response.data.success) {
        toast.success("Historia clínica guardada correctamente en el sistema.");

        // Gamificación: crear historia clínica (M-04); con diagnóstico → M-05
        try {
          notifyClick("M-04");
          if (historiaClinicaData.diagnosticoPrincipal.trim()) {
            notifyClick("M-05");
          }
        } catch { /* noop */ }

        setProgress(100);
        setProgressMessage("¡Historia clínica guardada exitosamente!");
        setTimeout(() => navigate("/portal/inicio"), 2000);
      } else {
        toast.error("Error al guardar la historia clínica");
      }
    } catch (error: any) {
      toast.dismiss();
      console.error("Error al guardar historia clínica:", error);
      toast.error(error.response?.data?.message || "Error al guardar la historia clínica. Por favor intenta de nuevo.");
    }
  };

  if (paso === "agendar") {
    return (
      <SchedulingSection
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        selectedTime={selectedTime}
        setSelectedTime={setSelectedTime}
        selectedDoctor={selectedDoctor}
        setSelectedDoctor={setSelectedDoctor}
        showConfirmation={showConfirmation}
        setShowConfirmation={setShowConfirmation}
        onBack={() => setPaso("generar")}
        onBackToMenu={() => {
          setShowConfirmation(false);
          setSelectedDate(null);
          setSelectedTime(null);
          setSelectedDoctor(null);
          navigate("/portal/inicio");
        }}
      />
    );
  }

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {paso === "paciente" && !paciente && (
          <motion.div
            key="buscarPaciente"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-md mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-10" data-feature-id="M-06">
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#038996] to-[#03D4D9] rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-10 h-10 text-white" />
                </div>
              </div>

              <div className="text-center mb-10">
                <h1 className="text-gray-800 mb-3">Historia Clínica</h1>
                <p className="text-gray-600">Busca al paciente por su número de documento</p>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); buscarPaciente(docBusqueda); }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="docPaciente" className="text-gray-700">Número de documento*</Label>
                  <Input
                    id="docPaciente"
                    type="text"
                    placeholder="Ingresa el documento del paciente"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={docBusqueda}
                    onChange={(e) => setDocBusqueda(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  disabled={cargandoFicha}
                  className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-60"
                >
                  {cargandoFicha ? "Buscando..." : "Buscar paciente"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-xl transition-colors"
                  onClick={() => setPaso("formulario")}
                >
                  Nueva historia sin buscar
                </Button>
              </form>
            </div>
          </motion.div>
        )}

        {paso === "paciente" && paciente && (
          <motion.div
            key="fichaPaciente"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-5xl mx-auto pb-16 space-y-8"
          >
            {/* Ficha del paciente */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-gray-800 mb-1">{paciente.nombres} {paciente.apellidos}</h1>
                  <p className="text-gray-600 text-sm">
                    {paciente.tipo_documento} {paciente.numero_documento}
                    {paciente.telefono ? ` · Tel: ${paciente.telefono}` : ""}
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={nuevaHistoriaDePaciente}
                    className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-full px-6"
                  >
                    Nueva historia clínica
                  </Button>
                  <Button
                    variant="outline"
                    className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-full px-6"
                    onClick={() => { setPaciente(null); setDocBusqueda(""); }}
                  >
                    Buscar otro paciente
                  </Button>
                </div>
              </div>
            </div>

            {/* Historias clínicas (HC-03) + export PDF (M-07) */}
            <div className="bg-white rounded-3xl shadow-xl p-8" data-feature-id="M-07">
              <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg mb-4">
                <h2 className="text-xl">Historias clínicas ({historias.length})</h2>
              </div>
              {historias.length === 0 ? (
                <p className="text-gray-500 py-4 text-center">Este paciente aún no tiene historias clínicas registradas.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {historias.map((h) => (
                    <div key={h.id_historia} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-gray-800">
                          {h.motivo_consulta || "Sin motivo registrado"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {h.created_at ? formatFechaCita(h.created_at) : "—"}
                          {h.diagnostico_principal ? ` · Dx: ${h.diagnostico_principal}` : ""}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-5 shrink-0"
                        onClick={() => exportarPdf(h.id_historia)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Exportar PDF
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historial de citas (M-06) */}
            <div className="bg-white rounded-3xl shadow-xl p-8">
              <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg mb-4">
                <h2 className="text-xl">Historial de citas ({citasPaciente.length})</h2>
              </div>
              {citasPaciente.length === 0 ? (
                <p className="text-gray-500 py-4 text-center">Este paciente no tiene citas registradas.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                        <th className="py-3 px-4">Fecha</th>
                        <th className="py-3 px-4">Motivo</th>
                        <th className="py-3 px-4">Médico</th>
                        <th className="py-3 px-4">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {citasPaciente.map((c) => (
                        <tr key={c.id_cita} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-gray-700">{formatFechaCita(c.fecha_cita)}</td>
                          <td className="py-3 px-4 text-gray-700">{c.motivo || "—"}</td>
                          <td className="py-3 px-4 text-gray-700">
                            {c.medico ? `${c.medico.nombres} ${c.medico.apellidos}` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                              {c.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Acceso a la vista demo original */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setPaso("generar")}
                className="text-sm text-gray-400 hover:text-[#03D4D9] transition-colors"
              >
                Vista de demostración
              </button>
            </div>
          </motion.div>
        )}

        {paso === "generar" && (
          <motion.div
            key="generarHistoria"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-7xl mx-auto pb-16 px-4"
          >
            {!showGeneratedHistoria ? (
              // Initial screen with button
              <div className="text-center space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#03D4D9] to-[#01EDDF] rounded-full flex items-center justify-center shadow-2xl">
                      <FileText className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <h1 className="text-gray-800">Sistema de Historia Clínica</h1>
                  <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Vea la historia clínica completa del paciente con un solo clic.
                    El sistema mostrará automáticamente todos los campos necesarios.
                  </p>
                </div>

                <div className="flex justify-center pt-8">
                  <Button
                    onClick={handleGenerarHistoria}
                    className="h-20 px-16 bg-gradient-to-r from-[#038996] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-2xl transition-all duration-300 shadow-2xl hover:shadow-3xl text-xl"
                  >
                    <FileText className="w-6 h-6 mr-3" />
                    Ver Historia Clínica
                  </Button>
                </div>

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-full px-6"
                    onClick={() => setPaso("paciente")}
                  >
                    Volver
                  </Button>
                </div>
              </div>
            ) : (
              // Generated Historia Clínica
              <div className="space-y-8">
                <GeneratedHistoriaClinica />

                <div className="flex justify-center gap-4 pt-6">
                  <Button
                    onClick={() => setShowGeneratedHistoria(false)}
                    variant="outline"
                    className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-xl px-8 py-6"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={() => {
                      setPaso("agendar");
                      setShowGeneratedHistoria(false);
                    }}
                    className="bg-gradient-to-r from-[#03D4D9] to-[#01EDDF] hover:from-[#038996] hover:to-[#03D4D9] text-white rounded-xl px-8 py-6"
                  >
                    Completar Agendamiento
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {paso === "formulario" && (
          <motion.div
            key="historiaClinica"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-6xl mx-auto pb-16"
          >
            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-gray-800 mb-3">Historia Clínica del Paciente</h1>
              <p className="text-gray-600">Completa todos los campos requeridos</p>
            </div>

            {/* Form */}
            <form onSubmit={handleHistoriaClinicaSubmit} className="bg-white rounded-3xl shadow-xl p-10 space-y-8" data-feature-id="M-04">

              {/* 1. Datos de Identificación */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">1. Datos de Identificación</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Nombre completo</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.nombreCompleto}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, nombreCompleto: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            required
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Edad</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.edad}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, edad: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="Años"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Fecha de nacimiento</td>
                        <td className="py-3 px-4">
                          <Input
                            type="date"
                            value={historiaClinicaData.fechaNacimiento}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, fechaNacimiento: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Sexo</td>
                        <td className="py-3 px-4">
                          <Select
                            value={historiaClinicaData.sexo}
                            onValueChange={(value) => setHistoriaClinicaData({...historiaClinicaData, sexo: value})}
                          >
                            <SelectTrigger className="border-gray-200 focus:border-[#03D4D9]">
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="masculino">Masculino</SelectItem>
                              <SelectItem value="femenino">Femenino</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Documento de identidad</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.documentoIdentidad}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, documentoIdentidad: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            required
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Dirección</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.direccion}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, direccion: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Teléfono de contacto</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.telefono}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, telefono: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Ocupación</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.ocupacion}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, ocupacion: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Fecha de elaboración</td>
                        <td className="py-3 px-4">
                          <Input
                            type="date"
                            value={historiaClinicaData.fechaElaboracion}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, fechaElaboracion: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Motivo de Consulta */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">2. Motivo de Consulta</h2>
                </div>
                <Textarea
                  value={historiaClinicaData.motivoConsulta}
                  onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, motivoConsulta: e.target.value})}
                  className="min-h-[100px] border-gray-200 focus:border-[#03D4D9]"
                  placeholder="Describa el motivo de la consulta..."
                />
              </div>

              {/* 3. Enfermedad Actual */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">3. Enfermedad Actual</h2>
                </div>
                <Textarea
                  value={historiaClinicaData.enfermedadActual}
                  onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, enfermedadActual: e.target.value})}
                  className="min-h-[120px] border-gray-200 focus:border-[#03D4D9]"
                  placeholder="Describa el inicio, evolución y síntomas..."
                />
              </div>

              {/* 4. Antecedentes Personales */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">4. Antecedentes Personales</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Patológicos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.antecedentesPatologicos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesPatologicos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Quirúrgicos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.antecedentesQuirurgicos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesQuirurgicos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Alergias</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.alergias}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, alergias: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Traumáticos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.antecedentesTraumaticos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesTraumaticos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Farmacológicos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.antecedentesFarmacologicos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesFarmacologicos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Gineco-obstétricos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.antecedentesGinecoObstetricos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesGinecoObstetricos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Hábitos</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.habitos}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, habitos: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. Antecedentes Familiares */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">5. Antecedentes Familiares</h2>
                </div>
                <Textarea
                  value={historiaClinicaData.antecedentesFamiliares}
                  onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, antecedentesFamiliares: e.target.value})}
                  className="min-h-[100px] border-gray-200 focus:border-[#03D4D9]"
                  placeholder="Describa enfermedades hereditarias o familiares..."
                />
              </div>

              {/* 6. Revisión por Sistemas */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">6. Revisión por Sistemas</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">General</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionGeneral}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionGeneral: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Cardiovascular</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionCardiovascular}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionCardiovascular: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Respiratorio</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionRespiratorio}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionRespiratorio: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Digestivo</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionDigestivo}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionDigestivo: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Urinario</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionUrinario}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionUrinario: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Nervioso</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionNervioso}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionNervioso: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Músculo-esquelético</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionMusculoEsqueletico}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionMusculoEsqueletico: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Sensorial</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.revisionSensorial}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, revisionSensorial: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. Examen Físico */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">7. Examen Físico</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Tensión arterial (TA)</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.tensionArterial}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, tensionArterial: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="mmHg"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Frecuencia cardíaca (FC)</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.frecuenciaCardiaca}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, frecuenciaCardiaca: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="lpm"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Frecuencia respiratoria (FR)</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.frecuenciaRespiratoria}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, frecuenciaRespiratoria: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="rpm"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Temperatura</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.temperatura}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, temperatura: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="°C"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Peso</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.peso}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, peso: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="kg"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Talla</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.talla}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, talla: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            placeholder="cm"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Exploración por sistemas</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.exploracionSistemas}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, exploracionSistemas: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Agudeza visual</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.agudezaVisual}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, agudezaVisual: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Fondo de ojo</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.fondoOjo}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, fondoOjo: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Reflejos pupilares</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.reflejosPupilares}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, reflejosPupilares: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 8. Diagnóstico */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">8. Diagnóstico</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Diagnóstico principal</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.diagnosticoPrincipal}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, diagnosticoPrincipal: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Diagnóstico secundario</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.diagnosticoSecundario}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, diagnosticoSecundario: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 9. Plan de Manejo o Tratamiento */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">9. Plan de Manejo o Tratamiento</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Medicamentos recetados</td>
                        <td className="py-3 px-4">
                          <Textarea
                            value={historiaClinicaData.medicamentosRecetados}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, medicamentosRecetados: e.target.value})}
                            className="min-h-[80px] border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Indicaciones al paciente</td>
                        <td className="py-3 px-4">
                          <Textarea
                            value={historiaClinicaData.indicacionesPaciente}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, indicacionesPaciente: e.target.value})}
                            className="min-h-[80px] border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Recomendaciones</td>
                        <td className="py-3 px-4">
                          <Textarea
                            value={historiaClinicaData.recomendaciones}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, recomendaciones: e.target.value})}
                            className="min-h-[80px] border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Interconsultas / Exámenes</td>
                        <td className="py-3 px-4">
                          <Textarea
                            value={historiaClinicaData.interconsultasExamenes}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, interconsultasExamenes: e.target.value})}
                            className="min-h-[80px] border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 10. Evolución y Seguimiento */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">10. Evolución y Seguimiento</h2>
                </div>
                <Textarea
                  value={historiaClinicaData.evolucionSeguimiento}
                  onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, evolucionSeguimiento: e.target.value})}
                  className="min-h-[120px] border-gray-200 focus:border-[#03D4D9]"
                  placeholder="Anotar controles y evolución del paciente..."
                />
              </div>

              {/* 11. Firma y Datos del Profesional */}
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
                  <h2 className="text-xl">11. Firma y Datos del Profesional</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50 w-1/3">Nombre del médico</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.nombreMedico}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, nombreMedico: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            required
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Especialidad</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.especialidadMedico}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, especialidadMedico: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            required
                          />
                        </td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-3 px-4 bg-gray-50">Número de registro profesional</td>
                        <td className="py-3 px-4">
                          <Input
                            value={historiaClinicaData.registroProfesional}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, registroProfesional: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                            required
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4 bg-gray-50">Fecha</td>
                        <td className="py-3 px-4">
                          <Input
                            type="date"
                            value={historiaClinicaData.fechaFirma}
                            onChange={(e) => setHistoriaClinicaData({...historiaClinicaData, fechaFirma: e.target.value})}
                            className="border-gray-200 focus:border-[#03D4D9]"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  className="w-full h-16 bg-gradient-to-r from-[#03D4D9] to-[#01EDDF] hover:from-[#038996] hover:to-[#03D4D9] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl text-lg"
                >
                  Guardar historia clínica
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de progreso del proceso (extraída del monolito) */}
      {progress > 0 && progress < 100 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-20"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-800">{progress}%</span>
                <span className="text-gray-600">{progressMessage}</span>
              </div>
            </div>
            <Progress
              value={progress}
              className="h-3 bg-gray-100"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
