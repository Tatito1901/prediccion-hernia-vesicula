-- supabase/migrations/20250721101553_create_rpc_for_appointments.sql

CREATE OR REPLACE FUNCTION get_appointments_with_details(
    p_date_filter TEXT DEFAULT NULL,
    p_patient_id UUID DEFAULT NULL,
    p_page_size INT DEFAULT 20,
    p_page INT DEFAULT 1
)
RETURNS TABLE(
    id UUID,
    fecha_hora_cita TIMESTAMPTZ,
    motivo_cita TEXT,
    estado_cita appointment_status_enum,
    es_primera_vez BOOLEAN,
    patient_id UUID,
    patient_nombre TEXT,
    patient_apellidos TEXT,
    doctor_id UUID,
    doctor_nombre TEXT,
    date_classification TEXT, -- 'today', 'future', 'past'
    total_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH appointments_filtered AS (
        SELECT
            a.id,
            a.fecha_hora_cita,
            a.motivo_cita,
            a.estado_cita,
            a.es_primera_vez,
            p.id as patient_id,
            p.nombre as patient_nombre,
            p.apellidos as patient_apellidos,
            d.id as doctor_id,
            d.full_name as doctor_nombre,
            CASE
                WHEN a.fecha_hora_cita::date = CURRENT_DATE THEN 'today'
                WHEN a.fecha_hora_cita > NOW() THEN 'future'
                ELSE 'past'
            END as date_classification,
            COUNT(*) OVER() as total_count
        FROM
            appointments a
        JOIN
            patients p ON a.patient_id = p.id
        LEFT JOIN
            doctors d ON a.doctor_id = d.id
        WHERE
            (p_patient_id IS NULL OR a.patient_id = p_patient_id)
    )
    SELECT *
    FROM appointments_filtered
    WHERE
        (p_date_filter IS NULL OR date_classification = p_date_filter)
    ORDER BY
        fecha_hora_cita DESC
    LIMIT p_page_size
    OFFSET (p_page - 1) * p_page_size;
END;
$$;
