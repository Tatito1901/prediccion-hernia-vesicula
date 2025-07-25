// appointments-list.tsx - Versión refactorizada con utilidades centralizadas
import React, { memo, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";

// Importaciones unificadas
import {
  AppointmentWithPatient,
  AppointmentAction,
  AppointmentListProps,
} from "./types";

import { AppointmentCard } from "./patient-card";

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

// Skeleton de carga optimizado
const LoadingSkeleton = memo(() => (
  <div className="space-y-4" role="status" aria-label="Cargando citas">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-200">
        <CardContent className="p-0">
          {/* Indicador de progreso */}
          <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />
          
          <div className="p-4 space-y-4">
            {/* Header del paciente */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
            
            {/* Información adicional */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
            
            {/* Botón de acción */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

// Indicador de carga adicional
const LoadingIndicator = memo(() => (
  <div className="flex justify-center py-4">
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
      <span>Cargando más citas...</span>
    </div>
  </div>
));

LoadingIndicator.displayName = "LoadingIndicator";

// Lista de citas optimizada con renderizado optimizado
const AppointmentsGrid = memo<{
  appointments: AppointmentWithPatient[];
  onAction: (action: AppointmentAction, appointment: AppointmentWithPatient) => void;
  onStartSurvey?: (appointment: AppointmentWithPatient) => void;
  onViewHistory?: (patientId: string) => void;
  disabled: boolean;
}>(({ appointments, onAction, onStartSurvey, onViewHistory, disabled }) => {
  // Handlers optimizados
  const handleStartSurvey = useCallback(
    (appointment: AppointmentWithPatient) => {
      if (onStartSurvey && !disabled) {
        onStartSurvey(appointment);
      }
    },
    [onStartSurvey, disabled]
  );

  const handleViewHistory = useCallback(
    (patientId: string) => {
      if (onViewHistory && !disabled) {
        onViewHistory(patientId);
      }
    },
    [onViewHistory, disabled]
  );

  const handleAction = useCallback(
    (action: AppointmentAction, appointment: AppointmentWithPatient) => {
      if (!disabled) {
        onAction(action, appointment);
      }
    },
    [onAction, disabled]
  );

  // Renderizar función memoizada para evitar recreaciones
  const renderAppointment = useCallback(
    (appointment: AppointmentWithPatient, index: number) => (
      <div
        key={appointment.id}
        className="animate-in fade-in-0 slide-in-from-bottom-4"
        style={{
          animationDelay: `${Math.min(index * 50, 300)}ms`, // Limitar delay máximo
          animationFillMode: 'both',
        }}
      >
        <AppointmentCard
          appointment={appointment}
          onAction={handleAction}
          onStartSurvey={() => handleStartSurvey(appointment)}
          onViewHistory={handleViewHistory}
          disableActions={disabled}
        />
      </div>
    ),
    [handleAction, handleStartSurvey, handleViewHistory, disabled]
  );

  return (
    <div className="space-y-4">
      {appointments.map(renderAppointment)}
    </div>
  );
});

AppointmentsGrid.displayName = "AppointmentsGrid";

// Mensaje de estado vacío optimizado
const EmptyStateMessage = memo<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}>(({ title, description, icon: Icon }) => (
  <EmptyState title={title} description={description} icon={Icon} />
));

EmptyStateMessage.displayName = "EmptyStateMessage";

// ==================== COMPONENTE PRINCIPAL ====================

export const AppointmentsList = memo<AppointmentListProps>(({
  appointments,
  isLoading = false,
  onAction,
  onStartSurvey,
  onViewHistory,
  className,
  disabled = false,
  emptyStateConfig,
}) => {
  // Memoizar estados de renderizado
  const renderState = useMemo(() => {
    const hasAppointments = appointments.length > 0;
    const showInitialLoading = isLoading && !hasAppointments;
    const showEmptyState = !isLoading && !hasAppointments;
    const showAppointments = hasAppointments;
    const showAdditionalLoading = isLoading && hasAppointments;

    return {
      showInitialLoading,
      showEmptyState,
      showAppointments,
      showAdditionalLoading,
    };
  }, [isLoading, appointments.length]);

  // Handlers memoizados para evitar recreaciones innecesarias
  const handleAction = useCallback(
    (action: AppointmentAction, appointment: AppointmentWithPatient) => {
      if (!disabled) {
        console.log(`[AppointmentsList] Action triggered: ${action}`);
        console.log(`[AppointmentsList] Appointment: ${appointment.id}, Status: ${appointment.estado_cita}`);
        onAction(action, appointment);
      }
    },
    [onAction, disabled]
  );

  const handleStartSurvey = useCallback(
    (appointment: AppointmentWithPatient) => {
      if (!disabled && onStartSurvey) {
        console.log(`[AppointmentsList] Starting survey for appointment: ${appointment.id}`);
        onStartSurvey(appointment);
      }
    },
    [onStartSurvey, disabled]
  );

  const handleViewHistory = useCallback(
    (patientId: string) => {
      if (!disabled && onViewHistory) {
        console.log(`[AppointmentsList] Viewing history for patient: ${patientId}`);
        onViewHistory(patientId);
      }
    },
    [onViewHistory, disabled]
  );

  // Estado de carga inicial
  if (renderState.showInitialLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Estado vacío
  if (renderState.showEmptyState) {
    return (
      <div className={className}>
        {emptyStateConfig ? (
          <EmptyStateMessage
            title={emptyStateConfig.title}
            description={emptyStateConfig.description}
            icon={emptyStateConfig.icon}
          />
        ) : (
          <EmptyState
            title="No hay citas disponibles"
            description="Las citas programadas aparecerán en esta sección."
            icon={() => <div className="text-4xl">📅</div>}
          />
        )}
      </div>
    );
  }

  // Lista principal de citas
  return (
    <div className={cn("space-y-4", className)}>
      {renderState.showAppointments && (
        <AppointmentsGrid
          appointments={appointments}
          onAction={handleAction}
          onStartSurvey={handleStartSurvey}
          onViewHistory={handleViewHistory}
          disabled={disabled}
        />
      )}

      {/* Indicador de carga adicional */}
      {renderState.showAdditionalLoading && <LoadingIndicator />}
    </div>
  );
});

AppointmentsList.displayName = "AppointmentsList";

export default AppointmentsList;