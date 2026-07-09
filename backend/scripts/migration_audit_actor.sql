-- Migración BE-06: registrar el actor (empleado) en audit_log.id_empleado.
--
-- La BD ya está desplegada, así que este archivo debe EJECUTARSE contra la
-- base viva (Supabase → SQL Editor). Editar schema.sql no basta.
--
-- Reemplaza la función del trigger para que lea el actor de la GUC de
-- transacción `app.current_empleado`, que la app fija con
-- set_config('app.current_empleado', '<uuid>', true) antes de cada escritura.
-- Si no se fijó (writes de sistema/cron), id_empleado queda NULL.
--
-- Idempotente: CREATE OR REPLACE. No requiere recrear los triggers (siguen
-- apuntando a la misma función por nombre).

CREATE OR REPLACE FUNCTION trigger_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_id_registro UUID;
    v_datos_ant   JSONB;
    v_datos_nue   JSONB;
    v_pk_col      TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_datos_nue := to_jsonb(NEW);
        v_datos_ant := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_datos_ant := to_jsonb(OLD);
        v_datos_nue := NULL;
    END IF;

    v_pk_col := CASE TG_TABLE_NAME
        WHEN 'personas'           THEN 'id_persona'
        WHEN 'citas'              THEN 'id_cita'
        WHEN 'historias_clinicas' THEN 'id_historia'
        WHEN 'empleados'          THEN 'id_empleado'
        ELSE NULL END;

    IF v_pk_col IS NOT NULL THEN
        v_id_registro := (COALESCE(v_datos_nue, v_datos_ant) ->> v_pk_col)::UUID;
    END IF;

    INSERT INTO audit_log (tabla_afectada, accion, id_registro, datos_anteriores, datos_nuevos, id_empleado)
    VALUES (TG_TABLE_NAME, TG_OP, v_id_registro, v_datos_ant, v_datos_nue,
            NULLIF(current_setting('app.current_empleado', true), '')::uuid);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
