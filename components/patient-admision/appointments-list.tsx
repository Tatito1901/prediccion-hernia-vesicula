// appointments-list.tsx - Versión refactorizada con utilidades integradas
import React, { memo, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import type { ExtendedAppointment } from '@/lib/types';
import { AppointmentCard, type ConfirmAction } from "./patient-card";

// ==================== TIPOS CENTRALIZADOS ====================
interface AppointmentListProps {
  appointments: ExtendedAppointment[];
  isLoading: boolean;
  emptyStateConfig: {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  onAction: (action: ConfirmAction, appointment: ExtendedAppointment) => void;
  onStartSurvey: (appointment: ExtendedAppointment) => void;
  onViewHistory: (patientId: string) => void;
  className?: string;
  disabled?: boolean;
  showLoadingIndicator?: boolean;
}

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

// Skeleton de carga memoizado y optimizado
const LoadingSkeleton = memo(() => (
  <div className="space-y-4" role="status" aria-label="Cargando citas">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="overflow-hidden border border-slate-200 dark:border-slate-700 transition-all duration-200">
        <CardContent className="p-0">
          {/* Indicador de progreso */}
          <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />
          
          <div className="p-5 space-y-4">
            {/* Header del paciente */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            
            {/* Estado y teléfono */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            
            {/* Información adicional */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
            
            {/* Botón de acción */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <Skeleton className="h-11 w-full rounded-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

// Componente EmptyState ahora se importa desde ui/empty-state

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
  appointments: ExtendedAppointment[];
  onAction: (action: ConfirmAction, appointment: ExtendedAppointment) => void;
  onStartSurvey: (appointment: ExtendedAppointment) => void;
  onViewHistory: (patientId: string) => void;
  disabled: boolean;
}>(({ appointments, onAction, onStartSurvey, onViewHistory, disabled }) => {
  // Renderizar función memoizada para evitar recreaciones
  const renderAppointment = useCallback((appointment: ExtendedAppointment, index: number) => (
    <div
      key={appointment.id}
      className="animate-in fade-in-0 slide-in-from-bottom-4"
      style={{ 
        animationDelay: `${Math.min(index * 50, 300)}ms`, // Limitar delay máximo
        animationFillMode: 'both'
      }}
    >
      <AppointmentCard
        appointment={appointment}
        onAction={onAction}
        onStartSurvey={() => onStartSurvey(appointment)}
        onViewHistory={onViewHistory}
        disableActions={disabled}
      />
    </div>
  ), [onAction, onStartSurvey, onViewHistory, disabled]);

  return (
    <div className="space-y-4">
      {appointments.map(renderAppointment)}
    </div>
  );
});

AppointmentsGrid.displayName = "AppointmentsGrid";

// ==================== COMPONENTE PRINCIPAL ====================

export const AppointmentsList = memo<AppointmentListProps>(({
  appointments,
  isLoading,
  emptyStateConfig,
  onAction,
  onStartSurvey,
  onViewHistory,
  className,
  disabled = false,
  showLoadingIndicator = true,
}) => {
  // Memoizar estados de renderizado
  const renderState = useMemo(() => {
    const hasAppointments = appointments.length > 0;
    const showInitialLoading = isLoading && !hasAppointments;
    const showEmptyState = !isLoading && !hasAppointments;
    const showAppointments = hasAppointments;
    const showAdditionalLoading = isLoading && hasAppointments && showLoadingIndicator;

    return {
      showInitialLoading,
      showEmptyState,
      showAppointments,
      showAdditionalLoading
    };
  }, [isLoading, appointments.length, showLoadingIndicator]);

  // Handlers memoizados para evitar recreaciones innecesarias
  const handleAction = useCallback((action: ConfirmAction, appointment: ExtendedAppointment) => {
    if (!disabled) {
      console.log(`[AppointmentsList] Action triggered: ${action}`);
      console.log(`[AppointmentsList] Appointment: ${appointment.id}, Status: ${appointment.estado_cita}`);
      onAction(action, appointment);
    }
  }, [onAction, disabled]);

  const handleStartSurvey = useCallback((appointment: ExtendedAppointment) => {
    if (!disabled) {
      onStartSurvey(appointment);
    }
  }, [onStartSurvey, disabled]);

  const handleViewHistory = useCallback((patientId: string) => {
    if (!disabled) {
      onViewHistory(patientId);
    }
  }, [onViewHistory, disabled]);

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
        <EmptyState
          title={emptyStateConfig.title}
          description={emptyStateConfig.description}
          icon={emptyStateConfig.icon}
        />
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