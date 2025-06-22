// AppointmentsList.tsx - Versión mejorada y elegante
import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AppointmentListProps } from "./types";
import { AppointmentCard } from "./AppointmentCard";

// Loading skeleton elegante
const LoadingSkeleton = memo(() => (
  <div className="space-y-4" role="status" aria-label="Cargando citas">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="overflow-hidden border border-slate-200 dark:border-slate-700">
        <CardContent className="p-0">
          <div className="h-1 bg-slate-200 dark:bg-slate-700 animate-pulse" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
            
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </div>
            
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

// Estado vacío elegante
const EmptyState = memo<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}>(({ title, description, icon: IconComponent }) => (
  <div className="text-center py-16 px-6">
    <Card className="max-w-md mx-auto border-0 shadow-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
      <CardContent className="p-8">
        <div className="relative mb-6">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-lg">
            <IconComponent className="h-10 w-10 text-slate-500 dark:text-slate-400" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 animate-pulse" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">
          {title}
        </h3>
        
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </CardContent>
    </Card>
  </div>
));

EmptyState.displayName = "EmptyState";

// Componente principal
export const AppointmentsList = memo<AppointmentListProps>(({
  appointments,
  isLoading,
  emptyStateConfig,
  onAction,
  onStartSurvey,
  onViewHistory,
  className,
  disabled = false,
}) => {
  // Loading state
  if (isLoading && appointments.length === 0) {
    return (
      <div className={cn("space-y-6", className)}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Empty state
  if (!isLoading && appointments.length === 0) {
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

  // Lista de citas
  return (
    <div className={cn("space-y-4", className)}>
      {appointments.map((appointment, index) => (
        <div
          key={appointment.id}
          className="animate-in fade-in-0 slide-in-from-bottom-4"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <AppointmentCard
            appointment={appointment}
            onAction={onAction}
            onStartSurvey={onStartSurvey}
            onViewHistory={onViewHistory}
            isLoading={isLoading}
            disabled={disabled}
          />
        </div>
      ))}
      
      {/* Indicador de carga al final si hay más datos */}
      {isLoading && appointments.length > 0 && (
        <div className="flex justify-center py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <span>Cargando más citas...</span>
          </div>
        </div>
      )}
    </div>
  );
});

AppointmentsList.displayName = "AppointmentsList";