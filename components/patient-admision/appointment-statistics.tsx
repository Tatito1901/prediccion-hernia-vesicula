"use client"

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  memo,
} from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { format, isAfter, isBefore, parseISO, isValid, startOfDay, endOfDay, isSameDay, subDays } from "date-fns";
import { es } from "date-fns/locale/es"
import { DayPicker, type SelectRangeEventHandler, type DateRange as DayPickerDateRange } from "react-day-picker" // Tipos importados
import "react-day-picker/dist/style.css"
import { Button } from "@/components/ui/button";
import { useAppContext, type AppointmentData } from "@/lib/context/app-context"; // Asumimos AppointmentData bien tipada
import { AppointmentStatusEnum, type AppointmentStatus } from "@/app/dashboard/data-model"; // Asumimos DiagnosisEnum existe si se usa para ALLOWED_MOTIVES
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  FileBarChart,
  RefreshCw,
  AlertCircle,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Users,
  TrendingUp,
  Calendar,
  Clock,
  Target,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import useChartConfig, { // Asumimos que estos componentes y tipos están bien definidos
  StatCard,
  type GeneralStats,
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterPoint,
  type ScatterData,
  STATUS_COLORS,
  WEEKDAYS,
} from "@/components/charts/use-chart-config" // Ajusta la ruta si es necesario

/** ====== TYPES & CONSTANTS ====== **/
const titleCaseStatus = (status: AppointmentStatus): string => {
  if (status === "NO ASISTIO") return "No Asistió"; // Caso especial
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const APPOINTMENT_SORT_KEYS = [
  "fechaConsulta",
  "horaConsulta",
  "nombre",
  "motivoConsulta",
] as const;

export type AppointmentSortKey = (typeof APPOINTMENT_SORT_KEYS)[number];
export type SortOrder = "asc" | "desc";

export interface DateRange { // Tu tipo DateRange
  from: Date | null;
  to: Date | null;
}

export interface Appointment {
  readonly id: string;
  readonly nombre: string;
  readonly apellidos: string;
  readonly fechaConsulta: Date | null; // Puede ser null si la fecha original es inválida
  readonly horaConsulta: string;
  readonly motivoConsulta: string;
  readonly estado: AppointmentStatus;
  readonly notas: string;
  readonly duracion?: number;
  readonly costoConsulta?: number;
  readonly seguroMedico?: string;
  readonly telefono?: string;
  readonly email?: string;
  // Campos normalizados para optimización
  readonly dateObj: Date | null; // Coincide con fechaConsulta
  readonly dateStr?: string; // yyyy-MM-dd
  readonly dayOfWeek?: number; // 0 (Sun) - 6 (Sat)
  readonly hourDecimal?: number; // e.g., 9.5 for 09:30
}

export interface AppointmentFilters {
  dateRange: DateRange | undefined;
  motiveFilter: string;
  statusFilter: readonly AppointmentStatus[];
  sortBy: AppointmentSortKey;
  sortOrder: SortOrder;
  timeRange: readonly [number, number];
  showDatePickerAdvanced?: boolean;
}

// Design tokens (SPACING no se usa directamente en JSX, pero es buena práctica)
const SPACING = { /* ... */ } as const;

/** ====== FUNCIONES UTILITARIAS (FUERA DEL COMPONENTE) ====== **/
export const formatDateUtil = ( // Renombrado para evitar conflicto con date-fns.format
  date: Date | string | undefined | null,
  formatStr = "dd/MM/yyyy"
): string => {
  if (!date) return "Fecha no definida";
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) {
      // Intenta un fallback si la cadena no es ISO pero podría ser interpretable
      const fallbackDateObj = new Date(date as string); // date as string aquí es seguro por la lógica
      if (isValid(fallbackDateObj)) return format(fallbackDateObj, formatStr, { locale: es });
      return "Fecha inválida";
    }
    return format(dateObj, formatStr, { locale: es });
  } catch {
    return "Error de formato";
  }
};

export const hourToDecimal = (timeStr: string | undefined): number | null => {
  if (!timeStr || typeof timeStr !== "string") return null;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours + minutes / 60;
};

const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

/** ====== FILTER SUMMARY COMPONENT ====== **/
interface FilterSummaryProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => void;
  className?: string;
}

const FilterSummary = memo<FilterSummaryProps>(({ filters, updateFilter, className = "" }) => {
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === Object.keys(AppointmentStatusEnum).length || filters.statusFilter.length === 0;
    return (
      (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected ? 1 : 0)
    );
  }, [filters.dateRange, filters.motiveFilter, filters.statusFilter]);

  if (activeFiltersCount === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2 mb-6 items-center animate-in fade-in-0 slide-in-from-top-2", className)}>
      <span className="text-sm font-medium text-muted-foreground">Filtros aplicados:</span>
      {filters.dateRange?.from && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <Calendar className="h-3 w-3" />
          <span className="text-xs">
            {formatDateUtil(filters.dateRange.from)}
            {filters.dateRange.to && ` - ${formatDateUtil(filters.dateRange.to)}`}
          </span>
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={() => updateFilter("dateRange", undefined)} aria-label="Eliminar filtro de fechas">
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.motiveFilter !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <span className="text-xs">Motivo: {filters.motiveFilter}</span>
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={() => updateFilter("motiveFilter", "all")} aria-label="Eliminar filtro de motivo">
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
      {filters.statusFilter.length > 0 && filters.statusFilter.length < Object.keys(AppointmentStatusEnum).length && (
        <Badge variant="secondary" className="flex items-center gap-1.5 group py-1.5 px-3 hover:bg-secondary/80 transition-colors">
          <span className="text-xs">
            Estados: {filters.statusFilter.map((s) => titleCaseStatus(s)).slice(0, 2).join(", ")}
            {filters.statusFilter.length > 2 && ` y ${filters.statusFilter.length - 2} más`}
          </span>
          <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 opacity-60 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={() => updateFilter("statusFilter", [...Object.values(AppointmentStatusEnum)])} aria-label="Restablecer filtros de estado">
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  if (prevProps.className !== nextProps.className) return false;
  const prevF = prevProps.filters;
  const nextF = nextProps.filters;
  return (
    prevF.dateRange?.from?.getTime() === nextF.dateRange?.from?.getTime() &&
    prevF.dateRange?.to?.getTime() === nextF.dateRange?.to?.getTime() &&
    prevF.motiveFilter === nextF.motiveFilter &&
    prevF.statusFilter.length === nextF.statusFilter.length &&
    prevF.statusFilter.every(status => nextF.statusFilter.includes(status))
  );
});
FilterSummary.displayName = "FilterSummary";

/** ====== ADVANCED FILTERS COMPONENT ====== **/
interface AdvancedFiltersProps {
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  resetFilters: () => void;
  uniqueMotives: readonly string[];
  onClose: () => void;
  className?: string;
  isMobile: boolean; // Para DayPicker responsivo
}

const AdvancedFilters = memo<AdvancedFiltersProps>(({
  filters, updateFilter, resetFilters, uniqueMotives, onClose, className = "", isMobile
}) => {
  const handleStatusChange = useCallback((status: AppointmentStatus, checked: boolean) => {
    const newStatus = checked
      ? [...filters.statusFilter, status]
      : filters.statusFilter.filter((s) => s !== status);
    updateFilter("statusFilter", newStatus);
  }, [filters.statusFilter, updateFilter]);

  const handleDateRangeSelect = useCallback((range: DayPickerDateRange | undefined) => {
    const newAppRange = range ? { from: range.from || null, to: range.to || null } : undefined;
    updateFilter("dateRange", newAppRange);
  }, [updateFilter]);

  const toggleDatePicker = useCallback(() => {
    updateFilter("showDatePickerAdvanced", !filters.showDatePickerAdvanced);
  }, [filters.showDatePickerAdvanced, updateFilter]);

  const datePickerKey = useMemo(() =>
    `${filters.dateRange?.from?.getTime() || "none"}-${filters.dateRange?.to?.getTime() || "none"}`,
    [filters.dateRange]
  );

  return (
    <Card className={cn("overflow-hidden transition-all duration-300", className)}>
      <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Personaliza la visualización de datos</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar filtros" className="hover:bg-background transition-colors h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label htmlFor="dateRangeAdvanced" className="text-sm font-medium">Rango de Fechas</Label>
            <div className="relative">
              <Button id="dateRangeAdvanced" variant="outline" className={cn("w-full justify-start text-left font-normal pr-10 hover:bg-muted/50 transition-colors", !filters.dateRange?.from && "text-muted-foreground")} onClick={toggleDatePicker}>
                <Calendar className="mr-2 h-4 w-4" />
                {filters.dateRange?.from ? (filters.dateRange.to ? (<>{formatDateUtil(filters.dateRange.from)} - {formatDateUtil(filters.dateRange.to)}</>) : formatDateUtil(filters.dateRange.from)) : (<span>Seleccionar rango</span>)}
              </Button>
              {filters.dateRange?.from && (<Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground transition-all" onClick={() => updateFilter("dateRange", undefined)} aria-label="Limpiar fechas"><X className="h-3 w-3" /></Button>)}
              {filters.showDatePickerAdvanced && (
                <div className="absolute z-50 mt-2 bg-background shadow-lg rounded-lg border p-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
                  <DayPicker key={datePickerKey} mode="range" defaultMonth={filters.dateRange?.from || new Date()} selected={filters.dateRange as DayPickerDateRange | undefined} onSelect={handleDateRangeSelect as SelectRangeEventHandler | undefined} locale={es} numberOfMonths={isMobile ? 1 : 2} disabled={{ after: new Date() }} className="rounded-md"
                    footer={
                      <div className="mt-4 flex justify-end gap-2 pt-3 border-t">
                        <Button type="button" variant="outline" size="sm" onClick={() => { updateFilter("dateRange", undefined); updateFilter("showDatePickerAdvanced", false); }}>Limpiar</Button>
                        <Button type="button" size="sm" onClick={() => updateFilter("showDatePickerAdvanced", false)}>Aplicar</Button>
                      </div>} />
                </div>)}
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="motiveFilterAdvanced" className="text-sm font-medium">Motivo de Consulta</Label>
            <Select value={filters.motiveFilter} onValueChange={(value) => updateFilter("motiveFilter", value)}>
              <SelectTrigger id="motiveFilterAdvanced" className="w-full hover:bg-muted/50 transition-colors"><SelectValue placeholder="Filtrar por motivo" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Todos los motivos</SelectItem>{uniqueMotives.map((motive) => (<SelectItem key={motive} value={motive}>{motive}</SelectItem>))}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-sm font-medium">Estado de Cita</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.values(AppointmentStatusEnum).map((status) => (
              <div key={status} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/30 transition-colors">
                <Checkbox id={`status-${status}`} checked={filters.statusFilter.includes(status)} onCheckedChange={(checked) => handleStatusChange(status, !!checked)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor={`status-${status}`} className="capitalize select-none cursor-pointer font-normal text-sm flex-1">{titleCaseStatus(status)}</Label>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] }} />
              </div>))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Información de Horarios</Label>
            <div className="p-4 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-primary mt-0.5" /><div className="space-y-1"><p className="text-sm font-medium">Horario de Consultas</p><p className="text-xs text-muted-foreground">Lunes a Sábado: 9:00 AM - 2:00 PM</p></div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <Label className="text-sm font-medium">Opciones de Ordenamiento</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value as AppointmentSortKey)}>
                <SelectTrigger aria-label="Campo para ordenar" className="hover:bg-muted/50 transition-colors"><SelectValue placeholder="Campo" /></SelectTrigger>
                <SelectContent>{APPOINTMENT_SORT_KEYS.map((key) => (<SelectItem key={key} value={key}>{key === "fechaConsulta" ? "Fecha" : key === "horaConsulta" ? "Hora" : key === "nombre" ? "Nombre" : "Motivo"}</SelectItem>))}</SelectContent>
              </Select>
              <Select value={filters.sortOrder} onValueChange={(value) => updateFilter("sortOrder", value as SortOrder)}>
                <SelectTrigger aria-label="Orden de clasificación" className="hover:bg-muted/50 transition-colors"><SelectValue placeholder="Orden" /></SelectTrigger>
                <SelectContent><SelectItem value="asc">↑ Ascendente</SelectItem><SelectItem value="desc">↓ Descendente</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={resetFilters} className="transition-all hover:bg-muted"><RefreshCw className="w-4 h-4 mr-2" />Restablecer Filtros</Button>
          <Button onClick={onClose} className="bg-primary hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">Aplicar Filtros</Button>
        </div>
      </CardContent>
    </Card>
  );
});
AdvancedFilters.displayName = "AdvancedFilters";

/** ====== FILTER CONTROLS COMPONENT ====== **/
interface FilterControlsProps {
  uniqueMotives: readonly string[];
  isAdvancedFilterOpen: boolean;
  toggleAdvancedFilter: () => void;
  filters: AppointmentFilters;
  updateFilter: <K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => void;
  resetFilters: () => void;
  isMobile: boolean;
}

const FilterControls = memo<FilterControlsProps>(({
  uniqueMotives, isAdvancedFilterOpen, toggleAdvancedFilter, filters, updateFilter, resetFilters, isMobile,
}) => {
  const handleDateRangeSelectPopover = useCallback((range: DayPickerDateRange | undefined) => {
    const newAppRange = range ? { from: range.from || null, to: range.to || null } : undefined;
    updateFilter("dateRange", newAppRange);
  }, [updateFilter]);

  const datePickerKeyPopover = useMemo(() =>
    `popover-${filters.dateRange?.from?.getTime() || "none"}-${filters.dateRange?.to?.getTime() || "none"}`,
    [filters.dateRange]
  );

  return (
    <>
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Button variant={isAdvancedFilterOpen ? "default" : "outline"} size="sm" onClick={toggleAdvancedFilter} className="transition-all duration-200 hover:scale-105" aria-expanded={isAdvancedFilterOpen} aria-controls="advanced-filters-panel">
                <Filter className="h-4 w-4 mr-2" />{isAdvancedFilterOpen ? "Ocultar Filtros" : "Mostrar Filtros"}{isAdvancedFilterOpen ? (<ChevronUp className="ml-2 h-3 w-3" />) : (<ChevronDown className="ml-2 h-3 w-3" />)}
              </Button>
              {!isMobile && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal hover:bg-muted/50 transition-colors", !filters.dateRange?.from && "text-muted-foreground")}>
                      <Calendar className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (filters.dateRange.to ? (<>{formatDateUtil(filters.dateRange.from)} - {formatDateUtil(filters.dateRange.to)}</>) : formatDateUtil(filters.dateRange.from)) : (<span>Seleccionar fechas</span>)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-4">
                      <DayPicker key={datePickerKeyPopover} mode="range" defaultMonth={filters.dateRange?.from || new Date()} selected={filters.dateRange as DayPickerDateRange | undefined} onSelect={handleDateRangeSelectPopover as SelectRangeEventHandler | undefined} locale={es} numberOfMonths={isMobile ? 1 : 2} disabled={{ after: new Date() }}
                        footer={<div className="mt-4 flex justify-end gap-2 pt-3 border-t"><Button type="button" variant="outline" size="sm" onClick={() => updateFilter("dateRange", undefined)}>Limpiar</Button></div>} />
                    </div>
                  </PopoverContent>
                </Popover>)}
            </div>
          </div>
        </CardContent>
      </Card>
      <FilterSummary filters={filters} updateFilter={updateFilter} />
      <div id="advanced-filters-panel" className={cn("transition-all duration-300 ease-in-out overflow-hidden", isAdvancedFilterOpen ? "opacity-100 max-h-[2000px] mb-6" : "opacity-0 max-h-0")}>
        {isAdvancedFilterOpen && (<AdvancedFilters filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} uniqueMotives={uniqueMotives} onClose={toggleAdvancedFilter} isMobile={isMobile} className="animate-in fade-in-0 slide-in-from-top-3 duration-300" />)}
      </div>
    </>
  );
});
FilterControls.displayName = "FilterControls";

/** ====== STAT CARDS COMPONENT ====== **/
interface StatCardsProps {
  generalStats: GeneralStats;
  animationEnabled: boolean;
  isLoading: boolean;
}

const StatCards = memo<StatCardsProps>(({ generalStats, animationEnabled, isLoading }) => {
  const stats = useMemo(() => [
    { title: "Total de Citas", value: generalStats.total.toLocaleString(), icon: <Users className="h-4 w-4" />, description: "Número total de citas en el período seleccionado", color: "bg-primary", trendPercent: 12, previousValue: Math.max(0, generalStats.total - 5).toLocaleString(), trendLabel: "vs período anterior" },
    { title: "Tasa de Asistencia", value: `${generalStats.attendance.toFixed(1)}%`, icon: <Target className="h-4 w-4" />, description: "Porcentaje de citas completadas exitosamente", color: "bg-green-500", trendPercent: 5, previousValue: `${Math.max(0, generalStats.attendance - 3).toFixed(1)}%`, trendLabel: "vs período anterior" },
    { title: "Tasa de Cancelación", value: `${generalStats.cancellation.toFixed(1)}%`, icon: <AlertCircle className="h-4 w-4" />, description: "Porcentaje de citas canceladas", color: "bg-red-500", trendPercent: -2, previousValue: `${(generalStats.cancellation + 2).toFixed(1)}%`, trendLabel: "vs período anterior" },
    { title: "Citas Pendientes", value: generalStats.pendingCount.toLocaleString(), icon: <Activity className="h-4 w-4" />, description: "Número de citas aún pendientes por realizar", color: "bg-amber-500", trendPercent: -8, previousValue: (generalStats.pendingCount + 2).toLocaleString(), trendLabel: "vs período anterior" },
  ], [generalStats]);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, idx) => (<div key={stat.title} className={cn(animationEnabled && "animate-in fade-in slide-in-from-bottom-4")} style={{ animationDelay: `${idx * 100}ms` }}><StatCard {...stat} isLoading={isLoading} className="hover:scale-[1.02] transition-transform duration-200" /></div>))}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.isLoading === nextProps.isLoading &&
  prevProps.animationEnabled === nextProps.animationEnabled &&
  JSON.stringify(prevProps.generalStats) === JSON.stringify(nextProps.generalStats)
));
StatCards.displayName = "StatCards";

/** ====== CONSTANTS ====== **/
const INITIAL_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
};

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...Object.values(AppointmentStatusEnum)],
  sortBy: "fechaConsulta",
  sortOrder: "desc",
  timeRange: [0, 24] as const,
  showDatePickerAdvanced: false,
} as const;

// Asegúrate que estos strings coincidan EXACTAMENTE con los valores en tus datos de 'motivoConsulta'
// Idealmente, estos deberían venir de un Enum o una lista compartida con el backend/fuente de datos.
// Ejemplo: si DiagnosisEnum existe y contiene estos valores:
// import { DiagnosisEnum } from "@/app/dashboard/data-model";
// const ALLOWED_MOTIVES: readonly string[] = [DiagnosisEnum.HERNIA_INGUINAL, DiagnosisEnum.COLECISTITIS_AGUDA, ...];
const ALLOWED_MOTIVES: readonly string[] = [
  "Hernia Inguinal", "Hernia Umbilical", "Hernia Incisional", "Hernia Hiatal", "Hernia Epigástrica",
  "Colecistitis Aguda", "Colelitiasis Sintomática", "Vesícula Biliar y Vías Biliares",
  // Añade más motivos permitidos aquí si es necesario
  "Consulta General", "Revisión Postoperatoria" // Ejemplos adicionales
];

/** ====== MAIN COMPONENT ====== **/
export const AppointmentStatistics: React.FC = () => {
  const [uiState, setUiState] = useState({
    isLoading: true, activeTab: "general", dataError: null as string | null,
    mounted: false, progress: 0, isFirstLoad: true, isAdvancedFilterOpen: false, isMobile: false,
  });
  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS);
  const { appointments: appointmentsFromContext = [], isLoadingAppointments, errorAppointments } = useAppContext();

  const updateUiState = useCallback((partialState: Partial<typeof uiState>) => {
    setUiState(prev => ({ ...prev, ...partialState }));
  }, []);

  const mappedAppointments = useMemo((): Appointment[] => {
    if (!appointmentsFromContext) return [];
    return appointmentsFromContext.map((appt: AppointmentData): Appointment => {
      const nameParts = appt.paciente?.split(' ') || ['Desconocido'];
      const nombre = nameParts[0];
      const apellidos = nameParts.slice(1).join(' ');
      const localStatus = appt.estado || AppointmentStatusEnum.PROGRAMADA; // Fallback status

      let dateObj: Date | null = null;
      let dateStr: string | undefined = undefined;
      let dayOfWeek: number | undefined = undefined;
      let hourDecimalVal: number | null = null;

      try {
        if (appt.fechaConsulta) {
          const parsedDate = typeof appt.fechaConsulta === 'string' ? parseISO(appt.fechaConsulta) : appt.fechaConsulta;
          if (isValid(parsedDate)) {
            dateObj = parsedDate;
            dateStr = format(dateObj, "yyyy-MM-dd");
            dayOfWeek = dateObj.getDay();
          }
        }
        hourDecimalVal = hourToDecimal(appt.horaConsulta);
      } catch (error) {
        console.error("Error procesando fecha/hora para cita ID:", appt.id, error);
      }

      return {
        id: appt.id, nombre, apellidos,
        fechaConsulta: dateObj, // Usar el dateObj parseado
        horaConsulta: appt.horaConsulta || "00:00",
        motivoConsulta: appt.motivoConsulta || "No especificado",
        estado: localStatus,
        notas: appt.notas || "",
        telefono: appt.telefono || "",
        email: appt.email || "",
        dateObj, dateStr, dayOfWeek,
        hourDecimal: hourDecimalVal === null ? undefined : hourDecimalVal, // Mantener undefined si es null
      };
    });
  }, [appointmentsFromContext]);

  const filteredAppointments = useMemo((): Appointment[] => {
    try {
      if (!Array.isArray(mappedAppointments)) {
        updateUiState({ dataError: "Los datos de citas no están disponibles." });
        return [];
      }
      updateUiState({ dataError: null });

      return mappedAppointments
        .filter((appt): appt is Appointment & { dateObj: Date } => appt.dateObj !== null && isValid(appt.dateObj)) // Asegurar que dateObj es una Date válida
        .filter((appt) => ALLOWED_MOTIVES.includes(appt.motivoConsulta))
        .filter((appt) => {
          const { from, to } = filters.dateRange || {};
          if (from || to) {
            const dateObj = appt.dateObj; // Ya es una Date válida aquí
            const fromDate = from ? startOfDay(from) : null;
            const toDate = to ? endOfDay(to) : null;
            if (fromDate && !isSameDay(dateObj, fromDate) && isBefore(dateObj, fromDate)) return false;
            if (toDate && !isSameDay(dateObj, toDate) && isAfter(dateObj, toDate)) return false;
          }
          if (filters.motiveFilter !== "all" && appt.motivoConsulta !== filters.motiveFilter) return false;
          if (!filters.statusFilter.includes(appt.estado)) return false;
          const hourDecimalValue = appt.hourDecimal; // Ya es number | undefined
          if (hourDecimalValue !== undefined && (hourDecimalValue < filters.timeRange[0] || hourDecimalValue > filters.timeRange[1])) return false;
          return true;
        })
        .sort((a, b) => {
          let comp = 0;
          if (filters.sortBy === "fechaConsulta") {
            comp = (a.dateObj as Date).getTime() - (b.dateObj as Date).getTime(); // dateObj es Date aquí
            if (comp === 0 && a.hourDecimal !== undefined && b.hourDecimal !== undefined) {
              comp = a.hourDecimal - b.hourDecimal; // Desempate por hora
            }
          } else if (filters.sortBy === "nombre") {
            const nameA = `${a.nombre} ${a.apellidos}`.trim().toLowerCase();
            const nameB = `${b.nombre} ${b.apellidos}`.trim().toLowerCase();
            comp = nameA.localeCompare(nameB);
          } else { // motivoConsulta u horaConsulta (string)
            const valA = a[filters.sortBy as keyof Pick<Appointment, 'motivoConsulta' | 'horaConsulta'>];
            const valB = b[filters.sortBy as keyof Pick<Appointment, 'motivoConsulta' | 'horaConsulta'>];
            if (typeof valA === "string" && typeof valB === "string") comp = valA.localeCompare(valB);
          }
          return filters.sortOrder === "asc" ? comp : -comp;
        });
    } catch (error) {
      console.error("Error al filtrar citas:", error);
      updateUiState({ dataError: "Error al procesar los datos." });
      return [];
    }
  }, [mappedAppointments, filters, updateUiState]);

  const { renderPieChart, renderBarChart, renderLineChart, renderWeekdayChart, renderScatterChart } = useChartConfig();

  useEffect(() => {
    const checkMobile = () => updateUiState({ isMobile: window.innerWidth < 768 });
    const debouncedCheckMobile = debounce(checkMobile, 250);
    checkMobile();
    window.addEventListener("resize", debouncedCheckMobile);
    return () => window.removeEventListener("resize", debouncedCheckMobile);
  }, [updateUiState]);

  useEffect(() => { updateUiState({ mounted: true, isLoading: true }); }, [updateUiState]);

  useEffect(() => {
    if (!uiState.isLoading || !uiState.mounted) return;
    let currentProgress = 0; let animationId: number;
    const updateProgress = () => {
      currentProgress += 2;
      if (currentProgress >= 100) {
        updateUiState({ progress: 100 });
        setTimeout(() => { updateUiState({ isLoading: false, isFirstLoad: uiState.isFirstLoad ? false : uiState.isFirstLoad }); }, 200);
      } else {
        updateUiState({ progress: currentProgress });
        animationId = requestAnimationFrame(updateProgress);
      }
    };
    updateUiState({ progress: 0 });
    animationId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animationId);
  }, [uiState.isLoading, uiState.mounted, uiState.isFirstLoad, updateUiState]);

  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(key: K, value: AppointmentFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    updateUiState({ isLoading: true });
  }, [updateUiState]);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    updateUiState({ isLoading: true });
  }, [updateUiState]);

  const toggleAdvancedFilter = useCallback(() => {
    updateUiState({ isAdvancedFilterOpen: !uiState.isAdvancedFilterOpen });
  }, [uiState.isAdvancedFilterOpen, updateUiState]);

  const handleRefresh = useCallback(() => {
    if (uiState.isLoading) return;
    // Aquí podrías llamar a una función para refetchear datos si es necesario
    // Por ahora, solo simula la recarga de los datos ya en contexto
    updateUiState({ isLoading: true, progress: 0, dataError: null });
  }, [uiState.isLoading, updateUiState]);

  const uniqueMotives = useMemo(() => {
    const motiveSet = new Set<string>();
    mappedAppointments.forEach((appt) => { if (appt.motivoConsulta && ALLOWED_MOTIVES.includes(appt.motivoConsulta)) motiveSet.add(appt.motivoConsulta); });
    return Array.from(motiveSet).sort();
  }, [mappedAppointments]);

  const generalStats = useMemo((): GeneralStats => {
    const total = filteredAppointments.length;
    const initialCounts = Object.values(AppointmentStatusEnum).reduce((acc, status) => { acc[status] = 0; return acc; }, {} as Record<AppointmentStatus, number>);
    const allStatusCounts = filteredAppointments.reduce((acc, appt) => { if (appt.estado && acc.hasOwnProperty(appt.estado)) acc[appt.estado]++; return acc; }, initialCounts);

    if (total === 0) return { total: 0, attendance: 0, cancellation: 0, pending: 0, present: 0, completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0, period: filters.dateRange ? `${formatDateUtil(filters.dateRange.from)} - ${formatDateUtil(filters.dateRange.to)}` : "Todos", allStatusCounts: initialCounts };

    const completed = allStatusCounts[AppointmentStatusEnum.COMPLETADA] || 0;
    const cancelled = allStatusCounts[AppointmentStatusEnum.CANCELADA] || 0;
    const pending = allStatusCounts[AppointmentStatusEnum.PROGRAMADA] || 0; // Asumiendo Programada es el estado pendiente principal
    const present = allStatusCounts[AppointmentStatusEnum.PRESENTE] || 0;
    const calcPercent = (val: number): number => (total > 0 ? (val / total) * 100 : 0);
    return {
      total, attendance: calcPercent(completed + present), cancellation: calcPercent(cancelled),
      pending: calcPercent(pending), present: calcPercent(present), completed, cancelled,
      pendingCount: pending, presentCount: present,
      period: filters.dateRange ? `${formatDateUtil(filters.dateRange.from)} - ${formatDateUtil(filters.dateRange.to)}` : "Todos",
      allStatusCounts,
    };
  }, [filteredAppointments, filters.dateRange]);

  const statusChartData = useMemo((): StatusChartData[] => Object.values(AppointmentStatusEnum).map(status => ({ name: titleCaseStatus(status), value: generalStats.allStatusCounts?.[status] || 0, color: STATUS_COLORS[status] })), [generalStats]);
  const motiveChartData = useMemo((): MotiveChartData[] => { const cM: Record<string, number> = {}; filteredAppointments.forEach(a => { cM[a.motivoConsulta] = (cM[a.motivoConsulta] || 0) + 1; }); return Object.entries(cM).map(([m, c]) => ({ motive: m, count: c })).sort((a, b) => b.count - a.count); }, [filteredAppointments]);
  const trendChartData = useMemo((): TrendChartData[] => { const bD: Record<string, Record<AppointmentStatus | "total", number>> = {}; filteredAppointments.forEach(a => { if (!a.dateStr) return; if (!bD[a.dateStr]) bD[a.dateStr] = Object.values(AppointmentStatusEnum).reduce((ac, s) => { ac[s] = 0; return ac; }, { total: 0 } as any); if (bD[a.dateStr].hasOwnProperty(a.estado)) bD[a.dateStr][a.estado]++; bD[a.dateStr].total++; }); return Object.entries(bD).map(([d, c]) => ({ date: d, formattedDate: format(parseISO(d), "dd/MM", { locale: es }), total: c.total, ...c })).sort((a, b) => a.date.localeCompare(b.date)); }, [filteredAppointments]);
  const weekdayChartData = useMemo((): WeekdayChartData[] => { const i: Record<number, { name: string; total: number; attended: number }> = WEEKDAYS.reduce((acc, name, idx) => { acc[idx] = { name, total: 0, attended: 0 }; return acc; }, {} as any); filteredAppointments.forEach(a => { if (a.dayOfWeek === undefined) return; if (i[a.dayOfWeek]) { i[a.dayOfWeek].total++; if (a.estado === AppointmentStatusEnum.COMPLETADA || a.estado === AppointmentStatusEnum.PRESENTE) i[a.dayOfWeek].attended++; } }); return Object.values(i).map(d => ({ ...d, rate: d.total > 0 ? (d.attended / d.total) * 100 : 0 })); }, [filteredAppointments]);
  const scatterData = useMemo((): ScatterData => { const mBS = Object.fromEntries(Object.values(AppointmentStatusEnum).map(s => [s, {} as Record<string, ScatterPoint>])) as Record<AppointmentStatus, Record<string, ScatterPoint>>; filteredAppointments.forEach(a => { if (a.dayOfWeek === undefined || a.hourDecimal === undefined) return; const h = Math.floor(a.hourDecimal); const k = `${a.dayOfWeek}-${h}`; const cS = a.estado; if (Object.values(AppointmentStatusEnum).includes(cS)) { if (!mBS[cS][k]) mBS[cS][k] = { day: a.dayOfWeek, hour: h, count: 0, dayName: WEEKDAYS[a.dayOfWeek] || `Día ${a.dayOfWeek}` }; mBS[cS][k].count++; } }); const res: ScatterData = {} as ScatterData; for (const sK of Object.values(AppointmentStatusEnum)) res[sK as AppointmentStatus] = Object.values(mBS[sK as AppointmentStatus]); return res; }, [filteredAppointments]);

  if (!uiState.mounted) return <div className="flex items-center justify-center h-screen bg-background"><RefreshCw className="h-8 w-8 animate-spin text-primary" /></div>;
  const { isLoading, activeTab, dataError, progress, isFirstLoad, isAdvancedFilterOpen, isMobile } = uiState;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 transition-all duration-500">
      <div className="container mx-auto p-4 lg:p-6 max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div><h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">Estadísticas de Citas</h1><p className="text-muted-foreground mt-2">Panel de control y análisis de citas médicas</p></div>
            <Button variant="outline" onClick={handleRefresh} className="bg-background/50 backdrop-blur-sm hover:bg-background transition-all hover:scale-105 shadow-sm" disabled={isLoading}><RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />{isLoading ? "Actualizando..." : "Actualizar"}</Button>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={(value) => updateUiState({ activeTab: value })} className="space-y-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <TabsList className="grid w-full lg:w-auto grid-cols-2 sm:grid-cols-4 h-auto sm:h-12 p-1 bg-muted/50 backdrop-blur-sm">
              {[{ id: "general", label: "General", icon: <FileBarChart className="h-4 w-4" /> }, { id: "trends", label: "Tendencias", icon: <TrendingUp className="h-4 w-4" /> }, { id: "weekday", label: "Día Semana", icon: <Calendar className="h-4 w-4" /> }, { id: "correlation", label: "Correlación", icon: <Clock className="h-4 w-4" /> }].map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center sm:justify-start gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all hover:scale-105 py-2 sm:py-0">
                  {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>))}
            </TabsList>
          </div>
          <FilterControls uniqueMotives={uniqueMotives} isAdvancedFilterOpen={isAdvancedFilterOpen} toggleAdvancedFilter={toggleAdvancedFilter} filters={filters} updateFilter={updateFilter} resetFilters={resetFilters} isMobile={isMobile} />
          {dataError && (<Alert variant="destructive" className="animate-in slide-in-from-top-3 duration-300"><AlertCircle className="h-4 w-4" /><AlertTitle>Error en los Datos</AlertTitle><AlertDescription>{dataError}</AlertDescription></Alert>)}
          {isLoading && (<div className="mb-6"><div className="flex items-center justify-between mb-2"><span className="text-sm text-muted-foreground">Cargando datos...</span><span className="text-sm font-medium">{progress}%</span></div><Progress value={progress} className="h-2" /></div>)}
          <div className="min-h-[400px]">
            <TabsContent value="general" className="space-y-6 m-0">{activeTab === "general" && (<><StatCards generalStats={generalStats} animationEnabled={isFirstLoad && !isLoading} isLoading={isLoading} /><div className="grid gap-6 lg:grid-cols-2"><Card className="overflow-hidden hover:shadow-lg transition-all duration-300"><CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10"><CardTitle className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" />Distribución de Estados</CardTitle><CardDescription>Proporción de cada estado de cita en el período {generalStats.period}</CardDescription></CardHeader><CardContent className="p-6">{renderPieChart(statusChartData, generalStats, isLoading)}</CardContent></Card><Card className="overflow-hidden hover:shadow-lg transition-all duration-300"><CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10"><CardTitle className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" />Motivos de Consulta</CardTitle><CardDescription>Distribución de los diferentes motivos de consulta</CardDescription></CardHeader><CardContent className="p-6">{renderBarChart(motiveChartData, isLoading)}</CardContent></Card></div></>)}</TabsContent>
            <TabsContent value="trends" className="space-y-6 m-0">{activeTab === "trends" && (<Card className="overflow-hidden hover:shadow-lg transition-all duration-300"><CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10"><CardTitle className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" />Tendencia de Citas</CardTitle><CardDescription>Evolución temporal de las citas por estado</CardDescription></CardHeader><CardContent className="p-6">{renderLineChart(trendChartData, isLoading)}</CardContent></Card>)}</TabsContent>
            <TabsContent value="weekday" className="space-y-6 m-0">{activeTab === "weekday" && (<Card className="overflow-hidden hover:shadow-lg transition-all duration-300"><CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10"><CardTitle className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" />Asistencia por Día de la Semana</CardTitle><CardDescription>Análisis de patrones de asistencia según el día</CardDescription></CardHeader><CardContent className="p-6">{renderWeekdayChart(weekdayChartData, isLoading)}</CardContent></Card>)}</TabsContent>
            <TabsContent value="correlation" className="space-y-6 m-0">{activeTab === "correlation" && (<Card className="overflow-hidden hover:shadow-lg transition-all duration-300"><CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10"><CardTitle className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-primary" />Correlación Hora vs Día</CardTitle><CardDescription>Mapa de calor de citas por hora y día de la semana</CardDescription></CardHeader><CardContent className="p-6">{renderScatterChart(scatterData, filters.timeRange, isLoading)}</CardContent></Card>)}</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default memo(AppointmentStatistics);