-- supabase/sql/reschedule_appointment.sql
-- RPC: reschedule_appointment
-- Purpose: Atomically reschedule an existing appointment to a new datetime and leave it in PROGRAMADA state.
-- Delegates to schedule_appointment RPC (update path) to reuse overlap/concurrency checks.

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_fecha_hora_cita timestamptz,
  p_expected_updated_at timestamptz default null,
  p_doctor_id uuid default null,
  p_notas_breves text default null
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
  rec_before appointments%rowtype;
  v_uid uuid;
  res record;
  rec_after appointments%rowtype;
  v_now timestamptz := now();
begin
  -- Snapshot previo para auditoría (sin bloquear la fila)
  select * into rec_before from appointments where id = p_appointment_id;
  if not found then
    return query select false, 'Cita no encontrada', null::uuid;
    return;
  end if;

  -- Ejecutar actualización atómica reutilizando validaciones de schedule_appointment
  select * into res
  from public.schedule_appointment(
    p_action => 'update',
    p_appointment_id => p_appointment_id,
    p_patient_id => null,
    p_doctor_id => p_doctor_id,
    p_fecha_hora_cita => p_new_fecha_hora_cita,
    p_estado_cita => 'PROGRAMADA',
    p_motivos_consulta => null,
    p_notas_breves => p_notas_breves,
    p_es_primera_vez => null,
    p_expected_updated_at => p_expected_updated_at
  );

  if not coalesce(res.success, false) then
    return query select false, coalesce(res.message, 'No se pudo reagendar la cita'), null::uuid;
    return;
  end if;

  -- Obtener fila actualizada para auditoría
  select * into rec_after from appointments where id = p_appointment_id;

  -- Identidad del usuario para historial (si el JWT lo provee)
  begin
    v_uid := auth.uid();
  exception when others then
    v_uid := null;
  end;

  -- Registrar cambios en appointment_history
  if rec_before.estado_cita is distinct from rec_after.estado_cita then
    insert into appointment_history (
      appointment_id, field_changed, value_before, value_after, change_reason, changed_by, changed_at
    ) values (
      rec_after.id, 'estado_cita', rec_before.estado_cita::text, rec_after.estado_cita::text,
      'Reagendamiento de cita', v_uid, v_now
    );
  end if;

  if rec_before.fecha_hora_cita is distinct from rec_after.fecha_hora_cita then
    insert into appointment_history (
      appointment_id, field_changed, value_before, value_after, change_reason, changed_by, changed_at
    ) values (
      rec_after.id, 'fecha_hora_cita', rec_before.fecha_hora_cita::text, rec_after.fecha_hora_cita::text,
      'Reagendamiento de cita', v_uid, v_now
    );
  end if;

  return query select true, 'Cita reagendada', res.appointment_id::uuid;
end;
$$;

-- Ensure clients can execute the RPC
grant execute on function public.reschedule_appointment(uuid, timestamptz, timestamptz, uuid, text) to anon, authenticated;
