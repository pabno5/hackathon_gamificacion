const { google } = require('googleapis');
require('dotenv').config();

// Configuración de autenticación de Google Calendar
let calendar = null;
let isConfigured = false;

/**
 * Obtener offset de zona horaria en minutos
 * @param {string} timezone - Zona horaria (ej: 'America/Bogota')
 * @returns {number} - Offset en minutos
 */
function getTimezoneOffset(timezone) {
  // Offset de zonas horarias comunes (en minutos desde UTC)
  const timezoneOffsets = {
    'America/Bogota': -300,      // UTC-5 (Colombia)
    'America/New_York': -300,    // UTC-5 (EST) / UTC-4 (EDT)
    'America/Chicago': -360,     // UTC-6 (CST) / UTC-5 (CDT)
    'America/Denver': -420,      // UTC-7 (MST) / UTC-6 (MDT)
    'America/Los_Angeles': -480, // UTC-8 (PST) / UTC-7 (PDT)
    'America/Mexico_City': -360, // UTC-6
    'America/Lima': -300,        // UTC-5 (Perú)
    'America/Argentina/Buenos_Aires': -180, // UTC-3
    'Europe/Madrid': 60,         // UTC+1 (CET) / UTC+2 (CEST)
    'Europe/London': 0,          // UTC+0 (GMT) / UTC+1 (BST)
    'UTC': 0,
  };
  
  return timezoneOffsets[timezone] || -300; // Por defecto Colombia (UTC-5)
}

/**
 * Formatear fecha para Google Calendar
 * Si la fecha ya viene en formato local (sin Z), la retorna tal cual
 * Si viene en UTC (con Z), la convierte a la zona horaria especificada
 * @param {string|Date} dateInput - Fecha a formatear
 * @param {string} timezone - Zona horaria destino
 * @returns {string} - Fecha en formato YYYY-MM-DDTHH:mm:ss (sin Z)
 */
function formatDateForCalendar(dateInput, timezone) {
  // Si es un string sin 'Z' al final, ya está en formato local
  if (typeof dateInput === 'string' && !dateInput.endsWith('Z')) {
    // Ya está en formato correcto: "2025-10-29T14:07:00"
    return dateInput;
  }
  
  // Si es un Date o string con Z, convertir desde UTC
  const date = new Date(dateInput);
  
  // Extraer componentes directamente sin conversión
  // Como la fecha viene sin Z, JavaScript la trata como hora local
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

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
    let credentials;

    // Opción 1: Credenciales desde JSON string en .env
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      console.log('📄 Cargando credenciales desde GOOGLE_CALENDAR_CREDENTIALS...');
      
      try {
        credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
      } catch (parseError) {
        throw new Error('❌ Error al parsear GOOGLE_CALENDAR_CREDENTIALS: ' + parseError.message + 
          '\n💡 Asegúrate de que el JSON esté en una sola línea y entre comillas simples en .env');
      }

      // Validar campos requeridos
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('❌ Las credenciales deben ser de tipo "service_account"');
      }
      if (!credentials.private_key) {
        throw new Error('❌ Falta el campo "private_key" en las credenciales');
      }
      if (!credentials.client_email) {
        throw new Error('❌ Falta el campo "client_email" en las credenciales');
      }

      // Verificar formato de la clave privada
      if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
        throw new Error('❌ La private_key no tiene el formato correcto. Debe contener "-----BEGIN PRIVATE KEY-----"');
      }

      // Asegurar que los saltos de línea estén correctos
      // Si la clave no tiene \n literales, no funcionará
      if (!credentials.private_key.includes('\\n') && !credentials.private_key.includes('\n')) {
        throw new Error('❌ La private_key debe contener saltos de línea (\\n)');
      }

      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      console.log('✅ Credenciales cargadas desde variable de entorno');
      console.log('   - Service Account:', credentials.client_email);
    } 
    // Opción 2: Credenciales desde archivo (RECOMENDADO)
    else if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      console.log('📁 Cargando credenciales desde archivo:', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
      
      const fs = require('fs');
      const path = require('path');
      
      // Resolver ruta relativa
      const credentialsPath = path.resolve(__dirname, '..', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
      
      // Verificar que el archivo existe
      if (!fs.existsSync(credentialsPath)) {
        throw new Error(`❌ Archivo de credenciales no encontrado: ${credentialsPath}\n💡 Verifica la ruta en GOOGLE_CALENDAR_CREDENTIALS_PATH`);
      }

      try {
        const fileContent = fs.readFileSync(credentialsPath, 'utf8');
        credentials = JSON.parse(fileContent);
      } catch (readError) {
        throw new Error(`❌ Error al leer o parsear el archivo de credenciales: ${readError.message}`);
      }

      // Validar campos requeridos
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('❌ Las credenciales deben ser de tipo "service_account"');
      }
      if (!credentials.private_key) {
        throw new Error('❌ Falta el campo "private_key" en las credenciales');
      }
      if (!credentials.client_email) {
        throw new Error('❌ Falta el campo "client_email" en las credenciales');
      }

      auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/calendar'],
      });

      console.log('✅ Credenciales cargadas desde archivo');
      console.log('   - Service Account:', credentials.client_email);
    }

    calendar = google.calendar({ version: 'v3', auth });
    isConfigured = true;
    
    console.log('✅ Google Calendar configurado correctamente');
    console.log('📅 Calendar ID:', process.env.GOOGLE_CALENDAR_ID || 'primary');
    console.log('🌍 Timezone:', process.env.TIMEZONE || 'America/Bogota');
    console.log('\n💡 Prueba la configuración ejecutando: node test-google-calendar.js\n');
    
    return calendar;
  } catch (error) {
    console.error('\n❌ Error al inicializar Google Calendar:', error.message);
    console.error('📖 Lee backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md para solucionar el problema\n');
    
    // Si hay un error, marcamos como no configurado
    isConfigured = false;
    calendar = null;
    
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
    const timezone = process.env.TIMEZONE || 'America/Bogota';
    
    // La fecha viene del frontend en formato local: "2025-10-29T14:07:00"
    // Calcular fecha de fin (1 hora después)
    const startDate = new Date(citaData.fecha_cita);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    // Formatear ambas fechas
    const startFormatted = formatDateForCalendar(citaData.fecha_cita, timezone);
    const endFormatted = formatDateForCalendar(endDate, timezone);

    const event = {
      summary: citaData.motivo || 'Cita médica',
      description: citaData.observaciones || 'Cita médica programada',
      start: {
        dateTime: startFormatted,
        timeZone: timezone,
      },
      end: {
        dateTime: endFormatted,
        timeZone: timezone,
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
    
    // Mensajes de ayuda específicos según el tipo de error
    if (error.message.includes('invalid_grant') || error.message.includes('Invalid JWT')) {
      console.error('💡 Problema con las credenciales. Ejecuta: node test-google-calendar.js');
      console.error('📖 Lee: backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md');
    } else if (error.message.includes('Calendar not found') || error.message.includes('404')) {
      console.error('💡 El calendario no existe o no está compartido con el Service Account');
      console.error('📖 Comparte el calendario con:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '[tu-service-account]');
    } else if (error.message.includes('Calendar API has not been used')) {
      console.error('💡 Habilita Google Calendar API en Google Cloud Console');
    }
    
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
    const timezone = process.env.TIMEZONE || 'America/Bogota';
    
    const startDate = new Date(citaData.fecha_cita);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
    
    const startFormatted = formatDateForCalendar(citaData.fecha_cita, timezone);
    const endFormatted = formatDateForCalendar(endDate, timezone);

    const event = {
      summary: citaData.motivo || 'Cita médica',
      description: citaData.observaciones || 'Cita médica programada',
      start: {
        dateTime: startFormatted,
        timeZone: timezone,
      },
      end: {
        dateTime: endFormatted,
        timeZone: timezone,
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
    
    if (error.message.includes('invalid_grant') || error.message.includes('Invalid JWT')) {
      console.error('💡 Problema con las credenciales. Ejecuta: node test-google-calendar.js');
    }
    
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
    
    if (error.message.includes('invalid_grant') || error.message.includes('Invalid JWT')) {
      console.error('💡 Problema con las credenciales. Ejecuta: node test-google-calendar.js');
    }
    
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
    
    if (error.message.includes('invalid_grant') || error.message.includes('Invalid JWT')) {
      console.error('💡 Problema con las credenciales. Ejecuta: node test-google-calendar.js');
      console.error('📖 Lee: backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md');
    }
    
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

