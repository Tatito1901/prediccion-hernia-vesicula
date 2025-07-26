-- Fix para el problema de tipo enum en la función create_patient_and_appointment
-- La función original espera un diagnóstico ya con tipo enum, pero la API envía texto

-- Modificamos la función para recibir un TEXT y convertirlo a diagnosis_enum internamente
CREATE OR REPLACE FUNCTION create_patient_and_appointment(
    p_nombre TEXT,
    p_apellidos TEXT,
    p_telefono TEXT,
    p_email TEXT,
    p_edad INT,
    p_diagnostico_principal TEXT, -- Cambiado a TEXT
    p_comentarios_registro TEXT,
    p_probabilidad_cirugia FLOAT,
    p_fecha_hora_cita TIMESTAMPTZ,
    p_motivo_cita TEXT,
    p_doctor_id UUID,
    p_creado_por_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    created_patient_id UUID,
    created_appointment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_patient_id UUID;
    new_appointment_id UUID;
    diagnosis_enum_val public.diagnosis_enum;
BEGIN
    -- 0. Convertir explícitamente el texto a enum
    BEGIN
        -- Intentamos convertir el string a diagnosis_enum
        diagnosis_enum_val := p_diagnostico_principal::public.diagnosis_enum;
    EXCEPTION WHEN OTHERS THEN
        -- En caso de error de conversión, devolvemos un error descriptivo
        RETURN QUERY SELECT 
            FALSE,
            'Valor de diagnóstico inválido. Valores permitidos: ' || 
            (SELECT string_agg(e.enumlabel, ', ') FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            WHERE t.typname = 'diagnosis_enum'),
            NULL::UUID,
            NULL::UUID;
        RETURN;
    END;

    -- 1. Insertar el nuevo paciente en la tabla 'patients'
    -- Se establece su estado inicial como 'PENDIENTE DE CONSULTA'
    BEGIN
        INSERT INTO public.patients (nombre, apellidos, telefono, email, edad, diagnostico_principal, comentarios_registro, probabilidad_cirugia, estado_paciente, fecha_registro, creado_por)
        VALUES (p_nombre, p_apellidos, p_telefono, p_email, p_edad, diagnosis_enum_val, p_comentarios_registro, p_probabilidad_cirugia, 'PENDIENTE DE CONSULTA', NOW(), p_creado_por_id)
        RETURNING id INTO new_patient_id;

        -- 2. Insertar su primera cita en la tabla 'appointments'
        -- Se utiliza el 'new_patient_id' obtenido en el paso anterior para vincular ambos registros.
        -- Se marca como primera vez y con estado 'PROGRAMADA'.
        INSERT INTO public.appointments (patient_id, motivo_cita, fecha_hora_cita, estado_cita, es_primera_vez, doctor_id)
        VALUES (new_patient_id, p_motivo_cita, p_fecha_hora_cita, 'PROGRAMADA', TRUE, p_doctor_id)
        RETURNING id INTO new_appointment_id;

        -- 3. (Opcional pero recomendado) Actualizar el campo 'fecha_primera_consulta' en el paciente
        -- Esto mantiene la consistencia de los datos en el registro del paciente.
        UPDATE public.patients
        SET fecha_primera_consulta = p_fecha_hora_cita::date
        WHERE id = new_patient_id;

        -- 4. Devolver el ID del paciente recién creado como confirmación
        RETURN QUERY SELECT 
            TRUE,
            'Paciente y cita creados exitosamente',
            new_patient_id,
            new_appointment_id;
            
    EXCEPTION 
      -- Capturar error si el valor de texto no es un enum válido
      WHEN invalid_text_representation THEN
        RETURN QUERY SELECT
          FALSE,
          'Error: El valor de diagnostico_principal no es válido.' AS message,
          NULL::UUID AS created_patient_id,
          NULL::UUID AS created_appointment_id;
  
      -- Capturar cualquier otro error de SQL (ej. llaves duplicadas)
      WHEN OTHERS THEN
        RETURN QUERY SELECT
          FALSE,
          SQLERRM AS message, -- SQLERRM contiene el mensaje del error
          NULL::UUID AS created_patient_id,
          NULL::UUID AS created_appointment_id;
    END;
END;
$$;
