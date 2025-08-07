// components/patient-admision/patient-admission.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { 
  RefreshCw, 
  Clock, 
  Calendar, 
  CalendarClock, 
  UserPlus, 
  CalendarCheck, 
  AlertCircle,
  Plus
} from 'lucide-react';
import { isToday, isFuture, isPast } from 'date-fns';
import { useAdmissionUnified, useAppointmentActionsUnified } from '@/hooks/use-admission-unified';
import type { TabType, AppointmentWithPatient, AdmissionAction } from './admision-types';

// Carga diferida de componentes pesados
const PatientCard = dynamic(() => import('./patient-card'), { 
  ssr: false,
  loading: () => <Skeleton className="h-40 w-full rounded-xl" />
});

import { PatientModal } from './patient-modal';
import { NewLeadForm } from '@/components/leads/new-lead-form';

// ==================== CONFIGURACIÓN DE TABS ====================
const TABS_CONFIG = [
  {
    key: 'today',
    label: 'Hoy',
    icon: <Calendar className="w-4 h-4" />,
    color: 'bg-blue-500',
    description: 'Citas de hoy'
  },
  {
    key: 'future',
    label: 'Futuras',
    icon: <CalendarClock className="w-4 h-4" />,
    color: 'bg-green-500',
    description: 'Citas programadas'
  },
  {
    key: 'past',
    label: 'Pasadas',
    icon: <Clock className="w-4 h-4" />,
    color: 'bg-gray-500',
    description: 'Historial de citas'
  }
] as const;

// Opciones estáticas para modales
const CHANNEL_OPTIONS = [
  { value: 'TELEFONO', label: 'Teléfono' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'FACEBOOK', label: 'Facebook' },
  { value: 'INSTAGRAM', label: 'Instagram' },
  { value: 'REFERENCIA', label: 'Referencia' },
  { value: 'PAGINA_WEB', label: 'Página Web' },
  { value: 'OTRO', label: 'Otro' }
] as const;

const MOTIVE_OPTIONS = [
  { value: 'CONSULTA_GENERAL', label: 'Consulta General' },
  { value: 'DOLOR_ABDOMINAL', label: 'Dolor Abdominal' },
  { value: 'HERNIA', label: 'Hernia' },
  { value: 'VESICULA', label: 'Vesícula' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  { value: 'OTRO', label: 'Otro' }
] as const;

// ==================== COMPONENTES MEMOIZADOS ====================
const TabNavigation = React.memo<{
  activeTab: TabType; 
  onTabChange: (tab: TabType) => void; 
  counts: Record<TabType, number>; 
  isLoading: boolean; 
}>(({ activeTab, onTabChange, counts, isLoading }) => (
  <div className="mb-6">
    <div className="flex flex-wrap gap-2">
      {TABS_CONFIG.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] || 0;
        
        return (
          <Button
            key={tab.key}
            variant={isActive ? "default" : "outline"}
            size="lg"
            className={`
              flex flex-col items-center justify-center h-auto py-3 px-4 relative
              transition-all duration-200 rounded-xl
              ${isActive ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm'}
              min-w-[100px] sm:min-w-[120px]
            `}
            onClick={() => onTabChange(tab.key)}
            disabled={isLoading}
          >
            <div className={`p-2 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'} mb-2`}>
              {tab.icon}
            </div>
            <span className="font-medium text-sm">{tab.label}</span>
            {count > 0 && (
              <Badge 
                variant={isActive ? "secondary" : "outline"}
                className={`
                  absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs
                  ${isActive ? 'bg-white text-primary border-0' : 'bg-primary text-white'}
                `}
              >
                {count}
              </Badge>
            )}
            <span className="text-xs opacity-70 mt-1 text-center line-clamp-1">
              {tab.description}
            </span>
          </Button>
        );
      })}
    </div>
  </div>
));
TabNavigation.displayName = 'TabNavigation';

const AdmissionHeader = React.memo<{
  isRefreshing: boolean;
  onRefresh: () => void;
}>(({ isRefreshing, onRefresh }) => {
  return (
    <Card className="mb-6 border-0 shadow-sm bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary rounded-xl">
              <CalendarCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">
                Admisión de Pacientes
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Gestión eficiente de citas y pacientes
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex gap-2">
              <NewLeadForm
                trigger={
                  <Button variant="outline" className="gap-2 rounded-xl">
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden xs:inline">Nuevo Lead</span>
                  </Button>
                }
                onSuccess={() => {
                  toast.success('Lead creado exitosamente');
                  window.location.reload();
                }}
              />
              <PatientModal
                trigger={
                  <Button className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" />
                    <span className="hidden xs:inline">Nuevo Paciente</span>
                  </Button>
                }
                onSuccess={() => {
                  toast.success('Paciente registrado exitosamente');
                  onRefresh();
                }}
              />
            </div>
            
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="gap-2 h-10 px-4 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Actualizando...' : 'Actualizar'}
              </span>
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
});
AdmissionHeader.displayName = 'AdmissionHeader';

const AppointmentsSection = React.memo<{
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean | undefined;
  loadMore: () => void;
  refresh: () => void;
  emptyMessage: string;
  onAction: (action: AdmissionAction, appointmentId: string) => void;
}>(({ appointments, isLoading, isLoadingMore, hasMore, loadMore, refresh, emptyMessage, onAction }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (!appointments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 p-4 bg-secondary rounded-full">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">{emptyMessage}</h3>
        <p className="text-muted-foreground text-sm max-w-md">
          Las citas aparecerán aquí una vez que sean programadas.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <PatientCard
          key={appointment.id}
          appointment={appointment}
          onAction={(action: AdmissionAction) => onAction(action, appointment.id)}
        />
      ))}
      
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="gap-2 rounded-xl"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Cargando...</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                <span className="text-sm">Cargar más</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
});
AppointmentsSection.displayName = 'AppointmentsSection';

// ==================== COMPONENTE PRINCIPAL ====================
const PatientAdmission: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  
  const { 
    isLoading, 
    refetch: refresh, 
    fetchNextPage, 
    hasNextPage,
    appointments,
    error: queryError,
    isError: queryIsError
  } = useAdmissionUnified(activeTab);
  
  const { handleAppointmentAction } = useAppointmentActionsUnified();

  // Filtrado optimizado de citas
  const { todayAppointments, futureAppointments, pastAppointments } = useMemo(() => {
    const allApps = appointments || [];
    
    return {
      todayAppointments: allApps.filter(app => 
        app?.estado_cita === 'PROGRAMADA' && 
        app.fecha_hora_cita && 
        isToday(new Date(app.fecha_hora_cita))
      ),
      futureAppointments: allApps.filter(app => 
        app?.estado_cita === 'PROGRAMADA' && 
        app.fecha_hora_cita && 
        isFuture(new Date(app.fecha_hora_cita))
      ),
      pastAppointments: allApps.filter(app => 
        app?.fecha_hora_cita && 
        (app.estado_cita !== 'PROGRAMADA' || isPast(new Date(app.fecha_hora_cita)))
      )
    };
  }, [appointments]);

  // Contadores memoizados
  const counts = useMemo(() => ({
    today: todayAppointments.length,
    future: futureAppointments.length,
    past: pastAppointments.length,
    schedule: todayAppointments.length + futureAppointments.length + pastAppointments.length
  }), [todayAppointments.length, futureAppointments.length, pastAppointments.length]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [hasNextPage, isLoading, fetchNextPage]);

  const renderTabContent = () => {
    const emptyStates = {
      today: 'No hay citas programadas para hoy',
      future: 'No hay citas futuras programadas',
      past: 'No hay citas pasadas registradas',
      schedule: 'No hay citas programadas'
    };

    let currentAppointments: AppointmentWithPatient[] = [];
    switch (activeTab) {
      case 'today':
        currentAppointments = todayAppointments;
        break;
      case 'future':
        currentAppointments = futureAppointments;
        break;
      case 'past':
        currentAppointments = pastAppointments;
        break;
      default:
        currentAppointments = [];
    }

    return (
      <AppointmentsSection
        appointments={currentAppointments}
        isLoading={isLoading}
        isLoadingMore={isLoading}
        hasMore={hasNextPage}
        loadMore={handleLoadMore}
        refresh={handleRefresh}
        emptyMessage={emptyStates[activeTab]}
        onAction={handleAppointmentAction}
      />
    );
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 space-y-6">
      <AdmissionHeader
        isRefreshing={isLoading}
        onRefresh={handleRefresh}
      />
      
      {queryIsError && queryError && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex-1">Error al cargar datos: {queryError.message}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="h-8 text-xs whitespace-nowrap rounded-lg"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        counts={counts}
        isLoading={isLoading}
      />
      
      <div className="min-h-[400px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default React.memo(PatientAdmission);