import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { especialidadesAPI } from "../../../service/api";
import { notifyClick } from "../../../lib/progressTracker";

/** Gestión de especialidades (ADM-05, A-04). */
export default function EspecialidadesAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await especialidadesAPI.getAll();
      setItems(res.data?.data ?? []);
    } catch {
      toast.error("Error al cargar especialidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      await especialidadesAPI.create({ nombre, descripcion: descripcion || null });
      toast.success("Especialidad creada");
      try { notifyClick("A-04"); } catch { /* noop */ }
      setNombre("");
      setDescripcion("");
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo crear la especialidad");
    } finally {
      setCreando(false);
    }
  };

  const toggle = async (esp: any) => {
    try {
      await especialidadesAPI.update(esp.id_especialidad, { activa: !esp.activa });
      try { notifyClick("A-04"); } catch { /* noop */ }
      cargar();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  return (
    <div data-feature-id="A-04">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Especialidades ({items.length})</h2>

      <form onSubmit={crear} className="bg-gray-50 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required minLength={2} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descripción (opcional)</Label>
          <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="min-h-[40px]" />
        </div>
        <div>
          <Button type="submit" disabled={creando} className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white rounded-full px-8 disabled:opacity-60">
            {creando ? "Creando..." : "Crear"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Cargando…</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Descripción</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((esp) => (
              <tr key={esp.id_especialidad} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{esp.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{esp.descripcion || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs ${esp.activa ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {esp.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" className="rounded-full text-xs px-4 py-1.5" onClick={() => toggle(esp)}>
                    {esp.activa ? "Desactivar" : "Activar"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
