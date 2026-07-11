import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { citasAPI, sedesAPI } from "../../../service/api";
import useFeatureVisit from "../../../lib/useFeatureVisit";

/**
 * Reportes de citas (A-07). Agregados por estado, canal y sede.
 *
 * El backend no tiene endpoint de estadísticas, así que se derivan del total
 * paginado (`meta.total`) por filtro: una llamada liviana (limit=1) por corte.
 */
const ESTADOS = ["pendiente", "confirmada", "en_atencion", "completada", "cancelada", "no_asistio"];
const CANALES = ["presencial", "telefonico"];

const ESTADO_COLOR: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700",
  confirmada: "bg-emerald-100 text-emerald-700",
  en_atencion: "bg-blue-100 text-blue-700",
  completada: "bg-gray-100 text-gray-700",
  cancelada: "bg-red-100 text-red-700",
  no_asistio: "bg-purple-100 text-purple-700",
};

async function contar(params: Record<string, any>): Promise<number> {
  const res = await citasAPI.getAll({ ...params, page: 1, limit: 1 });
  return res.data?.meta?.total ?? 0;
}

export default function ReportesAdmin() {
  useFeatureVisit("A-07");

  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<Record<string, number>>({});
  const [porCanal, setPorCanal] = useState<Record<string, number>>({});
  const [porSede, setPorSede] = useState<{ nombre: string; n: number }[]>([]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const sedesRes = await sedesAPI.getAll();
      const sedes = sedesRes.data?.data ?? [];

      const [tot, estados, canales, sedesCount] = await Promise.all([
        contar({}),
        Promise.all(ESTADOS.map((e) => contar({ estado: e }))),
        Promise.all(CANALES.map((c) => contar({ canal: c }))),
        Promise.all(sedes.map((s: any) => contar({ id_sede: s.id_sede }))),
      ]);

      setTotal(tot);
      setPorEstado(Object.fromEntries(ESTADOS.map((e, i) => [e, estados[i]])));
      setPorCanal(Object.fromEntries(CANALES.map((c, i) => [c, canales[i]])));
      setPorSede(sedes.map((s: any, i: number) => ({ nombre: s.nombre, n: sedesCount[i] })));
    } catch {
      toast.error("Error al cargar los reportes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando reportes…</div>;

  return (
    <div data-feature-id="A-07">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Reportes de citas</h2>

      {/* KPI total */}
      <div className="bg-gradient-to-r from-[#01EDDF]/10 to-[#03D4D9]/10 rounded-2xl p-6 mb-6">
        <div className="text-sm text-gray-500 mb-1">Total de citas</div>
        <div className="text-4xl font-bold" style={{ color: "#038996" }}>{total}</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Por estado */}
        <div>
          <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Por estado</h3>
          <div className="space-y-2">
            {ESTADOS.map((e) => (
              <div key={e} className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs w-28 text-center ${ESTADO_COLOR[e]}`}>{e}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9]" style={{ width: `${pct(porEstado[e] || 0)}%` }} />
                </div>
                <span className="text-sm text-gray-700 w-16 text-right">{porEstado[e] || 0} ({pct(porEstado[e] || 0)}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Por canal */}
        <div>
          <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Por canal</h3>
          <div className="space-y-2">
            {CANALES.map((c) => (
              <div key={c} className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs w-28 text-center bg-gray-100 text-gray-700">{c}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9]" style={{ width: `${pct(porCanal[c] || 0)}%` }} />
                </div>
                <span className="text-sm text-gray-700 w-16 text-right">{porCanal[c] || 0} ({pct(porCanal[c] || 0)}%)</span>
              </div>
            ))}
          </div>

          {/* Por sede */}
          <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3 mt-6">Por sede</h3>
          <div className="space-y-2">
            {porSede.length === 0 ? (
              <p className="text-sm text-gray-400">No hay sedes registradas.</p>
            ) : porSede.map((s) => (
              <div key={s.nombre} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-28 truncate" title={s.nombre}>{s.nombre}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#01EDDF] to-[#03D4D9]" style={{ width: `${pct(s.n)}%` }} />
                </div>
                <span className="text-sm text-gray-700 w-16 text-right">{s.n} ({pct(s.n)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
