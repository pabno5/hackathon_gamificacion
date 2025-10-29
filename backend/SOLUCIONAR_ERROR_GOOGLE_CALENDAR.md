# Solucionar Error: Invalid JWT Signature en Google Calendar

## El Problema

```
Error al crear evento en Google Calendar: invalid_grant: Invalid JWT Signature.
```

Este error ocurre cuando Google Calendar API no puede validar las credenciales de tu Service Account.

## Causas Comunes

1. ❌ **Credenciales JSON mal formateadas**
2. ❌ **Clave privada con saltos de línea incorrectos**
3. ❌ **Archivo JSON corrupto o incompleto**
4. ❌ **Credenciales de un proyecto diferente**
5. ❌ **Hora del sistema desincronizada**

---

## Solución Paso a Paso

### Opción 1: Usar archivo de credenciales (RECOMENDADO)

Esta es la forma más segura y simple:

#### 1. Descarga las credenciales correctamente

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** → **Credentials**
4. Encuentra tu Service Account
5. Click en **Actions** → **Manage keys**
6. Click en **Add Key** → **Create new key**
7. Selecciona **JSON**
8. Descarga el archivo (se descargará como `proyecto-xxxxx-xxxxxxxx.json`)

#### 2. Coloca el archivo en tu proyecto

```bash
# Crea una carpeta para credenciales
mkdir backend/credentials

# Copia el archivo descargado
# Renómbralo a algo simple como google-calendar-credentials.json
```

#### 3. Configura tu `.env`

```env
# Usa la ruta al archivo
GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json
GOOGLE_CALENDAR_ID=tu_calendario@group.calendar.google.com
TIMEZONE=America/Bogota
```

#### 4. NO subas las credenciales a Git

Asegúrate de que tu `.gitignore` incluya:

```
backend/credentials/
backend/.env
*.json
```

---

### Opción 2: Variable de entorno JSON (Más complejo)

Si necesitas usar `GOOGLE_CALENDAR_CREDENTIALS` como string JSON:

#### 1. Abre el archivo JSON descargado

Debería verse así:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBg...\n-----END PRIVATE KEY-----\n",
  "client_email": "tu-service-account@tu-proyecto.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

#### 2. Convierte el JSON a una sola línea

**IMPORTANTE**: Los `\n` en el `private_key` deben mantenerse como `\n`, NO como saltos de línea reales.

**Opción A - Usar el script helper (RECOMENDADO)**:

```bash
cd backend
node convert-credentials-to-env.js ruta/al/archivo.json
```

Este script:
- Valida que el JSON sea correcto
- Lo convierte al formato adecuado
- Te da el texto listo para copiar en `.env`

**Opción B - Manual con jq (Linux/Mac/Git Bash)**:

```bash
cat google-calendar-credentials.json | jq -c
```

**Opción C - Manual con Node.js**:

```javascript
const fs = require('fs');
const credentials = JSON.parse(fs.readFileSync('google-calendar-credentials.json'));
console.log(JSON.stringify(credentials));
```

#### 3. Copia el resultado en tu `.env`

```env
GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account","project_id":"tu-proyecto",...}'
GOOGLE_CALENDAR_ID=tu_calendario@group.calendar.google.com
TIMEZONE=America/Bogota
```

**NOTA**: Usa comillas simples `'` alrededor del JSON para evitar problemas.

---

## Verificación Adicional

### 1. Verifica que la API esté habilitada

En Google Cloud Console:
1. Ve a **APIs & Services** → **Library**
2. Busca "Google Calendar API"
3. Debe decir **"API enabled"**. Si no, haz click en **Enable**

### 2. Verifica que el calendario esté compartido

1. Ve a Google Calendar
2. Encuentra tu calendario
3. Click en los 3 puntos → **Settings and sharing**
4. En **Share with specific people**, agrega el email del Service Account:
   ```
   tu-service-account@tu-proyecto.iam.gserviceaccount.com
   ```
5. Dale permisos de **"Make changes to events"**

### 3. Verifica la hora de tu sistema

El error JWT puede ocurrir si tu reloj está muy desincronizado:

```bash
# Windows (PowerShell como admin)
w32tm /resync

# Linux/Mac
sudo ntpdate -s time.nist.gov
```

---

## Script de Prueba

Crea `backend/test-google-calendar.js`:

```javascript
const { google } = require('googleapis');
require('dotenv').config();

async function testGoogleCalendar() {
  try {
    console.log('🔧 Probando Google Calendar API...\n');

    // Cargar credenciales
    let credentials;
    if (process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      console.log('📄 Usando GOOGLE_CALENDAR_CREDENTIALS');
      credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);
    } else if (process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH) {
      console.log('📁 Usando GOOGLE_CALENDAR_CREDENTIALS_PATH:', process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
      credentials = require(process.env.GOOGLE_CALENDAR_CREDENTIALS_PATH);
    } else {
      throw new Error('❌ No hay credenciales configuradas');
    }

    console.log('✅ Credenciales cargadas');
    console.log('   - Type:', credentials.type);
    console.log('   - Project ID:', credentials.project_id);
    console.log('   - Client Email:', credentials.client_email);
    console.log('   - Private Key:', credentials.private_key ? 'Presente ✓' : 'Faltante ✗');

    // Crear cliente
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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

    console.log('\n✅ ÉXITO! Google Calendar API funciona correctamente');
    console.log(`📅 Eventos encontrados: ${response.data.items.length}`);
    
    if (response.data.items.length > 0) {
      console.log('\nPrimeros eventos:');
      response.data.items.slice(0, 3).forEach(event => {
        console.log(`  - ${event.summary} (${event.start.dateTime || event.start.date})`);
      });
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.message.includes('Invalid JWT')) {
      console.error('\n💡 Solución:');
      console.error('   1. Descarga nuevas credenciales JSON desde Google Cloud Console');
      console.error('   2. Guárdalas en backend/credentials/');
      console.error('   3. Usa GOOGLE_CALENDAR_CREDENTIALS_PATH en lugar de GOOGLE_CALENDAR_CREDENTIALS');
      console.error('   4. Lee backend/SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md para más detalles');
    }
  }
}

testGoogleCalendar();
```

### Ejecutar el script de prueba:

```bash
cd backend
node test-google-calendar.js
```

---

## Solución Rápida (90% de los casos)

1. **Descarga nuevas credenciales** desde Google Cloud Console
2. **Guárdalas** en `backend/credentials/google-calendar-credentials.json`
3. **Actualiza** tu `.env`:
   ```env
   GOOGLE_CALENDAR_CREDENTIALS_PATH=./credentials/google-calendar-credentials.json
   GOOGLE_CALENDAR_ID=tu_email@gmail.com
   TIMEZONE=America/Bogota
   ```
4. **Reinicia** el servidor

---

## Si Sigue Fallando

1. **Crea una nueva Service Account** desde cero
2. **Descarga nuevas credenciales**
3. **Verifica** que Google Calendar API esté habilitada
4. **Comparte** el calendario con el email del Service Account
5. **Espera 5 minutos** (propagación de permisos)
6. **Prueba** de nuevo

---

## Desactivar Google Calendar Temporalmente

Si quieres deshabilitar Google Calendar mientras lo configuras:

En tu `.env`, **comenta o elimina** estas líneas:

```env
# GOOGLE_CALENDAR_CREDENTIALS_PATH=...
# GOOGLE_CALENDAR_CREDENTIALS=...
# GOOGLE_CALENDAR_ID=...
```

El sistema funcionará normalmente, solo sin sincronización con Google Calendar.

---

## Scripts Útiles

El proyecto incluye varios scripts para ayudarte con la configuración:

### 1. Test de Google Calendar
Verifica que las credenciales funcionen correctamente:

```bash
cd backend
node test-google-calendar.js
```

Este script:
- ✅ Valida las credenciales
- ✅ Prueba la conexión con Google Calendar API
- ✅ Lista eventos del calendario
- ✅ Muestra errores específicos con soluciones

### 2. Convertir Credenciales a Variable de Entorno
Convierte un archivo JSON de credenciales a formato de variable de entorno:

```bash
cd backend
node convert-credentials-to-env.js ruta/al/archivo.json
```

Ejemplo:
```bash
node convert-credentials-to-env.js ./credentials/google-calendar-credentials.json
node convert-credentials-to-env.js C:/Downloads/mi-proyecto-123456.json
```

Este script:
- ✅ Valida que el JSON sea correcto
- ✅ Convierte a formato de una línea
- ✅ Te da el texto listo para copiar en `.env`
- ✅ Muestra recomendaciones de seguridad

---

## Resumen de Archivos Importantes

```
backend/
├── config/
│   └── googleCalendar.js          # Configuración principal de Google Calendar
├── credentials/
│   ├── README.md                   # Instrucciones para guardar credenciales
│   └── google-calendar-credentials.json  # ⚠️ TU ARCHIVO (NO SUBIR A GIT)
├── .env                            # Variables de entorno
├── test-google-calendar.js         # Script de prueba
├── convert-credentials-to-env.js   # Script helper para convertir JSON
└── SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md  # Esta guía
```

