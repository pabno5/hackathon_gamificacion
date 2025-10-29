import { Button } from "./ui/button";
import { FileText, Printer, Download } from "lucide-react";

export function GeneratedHistoriaClinica() {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    alert("Funcionalidad de descarga en desarrollo");
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
      {/* Header with Actions */}
      <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileText className="w-8 h-8 text-white" />
          <div>
            <h2 className="text-2xl text-white">Historia Clínica</h2>
            <p className="text-white/90 text-sm">Generada automáticamente</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Descargar PDF
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 space-y-8">
        {/* 1. Datos de Identificación */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">1. Datos de Identificación</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">Nombre completo</td>
                  <td className="py-4 px-6 text-gray-800">Laura Gómez Ramírez</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Edad / Fecha de nacimiento</td>
                  <td className="py-4 px-6 text-gray-800">29 años / 15 de mayo de 1996</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Sexo</td>
                  <td className="py-4 px-6 text-gray-800">Femenino</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Documento de identidad</td>
                  <td className="py-4 px-6 text-gray-800">CC 1.028.456.987</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Dirección y teléfono de contacto</td>
                  <td className="py-4 px-6 text-gray-800">Calle 45 #12-36, Bogotá / 312 456 7890</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Ocupación</td>
                  <td className="py-4 px-6 text-gray-800">Diseñadora gráfica</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Fecha de elaboración</td>
                  <td className="py-4 px-6 text-gray-800">29 de octubre de 2025</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Motivo de Consulta */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">2. Motivo de Consulta</h3>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-800 leading-relaxed">
              "Visión borrosa al final del día y sensación de cansancio ocular."
            </p>
          </div>
        </section>

        {/* 3. Enfermedad Actual */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">3. Enfermedad Actual</h3>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <ul className="space-y-2 text-gray-800">
              <li className="leading-relaxed">• Paciente refiere visión borrosa progresiva en horas de la tarde desde hace aproximadamente 2 semanas.</li>
              <li className="leading-relaxed">• Niega dolor ocular intenso o pérdida súbita de visión.</li>
              <li className="leading-relaxed">• Refiere uso prolongado de pantallas (8-10 horas diarias) sin pausas visuales.</li>
              <li className="leading-relaxed">• No uso de lágrimas artificiales.</li>
            </ul>
          </div>
        </section>

        {/* 4. Antecedentes Personales */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">4. Antecedentes Personales</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">Patológicos</td>
                  <td className="py-4 px-6 text-gray-800">Niega enfermedades crónicas.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Quirúrgicos</td>
                  <td className="py-4 px-6 text-gray-800">Apendicectomía en 2018.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Alergias</td>
                  <td className="py-4 px-6 text-gray-800">No conocidas.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Traumáticos</td>
                  <td className="py-4 px-6 text-gray-800">Ninguno relevante.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Farmacológicos</td>
                  <td className="py-4 px-6 text-gray-800">No toma medicamentos de forma habitual.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Gineco-obstétricos</td>
                  <td className="py-4 px-6 text-gray-800">G2P1A0, sin complicaciones.</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Hábitos</td>
                  <td className="py-4 px-6 text-gray-800">No fuma, consume café 2 veces al día, trabaja frente al computador, hace yoga 2 veces por semana.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 5. Antecedentes Familiares */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">5. Antecedentes Familiares</h3>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <ul className="space-y-2 text-gray-800">
              <li className="leading-relaxed">• Madre con miopía y ojo seco diagnosticado.</li>
              <li className="leading-relaxed">• Padre con hipertensión arterial controlada.</li>
            </ul>
          </div>
        </section>

        {/* 6. Revisión por Sistemas */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">6. Revisión por Sistemas</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">General</td>
                  <td className="py-4 px-6 text-gray-800">Sin fiebre, peso estable.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Cardiovascular</td>
                  <td className="py-4 px-6 text-gray-800">Niega dolor torácico o palpitaciones.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Respiratorio</td>
                  <td className="py-4 px-6 text-gray-800">Sin disnea ni tos.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Digestivo</td>
                  <td className="py-4 px-6 text-gray-800">Sin molestias.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Urinario</td>
                  <td className="py-4 px-6 text-gray-800">Normal.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Nervioso</td>
                  <td className="py-4 px-6 text-gray-800">Sin cefaleas intensas.</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Músculo-esquelético</td>
                  <td className="py-4 px-6 text-gray-800">Sin dolor articular.</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Sensorial</td>
                  <td className="py-4 px-6 text-gray-800">Visión borrosa ocasional, sin tinnitus ni pérdida auditiva.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Examen Físico */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">7. Examen Físico</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">Signos vitales</td>
                  <td className="py-4 px-6 text-gray-800">TA: 110/70 mmHg, FC: 78 lpm, FR: 16 rpm, Temp: 36.7°C, Peso: 58 kg, Talla: 1.65 m</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Exploración general</td>
                  <td className="py-4 px-6 text-gray-800">Paciente alerta, orientada, sin signos de fatiga extrema.</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Oftalmológico</td>
                  <td className="py-4 px-6 text-gray-800">
                    <div className="space-y-1">
                      <p>• Agudeza visual sin corrección: OD 20/60 – OI 20/50</p>
                      <p>• Con corrección: OD 20/25 – OI 20/25</p>
                      <p>• Reflejos pupilares normales</p>
                      <p>• Conjuntiva ligeramente enrojecida</p>
                      <p>• Tinción con fluoresceína: punteado superficial leve</p>
                      <p>• Fondo de ojo: papila y mácula normales</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 8. Diagnóstico */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">8. Diagnóstico</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">Principal</td>
                  <td className="py-4 px-6 text-gray-800">Síndrome de ojo seco leve por fatiga visual.</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Secundario</td>
                  <td className="py-4 px-6 text-gray-800">Miopía leve bilateral.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. Plan de Manejo / Tratamiento */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">9. Plan de Manejo / Tratamiento</h3>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <ul className="space-y-2 text-gray-800">
              <li className="leading-relaxed">• Prescribir lágrimas artificiales sin conservantes cada 6 horas.</li>
              <li className="leading-relaxed">• Recomendación de pausas visuales cada 20 minutos (regla 20-20-20).</li>
              <li className="leading-relaxed">• Aumentar parpadeo consciente frente a pantallas.</li>
              <li className="leading-relaxed">• Uso de gafas con filtro antirreflejo.</li>
              <li className="leading-relaxed">• Control en 3 meses o antes si los síntomas empeoran.</li>
            </ul>
          </div>
        </section>

        {/* 10. Evolución y Seguimiento */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">10. Evolución y Seguimiento</h3>
          </div>
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
            <ul className="space-y-2 text-gray-800">
              <li className="leading-relaxed">• Se explica a la paciente la naturaleza del diagnóstico y las medidas preventivas.</li>
              <li className="leading-relaxed">• Acepta el plan y comprende las indicaciones.</li>
              <li className="leading-relaxed">• Se agendará control en 3 meses para reevaluar la superficie ocular.</li>
            </ul>
          </div>
        </section>

        {/* 11. Firma y Datos del Profesional */}
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-[#038996] to-[#03D4D9] text-white px-6 py-3 rounded-lg">
            <h3 className="text-xl">11. Firma y Datos del Profesional</h3>
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="w-full">
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50 w-1/3">Nombre</td>
                  <td className="py-4 px-6 text-gray-800">Dr. Andrés Martínez Cárdenas</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Especialidad</td>
                  <td className="py-4 px-6 text-gray-800">Oftalmología</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Registro médico</td>
                  <td className="py-4 px-6 text-gray-800">R.M. 254879</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-6 bg-gray-50">Firma</td>
                  <td className="py-4 px-6 text-gray-800">______________________</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 bg-gray-50">Fecha</td>
                  <td className="py-4 px-6 text-gray-800">29 de octubre de 2025</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Botón ADRES */}
        <div className="flex justify-center pt-6">
          <Button
            onClick={() => {
              window.open('https://www.adres.gov.co/consulte-su-eps', '_blank');
            }}
            className="bg-gradient-to-r from-[#038996] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
          >
            ADRES - Verificar EPS del Paciente
          </Button>
        </div>
      </div>
    </div>
  );
}
