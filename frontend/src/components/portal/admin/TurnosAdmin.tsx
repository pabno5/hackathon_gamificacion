import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Button } from "../../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { agendaAPI, medicosAPI } from "../../../service/api";

/**
 * Configuración de turnos (BE-02):
 * - Jornada global (default 06:00–17:00) + duración de slot.
 * - Almuerzo por médico.
 * - Bloqueos puntuales por médico (quitar turnos por alguna razón).
 */
export default function TurnosAdmin() {
  const [cfg, setCfg] = useState({ jornada_inicio: "06:00", jornada_fin: "17:00", duracion_slot_min: 30 });
  const [guardandoCfg, setGuardandoCfg] = useState(false);

  const [medicos, setMedicos] = useState<any[]>([]);
  const [idMedico, setIdMedico] = useState("");
  const [almuerzo, setAlmuerzo] = useState({ inicio: "", fin: "" });
  const [bloqueos, setBloqueos] = useState<any[]>([]);
  const [nuevoBloqueo, setNuevoBloqueo] = useState({ fecha: "", hora_inicio: "", hora_fin: "", motivo: "" });

  // Vista de turnos del día (los "turnos registrados" del médico)
  const hoy = new Date().toISOString().slice(0, 10);
  const [fechaTurnos, setFechaTurnos] = useState(hoy);
  const [slotsLibres, setSlotsLibres] = useState<string[] | null>(null);
  const [cargandoTurnos, setCargandoTurnos] = useState(false);

  const hhmm = (t?: string) => (t ? String(t).slice(0, 5) : "");

  // Todos los slots de la jornada (para pintar libres vs ocupados)
  const todosLosSlots = (() => {
    const [hi, mi] = cfg.jornada_inicio.split(":").map(Number);
    const [hf, mf] = cfg.jornada_fin.split(":").map(Number);
    const dur = cfg.duracion_slot_min || 30;
    const out: string[] = [];
    for (let t = hi * 60 + mi; t + dur <= hf * 60 + mf; t += dur) {
      out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
    }
    return out;
  })();

  const cargarTurnos = useCallback(async (id: string, fecha: string) => {
    setCargandoTurnos(true);
    try {
      const res = await agendaAPI.disponibilidad({ id_medico: id, fecha, dias: 1 });
      setSlotsLibres(res.data?.data?.medicos?.[0]?.disponibilidad?.[0]?.slots ?? []);
    } catch {
      setSlotsLibres(null);
      toast.error("No se pudieron cargar los turnos del médico");
    } finally {
      setCargandoTurnos(false);
    }
  }, []);

  useEffect(() => {
    if (idMedico && fechaTurnos) cargarTurnos(idMedico, fechaTurnos);
  }, [idMedico, fechaTurnos, cargarTurnos]);

  const cargarBase = useCallback(async () => {
    try {
      const [cfgRes, medRes] = await Promise.all([agendaAPI.getConfig(), medicosAPI.getAll()]);
      const c = cfgRes.data?.data;
      if (c) setCfg({ jornada_inicio: hhmm(c.jornada_inicio), jornada_fin: hhmm(c.jornada_fin), duracion_slot_min: c.duracion_slot_min });
      setMedicos(medRes.data?.data ?? []);
    } catch {
      toast.error("Error al cargar la configuración de turnos");
    }
  }, []);

  useEffect(() => { cargarBase(); }, [cargarBase]);

  // Al elegir médico: cargar su almuerzo (de la lista) y sus bloqueos
  const cargarMedico = useCallback(async (id: string) => {
    const med = medicos.find((m) => m.id_medico === id);
    setAlmuerzo({ inicio: hhmm(med?.almuerzo_inicio), fin: hhmm(med?.almuerzo_fin) });
    try {
      const res = await agendaAPI.getBloqueos({ id_medico: id });
      setBloqueos(res.data?.data ?? []);
    } catch {
      setBloqueos([]);
    }
  }, [medicos]);

  useEffect(() => { if (idMedico) cargarMedico(idMedico); }, [idMedico, cargarMedico]);

  const guardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoCfg(true);
    try {
      await agendaAPI.updateConfig(cfg);
      toast.success("Jornada actualizada");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo guardar la jornada");
    } finally {
      setGuardandoCfg(false);
    }
  };

  const guardarAlmuerzo = async () => {
    try {
      await agendaAPI.setAlmuerzo(idMedico, {
        almuerzo_inicio: almuerzo.inicio || null,
        almuerzo_fin: almuerzo.fin || null,
      });
      toast.success(almuerzo.inicio ? "Almuerzo guardado" : "Almuerzo quitado");
      cargarBase(); // refresca la lista de médicos con el nuevo almuerzo
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo guardar el almuerzo");
    }
  };

  const agregarBloqueo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agendaAPI.crearBloqueo({ id_medico: idMedico, ...nuevoBloqueo, motivo: nuevoBloqueo.motivo || null });
      toast.success("Bloqueo agregado");
      setNuevoBloqueo({ fecha: "", hora_inicio: "", hora_fin: "", motivo: "" });
      cargarMedico(idMedico);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "No se pudo agregar el bloqueo");
    }
  };

  const quitarBloqueo = async (id: string) => {
    try {
      await agendaAPI.eliminarBloqueo(id);
      toast.success("Bloqueo eliminado");
      cargarMedico(idMedico);
    } catch {
      toast.error("No se pudo eliminar el bloqueo");
    }
  };

  return (
    <div>
      {/* Jornada global */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Jornada general</h2>
      <form onSubmit={guardarConfig} className="bg-gray-50 rounded-2xl p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2">
          <Label>Inicio</Label>
          <Input type="time" value={cfg.jornada_inicio} onChange={(e) => setCfg({ ...cfg, jornada_inicio: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Fin</Label>
          <Input type="time" value={cfg.jornada_fin} onChange={(e) => setCfg({ ...cfg, jornada_fin: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Duración de cita (min)</Label>
          <Input type="number" min={5} max={240} value={cfg.duracion_slot_min} onChange={(e) => setCfg({ ...cfg, duracion_slot_min: parseInt(e.target.value, 10) || 30 })} />
        </div>
        <div>
          <Button type="submit" disabled={guardandoCfg} className="bg-gradient-to-r from-[#01EDDF] to-[#03D4D9] text-white rounded-full px-8 disabled:opacity-60">
            {guardandoCfg ? "Guardando..." : "Guardar jornada"}
          </Button>
        </div>
      </form>

      {/* Configuración por médico */}
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuración por médico</h2>
      <div className="mb-6 max-w-md">
        <Label>Médico</Label>
        <Select value={idMedico} onValueChange={setIdMedico}>
          <SelectTrigger><SelectValue placeholder="Selecciona un médico" /></SelectTrigger>
          <SelectContent>
            {medicos.length === 0 ? (
              <SelectItem value="__none" disabled>No hay médicos registrados</SelectItem>
            ) : medicos.map((m) => (
              <SelectItem key={m.id_medico} value={m.id_medico}>Dr(a). {m.nombres} {m.apellidos}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {idMedico && (
        <div className="space-y-8">
          {/* Turnos del día: grilla libre/ocupado calculada con la jornada global
              y la disponibilidad real del médico (almuerzo, bloqueos y citas). */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Turnos del día</h3>
            <div className="flex gap-4 items-end mb-4" style={{ flexWrap: "wrap" }}>
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" value={fechaTurnos} onChange={(e) => setFechaTurnos(e.target.value)} />
              </div>
              <div className="flex gap-3 items-center text-xs text-gray-500 pb-2">
                <span className="flex items-center gap-1">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: "#03D4D9", display: "inline-block" }} /> Libre
                </span>
                <span className="flex items-center gap-1">
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: "#d1d5db", display: "inline-block" }} /> No disponible
                </span>
              </div>
            </div>
            {cargandoTurnos ? (
              <p className="text-sm text-gray-400">Cargando turnos...</p>
            ) : slotsLibres === null ? (
              <p className="text-sm text-gray-400">No se pudo consultar la disponibilidad.</p>
            ) : todosLosSlots.length === 0 ? (
              <p className="text-sm text-gray-400">La jornada configurada no genera turnos.</p>
            ) : (
              <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                {todosLosSlots.map((s) => {
                  const libre = slotsLibres.includes(s);
                  return (
                    <span
                      key={s}
                      title={libre ? "Turno libre" : "Ocupado, almuerzo o bloqueado"}
                      className="text-sm px-4 py-2 rounded-full"
                      style={{
                        background: libre ? "#03D4D9" : "#e5e7eb",
                        color: libre ? "#fff" : "#9ca3af",
                      }}
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Cada turno dura {cfg.duracion_slot_min} min. Los grises están tomados por citas, almuerzo o bloqueos.
            </p>
          </div>

          {/* Almuerzo */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Hora de almuerzo</h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-2">
                <Label>Inicio</Label>
                <Input type="time" value={almuerzo.inicio} onChange={(e) => setAlmuerzo({ ...almuerzo, inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fin</Label>
                <Input type="time" value={almuerzo.fin} onChange={(e) => setAlmuerzo({ ...almuerzo, fin: e.target.value })} />
              </div>
              <Button onClick={guardarAlmuerzo} className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full px-6">Guardar almuerzo</Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => { setAlmuerzo({ inicio: "", fin: "" }); }}>Limpiar</Button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Deja ambos vacíos y guarda para quitar el almuerzo.</p>
          </div>

          {/* Bloqueos */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="text-sm uppercase tracking-wide text-gray-500 mb-3">Bloqueos (quitar turnos)</h3>
            <form onSubmit={agregarBloqueo} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end mb-4">
              <div className="space-y-1">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={nuevoBloqueo.fecha} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, fecha: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="time" value={nuevoBloqueo.hora_inicio} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, hora_inicio: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="time" value={nuevoBloqueo.hora_fin} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, hora_fin: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Motivo</Label>
                <Input value={nuevoBloqueo.motivo} onChange={(e) => setNuevoBloqueo({ ...nuevoBloqueo, motivo: e.target.value })} placeholder="Opcional" />
              </div>
              <Button type="submit" className="bg-[#03D4D9] hover:bg-[#01EDDF] text-white rounded-full">Agregar</Button>
            </form>

            {bloqueos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin bloqueos para este médico.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
                    <th className="py-2 px-3">Fecha</th>
                    <th className="py-2 px-3">Horario</th>
                    <th className="py-2 px-3">Motivo</th>
                    <th className="py-2 px-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {bloqueos.map((b) => (
                    <tr key={b.id_bloqueo} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-700">{String(b.fecha).slice(0, 10)}</td>
                      <td className="py-2 px-3 text-gray-700">{hhmm(b.hora_inicio)}–{hhmm(b.hora_fin)}</td>
                      <td className="py-2 px-3 text-gray-500">{b.motivo || "—"}</td>
                      <td className="py-2 px-3 text-right">
                        <Button variant="outline" className="rounded-full text-xs px-4 py-1" onClick={() => quitarBloqueo(b.id_bloqueo)}>Quitar</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
