"use client";

import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { format, subDays, isValid, isAfter, isBefore, parseISO, startOfDay, endOfDay, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { DayPicker, SelectRangeEventHandler } from "react-day-picker";
import "react-day-picker/dist/style.css";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

// Icons
import {
  CalendarIcon, Filter, X, ChevronDown, ChevronUp, Search, ArrowUpDown,
  CheckCircle, XCircle, Clock, Calendar, ClipboardCheck, AlertCircle,
  CalendarDays, CalendarClock, CalendarCheck, CalendarX, ChevronRight,
  RefreshCcw, UserCog, Info as InfoIcon, MoreVertical, FileBarChart
} from "lucide-react";

// Context and utilities
import { useAppContext } from "@/lib/context/app-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ===============================
// TIPOS Y CONSTANTES
// ===============================

/**
 * Estados posibles de una cita médica
 */
export const APPOINTMENT_STATUSES = [
  'completada', 'cancelada', 'pendiente', 'presente', 'reprogramada', 'no_asistio'
] as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number];

/**
 * Campos disponibles para ordenamiento
 */
export const APPOINTMENT_SORT_KEYS = ['fechaConsulta', 'horaConsulta', 'nombre', 'motivoConsulta'] as const;
export type AppointmentSortKey = typeof APPOINTMENT_SORT_KEYS[number];

export type SortOrder = "asc" | "desc";

/**
 * Interfaz para rango de fechas
 */
export interface DateRange {
  from: Date | null;
  to: Date | null;
}

/**
 * Estructura de datos de una cita
 */
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
  patientId?: string;
}

/**
 * Configuración de filtros para citas
 */
export interface AppointmentFilters {
  dateRange: DateRange | undefined;
  motiveFilter: string; // "all" o un motivo específico
  statusFilter: AppointmentStatus[];
  searchTerm: string;
  sortBy: AppointmentSortKey;
  sortOrder: SortOrder;
  timeRange: [number, number]; // Rango de horas
  showDatePickerAdvanced?: boolean; // Control de visibilidad del selector avanzado
}

/**
 * Colores asociados a cada estado de cita
 */
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  completada: "#10b981", // Verde
  cancelada: "#ef4444", // Rojo
  pendiente: "#f59e0b", // Naranja
  presente: "#3b82f6", // Azul
  reprogramada: "#8b5cf6", // Púrpura
  no_asistio: "#6b7280", // Gris
};

// ===============================
// FUNCIONES UTILITARIAS
// ===============================

/**
 * Formatea fechas de manera consistente con manejo de errores
 * @param date - Fecha a formatear
 * @param formatStr - Formato deseado
 * @returns Fecha formateada o mensaje de error
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
 * Convierte una cadena de hora (HH:MM) a número decimal con validación
 * @param timeStr - Hora en formato HH:MM
 * @returns Hora como número decimal
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

/**
 * Normaliza IDs para asegurar que sean strings
 * @param id - ID a normalizar
 * @returns ID como string
 */
const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return "";
  return String(id);
};

// ===============================
// COMPONENTE: FILTROS AVANZADOS
// ===============================

interface AdvancedFiltersProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  resetFilters: () => void;
  uniqueMotives: string[];
  onClose: () => void;
  className?: string;
}

/**
 * Panel de filtros avanzados para citas médicas
 * Permite filtrar por fecha, motivo, estado y otros criterios
 */
const AdvancedFilters: React.FC<AdvancedFiltersProps> = memo(({
  filters,
  updateFilter,
  resetFilters,
  uniqueMotives,
  onClose,
  className = ""
}) => {
  /**
   * Maneja cambios en el filtro de estados
   * @param status - Estado a modificar
   * @param checked - Si está seleccionado o no
   */
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
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Filter className="h-5 w-5 text-primary" />
          Filtros Avanzados
        </h3>
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
        {/* Selector de rango de fechas */}
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
        
        {/* Filtro de motivo de consulta */}
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

        {/* Filtros de estado de cita */}
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

        {/* Información sobre horarios */}
        <div className="space-y-2">
          <Label className="font-medium">Horario de consulta</Label>
          <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <p>Las consultas se realizan de lunes a sábado de 9:00 am a 2:00 pm.</p>
          </div>
        </div>

        {/* Controles de ordenamiento */}
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
      </div>

      {/* Botones de acción */}
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

// ===============================
// COMPONENTE: RESUMEN DE FILTROS
// ===============================

interface FilterSummaryProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  className?: string;
}

/**
 * Muestra un resumen de los filtros aplicados con opción de eliminarlos individualmente
 */
const FilterSummary: React.FC<FilterSummaryProps> = memo(({
  filters,
  updateFilter,
  className = ""
}) => {
  /**
   * Calcula el número de filtros activos
   */
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === APPOINTMENT_STATUSES.length;

    return (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected && filters.statusFilter.length > 0 ? 1 : 0) +
      (filters.searchTerm !== "" ? 1 : 0);
  }, [filters.dateRange, filters.motiveFilter, filters.statusFilter, filters.searchTerm]);

  if (activeFiltersCount === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 mb-4 items-center ${className}`}>
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
        <Filter className="h-4 w-4" />
        Filtros aplicados:
      </span>
      
      {/* Filtro de rango de fechas */}
      {filters.dateRange?.from && (
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
      
      {/* Filtro de motivo */}
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
      
      {/* Filtro de estados */}
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
            onClick={() => updateFilter("statusFilter", [...APPOINTMENT_STATUSES])}
            aria-label="Restablecer filtros de estado"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      
      {/* Filtro de búsqueda */}
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

// ===============================
// HOOK: GESTIÓN DE FILTROS
// ===============================

/**
 * Obtiene el rango de fechas inicial (últimos 30 días)
 */
const getInitialDateRange = (): DateRange => ({
  from: subDays(new Date(), 30),
  to: new Date(),
});

const INITIAL_DATE_RANGE = getInitialDateRange();

/**
 * Configuración inicial de filtros
 */
const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...APPOINTMENT_STATUSES],
  searchTerm: "",
  sortBy: 'fechaConsulta',
  sortOrder: 'desc',
  timeRange: [0, 24],
  showDatePickerAdvanced: false,
};

/**
 * Hook personalizado para gestión de filtros de citas
 * Proporciona estado y funciones para filtrar y ordenar citas
 */
export const useAppointmentFilters = (savedFilters?: Partial<AppointmentFilters>) => {
  const [filters, setFilters] = useState<AppointmentFilters>(() => ({
    ...INITIAL_FILTERS,
    ...savedFilters,
    statusFilter: savedFilters?.statusFilter || [...INITIAL_FILTERS.statusFilter],
  }));
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detectar dispositivo móvil con debounce
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsMobile(window.innerWidth < 768);
      }, 100);
    };

    setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timeoutId);
    };
  }, []);

  /**
   * Actualiza un filtro específico
   */
  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Resetea todos los filtros a sus valores iniciales
   */
  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  /**
   * Alterna la visibilidad del panel de filtros avanzados
   */
  const toggleAdvancedFilter = useCallback(() => {
    setIsAdvancedFilterOpen(prev => !prev);
  }, []);

  /**
   * Componente de controles de filtro integrado
   */
  const FilterControls = memo<{ uniqueMotives: string[], className?: string }>(
    ({ uniqueMotives, className = "" }) => {
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

                {/* Selector de rango de fechas rápido (solo en desktop) */}
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

              {/* Barra de búsqueda */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Buscar paciente..."
                  className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9"
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter("searchTerm", e.target.value)}
                />
              </div>
            </div>
          </div>

          <FilterSummary filters={filters} updateFilter={updateFilter} />

          {/* Panel de filtros avanzados con animación */}
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

// ===============================
// COMPONENTE: TARJETA DE CITA (MÓVIL)
// ===============================

interface AppointmentCardProps {
  appointment: Appointment;
  onAction: (action: string, id: string, appointment: Appointment) => void;
  showNoShowOverride?: boolean;
}

/**
 * Tarjeta individual de cita para vista móvil
 * Muestra información resumida con acciones rápidas
 */
const AppointmentCard: React.FC<AppointmentCardProps> = memo(({ 
  appointment, 
  onAction, 
  showNoShowOverride = false 
}) => {
  const formatTime = useCallback((time: string): string => {
    if (!time || !time.includes(':')) return "Hora inválida";
    try {
      const [hours, minutes] = time.split(":");
      const date = new Date();
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));
      return format(date, "p", { locale: es });
    } catch (error) {
      console.error("Error formateando hora:", error);
      return "Hora inválida";
    }
  }, []);

  const currentStatus = showNoShowOverride ? "no_asistio" : appointment.estado;
  
  /**
   * Obtiene el color asociado al estado de la cita
   */
  const getStatusColorClass = (status: AppointmentStatus): string => {
    const colorMap: Record<AppointmentStatus, string> = {
      presente: "bg-teal-100 text-teal-800 dark:bg-teal-800/20 dark:text-teal-400 border-teal-200",
      cancelada: "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400 border-rose-200",
      completada: "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400 border-sky-200",
      pendiente: "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400 border-amber-200",
      no_asistio: "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400 border-slate-200",
      reprogramada: "bg-violet-100 text-violet-800 dark:bg-violet-800/20 dark:text-violet-400 border-violet-200",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  /**
   * Obtiene el ícono asociado al estado
   */
  const getStatusIcon = (status: AppointmentStatus) => {
    const iconMap: Record<AppointmentStatus, React.ReactNode> = {
      presente: <CheckCircle className="h-3 w-3" />,
      cancelada: <XCircle className="h-3 w-3" />,
      completada: <ClipboardCheck className="h-3 w-3" />,
      pendiente: <Clock className="h-3 w-3" />,
      no_asistio: <AlertCircle className="h-3 w-3" />,
      reprogramada: <Calendar className="h-3 w-3" />,
    };
    return iconMap[status];
  };

  /**
   * Obtiene la etiqueta legible del estado
   */
  const getStatusLabel = (status: AppointmentStatus): string => {
    const labelMap: Record<AppointmentStatus, string> = {
      presente: "Presente",
      cancelada: "Cancelada",
      completada: "Completada", 
      pendiente: "Pendiente",
      no_asistio: "No Asistió",
      reprogramada: "Reprogramada",
    };
    return labelMap[status];
  };

  const isActionable = !["completada", "cancelada"].includes(currentStatus) &&
                       !(currentStatus === "no_asistio" && showNoShowOverride);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="w-full"
    >
      <Card className="overflow-hidden mb-4 border-l-4 hover:shadow-lg transition-all duration-300 ease-in-out"
            style={{ borderLeftColor: STATUS_COLORS[currentStatus] }}>
        <CardHeader className="p-4 bg-gradient-to-r from-slate-50/80 to-white dark:from-slate-900/50 dark:to-slate-950 border-b border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-start">
            <div className="flex-grow">
              <CardTitle className="text-base font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                {appointment.nombre} {appointment.apellidos}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                {appointment.motivoConsulta}
              </CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`ml-2 text-xs px-2 py-0.5 flex items-center gap-1 ${getStatusColorClass(currentStatus)}`}
            >
              {getStatusIcon(currentStatus)}
              {getStatusLabel(currentStatus)}
            </Badge>
          </div>
          <div className="mt-2 flex items-center text-xs text-slate-600 dark:text-slate-400 space-x-3">
            <div className="flex items-center">
              <CalendarDays className="h-3.5 w-3.5 mr-1 text-primary/80" />
              <span>{formatDate(appointment.fechaConsulta, "EEEE, d 'de' MMMM", { locale: es })}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-primary/80" />
              <span>{formatTime(appointment.horaConsulta)}</span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">ID: {appointment.id}</p>
              {appointment.telefono && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Teléfono: {appointment.telefono}
                </p>
              )}
            </div>
            
            {/* Botones de acción */}
            {isActionable && (
              <div className="flex gap-1">
                {currentStatus === "pendiente" && (
                  <Button
                    size="sm" 
                    variant="ghost"
                    className="text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/50 px-2 py-1"
                    onClick={() => onAction("checkIn", appointment.id, appointment)}
                  >
                    <CheckCircle className="mr-1 h-3.5 w-3.5" /> 
                    Presente
                  </Button>
                )}
                {currentStatus === "presente" && (
                  <Button
                    size="sm" 
                    variant="ghost"
                    className="text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/50 px-2 py-1"
                    onClick={() => onAction("complete", appointment.id, appointment)}
                  >
                    <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> 
                    Completar
                  </Button>
                )}
                
                {/* Menú de más acciones */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {currentStatus !== "reprogramada" && (
                      <DropdownMenuItem
                        onClick={() => onAction("reschedule", appointment.id, appointment)}
                      >
                        <CalendarClock className="mr-2 h-4 w-4 text-yellow-600" /> 
                        Reagendar
                      </DropdownMenuItem>
                    )}
                    {currentStatus !== "cancelada" && (
                      <DropdownMenuItem
                        onClick={() => onAction("cancel", appointment.id, appointment)}
                      >
                        <CalendarX className="mr-2 h-4 w-4 text-red-600" /> 
                        Cancelar
                      </DropdownMenuItem>
                    )}
                    {!["no_asistio", "completada", "cancelada"].includes(currentStatus) && (
                      <DropdownMenuItem
                        onClick={() => onAction("noShow", appointment.id, appointment)}
                      >
                        <UserCog className="mr-2 h-4 w-4 text-slate-500" /> 
                        No Asistió
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

AppointmentCard.displayName = "AppointmentCard";

// ===============================
// COMPONENTE PRINCIPAL: GESTIÓN DE CITAS
// ===============================

/**
 * Componente principal que consolida toda la gestión de citas médicas
 * Incluye filtrado, búsqueda, visualización y acciones sobre las citas
 */
export const AppointmentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("today");
  const [isLoading, setIsLoading] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Hook de filtros personalizado
  const { 
    filters, 
    updateFilter, 
    resetFilters, 
    FilterControls,
    isMobile
  } = useAppointmentFilters();

  /**
   * Simula la carga de datos de citas desde el contexto
   */
  const loadAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Aquí se integraría con el contexto real
      // await fetchAppointments();
      
      // Datos de ejemplo para demostración
      const mockData: Appointment[] = [
        {
          id: "1",
          nombre: "Juan",
          apellidos: "Pérez López",
          fechaConsulta: "2024-12-20",
          horaConsulta: "10:30",
          motivoConsulta: "Hernia Inguinal",
          estado: "pendiente",
          notas: "Primera consulta",
          telefono: "555-1234"
        },
        {
          id: "2", 
          nombre: "María",
          apellidos: "González Ruiz",
          fechaConsulta: "2024-12-20",
          horaConsulta: "11:00",
          motivoConsulta: "Colecistitis",
          estado: "presente",
          notas: "Seguimiento",
          telefono: "555-5678"
        }
      ];
      
      setAppointments(mockData);
      toast.success("Citas cargadas correctamente");
    } catch (error) {
      console.error("Error loading appointments:", error);
      toast.error("Error al cargar las citas");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Cargar datos al montar el componente
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  /**
   * Obtiene motivos únicos para los filtros
   */
  const uniqueMotives = useMemo(() => {
    const motives = new Set<string>();
    appointments.forEach((appointment) => {
      if (appointment && appointment.motivoConsulta) {
        motives.add(appointment.motivoConsulta);
      }
    });
    return Array.from(motives).sort();
  }, [appointments]);

  /**
   * Filtra las citas según los criterios seleccionados
   */
  const filteredAppointments = useMemo(() => {
    if (!Array.isArray(appointments)) return [];

    return appointments
      .filter(appointment => appointment != null)
      .filter((appointment) => {
        // Filtro por rango de fechas
        if (filters.dateRange?.from || filters.dateRange?.to) {
          const appointmentDate = parseISO(appointment.fechaConsulta);
          if (!isValid(appointmentDate)) return false;

          if (filters.dateRange.from && !filters.dateRange.to) {
            return isAfter(appointmentDate, startOfDay(filters.dateRange.from)) || 
                   isSameDay(appointmentDate, filters.dateRange.from);
          }
          if (!filters.dateRange.from && filters.dateRange.to) {
            return isBefore(appointmentDate, endOfDay(filters.dateRange.to)) || 
                   isSameDay(appointmentDate, filters.dateRange.to);
          }
          if (filters.dateRange.from && filters.dateRange.to) {
            return (isAfter(appointmentDate, startOfDay(filters.dateRange.from)) || 
                    isSameDay(appointmentDate, filters.dateRange.from)) &&
                   (isBefore(appointmentDate, endOfDay(filters.dateRange.to)) || 
                    isSameDay(appointmentDate, filters.dateRange.to));
          }
        }
        return true;
      })
      .filter(appointment => 
        filters.motiveFilter === "all" || 
        (appointment.motivoConsulta || "") === filters.motiveFilter
      )
      .filter(appointment => filters.statusFilter.includes(appointment.estado))
      .filter(appointment => {
        const appointmentHour = appointment.horaConsulta ? hourToDecimal(appointment.horaConsulta) : -1;
        if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
          return appointmentHour >= filters.timeRange[0] && appointmentHour <= filters.timeRange[1];
        }
        return true;
      })
      .filter(appointment => {
        if (!filters.searchTerm) return true;
        const searchLower = filters.searchTerm.toLowerCase().trim();
        return (appointment.nombre || "").toLowerCase().includes(searchLower) ||
               (appointment.apellidos || "").toLowerCase().includes(searchLower) ||
               (appointment.motivoConsulta || "").toLowerCase().includes(searchLower) ||
               (appointment.notas || "").toLowerCase().includes(searchLower);
      })
      .sort((a, b) => {
        // Ordenamiento según configuración
        const { sortBy, sortOrder } = filters;
        let comparison = 0;
        
        switch (sortBy) {
          case 'fechaConsulta':
            comparison = new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime();
            break;
          case 'horaConsulta':
            comparison = (a.horaConsulta || "").localeCompare(b.horaConsulta || "");
            break;
          case 'nombre':
            comparison = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
            break;
          case 'motivoConsulta':
            comparison = (a.motivoConsulta || "").localeCompare(b.motivoConsulta || "");
            break;
        }
        
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [appointments, filters]);

  /**
   * Maneja las acciones sobre las citas
   */
  const handleAppointmentAction = useCallback((action: string, id: string, appointment: Appointment) => {
    console.log(`Acción: ${action} en cita ${id}`);
    
    switch (action) {
      case 'checkIn':
        toast.success(`${appointment.nombre} marcado como presente`);
        break;
      case 'complete':
        toast.success(`Consulta de ${appointment.nombre} completada`);
        break;
      case 'cancel':
        toast.success(`Cita de ${appointment.nombre} cancelada`);
        break;
      case 'reschedule':
        toast.info(`Reagendando cita de ${appointment.nombre}`);
        break;
      case 'noShow':
        toast.warning(`${appointment.nombre} marcado como no asistió`);
        break;
      default:
        console.warn(`Acción desconocida: ${action}`);
    }
    
    // Aquí se integraría con el contexto para actualizar los datos
    loadAppointments();
  }, [loadAppointments]);

  /**
   * Clasifica las citas por período temporal
   */
  const classifiedAppointments = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const todayAppointments = filteredAppointments.filter(apt => apt.fechaConsulta === todayStr);
    const futureAppointments = filteredAppointments.filter(apt => apt.fechaConsulta > todayStr);
    const pastAppointments = filteredAppointments.filter(apt => apt.fechaConsulta < todayStr);
    
    return {
      today: todayAppointments,
      future: futureAppointments,
      past: pastAppointments
    };
  }, [filteredAppointments]);

  /**
   * Renderiza la lista de citas según el dispositivo
   */
  const renderAppointmentsList = useCallback((appointmentsList: Appointment[], showPastOverride = false) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      );
    }

    if (appointmentsList.length === 0) {
      return (
        <div className="p-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-4">
              <Calendar className="h-12 w-12 text-primary" />
            </div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              No hay citas para mostrar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Prueba a cambiar los filtros o añadir nuevas citas
            </p>
          </div>
        </div>
      );
    }

    return (
      <AnimatePresence>
        <div className="space-y-4">
          {appointmentsList.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              onAction={handleAppointmentAction}
              showNoShowOverride={showPastOverride}
            />
          ))}
        </div>
      </AnimatePresence>
    );
  }, [isLoading, handleAppointmentAction]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Gestión de Citas
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Administra y controla todas las citas médicas
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={loadAppointments}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Controles de filtros */}
      <FilterControls uniqueMotives={uniqueMotives} />

      {/* Tabs de períodos */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Hoy ({classifiedAppointments.today.length})
          </TabsTrigger>
          <TabsTrigger value="future" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Futuras ({classifiedAppointments.future.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            Historial ({classifiedAppointments.past.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="today" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Citas de Hoy
                </CardTitle>
                <CardDescription>
                  Citas programadas para el día de hoy
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderAppointmentsList(classifiedAppointments.today)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="future" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Citas Futuras
                </CardTitle>
                <CardDescription>
                  Citas programadas para fechas futuras
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderAppointmentsList(classifiedAppointments.future)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="past" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-slate-600" />
                  Historial de Citas
                </CardTitle>
                <CardDescription>
                  Citas pasadas y completadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderAppointmentsList(classifiedAppointments.past, true)}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AppointmentManagement;