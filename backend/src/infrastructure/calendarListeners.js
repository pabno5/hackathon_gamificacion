/**
 * Listeners de EventBus que sincronizan citas con Google Calendar.
 * Se registran una vez al arranque del server.
 *
 * Patrón Observer: el módulo `citas` emite eventos puros; aquí los
 * traducimos a llamadas a Calendar. Si Calendar está deshabilitado
 * o falla, los listeners son no-op silenciosos.
 */
const calendar = require('./googleCalendar');
const eventBus = require('../shared/events/eventBus');

function registerCalendarListeners(citasRepo) {
  eventBus.onSafe('cita.created', async ({ cita }) => {
    const eventId = await calendar.crearEvento(cita);
    if (eventId) {
      await citasRepo.setGoogleEventId(cita.id_cita, eventId);
      console.log(`[Calendar] evento creado para cita ${cita.id_cita}: ${eventId}`);
    }
  });

  eventBus.onSafe('cita.updated', async ({ cita }) => {
    if (cita.google_calendar_event_id) {
      await calendar.actualizarEvento(cita);
    } else {
      // No tenía evento (Calendar quizás se habilitó después) — crear ahora
      const eventId = await calendar.crearEvento(cita);
      if (eventId) await citasRepo.setGoogleEventId(cita.id_cita, eventId);
    }
  });

  eventBus.onSafe('cita.cancelada', async ({ cita }) => {
    if (cita.google_calendar_event_id && cita.sede?.google_calendar_id) {
      await calendar.eliminarEvento(
        cita.sede.google_calendar_id,
        cita.google_calendar_event_id
      );
      console.log(`[Calendar] evento eliminado para cita ${cita.id_cita}`);
    }
  });

  console.log('[Calendar] listeners de EventBus registrados');
}

module.exports = { registerCalendarListeners };
