# 🔄 Configurar Sincronización Automática de Google Calendar

## ✅ ¿Qué Acabas de Obtener?

Ahora tu aplicación tiene **sincronización bidireccional** con Google Calendar:

1. **Aplicación → Google Calendar**: ✅ Automático (ya funcionaba)
2. **Google Calendar → Aplicación**: ✅ Automático (¡nuevo!)

## 📋 Cómo Funciona

### Cuando creas una cita en la aplicación:
✅ Se guarda en la base de datos  
✅ Se crea automáticamente en Google Calendar

### Cuando creas un evento en Google Calendar:
✅ El servicio de sincronización lo detecta (cada 15 minutos por defecto)  
✅ Lo importa automáticamente a tu base de datos  
✅ Lo convierte en una cita en la aplicación

## ⚙️ Configuración

### Variables de Entorno

Agrega estas variables a tu `backend/.env`:

```env
# Habilitar sincronización automática (por defecto: true)
GOOGLE_CALENDAR_AUTO_SYNC=true

# Intervalo de sincronización (por defecto: cada 15 minutos)
GOOGLE_CALENDAR_SYNC_INTERVAL=*/15 * * * *
```

### Intervalos Disponibles

```bash
# Cada 5 minutos (sincronización muy frecuente)
GOOGLE_CALENDAR_SYNC_INTERVAL=*/5 * * * *

# Cada 10 minutos
GOOGLE_CALENDAR_SYNC_INTERVAL=*/10 * * * *

# Cada 15 minutos (RECOMENDADO - por defecto)
GOOGLE_CALENDAR_SYNC_INTERVAL=*/15 * * * *

# Cada 30 minutos
GOOGLE_CALENDAR_SYNC_INTERVAL=*/30 * * * *

# Cada hora
GOOGLE_CALENDAR_SYNC_INTERVAL=0 * * * *

# Cada 6 horas
GOOGLE_CALENDAR_SYNC_INTERVAL=0 */6 * * *

# Una vez al día (medianoche)
GOOGLE_CALENDAR_SYNC_INTERVAL=0 0 * * *
```

### Deshabilitar Sincronización Automática

Si quieres desactivar la sincronización automática:

```env
GOOGLE_CALENDAR_AUTO_SYNC=false
```

La aplicación seguirá enviando citas a Google Calendar, pero no las importará automáticamente.

## 📊 Ver Estadísticas de Sincronización

Puedes ver cómo va la sincronización en tiempo real:

```bash
# Consulta las estadísticas
GET http://localhost:3000/api/calendar/sync-stats
```

Respuesta:
```json
{
  "totalSyncs": 10,
  "successfulSyncs": 9,
  "failedSyncs": 1,
  "eventsCreated": 3,
  "isRunning": true,
  "lastSyncTime": "2025-10-29T18:45:00.000Z"
}
```

## 🧪 Probar la Sincronización

### 1. Reinicia tu servidor

```powershell
# Ctrl+C para detener
# Luego inicia de nuevo:
npm start
```

Deberías ver:
```
✅ Servidor corriendo en http://localhost:3000
🔄 Iniciando servicio de sincronización automática de Google Calendar...
⏰ Frecuencia: Cada 15 minutos
✅ Servicio de sincronización iniciado correctamente

🔄 [2025-10-29T18:45:00.000Z] Iniciando sincronización automática...
   ℹ️  No hay eventos nuevos para sincronizar
```

### 2. Crea un evento en Google Calendar

1. Ve a [Google Calendar](https://calendar.google.com/)
2. Crea un nuevo evento en el calendario que compartiste con el Service Account
3. Título: "Prueba de sincronización"
4. Fecha: Cualquier fecha futura
5. Guarda

### 3. Espera el intervalo de sincronización

- Si configuraste `*/5 * * * *` → Espera 5 minutos
- Si usas el por defecto `*/15 * * * *` → Espera 15 minutos

O fuerza una sincronización manual:

```bash
# Sincronización manual inmediata
POST http://localhost:3000/api/citas/sync-from-google-calendar
Content-Type: application/json

{
  "from": "2025-10-01T00:00:00Z",
  "to": "2025-12-31T23:59:59Z"
}
```

### 4. Verifica en la aplicación

El evento de Google Calendar ahora debería aparecer como una cita en tu aplicación!

## ⚠️ Consideraciones Importantes

### IDs de Paciente y Médico

Cuando un evento se crea directamente en Google Calendar (no desde la app), el sistema necesita asignar un paciente y un médico a la cita.

**Por defecto**, usa el primer paciente y primer médico de la base de datos.

**Para especificar paciente/médico específicos** al crear eventos en Google Calendar:

1. En Google Calendar, al crear el evento
2. Agrega en la **descripción**:
   ```
   ID Paciente: 123
   ID Médico: 456
   ```

O usa la API de Google Calendar con `extendedProperties`:

```javascript
{
  summary: "Cita con paciente específico",
  start: {...},
  end: {...},
  extendedProperties: {
    private: {
      idPaciente: "123",
      idMedico: "456"
    }
  }
}
```

### Eventos Duplicados

El sistema **previene duplicados** verificando el `google_calendar_event_id`. Si un evento ya existe en la base de datos, no se creará de nuevo.

### Estado de los Eventos

- Eventos normales → Estado: **"programada"**
- Eventos cancelados en Google Calendar → Estado: **"cancelada"**

## 🔧 Solución de Problemas

### El servicio no inicia

**Causa**: Google Calendar no está configurado

**Solución**:
```bash
# Verifica tu configuración
node test-google-calendar.js

# Lee la guía
cat SOLUCIONAR_ERROR_GOOGLE_CALENDAR.md
```

### Los eventos no se sincronizan

**Posibles causas**:

1. **El calendario no está compartido con el Service Account**
   - Comparte el calendario con: `nose-736@central-web-476615-n4.iam.gserviceaccount.com`
   - Permisos: "Make changes to events"

2. **El evento es muy antiguo o muy futuro**
   - Por defecto sincroniza eventos de los próximos 30 días
   - Modifica `calendarSyncService.js` línea 79 si necesitas más rango

3. **El evento ya existe**
   - Revisa la base de datos: `SELECT * FROM citas WHERE google_calendar_event_id IS NOT NULL`

### Ver los logs de sincronización

Los logs aparecen en la consola del servidor:

```
🔄 [2025-10-29T18:45:00.000Z] Iniciando sincronización automática...
   ✅ Cita creada desde Google Calendar: "Consulta oftalmológica"
   ✅ Sincronización completada en 1234ms
   📊 Eventos procesados: 5, Creados: 1
```

## 📖 Archivos Relacionados

- `backend/services/calendarSyncService.js` - Lógica de sincronización
- `backend/config/googleCalendar.js` - Configuración de Google Calendar API
- `backend/server.js` - Inicio del servicio
- `backend/routes/citas.js` - Ruta manual de sincronización

## 💡 Recomendaciones

1. **Usa intervalos razonables**: `*/15 * * * *` (cada 15 minutos) es un buen balance
2. **Monitorea las estadísticas**: Revisa `/api/calendar/sync-stats` periódicamente
3. **Mantén el calendario compartido**: Asegúrate de que el Service Account tenga permisos
4. **Crea pacientes/médicos por defecto**: Para manejar eventos creados externamente

## ✨ Siguiente Nivel

Si quieres sincronización **INSTANTÁNEA** (en lugar de periódica), necesitarías implementar:

- **Webhooks de Google Calendar** (push notifications)
- Requiere un servidor público con HTTPS
- Más complejo pero más eficiente

Por ahora, la sincronización periódica cada 15 minutos es perfecta para la mayoría de casos de uso! 🎉

