-- ==========================================
-- MIGRACIÓN: Agregar campo google_calendar_event_id a tabla citas
-- ==========================================

-- Agregar columna para almacenar el ID del evento de Google Calendar
ALTER TABLE citas 
ADD COLUMN google_calendar_event_id VARCHAR(255) UNIQUE;

-- Comentario para documentar el campo
COMMENT ON COLUMN citas.google_calendar_event_id IS 'ID del evento en Google Calendar para sincronización bidireccional';

-- Índice para búsquedas rápidas por google_calendar_event_id
CREATE INDEX idx_citas_google_calendar_event_id ON citas(google_calendar_event_id);

