// components/patient-admision/appointments-list-optimized.tsx
'use client';

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

// Icons
import {
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle,
  CalendarX,
  Users,
  CheckCircle,
} from 'lucide-react';

// Componentes (usando la versión optimizada de PatientCard)
import PatientCard from './patient-card';

// ==================== TIPOS ====================
// Se mantienen los tipos para consistencia.
interface AppointmentWithPatient {
  id: string;
  fecha_hora_cita: string;
  motivo_cita: string;
  estado_cita: string;
  es_primera_vez?: boolean | null;
  notas_cita_seguimiento?: string | null;
  patients?: {
    id: string;
    nombre?: string;
    apellidos?: string;
    telefono?: string;
    email?: string;
    edad?: number;
  };
  profiles?: {
    full_name?: string;
  };
}

type AppointmentAction =
  | 'checkIn'
  | 'startConsult'
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

interface AppointmentsListProps {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onAction: (action: AppointmentAction, appointmentId: string) => void;
  onLoadMore: () => void;
  onRefresh?: () => void;
  emptyStateConfig?: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
  };
  error?: Error | null;
  className?: string;
}

// ==================== CONFIGURACIÓN POR DEFECTO ====================
const DEFAULT_EMPTY_STATE = {
  icon: CalendarX,
  title: 'No hay citas',
  description: 'No se encontraron citas para mostrar en esta sección.',
};

// ==================== COMPONENTES INTERNOS (Optimizados para Dark Mode y Responsividad) ====================

const LoadingSkeleton = memo(({ count = 4 }: { count?: number }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6 mt-2" />
          </div>
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </Card>
    ))}
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

const ErrorState = memo(({ error, onRetry }: { error: Error; onRetry?: () => void }) => (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error al cargar las citas</AlertTitle>
    <AlertDescription>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <p>{error.message}</p>
        {onRetry && (
          <Button variant="destructive_outline" size="sm" onClick={onRetry} className="mt-2 sm:mt-0 sm:ml-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
      </div>
    </AlertDescription>
  </Alert>
));
ErrorState.displayName = "ErrorState";

// ==================== HOOK PARA SCROLL INFINITO (Simplificado) ====================
const useInfiniteScroll = (
  targetRef: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options?: IntersectionObserverInit
) => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onIntersect();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1,
        ...options,
      }
    );

    const currentRef = targetRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [targetRef, onIntersect, options]);
};

// ==================== COMPONENTE PRINCIPAL ====================
export const AppointmentsList: React.FC<AppointmentsListProps> = memo(({
  appointments,
  isLoading,
  isLoadingMore,
  hasMore,
  onAction,
  onLoadMore,
  onRefresh,
  emptyStateConfig = DEFAULT_EMPTY_STATE,
  error,
  className,
}) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // El hook de scroll infinito ahora solo necesita saber cuándo cargar más.
  useInfiniteScroll(loadMoreRef, () => {
    if (hasMore && !isLoadingMore && !isLoading) {
      onLoadMore();
    }
  });

  const handleAction = useCallback((action: AppointmentAction, appointmentId: string) => {
    onAction(action, appointmentId);
  }, [onAction]);

  const handleRetry = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Renderiza un esqueleto si está en la carga inicial.
  if (isLoading && appointments.length === 0) {
    return (
      <div className={className}>
        <LoadingSkeleton />
      </div>
    );
  }

  // Renderiza un estado de error si la carga inicial falla.
  if (error && appointments.length === 0) {
    return (
      <div className={className}>
        <ErrorState error={error} onRetry={handleRetry} />
      </div>
    );
  }

  // Renderiza un estado vacío si no hay citas después de cargar.
  if (!isLoading && appointments.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          icon={emptyStateConfig.icon}
          title={emptyStateConfig.title}
          description={emptyStateConfig.description}
          action={
            onRefresh ? (
              <Button variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Encabezado con estadísticas y botón de refrescar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Mostrando {appointments.length} citas</span>
          {hasMore && <span className="text-xs">(y más por cargar)</span>}
        </div>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading || isLoadingMore}>
            <RefreshCw className={cn("h-4 w-4 mr-2", (isLoading || isLoadingMore) && "animate-spin")} />
            Actualizar
          </Button>
        )}
      </div>

      {/* Lista de citas */}
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <PatientCard
            key={appointment.id}
            appointment={appointment}
            onAction={handleAction}
            disableActions={isLoadingMore}
          />
        ))}
      </div>

      {/* Indicador de "Cargando más..." */}
      {isLoadingMore && (
        <div className="flex justify-center items-center py-6 gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando más citas...
        </div>
      )}

      {/* Mensaje de final de la lista */}
      {!hasMore && appointments.length > 0 && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Has llegado al final de la lista.
          </div>
        </div>
      )}
      
      {/* Elemento invisible que dispara la carga infinita */}
      <div ref={loadMoreRef} className="h-1" />

      {/* Error durante la carga adicional (no bloqueante) */}
      {error && appointments.length > 0 && (
         <ErrorState error={error} onRetry={onLoadMore} />
      )}
    </div>
  );
});

AppointmentsList.displayName = "AppointmentsList";

export default AppointmentsList;
export type { AppointmentWithPatient, AppointmentAction, AppointmentsListProps };
