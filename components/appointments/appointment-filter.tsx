import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react"
import { format, subDays} from "date-fns"
import { es } from "date-fns/locale"
import { DayPicker } from "react-day-picker"
import "react-day-picker/dist/style.css"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { CalendarIcon, Filter, X, ChevronDown, ChevronUp, Search } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

// Tipos estrictos y constantes
export const APPOINTMENT_STATUSES = [
  'COMPLETADA', 'CANCELADA', 'PROGRAMADA', 'PRESENTE', 'REAGENDADA', 'NO ASISTIO', 'CONFIRMADA'
] as const

export const APPOINTMENT_SORT_KEYS = [
  'fechaConsulta', 'horaConsulta', 'nombre', 'motivoConsulta'
] as const

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[number]
export type AppointmentSortKey = typeof APPOINTMENT_SORT_KEYS[number]
export type SortOrder = "asc" | "desc"

export interface DateRange {
  from: Date | null
  to: Date | null
}

export interface Appointment {
  readonly id: string
  readonly nombre: string
  readonly apellidos: string
  readonly fechaConsulta: string
  readonly horaConsulta: string
  readonly motivoConsulta: string
  readonly estado: AppointmentStatus
  readonly notas: string
  readonly duracion?: number
  readonly costoConsulta?: number
  readonly seguroMedico?: string
  readonly telefono?: string
  readonly email?: string
  readonly patientId?: string
}

export interface AppointmentFilters {
  dateRange: DateRange | undefined
  motiveFilter: string
  statusFilter: readonly AppointmentStatus[]
  searchTerm: string
  sortBy: AppointmentSortKey
  sortOrder: SortOrder
  timeRange: readonly [number, number]
  showDatePickerAdvanced?: boolean
}

interface AdvancedFiltersProps {
  readonly filters: AppointmentFilters
  readonly updateFilter: <K extends keyof AppointmentFilters>(
    key: K, 
    value: AppointmentFilters[K]
  ) => void
  readonly resetFilters: () => void
  readonly uniqueMotives: readonly string[]
  readonly onClose: () => void
  readonly className?: string
}

interface FilterSummaryProps {
  readonly filters: AppointmentFilters
  readonly updateFilter: <K extends keyof AppointmentFilters>(
    key: K, 
    value: AppointmentFilters[K]
  ) => void
  readonly className?: string
}

// Utilidades optimizadas
export const formatDate = (
  date: Date | string | undefined, 
  formatStr = "dd/MM/yyyy"
): string => {
  if (!date) return "Fecha no definida"
  
  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    // Validación explícita
    if (Number.isNaN(dateObj.getTime())) return "Fecha inválida"
    
    return format(dateObj, formatStr, { locale: es })
  } catch (error) {
    console.error("Error al formatear fecha:", error)
    return "Error de formato"
  }
}

export const hourToDecimal = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0
  
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) {
    console.warn(`Formato de hora inválido: ${timeStr}`)
    return 0
  }
  
  const hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    console.warn(`Valores de hora fuera de rango: ${hours}:${minutes}`)
    return 0
  }
  
  return hours + (minutes / 60)
}

// Componente de filtros avanzados optimizado
export const AdvancedFilters = memo<AdvancedFiltersProps>(({
  filters,
  updateFilter,
  resetFilters,
  uniqueMotives,
  onClose,
  className = ""
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const handleStatusChange = useCallback((
    status: AppointmentStatus, 
    checked: boolean
  ) => {
    const newStatusFilter = checked
      ? [...filters.statusFilter, status]
      : filters.statusFilter.filter(s => s !== status)
    
    updateFilter("statusFilter", newStatusFilter)
  }, [filters.statusFilter, updateFilter])

  const handleDateRangeSelect = useCallback((range: DateRange | undefined) => {
    updateFilter("dateRange", range)
  }, [updateFilter])

  const toggleDatePicker = useCallback(() => {
    updateFilter("showDatePickerAdvanced", !filters.showDatePickerAdvanced)
  }, [filters.showDatePickerAdvanced, updateFilter])

  // Evitar renderizados innecesarios del DatePicker
  const datePickerKey = useMemo(() => 
    `${filters.dateRange?.from?.getTime() || 0}-${filters.dateRange?.to?.getTime() || 0}`,
    [filters.dateRange]
  )

  const confirmReset = useCallback(() => {
    resetFilters()
    toast.success("Filtros restablecidos")
    setShowResetConfirm(false)
  }, [resetFilters])

  return (
    <>
      <div
        className={cn(
          "bg-white dark:bg-gray-950 rounded-lg shadow-sm border p-4 mb-4",
          "transition-all duration-200",
          className
        )}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" aria-hidden="true" />
            Filtros Avanzados
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Cerrar filtros"
            className="hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Selector de rango de fechas */}
          <div className="space-y-2">
            <Label htmlFor="dateRangeAdvanced" className="font-medium">
              Rango de Fechas
            </Label>
            <div className="relative">
              <Button
                id="dateRangeAdvanced"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !filters.dateRange?.from && "text-muted-foreground",
                  "pr-8"
                )}
                onClick={toggleDatePicker}
                aria-haspopup="true"
                aria-expanded={filters.showDatePickerAdvanced}
              >
                <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                {filters.dateRange?.from ? (
                  filters.dateRange.to ? (
                    <>
                      {formatDate(filters.dateRange.from)} - {formatDate(filters.dateRange.to)}
                    </>
                  ) : (
                    formatDate(filters.dateRange.from)
                  )
                ) : (
                  <span>Seleccionar rango de fechas</span>
                )}
              </Button>
              
              {filters.dateRange?.from && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
                  onClick={() => updateFilter("dateRange", undefined)}
                  aria-label="Limpiar fechas"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </Button>
              )}
              
              {filters.showDatePickerAdvanced && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 sm:relative sm:inset-auto sm:bg-transparent">
                  <div className="bg-popover shadow-lg rounded-md border p-3 w-auto max-w-[95vw] sm:max-w-none sm:absolute sm:mt-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-2 top-2 sm:hidden"
                      onClick={() => updateFilter("showDatePickerAdvanced", false)}
                      aria-label="Cerrar calendario"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <DayPicker
                      key={datePickerKey}
                      mode="range"
                      defaultMonth={filters.dateRange?.from || new Date()}
                      selected={filters.dateRange as any}
                      onSelect={handleDateRangeSelect as any}
                      locale={es}
                      numberOfMonths={2}
                      disabled={{ after: new Date() }}
                      className="rounded-md"
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
                              updateFilter("dateRange", undefined)
                              updateFilter("showDatePickerAdvanced", false)
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
                </div>
              )}
            </div>
          </div>

          {/* Filtro de motivo */}
          <div className="space-y-2">
            <Label htmlFor="motiveFilterAdvanced" className="font-medium">
              Motivo de Consulta
            </Label>
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

          {/* Estados de cita */}
          <div className="space-y-2 md:col-span-2">
            <Label className="font-medium">Estado de Cita</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mt-2">
              {APPOINTMENT_STATUSES.map((status) => (
                <div key={status} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status}`}
                    checked={filters.statusFilter.includes(status)}
                    onCheckedChange={(checked) => 
                      handleStatusChange(status, !!checked)
                    }
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

          {/* Información de horario */}
          <div className="space-y-2">
            <Label className="font-medium">Horario de consulta</Label>
            <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
              <p>Las consultas se realizan de lunes a sábado de 9:00 am a 2:00 pm.</p>
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="space-y-2">
            <Label className="font-medium">Ordenar Por</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => 
                  updateFilter("sortBy", value as AppointmentSortKey)
                }
              >
                <SelectTrigger aria-label="Campo para ordenar">
                  <SelectValue placeholder="Campo" />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_SORT_KEYS.map(key => (
                    <SelectItem key={key} value={key}>
                      {key === 'fechaConsulta' ? 'Fecha' :
                        key === 'horaConsulta' ? 'Hora' :
                          key === 'nombre' ? 'Nombre' : 'Motivo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => 
                  updateFilter("sortOrder", value as SortOrder)
                }
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

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowResetConfirm(true)}
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

      {/* Confirmación para restablecer filtros */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer todos los filtros?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción restablecerá todos los filtros a sus valores predeterminados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

AdvancedFilters.displayName = "AdvancedFilters"

// Componente de resumen de filtros optimizado
export const FilterSummary = memo<FilterSummaryProps>(({
  filters,
  updateFilter,
  className = ""
}) => {
  const activeFiltersCount = useMemo(() => {
    const allStatusesSelected = filters.statusFilter.length === APPOINTMENT_STATUSES.length
    
    return (
      (filters.dateRange?.from ? 1 : 0) +
      (filters.motiveFilter !== "all" ? 1 : 0) +
      (!allStatusesSelected && filters.statusFilter.length > 0 ? 1 : 0) +
      (filters.searchTerm !== "" ? 1 : 0)
    )
  }, [filters])

  if (activeFiltersCount === 0) return null

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 mb-4 items-center",
        "animate-in fade-in-0 slide-in-from-top-2",
        className
      )}
      role="region"
      aria-label="Filtros aplicados"
    >
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filtros aplicados:
      </span>
      
      {filters.dateRange?.from && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          <CalendarIcon className="h-3 w-3" aria-hidden="true" />
          {formatDate(filters.dateRange.from)}
          {filters.dateRange.to && ` - ${formatDate(filters.dateRange.to)}`}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("dateRange", undefined)}
            aria-label="Eliminar filtro de fechas"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        </Badge>
      )}
      
      {filters.motiveFilter !== "all" && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Motivo: {filters.motiveFilter}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("motiveFilter", "all")}
            aria-label={`Eliminar filtro de motivo: ${filters.motiveFilter}`}
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        </Badge>
      )}
      
      {filters.statusFilter.length > 0 && 
       filters.statusFilter.length < APPOINTMENT_STATUSES.length && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Estados: {filters.statusFilter
            .map(s => s.replace(/_/g, " "))
            .slice(0, 2)
            .join(", ")}
          {filters.statusFilter.length > 2 && 
            ` y ${filters.statusFilter.length - 2} más`}
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("statusFilter", [...APPOINTMENT_STATUSES])}
            aria-label="Restablecer filtros de estado"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        </Badge>
      )}
      
      {filters.searchTerm && (
        <Badge variant="secondary" className="flex items-center gap-1 group py-1.5">
          Búsqueda: "{filters.searchTerm.length > 15
            ? `${filters.searchTerm.substring(0, 15)}...`
            : filters.searchTerm}"
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0 ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
            onClick={() => updateFilter("searchTerm", "")}
            aria-label="Eliminar término de búsqueda"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </Button>
        </Badge>
      )}
    </div>
  )
})

FilterSummary.displayName = "FilterSummary"

// Hook principal optimizado
const INITIAL_DATE_RANGE: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
}

const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: INITIAL_DATE_RANGE,
  motiveFilter: "all",
  statusFilter: [...APPOINTMENT_STATUSES],
  searchTerm: "",
  sortBy: 'fechaConsulta',
  sortOrder: 'desc',
  timeRange: [0, 24] as const,
  showDatePickerAdvanced: false,
} as const

export const useAppointmentFilters = (
  savedFilters?: Partial<AppointmentFilters>
) => {
  const [filters, setFilters] = useState<AppointmentFilters>(() => ({
    ...INITIAL_FILTERS,
    ...savedFilters,
    statusFilter: savedFilters?.statusFilter || [...INITIAL_FILTERS.statusFilter],
  }))
  
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  const resizeTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const checkMobile = () => {
      clearTimeout(resizeTimeoutRef.current)
      resizeTimeoutRef.current = setTimeout(() => {
        setIsMobile(window.innerWidth < 768)
      }, 100)
    }

    setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', checkMobile, { passive: true })
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(resizeTimeoutRef.current)
    }
  }, [])

  const updateFilter = useCallback(<K extends keyof AppointmentFilters>(
    key: K,
    value: AppointmentFilters[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS)
  }, [])

  const toggleAdvancedFilter = useCallback(() => {
    setIsAdvancedFilterOpen(prev => !prev)
  }, [])

  const FilterControls = memo<{ 
    uniqueMotives: readonly string[]
    className?: string 
  }>(({ uniqueMotives, className = "" }) => {
    const buttonClasses = cn(
      "transition-colors",
      isAdvancedFilterOpen && "bg-primary text-primary-foreground hover:bg-primary/90"
    )

    return (
      <>
        <div className={cn(
          "bg-white dark:bg-gray-950 rounded-lg p-4 mb-4 shadow-sm border",
          className
        )}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAdvancedFilter}
                className={buttonClasses}
                aria-expanded={isAdvancedFilterOpen}
                aria-controls="advanced-filters-panel"
                aria-label={isAdvancedFilterOpen ? "Ocultar filtros avanzados" : "Mostrar filtros avanzados"}
              >
                <Filter className="h-4 w-4 mr-2" aria-hidden="true" />
                {isAdvancedFilterOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
                {isAdvancedFilterOpen ? 
                  <ChevronUp className="ml-1 h-3 w-3" aria-hidden="true" /> : 
                  <ChevronDown className="ml-1 h-3 w-3" aria-hidden="true" />
                }
              </Button>

              {!isMobile && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9",
                        !filters.dateRange?.from && "text-muted-foreground"
                      )}
                      aria-label="Seleccionar rango de fechas"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {filters.dateRange?.from ? (
                        filters.dateRange.to ? (
                          <>
                            {formatDate(filters.dateRange.from)} - 
                            {formatDate(filters.dateRange.to)}
                          </>
                        ) : (
                          formatDate(filters.dateRange.from)
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
                        defaultMonth={filters.dateRange?.from || new Date()}
                        selected={filters.dateRange as any}
                        onSelect={(range: DateRange | undefined) => updateFilter("dateRange", range)}
                        locale={es}
                        numberOfMonths={2}
                        disabled={{ after: new Date() }}
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
              )}
            </div>

            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input
                type="search"
                placeholder="Buscar paciente..."
                className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-9"
                value={filters.searchTerm}
                onChange={(e) => updateFilter("searchTerm", e.target.value)}
                aria-label="Buscar paciente"
              />
            </div>
          </div>
        </div>

        <FilterSummary filters={filters} updateFilter={updateFilter} />

        <div
          id="advanced-filters-panel"
          style={{
            opacity: isAdvancedFilterOpen ? 1 : 0,
            maxHeight: isAdvancedFilterOpen ? '1000px' : '0',
            overflow: 'hidden',
            transition: 'opacity 200ms ease-in-out, max-height 300ms ease-in-out'
          }}
          aria-hidden={!isAdvancedFilterOpen}
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
    )
  })

  FilterControls.displayName = "FilterControls"

  return {
    filters,
    updateFilter,
    resetFilters,
    isAdvancedFilterOpen,
    setIsAdvancedFilterOpen,
    toggleAdvancedFilter,
    FilterControls,
    isMobile
  }
}

export default useAppointmentFilters