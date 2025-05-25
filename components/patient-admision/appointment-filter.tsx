import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import { format, subDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker, SelectRangeEventHandler } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- Tipos mejorados ---

export const APPOINTMENT_STATUSES = [
  'completada', 'cancelada', 'pendiente', 'presente', 'reprogramada', 'no_asistio'
] as const;
export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

export const APPOINTMENT_SORT_KEYS = ['fechaConsulta', 'horaConsulta', 'nombre', 'motivoConsulta'] as const;
export type AppointmentSortKey = typeof APPOINTMENT_SORT_KEYS[number];

export type SortOrder = "asc" | "desc";

// Define el tipo DateRange para nuestro uso
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface Appointment {
  id: string;
  nombre: string;
  apellidos: string;
  fechaConsulta: string; // ISO format yyyy-MM-DD
  horaConsulta: string; // Format HH:mm
  motivoConsulta: string;
  estado: AppointmentStatus;
  notas: string;
  duracion?: number;
  costoConsulta?: number;
  seguroMedico?: string;
  telefono?: string;
  email?: string;
}

export interface AppointmentFilters {
  dateRange: DateRange | undefined;
  motiveFilter: string; // "all" o un motivo específico
  statusFilter: AppointmentStatus[];
  searchTerm: string;
  sortBy: AppointmentSortKey;
  sortOrder: SortOrder;
  timeRange: [number, number]; // Añadido para el filtro de rango de horas
  showDatePickerAdvanced?: boolean; // Para controlar la visibilidad del selector de fechas avanzado
}

export interface AdvancedFiltersProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  resetFilters: () => void;
  uniqueMotives: string[];
  onClose: () => void;
  className?: string;
}

export interface FilterSummaryProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  className?: string;
}

// --- Funciones Utilitarias Mejoradas ---

/**
 * Formatea fechas de manera consistente con manejo de errores mejorado.
 */
export const formatDate = (date: Date | string | undefined, formatStr = "dd/MM/yyyy"): string => {
  if (!date) return "Fecha no definida";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValid(dateObj)) return "Fecha inválida";
    return format(dateObj, formatStr, { locale: es });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return "Error de formato";
  }
};

/**
 * Convierte una cadena de hora (HH:MM) a un número decimal de hora con validación mejorada.
 */
export const hourToDecimal = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;

  const timeParts = timeStr.split(':');
  if (timeParts.length !== 2) return 0;

  try {
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return 0;
    }

    return hours + (minutes / 60);
  } catch (error) {
    console.error("Error al convertir hora a decimal:", error);
    return 0;
  }
};

// --- Componentes de UI de Filtros Optimizados ---

/**
 * Componente de Panel de Filtros Avanzados mejorado con animaciones.
 */
export const AdvancedFilters: React.FC<AdvancedFiltersProps> = memo(({
  filters,
  updateFilter,
  resetFilters,
  uniqueMotives,
  onClose,
  className = ""
}) => {
  // Manejo optimizado de cambios de estado
  const handleStatusChange = useCallback((status: AppointmentStatus, checked: boolean) => {
    updateFilter("statusFilter",
      checked
        ? [...filters.statusFilter, status]
        : filters.statusFilter.filter((s) => s !== status)
    );
  }, [filters.statusFilter, updateFilter]);

  return (
    <div
      className={`bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 mb-4 ${className}`}
      style={{
        opacity: 1,
        transform: 'none',
        transition: 'opacity 200ms ease-in-out, transform 200ms ease-in-out'
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Filtros Avanzados</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          aria-label="Cerrar filtros avanzados"
          className="hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dateRangeAdvanced" className="font-medium">Rango de Fechas</Label>
          <div className="relative">
            <Button
              id="dateRangeAdvanced"
              variant="outline"
              className={`w-full justify-start text-left font-normal ${!filters.dateRange?.from ? "text-muted-foreground" : ""} pr-8`}
              onClick={() => {
                updateFilter("showDatePickerAdvanced", !filters.showDatePickerAdvanced);
              }}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange?.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })} - {format(filters.dateRange.to, "dd/MM/yyyy", { locale: es })}
                  </>
                ) : (
                  format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })
                )
              ) : (
                <span>Seleccionar rango de fechas</span>
              )}
            </Button>
            {filters.dateRange?.from && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0 opacity-70 hover:opacity-100 absolute top-1/2 right-2 transform -translate-y-1/2"
                onClick={(e) => {
                  updateFilter("dateRange", undefined);
                }}
                aria-label="Eliminar filtro de fechas"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            {filters.showDatePickerAdvanced && (
              <div className="absolute z-50 mt-1 bg-popover text-popover-foreground shadow-md border rounded-md p-3 w-auto">
                <DayPicker
                  mode="range"
                  defaultMonth={filters.dateRange?.from || undefined}
                  selected={filters.dateRange as any}
                  onSelect={(range) => updateFilter("dateRange", range as DateRange)}
                  locale={es}
                  numberOfMonths={2}
                  styles={{
                    root: { fontSize: "14px" },
                    day: { margin: "0.15rem" },
                    caption: { marginBottom: "0.5rem" }
                  }}
                  modifiersClassNames={{
                    selected: "bg-primary text-primary-foreground",
                    today: "bg-accent text-accent-foreground"
                  }}
                  footer={
                    <div className="mt-3 flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateFilter("dateRange", undefined);
                          updateFilter("showDatePickerAdvanced", false);
                        }}
                      >
                        Limpiar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => updateFilter("showDatePickerAdvanced", false)}
                      >
                        Aplicar
                      </Button>
                    </div>
                  }
                />
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="motiveFilterAdvanced" className="font-medium">Motivo de Consulta</Label>
          <Select
            value={filters.motiveFilter}
            onValueChange={(value) => updateFilter("motiveFilter", value)}
          >
            <SelectTrigger id="motiveFilterAdvanced" className="w-full">
              <SelectValue placeholder="Filtrar por motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los motivos</SelectItem>
              {uniqueMotives.map((motive) => (
                <SelectItem key={motive} value={motive}>
                  {motive}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="font-medium">Estado de Cita</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
            {APPOINTMENT_STATUSES.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={filters.statusFilter.includes(status)}
                  onCheckedChange={(checked) => handleStatusChange(status, !!checked)}
                />
                <Label
                  htmlFor={`status-${status}`}
                  className="capitalize select-none cursor-pointer font-normal"
                >
                  {status.replace(/_/g, " ")}
                </Label>
              </div>
            ))}
          </div>
        </div>
        {/* Nota informativa sobre el horario de consulta */}
        <div className="space-y-2">
          <Label className="font-medium">Horario de consulta</Label>
          <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <p>Las consultas se realizan de lunes a sábado de 9:00 am a 2:00 pm.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="font-medium">Ordenar Por</Label>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter("sortBy", value as AppointmentSortKey)}
            >
              <SelectTrigger aria-label="Campo para ordenar">
                <SelectValue placeholder="Campo" />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_SORT_KEYS.map(key => (
                  <SelectItem key={key} value={key}>
                    {key === 'fechaConsulta' ? 'Fecha' :
                      key === 'horaConsulta' ? 'Hora' :
                        key === 'nombre' ? 'Nombre' :
                          'Motivo'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sortOrder}
              onValueChange={(value) => updateFilter("sortOrder", value as SortOrder)}
            >
              <SelectTrigger aria-label="Orden de clasificación">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Ascendente</SelectItem>
                <SelectItem value="desc">Descendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">





        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={resetFilters}
          className="transition-colors hover:bg-muted"
        >
          Restablecer Filtros
        </Button>
        <Button
          onClick={onClose}
          className="shadow-sm transition-all hover:shadow-md"
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
});

AdvancedFilters.displayName = "AdvancedFilters";

/**
 * Componente de Resumen de Filtros Aplicados con animación mejorada.
 */
export const FilterSummary: React.FC<FilterSummaryProps> = memo(({
  filters,
  updateFilter,
  className = ""
}) => {
  // Calcular filtros activos una sola vez
  const activeFiltersCount = useMemo(() => {
    // Se considera que el filtro de estado está activo si no todos los estados están seleccionados.
    // Si todos los estados están seleccionados, es como no tener filtro de estado.
    const allStatusesSelected = filters.statusFilter.length === APPOINTMENT_STATUSES.length;

    return (filters.dateRange?.from ? 1 : 0) + // Check if 'from' date exists
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected && filters.statusFilter.length > 0 ? 1 : 0) + // Count if not all statuses are selected and at least one is
      (filters.searchTerm !== "" ? 1 : 0);
  }, [filters.dateRange, filters.motiveFilter, filters.statusFilter, filters.searchTerm]);

  // Ref para rastrear si se ha montado el componente
  const hasMounted = useRef(false);
  useEffect(() => {
    hasMounted.current = true;
    return () => { hasMounted.current = false; };
  }, []);

  // Siempre renderizamos el componente, pero ocultamos cuando no hay filtros activos
  // esto evita los parpadeos causados por montar/desmontar

  return (
    <div
      className={`flex flex-wrap gap-2 mb-4 items-center ${className}`}
      style={{
        opacity: 1,
        transform: 'none',
        transition: 'opacity 150ms ease-in-out, transform 150ms ease-in-out',
        height: 'auto',
        minHeight: activeFiltersCount > 0 ? '36px' : '0', // Ensure space is allocated if filters are active
        display: activeFiltersCount > 0 ? 'flex' : 'none', // Hide if no active filters
        overflow: 'visible'
      }}
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filtros aplicados:</span>
      {filters.dateRange?.from && ( // Check 'from' to ensure dateRange is actually set
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          <CalendarIcon className="h-3 w-3" />
          {formatDate(filters.dateRange.from)}
          {filters.dateRange.to && ` - ${formatDate(filters.dateRange.to)}`}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("dateRange", undefined)}
            aria-label="Eliminar filtro de rango de fechas"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.motiveFilter !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Motivo: {filters.motiveFilter}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("motiveFilter", "all")}
            aria-label={`Eliminar filtro de motivo: ${filters.motiveFilter}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {/* Mostrar el filtro de estado solo si no todos los estados están seleccionados y hay al menos uno */}
      {filters.statusFilter.length > 0 && filters.statusFilter.length < APPOINTMENT_STATUSES.length && (
        <Badge variant="secondary" className="flex items-center gap-1 capitalize group py-1.5">
          Estados: {filters.statusFilter
            .map(s => s.replace(/_/g, " "))
            .slice(0, 2)
            .join(", ")}
          {filters.statusFilter.length > 2 && ` y ${filters.statusFilter.length - 2} más`}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("statusFilter", [...APPOINTMENT_STATUSES])} // Reset to all statuses
            aria-label="Restablecer filtros de estado"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.searchTerm && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Búsqueda: "{filters.searchTerm.length > 15
            ? filters.searchTerm.substring(0, 15) + '...'
            : filters.searchTerm}"
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("searchTerm", "")}
            aria-label={`Eliminar término de búsqueda: ${filters.searchTerm}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  );
});

FilterSummary.displayName = "FilterSummary";

// --- Hook Personalizado Optimizado ---

// Función para obtener el rango de fechas inicial solo cuando sea necesario
const getInitialDateRange = (): DateRange => ({
  from: subDays(new Date(), 30),
  to: new Date(),
});

// Constante memoizada para el rango de fechas inicial
const INITIAL_DATE_RANGE = getInitialDateRange();

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE, // Usa la función getInitialDateRange
  motiveFilter: "all",
  statusFilter: [...APPOINTMENT_STATUSES], // Incluye todos los estados por defecto
  searchTerm: "",
  sortBy: 'fechaConsulta',
  sortOrder: 'desc',
  timeRange: [0, 24], // Valor inicial para el rango de horas (ej. todo el día)
  showDatePickerAdvanced: false,
};

export const useAppointmentFilters = (savedFilters?: Partial<AppointmentFilters>) => {
  // Inicializar con valores guardados si existen usando lazy initialization
  const [filters, setFilters] = useState<AppointmentFilters>(() => ({
    ...INITIAL_FILTERS,
    ...savedFilters,
    // Asegurarse de que statusFilter sea un array, incluso si savedFilters lo omite o lo pone como undefined
    statusFilter: savedFilters?.statusFilter || [...INITIAL_FILTERS.statusFilter],
  }));
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detectar dispositivo móvil con debounce para evitar múltiples re-renders
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100);
    };

    // Establecer valor inicial inmediatamente para evitar cambios visuales bruscos
    setIsMobile(window.innerWidth < 768);

    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
  }, []);

  // Funciones memoizadas para evitar recreaciones
  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const toggleAdvancedFilter = useCallback(() => {
    setIsAdvancedFilterOpen(prev => !prev);
  }, []);

  // Componente de Control de Filtros memoizado
  const FilterControls = memo<{ uniqueMotives: string[], className?: string }>(
    ({ uniqueMotives, className = "" }) => {
      // Optimización para evitar recálculos
      const buttonClasses = useMemo(() =>
        cn(
          "transition-colors",
          isAdvancedFilterOpen && "bg-primary text-primary-foreground hover:bg-primary/90"
        ),
        [isAdvancedFilterOpen]
      );

      return (
        <>
          <div className={`bg-white dark:bg-gray-950 rounded-lg p-4 mb-4 shadow-sm border ${className}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAdvancedFilter}
                  className={buttonClasses}
                  aria-expanded={isAdvancedFilterOpen}
                  aria-controls="advanced-filters-panel"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {isAdvancedFilterOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
                  {isAdvancedFilterOpen ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                </Button>


                {/* Selector de rango de fechas personalizado con react-day-picker */}
                <div
                  className="hidden md:flex transition-all duration-300 ease-in-out"
                  style={{ height: isMobile ? 0 : 'auto', opacity: isMobile ? 0 : 1 }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full justify-start text-left font-normal h-9 transition-all duration-150 ${!filters.dateRange?.from ? "text-muted-foreground" : ""}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {filters.dateRange?.from ? (
                          filters.dateRange.to ? (
                            <>
                              {format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })} - {format(filters.dateRange.to, "dd/MM/yyyy", { locale: es })}
                            </>
                          ) : (
                            format(filters.dateRange.from, "dd/MM/yyyy", { locale: es })
                          )
                        ) : (
                          <span>Seleccionar fechas</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-3">
                        <DayPicker
                          mode="range"
                          defaultMonth={filters.dateRange?.from || undefined}
                          selected={filters.dateRange as any}
                          onSelect={(range) => updateFilter("dateRange", range as DateRange)}
                          locale={es}
                          numberOfMonths={2}
                          styles={{
                            root: { fontSize: "14px" },
                            day: { margin: "0.15rem" },
                            caption: { marginBottom: "0.5rem" }
                          }}
                          modifiersClassNames={{
                            selected: "bg-primary text-primary-foreground",
                            today: "bg-accent text-accent-foreground"
                          }}
                          footer={
                            <div className="mt-3 flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => updateFilter("dateRange", undefined)}
                              >
                                Limpiar
                              </Button>
                            </div>
                          }
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </div>

          <FilterSummary filters={filters} updateFilter={updateFilter} />

          {/* Siempre renderizar el panel pero ocultarlo cuando esté cerrado */}
          <div
            id="advanced-filters-panel"
            style={{
              opacity: isAdvancedFilterOpen ? 1 : 0,
              maxHeight: isAdvancedFilterOpen ? '1000px' : '0px',
              overflow: 'hidden',
              transition: 'opacity 200ms ease-in-out, max-height 300ms ease-in-out'
            }}
          >
            <AdvancedFilters
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              uniqueMotives={uniqueMotives}
              onClose={toggleAdvancedFilter}
            />
          </div>
        </>
      );
    }
  );

  FilterControls.displayName = "FilterControls";

  return {
    filters,
    updateFilter,
    resetFilters,
    isAdvancedFilterOpen,
    setIsAdvancedFilterOpen,
    toggleAdvancedFilter,
    FilterControls,
    isMobile
  };
};

export default useAppointmentFilters;
