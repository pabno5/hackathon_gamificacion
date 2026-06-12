/**
 * Cliente Google Calendar agnóstico de sede.
 *
 * El calendar_id se pasa POR LLAMADA — cada sede tiene el suyo.
 * Las credenciales del Service Account son globales (de la clínica).
 *
 * Si Calendar no está configurado (sin credenciales), todos los métodos
 * son no-op y retornan null sin fallar — la app sigue funcionando.
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let client = null;
let initialized = false;
const TIMEZONE = process.env.TIMEZONE || 'America/Bogota';

function initialize() {
  if (initialized) return client;
  initialized = true;
  try {
    let auth;
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      const creds = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials: creds,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } else if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      const credPath = path.resolve(
        __dirname, '..', '..', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH
      );
      if (!fs.existsSync(credPath)) {
        console.warn('[Calendar] credenciales no encontradas en', credPath);
        return null;
      }
      auth = new google.auth.GoogleAuth({
        keyFile: credPath,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } else {
      console.warn('[Calendar] sin credenciales — sync deshabilitado');
      return null;
    }
    client = google.calendar({ version: 'v3', auth });
    console.log('[Calendar] cliente inicializado (per-sede)');
    return client;
  } catch (e) {
    console.error('[Calendar] init falló:', e.message);
    return null;
  }
}

function isEnabled() {
  if (!initialized) initialize();
  return !!client;
}

function combinarFechaHora(fecha, hora) {
  // fecha: 'YYYY-MM-DD', hora: 'HH:MM' o 'HH:MM:SS'
  const horaPad = hora.length === 5 ? `${hora}:00` : hora;
  return `${fecha}T${horaPad}`;
}

/**
 * Crea evento en el calendar de la sede de la cita.
 * Retorna el event_id de Google o null si Calendar no está habilitado o fallaron las credenciales.
 *
 * `cita` debe traer `.sede.google_calendar_id` (lo da SELECT_CITA_COMPLETA).
 */
async function crearEvento(cita) {
  if (!isEnabled()) return null;
  const calendarId = cita.sede?.google_calendar_id;
  if (!calendarId) {
    console.warn(`[Calendar] sede sin google_calendar_id, omito evento cita=${cita.id_cita}`);
    return null;
  }

  try {
    const startDateTime = combinarFechaHora(cita.fecha_cita, cita.hora_inicio);
    const endDateTime = combinarFechaHora(cita.fecha_cita, cita.hora_fin);

    const summary = `${cita.paciente.nombres} ${cita.paciente.apellidos}`
      + (cita.especialidad ? ` — ${cita.especialidad.nombre}` : '');

    const event = {
      summary,
      description: cita.motivo || '',
      start: { dateTime: startDateTime, timeZone: TIMEZONE },
      end:   { dateTime: endDateTime,   timeZone: TIMEZONE },
      status: cita.estado === 'cancelada' ? 'cancelled' : 'confirmed',
      extendedProperties: {
        private: {
          citaId: cita.id_cita,
          idPaciente: cita.id_paciente,
          idMedico: cita.id_medico,
          idSede: cita.id_sede,
          canal: cita.canal,
        },
      },
    };

    const { data } = await client.events.insert({ calendarId, resource: event });
    return data.id;
  } catch (e) {
    console.error('[Calendar] crearEvento falló:', e.message);
    return null;
  }
}

async function actualizarEvento(cita) {
  if (!isEnabled() || !cita.google_calendar_event_id) return false;
  const calendarId = cita.sede?.google_calendar_id;
  if (!calendarId) return false;

  try {
    const startDateTime = combinarFechaHora(cita.fecha_cita, cita.hora_inicio);
    const endDateTime = combinarFechaHora(cita.fecha_cita, cita.hora_fin);
    const summary = `${cita.paciente.nombres} ${cita.paciente.apellidos}`
      + (cita.especialidad ? ` — ${cita.especialidad.nombre}` : '');

    await client.events.update({
      calendarId,
      eventId: cita.google_calendar_event_id,
      resource: {
        summary,
        description: cita.motivo || '',
        start: { dateTime: startDateTime, timeZone: TIMEZONE },
        end:   { dateTime: endDateTime,   timeZone: TIMEZONE },
        status: cita.estado === 'cancelada' ? 'cancelled' : 'confirmed',
      },
    });
    return true;
  } catch (e) {
    console.error('[Calendar] actualizarEvento falló:', e.message);
    return false;
  }
}

async function eliminarEvento(calendarId, eventId) {
  if (!isEnabled() || !calendarId || !eventId) return false;
  try {
    await client.events.delete({ calendarId, eventId });
    return true;
  } catch (e) {
    // 410 = ya cancelado, OK
    if (e.code === 410) return true;
    console.error('[Calendar] eliminarEvento falló:', e.message);
    return false;
  }
}

async function listarEventos(calendarId, { from, to } = {}) {
  if (!isEnabled() || !calendarId) return [];
  try {
    const timeMin = from ? new Date(from).toISOString() : new Date().toISOString();
    const timeMax = to
      ? new Date(to).toISOString()
      : new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const { data } = await client.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return data.items || [];
  } catch (e) {
    console.error('[Calendar] listarEventos falló:', e.message);
    return [];
  }
}

module.exports = {
  isEnabled,
  crearEvento,
  actualizarEvento,
  eliminarEvento,
  listarEventos,
};
