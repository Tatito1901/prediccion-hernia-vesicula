# EJEMPLOS DE CÓDIGO PARA REFACTORIZACIÓN

Este documento contiene código listo para usar en las refactorizaciones propuestas.

---

## 1. TIPOS COMPARTIDOS

### Crear: `lib/api-response-types.ts`

```typescript
/**
 * Tipos compartidos para respuestas de API
 * Centraliza la estructura de todas las responses
 */

// Response genérica exitosa
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Response paginada
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  summary?: Record<string, unknown>;
}

// Estructura de error
export interface ApiError {
  name: 'ApiError';
  message: string;
  status: number;
  code?: string;
  category: 'network' | 'auth' | 'validation' | 'server' | 'client' | 'unknown';
  details?: ErrorDetails;
  cause?: unknown;
}

// Detalles de error
export interface ErrorDetails {
  code?: string;
  validation_errors?: ValidationError[];
  suggested_actions?: string[];
  existing_patient?: {
    id: string;
    nombre: string;
    apellidos: string;
  };
  [key: string]: unknown;
}

// Error de validación
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Payload de error para mutations
export interface MutationErrorPayload {
  code?: string;
  validation_errors?: ValidationError[];
  suggested_actions?: string[];
  details?: Record<string, unknown>;
}

// Helper para type guards
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value
  );
}

export function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    Array.isArray((value as any).data) &&
    'pagination' in value
  );
}
```

---

## 2. SCHEMAS ZOD PARA APIs

### Crear: `lib/validation/api-schemas.ts`

```typescript
import { z } from 'zod';
import { ZDiagnosisDb } from '@/lib/constants';

/**
 * Schemas Zod para validación de API responses
 */

// Patient schemas
export const ZPatientBase = z.object({
  id: z.string().uuid(),
  nombre: z.string().min(1),
  apellidos: z.string().min(1),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  genero: z.enum(['Masculino', 'Femenino', 'Otro']).optional().nullable(),
  fecha_nacimiento: z.string().optional().nullable(),
  diagnostico_principal: ZDiagnosisDb.optional().nullable(),
  estado_paciente: z.enum(['activo', 'inactivo', 'en_tratamiento', 'dado_de_alta']).optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export const ZPatient = ZPatientBase.extend({
  // Campos adicionales específicos
  notas: z.string().optional().nullable(),
  alergias: z.string().optional().nullable(),
});

export const ZPatientsResponse = z.object({
  data: z.array(ZPatient),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
  summary: z.object({
    total: z.number().int().nonnegative(),
    activos: z.number().int().nonnegative(),
    inactivos: z.number().int().nonnegative(),
  }).optional(),
});

// Appointment schemas
export const ZAppointmentBase = z.object({
  id: z.string().uuid(),
  patient_id: z.string().uuid(),
  fecha_hora_cita: z.string(),
  estado_cita: z.enum([
    'programada',
    'confirmada',
    'en_curso',
    'completada',
    'cancelada',
    'no_asistio',
    'reprogramada'
  ]),
  motivos_consulta: z.array(z.string()),
  doctor_id: z.string().uuid().nullable(),
  notas_breves: z.string().optional().nullable(),
  es_primera_vez: z.boolean().optional().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
});

export const ZAppointmentWithPatient = ZAppointmentBase.extend({
  patients: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    apellidos: z.string(),
    telefono: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    diagnostico_principal: ZDiagnosisDb.optional().nullable(),
    estado_paciente: z.string().optional().nullable(),
  }).nullable(),
});

export const ZAppointmentsResponse = z.object({
  data: z.array(ZAppointmentWithPatient),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
  summary: z.object({
    today_count: z.number().int().nonnegative(),
    future_count: z.number().int().nonnegative(),
    past_count: z.number().int().nonnegative(),
  }).optional(),
});

// Types exportados
export type Patient = z.infer<typeof ZPatient>;
export type PatientsResponse = z.infer<typeof ZPatientsResponse>;
export type Appointment = z.infer<typeof ZAppointmentBase>;
export type AppointmentWithPatient = z.infer<typeof ZAppointmentWithPatient>;
export type AppointmentsResponse = z.infer<typeof ZAppointmentsResponse>;
```

---

## 3. REFACTORIZACIÓN DE HOOKS

### Actualizar: `hooks/core/use-patients.ts`

```typescript
// Agregar imports
import { ZPatient, ZPatientsResponse } from '@/lib/validation/api-schemas';
import type { PatientsResponse, Patient } from '@/lib/validation/api-schemas';
import type { ApiResponse, MutationErrorPayload } from '@/lib/api-response-types';

// ANTES (línea 77):
const payload: any = await queryFetcher<any>(endpoints.patients.detail(id));

// DESPUÉS:
const fetchPatientDetail = async (id: string): Promise<Patient> => {
  const raw = await queryFetcher<unknown>(endpoints.patients.detail(id));

  // Validar con Zod
  const parsed = ZPatient.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0];
    const msg = first
      ? `Invalid patient data: ${first.path?.join('.')}: ${first.message}`
      : 'Invalid patient response';
    throw new Error(msg);
  }

  return parsed.data;
};

// ANTES (línea 100):
} catch (error: any) {

// DESPUÉS:
} catch (error: unknown) {
  const err = error as Error & { status?: number };
  if (err?.status === 404) {
    return null;
  }
  throw error;
}

// ANTES (línea 300-314):
const payloadResp: any = await fetchJson<any>(endpoints.admission.create(), {
  method: 'POST',
  body: JSON.stringify(payload),
});

if (payloadResp && payloadResp.success === true && 'data' in payloadResp) {
  const data = payloadResp.data as any;

// DESPUÉS:
interface AdmissionResponse {
  success: boolean;
  data: {
    patient: Patient;
    appointment: Appointment;
  };
  message?: string;
}

const payloadResp = await fetchJson<AdmissionResponse>(
  endpoints.admission.create(),
  {
    method: 'POST',
    body: JSON.stringify(payload),
  }
);

if (payloadResp?.success && payloadResp.data) {
  const { patient, appointment } = payloadResp.data;

// ANTES (línea 336-343):
onError: (error: any) => {
  const status = error?.status;
  const payload: any = error?.details ?? {};
  const code: string | undefined = typeof payload?.code === 'string'
    ? (payload.code as string).toUpperCase()
    : undefined;

// DESPUÉS:
onError: (error: unknown) => {
  const err = error as Error & { status?: number; details?: MutationErrorPayload };
  const status = err?.status;
  const payload = err?.details;

  const code = typeof payload?.code === 'string'
    ? payload.code.toUpperCase()
    : undefined;

  const validationErrors = Array.isArray(payload?.validation_errors)
    ? payload.validation_errors
    : undefined;
```

---

## 4. COMPONENTES PERFORMANCE

### Refactorizar: `components/surveys/survey-results-analyzer.tsx`

```typescript
import { memo, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Extraer función fuera del componente
const generatePersuasivePoints = (
  patient: Patient,
  survey: PatientSurveyData | null
): PersuasivePoint[] => {
  const points: PersuasivePoint[] = [];

  // ... lógica existente ...

  return points;
};

// Crear subcomponentes memoizados
interface ResumenTabProps {
  patientData: Patient | null;
  surveyData: PatientSurveyData | null;
  insights: ModelInsight[];
}

const ResumenTab = memo(function ResumenTab({
  patientData,
  surveyData,
  insights
}: ResumenTabProps) {
  return (
    <div className="space-y-6">
      {/* Contenido actual de TabsContent value="resumen" */}
      {patientData && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* ... */}
        </div>
      )}
    </div>
  );
});

interface ProbabilidadTabProps {
  surgeryProbability: number;
}

const ProbabilidadTab = memo(function ProbabilidadTab({
  surgeryProbability
}: ProbabilidadTabProps) {
  return (
    <div className="space-y-6">
      {/* Contenido actual de TabsContent value="probabilidad" */}
    </div>
  );
});

interface RiesgosTabProps {
  persuasivePoints: PersuasivePoint[];
}

const RiesgosTab = memo(function RiesgosTab({
  persuasivePoints
}: RiesgosTabProps) {
  return (
    <div className="space-y-4">
      {/* Contenido actual de TabsContent value="riesgos" */}
    </div>
  );
});

// Componente principal simplificado
export function SurveyResultsAnalyzer({
  patient,
  survey
}: SurveyResultsAnalyzerProps) {
  // ... hooks existentes ...

  const persuasivePoints = useMemo(
    () => generatePersuasivePoints(patient, survey),
    [patient, survey]
  );

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        {/* ... header existente ... */}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="probabilidad">Probabilidad</TabsTrigger>
            <TabsTrigger value="riesgos">Riesgos</TabsTrigger>
            <TabsTrigger value="recomendaciones">Recomendaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <ResumenTab
              patientData={patient}
              surveyData={survey}
              insights={insights}
            />
          </TabsContent>

          <TabsContent value="probabilidad">
            <ProbabilidadTab surgeryProbability={surgeryProbability} />
          </TabsContent>

          <TabsContent value="riesgos">
            <RiesgosTab persuasivePoints={persuasivePoints} />
          </TabsContent>

          {/* ... otras tabs ... */}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Lazy loading en componente padre
const SurveyResultsAnalyzerLazy = dynamic(
  () => import('./survey-results-analyzer').then(mod => ({
    default: mod.SurveyResultsAnalyzer
  })),
  {
    ssr: false,
    loading: () => (
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    ),
  }
);
```

---

## 5. OPTIMIZACIÓN DE CACHE

### Actualizar: `hooks/core/use-patients.ts`

```typescript
// Optimizar useUpdatePatient
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: { id: string; updates: Partial<Patient> }) => {
      const response = await fetchJson<ApiResponse<Patient>>(
        endpoints.patients.detail(variables.id),
        {
          method: 'PATCH',
          body: JSON.stringify(variables.updates),
        }
      );
      return response.data;
    },
    onSuccess: (updated, variables) => {
      // 1. Update directo en detalle (evita refetch)
      queryClient.setQueryData(
        queryKeys.patients.detail(variables.id),
        updated
      );

      // 2. Update manual en listas (evita refetch)
      queryClient.setQueriesData(
        { queryKey: queryKeys.patients.all },
        (old: PaginatedResponse<Patient> | undefined) => {
          if (!old?.data) return old;

          return {
            ...old,
            data: old.data.map((p) =>
              p.id === variables.id ? { ...p, ...updated } : p
            ),
          };
        }
      );

      // 3. Invalida SOLO si cambió estado (requiere refetch de stats)
      const estadoChanged =
        updated.estado_paciente &&
        variables.updates.estado_paciente &&
        updated.estado_paciente !== variables.updates.estado_paciente;

      if (estadoChanged) {
        // Solo invalida queries de estadísticas
        queryClient.invalidateQueries({
          queryKey: ['statistics'],
        });
      }

      toast.success('Paciente actualizado correctamente');
    },
    onError: (error: unknown) => {
      const err = error as Error;
      toast.error(`Error al actualizar paciente: ${err.message}`);
    },
  });
};
```

---

## 6. RESPONSIVIDAD

### Actualizar: `components/patients/patient-table.tsx`

```typescript
// ANTES (línea 247):
<Button
  variant="ghost"
  className="h-8 w-8 p-0"
  onClick={() => setOpenActionsId(patient.id)}
>
  <MoreHorizontal className="h-4 w-4" />
</Button>

// DESPUÉS:
<Button
  variant="ghost"
  className="h-11 w-11 p-0" // 44x44px mínimo WCAG 2.1
  onClick={() => setOpenActionsId(patient.id)}
  aria-label={`Acciones para ${patient.nombre} ${patient.apellidos}`}
>
  <MoreHorizontal className="h-5 w-5" />
</Button>

// ANTES (línea 596):
<div className="grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_80px] xl:grid-cols-[2fr_2fr_1.5fr_1fr_1fr_96px]">

// DESPUÉS:
<div className="hidden lg:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_80px] xl:grid-cols-[2fr_2fr_1.5fr_1fr_1fr_96px]">
```

### Actualizar: `components/patient-admision/patient-card.tsx`

```typescript
// ANTES (línea 598):
{patient?.email && (
  <a
    href={`mailto:${patient.email}`}
    className="hidden sm:flex items-center gap-1.5"
    aria-label={`Enviar correo a ${patient.email}`}
  >
    <Mail className="h-3.5 w-3.5 text-gray-400" />
    <span className="text-xs text-gray-600 truncate max-w-[120px]">
      {patient.email}
    </span>
  </a>
)}

// DESPUÉS (Opción 1 - Mostrar siempre):
{patient?.email && (
  <a
    href={`mailto:${patient.email}`}
    className="flex items-center gap-1.5"
    aria-label={`Enviar correo a ${patient.email}`}
  >
    <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
    <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[120px] sm:max-w-[160px]">
      {patient.email}
    </span>
  </a>
)}

// DESPUÉS (Opción 2 - Colapsable en móvil):
{patient?.email && (
  <>
    {/* Mobile: solo icono colapsable */}
    <div className="sm:hidden">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Mail className="h-4 w-4 text-gray-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2">
          <a href={`mailto:${patient.email}`} className="text-xs">
            {patient.email}
          </a>
        </PopoverContent>
      </Popover>
    </div>

    {/* Desktop: mostrar completo */}
    <a
      href={`mailto:${patient.email}`}
      className="hidden sm:flex items-center gap-1.5"
    >
      <Mail className="h-4 w-4 text-gray-400" />
      <span className="text-sm text-gray-600 truncate max-w-[160px]">
        {patient.email}
      </span>
    </a>
  </>
)}
```

---

## 7. RLS GRANULAR

### Crear: `supabase/sql/rls_granular.sql`

```sql
-- ==========================================
-- RLS POLÍTICAS GRANULARES POR ROL
-- ==========================================

-- Función para verificar rol específico
create or replace function public.has_role(required_role text)
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
      and coalesce(p.role::text, '') = required_role
  );
$$;

-- Función para verificar si es admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('admin');
$$;

-- Función para verificar si es doctor
create or replace function public.is_doctor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('doctor');
$$;

-- Función para verificar si es asistente
create or replace function public.is_asistente()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role('asistente');
$$;

-- ==========================================
-- POLÍTICAS PARA PACIENTES
-- ==========================================

-- Lectura: todos los staff
drop policy if exists patients_staff_select on public.patients;
create policy patients_staff_select on public.patients
  for select using (public.is_staff());

-- Inserción: solo doctor y admin
drop policy if exists patients_staff_insert on public.patients;
create policy patients_doctor_insert on public.patients
  for insert with check (public.is_doctor() or public.is_admin());

-- Actualización: solo doctor y admin
drop policy if exists patients_staff_update on public.patients;
create policy patients_doctor_update on public.patients
  for update
  using (public.is_doctor() or public.is_admin())
  with check (public.is_doctor() or public.is_admin());

-- Eliminación: solo admin
drop policy if exists patients_staff_delete on public.patients;
create policy patients_admin_delete on public.patients
  for delete using (public.is_admin());

-- ==========================================
-- POLÍTICAS PARA CITAS
-- ==========================================

-- Lectura: todos los staff
drop policy if exists appointments_staff_select on public.appointments;
create policy appointments_staff_select on public.appointments
  for select using (public.is_staff());

-- Inserción: asistente, doctor y admin
drop policy if exists appointments_staff_insert on public.appointments;
create policy appointments_staff_insert on public.appointments
  for insert with check (public.is_staff());

-- Actualización: solo doctor y admin
drop policy if exists appointments_staff_update on public.appointments;
create policy appointments_doctor_update on public.appointments
  for update
  using (public.is_doctor() or public.is_admin())
  with check (public.is_doctor() or public.is_admin());

-- Eliminación: solo admin
drop policy if exists appointments_staff_delete on public.appointments;
create policy appointments_admin_delete on public.appointments
  for delete using (public.is_admin());

-- ==========================================
-- POLÍTICAS PARA ENCUESTAS
-- ==========================================

-- Lectura: todos los staff
create policy assigned_surveys_staff_select on public.assigned_surveys
  for select using (public.is_staff());

-- Inserción: solo doctor y admin
create policy assigned_surveys_doctor_insert on public.assigned_surveys
  for insert with check (public.is_doctor() or public.is_admin());

-- Actualización: solo doctor y admin
create policy assigned_surveys_doctor_update on public.assigned_surveys
  for update
  using (public.is_doctor() or public.is_admin())
  with check (public.is_doctor() or public.is_admin());

-- Grant execute a las funciones
grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_doctor() to authenticated;
grant execute on function public.is_asistente() to authenticated;
```

---

## 8. AUDITORÍA

### Crear: `supabase/sql/audit_triggers.sql`

```sql
-- ==========================================
-- SISTEMA DE AUDITORÍA
-- ==========================================

-- Tabla de auditoría
create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid references auth.users(id),
  user_email text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Índices para búsquedas rápidas
create index if not exists idx_audit_log_table_name on public.audit_log(table_name);
create index if not exists idx_audit_log_user_id on public.audit_log(user_id);
create index if not exists idx_audit_log_created_at on public.audit_log(created_at desc);
create index if not exists idx_audit_log_operation on public.audit_log(operation);

-- RLS para audit_log (solo admins pueden ver)
alter table public.audit_log enable row level security;

create policy audit_log_admin_select on public.audit_log
  for select using (public.is_admin());

-- Función de trigger para auditoría
create or replace function public.audit_trigger_func()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_email text;
  v_changed_fields text[];
begin
  -- Obtener email del usuario
  select email into v_user_email
  from auth.users
  where id = auth.uid();

  -- Calcular campos cambiados (solo para UPDATE)
  if TG_OP = 'UPDATE' then
    select array_agg(key)
    into v_changed_fields
    from jsonb_each(to_jsonb(NEW))
    where to_jsonb(NEW) -> key != to_jsonb(OLD) -> key;
  end if;

  -- Insertar registro de auditoría
  insert into public.audit_log (
    table_name,
    operation,
    user_id,
    user_email,
    old_data,
    new_data,
    changed_fields
  ) values (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    v_user_email,
    case when TG_OP = 'DELETE' then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    v_changed_fields
  );

  -- Retornar el registro apropiado
  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- ==========================================
-- APLICAR TRIGGERS A TABLAS CRÍTICAS
-- ==========================================

-- Trigger para patients
drop trigger if exists audit_patients_trigger on public.patients;
create trigger audit_patients_trigger
  after insert or update or delete on public.patients
  for each row execute function public.audit_trigger_func();

-- Trigger para appointments
drop trigger if exists audit_appointments_trigger on public.appointments;
create trigger audit_appointments_trigger
  after insert or update or delete on public.appointments
  for each row execute function public.audit_trigger_func();

-- Trigger para assigned_surveys
drop trigger if exists audit_assigned_surveys_trigger on public.assigned_surveys;
create trigger audit_assigned_surveys_trigger
  after insert or update or delete on public.assigned_surveys
  for each row execute function public.audit_trigger_func();

-- ==========================================
-- FUNCIÓN HELPER PARA CONSULTAR AUDITORÍA
-- ==========================================

-- Ver historial de cambios de un registro específico
create or replace function public.get_audit_history(
  p_table_name text,
  p_record_id uuid,
  p_limit int default 50
)
returns table (
  id uuid,
  operation text,
  user_email text,
  old_data jsonb,
  new_data jsonb,
  changed_fields text[],
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.operation,
    a.user_email,
    a.old_data,
    a.new_data,
    a.changed_fields,
    a.created_at
  from public.audit_log a
  where a.table_name = p_table_name
    and (
      (a.new_data->>'id')::uuid = p_record_id
      or (a.old_data->>'id')::uuid = p_record_id
    )
  order by a.created_at desc
  limit p_limit;
$$;

-- Grant execute
grant execute on function public.get_audit_history(text, uuid, int) to authenticated;

-- Comentarios
comment on table public.audit_log is 'Registro de auditoría de todas las operaciones críticas';
comment on function public.audit_trigger_func() is 'Función trigger para registrar cambios en tablas auditadas';
comment on function public.get_audit_history(text, uuid, int) is 'Obtiene el historial de cambios de un registro específico';
```

---

**Nota:** Todos estos ejemplos están listos para copiar y pegar. Asegúrate de:

1. Revisar imports y paths según tu estructura
2. Ejecutar tests después de cada cambio
3. Verificar que el build pasa correctamente
4. Hacer commits granulares por cada cambio

Para cualquier duda, consultar el documento principal: `ANALISIS_REFACTORIZACION_COMPLETO.md`
