-- supabase/sql/rls_policies.sql
-- RLS-by-default baseline. Adjust conditions to your exact business rules.
-- This script is idempotent for functions and uses safe guards for policies.

-- Helper: determine if the current authenticated user is staff (doctor/asistente/admin)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and coalesce(p.role::text, '') in ('doctor','asistente','admin','ADMIN','DOCTOR','ASISTENTE')
  );
$$;

-- Grant function usage to app roles
grant execute on function public.is_staff() to authenticated, anon;

-- Enable RLS on sensitive tables (no-op if already enabled)
alter table if exists public.patients enable row level security;
alter table if exists public.appointments enable row level security;
alter table if exists public.assigned_surveys enable row level security;
alter table if exists public.survey_responses enable row level security;
alter table if exists public.appointment_history enable row level security;
alter table if exists public.profiles enable row level security;

-- Profiles: users can view/update only their own profile
do $$ begin
  begin
    create policy profiles_self_select on public.profiles
      for select using ( id = auth.uid() );
  exception when duplicate_object then null; end;
  begin
    create policy profiles_self_update on public.profiles
      for update using ( id = auth.uid() ) with check ( id = auth.uid() );
  exception when duplicate_object then null; end;
  begin
    create policy profiles_staff_select on public.profiles
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
end $$;

-- Patients: allow staff to read/modify; tighten later per needs
do $$ begin
  begin
    create policy patients_staff_select on public.patients
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy patients_staff_insert on public.patients
      for insert with check ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy patients_staff_update on public.patients
      for update using ( public.is_staff() ) with check ( public.is_staff() );
  exception when duplicate_object then null; end;
end $$;

-- Appointments: allow staff to read/modify; RPCs handle atomic rescheduling
do $$ begin
  begin
    create policy appointments_staff_select on public.appointments
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy appointments_staff_insert on public.appointments
      for insert with check ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy appointments_staff_update on public.appointments
      for update using ( public.is_staff() ) with check ( public.is_staff() );
  exception when duplicate_object then null; end;
end $$;

-- Appointment history: staff only
do $$ begin
  begin
    create policy appt_history_staff_select on public.appointment_history
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy appt_history_staff_insert on public.appointment_history
      for insert with check ( public.is_staff() );
  exception when duplicate_object then null; end;
end $$;

-- Surveys
do $$ begin
  begin
    create policy assigned_surveys_staff_select on public.assigned_surveys
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy assigned_surveys_staff_insert on public.assigned_surveys
      for insert with check ( public.is_staff() );
  exception when duplicate_object then null; end;
  begin
    create policy survey_responses_staff_select on public.survey_responses
      for select using ( public.is_staff() );
  exception when duplicate_object then null; end;
end $$;

-- Ensure authenticated users can execute RPCs used by the app
-- schedule_appointment(p_action text, p_appointment_id uuid, p_patient_id uuid, p_doctor_id uuid, p_fecha_hora_cita timestamptz, p_estado_cita appointment_status_enum, p_motivos_consulta diagnosis_enum[], p_notas_breves text, p_es_primera_vez boolean, p_expected_updated_at timestamptz)
do $$ begin
  begin
    grant execute on function public.schedule_appointment(text, uuid, uuid, uuid, timestamptz, public.appointment_status_enum, public.diagnosis_enum[], text, boolean, timestamptz) to authenticated;
  exception when undefined_function then null; end;
end $$;

-- create_patient_and_appointment(p_nombre text, p_apellidos text, p_telefono text, p_email text, p_edad integer, p_diagnostico_principal diagnosis_enum, p_comentarios_registro text, p_probabilidad_cirugia numeric, p_fecha_hora_cita timestamptz, p_motivo_cita text, p_doctor_id uuid, p_creado_por_id uuid)
do $$ begin
  begin
    grant execute on function public.create_patient_and_appointment(text, text, text, text, integer, public.diagnosis_enum, text, numeric, timestamptz, text, uuid, uuid) to authenticated;
  exception when undefined_function then null; end;
end $$;
