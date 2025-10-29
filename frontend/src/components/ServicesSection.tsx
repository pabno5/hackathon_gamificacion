import { Calendar, Glasses, FlaskConical } from "lucide-react";

const services = [
  {
    id: 1,
    icon: Calendar,
    title: "Citas",
    description: "Agenda tu consulta de forma rápida y sencilla"
  },
  {
    id: 2,
    icon: Glasses,
    title: "Especialidades",
    description: "Oftalmología y optometría especializadas"
  },
  {
    id: 3,
    icon: FlaskConical,
    title: "Exámenes visuales",
    description: "Diagnóstico completo con tecnología avanzada"
  }
];

export function ServicesSection() {
  return (
    <section className="py-20 bg-white" id="procedimientos">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-[#03D4D9] mb-4">Nuestros servicios</h2>
          <div className="w-20 h-1 bg-[#01EDDF] mx-auto"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                className="bg-white border border-gray-100 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center group"
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#01EDDF] to-[#03D4D9] rounded-full mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <h3 className="mb-3 text-gray-800">{service.title}</h3>
                <p className="text-gray-600">{service.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
