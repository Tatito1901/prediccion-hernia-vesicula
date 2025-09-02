# Guía de Refactorización: Sincronizando la Aplicación con la Nueva Arquitectura de Datos

**Objetivo:** Transformar la aplicación actual en una plataforma alineada con el nuevo flujo de trabajo de la clínica y la base de datos de 11 tablas.

## 1. Principios Guía

### Base de Datos como Fuente de Verdad
- Toda lógica de negocio debe originarse en la BD
- Eliminar configuraciones hardcodeadas en frontend
- APIs dinámicas basadas en estado real de la BD

### Separación de Responsabilidades
- **Componentes:** UI "tonta" - solo mostrar datos
- **Hooks:** Comunicación con backend via React Query
- **API Routes:** Toda la lógica de negocio

### Organización por Flujo de Trabajo
```
/components/scheduling/     # Agendamiento unificado  
/components/check-in/       # Admisiones y llegadas
/components/surveys/        # Formularios de encuesta
/components/dossier/        # IA y predicciones
```

## 2. Plan de Acción

### Fase 1: Backend (API Routes)
- `POST /api/appointments` - Flujo dual (lead→cita / directo)
- `POST /api/survey/responses` - Guardar encuestas

### Fase 2: (Deprecado) Módulo Leads
Se elimina el sistema de leads. No implementar ni usar.

### Fase 3: Agendamiento Unificado
- `UnifiedScheduleDialog.tsx` (reemplaza schedule-appointment-dialog)
- Búsqueda leads→patients→nuevo
- Calendario inteligente (slots ocupados desde BD)

### Fase 4: Admisiones Refactorizadas
- Vista kanban: PROGRAMADA → PRESENTE → COMPLETADA
- Botón "Registrar Llegada" → `POST /api/appointments/[id]/check-in`
- Activación automática de encuestas

### Fase 5: Sistema de Encuestas
- Formulario conectado a nuevas tablas
- `POST /api/survey/responses` con 47 respuestas
- Triggers automáticos para IA

### Fase 6: Dossier de IA
- `app/dossier/[appointment_id]/page.tsx`
- `PropensityScoreGauge`, `InsightsList`
- `GET /api/insights/[appointment_id]`

## 3. APIs Clave

### RPCs de Supabase
```sql
-- Crear cita directa
create_direct_appointment(patient_data, appointment_data)
```

### Flujo de Datos
2. **Agendamiento** → Búsqueda → RPC → Nueva cita
3. **Llegada** → Check-in → `UPDATE appointments`
4. **Encuesta** → Respuestas → Trigger IA
5. **Dossier** → JOIN predicciones → Vista doctor

## Referencia de API

A continuación se listan los endpoints disponibles bajo `app/api/`, con sus métodos, parámetros principales y notas de uso.

- __Pacientes__
  - `GET /api/patients`
    - Parámetros: `page`, `pageSize`, `search`
    - Notas: Paginación y búsqueda por nombre/apellidos/teléfono. Selecciona columnas seguras de `patients`.
  - `POST /api/patients`
    - Body mínimo: `{ nombre: string, apellidos: string }`
    - Flags: respeta `ENFORCE_PATIENT_BIRTHDATE` para requerir `fecha_nacimiento`.
  - `GET /api/patients/[id]`
  - `PATCH /api/patients/[id]`
  - `DELETE /api/patients/[id]`
  - `GET /api/patients/[id]/history`
    - Retorna historial de citas del paciente.

- __Citas__
  - `GET /api/appointments`
    - Parámetros: `dateFilter` (today|week|month|future|past|all|range), `startDate`, `endDate`, `search`, `patientId`, `page`, `pageSize`.
    - Respuesta: `data[]`, `pagination`, y para `dateFilter=today` incluye `summary` con conteos.
  - `POST /api/appointments`
    - Body: `{ patient_id: uuid, fecha_hora_cita: ISOString, motivos_consulta: string[], estado_cita?: string, doctor_id?: uuid|null, notas_breves?: string, es_primera_vez?: boolean }`
    - Reglas: conflicto simple por `doctor_id` + `fecha_hora_cita`.
  - `PATCH /api/appointments/[id]`
    - Actualización parcial de una cita.
  - `PATCH /api/appointments/[id]/status`
    - Cambios de estado (incluye reglas de negocio y validaciones de ventana horaria; en tests permite overrides).

- __Admisión__
  - `GET /api/admission/appointments`
    - Listado paginado/filtrado para la vista de admisión.
  - `HEAD /api/admission/appointments`
    - Conteos rápidos para UI.
  - `GET /api/patient-admission` (ping informativo)
  - `POST /api/patient-admission`
    - Crea paciente + cita de forma atómica (RPC/back-end), con validaciones y prevención de conflictos.

- __Encuestas__
  - `POST /api/assign-survey`
    - Body: `{ patientId: string, templateId: number }`
    - Asigna un template de encuesta a un paciente, evitando duplicados.
  - `GET /api/surveys/stats`
    - Parámetros: `startDate`, `endDate` (YYYY-MM-DD). Estadísticas agregadas de respuestas.

- __Dashboard y Estadísticas__
  - `GET /api/dashboard/summary`
  - `GET /api/dashboard/charts`
    - Parámetros: `startDate`, `endDate` (YYYY-MM-DD). Series agregadas para gráficos.
  - `GET /api/statistics`
    - Agregados (clínicos/demográficos/operativos) vía RPCs con caché.
  - Notas: Totales y distribuciones de pacientes (estado_paciente, género, etc.) están incluidas en el endpoint unificado anterior.

- __Perfil__
  - `PATCH /api/profile/avatar`
    - Body: `{ avatar_url: string | null }` (solo assets bajo `/avatars/`). Crea fila en `profiles` si no existe.

- __Tendencias__
  - `GET /api/trends`
    - Parámetro: `period` (por defecto `month`). Tendencias históricas de métricas.

### Ejemplos rápidos

- __Listar citas de hoy (página 1)__
  ```bash
  curl -s "http://localhost:3000/api/appointments?dateFilter=today&page=1&pageSize=15"
  ```

- __Crear paciente básico__
  ```bash
  curl -sX POST http://localhost:3000/api/patients \
    -H 'Content-Type: application/json' \
    -d '{"nombre":"Ana","apellidos":"García"}'
  ```

- __Actualizar avatar__
  ```bash
  curl -sX PATCH http://localhost:3000/api/profile/avatar \
    -H 'Content-Type: application/json' \
    -d '{"avatar_url":"/avatars/doctor-female.svg"}'
  ```

## Variables de Entorno

- __NEXT_PUBLIC_SUPABASE_URL__
  - Uso: clientes Supabase (`utils/supabase/client.ts`, `server.ts`, `middleware.ts`).
- __NEXT_PUBLIC_SUPABASE_ANON_KEY__
  - Uso: clientes Supabase públicos/SSR.
- __NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY__
  - Uso: clave publishable preferida por SSR/middleware; si no está definida se usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` como fallback.
- __SUPABASE_SERVICE_ROLE_KEY__
  - Uso: habilita `createAdminClient()` en servidores para bypass de RLS en operaciones controladas (lecturas agregadas/escrituras seguras).
- __NEXT_PUBLIC_DEBUG_API__
  - Uso: activa logs de requests/responses en UI y hooks (`lib/debug-config.ts`, `hooks/use-clinic-data.ts`).
- __DEBUG_AUTH__ y __NEXT_PUBLIC_DEBUG_AUTH__
  - Uso: habilitan logs de autenticación/cookies en SSR y middleware (`utils/supabase/server.ts`, `utils/supabase/middleware.ts`, `middleware.ts`). Valores aceptados: `1|true|on|yes` (case-insensitive).
- __NODE_ENV__
  - Uso: rutas con comportamiento especial en `test`/`development` (p.ej. fallback sintético en `appointments/[id]/status`).
- __CLINIC_TIMEZONE__
  - Uso: zona horaria canónica de clínica (`lib/clinic-schedule.ts`). Default: `America/Mexico_City`.
- __ALLOWED_EMAIL_DOMAINS__
  - Uso: restricción de dominios permitidos en auth (`components/auth/actions.ts`). CSV.
- __ALLOWED_ROLES__
  - Uso: roles permitidos en auth (`components/auth/actions.ts`). CSV; default: `admin,doctor,asistente`.
- __ENFORCE_PATIENT_BIRTHDATE__
  - Uso: obliga `fecha_nacimiento` al crear paciente (`app/api/patients/route.ts`). Valores: `true|false`.

> Nota: Todas las rutas prefieren `createAdminClient()` si `SUPABASE_SERVICE_ROLE_KEY` está presente, de lo contrario usan clientes SSR con contexto de cookies.

## 3.1 Requisitos y Setup Rápido

- __Node.js__: 18.18+ (recomendado 20 LTS)
- __npm__: 9+ (o pnpm/yarn)
- __Cuenta Supabase__ con proyecto y URL/keys

Pasos:
1) Instalar dependencias:
   ```bash
   npm i
   ```
2) Crear `.env.local` (ver ejemplo abajo) en la raíz.
3) Ejecutar en desarrollo:
   ```bash
   npm run dev
   ```
4) Abrir http://localhost:3000

### Ejemplo de `.env.local`
```ini
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=eyJhbGciOiJIUzI1NiIs...  # Opcional; si falta, se usa ANON
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...  # No exponer públicamente

CLINIC_TIMEZONE=America/Mexico_City
ALLOWED_EMAIL_DOMAINS=example.com,clinic.mx
ALLOWED_ROLES=admin,doctor,asistente
ENFORCE_PATIENT_BIRTHDATE=true

# Debug de API/Performance (cliente)
NEXT_PUBLIC_DEBUG_API=false
# Debug de autenticación (SSR/middleware). Úsalo sólo en desarrollo.
DEBUG_AUTH=on
# (Opcional) Habilita logs de auth también en cliente
# NEXT_PUBLIC_DEBUG_AUTH=on
```

Notas:
- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (NUNCA en cliente). Se usa en `utils/supabase/server.ts` vía `createAdminClient()`.
- Para producción, configurar estas variables en tu plataforma (p. ej. Vercel) como “Environment Variables”.

## 3.2 Scripts Disponibles

Desde `package.json`:
- `npm run dev` → arranca Next.js en modo desarrollo
- `npm run build` → build de producción
- `npm run start` → sirve build (prod)
- `npm run lint` → lint con ESLint
- `npm run test` → ejecuta Vitest (headless)
- `npm run test:watch` → Vitest en watch
- `npm run test:coverage` → cobertura
- `npm run test:unit` → suite “unit” (`vitest.workspace.ts`)
- `npm run test:ui` / `npm run test:ui:watch` → suite de UI

## 3.3 Estructura del Proyecto

Directorios clave:
- `app/` → rutas App Router (Next.js 15)
  - `app/api/` → endpoints de API (e.g. `app/api/appointments/...`)
  - `app/dashboard/`, `app/admision/`, `app/encuesta/` → vistas
- `components/` → UI modular (e.g. `components/dashboard/`)
- `hooks/` → hooks de datos y UI (`hooks/use-appointments.ts`, `hooks/use-analytics-data.ts`)
- `lib/` → lógica compartida, validaciones y tipos
  - `lib/types/` → tipos generados/adaptados de Supabase (`database.types.ts`)
  - `lib/validation/` → esquemas y enums de validación
- `utils/supabase/` → clientes Supabase (`client.ts`, `server.ts`, `middleware.ts`, `admin.ts`)
- `public/` → assets estáticos (e.g. `public/avatars/*`)
- `contexts/` → contextos React (`contexts/clinic-data-provider.tsx`)
- Configuración: `tailwind.config.ts`, `next.config.mjs`, `tsconfig.json`

## 3.4 Pruebas

- __Runner__: Vitest
- __DOM__: jsdom + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- Suites: definidas en `vitest.workspace.ts` (p. ej. `unit`, `ui`)

Comandos:
```bash
npm run test          # headless
npm run test:watch    # desarrollo
npm run test:coverage # cobertura
npm run test:unit     # suite unit
npm run test:ui       # suite ui
```

Recomendaciones:
- Tests de hooks en `hooks/__tests__/` usando `renderHook`.
- Mock de clientes Supabase en capa `utils/supabase/` para pruebas unitarias.

## 3.5 Despliegue

- __Vercel__ (sugerido):
  - Importar repo, setear variables de entorno del `.env.local` (sin exponer la Service Role al cliente).
  - Node 18+ runtime, Next.js App Router, `npm run build`.
- __Servidor propio__:
  - Construir `npm run build` y servir con `npm run start` detrás de reverse proxy (Nginx/Caddy).

## 3.6 Seguridad y Autenticación

- __RLS__: Mantener habilitado en Supabase; endpoints server-side usan `createAdminClient()` cuando hay `SUPABASE_SERVICE_ROLE_KEY` (solo backend).
- __Dominios/roles__: configurar `ALLOWED_EMAIL_DOMAINS` y `ALLOWED_ROLES` (ver `components/auth/actions.ts`).
- __Mínimo privilegio__: exponer únicamente `NEXT_PUBLIC_*` al cliente.
- __Auditoría__: logs opcionales con `NEXT_PUBLIC_DEBUG_API=true` en desarrollo.

## 3.7 Troubleshooting

- __401/403 al llamar APIs__ → Verifica `ALLOWED_EMAIL_DOMAINS`/`ALLOWED_ROLES` y sesión.
- __Datos no aparecen en UI__ → Revisa `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` y políticas RLS.
- __Conflictos de cita__ → Endpoint `POST /api/appointments` valida `doctor_id + fecha_hora_cita`.
- __Zona horaria__ → Ajusta `CLINIC_TIMEZONE` (ver `utils/datetime.ts` y uso en vistas).
- __Tipos TS desalineados__ → Asegura que `lib/types/database.types.ts` esté actualizado con el proyecto Supabase.

## 3.8 Preguntas Frecuentes (FAQ)

- __¿Dónde agrego un nuevo endpoint?__ → En `app/api/<ruta>/route.ts` siguiendo patrones existentes.
- __¿Cómo consumo Supabase en cliente?__ → `utils/supabase/client.ts` (SSR/CSR); en servidor usar `utils/supabase/server.ts`.
- __¿Puedo usar la Service Role en el navegador?__ → No. Solo server-side.
- __¿Cómo pruebo rápidamente?__ → Usa los “Ejemplos rápidos” con `curl` y las rutas bajo `app/api/`.

## 3.9 Debug e Instrumentación

- __Flags__
  - `NEXT_PUBLIC_DEBUG_API`: habilita logging de requests/responses en UI y hooks y activa métricas de rendimiento.
  - `DEBUG_AUTH` / `NEXT_PUBLIC_DEBUG_AUTH`: habilitan logs de autenticación/cookies en `utils/supabase/server.ts`, `utils/supabase/middleware.ts` y `middleware.ts`.

- __API pública (`lib/debug-config.ts`)__
  - `logApiCall(phase: 'request' | 'response' | 'error', data: any)`
  - `trackRender(componentName: string)`
  - `trackEffect(effectName: string, dependencies: any[])`
  - `getPerformanceMetrics(): { apiCalls; renderCounts; effectExecutions }`

- __Detalles__
  - Mapas acotados (TTL 5 min, máx 200 entradas) y limpieza cada 60s.
  - Estado HMR-safe en `window.__APP_DEBUG_STATE__` para evitar múltiples intervals.
  - Advertencias para requests lentas (`slowRequestThreshold` por defecto 3000ms).

- __Ejemplos rápidos__
  ```tsx
  // En un componente React
  import { trackRender, trackEffect, getPerformanceMetrics } from '@/lib/debug-config'

  export function PatientList({ params }: { params: any }) {
    trackRender('PatientList')
    useEffect(() => {
      trackEffect('PatientList:fetch', [params])
    }, [params])
    // En consola
    // console.table(getPerformanceMetrics().renderCounts)
    return null
  }
  ```

- __Recomendación__
  - Activa estas banderas sólo en desarrollo. Deshabilítalas en producción.

## Nota de Cambio: Remoción de "Edad" en UI de Pacientes

Con el fin de simplificar la interfaz y evitar mostrar la edad, se eliminaron todas las referencias visuales al campo "Edad" en las superficies de pacientes. No se realizaron cambios en los tipos/BD (edad sigue siendo opcional a nivel de datos), únicamente en la presentación.

- Componentes actualizados:
  - `components/patient-admision/patient-card.tsx`: se removió el badge de edad.
  - `components/patients/patient-details-dialog.tsx`: se eliminaron el InfoItem "Edad", el cálculo de edad y el indicador "Edad avanzada".
  - `components/patients/patient-table.tsx`: se quitó la columna "Edad" (desktop y móvil/virtualizada) y su ordenamiento asociado.

- Alcance: solo UI. No hay cambios en APIs, validaciones o esquemas de datos.
- Pruebas: la suite existente pasa sin modificaciones.

## 4. Estado Actual

✅ **Completado:**
- Corrección de errores de esquema BD
- Alineación tipos TypeScript con Supabase
- APIs funcionales para appointments

🔄 **En Progreso:**
- Validación final de funcionamiento
- QA post-migración

📋 **Próximos Pasos:**
- Implementar módulo de leads
- Refactorizar agendamiento unificado
- Construir dossier de IA
