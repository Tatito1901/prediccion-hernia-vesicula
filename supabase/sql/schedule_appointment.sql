-- RPC: schedule_appointment
-- Purpose: Atomically create or update an appointment with overlap checks by doctor and datetime.
-- Notes:
-- - Overlap is only checked when doctor_id IS NOT NULL.
-- - Overlap considers appointments in states PROGRAMADA, CONFIRMADA, PRESENTE, intentionally
--   NOT including COMPLETADA to allow reusing that time slot once completed. This is a business
--   decision: completed appointments do not block future scheduling at the same time.
-- - For updates, target doctor/datetime default to current row values when NULL is provided.
-- - Optimistic concurrency can be enforced via p_expected_updated_at.

create or replace function public.schedule_appointment(
  p_action text,
  p_appointment_id uuid default null,
  p_patient_id uuid default null,
  p_doctor_id uuid default null,
  p_fecha_hora_cita timestamptz default null,
  p_estado_cita public.appointment_status_enum default null,
  p_motivos_consulta public.diagnosis_enum[] default null,
  p_notas_breves text default null,
  p_es_primera_vez boolean default null,
  p_expected_updated_at timestamptz default null
)
returns table (
  success boolean,
  message text,
  appointment_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conflict_exists boolean;
  v_target_doctor uuid;
  v_target_datetime timestamptz;
  v_id uuid;
  rec_current appointments%rowtype;
begin
  if p_action not in ('create', 'update') then
    return query select false, 'Acción inválida. Use create/update.', null::uuid;
    return;
  end if;

  if p_action = 'create' then
    if p_patient_id is null then
      return query select false, 'Falta patient_id', null::uuid;
      return;
    end if;
    if p_fecha_hora_cita is null then
      return query select false, 'Falta fecha_hora_cita', null::uuid;
      return;
    end if;

    -- Reject creating appointments in the past (absolute time)
    if p_fecha_hora_cita < now() then
      return query select false, 'La fecha de la cita no puede ser en el pasado', null::uuid;
      return;
    end if;

    -- Overlap check only if doctor provided
    if p_doctor_id is not null then
      select exists (
        select 1
        from appointments a
        where a.doctor_id = p_doctor_id
          and a.fecha_hora_cita = p_fecha_hora_cita
          and a.estado_cita in ('PROGRAMADA','CONFIRMADA','PRESENTE')
      ) into v_conflict_exists;

      if v_conflict_exists then
        return query select false, 'Horario no disponible', null::uuid;
        return;
      end if;
    end if;

    insert into appointments (
      patient_id,
      doctor_id,
      fecha_hora_cita,
      motivos_consulta,
      estado_cita,
      notas_breves,
      es_primera_vez,
      updated_at
    ) values (
      p_patient_id,
      p_doctor_id,
      p_fecha_hora_cita,
      coalesce(p_motivos_consulta, array[]::public.diagnosis_enum[]),
      coalesce(p_estado_cita, 'PROGRAMADA'),
      p_notas_breves,
      p_es_primera_vez,
      now()
    ) returning id into v_id;

    return query select true, 'Cita creada', v_id;
    return;
  end if;

  if p_action = 'update' then
    if p_appointment_id is null then
      return query select false, 'Falta appointment_id para actualizar', null::uuid;
      return;
    end if;

    -- Lock current row for update
    select * into rec_current
    from appointments
    where id = p_appointment_id
    for update;

    if not found then
      return query select false, 'Cita no encontrada', null::uuid;
      return;
    end if;

    -- Optimistic concurrency (optional)
    if p_expected_updated_at is not null and rec_current.updated_at is distinct from p_expected_updated_at then
      return query select false, 'La cita fue actualizada por otro proceso', null::uuid;
      return;
    end if;

    -- Determine target values for conflict validation
    v_target_doctor := coalesce(p_doctor_id, rec_current.doctor_id);
    v_target_datetime := coalesce(p_fecha_hora_cita, rec_current.fecha_hora_cita);

    -- Reject explicitly setting the appointment datetime into the past
    if p_fecha_hora_cita is not null and p_fecha_hora_cita < now() then
      return query select false, 'La fecha de la cita no puede ser en el pasado', null::uuid;
      return;
    end if;

    if v_target_doctor is not null then
      select exists (
        select 1
        from appointments a
        where a.doctor_id = v_target_doctor
          and a.fecha_hora_cita = v_target_datetime
          and a.estado_cita in ('PROGRAMADA','CONFIRMADA','PRESENTE')
          and a.id <> p_appointment_id
      ) into v_conflict_exists;

      if v_conflict_exists then
        return query select false, 'Horario no disponible', null::uuid;
        return;
      end if;
    end if;

    update appointments a set
      doctor_id = coalesce(p_doctor_id, a.doctor_id),
      fecha_hora_cita = coalesce(p_fecha_hora_cita, a.fecha_hora_cita),
      motivos_consulta = coalesce(p_motivos_consulta, a.motivos_consulta),
      estado_cita = coalesce(p_estado_cita, a.estado_cita),
      notas_breves = coalesce(p_notas_breves, a.notas_breves),
      es_primera_vez = coalesce(p_es_primera_vez, a.es_primera_vez),
      updated_at = now()
    where a.id = p_appointment_id
    returning a.id into v_id;

    return query select true, 'Cita actualizada', v_id;
    return;
  end if;

  -- Should never reach here
  return query select false, 'Acción desconocida', null::uuid;
end;
$$;
