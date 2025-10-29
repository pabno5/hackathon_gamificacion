import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Eye, ArrowLeft, Calendar, TestTube, FlaskConical, Upload, FileText, Check, Mail, Send } from "lucide-react";
import logoImage from "../assets/logo.png";
import citasImage from "../assets/citas.png";
import examenesImage from "../assets/examenes.png";
import especialistasImage from "../assets/especialista.png";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useEffect } from "react";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "./ui/progress";
import { GeneratedHistoriaClinica } from "./GeneratedHistoriaClinica";
import { SchedulingSection } from "./SchedulingSection";
import { personasAPI } from "../service/api";

interface LoginPageProps {
  onBack: () => void;
}

type ViewType = "login" | "registration" | "options" | "userTypeSelection" | "existingUserForm" | "citas" | "historiaClinica" | "generarHistoria" | "schedulingAppointment";

export function LoginPage({ onBack }: LoginPageProps) {
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("Iniciando proceso de agendamiento");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [showGeneratedHistoria, setShowGeneratedHistoria] = useState(false);
  
  // Scheduling appointment states
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    documentType: "",
    documentNumber: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    address: ""
  });
  
  const [citasFormData, setCitasFormData] = useState({
    tipoCita: "",
    nombrePaciente: "",
    apellidosPaciente: "",
    tipoDocumento: "",
    numeroDocumento: "",
    correoElectronico: "",
    telefonoContacto: "",
    sede: "",
    eps: "",
    especialidad: "",
    acompanante: "",
    archivos: null as File[] | null
  });

  const [existingUserCedula, setExistingUserCedula] = useState("");

  // Track which form sections are completed
  const [formSectionsCompleted, setFormSectionsCompleted] = useState({
    basicInfo: false,
    contactInfo: false,
    serviceInfo: false,
    filesUploaded: false
  });

  // Historia Clínica Form Data
  const [historiaClinicaData, setHistoriaClinicaData] = useState({
    // 1. Datos de identificación
    nombreCompleto: "",
    edad: "",
    fechaNacimiento: "",
    sexo: "",
    documentoIdentidad: "",
    direccion: "",
    telefono: "",
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

  // Helper function to update progress
  const updateProgress = (increment: number, message: string) => {
    setProgress((prev) => Math.min(prev + increment, 100));
    setProgressMessage(message);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProgress(10, "Acceso exitoso al sistema");
    setCurrentView("registration");
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Registro completado correctamente");
    setFormData({
      documentType: "",
      documentNumber: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      phone: "",
      address: ""
    });
    updateProgress(10, "Registro de empleado completado");
    setCurrentView("options");
  };

  const handleBackToLogin = () => {
    setCurrentView("login");
    setProgress(0);
    setProgressMessage("Iniciando proceso de agendamiento");
    setFormSectionsCompleted({
      basicInfo: false,
      contactInfo: false,
      serviceInfo: false,
      filesUploaded: false
    });
  };

  const handleOptionClick = (option: string) => {
    if (option === "Citas") {
      updateProgress(15, "Sección de citas seleccionada");
      setCurrentView("userTypeSelection");
    } else {
      updateProgress(5, `Sección ${option} consultada`);
      toast.success(`Has seleccionado: ${option}`);
    }
  };

  const handleUserTypeSelection = (type: "new" | "existing") => {
    if (type === "existing") {
      updateProgress(10, "Usuario antiguo seleccionado");
      setCurrentView("existingUserForm");
    } else {
      updateProgress(10, "Nuevo usuario seleccionado");
      setCurrentView("citas");
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
      // Buscar usuario en el backend
      toast.loading("Buscando usuario...");
      const response = await personasAPI.getByDocumento(existingUserCedula.trim());
      
      // Cerrar el toast de loading
      toast.dismiss();
      
      if (response.data.success && response.data.data) {
        // Usuario encontrado
        const usuario = response.data.data;
        toast.success(`¡Usuario encontrado! Bienvenido ${usuario.nombres} ${usuario.apellidos}`);
        updateProgress(10, "Datos del usuario recuperados");
        
        // Aquí puedes guardar los datos del usuario si los necesitas después
        // setUserData(usuario);
        
        setCurrentView("generarHistoria");
      } else {
        // Usuario no encontrado
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

  const handleGenerarHistoria = () => {
    setShowGeneratedHistoria(true);
    toast.success("Historia clínica generada exitosamente");
  };

  const handleCitasSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setSubmitProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsSubmitting(false);
            updateProgress(10, "Cita agendada. Completando historia clínica...");
            toast.success("Cita registrada. Ahora completa la historia clínica del paciente.");
            
            // Pre-fill some data from citas form
            setHistoriaClinicaData({
              ...historiaClinicaData,
              nombreCompleto: `${citasFormData.nombrePaciente} ${citasFormData.apellidosPaciente}`,
              documentoIdentidad: citasFormData.numeroDocumento,
              telefono: citasFormData.telefonoContacto
            });
            
            setCurrentView("historiaClinica");
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleHistoriaClinicaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    updateProgress(100 - progress, "¡Historia clínica guardada exitosamente!");
    toast.success("Historia clínica guardada correctamente en el sistema.");
    
    // Reset forms
    setCitasFormData({
      tipoCita: "",
      nombrePaciente: "",
      apellidosPaciente: "",
      tipoDocumento: "",
      numeroDocumento: "",
      correoElectronico: "",
      telefonoContacto: "",
      sede: "",
      eps: "",
      especialidad: "",
      acompanante: "",
      archivos: null
    });
    
    setFormSectionsCompleted({
      basicInfo: false,
      contactInfo: false,
      serviceInfo: false,
      filesUploaded: false
    });
    
    setTimeout(() => {
      setCurrentView("options");
      setProgress(20);
      setProgressMessage("Proceso completado. Listo para nueva cita");
    }, 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCitasFormData({...citasFormData, archivos: Array.from(e.target.files)});
      if (!formSectionsCompleted.filesUploaded) {
        updateProgress(5, "Archivos adjuntados correctamente");
        setFormSectionsCompleted({...formSectionsCompleted, filesUploaded: true});
      }
    }
  };

  // Check form sections completion
  useEffect(() => {
    if (currentView === "citas") {
      // Check basic info
      const basicInfoComplete = citasFormData.tipoCita && citasFormData.nombrePaciente && 
        citasFormData.apellidosPaciente && citasFormData.tipoDocumento && citasFormData.numeroDocumento;
      
      if (basicInfoComplete && !formSectionsCompleted.basicInfo) {
        updateProgress(10, "Información básica del paciente completada");
        setFormSectionsCompleted({...formSectionsCompleted, basicInfo: true});
      }

      // Check contact info
      const contactInfoComplete = citasFormData.correoElectronico && citasFormData.telefonoContacto;
      
      if (contactInfoComplete && !formSectionsCompleted.contactInfo && formSectionsCompleted.basicInfo) {
        updateProgress(10, "Información de contacto completada");
        setFormSectionsCompleted({...formSectionsCompleted, contactInfo: true});
      }

      // Check service info
      const serviceInfoComplete = citasFormData.sede && citasFormData.eps && 
        citasFormData.especialidad && citasFormData.acompanante;
      
      if (serviceInfoComplete && !formSectionsCompleted.serviceInfo && formSectionsCompleted.contactInfo) {
        updateProgress(10, "Información del servicio completada");
        setFormSectionsCompleted({...formSectionsCompleted, serviceInfo: true});
      }
    }
  }, [citasFormData, currentView]);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Decorative background elements - eye inspired */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-[#01EDDF]/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-[#03D4D9]/5 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#01EDDF]/3 rounded-full blur-3xl"></div>
      
      {/* Decorative curves */}
      <svg className="absolute top-0 left-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,200 Q400,100 800,200 T1600,200" fill="none" stroke="#03D4D9" strokeWidth="2"/>
        <path d="M0,400 Q400,300 800,400 T1600,400" fill="none" stroke="#03D4D9" strokeWidth="2"/>
        <path d="M0,600 Q400,500 800,600 T1600,600" fill="none" stroke="#03D4D9" strokeWidth="2"/>
      </svg>

      {/* Back button */}


      {/* Main content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {currentView === "login" && (
            // Login Card
            <motion.div
              key="login"
              initial={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10"
            >
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img 
                  src={logoImage} 
                  alt="Cárdenas Visión" 
                  className="h-24 w-auto"
                />
              </div>

              {/* Eye icon decoration */}
              <div className="flex justify-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-[#01EDDF] to-[#03D4D9] rounded-full flex items-center justify-center shadow-lg">
                  <Eye className="w-10 h-10 text-white" />
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-10">
                <h1 className="text-gray-800 mb-3">Portal de Empleados</h1>
                <p className="text-gray-600">Ingresa tus credenciales para acceder al sistema</p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-700">Usuario</Label>
                  <Input 
                    id="username"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Contraseña</Label>
                  <Input 
                    id="password"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                    required
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Acceder
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-[#03D4D9] hover:text-[#01EDDF] transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>

              {/* Footer */}
              <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría
                </p>
              </div>
            </motion.div>
          )}

          {currentView === "registration" && (
            // Registration Card
            <motion.div
              key="registration"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-10"
            >
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img 
                  src={logoImage} 
                  alt="Cárdenas Visión" 
                  className="h-20 w-auto"
                />
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-[#03D4D9] mb-2">Completa tu registro</h1>
                <p className="text-[#666666] text-sm">Este paso solo es necesario una vez para los nuevos usuarios.</p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                {/* Tipo de documento */}
                <div className="space-y-2">
                  <Label htmlFor="documentType" className="text-gray-700">Tipo de documento</Label>
                  <Select 
                    value={formData.documentType} 
                    onValueChange={(value) => setFormData({...formData, documentType: value})}
                    required
                  >
                    <SelectTrigger className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg">
                      <SelectValue placeholder="Selecciona el tipo de documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cc">C.C.</SelectItem>
                      <SelectItem value="ce">C.E.</SelectItem>
                      <SelectItem value="dni">DNI extranjero</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Número de documento */}
                <div className="space-y-2">
                  <Label htmlFor="documentNumber" className="text-gray-700">Número de documento</Label>
                  <Input 
                    id="documentNumber"
                    type="text"
                    placeholder="Ingresa tu número de documento"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.documentNumber}
                    onChange={(e) => setFormData({...formData, documentNumber: e.target.value})}
                    required
                  />
                </div>

                {/* Nombre */}
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-gray-700">Nombre</Label>
                  <Input 
                    id="firstName"
                    type="text"
                    placeholder="Ingresa tu nombre"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>

                {/* Apellido */}
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-gray-700">Apellido</Label>
                  <Input 
                    id="lastName"
                    type="text"
                    placeholder="Ingresa tu apellido"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-gray-700">Fecha de nacimiento</Label>
                  <Input 
                    id="birthDate"
                    type="date"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                    required
                  />
                </div>

                {/* Número de teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700">Número de teléfono</Label>
                  <Input 
                    id="phone"
                    type="tel"
                    placeholder="Ingresa tu número de teléfono"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>

                {/* Dirección (opcional) */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-700">Dirección (opcional)</Label>
                  <Input 
                    id="address"
                    type="text"
                    placeholder="Ingresa tu dirección"
                    className="h-11 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-lg"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit"
                    className="flex-1 h-11 bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-lg transition-colors"
                  >
                    Enviar
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleBackToLogin}
                    variant="outline"
                    className="flex-1 h-11 border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9]/10 rounded-lg transition-colors"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-500">
                  © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría
                </p>
              </div>
            </motion.div>
          )}

          {currentView === "options" && (
            // Options Selection Screen
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Agendar cita
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={onBack}
                      >
                        Cerrar sesión
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="options"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-5xl pt-32"
              >

              {/* Title */}
              <div className="text-center mb-12">
                <h1 className="text-gray-800 mb-3">Selecciona una opción</h1>
                <p className="text-gray-600">¿Qué información deseas consultar?</p>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-32">
                {/* Citas */}
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
            </>
          )}

          {currentView === "userTypeSelection" && (
            // User Type Selection Screen
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Agendar cita
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={() => setCurrentView("options")}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="userTypeSelection"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-4xl pt-32"
              >
                {/* Title */}
                <div className="text-center mb-12">
                  <h1 className="text-gray-800 mb-3">Tipo de Usuario</h1>
                  <p className="text-gray-600">Selecciona el tipo de usuario para continuar</p>
                </div>

                {/* User Type Options */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
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
              </motion.div>
            </>
          )}

          {currentView === "existingUserForm" && (
            // Existing User Cedula Form
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Agendar cita
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={() => setCurrentView("userTypeSelection")}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="existingUserForm"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-md pt-32"
              >
                {/* Card Container */}
                <div className="bg-white rounded-3xl shadow-2xl p-10">
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
                  </form>

                  {/* Footer */}
                  <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-500">
                      © 2025 Cárdenas Visión - Clínica de Oftalmología y Optometría
                    </p>
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {currentView === "citas" && (
            // Citas Form Screen
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Agendar cita
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={() => setCurrentView("options")}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="citas"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-5xl pt-32 pb-16"
              >
                {/* Title */}
                <div className="text-center mb-10">
                  <h1 className="text-gray-800 mb-3">Agenda tu cita</h1>
                  <p className="text-gray-600">Ingresa datos del paciente</p>
                </div>

                {/* Form */}
                <form onSubmit={handleCitasSubmit} className="bg-white rounded-3xl shadow-xl p-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Tipo de cita */}
                    <div className="space-y-2">
                      <Label htmlFor="tipoCita" className="text-gray-700">Tipo de cita*</Label>
                      <Select 
                        value={citasFormData.tipoCita} 
                        onValueChange={(value) => setCitasFormData({...citasFormData, tipoCita: value})}
                        required
                      >
                        <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                          <SelectValue placeholder="Selecciona el tipo de cita" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consulta">Consulta general</SelectItem>
                          <SelectItem value="control">Control</SelectItem>
                          <SelectItem value="urgencia">Urgencia</SelectItem>
                          <SelectItem value="cirugia">Cirugía</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Nombre del paciente */}
                    <div className="space-y-2">
                      <Label htmlFor="nombrePaciente" className="text-gray-700">Nombre del paciente*</Label>
                      <Input 
                        id="nombrePaciente"
                        type="text"
                        placeholder="Ingresa el nombre"
                        className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl"
                        value={citasFormData.nombrePaciente}
                        onChange={(e) => setCitasFormData({...citasFormData, nombrePaciente: e.target.value})}
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
                        value={citasFormData.apellidosPaciente}
                        onChange={(e) => setCitasFormData({...citasFormData, apellidosPaciente: e.target.value})}
                        required
                      />
                    </div>

                    {/* Tipo de documento */}
                    <div className="space-y-2">
                      <Label htmlFor="tipoDocumento" className="text-gray-700">Tipo de documento*</Label>
                      <Select 
                        value={citasFormData.tipoDocumento} 
                        onValueChange={(value) => setCitasFormData({...citasFormData, tipoDocumento: value})}
                        required
                      >
                        <SelectTrigger className="h-12 border-gray-200 focus:border-[#03D4D9] focus:ring-[#03D4D9] rounded-xl">
                          <SelectValue placeholder="Selecciona el tipo de documento" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cc">C.C.</SelectItem>
                          <SelectItem value="ce">C.E.</SelectItem>
                          <SelectItem value="ti">T.I.</SelectItem>
                          <SelectItem value="pasaporte">Pasaporte</SelectItem>
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
                        value={citasFormData.numeroDocumento}
                        onChange={(e) => setCitasFormData({...citasFormData, numeroDocumento: e.target.value})}
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
                        value={citasFormData.correoElectronico}
                        onChange={(e) => setCitasFormData({...citasFormData, correoElectronico: e.target.value})}
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
                        value={citasFormData.telefonoContacto}
                        onChange={(e) => setCitasFormData({...citasFormData, telefonoContacto: e.target.value})}
                        required
                      />
                    </div>

                    {/* Selección de sede */}
                    <div className="space-y-2">
                      <Label htmlFor="sede" className="text-gray-700">Selección de sede*</Label>
                      <Select 
                        value={citasFormData.sede} 
                        onValueChange={(value) => setCitasFormData({...citasFormData, sede: value})}
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
                        onValueChange={(value) => setCitasFormData({...citasFormData, eps: value})}
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
                        onValueChange={(value) => setCitasFormData({...citasFormData, especialidad: value})}
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
                        onChange={(e) => setCitasFormData({...citasFormData, acompanante: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <Label className="text-gray-800 mb-4 block">
                      Adjuntar autorizaciones y documentos de soporte*
                    </Label>
                    <div className="relative">
                      <input
                        type="file"
                        id="fileUpload"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                      <label
                        htmlFor="fileUpload"
                        className="flex items-center justify-center gap-3 w-full h-24 border-2 border-dashed border-[#03D4D9] rounded-xl cursor-pointer hover:bg-[#03D4D9]/5 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-[#03D4D9]" />
                        <span className="text-gray-700">
                          {citasFormData.archivos && citasFormData.archivos.length > 0
                            ? `${citasFormData.archivos.length} archivo(s) seleccionado(s)`
                            : "Selecciona los archivos desde tu dispositivo"}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* ADRES Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <Button
                      type="button"
                      variant="outline"
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
                      disabled={isSubmitting}
                      className="w-full h-14 bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      {isSubmitting ? "Enviando..." : "Enviar"}
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
            </>
          )}

          {currentView === "historiaClinica" && (
            // Historia Clínica Form Screen
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Historia Clínica
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={() => setCurrentView("options")}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="historiaClinica"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-6xl pt-32 pb-32"
              >
                {/* Title */}
                <div className="text-center mb-10">
                  <h1 className="text-gray-800 mb-3">Historia Clínica del Paciente</h1>
                  <p className="text-gray-600">Completa todos los campos requeridos</p>
                </div>

                {/* Form */}
                <form onSubmit={handleHistoriaClinicaSubmit} className="bg-white rounded-3xl shadow-xl p-10 space-y-8">
                  
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
            </>
          )}

          {currentView === "generarHistoria" && (
            // Ver Historia Clínica Screen
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
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-4">
                      <Button 
                        className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6 transition-colors"
                      >
                        Sistema Médico
                      </Button>
                      <Button 
                        variant="outline"
                        className="border-[#03D4D9] text-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full px-6 transition-colors"
                        onClick={() => setCurrentView("options")}
                      >
                        Volver
                      </Button>
                    </div>
                  </div>
                </div>
              </nav>

              <motion.div
                key="generarHistoria"
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -100, opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="w-full max-w-7xl pt-32 pb-32 px-4"
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
                          setCurrentView("schedulingAppointment");
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
            </>
          )}

          {/* Scheduling Appointment View */}
          {currentView === "schedulingAppointment" && (
            <SchedulingSection
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedTime={selectedTime}
              setSelectedTime={setSelectedTime}
              selectedDoctor={selectedDoctor}
              setSelectedDoctor={setSelectedDoctor}
              showConfirmation={showConfirmation}
              setShowConfirmation={setShowConfirmation}
              onBack={() => setCurrentView("generarHistoria")}
              onBackToMenu={() => {
                setCurrentView("options");
                setShowConfirmation(false);
                setSelectedDate(null);
                setSelectedTime(null);
                setSelectedDoctor(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Progress Bar at Bottom - Shown in multiple views */}
      {(currentView === "options" || currentView === "userTypeSelection" || currentView === "existingUserForm" || currentView === "citas" || currentView === "historiaClinica" || currentView === "generarHistoria") && progress > 0 && (
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
                {progress === 100 ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Completado
                  </span>
                ) : (
                  <span className="text-[#03D4D9]">En progreso...</span>
                )}
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
