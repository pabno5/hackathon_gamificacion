const { google } = require('googleapis');
require('dotenv').config();

async function testGoogleCalendar() {
  try {
    console.log('🔧 Probando Google Calendar API...\n');

    // Cargar credenciales
    let credentials;
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      console.log('📄 Usando GOOGLE_CALENDAR_CREDENTIALS');
      try {
        credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
      } catch (e) {
        throw new Error('❌ El JSON en GOOGLE_CALENDAR_CREDENTIALS está mal formateado: ' + e.message);
      }
    } else if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      console.log('📁 Usando GOOGLE_CALENDAR_CREDENTIALS_PATH:', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
      try {
        credentials = require(process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
      } catch (e) {
        throw new Error('❌ No se pudo cargar el archivo de credenciales: ' + e.message);
      }
    } else {
      throw new Error('❌ No hay credenciales configuradas. Define GOOGLE_CALENDAR_CREDENTIALS o GOOGLE_CALENDAR_CREDENTIALS_PATH en .env');
    }

    console.log('✅ Credenciales cargadas');
    console.log('   - Type:', credentials.type);
    console.log('   - Project ID:', credentials.project_id);
    console.log('   - Client Email:', credentials.client_email);
    console.log('   - Private Key:', credentials.private_key ? 'Presente ✓' : 'Faltante ✗');
    
    if (!credentials.private_key) {
      throw new Error('❌ Falta la private_key en las credenciales');
    }

    if (!credentials.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('❌ La private_key no tiene el formato correcto');
    }

    // Crear cliente
    console.log('\n🔑 Creando cliente de autenticación...');
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    console.log('✅ Cliente creado');
    console.log('\n🔍 Intentando listar eventos del calendario:', calendarId);

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    console.log('\n✅ ¡ÉXITO! Google Calendar API funciona correctamente');
    console.log(`📅 Eventos encontrados: ${response.data.items.length}`);
    
    if (response.data.items.length > 0) {
      console.log('\n📋 Primeros eventos:');
      response.data.items.slice(0, 3).forEach(event => {
        const start = event.start.dateTime || event.start.date;
        console.log(`  - ${event.summary} (${start})`);
      });
    } else {
      console.log('\n📋 No hay eventos en los próximos 7 días');
    }

    console.log('\n✨ Todo está configurado correctamente. Puedes iniciar tu servidor backend.');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('Invalid JWT') || error.message.includes('invalid_grant')) {
      console.error('\n💡 Causa probable: Credenciales incorrectas o mal formateadas');
      console.error('\n🔧 Solución:');
      console.error('   1. Descarga NUEVAS credenciales JSON desde Google Cloud Console');
      console.error('   2. Ve a: https://console.cloud.google.com/');
      console.error('   3. APIs & Services → Credentials → Service Account → Manage keys');
      console.error('   4. Add Key → Create new key → JSON');
      console.error('   5. Guarda el archivo en: backend/credentials/google-calendar-credentials.json');
      console.error('   6. En tu .env, usa:');
      console.error('      GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json');
      console.error('\n📖 Lee backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md para más detalles');
    } else if (error.message.includes('Calendar not found') || error.message.includes('404')) {
      console.error('\n💡 Causa: El calendario no existe o no está compartido con el Service Account');
      console.error('\n🔧 Solución:');
      console.error('   1. Ve a Google Calendar');
      console.error('   2. Settings del calendario → Share with specific people');
      console.error('   3. Agrega:', credentials?.client_email || '[tu-service-account-email]');
      console.error('   4. Dale permisos de "Make changes to events"');
    } else if (error.message.includes('Calendar API has not been used')) {
      console.error('\n💡 Causa: Google Calendar API no está habilitada');
      console.error('\n🔧 Solución:');
      console.error('   1. Ve a: https://console.cloud.google.com/');
      console.error('   2. APIs & Services → Library');
      console.error('   3. Busca "Google Calendar API"');
      console.error('   4. Click en "Enable"');
    } else {
      console.error('\n📖 Para más ayuda, lee: backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md');
    }
    
    process.exit(1);
  }
}

testGoogleCalendar();

