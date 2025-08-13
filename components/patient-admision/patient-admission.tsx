// components/patient-admission/patient-admission-optimized.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer, memo, FC } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useClinic, Patient } from '@/contexts/clinic-data-provider';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Icons (list cleaned and verified)
import { 
  RefreshCw, Clock, Calendar, CalendarClock, CalendarCheck,
  AlertCircle, Plus, Search, Filter, Grid3x3, List, Sparkles,
  TrendingUp, Activity, ChevronDown, XCircle
} from 'lucide-react';

// Types
import type { TabType, AppointmentWithPatient, AdmissionAction } from './admision-types';

// ==================== LAZY LOADED COMPONENTS ====================
const PatientCard = dynamic(() => import('./patient-card'), { 
  ssr: false,
  loading: () => <CardSkeleton />
});

const PatientModal = dynamic(() => import('./patient-modal').then(m => ({ default: m.PatientModal })), {
  ssr: false
});

// ==================== SKELETON & LOADING COMPONENTS ====================
const CardSkeleton = () => (
  <div className="p-4 space-y-3 border rounded-lg">
    <div className="flex items-center gap-3">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-8 w-full" />
  </div>
);

const LoadingGrid = ({ count = 4 }) => (
  <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
    {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
  </div>
);

// ==================== TABS CONFIGURATION ====================
const TABS_CONFIG = [
  { key: 'today', label: 'Hoy', icon: Calendar, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-500/10' },
  { key: 'future', label: 'Próximas', icon: CalendarClock, color: 'from-emerald-500 to-emerald-600', bgColor: 'bg-emerald-500/10' },
  { key: 'past', label: 'Historial', icon: Clock, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-500/10' }
] as const;

// ==================== FILTER STATE REDUCER ====================
type FilterState = {
  search: string;
  status: string | null;
  viewMode: 'grid' | 'list';
};

type FilterAction = 
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'SET_STATUS'; payload: string | null }
  | { type: 'SET_VIEW_MODE'; payload: 'grid' | 'list' };

const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case 'SET_SEARCH': return { ...state, search: action.payload };
    case 'SET_STATUS': return { ...state, status: action.payload };
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.payload };
    default: return state;
  }
};

// ==================== MEMOIZED UI COMPONENTS ====================

const AdmissionHeader = memo<{
  isRefreshing: boolean;
  onRefresh: () => void;
  onSuccess: () => void;
  stats?: { total: number; today: number; pending: number };
}>(({ isRefreshing, onRefresh, onSuccess, stats }) => (
  <Card className="relative mb-6 overflow-hidden border-0 shadow-lg bg-card">
    <CardHeader className="relative pb-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg">
            <CalendarCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Admisión de Pacientes</CardTitle>
            <p className="text-sm text-muted-foreground">Gestión de citas y pacientes.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PatientModal
            trigger={
              <Button className="gap-2 transition-all rounded-xl shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Paciente</span>
              </Button>
            }
            onSuccess={onSuccess}
          />
          <Button variant="outline" onClick={onRefresh} disabled={isRefreshing} className="gap-2 transition-all rounded-xl hover:shadow-md">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>
    </CardHeader>
  </Card>
));
AdmissionHeader.displayName = 'AdmissionHeader';

const TabNavigation = memo<{
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  counts: Record<TabType, number>;
  isLoading: boolean;
}>(({ activeTab, onTabChange, counts, isLoading }) => (
  <div className="flex flex-wrap gap-2 p-1 bg-muted/30 rounded-xl">
    {TABS_CONFIG.map((tab) => {
      const isActive = activeTab === tab.key;
      const count = counts[tab.key] || 0;
      const Icon = tab.icon;
      return (
        <Button
          key={tab.key}
          variant={isActive ? "default" : "ghost"}
          className={cn(
            "relative flex-1 min-w-[100px] h-auto py-2 px-3 flex items-center justify-center gap-2 transition-all duration-300 rounded-lg",
            isActive && `shadow-lg scale-[1.02] bg-gradient-to-r ${tab.color}`
          )}
          onClick={() => onTabChange(tab.key)}
          disabled={isLoading}
        >
          <Icon className={cn("h-5 w-5", isActive && "text-white")} />
          <span className={cn("font-medium text-sm", isActive && "text-white")}>{tab.label}</span>
          {count > 0 && (
            <Badge variant={isActive ? "secondary" : "default"} className="h-5 px-1.5 text-xs">{count}</Badge>
          )}
        </Button>
      );
    })}
  </div>
));
TabNavigation.displayName = 'TabNavigation';

const SearchAndFilters = memo<{
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  isLoading: boolean;
}>(({ filters, dispatch, isLoading }) => {
  const [searchValue, setSearchValue] = useState(filters.search);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH', payload: searchValue });
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchValue, dispatch]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar paciente..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-10 pr-4 h-10 rounded-xl"
          disabled={isLoading}
        />
        {searchValue && (
          <Button variant="ghost" size="icon" onClick={() => setSearchValue('')} className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
            <XCircle className="w-4 h-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 rounded-xl">
              <Filter className="h-4 w-4" /> Filtros
              {filters.status && <Badge variant="secondary" className="ml-1">1</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {['Todos', 'PROGRAMADA', 'CONFIRMADA', 'PRESENTE', 'COMPLETADA', 'CANCELADA', 'REAGENDADA', 'NO_ASISTIO'].map(status => (
              <DropdownMenuItem key={status} onSelect={() => dispatch({ type: 'SET_STATUS', payload: status === 'Todos' ? null : status })}>
                {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl">
          <Button variant={filters.viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'grid' })} className="h-8 w-8 rounded-lg">
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button variant={filters.viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => dispatch({ type: 'SET_VIEW_MODE', payload: 'list' })} className="h-8 w-8 rounded-lg">
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});
SearchAndFilters.displayName = 'SearchAndFilters';

const AppointmentsSection = memo<{
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  emptyMessage: string;
  onAction: (action: AdmissionAction, appointmentId: string) => void;
  viewMode: 'grid' | 'list';
}>(({ appointments, isLoading, emptyMessage, onAction, viewMode }) => {
  if (isLoading) return <LoadingGrid />;
  if (!appointments.length) {
    return (
      <div className="py-16 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="text-lg font-medium">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground">Las nuevas citas aparecerán aquí.</p>
      </div>
    );
  }
  return (
    <div className={cn(viewMode === 'grid' ? "grid gap-4 sm:grid-cols-1 lg:grid-cols-2" : "space-y-3")}>
      {appointments.map((appointment) => (
        <PatientCard key={appointment.id} appointment={appointment} onAction={onAction} />
      ))}
    </div>
  );
});
AppointmentsSection.displayName = 'AppointmentsSection';

// ==================== CUSTOM DATA HOOK ====================
const useAppointmentData = (filters: FilterState) => {
  const { allAppointments, allPatients, isLoading, refetch, error } = useClinic();

  const classifiedAppointments = useMemo(() => {
    const result: { today: AppointmentWithPatient[], future: AppointmentWithPatient[], past: AppointmentWithPatient[] } = { today: [], future: [], past: [] };
    if (!allAppointments || !allPatients) return result;

    // OPTIMIZATION: Create a patient map for O(1) lookup instead of O(N) .find()
    const patientMap = new Map<string, Patient>(allPatients.map(p => [p.id, p]));
    const searchLower = filters.search.toLowerCase();

    for (const apt of allAppointments) {
      const patient = patientMap.get(apt.patient_id);
      if (!patient) continue;

      // Apply search and status filters
      if (filters.status && apt.estado_cita !== filters.status) continue;
      if (filters.search && !(
          patient.nombre?.toLowerCase().includes(searchLower) ||
          patient.apellidos?.toLowerCase().includes(searchLower) ||
          patient.telefono?.includes(filters.search) ||
          patient.email?.toLowerCase().includes(searchLower)
      )) continue;
      
      const fullAppointment = { ...apt, patients: patient } as AppointmentWithPatient;
      const aptDate = new Date(apt.fecha_hora_cita);
      const now = new Date();

      // Normalize dates to handle timezone correctly
      const aptDateNormalized = new Date(aptDate.getFullYear(), aptDate.getMonth(), aptDate.getDate(), aptDate.getHours(), aptDate.getMinutes());
      const nowNormalized = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

      if (aptDateNormalized >= startOfDay(nowNormalized) && aptDateNormalized <= endOfDay(nowNormalized)) {
        result.today.push(fullAppointment);
      } else if (aptDateNormalized > endOfDay(nowNormalized)) {
        result.future.push(fullAppointment);
      } else {
        result.past.push(fullAppointment);
      }
    }

    // Sort results using normalized dates to handle timezone correctly
    result.today.sort((a, b) => {
      const dateA = new Date(a.fecha_hora_cita);
      const dateB = new Date(b.fecha_hora_cita);
      const normalizedA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), dateA.getHours(), dateA.getMinutes());
      const normalizedB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), dateB.getHours(), dateB.getMinutes());
      return normalizedA.getTime() - normalizedB.getTime();
    });
    result.future.sort((a, b) => {
      const dateA = new Date(a.fecha_hora_cita);
      const dateB = new Date(b.fecha_hora_cita);
      const normalizedA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), dateA.getHours(), dateA.getMinutes());
      const normalizedB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), dateB.getHours(), dateB.getMinutes());
      return normalizedA.getTime() - normalizedB.getTime();
    });
    result.past.sort((a, b) => {
      const dateA = new Date(a.fecha_hora_cita);
      const dateB = new Date(b.fecha_hora_cita);
      const normalizedA = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate(), dateA.getHours(), dateA.getMinutes());
      const normalizedB = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate(), dateB.getHours(), dateB.getMinutes());
      return normalizedB.getTime() - normalizedA.getTime();
    });

    return result;
  }, [allAppointments, allPatients, filters]);

  return { appointments: classifiedAppointments, isLoading, error, refetch };
};

// ==================== MAIN COMPONENT ====================
const PatientAdmission: FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [filters, dispatch] = useReducer(filterReducer, { search: '', status: null, viewMode: 'grid' });

  const { appointments, isLoading, error, refetch } = useAppointmentData(filters);

  const handleAppointmentAction = useCallback(async (action: AdmissionAction, appointmentId: string) => {
    // La mutación ya fue realizada en `PatientCard`. Aquí solo refrescamos datos y notificamos.
    toast.success('Acción aplicada correctamente.');
    refetch();
  }, [refetch]);

  const handleRefreshAndToast = useCallback(() => {
    refetch();
    toast.success('Datos actualizados', { description: 'Se ha recargado la lista de citas.' });
  }, [refetch]);

  const counts = useMemo(() => ({
    today: appointments.today.length,
    future: appointments.future.length,
    past: appointments.past.length,
  }), [appointments]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 space-y-4">
      <AdmissionHeader isRefreshing={isLoading} onRefresh={handleRefreshAndToast} onSuccess={refetch} />
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error al cargar datos: {error.message}</AlertDescription>
        </Alert>
      )}
      
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} counts={counts} isLoading={isLoading} />
      <SearchAndFilters filters={filters} dispatch={dispatch} isLoading={isLoading} />
      
      <div className="min-h-[400px]">
        <AppointmentsSection
          appointments={appointments[activeTab]}
          isLoading={isLoading}
          emptyMessage={`No hay citas para ${activeTab === 'today' ? 'hoy' : activeTab === 'future' ? 'próximas' : 'el historial'}`}
          onAction={handleAppointmentAction}
          viewMode={filters.viewMode}
        />
      </div>
    </div>
  );
};

export default memo(PatientAdmission);
