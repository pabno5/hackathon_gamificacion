/**
 * Script para convertir credenciales JSON de Google Calendar a formato de variable de entorno
 * 
 * Uso:
 *   node convert-credentials-to-env.js ruta/al/archivo.json
 * 
 * Este script toma un archivo JSON de credenciales y lo convierte a un string
 * que puedes copiar directamente en tu archivo .env
 */

const fs = require('fs');
const path = require('path');

function convertCredentialsToEnv(filePath) {
  try {
    console.log('🔧 Convirtiendo credenciales JSON a formato de variable de entorno...\n');

    // Verificar que el archivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`❌ Archivo no encontrado: ${filePath}`);
    }

    // Leer el archivo
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parsear para validar que es JSON válido
    let credentials;
    try {
      credentials = JSON.parse(fileContent);
    } catch (e) {
      throw new Error(`❌ El archivo no es un JSON válido: ${e.message}`);
    }

    // Validar que es una Service Account
    if (!credentials.type || credentials.type !== 'service_account') {
      throw new Error('❌ Las credenciales deben ser de tipo "service_account"');
    }

    if (!credentials.private_key) {
      throw new Error('❌ Falta el campo "private_key" en las credenciales');
    }

    if (!credentials.client_email) {
      throw new Error('❌ Falta el campo "client_email" en las credenciales');
    }

    // Convertir a string en una sola línea (esto es lo importante)
    const credentialsString = JSON.stringify(credentials);

    console.log('✅ Credenciales validadas:');
    console.log('   - Type:', credentials.type);
    console.log('   - Project ID:', credentials.project_id);
    console.log('   - Client Email:', credentials.client_email);
    console.log('   - Private Key:', credentials.private_key ? 'Presente ✓' : 'Faltante ✗');

    console.log('\n📋 Copia y pega esto en tu archivo .env:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`GOOGLE_CALENDAR_CREDENTIALS='${credentialsString}'`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n⚠️ IMPORTANTE:');
    console.log('   - Usa comillas SIMPLES (\') alrededor del JSON');
    console.log('   - NO uses comillas dobles (") alrededor del JSON');
    console.log('   - El JSON debe estar en UNA SOLA LÍNEA (ya está así arriba)');
    console.log('   - Los \\n dentro del private_key deben mantenerse como \\n');

    console.log('\n💡 RECOMENDACIÓN:');
    console.log('   Es más fácil y seguro usar GOOGLE_CALENDAR_CREDENTIALS_PATH:');
    console.log('   1. Guarda el archivo JSON en: backend/credentials/google-calendar-credentials.json');
    console.log('   2. En tu .env, usa:');
    console.log('      GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json');

    console.log('\n🧪 Prueba la configuración:');
    console.log('   cd backend');
    console.log('   node test-google-calendar.js');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    process.exit(1);
  }
}

// Obtener el argumento de línea de comandos
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('❌ Falta el argumento: ruta al archivo de credenciales');
  console.log('\n📖 Uso:');
  console.log('   node convert-credentials-to-env.js ruta/al/archivo.json');
  console.log('\nEjemplo:');
  console.log('   node convert-credentials-to-env.js ./credentials/google-calendar-credentials.json');
  console.log('   node convert-credentials-to-env.js C:/Downloads/mi-proyecto-123456.json');
  process.exit(1);
}

const filePath = path.resolve(args[0]);
convertCredentialsToEnv(filePath);

