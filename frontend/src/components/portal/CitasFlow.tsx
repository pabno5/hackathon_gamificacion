import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "../../lib/authContext";
import { notifyClick } from "../../lib/progressTracker";
import { personasAPI } from "../../service/api";

/**
 * Flujo de agendamiento — extraído de las vistas userTypeSelection /
 * existingUserForm / citas del monolito (Inc 2 FT-04). Markup conservado;
 * navbars fijos por-vista eliminados (shell = PortalLayout).
 *
 * Pasos: tipo → (cedula | formulario).
 * - Formulario OK: médico/admin siguen a /portal/historias con prefill
 *   (comportamiento del monolito); recepcionista termina aquí (HC-01 es de
 *   médicos — el backend igual lo rechazaría).
 * - Cédula encontrada: médico/admin van a ver la historia; recepcionista
 *   recibe confirmación del paciente.
 *
 * La barra inferior es el progreso DEL PROCESO (updateProgress local); la
 * gamificación vive en el header del PortalLayout. En el monolito ambos
 * compartían estado y se pisaban.
 */
type Paso = "tipo" | "cedula" | "formulario";

export default function CitasFlow() {
  const navigate = useNavigate();
  const { rol } = useAuth();
  const puedeHistoria = rol === "medico" || rol === "admin";

  const [paso, setPaso] = useState<Paso>("tipo");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Iniciando proceso de agendamiento");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress] = useState(0);
  const [existingUserCedula, setExistingUserCedula] = useState("");

  const [citasFormData, setCitasFormData] = useState({
    tipo_documento: "",
    numero_documento: "",
    nombres: "",
    apellidos: "",
    fecha_nacimiento: "",
    telefono: "",
    direccion: "",
    correoPaciente: "",
    sede: "",
    eps: "",
    especialidad: "",
    acompanante: "",
  });

  const [formSectionsCompleted, setFormSectionsCompleted] = useState({
    basicInfo: false,
    contactInfo: false,
    serviceInfo: false,
  });

  const updateProgress = (increment: number, message: string) => {
    setProgress((prev) => Math.min(prev + increment, 100));
    setProgressMessage(message);
  };

  const handleUserTypeSelection = (type: "new" | "existing") => {
    if (type === "existing") {
      updateProgress(10, "Usuario antiguo seleccionado");
      setPaso("cedula");
    } else {
      updateProgress(10, "Nuevo usuario seleccionado");
      setPaso("formulario");
      toast.info("Por favor completa el formulario de citas");
    }
  };

  const handleExistingUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!existingUserCedula.trim()) {
      toast.error("Por favor ingresa un número de cédula válido");
      return;
    }

    try {
      toast.loading("Buscando usuario...");
      const response = await personasAPI.getByDocumento(existingUserCedula.trim());
      toast.dismiss();

      if (response.data.success && response.data.data) {
        const usuario = response.data.data;
        toast.success(`¡Usuario encontrado! Bienvenido ${usuario.nombres} ${usuario.apellidos}`);
        updateProgress(10, "Datos del usuario recuperados");

        // Gamificación: buscar paciente por documento (R-02)
        try { notifyClick("R-02"); } catch { /* noop */ }

        if (puedeHistoria) {
          navigate("/portal/historias", { state: { paso: "generar" } });
        } else {
          toast.info("Paciente verificado en el sistema.");
          setPaso("tipo");
        }
      } else {
        toast.error("No se encontró ningún usuario con ese número de cédula");
      }
    } catch (error: any) {
      toast.dismiss();
      console.error("Error al buscar usuario:", error);
      if (error.response?.status === 404) {
        toast.error("No se encontró ningún usuario con ese número de cédula. Por favor verifica el número o regístrate como nuevo usuario.");
      } else {
        toast.error("Error al buscar el usuario. Por favor intenta de nuevo.");
      }
    }
  };

  const handleCitasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      toast.loading("Guardando datos del paciente...");

      // Paso 1: Buscar o crear el paciente
      let pacienteId;

      try {
        const pacienteResponse = await personasAPI.getByDocumento(citasFormData.numero_documento);
        if (pacienteResponse.data.success && pacienteResponse.data.data) {
          pacienteId = pacienteResponse.data.data.id_persona;
          toast.info("Paciente encontrado en el sistema");
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          toast.loading("Creando nuevo paciente...");
          const nuevoPaciente = await personasAPI.create({
            tipo_documento: citasFormData.tipo_documento,
            numero_documento: citasFormData.numero_documento,
            nombres: citasFormData.nombres,
            apellidos: citasFormData.apellidos,
            fecha_nacimiento: citasFormData.fecha_nacimiento,
            telefono: citasFormData.telefono,
            direccion: citasFormData.direccion,
            correo: citasFormData.correoPaciente,
          });
          if (nuevoPaciente.data.success && nuevoPaciente.data.data) {
            pacienteId = nuevoPaciente.data.data.id_persona;
            toast.success("Paciente creado exitosamente");
            // Gamificación: registrar paciente nuevo (R-03)
            try { notifyClick("R-03"); } catch { /* noop */ }
          }
        }
      }

      if (!pacienteId) {
        toast.dismiss();
        toast.error("No se pudo crear o encontrar el paciente");
        setIsSubmitting(false);
        return;
      }

      toast.dismiss();
      setIsSubmitting(false);

      if (puedeHistoria) {
        toast.success("Datos guardados correctamente. Ahora completa la historia clínica del paciente.");
        updateProgress(10, "Paciente registrado. Completando historia clínica...");
        navigate("/portal/historias", {
          state: {
            paso: "formulario",
            prefill: {
              nombreCompleto: `${citasFormData.nombres} ${citasFormData.apellidos}`,
              documentoIdentidad: citasFormData.numero_documento,
              telefono: citasFormData.telefono,
              fechaNacimiento: citasFormData.fecha_nacimiento,
              direccion: citasFormData.direccion,
            },
          },
        });
      } else {
        toast.success("Paciente registrado correctamente en el sistema.");
        updateProgress(100 - progress, "Paciente registrado exitosamente");
        setTimeout(() => navigate("/portal/inicio"), 1500);
      }
    } catch (error: any) {
      toast.dismiss();
      setIsSubmitting(false);
      console.error("Error al guardar datos del paciente:", error);
      toast.error(error.response?.data?.message || "Error al guardar los datos del paciente. Por favor intenta de nuevo.");
    }
  };

  // Check form sections completion (comportamiento del monolito)
  useEffect(() => {
    if (paso !== "formulario") return;

    const basicInfoComplete = citasFormData.nombres &&
      citasFormData.apellidos && citasFormData.tipo_documento && citasFormData.numero_documento;
    if (basicInfoComplete && !formSectionsCompleted.basicInfo) {
      updateProgress(10, "Información básica del paciente completada");
      setFormSectionsCompleted({ ...formSectionsCompleted, basicInfo: true });
    }

    const contactInfoComplete = citasFormData.correoPaciente && citasFormData.telefono;
    if (contactInfoComplete && !formSectionsCompleted.contactInfo && formSectionsCompleted.basicInfo) {
      updateProgress(10, "Información de contacto completada");
      setFormSectionsCompleted({ ...formSectionsCompleted, contactInfo: true });
    }

    const serviceInfoComplete = citasFormData.sede && citasFormData.eps &&
      citasFormData.especialidad && citasFormData.acompanante;
    if (serviceInfoComplete && !formSectionsCompleted.serviceInfo && formSectionsCompleted.contactInfo) {
      updateProgress(10, "Información del servicio completada");
      setFormSectionsCompleted({ ...formSectionsCompleted, serviceInfo: true });
    }
  }, [citasFormData, paso]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {paso === "tipo" && (
          <motion.div
            key="userTypeSelection"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-4xl mx-auto"
          >
            {/* Title */}
            <div className="text-center mb-12">
              <h1 className="text-gray-800 mb-3">Tipo de Usuario</h1>
              <p className="text-gray-600">Selecciona el tipo de usuario para continuar</p>
            </div>

            {/* User Type Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
              {/* Registrar Usuario */}
              <motion.button
                onClick={() => handleUserTypeSelection("new")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-12 flex flex-col items-center justify-center gap-6 border-2 border-transparent hover:border-[#03D4D9]"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-[#01EDDF] to-[#03D4D9] rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-gray-800 mb-2">Registrar Usuario</h3>
                  <p className="text-gray-600 text-sm">Nuevo paciente en el sistema</p>
                </div>
              </motion.button>

              {/* Usuario Antiguo */}
              <motion.button
                onClick={() => handleUserTypeSelection("existing")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 p-12 flex flex-col items-center justify-center gap-6 border-2 border-transparent hover:border-[#03D4D9]"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-[#03D4D9] to-[#01EDDF] rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-gray-800 mb-2">Usuario Antiguo</h3>
                  <p className="text-gray-600 text-sm">Ya tengo cuenta en el sistema</p>
                </div>
              </motion.button>
            </div>

            <div className="text-center mb-8">
              <Button
                variant="outline"
                className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                onClick={() => navigate("/portal/inicio")}
              >
                Volver
              </Button>
            </div>
          </motion.div>
        )}

        {paso === "cedula" && (
          <motion.div
            key="existingUserForm"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-md mx-auto"
          >
            {/* Card Container */}
            <div className="bg-white rounded-3xl shadow-2xl p-10" data-feature-id="R-02">
              {/* Eye icon decoration */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#01EDDF] to-[#03D4D9] rounded-full flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-10">
                <h1 className="text-gray-800 mb-3">Usuario Antiguo</h1>
                <p className="text-gray-600">Ingresa tu número de cédula para continuar</p>
              </div>

              {/* Form */}
              <form onSubmit={handleExistingUserSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="cedula" className="text-gray-700">Número de Cédula*</Label>
                  <Input
                    id="cedula"
                    type="text"
                    placeholder="Ingresa tu número de cédula"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={existingUserCedula}
                    onChange={(e) => setExistingUserCedula(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Continuar
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-xl transition-colors"
                  onClick={() => setPaso("tipo")}
                >
                  Volver
                </Button>
              </form>

              {/* Footer */}
              <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {paso === "formulario" && (
          <motion.div
            key="citas"
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full max-w-5xl mx-auto pb-16"
          >
            {/* Title */}
            <div className="text-center mb-10">
              <h1 className="text-gray-800 mb-3">Agenda tu cita</h1>
              <p className="text-gray-600">Ingresa datos del paciente</p>
            </div>

            {/* Form */}
            <form onSubmit={handleCitasSubmit} className="bg-white rounded-3xl shadow-xl p-10" data-feature-id="R-03">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre del paciente */}
                <div className="space-y-2">
                  <Label htmlFor="nombrePaciente" className="text-gray-700">Nombre del paciente*</Label>
                  <Input
                    id="nombrePaciente"
                    type="text"
                    placeholder="Ingresa el nombre"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.nombres}
                    onChange={(e) => setCitasFormData({ ...citasFormData, nombres: e.target.value })}
                    required
                  />
                </div>

                {/* Apellidos del paciente */}
                <div className="space-y-2">
                  <Label htmlFor="apellidosPaciente" className="text-gray-700">Apellidos del paciente*</Label>
                  <Input
                    id="apellidosPaciente"
                    type="text"
                    placeholder="Ingresa los apellidos"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.apellidos}
                    onChange={(e) => setCitasFormData({ ...citasFormData, apellidos: e.target.value })}
                    required
                  />
                </div>

                {/* Tipo de documento */}
                <div className="space-y-2">
                  <Label htmlFor="tipoDocumento" className="text-gray-700">Tipo de documento*</Label>
                  <Select
                    value={citasFormData.tipo_documento}
                    onValueChange={(value) => setCitasFormData({ ...citasFormData, tipo_documento: value })}
                    required
                  >
                    <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                      <SelectValue placeholder="Selecciona el tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">C.C. - Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="TI">T.I. - Tarjeta de Identidad</SelectItem>
                      <SelectItem value="CE">C.E. - Cédula de Extranjería</SelectItem>
                      <SelectItem value="PAS">PAS - Pasaporte</SelectItem>
                      <SelectItem value="NIT">NIT - Número de Identificación Tributaria</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Número de documento */}
                <div className="space-y-2">
                  <Label htmlFor="numeroDocumento" className="text-gray-700">Número de documento*</Label>
                  <Input
                    id="numeroDocumento"
                    type="text"
                    placeholder="Ingresa el número de documento"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.numero_documento}
                    onChange={(e) => setCitasFormData({ ...citasFormData, numero_documento: e.target.value })}
                    required
                  />
                </div>

                {/* Correo electrónico */}
                <div className="space-y-2">
                  <Label htmlFor="correoElectronico" className="text-gray-700">Correo electrónico*</Label>
                  <Input
                    id="correoElectronico"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.correoPaciente}
                    onChange={(e) => setCitasFormData({ ...citasFormData, correoPaciente: e.target.value })}
                    required
                  />
                </div>

                {/* Teléfono de contacto */}
                <div className="space-y-2">
                  <Label htmlFor="telefonoContacto" className="text-gray-700">Teléfono de contacto*</Label>
                  <Input
                    id="telefonoContacto"
                    type="tel"
                    placeholder="Ingresa el teléfono"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.telefono}
                    onChange={(e) => setCitasFormData({ ...citasFormData, telefono: e.target.value })}
                    required
                  />
                </div>

                {/* Selección de sede */}
                <div className="space-y-2">
                  <Label htmlFor="sede" className="text-gray-700">Selección de sede*</Label>
                  <Select
                    value={citasFormData.sede}
                    onValueChange={(value) => setCitasFormData({ ...citasFormData, sede: value })}
                    required
                  >
                    <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                      <SelectValue placeholder="Selecciona una sede" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sede1">Sede Principal - Centro</SelectItem>
                      <SelectItem value="sede2">Sede Norte</SelectItem>
                      <SelectItem value="sede3">Sede Sur</SelectItem>
                      <SelectItem value="sede4">Sede Occidente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* EPS / Aseguradora */}
                <div className="space-y-2">
                  <Label htmlFor="eps" className="text-gray-700">EPS / Aseguradora*</Label>
                  <Select
                    value={citasFormData.eps}
                    onValueChange={(value) => setCitasFormData({ ...citasFormData, eps: value })}
                    required
                  >
                    <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                      <SelectValue placeholder="Selecciona tu EPS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sura">SURA</SelectItem>
                      <SelectItem value="sanitas">Sanitas</SelectItem>
                      <SelectItem value="compensar">Compensar</SelectItem>
                      <SelectItem value="salud-total">Salud Total</SelectItem>
                      <SelectItem value="nueva-eps">Nueva EPS</SelectItem>
                      <SelectItem value="particular">Particular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Especialidad o servicio requerido */}
                <div className="space-y-2">
                  <Label htmlFor="especialidad" className="text-gray-700">Especialidad o servicio requerido*</Label>
                  <Select
                    value={citasFormData.especialidad}
                    onValueChange={(value) => setCitasFormData({ ...citasFormData, especialidad: value })}
                    required
                  >
                    <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                      <SelectValue placeholder="Selecciona una especialidad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oftalmologia">Oftalmología general</SelectItem>
                      <SelectItem value="optometria">Optometría</SelectItem>
                      <SelectItem value="cirugia-refractiva">Cirugía refractiva</SelectItem>
                      <SelectItem value="cataratas">Cataratas</SelectItem>
                      <SelectItem value="glaucoma">Glaucoma</SelectItem>
                      <SelectItem value="retina">Retina y vítreo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Acompañante a contactar */}
                <div className="space-y-2">
                  <Label htmlFor="acompanante" className="text-gray-700">Acompañante a contactar*</Label>
                  <Input
                    id="acompanante"
                    type="text"
                    placeholder="Nombre del acompañante"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    value={citasFormData.acompanante}
                    onChange={(e) => setCitasFormData({ ...citasFormData, acompanante: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* ADRES Button */}
              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <Button
                  type="button"
                  variant="outline"
                  data-progress-id="adres"
                  className="border-2 border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-xl px-8 py-6 transition-colors mb-2"
                  onClick={() => toast.info("Redirigiendo al sistema ADRES para consultar la EPS del paciente...")}
                >
                  ADRES
                </Button>
                <p className="text-sm text-gray-600">Consulta la EPS del paciente</p>
              </div>

              {/* Submit Button */}
              <div className="mt-8">
                <Button
                  type="submit"
                  data-progress-id="citas-submit"
                  disabled={isSubmitting}
                  className="w-full h-14 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {isSubmitting ? "Enviando..." : "Enviar"}
                </Button>
              </div>

              {/* Volver */}
              <div className="mt-4 text-center">
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-full px-6"
                  onClick={() => setPaso("tipo")}
                >
                  Volver
                </Button>
              </div>

              {/* Progress Bar during submission */}
              {isSubmitting && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6"
                >
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Procesando información...</span>
                      <span className="text-sm text-gray-800">{submitProgress}%</span>
                    </div>
                    <Progress
                      value={submitProgress}
                      className="h-2 bg-gray-200"
                    />
                  </div>
                </motion.div>
              )}
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
              <div className="flex items-center gap-2">
                <span className="text-[#03D4D9]">En progreso...</span>
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
