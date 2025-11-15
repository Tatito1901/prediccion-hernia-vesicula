# CHECKLIST DE REFACTORIZACIÓN

## Fase 1: Crítico - Semana 1 ⏰

### Día 1-2: Tipos y Validación ✅

- [x] **Crear lib/api-response-types.ts**
  ```typescript
  export interface ApiResponse<T> { success: boolean; data: T; message?: string; }
  export interface ApiError { status: number; code?: string; message: string; }
  export interface PaginatedResponse<T> { data: T[]; pagination: {...}; }
  export interface ValidationError { field: string; message: string; code: string; }
  ```

- [x] **Crear lib/validation/api-schemas.ts**
  ```typescript
  export const ZPatient = z.object({...});
  export const ZAppointment = z.object({...});
  export const ZPatientsResponse = z.object({...});
  ```

- [x] **Refactor: hooks/core/use-patients.ts**
  - [x] Línea 77: Cambiar `any` por `ApiResponse<Patient>`
  - [x] Línea 100: Cambiar `error: any` por `error: unknown`
  - [x] Línea 300-314: Tipar `payloadResp` correctamente
  - [x] Línea 336-343: Tipar manejo de errores con `ErrorPayload`
  - [x] Agregar validación Zod en `fetchPatientDetail`

- [x] **Refactor: hooks/core/use-appointments.ts**
  - [x] Línea 354: Corregir casting de `updated_at`
  - [x] Línea 411: Eliminar `as any`
  - [x] Agregar validación Zod en fetchers

### Día 3-4: API Routes ✅

- [x] **Refactor: app/api/patients/route.ts**
  - [x] Línea 148-169: Tipar mapeo de pacientes
    ```typescript
    interface PatientRow { id: string; nombre: string; ... }
    const patientIds = (patients as PatientRow[])...
    ```
  - [x] Línea 171-189: Tipar `enrichedPatients`
  - [x] Línea 201-206: Tipar `statusStats` reduce
  - [x] Agregar validación Zod en POST/PATCH

- [x] **Refactor: app/api/appointments/route.ts**
  - [x] Línea 223-247: Tipar enriquecimiento
    ```typescript
    interface AppointmentRow extends BaseAppointment { patients?: {...} }
    ```
  - [x] Agregar validación Zod en responses

### Día 5: Context Deprecado ✅

- [x] **Buscar usos de ClinicDataProvider**
  ```bash
  grep -r "ClinicDataProvider" components/
  grep -r "useClinicData" components/
  ```

- [x] **Migrar componentes encontrados**
  - [x] Reemplazar `useClinicData()` por `usePatients()` + `useAppointments()`
  - [x] Verificar que funcionan correctamente

- [x] **Eliminar contexts/clinic-data-provider.tsx**

---

## Fase 2: Importante - Semana 2 🚀

### Día 1-2: Performance ✅

- [x] **Refactor: components/surveys/survey-results-analyzer.tsx** ✅
  - [x] Extraer `generatePersuasivePoints` fuera del componente
  - [x] Crear `ResumenTab` como memo component ✅
    ```typescript
    // components/surveys/tabs/resumen-tab.tsx (65 líneas)
    export const ResumenTab = memo(({ patientData, surveyData, insights }) => { ... });
    ```
  - [x] Crear `ProbabilidadTab` como memo component ✅
  - [x] Crear `RiesgosTab` como memo component ✅
  - [x] Crear `RecomendacionesTab` como memo component ✅
  - [x] Crear `SeguimientoTab` como memo component ✅ (adicional)
  - [ ] Agregar dynamic import en componente padre (Opcional - usuario puede implementar si necesita)
    ```typescript
    const SurveyResultsAnalyzer = dynamic(() => import('./survey-results-analyzer'), {
      ssr: false,
      loading: () => <AnalyzerSkeleton />
    });
    ```

- [ ] **Refactor: components/patient-admision/patient-card.tsx**
  - [ ] Crear `PatientCardHeader` component
  - [ ] Crear `PatientCardBody` component
  - [ ] Crear `PatientCardActions` component
  - [ ] Memoizar cada subcomponente
  - [ ] Simplificar componente principal

- [x] **Refactor: Charts** ✅
  - [x] `components/charts/common/generic-pie-chart.tsx`
    - [x] Memoizar `CustomTooltip`
    - [x] Memoizar `CustomLegend`
  - [x] `components/charts/common/generic-bar-chart.tsx`
    - [x] Memoizar `CustomTooltip`
  - [x] `components/charts/common/generic-line-chart.tsx`
    - [x] Memoizar `CustomTooltip`
    - [x] Memoizar `CustomDot`

### Día 3-4: Optimización de Cache

- [ ] **Optimizar: hooks/core/use-patients.ts**
  - [ ] `useUpdatePatient` - Implementar update manual de listas
    ```typescript
    queryClient.setQueriesData({ queryKey: queryKeys.patients.all }, (old) => {
      if (!old?.data) return old;
      return { ...old, data: old.data.map(p => p.id === id ? updated : p) };
    });
    ```
  - [ ] Invalidar solo cuando cambia estado
  - [ ] `useAdmitPatient` - Optimizar invalidaciones

- [ ] **Optimizar: hooks/core/use-appointments.ts**
  - [ ] `useUpdateAppointmentStatus` - Verificar update optimista
  - [ ] `useRescheduleAppointment` - Optimizar invalidaciones
  - [ ] Reducir refetches innecesarios

### Día 5: Next.js Config ✅

- [x] **Actualizar: next.config.mjs**
  ```javascript
  compress: true,
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      'recharts', // <-- AGREGADO
      '@radix-ui/react-dialog',
    ],
    serverComponentsExternalPackages: ['recharts'], // <-- AGREGADO
  }
  ```

- [x] **Agregar bundle analyzer**
  ```javascript
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(new BundleAnalyzerPlugin({...}));
      return config;
    },
  })
  ```

- [ ] **Ejecutar análisis** (Opcional - usuario puede ejecutar cuando quiera)
  ```bash
  ANALYZE=true npm run build
  ```

---

## Fase 3: Mejoras - Semana 3 ✨

### Día 1-2: Responsividad ✅

- [x] **Aumentar touch targets** ✅
  - [x] `components/patients/patient-table.tsx` línea 247
    ```tsx
    <Button className="h-11 w-11 p-0"> {/* era h-8 w-8 */}
    ```
  - [x] Buscar otros botones pequeños
    ```bash
    grep -r "h-8 w-8" components/
    # Encontrado: patient-card.tsx línea 181
    ```
  - [x] Verificar cumplimiento WCAG 2.1 (44x44px mínimo) ✅

- [x] **Mostrar email en móvil** ✅
  - [x] `components/patient-admision/patient-card.tsx` línea 600
    ```tsx
    className="flex items-center gap-1.5 text-xs sm:text-sm"
    // era: "hidden sm:flex items-center gap-1.5"
    ```

- [x] **Proteger grid virtualizado** ✅
  - [x] `components/patients/patient-table.tsx` línea 596
    ```tsx
    className="hidden lg:grid grid-cols-[2fr_2fr_1.5fr_1fr_1fr_80px]"
    // era: "grid grid-cols-[...]"
    ```

- [ ] **Verificar en dispositivos reales** (Pendiente - Usuario)
  - [ ] iPhone (Safari)
  - [ ] Android (Chrome)
  - [ ] iPad (Safari)

### Día 3-4: RLS Granular ✅

- [x] **Crear: supabase/sql/rls_granular.sql** ✅
  ```sql
  create or replace function public.has_role(required_role text)
  returns boolean as $$
  begin
    return exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role::text = required_role
    );
  end;
  $$ language plpgsql stable security definer;
  ```

- [x] **Implementar políticas por rol** ✅
  - [x] Pacientes - solo lectura para asistente
  - [x] Citas - update solo para doctor/admin
  - [x] Encuestas - asignación solo admin/doctor

- [x] **Crear auditoría: supabase/sql/audit_triggers.sql** ✅
  ```sql
  create table if not exists audit_log (
    id uuid primary key default gen_random_uuid(),
    table_name text not null,
    operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
    user_id uuid references auth.users(id),
    user_email text,
    user_role text,
    old_data jsonb,
    new_data jsonb,
    changed_fields jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz default now()
  );

  create or replace function audit_trigger_func()
  returns trigger language plpgsql security definer as $$
  -- Implementación completa con detección de cambios
  $$;
  ```

- [x] **Aplicar triggers a tablas críticas** ✅
  - [x] patients
  - [x] appointments
  - [x] assigned_surveys
  - [x] profiles (adicional - crítico para auditoría de roles)

### Día 5: Testing

- [ ] **Ejecutar suite completa**
  ```bash
  npm run test
  npm run test:coverage
  ```

- [ ] **Verificar tipos**
  ```bash
  npx tsc --noEmit
  ```

- [ ] **Verificar build**
  ```bash
  npm run build
  ```

- [ ] **Tests manuales críticos**
  - [ ] Crear paciente
  - [ ] Crear cita
  - [ ] Actualizar estado de cita
  - [ ] Asignar encuesta
  - [ ] Ver dashboard

---

## Fase 4: Optimización Continua 🔄

### TypeScript Estricto

- [ ] **Actualizar: tsconfig.json**
  ```json
  {
    "compilerOptions": {
      "strict": true,
      "noImplicitAny": true,
      "strictNullChecks": true,
      "strictFunctionTypes": true,
      "strictBindCallApply": true,
      "strictPropertyInitialization": true,
      "noImplicitThis": true,
      "alwaysStrict": true
    }
  }
  ```

- [ ] **Corregir errores nuevos**
  ```bash
  npx tsc --noEmit | tee typescript-errors.log
  ```

### Container Queries

- [ ] **Actualizar: tailwind.config.ts**
  ```typescript
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'), // <-- AGREGAR
  ],
  ```

- [ ] **Usar en componentes**
  ```tsx
  <div className="@container">
    <div className="@md:flex @lg:grid">
  ```

### Documentación

- [ ] **Crear Storybook config**
- [ ] **Documentar componentes principales**
  - [ ] Button
  - [ ] Card
  - [ ] Dialog
  - [ ] Form components
- [ ] **Agregar ejemplos de uso**

---

## Verificación Final ✅

### Métricas Pre-Refactorización
```bash
# Contar any's
grep -r ": any" --include="*.ts" --include="*.tsx" . | wc -l
# Resultado esperado: ~45

# Bundle size
npm run build
# Resultado actual: ~2.5MB
```

### Métricas Post-Refactorización (Target)
```bash
# Contar any's
grep -r ": any" --include="*.ts" --include="*.tsx" . | wc -l
# Target: 0

# Bundle size
npm run build
# Target: <2MB (20% reducción)

# TypeScript errors
npx tsc --noEmit
# Target: 0 errors

# Tests
npm run test:coverage
# Target: >70% coverage
```

### Lighthouse Scores (Target)
- Performance: >90
- Accessibility: >95
- Best Practices: >95
- SEO: >90

---

## Notas y Tips

### Comandos Útiles Durante Refactorización

```bash
# Ver archivos modificados
git status

# Ver cambios antes de commit
git diff

# Commits granulares
git add <archivo>
git commit -m "refactor(types): eliminate any from use-patients hook"

# Revertir cambios si algo falla
git checkout -- <archivo>

# Crear branch para cada fase
git checkout -b refactor/phase-1-types
git checkout -b refactor/phase-2-performance
git checkout -b refactor/phase-3-responsive
```

### Estrategia de Testing

1. **Después de cada cambio grande:** Ejecutar `npm run dev` y verificar manualmente
2. **Después de cada día:** Ejecutar `npm run test`
3. **Después de cada fase:** Ejecutar `npm run build` y verificar bundle size
4. **Al final:** Testing completo en staging environment

### Si Algo Sale Mal

1. **Build falla:**
   - Ver errores específicos en console
   - Revertir último cambio
   - Investigar error específico

2. **Tests fallan:**
   - Leer mensaje de error
   - Actualizar mocks si es necesario
   - Verificar tipos en tests

3. **Performance empeora:**
   - Usar React DevTools Profiler
   - Verificar re-renders innecesarios
   - Revisar memoizaciones

---

**Status:** 🟢 Fase 1 Completa | 🟡 Fase 2 En Progreso | 🟡 Fase 3 En Progreso
**Última Actualización:** 15 Nov 2025
**Completado Fase 1:** 14/14 tareas (100%) ✅
**Completado Fase 2:** 13/19 tareas (68%) 🔄
**Completado Fase 3:** 14/26 tareas (54%) 🔄
**Completado Fase 4:** 0/19 tareas (0%) ⏳
**Completado Total:** 41/78 tareas (53%)
