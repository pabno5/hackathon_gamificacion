import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { empleadosAPI } from "../../../service/api";
import { notifyClick } from "../../../lib/progressTracker";

/** Gestión de empleados (ADM-01/02/03, A-03). */
const VACIO = {
  tipo_documento: "CC",
  numero_documento: "",
  nombres: "",
  apellidos: "",
  correo: "",
  password: "",
  rol: "recepcionista",
  telefono: "",
};

export default function EmpleadosAdmin() {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...VACIO });
  const [creando, setCreando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await empleadosAPI.getAll();
      setEmpleados(res.data?.data ?? []);
    } catch {
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreando(true);
    try {
      await empleadosAPI.create({
        ...form,
        telefono: form.telefono || null,
      });
      toast.success("Empleado creado");
      try { notifyClick("A-03"); } catch { /* noop */ }
      setForm({ ...VACIO });
      setMostrarForm(false);
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo crear el empleado");
    } finally {
      setCreando(false);
    }
  };

  const toggleActivo = async (emp: any) => {
    try {
      if (emp.activo) await empleadosAPI.desactivar(emp.id_empleado);
      else await empleadosAPI.reactivar(emp.id_empleado);
      toast.success(emp.activo ? "Empleado desactivado" : "Empleado reactivado");
      cargar();
    } catch {
      toast.error("No se pudo cambiar el estado");
    }
  };

  const reiniciarTour = async (emp: any) => {
    if (!window.confirm(`¿Reiniciar el tour de ${emp.nombres} ${emp.apellidos}?`)) return;
    try {
      await empleadosAPI.reiniciarTour(emp.id_empleado, "Reactivado desde gestión de empleados");
      toast.success("Tour reiniciado");
    } catch {
      toast.error("No se pudo reiniciar el tour");
    }
  };

  return (
    <div data-feature-id="A-03">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Empleados ({empleados.length})</h2>
        <Button
          className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6"
          onClick={() => setMostrarForm((v) => !v)}
        >
          {mostrarForm ? "Cerrar" : "Nuevo empleado"}
        </Button>
      </div>

      {mostrarForm && (
        <form onSubmit={crear} className="bg-gray-50 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de documento</Label>
            <Select value={form.tipo_documento} onValueChange={(v) => setForm({ ...form, tipo_documento: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CC">C.C.</SelectItem>
                <SelectItem value="TI">T.I.</SelectItem>
                <SelectItem value="CE">C.E.</SelectItem>
                <SelectItem value="PAS">Pasaporte</SelectItem>
                <SelectItem value="NIT">NIT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Número de documento</Label>
            <Input value={form.numero_documento} onChange={(e) => setForm({ ...form, numero_documento: e.target.value })} required minLength={5} />
          </div>
          <div className="space-y-2">
            <Label>Nombres</Label>
            <Input value={form.nombres} onChange={(e) => setForm({ ...form, nombres: e.target.value })} required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label>Apellidos</Label>
            <Input value={form.apellidos} onChange={(e) => setForm({ ...form, apellidos: e.target.value })} required minLength={2} />
          </div>
          <div className="space-y-2">
            <Label>Correo</Label>
            <Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Contraseña temporal</Label>
            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="Mínimo 8 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={form.rol} onValueChange={(v) => setForm({ ...form, rol: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recepcionista">Recepcionista</SelectItem>
                <SelectItem value="medico">Médico</SelectItem>
                <SelectItem value="admin">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Teléfono (opcional)</Label>
            <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={creando} className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white rounded-full px-8 disabled:opacity-60">
              {creando ? "Creando..." : "Crear empleado"}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((e) => (
                <tr key={e.id_empleado} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{e.nombres} {e.apellidos}</div>
                    <div className="text-xs text-gray-500">{e.correo}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.rol}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs ${e.activo ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {e.activo ? "Activo" : "Desactivado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <Button variant="outline" className="rounded-full text-xs px-4 py-1.5" onClick={() => reiniciarTour(e)}>
                      Reiniciar tour
                    </Button>
                    <Button variant="outline" className="rounded-full text-xs px-4 py-1.5" onClick={() => toggleActivo(e)}>
                      {e.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
