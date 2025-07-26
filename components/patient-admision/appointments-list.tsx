// components/patient-admision/appointments-list.tsx
import React, { memo, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  CalendarClock,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Loader2,
  TrendingUp,
  AlertCircle,
  Clock,
  User,
  Calendar,
} from 'lucide-react';
import { format, isToday, isFuture, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  AppointmentWithPatient, 
  AdmissionAction, 
  TabType,
  AppointmentStatus,
  getPatientFullName,
  needsUrgentAttention
} from './admision-types';

// ✅ Componente corregido
import PatientCard from './patient-card';

// ==================== INTERFACES ====================
interface AppointmentsListProps {
  appointments: AppointmentWithPatient[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onAppointmentAction?: (action: AdmissionAction, appointmentId: string) => void;
  emptyMessage?: string;
  showFilters?: boolean;
  tabType?: TabType;
  className?: string;
}

interface FilterState {
  search: string;
  status: AppointmentStatus | 'ALL';
  sortBy: 'date' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  showUrgentOnly: boolean;
}

// ==================== CONFIGURACIÓN ====================
const FILTER_DEFAULTS: FilterState = {
  search: '',
  status: 'ALL',
  sortBy: 'date',
  sortOrder: 'asc',
  showUrgentOnly: false,
};

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'PROGRAMADA', label: 'Programadas' },
  { value: 'CONFIRMADA', label: 'Confirmadas' },
  { value: 'PRESENTE', label: 'Presentes' },
  { value: 'EN_CONSULTA', label: 'En Consulta' },
  { value: 'COMPLETADA', label: 'Completadas' },
  { value: 'CANCELADA', label: 'Canceladas' },
  { value: 'NO_ASISTIO', label: 'No Asistieron' },
  { value: 'REAGENDADA', label: 'Reagendadas' },
] as const;

const SORT_OPTIONS = [
  { value: 'date', label: 'Fecha y hora' },
  { value: 'name', label: 'Nombre del paciente' },
  { value: 'status', label: 'Estado de la cita' },
] as const;

// ==================== UTILIDADES ====================
const formatAppointmentDateTime = (dateTime: string): { date: string; time: string; isToday: boolean } => {
  try {
    const date = new Date(dateTime);
    return {
      date: format(date, "dd MMM", { locale: es }),
      time: format(date, 'HH:mm'),
      isToday: isToday(date),
    };
  } catch {
    return { date: 'Fecha inválida', time: '--:--', isToday: false };
  }
};

// ==================== COMPONENTES INTERNOS ====================

// ✅ Skeleton de carga
const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <Card key={i} className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center space-x-3">
            <div className="rounded-full bg-gray-200 dark:bg-gray-700 h-12 w-12"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    ))}
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// ✅ Estado vacío
const EmptyState = memo<{ message: string; tabType?: TabType }>(({ message, tabType }) => {
  const getEmptyIcon = () => {
    switch (tabType) {
      case 'today':
        return <Calendar className="h-12 w-12 text-gray-400" />;
      case 'future':
        return <CalendarClock className="h-12 w-12 text-gray-400" />;
      case 'past':
        return <Clock className="h-12 w-12 text-gray-400" />;
      default:
        return <CalendarClock className="h-12 w-12 text-gray-400" />;
    }
  };

  const getEmptyDescription = () => {
    switch (tabType) {
      case 'today':
        return 'Las citas de hoy aparecerán aquí una vez que sean programadas.';
      case 'future':
        return 'Las próximas citas aparecerán aquí conforme se programen.';
      case 'past':
        return 'El historial de citas pasadas aparecerá aquí.';
      default:
        return 'Las citas aparecerán aquí una vez que sean programadas.';
    }
  };

  return (
    <Card className="p-8">
      <div className="text-center">
        {getEmptyIcon()}
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">
          {message}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {getEmptyDescription()}
        </p>
      </div>
    </Card>
  );
});
EmptyState.displayName = "EmptyState";

// ✅ Barra de filtros
const FilterBar = memo<{
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  totalCount: number;
  filteredCount: number;
}>(({ filters, onFiltersChange, totalCount, filteredCount }) => {
  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, search: value });
  }, [filters, onFiltersChange]);

  const handleStatusChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, status: value as AppointmentStatus | 'ALL' });
  }, [filters, onFiltersChange]);

  const handleSortChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, sortBy: value as FilterState['sortBy'] });
  }, [filters, onFiltersChange]);

  const toggleSortOrder = useCallback(() => {
    onFiltersChange({ 
      ...filters, 
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
    });
  }, [filters, onFiltersChange]);

  const toggleUrgentOnly = useCallback(() => {
    onFiltersChange({ ...filters, showUrgentOnly: !filters.showUrgentOnly });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    onFiltersChange(FILTER_DEFAULTS);
  }, [onFiltersChange]);

  const hasActiveFilters = filters.search || filters.status !== 'ALL' || filters.showUrgentOnly;

  return (
    <Card className="p-4 mb-4">
      <div className="space-y-4">
        {/* Primera fila: Búsqueda y filtros principales */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre de paciente..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por estado */}
          <Select value={filters.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ordenamiento */}
          <div className="flex gap-2">
            <Select value={filters.sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              title={`Ordenar ${filters.sortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
            >
              {filters.sortOrder === 'asc' ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Segunda fila: Filtros adicionales y estadísticas */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle para urgentes */}
            <Button
              variant={filters.showUrgentOnly ? 'default' : 'outline'}
              size="sm"
              onClick={toggleUrgentOnly}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Solo urgentes
            </Button>

            {/* Limpiar filtros */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                Limpiar filtros
              </Button>
            )}
          </div>

          {/* Contador de resultados */}
          <div className="text-sm text-muted-foreground">
            {filteredCount === totalCount ? (
              `${totalCount} cita${totalCount !== 1 ? 's' : ''}`
            ) : (
              `${filteredCount} de ${totalCount} cita${totalCount !== 1 ? 's' : ''}`
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});
FilterBar.displayName = "FilterBar";

// ✅ Resumen de citas urgentes
const UrgentSummary = memo<{ urgentAppointments: AppointmentWithPatient[] }>(({ urgentAppointments }) => {
  if (urgentAppointments.length === 0) return null;

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription className="text-orange-800 dark:text-orange-200">
        <strong>{urgentAppointments.length} cita{urgentAppointments.length !== 1 ? 's' : ''}</strong> 
        {' '}necesita{urgentAppointments.length === 1 ? '' : 'n'} atención urgente.
      </AlertDescription>
    </Alert>
  );
});
UrgentSummary.displayName = "UrgentSummary";

// ==================== COMPONENTE PRINCIPAL ====================
const AppointmentsList = memo<AppointmentsListProps>(({
  appointments,
  isLoading,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  onAppointmentAction,
  emptyMessage = "No hay citas disponibles",
  showFilters = true,
  tabType,
  className,
}) => {
  // ✅ ESTADO LOCAL PARA FILTROS
  const [filters, setFilters] = React.useState<FilterState>(FILTER_DEFAULTS);

  // ✅ CITAS FILTRADAS Y ORDENADAS
  const { filteredAppointments, urgentAppointments } = useMemo(() => {
    let filtered = [...appointments];

    // Filtro por búsqueda
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(apt => {
        const patientName = getPatientFullName(apt.patients).toLowerCase();
        const motivo = apt.motivo_cita.toLowerCase();
        return patientName.includes(searchTerm) || motivo.includes(searchTerm);
      });
    }

    // Filtro por estado
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(apt => apt.estado_cita === filters.status);
    }

    // Identificar citas urgentes
    const urgent = filtered.filter(apt => {
      const urgentInfo = needsUrgentAttention(apt);
      return urgentInfo.urgent;
    });

    // Filtro solo urgentes
    if (filters.showUrgentOnly) {
      filtered = urgent;
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime();
          break;
        case 'name':
          const nameA = getPatientFullName(a.patients);
          const nameB = getPatientFullName(b.patients);
          comparison = nameA.localeCompare(nameB);
          break;
        case 'status':
          comparison = a.estado_cita.localeCompare(b.estado_cita);
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    return { filteredAppointments: filtered, urgentAppointments: urgent };
  }, [appointments, filters]);

  // ✅ HANDLERS
  const handleFiltersChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
  }, []);

  const handleAppointmentAction = useCallback((action: AdmissionAction, appointmentId: string) => {
    onAppointmentAction?.(action, appointmentId);
  }, [onAppointmentAction]);

  // ✅ RENDERIZADO
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (appointments.length === 0) {
    return <EmptyState message={emptyMessage} tabType={tabType} />;
  }

  return (
    <div className={className}>
      {/* Filtros */}
      {showFilters && (
        <FilterBar
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalCount={appointments.length}
          filteredCount={filteredAppointments.length}
        />
      )}

      {/* Resumen de urgentes */}
      <UrgentSummary urgentAppointments={urgentAppointments} />

      {/* Lista de citas */}
      {filteredAppointments.length === 0 ? (
        <EmptyState 
          message="No se encontraron citas con los filtros aplicados" 
          tabType={tabType} 
        />
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => (
            <PatientCard
              key={appointment.id}
              appointment={appointment}
              onAction={handleAppointmentAction}
            />
          ))}
          
          {/* Botón para cargar más */}
          {hasMore && onLoadMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Cargar más citas ({appointments.length - filteredAppointments.length} restantes)
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

AppointmentsList.displayName = "AppointmentsList";

export default AppointmentsList;