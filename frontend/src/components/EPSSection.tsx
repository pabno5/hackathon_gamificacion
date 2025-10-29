import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import fomagLogo from "../fomag-logo.png";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

const steps = [
  {
    id: 1,
    title: "Solicita autorización en tu EPS",
    description: "Verifica tu cobertura y obtén la autorización necesaria"
  },
  {
    id: 2,
    title: "Programa tu cita de valoración",
    description: "Agenda una consulta con nuestros especialistas"
  },
  {
    id: 3,
    title: "Realiza tus exámenes",
    description: "Completa los estudios diagnósticos necesarios"
  },
  {
    id: 4,
    title: "Agenda tu cita con oftalmología",
    description: "Recibe tu diagnóstico y plan de tratamiento personalizado"
  }
];

const epsLogos = [
  "Omac",
  "Cajacopi",
  "Coosalud",
  "Famisanar",
  "Sanitas",
  "Sura",
  "Compensar",
  "Nueva EPS"
];

export function EPSSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [openDialog, setOpenDialog] = useState<number | null>(null);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    let scrollAmount = 0;
    const scrollSpeed = 1;

    const scroll = () => {
      scrollAmount += scrollSpeed;
      if (scrollContainer.scrollWidth && scrollAmount >= scrollContainer.scrollWidth / 2) {
        scrollAmount = 0;
      }
      scrollContainer.scrollLeft = scrollAmount;
    };

    const interval = setInterval(scroll, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-[#01EDDF]/5" id="eps">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[#03D4D9] mb-4">Lo que debes saber</h2>
          <div className="w-20 h-1 bg-[#01EDDF] mx-auto"></div>
        </div>

        {/* Information Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
            <div className="relative h-[450px]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1758573467030-52481ea92007?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWUlMjBleGFtaW5hdGlvbiUyMGRvY3RvciUyMHBhdGllbnR8ZW58MXx8fHwxNzYxNjkwMDUxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Cita de oftalmología"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/70"></div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p className="mb-6 text-center">
                  Lo que debes tener listo antes de tu cita de oftalmología
                </p>
                <Button 
                  onClick={() => setOpenDialog(1)}
                  className="w-full bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full transition-colors"
                >
                  Ver más
                </Button>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
            <div className="relative h-[450px]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1758691461990-03b49d969495?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwZG9jdW1lbnRzJTIwcGFwZXJ3b3JrfGVufDF8fHx8MTc2MTY5MDA1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Documentos para cita"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/70"></div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p className="mb-6 text-center">
                  Revisa qué papeles debes llevar a tu cita con especialista
                </p>
                <Button 
                  onClick={() => setOpenDialog(2)}
                  className="w-full bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full transition-colors"
                >
                  Ver más
                </Button>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
            <div className="relative h-[450px]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1617651482504-4b0d8bf23ba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWUlMjBzdXJnZXJ5JTIwb3BlcmF0aW9ufGVufDF8fHx8MTc2MTY5MDA1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Cirugía ocular"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/70"></div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <p className="mb-6 text-center">
                  Que debes presentar antes de tu cirugía ocular
                </p>
                <Button 
                  onClick={() => setOpenDialog(3)}
                  className="w-full bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full transition-colors"
                >
                  Ver más
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog 1 - Requisitos para Consulta Oftalmológica */}
      <Dialog open={openDialog === 1} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-[600px] w-[600px] h-[400px] bg-[#f5f5f5] p-0 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-2 h-full">
            {/* Left side - Content */}
            <div className="p-6 flex flex-col justify-between">
              <div>
                <DialogHeader className="mb-4">
                  <DialogTitle className="text-left text-[#007c91]">
                    Requisitos para Consulta Oftalmológica
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Lista de documentos y requisitos necesarios para su consulta oftalmológica
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Documento de identidad original y vigente</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Carnet de afiliación a la EPS actualizado</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Orden médica para consulta oftalmológica (si aplica)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Autorización de la EPS (en caso de ser requerida)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Historia clínica previa o exámenes anteriores (si los tiene)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#007c91] flex-shrink-0 mt-0.5" />
                    <p className="text-[#444] text-xs leading-relaxed">Lista de medicamentos actuales que esté tomando</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right side - Doctor Image */}
            <div className="relative h-full">
              <ImageWithFallback 
                src="figma:asset/eefa3880-821a-42fa-87fc-312b2a30a1a4.png"
                alt="Doctor oftalmólogo"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog 2 - Documentos para Cita con Especialista */}
      <Dialog open={openDialog === 2} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Image */}
            <div className="relative h-full min-h-[500px]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1758691461990-03b49d969495?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpY2FsJTIwZG9jdW1lbnRzJTIwcGFwZXJ3b3JrfGVufDF8fHx8MTc2MTY5MDA1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Documentos médicos"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Right side - Content */}
            <div className="p-8 flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-left text-[#03D4D9] mb-2">
                  Documentos para Cita con Especialista
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Lista de documentos necesarios para cita con especialista oftalmológico
                </DialogDescription>
                <div className="w-16 h-1 bg-[#01EDDF] mb-6"></div>
              </DialogHeader>
              
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Documento de identidad original</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Carnet de la EPS vigente</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Orden médica de remisión al especialista</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Autorización vigente de la EPS</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Resultados de exámenes previos (optometría, laboratorio, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Historia clínica o informes médicos anteriores</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Récipe de gafas actual (si usa corrección visual)</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 mt-6">
                <Button 
                  onClick={() => setOpenDialog(null)}
                  className="w-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:opacity-90 text-white rounded-full"
                >
                  Agendar Cita
                </Button>
                <Button 
                  onClick={() => setOpenDialog(null)}
                  variant="outline"
                  className="w-full border-[#03D4D9] text-[#03D4D9] hover:bg-[#01EDDF]/10 rounded-full"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog 3 - Requisitos para Cirugía Ocular */}
      <Dialog open={openDialog === 3} onOpenChange={(open) => !open && setOpenDialog(null)}>
        <DialogContent className="max-w-4xl bg-white p-0 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left side - Image */}
            <div className="relative h-full min-h-[500px]">
              <ImageWithFallback 
                src="https://images.unsplash.com/photo-1617651482504-4b0d8bf23ba0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleWUlMjBzdXJnZXJ5JTIwb3BlcmF0aW9ufGVufDF8fHx8MTc2MTY5MDA1Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                alt="Cirugía ocular"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Right side - Content */}
            <div className="p-8 flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-left text-[#03D4D9] mb-2">
                  Requisitos para Cirugía Ocular
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Lista de requisitos necesarios para cirugía ocular
                </DialogDescription>
                <div className="w-16 h-1 bg-[#01EDDF] mb-6"></div>
              </DialogHeader>
              
              <div className="space-y-3 flex-1">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Documento de identidad y carnet de EPS</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Orden médica de cirugía debidamente autorizada por la EPS</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Exámenes prequirúrgicos completos (laboratorio, electrocardiograma, etc.)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Valoración preanestésica aprobada</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Consentimiento informado firmado</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Acompañante mayor de edad (obligatorio)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Ayuno según indicaciones médicas</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#01EDDF] flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-sm">Suspender medicamentos anticoagulantes (si aplica, según indicación médica)</p>
                </div>
              </div>
              
              <div className="flex flex-col gap-3 mt-6">
                <Button 
                  onClick={() => setOpenDialog(null)}
                  className="w-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:opacity-90 text-white rounded-full"
                >
                  Agendar Cita
                </Button>
                <Button 
                  onClick={() => setOpenDialog(null)}
                  variant="outline"
                  className="w-full border-[#03D4D9] text-[#03D4D9] hover:bg-[#01EDDF]/10 rounded-full"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
