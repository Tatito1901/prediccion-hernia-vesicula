-- supabase/sql/create_patient_and_appointment.sql
-- RPC: create_patient_and_appointment
-- Purpose: Atomically create a patient and their initial appointment.
-- If the appointment creation fails (e.g., overlap, validation), the patient insert is rolled back.

create or replace function public.create_patient_and_appointment(
  p_nombre text,
  p_apellidos text,
  p_telefono text,
  p_email text,
  p_edad integer,
  p_diagnostico_principal public.diagnosis_enum,
  p_comentarios_registro text,
  p_probabilidad_cirugia numeric,
  p_fecha_hora_cita timestamptz,
  p_motivo_cita text,
  p_doctor_id uuid default null,
  p_creado_por_id uuid default null
)
returns table (
  success boolean,
  message text,
  created_patient_id uuid,
  created_appointment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_sched record;
begin
  -- Insert patient
  insert into patients (
    nombre,
    apellidos,
    telefono,
    email,
    edad,
    diagnostico_principal,
    comentarios_registro,
    probabilidad_cirugia,
    creado_por,
    creation_source,
    fecha_registro,
    updated_at
  ) values (
    p_nombre,
    p_apellidos,
    nullif(p_telefono, ''),
    nullif(p_email, ''),
    nullif(p_edad, 0),
    p_diagnostico_principal,
    nullif(p_comentarios_registro, ''),
    nullif(p_probabilidad_cirugia, 0),
    p_creado_por_id,
    'patient_admission_rpc',
    now(),
    now()
  ) returning id into v_patient_id;

  -- Create appointment using centralized scheduler
  select *
  into v_sched
  from public.schedule_appointment(
    p_action := 'create',
    p_appointment_id := null,
    p_patient_id := v_patient_id,
    p_doctor_id := p_doctor_id,
    p_fecha_hora_cita := p_fecha_hora_cita,
    p_estado_cita := 'PROGRAMADA',
    p_motivos_consulta := array[p_diagnostico_principal]::public.diagnosis_enum[],
    p_notas_breves := p_motivo_cita,
    p_es_primera_vez := true,
    p_expected_updated_at := null
  );

  if not v_sched.success then
    -- Cause rollback of patient insert by raising exception
    raise exception using message = coalesce(v_sched.message, 'No se pudo crear la cita');
  end if;

  return query
    select true::boolean,
           'Paciente y cita creados'::text,
           v_patient_id,
           v_sched.appointment_id::uuid;
end;
$$;
