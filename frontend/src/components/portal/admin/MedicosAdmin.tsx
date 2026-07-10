import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { medicosAPI, empleadosAPI, especialidadesAPI, sedesAPI } from "../../../service/api";
import { notifyClick } from "../../../lib/progressTracker";

/**
 * Gestión de médicos (ADM-06, A-05). Un médico = un empleado con rol médico +
 * número de licencia; luego se le asignan especialidades y sedes.
 */
export default function MedicosAdmin() {
  const [medicos, setMedicos] = useState<any[]>([]);
  const [empleadosMedicos, setEmpleadosMedicos] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [idEmpleado, setIdEmpleado] = useState("");
  const [licencia, setLicencia] = useState("");
  const [creando, setCreando] = useState(false);

  // Asignaciones por médico
  const [asignEsp, setAsignEsp] = useState<Record<string, string>>({});
  const [asignSede, setAsignSede] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [medRes, empRes, espRes, sedRes] = await Promise.all([
        medicosAPI.getAll(),
        empleadosAPI.getAll(),
        especialidadesAPI.getAll({ activas: "true" }),
        sedesAPI.getAll({ activas: "true" }),
      ]);
      const meds = medRes.data?.data ?? [];
      setMedicos(meds);
      const idsMedico = new Set(meds.map((m: any) => m.id_empleado));
      // Empleados con rol médico que aún no son médicos
      setEmpleadosMedicos((empRes.data?.data ?? []).filter((e: any) => e.rol === "medico" && !idsMedico.has(e.id_empleado)));
      setEspecialidades(espRes.data?.data ?? []);
      setSedes(sedRes.data?.data ?? []);
    } catch {
      toast.error("Error al cargar médicos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idEmpleado) { toast.error("Selecciona un empleado con rol médico"); return; }
    setCreando(true);
    try {
      await medicosAPI.create({ id_empleado: idEmpleado, numero_licencia: licencia });
      toast.success("Médico creado");
      try { notifyClick("A-05"); } catch { /* noop */ }
      setIdEmpleado("");
      setLicencia("");
      cargar();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo crear el médico");
    } finally {
      setCreando(false);
    }
  };

  const asignarEspecialidad = async (idMedico: string) => {
    const idEsp = asignEsp[idMedico];
    if (!idEsp) return;
    try {
      await medicosAPI.asignarEspecialidad(idMedico, idEsp);
      toast.success("Especialidad asignada");
      try { notifyClick("A-05"); } catch { /* noop */ }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo asignar");
    }
  };

  const asignarSede = async (idMedico: string) => {
    const idSede = asignSede[idMedico];
    if (!idSede) return;
    try {
      await medicosAPI.asignarSede(idMedico, idSede);
      toast.success("Sede asignada");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo asignar");
    }
  };

  return (
    <div data-feature-id="A-05">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Médicos ({medicos.length})</h2>

      <form onSubmit={crear} className="bg-gray-50 rounded-2xl p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label>Empleado (rol médico)</Label>
          <Select value={idEmpleado} onValueChange={setIdEmpleado}>
            <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
            <SelectContent>
              {empleadosMedicos.length === 0 ? (
                <SelectItem value="__none" disabled>No hay empleados médicos sin registrar</SelectItem>
              ) : empleadosMedicos.map((e) => (
                <SelectItem key={e.id_empleado} value={e.id_empleado}>{e.nombres} {e.apellidos}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Número de licencia</Label>
          <Input value={licencia} onChange={(e) => setLicencia(e.target.value)} required />
        </div>
        <div>
          <Button type="submit" disabled={creando} className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white rounded-full px-8 disabled:opacity-60">
            {creando ? "Creando..." : "Crear médico"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="p-8 text-center text-gray-400">Cargando…</div>
      ) : medicos.length === 0 ? (
        <div className="p-8 text-center text-gray-400">No hay médicos registrados.</div>
      ) : (
        <div className="space-y-4">
          {medicos.map((m) => (
            <div key={m.id_medico} className="border border-gray-100 rounded-2xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <div className="font-medium text-gray-800">Dr(a). {m.nombres} {m.apellidos}</div>
                  <div className="text-xs text-gray-500">Licencia: {m.numero_licencia}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex gap-2">
                  <Select value={asignEsp[m.id_medico] || ""} onValueChange={(v) => setAsignEsp({ ...asignEsp, [m.id_medico]: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Especialidad" /></SelectTrigger>
                    <SelectContent>
                      {especialidades.map((e) => (
                        <SelectItem key={e.id_especialidad} value={e.id_especialidad}>{e.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="rounded-full px-4 shrink-0" onClick={() => asignarEspecialidad(m.id_medico)}>Asignar</Button>
                </div>
                <div className="flex gap-2">
                  <Select value={asignSede[m.id_medico] || ""} onValueChange={(v) => setAsignSede({ ...asignSede, [m.id_medico]: v })}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Sede" /></SelectTrigger>
                    <SelectContent>
                      {sedes.map((s) => (
                        <SelectItem key={s.id_sede} value={s.id_sede}>{s.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="rounded-full px-4 shrink-0" onClick={() => asignarSede(m.id_medico)}>Asignar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
