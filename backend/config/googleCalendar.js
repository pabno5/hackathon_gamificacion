const { google } = require('googleapis');
require('dotenv').config();

// Configuración de autenticación de Google Calendar
let calendar = null;
let isConfigured = false;

/**
 * Inicializar cliente de Google Calendar
 * Requiere credenciales de Service Account o OAuth2
 */
function initializeCalendar() {
  try {
    // Verificar si las credenciales están configuradas
    if (!process.env.GOOGLE_CALENDAR_CREDENTIALS && !process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      console.warn('⚠️ Google Calendar no configurado. Citas se crearán sin sincronización con Google Calendar.');
      console.warn('⚠️ Para habilitar, configura GOOGLE_CALENDAR_CREDENTIALS o GOOGLE_CALENDAR_CREDENTIALS_PATH en .env');
      return null;
    }

    let auth;

    // Opción 1: Credenciales desde JSON string en .env
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    } 
    // Opción 2: Credenciales desde archivo
    else if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });
    }

    calendar = google.calendar({ version: 'v3', auth });
    isConfigured = true;
    
    console.log('✅ Google Calendar configurado correctamente');
    console.log('📅 Calendar ID:', process.env.GOOGLE_CALENDAR_ID || 'primary');
    
    return calendar;
  } catch (error) {
    console.error('❌ Error al inicializar Google Calendar:', error.message);
    return null;
  }
}

/**
 * Crear evento en Google Calendar
 * @param {Object} citaData - Datos de la cita
 * @returns {Promise<string|null>} - ID del evento creado o null si falla
 */
async function createCalendarEvent(citaData) {
  if (!isConfigured || !calendar) {
    console.log('⚠️ Google Calendar no configurado, saltando creación de evento');
    return null;
  }

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    // Calcular fecha de fin (1 hora después del inicio por defecto)
    const startDate = new Date(citaData.fecha_cita);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

    const event = {
      summary: citaData.motivo || 'Cita médica',
      description: citaData.observaciones || 'Cita médica programada',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: process.env.TIMEZONE || 'America/Bogota',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: process.env.TIMEZONE || 'America/Bogota',
      },
      status: citaData.estado === 'cancelada' ? 'cancelled' : 'confirmed',
      // Metadata personalizada
      extendedProperties: {
        private: {
          citaId: citaData.id_cita,
          idPaciente: citaData.id_paciente,
          idMedico: citaData.id_medico,
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    console.log('✅ Evento creado en Google Calendar:', response.data.id);
    return response.data.id;

  } catch (error) {
    console.error('❌ Error al crear evento en Google Calendar:', error.message);
    return null;
  }
}

/**
 * Actualizar evento en Google Calendar
 * @param {string} eventId - ID del evento en Google Calendar
 * @param {Object} citaData - Datos actualizados de la cita
 * @returns {Promise<boolean>} - true si se actualizó correctamente
 */
async function updateCalendarEvent(eventId, citaData) {
  if (!isConfigured || !calendar || !eventId) {
    return false;
  }

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    const startDate = new Date(citaData.fecha_cita);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = {
      summary: citaData.motivo || 'Cita médica',
      description: citaData.observaciones || 'Cita médica programada',
      start: {
        dateTime: startDate.toISOString(),
        timeZone: process.env.TIMEZONE || 'America/Bogota',
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: process.env.TIMEZONE || 'America/Bogota',
      },
      status: citaData.estado === 'cancelada' ? 'cancelled' : 'confirmed',
    };

    await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      resource: event,
    });

    console.log('✅ Evento actualizado en Google Calendar:', eventId);
    return true;

  } catch (error) {
    console.error('❌ Error al actualizar evento en Google Calendar:', error.message);
    return false;
  }
}

/**
 * Eliminar evento de Google Calendar
 * @param {string} eventId - ID del evento en Google Calendar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
async function deleteCalendarEvent(eventId) {
  if (!isConfigured || !calendar || !eventId) {
    return false;
  }

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });

    console.log('✅ Evento eliminado de Google Calendar:', eventId);
    return true;

  } catch (error) {
    console.error('❌ Error al eliminar evento de Google Calendar:', error.message);
    return false;
  }
}

/**
 * Sincronizar eventos desde Google Calendar
 * @param {Date} timeMin - Fecha mínima para buscar eventos
 * @param {Date} timeMax - Fecha máxima para buscar eventos
 * @returns {Promise<Array>} - Lista de eventos
 */
async function syncFromGoogleCalendar(timeMin, timeMax) {
  if (!isConfigured || !calendar) {
    return [];
  }

  try {
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log(`✅ Sincronizados ${response.data.items.length} eventos desde Google Calendar`);
    return response.data.items || [];

  } catch (error) {
    console.error('❌ Error al sincronizar desde Google Calendar:', error.message);
    return [];
  }
}

// Inicializar al cargar el módulo
initializeCalendar();

module.exports = {
  calendar,
  isConfigured: () => isConfigured,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncFromGoogleCalendar,
};

