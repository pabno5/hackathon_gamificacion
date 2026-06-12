/**
 * EventBus interno (Observer pattern).
 *
 * Permite a los services emitir eventos sin saber quién escucha:
 *   eventBus.emit('cita.created', { cita, empleadoId });
 *
 * Los listeners (audit, google calendar sync, notificaciones) se registran
 * una sola vez al arranque del server. Si un listener falla, no afecta
 * a los demás ni al request original (los handlers se ejecutan async).
 *
 * Convención de eventos:
 *   - 'cita.created' / 'cita.updated' / 'cita.cancelada'
 *   - 'historia.created' / 'historia.updated'
 *   - 'paciente.created' / 'paciente.updated' / 'paciente.deleted'
 *   - 'empleado.created' / 'empleado.desactivado'
 *   - 'tour.completado'
 *
 * Nota: los triggers de Postgres ya cubren auditoría a nivel BD (audit_log).
 * EventBus es para integraciones laterales (Calendar, notificaciones, etc.)
 * que no caben en un trigger SQL.
 */
const { EventEmitter } = require('events');

class EventBus extends EventEmitter {
  static #instance = null;

  constructor() {
    super();
    this.setMaxListeners(50);
    this.on('error', (err) => {
      console.error('[EventBus] Listener error:', err);
    });
  }

  static getInstance() {
    if (!EventBus.#instance) EventBus.#instance = new EventBus();
    return EventBus.#instance;
  }

  /**
   * Wrapper que log-y-swallow errores de listeners async,
   * para que un listener roto no haga crash al server.
   */
  onSafe(event, handler) {
    this.on(event, async (...args) => {
      try {
        await handler(...args);
      } catch (err) {
        console.error(`[EventBus] handler of "${event}" failed:`, err.message);
      }
    });
  }
}

module.exports = EventBus.getInstance();
