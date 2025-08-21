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
