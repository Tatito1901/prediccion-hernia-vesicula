# SQL Scripts para Supabase

Este directorio contiene scripts SQL para configurar y mantener la base de datos de Supabase para la plataforma de gestión de la Clínica de Hernia y Vesícula.

## 📁 Archivos

### Funciones RPC (Stored Procedures)

- **`create_patient_and_appointment.sql`** - Función para crear paciente y cita de forma atómica
- **`reschedule_appointment.sql`** - Función para reagendar citas con validaciones
- **`schedule_appointment.sql`** - Función para programar nuevas citas

### Seguridad y Permisos

- **`rls_policies.sql`** - Políticas básicas de Row Level Security
- **`rls_granular.sql`** ⭐ **NUEVO** - Políticas RLS granulares por rol (admin, doctor, asistente)

### Auditoría

- **`audit_triggers.sql`** ⭐ **NUEVO** - Sistema completo de auditoría con triggers automáticos

## 🔐 Sistema de RLS Granular

El archivo `rls_granular.sql` implementa un sistema de permisos basado en roles:

### Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **admin** | Administrador del sistema | Acceso completo, puede eliminar registros y cambiar roles |
| **doctor** | Médico de la clínica | Puede crear y modificar pacientes, citas y encuestas |
| **asistente** | Personal asistente | Solo lectura en pacientes, puede crear citas |

### Funciones Auxiliares

```sql
-- Verificar si usuario tiene rol específico
public.has_role('admin')

-- Verificar si usuario es admin o doctor
public.is_admin_or_doctor()

-- Verificar si usuario es staff (cualquier rol)
public.is_staff()
```

### Permisos por Tabla

#### `patients`
- **SELECT**: Todos los staff ✅
- **INSERT**: Solo admin y doctor ✅
- **UPDATE**: Solo admin y doctor ✅
- **DELETE**: Solo admin ❌

#### `appointments`
- **SELECT**: Todos los staff ✅
- **INSERT**: Todos los staff ✅
- **UPDATE**: Solo admin y doctor ✅
- **DELETE**: Solo admin ❌

#### `assigned_surveys`
- **SELECT**: Todos los staff ✅
- **INSERT**: Solo admin y doctor ✅
- **UPDATE**: Solo admin y doctor ✅
- **DELETE**: Solo admin ❌

#### `profiles`
- **SELECT**: Usuarios autenticados ✅
- **UPDATE (propio)**: Cualquier usuario (excepto cambio de rol) ✅
- **UPDATE (otros)**: Solo admin ✅

## 📊 Sistema de Auditoría

El archivo `audit_triggers.sql` implementa un sistema completo de auditoría:

### Características

✅ Registra automáticamente todos los cambios (INSERT, UPDATE, DELETE)
✅ Captura usuario, rol, email, IP y user agent
✅ Almacena estado anterior y nuevo de los registros
✅ Identifica campos específicos que cambiaron
✅ Incluye vistas predefinidas para consultas comunes
✅ Solo administradores pueden acceder a los logs

### Tablas Auditadas

- `patients` - Cambios en datos de pacientes
- `appointments` - Cambios en citas
- `assigned_surveys` - Asignación de encuestas
- `profiles` - Cambios de rol y perfil (crítico)

### Vistas Disponibles

```sql
-- Ver cambios de las últimas 24 horas
SELECT * FROM audit_recent_changes;

-- Ver actividad por usuario (últimos 30 días)
SELECT * FROM audit_user_activity;

-- Ver cambios críticos (eliminaciones y cambios de rol)
SELECT * FROM audit_critical_changes;
```

### Funciones de Consulta

```sql
-- Obtener historial completo de un registro
SELECT * FROM get_record_history('patients', 'uuid-del-paciente');

-- Obtener actividad de un usuario específico
SELECT * FROM get_user_audit_trail('user@example.com', 30);

-- Limpiar logs antiguos (solo admin, ejecutar manualmente)
SELECT cleanup_old_audit_logs(365); -- mantiene últimos 365 días
```

## 🚀 Cómo Aplicar los Scripts

### 1. Acceder al SQL Editor

1. Abrir el [Dashboard de Supabase](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **SQL Editor** en el menú lateral

### 2. Ejecutar RLS Granular

```sql
-- Copiar y pegar el contenido completo de rls_granular.sql
-- Ejecutar con el botón "Run" o Ctrl+Enter
```

### 3. Ejecutar Sistema de Auditoría

```sql
-- Copiar y pegar el contenido completo de audit_triggers.sql
-- Ejecutar con el botón "Run" o Ctrl+Enter
```

### 4. Verificar Instalación

```sql
-- Verificar políticas RLS activas
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Verificar triggers de auditoría
SELECT tgname, tgrelid::regclass, tgtype
FROM pg_trigger
WHERE tgname LIKE 'audit_%';

-- Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;
```

## ⚠️ Consideraciones Importantes

### Seguridad

- **RLS debe estar habilitado** en producción para todas las tablas críticas
- Los **service_role keys** bypasean RLS - usar solo en backend seguro
- Verificar que todos los usuarios tengan un rol asignado en `profiles`

### Performance

- La auditoría agrega overhead mínimo (~5-10ms por operación)
- Los índices en `audit_log` optimizan las consultas
- Considerar política de retención para evitar crecimiento excesivo

### Mantenimiento

- Ejecutar `cleanup_old_audit_logs(365)` cada 6-12 meses
- Revisar `audit_critical_changes` regularmente
- Monitorear tamaño de la tabla `audit_log`

## 📝 Testing

### Probar RLS

```sql
-- Ejecutar como usuario específico
set local role authenticated;
set local request.jwt.claims.sub to 'user-uuid-here';

-- Intentar operaciones y verificar permisos
SELECT * FROM patients; -- Debería funcionar si es staff
DELETE FROM patients WHERE id = 'some-uuid'; -- Debería fallar si no es admin
```

### Probar Auditoría

```sql
-- Hacer un cambio en una tabla auditada
UPDATE patients SET nombre = 'Test' WHERE id = 'some-uuid';

-- Verificar que se registró en audit_log
SELECT * FROM audit_log
WHERE table_name = 'patients'
ORDER BY created_at DESC
LIMIT 1;
```

## 🔄 Rollback

Si necesitas revertir los cambios:

```sql
-- Eliminar políticas RLS granulares
DROP POLICY IF EXISTS "patients_select_policy" ON public.patients;
DROP POLICY IF EXISTS "patients_insert_policy" ON public.patients;
-- ... (continuar con todas las políticas)

-- Eliminar triggers de auditoría
DROP TRIGGER IF EXISTS audit_patients_trigger ON public.patients;
DROP TRIGGER IF EXISTS audit_appointments_trigger ON public.appointments;
-- ... (continuar con todos los triggers)

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.has_role(text);
DROP FUNCTION IF EXISTS public.is_admin_or_doctor();
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.audit_trigger_func();

-- Eliminar tabla de auditoría (¡CUIDADO: Se pierden todos los logs!)
DROP TABLE IF EXISTS public.audit_log CASCADE;
```

## 📚 Referencias

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

## 🤝 Contribuir

Si encuentras bugs o tienes sugerencias:

1. Revisar el código SQL cuidadosamente
2. Probar en ambiente de desarrollo primero
3. Documentar cualquier cambio
4. Actualizar este README si es necesario

---

**Última actualización:** 15 de Noviembre, 2025
**Mantenido por:** Equipo de Desarrollo de la Clínica
