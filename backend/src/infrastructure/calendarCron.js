/**
 * Cron de sincronización bidireccional con Google Calendar — por sede.
 *
 * Cada N minutos (default cada 15) recorre las sedes activas y compara
 * los eventos del calendar de cada una contra las citas locales pendientes/confirmadas.
 *
 * Si un evento existía en BD pero no aparece en Google (porque alguien lo borró
 * directamente en Calendar), marcamos la cita como cancelada en BD.
 *
 * No crea citas desde Calendar — la regla de negocio prohíbe agendamiento
 * por fuera del sistema (PRD: solo recepcionistas crean citas).
 */
const cron = require('node-cron');
const { getPool } = require('./db');
const calendar = require('./googleCalendar');

const pool = getPool();

class CalendarCron {
  constructor() {
    this.task = null;
    this.stats = { runs: 0, lastRun: null, cancelledFromExternal: 0 };
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
    this.stats.runs++;
    this.stats.lastRun = new Date().toISOString();
    try {
      const { rows: sedes } = await pool.query(
        "SELECT id_sede, nombre, google_calendar_id FROM sedes WHERE activa = TRUE AND google_calendar_id IS NOT NULL"
      );
      if (sedes.length === 0) return;

      const from = new Date();
      const to = new Date(Date.now() + 30 * 24 * 3600 * 1000);

      for (const sede of sedes) {
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
          [sede.id_sede, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)]
        );

        for (const cita of locales) {
          if (!eventIdsRemotos.has(cita.google_calendar_event_id)) {
            await pool.query(
              `UPDATE citas
                  SET estado = 'cancelada',
                      motivo_cancelacion = 'Cancelada externamente en Google Calendar'
                WHERE id_cita = $1`,
              [cita.id_cita]
            );
            this.stats.cancelledFromExternal++;
            console.log(`[CalendarCron] cita ${cita.id_cita} cancelada (evento removido en Google)`);
          }
        }
      }
    } catch (e) {
      console.error('[CalendarCron] run() falló:', e.message);
    }
  }

  getStats() {
    return { ...this.stats };
  }
}

module.exports = new CalendarCron();
