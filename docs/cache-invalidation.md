# Nueva estrategia de invalidación de caché

Objetivo: simplificar y robustecer la invalidación reemplazando la lógica personalizada de `lib/cache-invalidation.ts` por `queryClient.invalidateQueries` usando claves centralizadas en `lib/query-keys.ts`.

## Principios
- **Claves centralizadas**: usar `queryKeys` de `lib/query-keys.ts`.
- **Invalidación declarativa**: preferir `invalidateQueries({ queryKey: ... })`.
- **Menos acoplamiento**: no actualizar múltiples listas/estados manualmente.
- **Consistencia**: invalidar `appointments.all` y `clinic.data` tras mutaciones de citas.

## Patrones recomendados
- Crear cita:
  - `invalidateQueries({ queryKey: queryKeys.appointments.all })`
  - `invalidateQueries({ queryKey: queryKeys.clinic.data })`
- Actualizar cita:
  - Igual que crear.
  - Opcional: `setQueryData(queryKeys.appointments.detail(id), updated)` para respuesta inmediata.
- Cambiar estado de cita:
  - Igual que actualizar (detalle + invalidación global de citas).
- Admitir paciente (paciente + cita):
  - `invalidateQueries` en `[patients.all, appointments.all, clinic.data]` en paralelo.
 - Leads (crear/actualizar/eliminar):
   - `invalidateQueries({ queryKey: queryKeys.leads.all })`
   - `invalidateQueries({ queryKey: queryKeys.leads.stats })`
   - Opcional: `setQueryData(queryKeys.leads.detail(id), updated)`
 - Estado de encuesta por cita:
   - `invalidateQueries({ queryKey: queryKeys.surveys.status(appointmentId) })`

## Query Keys relevantes
- `queryKeys.appointments.all` — invalidación global de citas.
- `queryKeys.appointments.detail(id)` — detalle de una cita.
- `queryKeys.clinic.data` — datos centralizados del contexto.
- `queryKeys.patients.all` — invalidación global de pacientes.
 - `queryKeys.leads.all` — lista de leads.
 - `queryKeys.leads.detail(id)` — detalle de lead.
 - `queryKeys.leads.stats` — estadísticas de leads.
 - `queryKeys.surveys.status(appointmentId)` — estado de encuesta por cita.

## Ejemplo breve
```ts
// En onSuccess de una mutación de cita
queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
queryClient.invalidateQueries({ queryKey: queryKeys.clinic.data });
// Respuesta inmediata en detalle
queryClient.setQueryData(queryKeys.appointments.detail(updated.id), updated);
```

```ts
// En onSuccess de una mutación de lead
queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
queryClient.invalidateQueries({ queryKey: queryKeys.leads.stats });
// Respuesta inmediata en detalle
queryClient.setQueryData(queryKeys.leads.detail(newLead.id), newLead);
```

## Justificación técnica
- Reduce fragilidad por vistas/filtros nuevos (no hay que tocar invalidadores).
- Se apoya en el comportamiento probado de React Query.
- Mantiene UI responsiva actualizando el `detail` y dejando las listas a refetch.

## Validación sugerida (QA manual)
- Cambiar estado de una cita y verificar:
  - El detalle refleja el cambio inmediatamente.
  - Las listas relevantes se actualizan tras el refetch automático.
- Crear cita para hoy y verificar aparece en la lista de admisión.
- Admitir paciente y verificar que pacientes y citas se actualizan en Dashboard/Admisión.
