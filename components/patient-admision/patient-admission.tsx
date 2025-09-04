// components/patient-admission/patient-admission-optimized.tsx
'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  memo,
  useEffect,
  useRef,
  useDeferredValue,
  startTransition,
} from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Utils & types
import { cn } from '@/lib/utils';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentStatus } from '@/lib/types';
import { useAdmissionAppointments } from '@/hooks/use-admission-appointments';
import type { TabType, AppointmentWithPatient, AdmissionAction } from './admision-types';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Icons (solo los usados)
import { RefreshCw, Calendar, CalendarDays, CalendarCheck, AlertCircle, Plus, Search, SlidersHorizontal, Clock, Stethoscope, X } from 'lucide-react';

// ==================== CONSTANTS ====================
const SKELETON_COUNT = 6;

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

// ==================== LAZY MOUNT (windowing ligero) ====================
const LazyMount: React.FC<{ children: React.ReactNode; rootMargin?: string }> = ({ children, rootMargin = '300px' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current || visible) return;
    const el = ref.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [visible, rootMargin]);

  return <div ref={ref}>{visible ? children : <CardSkeleton />}</div>;
};

// ==================== LAZY loaded components ====================
const PatientCard = dynamic(() => import('./patient-card'), {
  ssr: false,
  loading: () => <CardSkeleton />,
});

const PatientModal = dynamic(
  () => import('./patient-modal').then((m) => ({ default: m.PatientModal })),
  { ssr: false }
);

// ==================== ACCESOS DIRECTOS ====================
const useKeyboardShortcuts = ({ focusSearch, onRefresh }: { focusSearch: () => void; onRefresh: () => void }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        focusSearch();
      }
      if ((e.key === 'r' || e.key === 'R') && (e.metaKey || e.ctrlKey)) {
        // No interferir con refresh del navegador
        return;
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onRefresh();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusSearch, onRefresh]);
};

// ==================== HEADER COMPONENT ====================
const AdmissionHeader = memo<{
  isRefreshing: boolean;
  onRefresh: () => void;
  onSuccess: () => void;
  stats: { today: number; pending: number; completed: number };
}>(function AdmissionHeader({ isRefreshing, onRefresh, onSuccess, stats }) {
  return (
    <div className="space-y-6 mb-8">
      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <span className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
              <Stethoscope className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </span>
            Admisión de Pacientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Clínica Hernia y Vesícula - Dr. Luis Ángel Medina</p>
        </div>

        <div className="flex items-center gap-3">
          <PatientModal
            trigger={
              <Button className="gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-md" aria-label="Crear nuevo paciente">
                <Plus className="h-4 w-4" />
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
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin motion-reduce:animate-none')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-sky-700 dark:text-sky-300">Citas Hoy</CardDescription>
                <CardTitle className="text-2xl text-sky-900 dark:text-sky-100">{stats.today}</CardTitle>
              </div>
              <Calendar className="h-8 w-8 text-sky-500/30" />
            </div>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-amber-700 dark:text-amber-300">Pendientes</CardDescription>
                <CardTitle className="text-2xl text-amber-900 dark:text-amber-100">{stats.pending}</CardTitle>
              </div>
              <Clock className="h-8 w-8 text-amber-500/30" />
            </div>
          </CardHeader>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardDescription className="text-emerald-700 dark:text-emerald-300">Completadas</CardDescription>
                <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">{stats.completed}</CardTitle>
              </div>
              <CalendarCheck className="h-8 w-8 text-emerald-500/30" />
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
});
AdmissionHeader.displayName = 'AdmissionHeader';

// ==================== SEARCH & FILTERS ====================
const SearchAndFilters = memo<{
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | AppointmentStatus;
  onStatusChange: (value: 'all' | AppointmentStatus) => void;
  isLoading: boolean;
  onFocusRequest?: (fn: () => void) => void; // Para atajos de teclado
}>(({ search, onSearchChange, statusFilter, onStatusChange, isLoading, onFocusRequest }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localSearch, setLocalSearch] = useState(search);
  const deferredSearch = useDeferredValue(localSearch);

  useEffect(() => {
    onSearchChange(deferredSearch);
  }, [deferredSearch, onSearchChange]);

  useEffect(() => {
    onFocusRequest?.(() => inputRef.current?.focus());
  }, [onFocusRequest]);

  const clear = useCallback(() => setLocalSearch(''), []);

  return (
    <div className="mb-6 md:sticky md:top-2 md:z-10">
      <div className="flex flex-col sm:flex-row gap-3 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 p-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden />
          <Input
            ref={inputRef}
            placeholder="Buscar paciente… (/ para enfocar)"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-10 pr-10 bg-transparent"
            disabled={isLoading}
            aria-label="Buscar paciente"
          />
          {localSearch && (
            <button
              onClick={clear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => startTransition(() => onStatusChange(v as 'all' | AppointmentStatus))}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              <SelectValue placeholder="Filtrar estado" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value={AppointmentStatusEnum.PROGRAMADA}>Programadas</SelectItem>
            <SelectItem value={AppointmentStatusEnum.CONFIRMADA}>Confirmadas</SelectItem>
            <SelectItem value={AppointmentStatusEnum.PRESENTE}>En Consulta</SelectItem>
            <SelectItem value={AppointmentStatusEnum.COMPLETADA}>Completadas</SelectItem>
            <SelectItem value={AppointmentStatusEnum.CANCELADA}>Canceladas</SelectItem>
            <SelectItem value={AppointmentStatusEnum.NO_ASISTIO}>No Asistió</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});
SearchAndFilters.displayName = 'SearchAndFilters';

// ==================== APPOINTMENTS GRID ====================
const AppointmentsGrid = memo<{
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  emptyMessage: string;
  onAction: (action: AdmissionAction, appointmentId: string) => void;
}>(function AppointmentsGrid({ appointments, isLoading, emptyMessage, onAction }) {
  const [expandedId, setExpandedId] = useState<string | null>(null); // una sola card expandida

  useEffect(() => {
    // Si desaparece la cita expandida tras un refetch/filtrado, cerramos estado
    if (expandedId && !appointments.some((a) => String(a.id) === expandedId)) {
      setExpandedId(null);
    }
  }, [appointments, expandedId]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center py-12">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" aria-hidden />
          <CardTitle className="text-lg font-normal text-gray-600 dark:text-gray-400">{emptyMessage}</CardTitle>
          <CardDescription>Las citas aparecerán aquí cuando estén disponibles</CardDescription>
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
            onOpenChange={(open: boolean) => setExpandedId(open ? String(appointment.id) : null)}
          />
        </LazyMount>
      ))}
    </div>
  );
});
AppointmentsGrid.displayName = 'AppointmentsGrid';

// ==================== MAIN COMPONENT ====================
const PatientAdmission = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const focusSearchRef = useRef<() => void>(() => {});

  const { appointments, stats, isLoading, error, refetch, rescheduledCount } = useAdmissionAppointments({
    search,
    status: statusFilter,
  });

  const hasError = Boolean(error);

  const handleAction = useCallback(
    async (action: AdmissionAction, appointmentId: string) => {
      // Aquí puedes envolver en try/catch si la acción es async real
      toast.success('Acción completada correctamente');
      refetch();
    },
    [refetch]
  );

  const handleRefresh = useCallback(() => {
    startTransition(() => refetch());
    toast.success('Datos actualizados');
  }, [refetch]);

  // Atajos: '/' enfoca búsqueda, 'r' refresca
  useKeyboardShortcuts({
    focusSearch: () => focusSearchRef.current?.(),
    onRefresh: handleRefresh,
  });

  // Memorizar contadores de pestañas (evita recomputar en cada render)
  const todayCount = appointments.today.length;
  const futureCount = appointments.future.length;
  const pastCount = appointments.past.length;

  return (
    <div className={cn('container mx-auto px-4 py-6 max-w-7xl', isLoading && 'aria-busy')}>
      <AdmissionHeader isRefreshing={isLoading} onRefresh={handleRefresh} onSuccess={refetch} stats={stats} />

      {hasError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Error al cargar los datos. Por favor, intente nuevamente.</span>
            <Button size="sm" variant="secondary" onClick={handleRefresh}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <SearchAndFilters
        search={search}
        onSearchChange={(v) => startTransition(() => setSearch(v))}
        statusFilter={statusFilter}
        onStatusChange={(v) => startTransition(() => setStatusFilter(v))}
        isLoading={isLoading}
        onFocusRequest={(fn) => (focusSearchRef.current = fn)}
      />

      {rescheduledCount > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-amber-300 text-amber-800 bg-amber-50 dark:border-amber-800 dark:text-amber-200 dark:bg-amber-900/30"
          >
            Reagendadas: {rescheduledCount}
          </Badge>
          <span className="text-xs text-muted-foreground">Se identifican pero no se muestran en la lista</span>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => startTransition(() => setActiveTab(v as TabType))}>
        <TabsList className="w-full sm:w-auto mb-6 overflow-x-auto">
          <TabsTrigger value="today" className="flex-1 sm:flex-initial gap-2" aria-label={`Citas de hoy: ${todayCount}`}>
            <Calendar className="h-4 w-4" aria-hidden />
            Hoy ({todayCount})
          </TabsTrigger>
          <TabsTrigger value="future" className="flex-1 sm:flex-initial gap-2" aria-label={`Citas futuras: ${futureCount}`}>
            <CalendarDays className="h-4 w-4" aria-hidden />
            Próximas ({futureCount})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 sm:flex-initial gap-2" aria-label={`Citas anteriores: ${pastCount}`}>
            <Clock className="h-4 w-4" aria-hidden />
            Anteriores ({pastCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-0">
          <AppointmentsGrid appointments={appointments.today} isLoading={isLoading} emptyMessage="No hay citas programadas para hoy" onAction={handleAction} />
        </TabsContent>

        <TabsContent value="future" className="mt-0">
          <AppointmentsGrid appointments={appointments.future} isLoading={isLoading} emptyMessage="No hay citas futuras programadas" onAction={handleAction} />
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          <AppointmentsGrid appointments={appointments.past} isLoading={isLoading} emptyMessage="No hay citas anteriores registradas" onAction={handleAction} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default memo(PatientAdmission);
