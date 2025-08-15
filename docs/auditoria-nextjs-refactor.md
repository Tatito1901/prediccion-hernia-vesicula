# Auditoría de Plataforma Next.js/TypeScript/Tailwind

## Resumen ejecutivo
- Se consolidó `/api/assign-survey` como endpoint canónico (solo POST). Otros métodos responden 405 con `Allow: POST`.
- Se confirmó la deprecación y respuesta 410 de `/api/admission/counts`.
- Se identificaron componentes y hooks potencialmente huérfanos y endpoints redundantes.
- Se propone un plan por fases para limpiar código muerto, unificar fuentes de datos de dashboard y reducir complejidad.

## Alcance y criterios
- Enfoque en mantenibilidad, eficiencia, reutilización (DRY) y eliminación de código muerto.
- Priorización clínica: reducir riesgo de estados inconsistentes en datos de pacientes/encuestas.

## Hallazgos
- Client Components correctamente marcados con `"use client"` donde corresponde.
- Orfandad probable:
  - `components/appointments/appointments-list-reactive.tsx`
  - `components/charts/dashboard/dashboard-container.tsx`
  - `hooks/use-dashboard-charts.ts` (solo referido por `dashboard-container`)
  - `components/charts/temporal-trends-chart.tsx`
  - `components/providers/index.tsx` (barrel sin uso)
  - `hooks/selectors/use-clinic-selectors.ts` (sin uso)
  - `components/charts/chart-diagnostic.tsx` (sin importadores)
- API con mensajes cruzados de deprecación:
  - Se canoniza `/api/assign-survey`.
  - `/api/appointments/[id]/survey` permanece deprecado y responde 410.
- DRY/duplicación:
  - Métricas: usar `components/ui/metrics-system.tsx` de forma central.
  - Estadísticas de dashboard: preferir `hooks/use-analytics-data.ts` y endpoints de `dashboard/summary`.

## Plan de acción (priorizado)
| Prioridad | Ítem | Acción | Justificación | Riesgo | Owner |
|---|---|---|---|---|---|
| P1 | `/api/assign-survey` | Canonizar POST-only; 405 otros métodos | Evita ambigüedad de flujos | Bajo | Backend |
| P1 | `/api/appointments/[id]/survey` | Mantener 410 Gone + banner deprecación | Un único contrato reduce errores | Bajo | Backend |
| P1 | Orphans listados | Mover a `deprecated/` y programar eliminación | Reduce mantenimiento y confusión | Bajo | FE |
| P2 | Dashboard data | Unificar en `use-analytics-data.ts`; retirar `use-dashboard-charts.ts` si no hay gaps | Menos contratos/cachés | Medio | FE |
| P2 | Linter/analizador | Integrar `ts-prune` y script de CI | Detectar exports no usados | Bajo | DevEx |

## Justificación técnica
- Un único endpoint para asignar encuestas elimina divergencias en contratos y manejo de estados de encuesta.
- Eliminar componentes huérfanos reduce el tiempo de compilación y previene regresiones por reutilizar UI obsoleta.
- Unificar capa de datos del dashboard simplifica invalidaciones de React Query y coherencia de KPIs.

## Validación y pruebas
- Greps de confirmación de orfandad:
  - `grep -R "appointments-list-reactive" -n .`
  - `grep -R "dashboard-container" -n .`
  - `grep -R "use-dashboard-charts" -n .`
  - `grep -R "temporal-trends-chart" -n .`
  - `grep -R "chart-diagnostic" -n .`
  - `grep -R "components/providers/index" -n .`
  - `grep -R "use-clinic-selectors" -n .`
- API:
  - `curl -i -X POST /api/assign-survey` → 201/200 esperado.
  - `curl -i -X GET /api/assign-survey` → 405 `Allow: POST`.
  - `curl -i /api/appointments/123/survey` → 410.
- Tooling recomendado (manual):
  - `npm i -D ts-prune` y script: `"ts-prune": "ts-prune"`.
  - Ejecutar `npx ts-prune` y `next build` tras limpieza.

## Cambios realizados
- `app/api/assign-survey/route.ts`: actualizado para POST-only (405 en GET/PATCH) y comentarios aclaratorios.
- `app/api/admission/counts/route.ts`: confirmado 410 con mensaje de deprecación.
- `app/api/appointments/[id]/survey/route.ts`: permanece con 410 en métodos implementados.

## Próximos pasos sugeridos
1. Crear carpeta `deprecated/` y mover archivos huérfanos indicados (o añadir banner `@deprecated` mientras tanto).
2. Decidir si retirar `hooks/use-dashboard-charts.ts` y su endpoint asociado tras validar cobertura con `use-analytics-data.ts`.
3. Integrar `ts-prune` y añadir job de CI para prevenir regresión de código muerto.
4. Ejecutar `next build` y pruebas existentes para smoke test.

## Riesgos y mitigaciones (ámbito clínico)
- Cambios en contratos de API: mitigado al canonizar el endpoint ya usado por el cliente.
- Eliminación de componentes: mitigar moviendo primero a `deprecated/` por un sprint.

