

# 📅 Configurar Google Calendar - Sincronización Bidireccional

## 🎯 Funcionalidades Implementadas

✅ **Crear cita** → Se crea evento automáticamente en Google Calendar  
✅ **Actualizar cita** → Se actualiza evento en Google Calendar  
✅ **Eliminar cita** → Se elimina evento de Google Calendar  
✅ **Sincronizar desde Google Calendar** → Importar eventos de Google Calendar a la BD

---

## 📋 Requisitos Previos

1. Cuenta de Google
2. Acceso a Google Cloud Console
3. Proyecto de Firebase ya configurado (puedes usar el mismo)

---

## 🔧 Paso 1: Crear Service Account en Google Cloud

### 1.1 Ir a Google Cloud Console

1. Ve a [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Selecciona tu proyecto (o crea uno nuevo)

### 1.2 Habilitar Google Calendar API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca "Google Calendar API"
3. Click en **Google Calendar API**
4. Click en **Enable** (Habilitar)

### 1.3 Crear Service Account

1. Ve a **APIs & Services** > **Credentials**
2. Click en **Create Credentials** > **Service Account**
3. Completa:
   - **Service account name**: `calendar-sync-service`
   - **Service account ID**: Se genera automáticamente
   - **Description**: "Service Account para sincronizar citas con Google Calendar"
4. Click **Create and Continue**
5. En **Grant this service account access to project**:
   - No es necesario agregar roles aquí
   - Click **Continue**
6. Click **Done**

### 1.4 Crear Key para el Service Account

1. En la lista de Service Accounts, click en el que acabas de crear
2. Ve a la pestaña **Keys**
3. Click **Add Key** > **Create new key**
4. Selecciona **JSON**
5. Click **Create**
6. Se descargará un archivo JSON (guárdalo de forma segura)

---

## 🗂️ Paso 2: Configurar el Archivo de Credenciales

### 2.1 Mover el Archivo

1. Renombra el archivo descargado a `google-calendar-credentials.json`
2. Muévelo a `backend/config/`

```bash
# Estructura debe quedar así:
backend/
├── config/
│   ├── google-calendar-credentials.json  ← AQUÍ
│   ├── firebase.js
│   └── ...
```

### 2.2 Agregar al .gitignore

Asegúrate de que está en `.gitignore`:

```gitignore
# Google Calendar credentials
backend/config/google-calendar-credentials.json
```

---

## 📧 Paso 3: Compartir el Calendario con el Service Account

### 3.1 Obtener el Email del Service Account

1. Abre el archivo `google-calendar-credentials.json`
2. Busca el campo `client_email`
3. Copia el valor (se ve como `calendar-sync-service@proyecto.iam.gserviceaccount.com`)

### 3.2 Compartir el Calendario

1. Ve a [Google Calendar](https://calendar.google.com/)
2. En la barra lateral izquierda, encuentra tu calendario
3. Click en los 3 puntos junto al calendario > **Settings and sharing**
4. Baja hasta **"Share with specific people"**
5. Click **Add people**
6. Pega el email del Service Account
7. Permisos: Selecciona **"Make changes to events"**
8. Click **Send**

### 3.3 Obtener el Calendar ID

1. En la misma página de configuración
2. Baja hasta **"Integrate calendar"**
3. Copia el **Calendar ID** (se ve como `xxxxx@group.calendar.google.com`)
4. Si es tu calendario personal, puedes usar `primary`

---

## ⚙️ Paso 4: Configurar Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# ===== GOOGLE CALENDAR =====
# Ruta al archivo de credenciales
GOOGLE_CALENDAR_CREDENTIALS_PATH=./config/google-calendar-credentials.json

# ID del calendario (usa 'primary' o el ID específico)
GOOGLE_CALENDAR_ID=primary

# Zona horaria
TIMEZONE=America/Bogota
```

**Opciones para GOOGLE_CALENDAR_ID**:
- `primary` - Tu calendario principal
- `xxxxx@group.calendar.google.com` - Un calendario específico
- `xxxxx@gmail.com` - Calendario de otra cuenta (si está compartido)

---

## 🧪 Paso 5: Probar la Integración

### 5.1 Reiniciar el Servidor

```bash
cd backend
npm run dev
```

Deberías ver en los logs:
```
✅ Google Calendar configurado correctamente
📅 Calendar ID: primary
```

### 5.2 Crear una Cita de Prueba

```bash
curl -X POST http://localhost:3000/api/citas \
  -H "Content-Type: application/json" \
  -d '{
    "id_paciente": "uuid-del-paciente",
    "id_medico": "uuid-del-medico",
    "fecha_cita": "2025-11-15T10:00:00",
    "motivo": "Cita de prueba con Google Calendar"
  }'
```

### 5.3 Verificar en Google Calendar

1. Ve a [Google Calendar](https://calendar.google.com/)
2. Deberías ver el evento creado
3. El evento tendrá el título "Cita de prueba con Google Calendar"

---

## 🔄 Funcionalidades Disponibles

### 1. Crear Cita → Crea Evento en Google Calendar

```javascript
POST /api/citas
{
  "id_paciente": "uuid",
  "id_medico": "uuid",
  "fecha_cita": "2025-11-15T10:00:00",
  "motivo": "Consulta general"
}
```

**Resultado**: 
- ✅ Cita creada en BD
- ✅ Evento creado en Google Calendar
- ✅ `google_calendar_event_id` guardado en la cita

### 2. Actualizar Cita → Actualiza Evento

```javascript
PUT /api/citas/:id
{
  "motivo": "Consulta de seguimiento",
  "fecha_cita": "2025-11-16T11:00:00"
}
```

**Resultado**:
- ✅ Cita actualizada en BD
- ✅ Evento actualizado en Google Calendar

### 3. Eliminar Cita → Elimina Evento

```javascript
DELETE /api/citas/:id
```

**Resultado**:
- ✅ Cita eliminada de BD
- ✅ Evento eliminado de Google Calendar

### 4. Sincronizar desde Google Calendar

```javascript
POST /api/citas/sync-from-google-calendar
{
  "from": "2025-11-01T00:00:00Z",
  "to": "2025-11-30T23:59:59Z"
}
```

**Resultado**:
- ✅ Eventos de Google Calendar importados a la BD
- ✅ Solo importa eventos nuevos (no duplica)

---

## 🔍 Verificar Sincronización

### Base de Datos → Google Calendar

1. Crea una cita desde tu frontend/API
2. Ve a Google Calendar
3. Deberías ver el evento

### Google Calendar → Base de Datos

1. Crea un evento manualmente en Google Calendar
2. Llama a la API de sincronización:
```bash
curl -X POST http://localhost:3000/api/citas/sync-from-google-calendar \
  -H "Content-Type: application/json" \
  -d '{
    "from": "2025-11-01T00:00:00Z",
    "to": "2025-12-31T23:59:59Z"
  }'
```
3. Verifica en tu base de datos que se creó la cita

---

## 🚨 Solución de Problemas

### Error: "Google Calendar no configurado"

**Causa**: Falta el archivo de credenciales o la variable de entorno.

**Solución**:
1. Verifica que `google-calendar-credentials.json` esté en `backend/config/`
2. Verifica que `GOOGLE_CALENDAR_CREDENTIALS_PATH` esté en `.env`
3. Reinicia el servidor

---

### Error: "Permission denied" al crear evento

**Causa**: El Service Account no tiene permisos en el calendario.

**Solución**:
1. Ve a Google Calendar Settings
2. Verifica que el email del Service Account esté en la lista de personas compartidas
3. Asegúrate de que tenga permisos "Make changes to events"

---

### Error: "Calendar not found"

**Causa**: El `GOOGLE_CALENDAR_ID` es incorrecto.

**Solución**:
1. Usa `primary` para tu calendario principal
2. O verifica que el Calendar ID sea correcto en la configuración del calendario

---

### Los eventos no se crean

**Solución**:
1. Revisa los logs del servidor (`npm run dev`)
2. Busca mensajes de error de Google Calendar
3. Verifica que la API esté habilitada en Google Cloud Console

---

## 🎨 Personalización

### Cambiar Duración de las Citas

Por defecto, las citas duran 1 hora. Para cambiar esto, edita `backend/config/googleCalendar.js`:

```javascript
// Línea 62
const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hora

// Cambiar a 30 minutos:
const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // +30 min

// Cambiar a 2 horas:
const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2 horas
```

### Agregar Recordatorios

En `googleCalendar.js`, en la función `createCalendarEvent`, agrega:

```javascript
const event = {
  summary: citaData.motivo || 'Cita médica',
  // ... otros campos ...
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 24 * 60 }, // 1 día antes
      { method: 'popup', minutes: 60 },      // 1 hora antes
    ],
  },
};
```

---

## 📊 Estructura de Datos

### Tabla Citas

```sql
CREATE TABLE citas (
  -- ... otros campos ...
  google_calendar_event_id VARCHAR(255) UNIQUE,
  -- ...
);
```

### Evento en Google Calendar

```json
{
  "id": "abcd1234...",
  "summary": "Cita médica",
  "description": "Observaciones de la cita",
  "start": {
    "dateTime": "2025-11-15T10:00:00-05:00",
    "timeZone": "America/Bogota"
  },
  "end": {
    "dateTime": "2025-11-15T11:00:00-05:00",
    "timeZone": "America/Bogota"
  },
  "extendedProperties": {
    "private": {
      "citaId": "uuid-de-la-cita",
      "idPaciente": "uuid-del-paciente",
      "idMedico": "uuid-del-medico"
    }
  }
}
```

---

## 📚 Recursos

- [Google Calendar API Documentation](https://developers.google.com/calendar)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [Google Calendar Node.js Client](https://github.com/googleapis/google-api-nodejs-client)

---

## ✅ Checklist de Configuración

- [ ] Google Calendar API habilitada en Google Cloud Console
- [ ] Service Account creado
- [ ] Archivo JSON de credenciales descargado
- [ ] Archivo movido a `backend/config/google-calendar-credentials.json`
- [ ] Calendario compartido con el email del Service Account
- [ ] Variables de entorno configuradas en `.env`
- [ ] Servidor reiniciado
- [ ] Cita de prueba creada correctamente
- [ ] Evento visible en Google Calendar

---

¡Listo! Ahora tienes sincronización bidireccional entre tu sistema de citas y Google Calendar. 🎉

