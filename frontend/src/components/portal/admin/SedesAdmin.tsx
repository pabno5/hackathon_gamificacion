import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { sedesAPI } from "../../../service/api";

/** Gestión de sedes — catálogo con Google Calendar por sede (CIT-06). */
const VACIO = { nombre: "", ciudad: "", direccion: "", telefono: "", google_calendar_id: "" };

export default function SedesAdmin() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...VACIO });
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sedesAPI.getAll();
      setItems(res.data?.data ?? []);
    } catch {
      toast.error("Error al cargar sedes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      await sedesAPI.create({
        nombre: form.nombre,
        ciudad: form.ciudad || null,
        direccion: form.direccion || null,
        telefono: form.telefono || null,
        google_calendar_id: form.google_calendar_id || null,
      });
      toast.success("Sede creada");
      setForm({ ...VACIO });
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo crear la sede");
    } finally {
      setCreando(false);
    }
  };

  const toggle = async (sede: any) => {
    try {
      await sedesAPI.update(sede.id_sede, { activa: !sede.activa });
      cargar();
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Sedes ({items.length})</h2>

      <form onSubmit={crear} className="bg-gray-50 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nombre</Label>
          <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required minLength={2} />
        </div>
        <div className="space-y-2">
          <Label>Ciudad (opcional)</Label>
          <Input value={form.ciudad} onChange={(e) => setForm({ ...form, ciudad: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Dirección (opcional)</Label>
          <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Teléfono (opcional)</Label>
          <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Google Calendar ID (opcional)</Label>
          <Input value={form.google_calendar_id} onChange={(e) => setForm({ ...form, google_calendar_id: e.target.value })} placeholder="calendario de la sede para sincronización" />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={creando} className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white rounded-full px-8 disabled:opacity-60">
            {creando ? "Creando..." : "Crear sede"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Cargando…</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Sede</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Calendar</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id_sede} className="border-b border-gray-50">
                <td className="px-4 py-3 font-medium text-gray-800">{s.nombre}</td>
                <td className="px-4 py-3 text-gray-600">{s.ciudad || "—"}</td>
                <td className="px-4 py-3 text-gray-600">{s.google_calendar_id ? "✔" : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-3 py-1 rounded-full text-xs ${s.activa ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {s.activa ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="outline" className="rounded-full text-xs px-4 py-1.5" onClick={() => toggle(s)}>
                    {s.activa ? "Desactivar" : "Activar"}
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
