/**
 * Cron de sincronización con Google Calendar — por sede.
 *
 * Cada N minutos (default cada 15) recorre las sedes activas y compara
 * los eventos del calendar de cada una contra las citas locales pendientes/confirmadas.
 *
 * Si un evento existía en BD pero ya no existe en Google (alguien lo borró
 * directamente en Calendar), marcamos la cita como cancelada en BD.
 *
 * No crea citas desde Calendar — la regla de negocio prohíbe agendamiento
 * por fuera del sistema (PRD: solo recepcionistas crean citas).
 *
 * Salvaguardas (cancelar una cita por error es grave):
 *  - Si Google falla al listar (red, credenciales rotadas, cuota), la sede se
 *    omite en esa corrida. Antes un fallo devolvía lista vacía y TODAS las
 *    citas de los próximos 30 días se cancelaban.
 *  - Cada cita "faltante" se confirma una a una contra Google antes de cancelar.
 *  - Si en una sede faltan casi todas las citas, se asume un problema de
 *    configuración (p. ej. cambió el calendar_id) y no se cancela nada.
 */
const cron = require('node-cron');
const { getPool } = require('./db');
const calendar = require('./googleCalendar');
const { hoyEnZona, sumarDias } = require('../shared/utils/fechas');

const pool = getPool();

const DIAS_VENTANA = 30;
// Con al menos este número de citas, si faltan más de la mitad no se cancela.
const MIN_CITAS_PARA_GUARDA = 4;

class CalendarCron {
  constructor() {
    this.task = null;
    this.running = false;
    this.stats = { runs: 0, lastRun: null, cancelledFromExternal: 0, skipped: 0 };
  }

  start(cronExpression = '*/15 * * * *') {
    if (this.task) return;
    if (!calendar.isEnabled()) {
      console.log('[CalendarCron] deshabilitado (Calendar no configurado)');
      return;
    }
    this.task = cron.schedule(cronExpression, () => this.run());
    console.log(`[CalendarCron] iniciado: ${cronExpression}`);
  }

  stop() {
    if (this.task) { this.task.stop(); this.task = null; }
  }

  async run() {
    if (this.running) return; // no solapar corridas
    this.running = true;
    this.stats.runs++;
    this.stats.lastRun = new Date().toISOString();
    try {
      const { rows: sedes } = await pool.query(
        "SELECT id_sede, nombre, google_calendar_id FROM sedes WHERE activa = TRUE AND google_calendar_id IS NOT NULL"
      );
      if (sedes.length === 0) return;

      // Fechas en la zona de la clínica (no en UTC del servidor).
      const hoy = hoyEnZona();
      const hasta = sumarDias(hoy, DIAS_VENTANA);
      // Ventana remota más amplia que la local: incluye las citas de hoy que ya
      // pasaron (Google filtra por hora de fin) y un día de margen al final.
      const from = new Date(Date.now() - 24 * 3600 * 1000);
      const to = new Date(Date.now() + (DIAS_VENTANA + 2) * 24 * 3600 * 1000);

      for (const sede of sedes) {
        try {
          await this.#sincronizarSede(sede, { hoy, hasta, from, to });
        } catch (e) {
          this.stats.skipped++;
          console.error(`[CalendarCron] sede "${sede.nombre}" omitida:`, e.message);
        }
      }
    } catch (e) {
      console.error('[CalendarCron] run() falló:', e.message);
    } finally {
      this.running = false;
    }
  }

  async #sincronizarSede(sede, { hoy, hasta, from, to }) {
    // Lanza si Google falla → la sede se omite (ver run()).
    const eventos = await calendar.listarEventos(sede.google_calendar_id, { from, to });
    const eventIdsRemotos = new Set(eventos.map((e) => e.id));

    const { rows: locales } = await pool.query(
      `SELECT id_cita, google_calendar_event_id
         FROM citas
        WHERE id_sede = $1
          AND deleted_at IS NULL
          AND estado IN ('pendiente', 'confirmada')
          AND google_calendar_event_id IS NOT NULL
          AND fecha_cita BETWEEN $2 AND $3`,
      [sede.id_sede, hoy, hasta]
    );

    const faltantes = locales.filter((c) => !eventIdsRemotos.has(c.google_calendar_event_id));
    if (faltantes.length === 0) return;

    if (locales.length >= MIN_CITAS_PARA_GUARDA && faltantes.length > locales.length / 2) {
      this.stats.skipped++;
      console.warn(
        `[CalendarCron] sede "${sede.nombre}": faltan ${faltantes.length} de ${locales.length} ` +
        'eventos en Google. Parece un problema de configuración (¿cambió el calendario?). ' +
        'No se cancela ninguna cita; revisar manualmente.'
      );
      return;
    }

    for (const cita of faltantes) {
      // Confirmar una a una: solo se cancela si Google dice que el evento no existe.
      const existe = await calendar.eventoExiste(sede.google_calendar_id, cita.google_calendar_event_id);
      if (existe) continue;

      const { rowCount } = await pool.query(
        `UPDATE citas
            SET estado = 'cancelada',
                motivo_cancelacion = 'Cancelada externamente en Google Calendar'
          WHERE id_cita = $1
            AND estado IN ('pendiente', 'confirmada')`,
        [cita.id_cita]
      );
      if (rowCount > 0) {
        this.stats.cancelledFromExternal++;
        console.log(`[CalendarCron] cita ${cita.id_cita} cancelada (evento removido en Google)`);
      }
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = new CalendarCron();
