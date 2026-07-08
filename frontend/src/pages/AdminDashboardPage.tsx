import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { gamificacionAPI, empleadosAPI } from "../service/api";
import { supabase } from "../lib/supabaseClient";

type Resumen = {
  id_empleado: string;
  nombre_completo: string;
  rol: string;
  activo: boolean;
  total_features: number;
  features_visitadas: number;
  porcentaje_completado: number | null;
  ultima_actividad: string | null;
};

const TEAL = "#03D4D9";
const TEAL_LIGHT = "#01EDDF";
const TEAL_DARK = "#038996";

function rolBadge(rol: string) {
  const colors: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    medico: "bg-blue-100 text-blue-700",
    recepcionista: "bg-emerald-100 text-emerald-700",
  };
  return colors[rol] || "bg-gray-100 text-gray-700";
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color = pct === 100 ? "from-emerald-400 to-emerald-500" : "from-[#01EDDF] to-[#03D4D9]";
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-CO", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

export default function AdminDashboardPage() {
  const [resumen, setResumen] = useState<Resumen[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroRol, setFiltroRol] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");

  // Carga inicial del resumen (el acceso lo garantiza ProtectedRoute roles={["admin"]})
  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await gamificacionAPI.resumen();
      if (data?.success) setResumen(data.data);
    } catch (e) {
      toast.error("Error al cargar resumen");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Realtime: cualquier cambio en gamificacion_progreso recarga
  useEffect(() => {
    const channel = supabase
      .channel("gamificacion-resumen")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gamificacion_progreso" },
        () => { cargar(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [cargar]);

  const reiniciarTour = async (idEmpleado: string, nombre: string) => {
    if (!window.confirm(`¿Reiniciar tour de ${nombre}? El empleado lo verá de nuevo al entrar.`)) return;
    try {
      await empleadosAPI.reiniciarTour(idEmpleado, "Reactivado desde dashboard admin");
      toast.success(`Tour reiniciado para ${nombre}`);
      cargar();
    } catch {
      toast.error("No se pudo reiniciar el tour");
    }
  };

  const filtrados = resumen.filter((r) => {
    if (filtroRol !== "todos" && r.rol !== filtroRol) return false;
    if (busqueda && !r.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  const completos = resumen.filter((r) => r.porcentaje_completado === 100).length;
  const promedio = resumen.length > 0
    ? Math.round(resumen.reduce((s, r) => s + (r.porcentaje_completado || 0), 0) / resumen.length)
    : 0;

  return (
    <>
        {/* Hero */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: TEAL }}>
            Progreso de Onboarding
          </h2>
          <div className="w-20 h-1 mx-0 mb-3" style={{ background: TEAL_LIGHT }} />
          <p className="text-gray-600">
            Visualiza en tiempo real el progreso de cada empleado en su recorrido de capacitación.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <KPI label="Empleados" value={resumen.length} />
          <KPI label="Completaron el tour" value={completos} suffix={`/ ${resumen.length}`} />
          <KPI label="Promedio del equipo" value={`${promedio}%`} />
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#03D4D9] focus:border-[#03D4D9]"
          />
          <div className="flex gap-2">
            {["todos", "admin", "medico", "recepcionista"].map((r) => (
              <button
                key={r}
                onClick={() => setFiltroRol(r)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  filtroRol === r
                    ? "bg-[#03D4D9] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {r === "todos" ? "Todos" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Cargando…</div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-gray-400">No hay empleados con esos filtros.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-6 py-4">Empleado</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4 w-[280px]">Progreso</th>
                    <th className="px-6 py-4">Última actividad</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => (
                    <tr key={r.id_empleado} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-800">{r.nombre_completo}</div>
                        {!r.activo && (
                          <span className="text-xs text-amber-600">Desactivado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${rolBadge(r.rol)}`}>
                          {r.rol}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ProgressBar value={r.porcentaje_completado || 0} />
                          <span className="text-sm font-semibold text-gray-700 w-12 text-right">
                            {r.porcentaje_completado ?? 0}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {r.features_visitadas}/{r.total_features} secciones
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(r.ultima_actividad)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          className="text-[#03D4D9] border-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full text-xs px-4 py-1.5"
                          onClick={() => reiniciarTour(r.id_empleado, r.nombre_completo)}
                        >
                          Reiniciar tour
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Datos actualizados en tiempo real ·{" "}
          <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full align-middle animate-pulse" /> Conectado
        </p>
    </>
  );
}

function KPI({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="text-sm text-gray-500 mb-2">{label}</div>
      <div className="flex items-baseline gap-2">
        <div className="text-3xl font-bold" style={{ color: TEAL_DARK }}>{value}</div>
        {suffix && <div className="text-sm text-gray-400">{suffix}</div>}
      </div>
    </div>
  );
}
