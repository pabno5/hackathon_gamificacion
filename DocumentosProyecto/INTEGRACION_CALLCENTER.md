# Integración callcenter IA (Vapi + n8n) — BE-03

La IA de voz (Vapi) captura los datos de la cita durante la llamada y los manda
a **n8n**, que hace un HTTP Request a este endpoint. Así Vapi NO necesita llamar
al backend directo; n8n es el puente.

## Endpoint

```
POST {API_URL}/api/v1/callcenter/citas
Headers:
  Content-Type: application/json
  X-API-Key: <CALLCENTER_API_KEY>     ← la env del backend
```

Autenticación por API key (no login de empleado). Configura `CALLCENTER_API_KEY`
en el backend y usa el mismo valor en el nodo HTTP de n8n.

## Body

```json
{
  "paciente": {
    "tipo_documento": "CC",
    "numero_documento": "1098765432",
    "nombres": "Juan",
    "apellidos": "Pérez",
    "telefono": "3001234567",
    "correo": "juan@correo.com"
  },
  "id_medico": "uuid-del-medico",
  "id_sede": "uuid-de-la-sede",
  "id_especialidad": "uuid-opcional",
  "fecha_cita": "2026-08-15",
  "hora_inicio": "09:00",
  "hora_fin": "09:30",
  "motivo": "Dolor de cabeza"
}
```

- `tipo_documento`: CC | TI | CE | PAS | NIT.
- El paciente se **busca por `numero_documento`**; si no existe, se crea.
- `hora_fin` es opcional: si no viene, se calcula con la duración de slot global
  (config de turnos, default 30 min).
- `id_especialidad`, `telefono`, `correo`, `motivo` son opcionales.
- La cita queda con `canal = "telefonico"`.

## Respuestas

- `201` → `{ success: true, data: { ...cita } }`.
- `400` → body inválido (Zod devuelve el detalle).
- `401` → API key faltante o inválida.
- `409` → el médico ya tiene una cita en ese horario (choque).

## Cómo obtener los UUID (id_medico, id_sede)

Los IDs se administran en el portal (`/portal/admin` → tabs Médicos y Sedes).
Para que la IA los use, expón en n8n una tabla/mapa de sedes y médicos, o agrega
después un endpoint de catálogo con API key si la IA necesita resolverlos por
nombre/especialidad.

## Flujo sugerido en n8n

1. **Webhook** (lo dispara Vapi al terminar/durante la llamada con los datos).
2. **(Opcional) Function/Set**: normaliza documento, fecha (YYYY-MM-DD) y hora (HH:MM).
3. **HTTP Request** → `POST .../api/v1/callcenter/citas` con el header `X-API-Key`.
4. **IF**: si status ≠ 201, responde/reintenta o notifica a un humano.

## Notas

- La sincronización con Google Calendar la dispara el backend solo (evento
  `cita.created`), no n8n.
- El `created_by` de estas citas queda nulo = actor "sistema" en la auditoría.
- Rota `CALLCENTER_API_KEY` antes de producción y no la comitees con valor real.
