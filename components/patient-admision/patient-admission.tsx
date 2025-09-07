'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  memo,
  useEffect,
  useRef,
  useTransition,
} from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// Utils, hooks & types
import { cn } from '../../lib/utils';
import { AppointmentStatusEnum } from '../../lib/types';
import type { AppointmentStatus } from '../../lib/types';
import { useAppointments } from '@/hooks/core/use-appointments';
import { endpoints, buildSearchParams } from '../../lib/api-endpoints';
import { queryFetcher } from '../../lib/http';
import { queryKeys } from '../../lib/query-keys';
import type { TabType, AppointmentWithPatient, AdmissionAction } from './admision-types';

// UI Components
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// Icons: Importaciones agrupadas para mayor claridad
import {
  RefreshCw,
  Calendar,
  CalendarDays,
  CalendarCheck,
  AlertCircle,
  Plus,
  Search,
  SlidersHorizontal,
  Clock,
  Stethoscope,
  X,
} from 'lucide-react';

// ==================== CONSTANTS ====================
const SKELETON_COUNT = 6;

// Opciones para el filtro de estado. Definido como constante para evitar recreación en cada render.
const STATUS_FILTER_OPTIONS = [
  { value: AppointmentStatusEnum.PROGRAMADA, label: 'Programadas' },
  { value: AppointmentStatusEnum.CONFIRMADA, label: 'Confirmadas' },
  { value: AppointmentStatusEnum.PRESENTE, label: 'En Consulta' },
  { value: AppointmentStatusEnum.COMPLETADA, label: 'Completadas' },
  { value: AppointmentStatusEnum.CANCELADA, label: 'Canceladas' },
  { value: AppointmentStatusEnum.NO_ASISTIO, label: 'No Asistió' },
];


// ==================== SKELETON ====================
const CardSkeleton = memo(() => (
  <div className="animate-pulse">
    <Card className="border-l-4 border-gray-200 dark:border-gray-800">
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </Card>
  </div>
));
CardSkeleton.displayName = 'CardSkeleton';

// ==================== LAZY MOUNT (Virtualización ligera) ====================
// Este componente utiliza IntersectionObserver para retrasar el montaje de sus hijos
// hasta que estén cerca del viewport. La propiedad CSS `content-visibility` ayuda
// al navegador a optimizar el renderizado, saltándose el layout y paint de elementos
// fuera de pantalla.
const LazyMount = ({ children, rootMargin = '300px' }: { children: React.ReactNode; rootMargin?: string }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}>
      {isVisible ? children : <CardSkeleton />}
    </div>
  );
};

// ==================== LAZY loaded components ====================
const PatientCard = dynamic(() => import('./patient-card'), {
  ssr: false,
  loading: () => <CardSkeleton />,
});

const PatientModal = dynamic(
  () => import('./patient-modal').then(mod => ({ default: mod.PatientModal })),
  { ssr: false }
);

// ==================== ACCESOS DIRECTOS ====================
const useKeyboardShortcuts = (focusSearch: () => void, onRefresh: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onRefresh();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusSearch, onRefresh]);
};

// ==================== HEADER COMPONENT ====================
const AdmissionHeader = memo(function AdmissionHeader({
  isRefreshing,
  onRefresh,
  onSuccess,
  stats,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
  onSuccess: () => void;
  stats: { today: number; pending: number; completed: number };
}) {
  // El contenido de este componente es estático y bien memoizado, no requiere cambios.
  return (
    <div className="space-y-4 sm:space-y-6 mb-6 sm:mb-8">
       <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 sm:gap-3">
            <span className="p-1.5 sm:p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-sky-600 dark:text-sky-400" />
            </span>
            <span className="truncate">Admisión de Pacientes</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 truncate">Clínica Hernia y Vesícula - Dr. Luis Ángel Medina</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <PatientModal
            trigger={
              <Button
                className="gap-1.5 sm:gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-md text-sm sm:text-base"
                aria-label="Crear nuevo paciente"
              >
                <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Nuevo Paciente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            }
            onSuccess={onSuccess}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Actualizar datos"
            className="shadow-sm"
            title="Actualizar (R)"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin motion-reduce:animate-none')} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-[10px] sm:text-xs lg:text-sm text-sky-700 dark:text-sky-300">Citas Hoy</CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-sky-900 dark:text-sky-100">{stats.today}</CardTitle>
              </div>
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-sky-500/30" />
            </div>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-[10px] sm:text-xs lg:text-sm text-amber-700 dark:text-amber-300">Pendientes</CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-amber-900 dark:text-amber-100">{stats.pending}</CardTitle>
              </div>
              <Clock className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-amber-500/30" />
            </div>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardHeader className="p-3 sm:p-4 lg:p-6 pb-2 sm:pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-[10px] sm:text-xs lg:text-sm text-emerald-700 dark:text-emerald-300">Completadas</CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl text-emerald-900 dark:text-emerald-100">{stats.completed}</CardTitle>
              </div>
              <CalendarCheck className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-emerald-500/30" />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
});

// ==================== SEARCH & FILTERS ====================
// OPTIMIZACIÓN: Se eliminó el estado interno (useState, useEffect). Ahora es un componente
// 100% controlado por sus props. Esto simplifica su lógica, elimina re-renders
// innecesarios y hace que su comportamiento sea más predecible.
const SearchAndFilters = memo(function SearchAndFilters({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusChange,
  isLoading,
  inputRef,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | AppointmentStatus;
  onStatusChange: (value: 'all' | AppointmentStatus) => void;
  isLoading: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="mb-6 md:sticky md:top-2 md:z-10">
      <div className="flex flex-col sm:flex-row gap-3 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
          <Input
            ref={inputRef}
            placeholder="Buscar paciente... (atajo: /)"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 bg-transparent"
            disabled={isLoading}
            aria-label="Buscar paciente"
          />
          {!!searchValue && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onSearchChange('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={onStatusChange as (v: string) => void}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              <SelectValue placeholder="Filtrar estado" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

// ==================== APPOINTMENTS GRID ====================
const AppointmentsGrid = memo(function AppointmentsGrid({
  appointments,
  isLoading,
  emptyMessage,
  onAction,
}: {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  emptyMessage: string;
  onAction: (action: AdmissionAction, appointmentId: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (expandedId && !appointments.some((a) => String(a.id) === expandedId)) {
      setExpandedId(null);
    }
  }, [appointments, expandedId]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center py-12">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden />
          <CardTitle className="text-lg font-normal text-gray-600 dark:text-gray-400">{emptyMessage}</CardTitle>
          <CardDescription>Las citas aparecerán aquí cuando estén disponibles.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {appointments.map((appointment) => (
        <LazyMount key={appointment.id}>
          <PatientCard
            appointment={appointment}
            onAction={onAction}
            open={expandedId === String(appointment.id)}
            onOpenChange={(open) => setExpandedId(open ? String(appointment.id) : null)}
          />
        </LazyMount>
      ))}
    </div>
  );
});

// ==================== MAIN COMPONENT ====================
const PatientAdmission = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  const {
    classifiedAppointments: appointments,
    summary,
    stats,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useAppointments({
    search,
    status: statusFilter,
    dateFilter: activeTab,
    includePatient: true,
  });

  const handleAction = useCallback((action: AdmissionAction, appointmentId: string) => {
    // No necesitamos hacer nada aquí - las acciones se manejan en PatientCard
    // Solo invalidamos las queries para refrescar datos
    queryClient.invalidateQueries({ queryKey: queryKeys.appointments.all });
  }, [queryClient]);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      refetch();
    });
    toast.success('Datos actualizados');
  }, [refetch]);
  
  // Usamos un callback para el atajo de teclado, es más directo que pasar la función por props.
  const focusSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useKeyboardShortcuts(focusSearchInput, handleRefresh);

  // Prefetch de datos para otras pestañas - solo cuando es necesario
  useEffect(() => {
    if (!summary || search || statusFilter !== 'all') return; // No prefetch con filtros activos

    const tabsToPrefetch: TabType[] = [];
    if (summary.future_count > 0 && activeTab !== 'future') tabsToPrefetch.push('future');
    if (summary.past_count > 0 && activeTab !== 'past') tabsToPrefetch.push('past');

    if (tabsToPrefetch.length === 0) return;

    const baseFilter = { status: 'all', includePatient: true };

    // Usar requestIdleCallback para prefetch en tiempo idle
    const idleCallback = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
    
    idleCallback(() => {
      tabsToPrefetch.forEach((tab) => {
        const queryParams = buildSearchParams({ ...baseFilter, dateFilter: tab });
        const queryKey = queryKeys.appointments.filtered({ ...baseFilter, dateFilter: tab } as any);
        
        queryClient.prefetchQuery({
          queryKey,
          queryFn: () => queryFetcher(endpoints.appointments.list(queryParams)),
          staleTime: 60_000, // Cache por 60 segundos
        });
      });
    });
  }, [summary, search, statusFilter, activeTab, queryClient]);
  
  // Cambio automático a la primera pestaña con datos si la actual está vacía
  useEffect(() => {
    if (!summary || isLoading) return;
    if (activeTab === 'today' && summary.today_count === 0) {
      if (summary.future_count > 0) setActiveTab('future');
      else if (summary.past_count > 0) setActiveTab('past');
    }
  }, [summary, activeTab, isLoading]);

  // Solo calcular allAppointments cuando sea necesario
  const allAppointments = useMemo(
    () => {
      if (activeTab !== 'all') return [];
      // Combinar arrays sin spread para mejor performance con arrays grandes
      const result = new Array(
        appointments.today.length + 
        appointments.future.length + 
        appointments.past.length
      );
      let index = 0;
      for (const apt of appointments.today) result[index++] = apt;
      for (const apt of appointments.future) result[index++] = apt;
      for (const apt of appointments.past) result[index++] = apt;
      return result;
    },
    [activeTab, appointments]
  );
  
  const currentIsLoading = isLoading || isFetching || isPending;

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <AdmissionHeader
        isRefreshing={currentIsLoading}
        onRefresh={handleRefresh}
        onSuccess={refetch}
        stats={stats}
      />

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            Error al cargar datos.
            <Button size="sm" variant="secondary" onClick={handleRefresh}>Reintentar</Button>
          </AlertDescription>
        </Alert>
      )}

      <SearchAndFilters
        searchValue={search}
        onSearchChange={(value) => startTransition(() => setSearch(value))}
        statusFilter={statusFilter}
        onStatusChange={(value) => startTransition(() => setStatusFilter(value))}
        isLoading={currentIsLoading}
        inputRef={searchInputRef}
      />
      
      {stats.rescheduled > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          <Badge variant="outline" className="mr-2">Reagendadas: {stats.rescheduled}</Badge>
          (No se muestran en estas listas)
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v as TabType))}>
        <TabsList className="w-full sm:w-auto mb-6 overflow-x-auto">
          <TabsTrigger value="today" className="gap-2"><Calendar className="h-4 w-4" />Hoy ({summary?.today_count ?? 0})</TabsTrigger>
          <TabsTrigger value="future" className="gap-2"><CalendarDays className="h-4 w-4" />Próximas ({summary?.future_count ?? 0})</TabsTrigger>
          <TabsTrigger value="past" className="gap-2"><Clock className="h-4 w-4" />Anteriores ({summary?.past_count ?? 0})</TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><Calendar className="h-4 w-4" />Todas ({summary?.total_appointments ?? 0})</TabsTrigger>
        </TabsList>
        
        {/* Usamos un solo componente para mostrar el contenido de las pestañas */}
        <TabsContent value={activeTab} className="mt-0">
          <AppointmentsGrid
            appointments={
              activeTab === 'today' ? appointments.today :
              activeTab === 'future' ? appointments.future :
              activeTab === 'past' ? appointments.past :
              allAppointments
            }
            isLoading={isLoading}
            emptyMessage={
              activeTab === 'today' ? 'No hay citas para hoy' :
              activeTab === 'future' ? 'No hay citas futuras' :
              activeTab === 'past' ? 'No hay citas anteriores' :
              'No se encontraron citas'
            }
            onAction={handleAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default memo(PatientAdmission);

