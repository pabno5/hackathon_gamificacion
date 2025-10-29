# ✅ Solución: Problemas de Zona Horaria con Google Calendar

## 🐛 El Problema

Cuando creabas una cita a las **2:00 PM** en la aplicación, aparecía con una hora **diferente** en Google Calendar (por ejemplo, 7:00 PM o 9:00 AM).

### ¿Por qué pasaba?

El problema era la conversión de zonas horarias:

1. **Usuario selecciona**: 2:00 PM (hora de Colombia, UTC-5)
2. **Frontend convierte a UTC**: 7:00 PM UTC (usando `toISOString()`)
3. **Backend recibe**: "2025-10-29T19:00:00.000Z"
4. **Google Calendar interpreta mal**: Mostraba 7:00 PM en lugar de 2:00 PM

## ✅ La Solución

Ahora el sistema maneja correctamente las zonas horarias:

### Cambios Realizados

1. **Nueva función `formatDateForCalendar()`**
   - Convierte fechas a la zona horaria configurada (Colombia: UTC-5)
   - Genera formato sin 'Z' para que Google Calendar lo interprete correctamente
   - Formato: `2025-10-29T14:00:00` en lugar de `2025-10-29T19:00:00Z`

2. **Función helper `getTimezoneOffset()`**
   - Calcula el offset correcto para diferentes zonas horarias
   - Soporta múltiples países (Colombia, México, Perú, Argentina, España, USA, etc.)

3. **Actualización de `createCalendarEvent()` y `updateCalendarEvent()`**
   - Ahora usan las funciones helpers
   - Las fechas se envían correctamente a Google Calendar

### Cómo Funciona Ahora

```javascript
// 1. Usuario selecciona: 2025-10-29 14:00 (2:00 PM)

// 2. Frontend envía: "2025-10-29T19:00:00Z" (UTC)

// 3. Backend convierte a Colombia (UTC-5):
const startDate = new Date("2025-10-29T19:00:00Z");
const formatted = formatDateForCalendar(startDate, "America/Bogota");
// Resultado: "2025-10-29T14:00:00"

// 4. Google Calendar recibe:
{
  dateTime: "2025-10-29T14:00:00",
  timeZone: "America/Bogota"
}

// 5. Google Calendar muestra: 2:00 PM ✅
```

## ⚙️ Configuración

Asegúrate de tener configurada la zona horaria correcta en tu `.env`:

```env
# Zona horaria para eventos (Colombia)
TIMEZONE=America/Bogota
```

### Zonas Horarias Soportadas

| País/Región | Timezone | Offset UTC |
|-------------|----------|------------|
| 🇨🇴 Colombia | `America/Bogota` | UTC-5 |
| 🇵🇪 Perú | `America/Lima` | UTC-5 |
| 🇲🇽 México | `America/Mexico_City` | UTC-6 |
| 🇦🇷 Argentina | `America/Argentina/Buenos_Aires` | UTC-3 |
| 🇺🇸 USA (Este) | `America/New_York` | UTC-5 / UTC-4 |
| 🇺🇸 USA (Pacífico) | `America/Los_Angeles` | UTC-8 / UTC-7 |
| 🇪🇸 España | `Europe/Madrid` | UTC+1 / UTC+2 |
| 🇬🇧 Reino Unido | `Europe/London` | UTC+0 / UTC+1 |

Si necesitas otra zona horaria, agrégala en `backend/config/googleCalendar.js` en la función `getTimezoneOffset()`.

## 🧪 Prueba la Solución

### 1. Reinicia el servidor

```powershell
# Detén el servidor (Ctrl+C)
# Inicia de nuevo
npm start
```

### 2. Crea una nueva cita

1. Abre la aplicación
2. Crea una cita para hoy a las **3:00 PM**
3. Guarda la cita

### 3. Verifica en Google Calendar

1. Ve a [Google Calendar](https://calendar.google.com/)
2. Busca el evento
3. Debería aparecer a las **3:00 PM** ✅

## 📊 Antes vs Después

### ❌ Antes (Incorrecto)

```
Usuario selecciona: 2:00 PM
Google Calendar muestra: 7:00 PM (¡5 horas más!)
```

### ✅ Después (Correcto)

```
Usuario selecciona: 2:00 PM
Google Calendar muestra: 2:00 PM ✓
```

## 🔧 Solución de Problemas

### La hora sigue apareciendo mal

**Posible causa 1**: La variable `TIMEZONE` está mal configurada

**Solución**:
```env
# En backend/.env
TIMEZONE=America/Bogota
```

**Posible causa 2**: Estás en una zona horaria diferente a Colombia

**Solución**:
```env
# Cambia a tu zona horaria
TIMEZONE=America/Mexico_City    # Para México
TIMEZONE=America/Lima           # Para Perú
TIMEZONE=America/New_York       # Para USA Este
```

### Necesito una zona horaria que no está en la lista

**Solución**:

1. Abre `backend/config/googleCalendar.js`
2. Busca la función `getTimezoneOffset()`
3. Agrega tu zona horaria:

```javascript
const timezoneOffsets = {
  'America/Bogota': -300,
  // Agrega la tuya aquí:
  'America/Caracas': -240,  // UTC-4 (Venezuela)
  'America/Santiago': -180,  // UTC-3 (Chile)
  // etc...
};
```

4. Reinicia el servidor

### Eventos anteriores siguen con hora incorrecta

Los eventos **anteriores** a este fix mantendrán la hora incorrecta. Solo los **nuevos eventos** tendrán la hora correcta.

**Opciones**:

1. **Ignorar** - Los eventos viejos quedarán como están
2. **Eliminar y recrear** - Elimina los eventos viejos y créalos de nuevo
3. **Editar manualmente** - En Google Calendar, edita la hora manualmente

## 📝 Archivos Modificados

- `backend/config/googleCalendar.js`
  - Nueva función: `getTimezoneOffset()`
  - Nueva función: `formatDateForCalendar()`
  - Actualizada: `createCalendarEvent()`
  - Actualizada: `updateCalendarEvent()`

## 🎉 ¡Listo!

Ahora las citas se crean con la hora correcta en Google Calendar. **Disfruta de tu calendario sincronizado!** ✨

