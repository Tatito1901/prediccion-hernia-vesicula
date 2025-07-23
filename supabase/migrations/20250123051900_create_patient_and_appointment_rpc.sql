-- supabase/migrations/20250123051900_create_patient_and_appointment_rpc.sql
-- Función RPC para crear paciente y cita de forma transaccional
-- Soluciona el problema crítico del flujo de admisión desconectado

CREATE OR REPLACE FUNCTION create_patient_and_appointment(
    p_nombre TEXT,
    p_apellidos TEXT,
    p_telefono TEXT,
    p_edad INT,
    p_motivo_cita TEXT,
    p_fecha_hora_cita TIMESTAMPTZ,
    p_diagnostico_principal public.diagnosis_enum,
    p_comentarios_registro TEXT
)
RETURNS TABLE (created_patient_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_patient_id UUID;
BEGIN
    -- 1. Insertar el nuevo paciente en la tabla 'patients'
    -- Se establece su estado inicial como 'PENDIENTE DE CONSULTA'
    INSERT INTO public.patients (nombre, apellidos, telefono, edad, diagnostico_principal, comentarios_registro, estado_paciente, fecha_registro)
    VALUES (p_nombre, p_apellidos, p_telefono, p_edad, p_diagnostico_principal, p_comentarios_registro, 'PENDIENTE DE CONSULTA', NOW())
    RETURNING id INTO new_patient_id;

    -- 2. Insertar su primera cita en la tabla 'appointments'
    -- Se utiliza el 'new_patient_id' obtenido en el paso anterior para vincular ambos registros.
    -- Se marca como primera vez y con estado 'PROGRAMADA'.
    INSERT INTO public.appointments (patient_id, motivo_cita, fecha_hora_cita, estado_cita, es_primera_vez)
    VALUES (new_patient_id, p_motivo_cita, p_fecha_hora_cita, 'PROGRAMADA', TRUE);

    -- 3. (Opcional pero recomendado) Actualizar el campo 'fecha_primera_consulta' en el paciente
    -- Esto mantiene la consistencia de los datos en el registro del paciente.
    UPDATE public.patients
    SET fecha_primera_consulta = p_fecha_hora_cita::date
    WHERE id = new_patient_id;

    -- 4. Devolver el ID del paciente recién creado como confirmación
    RETURN QUERY SELECT new_patient_id;
END;
$$;
