import { useState } from "react";
import EmpleadosAdmin from "./EmpleadosAdmin";
import EspecialidadesAdmin from "./EspecialidadesAdmin";
import SedesAdmin from "./SedesAdmin";
import MedicosAdmin from "./MedicosAdmin";
import AuditoriaAdmin from "./AuditoriaAdmin";
import ReportesAdmin from "./ReportesAdmin";

/** Panel de administración (FT-01) — tabs por entidad. Solo admin (guard en ruta). */
type Tab = "empleados" | "especialidades" | "sedes" | "medicos" | "reportes" | "auditoria";

const TABS: { id: Tab; label: string }[] = [
  { id: "empleados", label: "Empleados" },
  { id: "especialidades", label: "Especialidades" },
  { id: "sedes", label: "Sedes" },
  { id: "medicos", label: "Médicos" },
  { id: "reportes", label: "Reportes" },
  { id: "auditoria", label: "Auditoría" },
];

export default function GestionPage() {
  const [tab, setTab] = useState<Tab>("empleados");

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#03D4D9" }}>Administración</h1>
        <p className="text-gray-600">Gestiona empleados, catálogos y revisa la auditoría del sistema.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-full text-sm transition-colors ${
              tab === t.id ? "bg-[#03D4D9] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        {tab === "empleados" && <EmpleadosAdmin />}
        {tab === "especialidades" && <EspecialidadesAdmin />}
        {tab === "sedes" && <SedesAdmin />}
        {tab === "medicos" && <MedicosAdmin />}
        {tab === "reportes" && <ReportesAdmin />}
        {tab === "auditoria" && <AuditoriaAdmin />}
      </div>
    </div>
  );
}
