-- supabase/sql/audit_triggers.sql
-- Sistema de auditoría para tablas críticas
-- Registra automáticamente todos los cambios (INSERT, UPDATE, DELETE) con contexto completo

-- ============================================================================
-- TABLA DE AUDITORÍA
-- ============================================================================

-- Crear tabla de logs de auditoría si no existe
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  user_role text,
  old_data jsonb,
  new_data jsonb,
  changed_fields jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Índices para mejorar rendimiento de consultas de auditoría
create index if not exists audit_log_table_name_idx on public.audit_log(table_name);
create index if not exists audit_log_user_id_idx on public.audit_log(user_id);
create index if not exists audit_log_created_at_idx on public.audit_log(created_at desc);
create index if not exists audit_log_operation_idx on public.audit_log(operation);

-- Habilitar RLS en audit_log (solo admin puede leer)
alter table public.audit_log enable row level security;

-- Policy: Solo admin puede leer logs de auditoría
drop policy if exists "audit_log_select_policy" on public.audit_log;
create policy "audit_log_select_policy"
  on public.audit_log
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
      and p.role::text = 'admin'
    )
  );

-- ============================================================================
-- FUNCIÓN DE TRIGGER PARA AUDITORÍA
-- ============================================================================

create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer
as $$
declare
  v_user_email text;
  v_user_role text;
  v_changed_fields jsonb;
begin
  -- Obtener email y rol del usuario actual
  select email, role::text
  into v_user_email, v_user_role
  from public.profiles
  where id = auth.uid();

  -- Para UPDATE, calcular campos que cambiaron
  if TG_OP = 'UPDATE' then
    v_changed_fields = jsonb_build_object();
    -- Comparar OLD y NEW para detectar cambios
    declare
      old_record jsonb := to_jsonb(OLD);
      new_record jsonb := to_jsonb(NEW);
      key text;
    begin
      for key in select jsonb_object_keys(new_record)
      loop
        if old_record->key is distinct from new_record->key then
          v_changed_fields = v_changed_fields || jsonb_build_object(
            key,
            jsonb_build_object(
              'old', old_record->key,
              'new', new_record->key
            )
          );
        end if;
      end loop;
    end;
  end if;

  -- Insertar registro de auditoría
  insert into public.audit_log (
    table_name,
    operation,
    user_id,
    user_email,
    user_role,
    old_data,
    new_data,
    changed_fields,
    ip_address,
    user_agent
  )
  values (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    v_user_email,
    v_user_role,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    v_changed_fields,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  -- Retornar el registro apropiado según la operación
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- ============================================================================
-- APLICAR TRIGGERS A TABLAS CRÍTICAS
-- ============================================================================

-- Trigger para tabla: patients
drop trigger if exists audit_patients_trigger on public.patients;
create trigger audit_patients_trigger
  after insert or update or delete
  on public.patients
  for each row
  execute function public.audit_trigger_func();

-- Trigger para tabla: appointments
drop trigger if exists audit_appointments_trigger on public.appointments;
create trigger audit_appointments_trigger
  after insert or update or delete
  on public.appointments
  for each row
  execute function public.audit_trigger_func();

-- Trigger para tabla: assigned_surveys
drop trigger if exists audit_assigned_surveys_trigger on public.assigned_surveys;
create trigger audit_assigned_surveys_trigger
  after insert or update or delete
  on public.assigned_surveys
  for each row
  execute function public.audit_trigger_func();

-- Trigger para tabla: profiles (cambios de rol son críticos)
drop trigger if exists audit_profiles_trigger on public.profiles;
create trigger audit_profiles_trigger
  after insert or update or delete
  on public.profiles
  for each row
  execute function public.audit_trigger_func();

-- ============================================================================
-- VISTAS ÚTILES PARA CONSULTAS DE AUDITORÍA
-- ============================================================================

-- Vista: Cambios recientes (últimas 24 horas)
create or replace view public.audit_recent_changes as
select
  al.id,
  al.table_name,
  al.operation,
  al.user_email,
  al.user_role,
  al.changed_fields,
  al.created_at,
  extract(epoch from (now() - al.created_at)) / 3600 as hours_ago
from public.audit_log al
where al.created_at > now() - interval '24 hours'
order by al.created_at desc;

-- Vista: Resumen de actividad por usuario
create or replace view public.audit_user_activity as
select
  al.user_email,
  al.user_role,
  al.table_name,
  al.operation,
  count(*) as operation_count,
  max(al.created_at) as last_action
from public.audit_log al
where al.created_at > now() - interval '30 days'
group by al.user_email, al.user_role, al.table_name, al.operation
order by max(al.created_at) desc;

-- Vista: Cambios críticos (eliminaciones y cambios de rol)
create or replace view public.audit_critical_changes as
select
  al.id,
  al.table_name,
  al.operation,
  al.user_email,
  al.user_role,
  al.old_data,
  al.new_data,
  al.changed_fields,
  al.created_at
from public.audit_log al
where
  al.operation = 'DELETE'
  or (al.table_name = 'profiles' and al.changed_fields ? 'role')
order by al.created_at desc;

-- ============================================================================
-- FUNCIONES AUXILIARES PARA CONSULTAS DE AUDITORÍA
-- ============================================================================

-- Función para obtener historial de un registro específico
create or replace function public.get_record_history(
  p_table_name text,
  p_record_id uuid
)
returns table (
  operation text,
  user_email text,
  changed_fields jsonb,
  created_at timestamptz
)
language sql
stable
security definer
as $$
  select
    al.operation,
    al.user_email,
    al.changed_fields,
    al.created_at
  from public.audit_log al
  where al.table_name = p_table_name
    and (
      (al.old_data->>'id')::uuid = p_record_id
      or (al.new_data->>'id')::uuid = p_record_id
    )
  order by al.created_at desc;
$$;

-- Función para obtener actividad de un usuario
create or replace function public.get_user_audit_trail(
  p_user_email text,
  p_days integer default 30
)
returns table (
  table_name text,
  operation text,
  created_at timestamptz,
  changed_fields jsonb
)
language sql
stable
security definer
as $$
  select
    al.table_name,
    al.operation,
    al.created_at,
    al.changed_fields
  from public.audit_log al
  where al.user_email = p_user_email
    and al.created_at > now() - (p_days || ' days')::interval
  order by al.created_at desc;
$$;

-- ============================================================================
-- POLÍTICA DE RETENCIÓN (OPCIONAL)
-- ============================================================================

-- Función para limpiar logs antiguos (ejecutar manualmente o con cron)
create or replace function public.cleanup_old_audit_logs(
  p_retention_days integer default 365
)
returns integer
language plpgsql
security definer
as $$
declare
  v_deleted_count integer;
begin
  -- Solo admin puede ejecutar esta función
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin'
  ) then
    raise exception 'Solo administradores pueden limpiar logs de auditoría';
  end if;

  delete from public.audit_log
  where created_at < now() - (p_retention_days || ' days')::interval;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

comment on table public.audit_log is
'Tabla de auditoría que registra todos los cambios en tablas críticas. Solo administradores pueden consultar.';

comment on function public.audit_trigger_func() is
'Función de trigger que registra automáticamente INSERT, UPDATE, DELETE en audit_log con contexto completo.';

comment on function public.get_record_history(text, uuid) is
'Obtiene el historial completo de cambios de un registro específico.';

comment on function public.get_user_audit_trail(text, integer) is
'Obtiene el trail de auditoría de un usuario específico.';

comment on function public.cleanup_old_audit_logs(integer) is
'Limpia logs de auditoría más antiguos que el número de días especificado. Solo admin.';

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- Para aplicar este sistema de auditoría:
-- 1. Ejecutar este archivo en SQL Editor de Supabase
-- 2. Verificar que los triggers están activos:
--    SELECT * FROM pg_trigger WHERE tgname LIKE 'audit_%';
--
-- Para consultar auditoría:
-- - Ver cambios recientes: SELECT * FROM audit_recent_changes;
-- - Ver actividad por usuario: SELECT * FROM audit_user_activity;
-- - Ver cambios críticos: SELECT * FROM audit_critical_changes;
-- - Historial de un paciente: SELECT * FROM get_record_history('patients', 'uuid-here');
--
-- Para mantener la tabla de auditoría:
-- - Ejecutar limpieza anual: SELECT cleanup_old_audit_logs(365);
