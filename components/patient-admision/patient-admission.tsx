// components/patient-admission/patient-admission-optimized.tsx
'use client';
import React, { useState, useCallback, useMemo, memo } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useClinic } from '@/contexts/clinic-data-provider';
import type { Patient } from '@/lib/types';

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
} from "@/components/ui/select";

// Icons
import { 
  RefreshCw, Calendar, CalendarDays, CalendarCheck,
  AlertCircle, Plus, Search, SlidersHorizontal,
  User2, Activity, Clock, TrendingUp,
  Stethoscope, X
} from 'lucide-react';

// Types
import type { TabType, AppointmentWithPatient, AdmissionAction } from './admision-types';

// Lazy loaded components
const PatientCard = dynamic(() => import('./patient-card'), { 
  ssr: false,
  loading: () => <CardSkeleton />
});

const PatientModal = dynamic(() => import('./patient-modal').then(m => ({ default: m.PatientModal })), {
  ssr: false
});

// ==================== SKELETON ====================
const CardSkeleton = () => (
  <div className="animate-pulse">
    <Card className="border-l-4 border-gray-200">
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
);

// ==================== HEADER COMPONENT ====================
const AdmissionHeader = memo<{
  isRefreshing: boolean;
  onRefresh: () => void;
  onSuccess: () => void;
  stats: { today: number; pending: number; completed: number };
}>(({ isRefreshing, onRefresh, onSuccess, stats }) => (
  <div className="space-y-6 mb-8">
    {/* Header Principal */}
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
            <Stethoscope className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          Admisión de Pacientes
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Clínica Hernia y Vesícula - Dr. Luis Ángel Medina
        </p>
      </div>
      
      <div className="flex items-center gap-3">
        <PatientModal
          trigger={
            <Button className="gap-2 bg-sky-600 hover:bg-sky-700 text-white shadow-md">
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
          className="shadow-sm"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>
    </div>

    {/* Stats Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="border-0 shadow-sm bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-950/30 dark:to-sky-900/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-sky-700 dark:text-sky-300">
                Citas Hoy
              </CardDescription>
              <CardTitle className="text-2xl text-sky-900 dark:text-sky-100">
                {stats.today}
              </CardTitle>
            </div>
            <Calendar className="h-8 w-8 text-sky-500/30" />
          </div>
        </CardHeader>
      </Card>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Pendientes
              </CardDescription>
              <CardTitle className="text-2xl text-amber-900 dark:text-amber-100">
                {stats.pending}
              </CardTitle>
            </div>
            <Clock className="h-8 w-8 text-amber-500/30" />
          </div>
        </CardHeader>
      </Card>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardDescription className="text-emerald-700 dark:text-emerald-300">
                Completadas
              </CardDescription>
              <CardTitle className="text-2xl text-emerald-900 dark:text-emerald-100">
                {stats.completed}
              </CardTitle>
            </div>
            <CalendarCheck className="h-8 w-8 text-emerald-500/30" />
          </div>
        </CardHeader>
      </Card>
    </div>
  </div>
));
AdmissionHeader.displayName = 'AdmissionHeader';

// ==================== SEARCH & FILTERS ====================
const SearchAndFilters = memo<{
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  isLoading: boolean;
}>(({ search, onSearchChange, statusFilter, onStatusChange, isLoading }) => {
  const [localSearch, setLocalSearch] = useState(search);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar paciente..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 pr-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          disabled={isLoading}
        />
        {localSearch && (
          <button
            onClick={() => setLocalSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            <SelectValue placeholder="Filtrar estado" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="PROGRAMADA">Programadas</SelectItem>
          <SelectItem value="CONFIRMADA">Confirmadas</SelectItem>
          <SelectItem value="PRESENTE">En Consulta</SelectItem>
          <SelectItem value="COMPLETADA">Completadas</SelectItem>
          <SelectItem value="CANCELADA">Canceladas</SelectItem>
          <SelectItem value="NO_ASISTIO">No Asistió</SelectItem>
        </SelectContent>
      </Select>
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
}>(({ appointments, isLoading, emptyMessage, onAction }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (!appointments.length) {
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center py-12">
          <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <CardTitle className="text-lg font-normal text-gray-600 dark:text-gray-400">
            {emptyMessage}
          </CardTitle>
          <CardDescription>
            Las citas aparecerán aquí cuando estén disponibles
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {appointments.map((appointment) => (
        <PatientCard 
          key={appointment.id} 
          appointment={appointment} 
          onAction={onAction} 
        />
      ))}
    </div>
  );
});
AppointmentsGrid.displayName = 'AppointmentsGrid';

// ==================== CUSTOM HOOK ====================
const useAppointmentData = (search: string, statusFilter: string) => {
  const { allAppointments, allPatients, isLoading, refetch, error } = useClinic();

  const classifiedAppointments = useMemo(() => {
    const result = { today: [], future: [], past: [] } as Record<TabType, AppointmentWithPatient[]>;
    
    if (!allAppointments || !allPatients) return result;

    const patientMap = new Map(allPatients.map(p => [p.id, p]));
    const searchLower = search.toLowerCase();
    const now = new Date();

    for (const apt of allAppointments) {
      const patient = patientMap.get(apt.patient_id);
      if (!patient) continue;

      // Apply filters
      if (statusFilter !== 'all' && apt.estado_cita !== statusFilter) continue;
      if (search && !(
        patient.nombre?.toLowerCase().includes(searchLower) ||
        patient.apellidos?.toLowerCase().includes(searchLower) ||
        patient.telefono?.includes(search)
      )) continue;

      const fullAppointment = { ...apt, patients: patient } as AppointmentWithPatient;
      const aptDate = new Date(apt.fecha_hora_cita);

      // Hide rescheduled appointments from main tabs (only visible in history)
      if (apt.estado_cita === 'REAGENDADA') {
        continue;
      }

      // Classify by time
      if (aptDate >= startOfDay(now) && aptDate <= endOfDay(now)) {
        result.today.push(fullAppointment);
      } else if (aptDate > endOfDay(now)) {
        result.future.push(fullAppointment);
      } else {
        result.past.push(fullAppointment);
      }
    }

    // Sort
    result.today.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    result.future.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    result.past.sort((a, b) => new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime());

    return result;
  }, [allAppointments, allPatients, search, statusFilter]);

  const stats = useMemo(() => ({
    today: classifiedAppointments.today.length,
    pending: classifiedAppointments.today.filter(a => 
      ['PROGRAMADA', 'CONFIRMADA'].includes(a.estado_cita)
    ).length,
    completed: classifiedAppointments.today.filter(a => 
      a.estado_cita === 'COMPLETADA'
    ).length,
  }), [classifiedAppointments]);

  return { appointments: classifiedAppointments, stats, isLoading, error, refetch };
};

// ==================== MAIN COMPONENT ====================
const PatientAdmission = () => {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { appointments, stats, isLoading, error, refetch } = useAppointmentData(search, statusFilter);

  const handleAction = useCallback(async (action: AdmissionAction, appointmentId: string) => {
    toast.success('Acción completada correctamente');
    refetch();
  }, [refetch]);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Datos actualizados');
  }, [refetch]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <AdmissionHeader 
        isRefreshing={isLoading} 
        onRefresh={handleRefresh} 
        onSuccess={refetch}
        stats={stats}
      />
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error al cargar los datos. Por favor, intente nuevamente.
          </AlertDescription>
        </Alert>
      )}
      
      <SearchAndFilters
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        isLoading={isLoading}
      />
      
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
        <TabsList className="w-full sm:w-auto mb-6">
          <TabsTrigger value="today" className="flex-1 sm:flex-initial gap-2">
            <Calendar className="h-4 w-4" />
            Hoy ({appointments.today.length})
          </TabsTrigger>
          <TabsTrigger value="future" className="flex-1 sm:flex-initial gap-2">
            <CalendarDays className="h-4 w-4" />
            Próximas ({appointments.future.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex-1 sm:flex-initial gap-2">
            <Clock className="h-4 w-4" />
            Anteriores ({appointments.past.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-0">
          <AppointmentsGrid
            appointments={appointments.today}
            isLoading={isLoading}
            emptyMessage="No hay citas programadas para hoy"
            onAction={handleAction}
          />
        </TabsContent>

        <TabsContent value="future" className="mt-0">
          <AppointmentsGrid
            appointments={appointments.future}
            isLoading={isLoading}
            emptyMessage="No hay citas futuras programadas"
            onAction={handleAction}
          />
        </TabsContent>

        <TabsContent value="past" className="mt-0">
          <AppointmentsGrid
            appointments={appointments.past}
            isLoading={isLoading}
            emptyMessage="No hay citas anteriores registradas"
            onAction={handleAction}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default memo(PatientAdmission);