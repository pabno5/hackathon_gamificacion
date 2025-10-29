/**
 * Verificar si el reloj del sistema está sincronizado
 * Los JWTs son sensibles a diferencias de tiempo
 */

async function checkSystemTime() {
  console.log('🕐 Verificando sincronización del reloj del sistema...\n');
  
  try {
    // Hora local
    const localTime = new Date();
    console.log('⏰ Hora local del sistema:', localTime.toISOString());
    
    // Obtener hora de un servidor NTP (usando un API público)
    const https = require('https');
    
    const getInternetTime = () => {
      return new Promise((resolve, reject) => {
        https.get('https://worldtimeapi.org/api/timezone/America/Bogota', (res) => {
          let data = '';
          res.on('data', (chunk) => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve(new Date(json.datetime));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });
    };
    
    const internetTime = await getInternetTime();
    console.log('🌐 Hora de internet (NTP):', internetTime.toISOString());
    
    // Calcular diferencia
    const diff = Math.abs(localTime - internetTime) / 1000; // en segundos
    
    console.log('\n📊 Diferencia:', Math.round(diff), 'segundos');
    
    if (diff > 300) {
      console.log('\n❌ PROBLEMA CRÍTICO: Tu reloj está desincronizado por más de 5 minutos!');
      console.log('   Esto CAUSARÁ que los JWTs fallen.');
      console.log('\n🔧 Solución (PowerShell como Administrador):');
      console.log('   w32tm /resync');
      return false;
    } else if (diff > 30) {
      console.log('\n⚠️  Tu reloj tiene una diferencia de más de 30 segundos.');
      console.log('   Esto PUEDE causar problemas con JWTs.');
      console.log('\n🔧 Solución recomendada (PowerShell como Administrador):');
      console.log('   w32tm /resync');
      return false;
    } else {
      console.log('\n✅ Tu reloj está correctamente sincronizado.');
      console.log('   El problema NO es la hora del sistema.');
      return true;
    }
    
  } catch (error) {
    console.log('\n⚠️  No se pudo verificar la hora de internet:', error.message);
    console.log('   Asumiendo que el reloj está bien...');
    return true;
  }
}

async function main() {
  const timeOk = await checkSystemTime();
  
  if (!timeOk) {
    console.log('\n' + '='.repeat(70));
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n💡 Si el reloj está bien, el problema es con las credenciales.');
  console.log('\n🔧 SIGUIENTE PASO: Descargar NUEVAS credenciales');
  console.log('\n   Las credenciales actuales pueden estar:');
  console.log('   - Revocadas en Google Cloud Console');
  console.log('   - Corruptas (modificadas accidentalmente)');
  console.log('   - Con problemas de codificación (BOM, UTF-8, etc.)');
  console.log('\n   📖 Sigue las instrucciones en: SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md');
  console.log('   🔗 O ve directamente a: https://console.cloud.google.com/');
}

main();

