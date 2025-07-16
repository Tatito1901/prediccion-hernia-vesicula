# Plan de Análisis y Refactorización de Hooks

Este documento describe el plan para analizar y mejorar el uso de hooks en la aplicación `prediccion-hernia-vesicula`.

### **Fase 1: Análisis Inicial y Refactorización (Etapa Actual)**

- [x] **Analizar `components/dashboard/patients-chart.tsx`**: Identificar áreas iniciales de mejora.
- [ ] **Refactorizar `PatientTrendsChart`**: Eliminar el `useState` y `useEffect` redundantes para eliminar la condición de carrera y simplificar el componente.
- [ ] **Documentar el Plan**: Crear este archivo `ANALYSIS_PLAN.md`.

### **Fase 2: Análisis Profundo del Dashboard**

- [ ] **Investigar `dashboard-metrics.tsx` y `patient-analytics.tsx`**: Analizar estos componentes en busca de patrones similares de mal uso de hooks, como estado redundante o efectos complejos.
- [ ] **Centralizar Lógica**: Buscar oportunidades para mover transformaciones de datos complejas a hooks personalizados existentes como `useDashboard` o a nuevos hooks más especializados.

### **Fase 3: Revisión de Hooks Personalizados**

- [ ] **Analizar Hooks Existentes**: Revisar los hooks en el directorio `hooks/` (`use-statistics-data.ts`, `use-appointments.ts`, `use-processed-patients.ts`, etc.).
- [ ] **Optimizar Hooks**: Verificar la correcta gestión de dependencias en `useEffect` y `useMemo`, asegurar que tengan una única responsabilidad y que estén escritos de manera eficiente.

### **Fase 4: Análisis a Nivel de Componente**

- [ ] **Revisar Componentes de Admisión y Encuestas**: Examinar los componentes en `components/patient-admision/` y `components/surveys/` en busca de estado local complejo que podría ser gestionado por un hook personalizado o una librería de manejo de estado.

### **Fase 5: Informe Final y Recomendaciones**

- [ ] **Resumir Hallazgos**: Consolidar todos los problemas identificados y los refactors aplicados.
- [ ] **Proveer Mejores Prácticas**: Ofrecer un conjunto final de recomendaciones accionables para mantener una arquitectura de hooks limpia y eficiente en el proyecto.
