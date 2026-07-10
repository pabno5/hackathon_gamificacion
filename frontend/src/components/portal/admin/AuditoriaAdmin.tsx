import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { auditAPI } from "../../../service/api";
import useFeatureVisit from "../../../lib/useFeatureVisit";

/** Log de auditoría (ADM-07, A-06) — solo lectura, paginado + filtros. */
const LIMIT = 20;
const TABLAS = ["", "personas", "citas", "historias_clinicas", "empleados"];
const ACCIONES = ["", "INSERT", "UPDATE", "DELETE"];

export default function AuditoriaAdmin() {
  useFeatureVisit("A-06");

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tabla, setTabla] = useState("");
  const [accion, setAccion] = useState("");
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditAPI.getAll({
        page, limit: LIMIT,
        tabla: tabla || undefined,
        accion: accion || undefined,
      });
      setRows(res.data?.data ?? []);
      setTotal(res.data?.pagination?.total ?? 0);
    } catch {
      toast.error("Error al cargar la auditoría");
    } finally {
      setLoading(false);
    }
  }, [page, tabla, accion]);

  useEffect(() => { cargar(); }, [cargar]);

  const totalPaginas = Math.max(1, Math.ceil(total / LIMIT));

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return iso; }
  };

  return (
    <div data-feature-id="A-06">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Auditoría</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={tabla}
          onChange={(e) => { setPage(1); setTabla(e.target.value); }}
          className="px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#03D4D9]"
        >
          {TABLAS.map((t) => <option key={t} value={t}>{t || "Todas las tablas"}</option>)}
        </select>
        <select
          value={accion}
          onChange={(e) => { setPage(1); setAccion(e.target.value); }}
          className="px-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#03D4D9]"
        >
          {ACCIONES.map((a) => <option key={a} value={a}>{a || "Todas las acciones"}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No hay registros de auditoría con esos filtros.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Tabla</th>
                <th className="px-4 py-3">Acción</th>
                <th className="px-4 py-3">Registro</th>
                <th className="px-4 py-3">Empleado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id_audit} className="border-b border-gray-50 text-sm">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmt(r.created_at)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.tabla_afectada}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      r.accion === "INSERT" ? "bg-emerald-100 text-emerald-700" :
                      r.accion === "DELETE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                    }`}>{r.accion}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.id_registro?.slice(0, 8) ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{r.id_empleado ? r.id_empleado.slice(0, 8) : "sistema"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && total > LIMIT && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">Página {page} de {totalPaginas} · {total} registros</span>
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} className="rounded-full" onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
            <Button variant="outline" disabled={page >= totalPaginas} className="rounded-full" onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}
