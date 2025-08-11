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
import { useClinic } from '@/contexts/clinic-data-provider';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
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

// Opciones estáticas para modales (ALINEADAS CON BASE DE DATOS)
const CHANNEL_OPTIONS = [
  { value: 'PHONE_CALL', label: 'Llamada telefónica' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'WALK_IN', label: 'Visita directa' },
  { value: 'REFERRAL', label: 'Referencia' },
  { value: 'WEBSITE', label: 'Página web' },
  { value: 'SOCIAL_MEDIA', label: 'Redes sociales' }
] as const;

const MOTIVE_OPTIONS = [
  { value: 'INFORMES', label: 'Solicitud de informes' },
  { value: 'AGENDAR_CITA', label: 'Agendar cita' },
  { value: 'URGENCIA_MEDICA', label: 'Urgencia médica' },
  { value: 'SEGUIMIENTO', label: 'Seguimiento' },
  { value: 'CANCELACION', label: 'Cancelación' },
  { value: 'REAGENDAMIENTO', label: 'Reagendamiento' },
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
          onAction={onAction}
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

  // Datos centralizados desde el contexto
  const {
    isLoading,
    refetch: refresh,
    appointmentsWithPatientData,
    allAppointments,
    allPatients,
    error: queryError,
    fetchSpecificAppointments,
  } = useClinic();

  // Mutación centralizada para actualizar estado de citas
  const { mutateAsync: updateStatus } = useUpdateAppointmentStatus();

  const handleAppointmentAction = useCallback(async (action: AdmissionAction, appointmentId: string) => {
    try {
      switch (action) {
        case 'checkIn':
          await updateStatus({ appointmentId, newStatus: 'PRESENTE' });
          break;
        case 'startConsult':
          await updateStatus({ appointmentId, newStatus: 'EN_CONSULTA' });
          break;
        case 'complete':
          await updateStatus({ appointmentId, newStatus: 'COMPLETADA' });
          break;
        case 'cancel':
          await updateStatus({ appointmentId, newStatus: 'CANCELADA' });
          break;
        case 'noShow':
          await updateStatus({ appointmentId, newStatus: 'NO_ASISTIO' });
          break;
        case 'reschedule':
          toast.info('Reagendamiento no implementado aún');
          break;
        case 'viewHistory':
          toast.info('Vista de historial no implementada aún');
          break;
        default:
          toast.error('Acción no reconocida');
      }
    } catch (error: any) {
      toast.error('Error al procesar la acción', { description: error?.message });
    }
  }, [updateStatus]);

  // Helper para normalizar citas con datos de paciente
  const mapToAppointmentWithPatient = useCallback((a: any): AppointmentWithPatient => {
    const linkedPatient: any = a.patients || a.patient || (allPatients || []).find((p: any) => p.id === a.patient_id);
    return {
      id: a.id,
      patient_id: a.patient_id,
      doctor_id: a.doctor_id,
      fecha_hora_cita: a.fecha_hora_cita,
      motivos_consulta: a.motivos_consulta || [],
      estado_cita: a.estado_cita,
      es_primera_vez: a.es_primera_vez ?? false,
      notas_breves: a.notas_breves,
      created_at: a.created_at,
      updated_at: a.updated_at,
      agendado_por: a.agendado_por,
      fecha_agendamiento: a.fecha_agendamiento,
      patients: linkedPatient ? {
        id: linkedPatient.id,
        nombre: linkedPatient.nombre || '',
        apellidos: linkedPatient.apellidos || '',
        telefono: linkedPatient.telefono,
        email: linkedPatient.email,
        edad: typeof linkedPatient.edad === 'number' ? linkedPatient.edad : undefined,
        estado_paciente: linkedPatient.estado_paciente,
        diagnostico_principal: linkedPatient.diagnostico_principal,
      } : {
        id: a.patient_id,
        nombre: '',
        apellidos: '',
        telefono: undefined,
        email: undefined,
        edad: undefined,
        estado_paciente: undefined,
        diagnostico_principal: undefined,
      }
    } as AppointmentWithPatient;
  }, [allPatients]);

  // Filtrado optimizado de citas
  const normalizedAppointments = useMemo<AppointmentWithPatient[]>(() => {
    const source = (appointmentsWithPatientData && (appointmentsWithPatientData as any[]).length > 0)
      ? (appointmentsWithPatientData as any[])
      : ((allAppointments as any[]) || []);

    return source.map(mapToAppointmentWithPatient);
  }, [appointmentsWithPatientData, allAppointments, mapToAppointmentWithPatient]);

  // Estado y fetch bajo demanda para citas futuras
  const [futureLoaded, setFutureLoaded] = useState(false);
  const [isLoadingFuture, setIsLoadingFuture] = useState(false);
  const [futureRaw, setFutureRaw] = useState<any[] | null>(null);
  const [futurePage, setFuturePage] = useState(1);
  const [futureHasMore, setFutureHasMore] = useState<boolean | undefined>(undefined);
  const [isLoadingFutureMore, setIsLoadingFutureMore] = useState(false);

  useEffect(() => {
    if (activeTab === 'future' && !futureLoaded) {
      setIsLoadingFuture(true);
      (async () => {
        try {
          const res = await fetchSpecificAppointments({ dateFilter: 'future', pageSize: 100, page: 1 });
          setFutureRaw(res?.data || []);
          setFutureLoaded(true);
          setFuturePage(1);
          setFutureHasMore(res?.pagination?.hasMore);
        } catch (e: any) {
          toast.error('Error al cargar citas futuras', { description: e?.message });
        } finally {
          setIsLoadingFuture(false);
        }
      })();
    }
  }, [activeTab, futureLoaded, fetchSpecificAppointments]);

  const loadMoreFuture = useCallback(async () => {
    if (!futureHasMore || isLoadingFutureMore) return;
    setIsLoadingFutureMore(true);
    try {
      const next = futurePage + 1;
      const res = await fetchSpecificAppointments({ dateFilter: 'future', pageSize: 100, page: next });
      setFutureRaw((prev) => ([...(prev || []), ...(res?.data || [])]));
      setFuturePage(next);
      setFutureHasMore(res?.pagination?.hasMore);
    } catch (e: any) {
      toast.error('Error al cargar más citas futuras', { description: e?.message });
    } finally {
      setIsLoadingFutureMore(false);
    }
  }, [futureHasMore, isLoadingFutureMore, futurePage, fetchSpecificAppointments]);

  const futureAppointmentsLoaded = useMemo<AppointmentWithPatient[]>(() => {
    if (!futureRaw) return [];
    return futureRaw.map(mapToAppointmentWithPatient);
  }, [futureRaw, mapToAppointmentWithPatient]);

  // Estado y fetch bajo demanda para citas pasadas
  const [pastLoaded, setPastLoaded] = useState(false);
  const [isLoadingPast, setIsLoadingPast] = useState(false);
  const [isLoadingPastMore, setIsLoadingPastMore] = useState(false);
  const [pastRaw, setPastRaw] = useState<any[] | null>(null);
  const [pastPage, setPastPage] = useState(1);
  const [pastHasMore, setPastHasMore] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (activeTab === 'past' && !pastLoaded) {
      setIsLoadingPast(true);
      (async () => {
        try {
          const res = await fetchSpecificAppointments({ dateFilter: 'past', pageSize: 100, page: 1 });
          setPastRaw(res?.data || []);
          setPastLoaded(true);
          setPastPage(1);
          setPastHasMore(res?.pagination?.hasMore);
        } catch (e: any) {
          toast.error('Error al cargar citas pasadas', { description: e?.message });
        } finally {
          setIsLoadingPast(false);
        }
      })();
    }
  }, [activeTab, pastLoaded, fetchSpecificAppointments]);

  const loadMorePast = useCallback(async () => {
    if (!pastHasMore || isLoadingPastMore) return;
    setIsLoadingPastMore(true);
    try {
      const next = pastPage + 1;
      const res = await fetchSpecificAppointments({ dateFilter: 'past', pageSize: 100, page: next });
      setPastRaw((prev) => ([...(prev || []), ...(res?.data || [])]));
      setPastPage(next);
      setPastHasMore(res?.pagination?.hasMore);
    } catch (e: any) {
      toast.error('Error al cargar más citas pasadas', { description: e?.message });
    } finally {
      setIsLoadingPastMore(false);
    }
  }, [pastHasMore, isLoadingPastMore, pastPage, fetchSpecificAppointments]);

  const pastAppointmentsLoaded = useMemo<AppointmentWithPatient[]>(() => {
    if (!pastRaw) return [];
    return pastRaw.map(mapToAppointmentWithPatient);
  }, [pastRaw, mapToAppointmentWithPatient]);

  const { todayAppointments, futureAppointments, pastAppointments } = useMemo(() => {
    const baseApps = normalizedAppointments;

    return {
      todayAppointments: baseApps.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isToday(new Date(app.fecha_hora_cita))
      ),
      futureAppointments: baseApps.filter(app =>
        app?.estado_cita === 'PROGRAMADA' &&
        app.fecha_hora_cita &&
        isFuture(new Date(app.fecha_hora_cita))
      ),
      pastAppointments: baseApps.filter(app =>
        app?.fecha_hora_cita &&
        (app.estado_cita !== 'PROGRAMADA' || isPast(new Date(app.fecha_hora_cita)))
      )
    };
  }, [normalizedAppointments]);

  // Contadores memoizados (considerando datos on-demand)
  const counts = useMemo(() => {
    const futureMergedLen = futureAppointmentsLoaded.length > 0
      ? (() => { const ids = new Set(futureAppointmentsLoaded.map(a => a.id)); return futureAppointmentsLoaded.length + futureAppointments.filter(a => !ids.has(a.id)).length; })()
      : futureAppointments.length;
    const pastMergedLen = pastAppointmentsLoaded.length > 0
      ? (() => { const ids = new Set(pastAppointmentsLoaded.map(a => a.id)); return pastAppointmentsLoaded.length + pastAppointments.filter(a => !ids.has(a.id)).length; })()
      : pastAppointments.length;
    return {
      today: todayAppointments.length,
      future: futureMergedLen,
      past: pastMergedLen,
      schedule: todayAppointments.length + futureMergedLen + pastMergedLen,
    };
  }, [todayAppointments.length, futureAppointmentsLoaded, futureAppointments, pastAppointmentsLoaded, pastAppointments]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    // Limpiar caches locales para forzar refetch on-demand
    setFutureLoaded(false);
    setFutureRaw(null);
    setFuturePage(1);
    setFutureHasMore(undefined);
    setPastLoaded(false);
    setPastRaw(null);
    setPastPage(1);
    setPastHasMore(undefined);
    refresh();
  }, [refresh]);

  const handleLoadMore = useCallback(() => {
    if (activeTab === 'future') return loadMoreFuture();
    if (activeTab === 'past') return loadMorePast();
  }, [activeTab, loadMoreFuture, loadMorePast]);

  const renderTabContent = () => {
    const emptyStates = {
      today: 'No hay citas programadas para hoy',
      future: 'No hay citas futuras programadas',
      past: 'No hay citas pasadas registradas',
      schedule: 'No hay citas programadas'
    };

    let currentAppointments: AppointmentWithPatient[] = [];
    let tabIsLoading = isLoading;
    let isLoadingMoreProp = false;
    let hasMoreProp: boolean | undefined = false;
    switch (activeTab) {
      case 'today':
        currentAppointments = todayAppointments;
        break;
      case 'future':
        if (futureAppointmentsLoaded.length > 0) {
          const ids = new Set(futureAppointmentsLoaded.map(a => a.id));
          currentAppointments = [
            ...futureAppointmentsLoaded,
            ...futureAppointments.filter(a => !ids.has(a.id))
          ];
        } else {
          currentAppointments = futureAppointments;
        }
        tabIsLoading = isLoading || isLoadingFuture;
        isLoadingMoreProp = isLoadingFutureMore;
        hasMoreProp = futureHasMore;
        break;
      case 'past':
        if (pastAppointmentsLoaded.length > 0) {
          const ids = new Set(pastAppointmentsLoaded.map(a => a.id));
          currentAppointments = [
            ...pastAppointmentsLoaded,
            ...pastAppointments.filter(a => !ids.has(a.id))
          ];
        } else {
          currentAppointments = pastAppointments;
        }
        tabIsLoading = isLoading || isLoadingPast;
        isLoadingMoreProp = isLoadingPastMore;
        hasMoreProp = pastHasMore;
        break;
      default:
        currentAppointments = [];
    }

    return (
      <AppointmentsSection
        appointments={currentAppointments}
        isLoading={tabIsLoading}
        isLoadingMore={isLoadingMoreProp}
        hasMore={hasMoreProp}
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
      
      {queryError && (
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