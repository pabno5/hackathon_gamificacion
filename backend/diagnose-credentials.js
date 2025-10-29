/**
 * Script de diagnóstico profundo de credenciales de Google Calendar
 */

require('dotenv').config();

function diagnoseCredentials() {
  console.log('🔍 DIAGNÓSTICO DE CREDENCIALES DE GOOGLE CALENDAR\n');
  console.log('='.repeat(70));
  
  // Verificar qué método de credenciales está configurado
  console.log('\n📋 Variables de entorno detectadas:');
  console.log('   GOOGLE_CALENDAR_CREDENTIALS:', process.env.GOOGLE_CALENDAR_CREDENTIALS ? '✓ Presente' : '✗ No configurada');
  console.log('   GOOGLE_CALENDAR_CREDENTIALS_PATH:', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH ? '✓ Presente' : '✗ No configurada');
  console.log('   GOOGLE_CALENDAR_ID:', process.env.GOOGLE_CALENDAR_ID || '(no configurada)');
  console.log('   TIMEZONE:', process.env.TIMEZONE || '(no configurada)');

  // Si está usando JSON string
  if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
    console.log('\n⚠️  Estás usando GOOGLE_CALENDAR_CREDENTIALS (JSON como string)');
    console.log('   Este método es propenso a errores en Windows.\n');
    
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
      
      console.log('✅ El JSON es parseable');
      console.log('\n📊 Campos encontrados:');
      console.log('   - type:', credentials.type || '❌ FALTA');
      console.log('   - project_id:', credentials.project_id || '❌ FALTA');
      console.log('   - private_key_id:', credentials.private_key_id ? '✓' : '❌ FALTA');
      console.log('   - private_key:', credentials.private_key ? '✓ Presente' : '❌ FALTA');
      console.log('   - client_email:', credentials.client_email || '❌ FALTA');
      console.log('   - client_id:', credentials.client_id ? '✓' : '❌ FALTA');
      
      if (credentials.private_key) {
        console.log('\n🔑 Análisis de private_key:');
        const key = credentials.private_key;
        
        // Verificar formato
        const hasBegin = key.includes('BEGIN PRIVATE KEY');
        const hasEnd = key.includes('END PRIVATE KEY');
        const hasBackslashN = key.includes('\\n');
        const hasRealNewline = key.includes('\n');
        
        console.log('   - Tiene "BEGIN PRIVATE KEY":', hasBegin ? '✓' : '❌ FALTA - CRÍTICO!');
        console.log('   - Tiene "END PRIVATE KEY":', hasEnd ? '✓' : '❌ FALTA - CRÍTICO!');
        console.log('   - Tiene \\n literales:', hasBackslashN ? '✓' : '⚠️  No (puede estar bien si tiene saltos reales)');
        console.log('   - Tiene saltos de línea reales:', hasRealNewline ? '✓' : '⚠️  No (puede estar bien si tiene \\n)');
        
        // Longitud
        console.log('   - Longitud total:', key.length, 'caracteres');
        
        // Primeros y últimos caracteres
        console.log('   - Primeros 50 caracteres:', key.substring(0, 50));
        console.log('   - Últimos 50 caracteres:', key.substring(key.length - 50));
        
        // El problema más común en Windows
        if (!hasBegin || !hasEnd) {
          console.log('\n❌ ERROR CRÍTICO: La private_key está corrupta!');
          console.log('   La clave privada DEBE contener las marcas BEGIN y END.');
        } else if (!hasBackslashN && !hasRealNewline) {
          console.log('\n❌ ERROR CRÍTICO: La private_key no tiene saltos de línea!');
          console.log('   La clave debe tener \\n o saltos de línea reales.');
        } else {
          console.log('\n⚠️  La private_key PARECE tener el formato correcto,');
          console.log('   pero aún falla. Esto sugiere un problema sutil en el formato.');
        }
        
        console.log('\n💡 SOLUCIÓN RECOMENDADA:');
        console.log('   Cambia a usar GOOGLE_CALENDAR_CREDENTIALS_PATH');
        console.log('   Es 10x más confiable que usar un JSON string.\n');
        console.log('   Pasos:');
        console.log('   1. Descarga el archivo JSON de Google Cloud Console');
        console.log('   2. Guárdalo como: backend/credentials/google-calendar-credentials.json');
        console.log('   3. En tu .env, COMENTA la línea GOOGLE_CALENDAR_CREDENTIALS');
        console.log('   4. En tu .env, AGREGA: GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json');
      }
      
    } catch (parseError) {
      console.log('\n❌ ERROR: El JSON en GOOGLE_CALENDAR_CREDENTIALS está mal formateado!');
      console.log('   Error:', parseError.message);
      console.log('\n   Los primeros 200 caracteres:');
      console.log('   ' + process.env.GOOGLE_CALENDAR_CREDENTIALS.substring(0, 200));
    }
  }
  
  // Si está usando archivo
  if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
    console.log('\n✅ Estás usando GOOGLE_CALENDAR_CREDENTIALS_PATH (archivo)');
    console.log('   Este es el método RECOMENDADO.\n');
    
    const fs = require('fs');
    const path = require('path');
    const credentialsPath = path.resolve(__dirname, process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
    
    console.log('📁 Ruta del archivo:', credentialsPath);
    
    if (fs.existsSync(credentialsPath)) {
      console.log('✅ El archivo existe\n');
      
      try {
        const fileContent = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(fileContent);
        
        console.log('✅ El archivo es un JSON válido');
        console.log('\n📊 Campos encontrados:');
        console.log('   - type:', credentials.type || '❌ FALTA');
        console.log('   - project_id:', credentials.project_id || '❌ FALTA');
        console.log('   - private_key_id:', credentials.private_key_id ? '✓' : '❌ FALTA');
        console.log('   - private_key:', credentials.private_key ? '✓ Presente' : '❌ FALTA');
        console.log('   - client_email:', credentials.client_email || '❌ FALTA');
        console.log('   - client_id:', credentials.client_id ? '✓' : '❌ FALTA');
        
        if (credentials.private_key) {
          const key = credentials.private_key;
          const hasBegin = key.includes('BEGIN PRIVATE KEY');
          const hasEnd = key.includes('END PRIVATE KEY');
          
          console.log('\n🔑 Formato de private_key:');
          console.log('   - Tiene marcas BEGIN/END:', hasBegin && hasEnd ? '✓' : '❌');
          console.log('   - Longitud:', key.length, 'caracteres');
          
          if (hasBegin && hasEnd) {
            console.log('\n✅ ¡El archivo parece estar correcto!');
            console.log('   Si aún falla, verifica:');
            console.log('   1. Que Google Calendar API esté habilitada');
            console.log('   2. Que el calendario esté compartido con:', credentials.client_email);
          }
        }
        
      } catch (error) {
        console.log('❌ Error al leer el archivo:', error.message);
      }
    } else {
      console.log('❌ ¡El archivo NO existe!');
      console.log('\n   Por favor, descarga las credenciales de Google Cloud Console');
      console.log('   y guárdalas en:', credentialsPath);
    }
  }
  
  if (!process.env.GOOGLE_CALENDAR_CREDENTIALS && !process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
    console.log('\n⚠️  ¡No hay credenciales configuradas!');
    console.log('   Necesitas configurar una de estas variables en tu .env:');
    console.log('   - GOOGLE_CALENDAR_CREDENTIALS_PATH (RECOMENDADO)');
    console.log('   - GOOGLE_CALENDAR_CREDENTIALS');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n📖 Para más ayuda, lee: backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md');
}

diagnoseCredentials();

