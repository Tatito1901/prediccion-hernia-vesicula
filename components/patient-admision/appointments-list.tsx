import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppointmentStatusEnum } from "@/app/dashboard/data-model";
import { AppointmentCard } from "./patient-card";

// Tipos optimizados
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

export interface OptimizedAppointment {
  readonly id: string;
  readonly nombre: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly fechaConsulta: Date;
  readonly horaConsulta: string;
  readonly dateTime: Date;
  readonly motivoConsulta: string;
  readonly estado: AppointmentStatusEnum;
  readonly paciente: string;
  readonly doctor: string;
  readonly patientId?: string;
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface AppointmentsListProps {
  appointments: OptimizedAppointment[];
  isLoading: boolean;
  emptyState: EmptyStateProps;
  onAction: (action: ConfirmAction, id: string, appointment: OptimizedAppointment) => void;
  onStartSurvey: (appointmentId: string, patientId?: string, appointment?: OptimizedAppointment) => void;
  onViewHistory: (patientId: string) => void;
}

// Skeleton de carga simplificado
const LoadingSkeleton = () => (
  <div className="space-y-4" role="status" aria-label="Cargando citas">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="p-4 shadow-sm">
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

// Estado vacío optimizado
const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon: IconComponent }) => (
  <div className="text-center p-16 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center">
    <div className="relative mb-6">
      <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <IconComponent className="h-10 w-10 text-slate-500 dark:text-slate-400" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
      {title}
    </h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
  </div>
);

// Componente principal optimizado
export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  appointments,
  isLoading,
  emptyState,
  onAction,
  onStartSurvey,
  onViewHistory,
}) => {
  // Early returns para mejor rendimiento
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!appointments?.length) {
    return (
      <EmptyState
        title={emptyState.title}
        description={emptyState.description}
        icon={emptyState.icon}
      />
    );
  }

  // Renderizado optimizado de la lista
  return (
    <div className="space-y-4 dark:space-y-6">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onAction={onAction}
          onStartSurvey={onStartSurvey}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
};