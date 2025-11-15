-- supabase/sql/rls_granular.sql
-- Políticas de Row Level Security (RLS) granulares por rol
-- Sistema de permisos basado en roles para control de acceso detallado

-- ============================================================================
-- FUNCIONES AUXILIARES PARA RLS
-- ============================================================================

-- Función para verificar si el usuario tiene un rol específico
create or replace function public.has_role(required_role text)
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role::text = required_role
  );
end;
$$ language plpgsql stable security definer;

-- Función para verificar si el usuario es admin o doctor
create or replace function public.is_admin_or_doctor()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role::text in ('admin', 'doctor')
  );
end;
$$ language plpgsql stable security definer;

-- Función para verificar si el usuario es asistente o superior
create or replace function public.is_staff()
returns boolean as $$
begin
  return exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
    and p.role::text in ('admin', 'doctor', 'asistente')
  );
end;
$$ language plpgsql stable security definer;

-- ============================================================================
-- POLÍTICAS RLS PARA TABLA: patients
-- ============================================================================

-- Eliminar políticas existentes si existen
drop policy if exists "patients_select_policy" on public.patients;
drop policy if exists "patients_insert_policy" on public.patients;
drop policy if exists "patients_update_policy" on public.patients;
drop policy if exists "patients_delete_policy" on public.patients;

-- Habilitar RLS en la tabla patients
alter table public.patients enable row level security;

-- SELECT: Todos los staff pueden leer pacientes
create policy "patients_select_policy"
  on public.patients
  for select
  using (public.is_staff());

-- INSERT: Solo admin y doctor pueden crear pacientes
create policy "patients_insert_policy"
  on public.patients
  for insert
  with check (public.is_admin_or_doctor());

-- UPDATE: Solo admin y doctor pueden actualizar pacientes
create policy "patients_update_policy"
  on public.patients
  for update
  using (public.is_admin_or_doctor())
  with check (public.is_admin_or_doctor());

-- DELETE: Solo admin puede eliminar pacientes
create policy "patients_delete_policy"
  on public.patients
  for delete
  using (public.has_role('admin'));

-- ============================================================================
-- POLÍTICAS RLS PARA TABLA: appointments
-- ============================================================================

-- Eliminar políticas existentes si existen
drop policy if exists "appointments_select_policy" on public.appointments;
drop policy if exists "appointments_insert_policy" on public.appointments;
drop policy if exists "appointments_update_policy" on public.appointments;
drop policy if exists "appointments_delete_policy" on public.appointments;

-- Habilitar RLS en la tabla appointments
alter table public.appointments enable row level security;

-- SELECT: Todos los staff pueden leer citas
create policy "appointments_select_policy"
  on public.appointments
  for select
  using (public.is_staff());

-- INSERT: Todos los staff pueden crear citas
create policy "appointments_insert_policy"
  on public.appointments
  for insert
  with check (public.is_staff());

-- UPDATE: Solo admin y doctor pueden actualizar citas
-- Asistentes pueden ver pero no modificar estado de citas
create policy "appointments_update_policy"
  on public.appointments
  for update
  using (public.is_admin_or_doctor())
  with check (public.is_admin_or_doctor());

-- DELETE: Solo admin puede eliminar citas
create policy "appointments_delete_policy"
  on public.appointments
  for delete
  using (public.has_role('admin'));

-- ============================================================================
-- POLÍTICAS RLS PARA TABLA: assigned_surveys
-- ============================================================================

-- Eliminar políticas existentes si existen
drop policy if exists "assigned_surveys_select_policy" on public.assigned_surveys;
drop policy if exists "assigned_surveys_insert_policy" on public.assigned_surveys;
drop policy if exists "assigned_surveys_update_policy" on public.assigned_surveys;
drop policy if exists "assigned_surveys_delete_policy" on public.assigned_surveys;

-- Habilitar RLS en la tabla assigned_surveys
alter table public.assigned_surveys enable row level security;

-- SELECT: Todos los staff pueden leer encuestas asignadas
create policy "assigned_surveys_select_policy"
  on public.assigned_surveys
  for select
  using (public.is_staff());

-- INSERT: Solo admin y doctor pueden asignar encuestas
create policy "assigned_surveys_insert_policy"
  on public.assigned_surveys
  for insert
  with check (public.is_admin_or_doctor());

-- UPDATE: Solo admin y doctor pueden actualizar asignaciones
create policy "assigned_surveys_update_policy"
  on public.assigned_surveys
  for update
  using (public.is_admin_or_doctor())
  with check (public.is_admin_or_doctor());

-- DELETE: Solo admin puede eliminar asignaciones de encuestas
create policy "assigned_surveys_delete_policy"
  on public.assigned_surveys
  for delete
  using (public.has_role('admin'));

-- ============================================================================
-- POLÍTICAS RLS PARA TABLA: profiles
-- ============================================================================

-- Eliminar políticas existentes si existen
drop policy if exists "profiles_select_policy" on public.profiles;
drop policy if exists "profiles_update_own_policy" on public.profiles;
drop policy if exists "profiles_update_all_policy" on public.profiles;

-- Habilitar RLS en la tabla profiles
alter table public.profiles enable row level security;

-- SELECT: Usuarios autenticados pueden leer todos los perfiles (para UI)
create policy "profiles_select_policy"
  on public.profiles
  for select
  using (auth.uid() is not null);

-- UPDATE: Usuarios pueden actualizar su propio perfil (solo campos permitidos)
create policy "profiles_update_own_policy"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id and
    -- Prevenir que usuarios cambien su propio rol
    (old.role = new.role or public.has_role('admin'))
  );

-- UPDATE: Solo admin puede actualizar cualquier perfil
create policy "profiles_update_all_policy"
  on public.profiles
  for update
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

-- ============================================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================================================

comment on function public.has_role(text) is
'Verifica si el usuario actual tiene el rol especificado. Roles válidos: admin, doctor, asistente';

comment on function public.is_admin_or_doctor() is
'Verifica si el usuario actual es admin o doctor';

comment on function public.is_staff() is
'Verifica si el usuario actual es miembro del staff (admin, doctor, o asistente)';

-- ============================================================================
-- NOTAS DE IMPLEMENTACIÓN
-- ============================================================================

-- Para aplicar estas políticas, ejecutar este archivo en la base de datos de Supabase:
-- 1. Ir a SQL Editor en Supabase Dashboard
-- 2. Copiar y pegar este archivo completo
-- 3. Ejecutar
--
-- Para verificar que las políticas están activas:
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- Para verificar RLS habilitado:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND rowsecurity = true;
