import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { useAuth } from "../../lib/authContext";
import { notifyClick } from "../../lib/progressTracker";
import useFeatureVisit from "../../lib/useFeatureVisit";
import { personasAPI } from "../../service/api";

/**
 * Gestión de pacientes (PAC-05 / slice de FT-01) — lista paginada + búsqueda.
 * Recepción y admin. Médico/admin pueden saltar a la ficha de historias.
 */
const LIMIT = 10;

export default function PacientesList() {
  const navigate = useNavigate();
  const { rol } = useAuth();
  // Todos los roles del portal pueden ver historias (recepción en solo lectura).
  const puedeHistorias = rol === "medico" || rol === "admin" || rol === "recepcionista";

  // Buscar paciente = R-02 (visitar la vista de búsqueda)
  useFeatureVisit("R-02");

  const [search, setSearch] = useState("");
  const [inputBusqueda, setInputBusqueda] = useState("");
  const [page, setPage] = useState(1);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await personasAPI.getAll({ page, limit: LIMIT, search: search || undefined });
      const body = res.data;
      setPacientes(body?.data ?? []);
      setTotal(body?.pagination?.total ?? body?.total ?? 0);
    } catch {
      toast.error("Error al cargar pacientes");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { cargar(); }, [cargar]);

  const aplicarBusqueda = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(inputBusqueda.trim());
    try { notifyClick("R-02"); } catch { /* noop */ }
  };

  const totalPaginas = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="w-full max-w-6xl mx-auto" data-feature-id="R-02">
      {/* Hero */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#03D4D9" }}>Pacientes</h1>
          <p className="text-gray-600">Busca y consulta los pacientes registrados.</p>
        </div>
        <Button
          onClick={() => navigate("/portal/citas")}
          className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] hover:from-[#03D4D9] hover:to-[#01EDDF] text-white rounded-full px-6"
        >
          Registrar paciente
        </Button>
      </div>

      {/* Búsqueda */}
      <form onSubmit={aplicarBusqueda} className="bg-white rounded-2xl shadow-sm p-4 mb-6 flex gap-3">
        <input
          type="text"
          placeholder="Buscar por nombre o documento…"
          value={inputBusqueda}
          onChange={(e) => setInputBusqueda(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#03D4D9] focus:border-[#03D4D9]"
        />
        <Button type="submit" className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6">
          Buscar
        </Button>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando…</div>
        ) : pacientes.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay pacientes con esos criterios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-6 py-4">Paciente</th>
                  <th className="px-6 py-4">Documento</th>
                  <th className="px-6 py-4">Teléfono</th>
                  <th className="px-6 py-4">Correo</th>
                  {puedeHistorias && <th className="px-6 py-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id_persona} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-800">{p.nombres} {p.apellidos}</td>
                    <td className="px-6 py-4 text-gray-600">{p.tipo_documento} {p.numero_documento}</td>
                    <td className="px-6 py-4 text-gray-600">{p.telefono || "—"}</td>
                    <td className="px-6 py-4 text-gray-600">{p.correo || "—"}</td>
                    {puedeHistorias && (
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          className="text-[#03D4D9] border-[#03D4D9] hover:bg-[#03D4D9] hover:text-white rounded-full text-xs px-4 py-1.5"
                          onClick={() => navigate("/portal/historias", { state: { paso: "paciente", documento: p.numero_documento } })}
                        >
                          Ver historias
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {!loading && total > LIMIT && (
        <div className="flex items-center justify-between mt-6">
          <span className="text-sm text-gray-500">
            Página {page} de {totalPaginas} · {total} pacientes
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              className="rounded-full"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={page >= totalPaginas}
              className="rounded-full"
              onClick={() => setPage((p) => Math.min(totalPaginas, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
