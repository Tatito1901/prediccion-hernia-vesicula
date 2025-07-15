// filter-controls.tsx - Versión refactorizada con utilidades integradas
import React, { memo, useMemo, useCallback } from "react";
import {
  Search, RefreshCcw, X, Filter, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { AppointmentStatusEnum, type AppointmentStatus } from "@/lib/types";

// ==================== UTILIDADES INTEGRADAS ====================

// Configuración de estados centralizada
const STATUS_CONFIGS = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    color: "slate"
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada", 
    color: "blue"
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En Consulta",
    color: "emerald"
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    color: "green"
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    color: "red"
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No Asistió",
    color: "amber"
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    color: "purple"
  },
} as const;

// Opciones de estado para el select optimizadas
const STATUS_OPTIONS = [
  { value: "all" as const, label: "Todos los Estados" },
  ...Object.entries(STATUS_CONFIGS).map(([status, config]) => ({
    value: status as AppointmentStatus,
    label: config.label,
  }))
] as const;

// ==================== TIPOS ====================

interface FilterState {
  searchTerm: string;
  statusFilter: AppointmentStatus | 'all';
}

interface FilterControlsProps {
  readonly filters: FilterState;
  readonly onUpdateFilters: (filters: Partial<FilterState>) => void;
  readonly onClearFilters: () => void;
  readonly onRefresh: () => void;
  readonly isLoading?: boolean;
  readonly isMobile?: boolean;
  readonly className?: string;
}

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

// Componente de entrada de búsqueda optimizado
const SearchInput = memo<{
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}>(({ value, onChange, disabled, className }) => {
  const handleClear = useCallback(() => onChange(""), [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none transition-colors duration-200" />
      <Input
        type="text"
        placeholder="Buscar por nombre del paciente..."
        className="pl-10 h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 transition-all duration-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Buscar paciente"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Limpiar búsqueda"
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
});

SearchInput.displayName = "SearchInput";

// Componente de selector de estado optimizado
const StatusSelect = memo<{
  value: AppointmentStatus | "all";
  onChange: (value: AppointmentStatus | "all") => void;
  disabled?: boolean;
  className?: string;
}>(({ value, onChange, disabled, className }) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className={cn(
      "h-11 gap-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 transition-all duration-200",
      "focus:border-blue-500 focus:ring-blue-500/20",
      className
    )}>
      <Filter size={16} className="text-slate-500 transition-colors duration-200" />
      <SelectValue placeholder="Filtrar por estado" />
    </SelectTrigger>
    <SelectContent>
      {STATUS_OPTIONS.map(({ value: optionValue, label }) => (
        <SelectItem 
          key={optionValue} 
          value={optionValue}
          className="transition-colors duration-200"
        >
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

StatusSelect.displayName = "StatusSelect";

// Componente de botones de acción optimizado
const ActionButtons = memo<{
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading?: boolean;
  className?: string;
}>(({ hasActiveFilters, onClearFilters, onRefresh, isLoading, className }) => (
  <div className={cn("flex gap-2", className)}>
    {hasActiveFilters && (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClearFilters}
        className="h-11 w-11 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
        title="Limpiar filtros"
        aria-label="Limpiar filtros"
      >
        <X size={16} />
      </Button>
    )}
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onRefresh}
      disabled={isLoading}
      className="h-11 w-11 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
      title="Actualizar lista"
      aria-label="Actualizar lista"
    >
      <RefreshCcw className={cn("h-4 w-4 transition-transform duration-200", isLoading && "animate-spin")} />
    </Button>
  </div>
));

ActionButtons.displayName = "ActionButtons";

// Versión desktop optimizada
const DesktopFilterControls = memo<{
  filters: FilterState;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | "all") => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  className?: string;
}>(({ 
  filters, 
  hasActiveFilters, 
  onSearchChange, 
  onStatusChange, 
  onClearFilters, 
  onRefresh, 
  isLoading, 
  className 
}) => (
  <div className={cn(
    "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
    "bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800",
    "border-slate-200 dark:border-slate-700",
    hasActiveFilters && "ring-2 ring-blue-500/20 border-blue-300 dark:border-blue-700 shadow-lg",
    "hover:shadow-md",
    className
  )}>
    <SearchInput
      value={filters.searchTerm}
      onChange={onSearchChange}
      disabled={isLoading}
      className="flex-1 min-w-0"
    />
    
    <StatusSelect
      value={filters.statusFilter}
      onChange={onStatusChange}
      disabled={isLoading}
      className="w-48"
    />
    
    <ActionButtons
      hasActiveFilters={hasActiveFilters}
      onClearFilters={onClearFilters}
      onRefresh={onRefresh}
      isLoading={isLoading}
    />
  </div>
));

DesktopFilterControls.displayName = "DesktopFilterControls";

// Versión mobile con collapsible optimizada
const MobileFilterControls = memo<{
  filters: FilterState;
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AppointmentStatus | "all") => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  className?: string;
}>(({ 
  filters, 
  hasActiveFilters, 
  onSearchChange, 
  onStatusChange, 
  onClearFilters, 
  onRefresh, 
  isLoading, 
  className 
}) => (
  <div className={cn("space-y-3", className)}>
    <Collapsible>
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-300",
        "bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800",
        "border-slate-200 dark:border-slate-700",
        hasActiveFilters && "ring-2 ring-blue-500/20 border-blue-300 dark:border-blue-700 shadow-lg"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Filtros
            </span>
          </div>
          
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 transition-all duration-200"
            >
              Activos
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ActionButtons
            hasActiveFilters={hasActiveFilters}
            onClearFilters={onClearFilters}
            onRefresh={onRefresh}
            isLoading={isLoading}
          />
          
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 transition-all duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent className="transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <SearchInput
            value={filters.searchTerm}
            onChange={onSearchChange}
            disabled={isLoading}
          />
          
          <StatusSelect
            value={filters.statusFilter}
            onChange={onStatusChange}
            disabled={isLoading}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  </div>
));

MobileFilterControls.displayName = "MobileFilterControls";

// ==================== COMPONENTE PRINCIPAL ====================

export const FilterControls = memo<FilterControlsProps>(({
  filters,
  onUpdateFilters,
  onClearFilters,
  onRefresh,
  isLoading = false,
  isMobile = false,
  className,
}) => {
  // Memoizar el estado de filtros activos
  const hasActiveFilters = useMemo(() => 
    filters.searchTerm !== "" || filters.statusFilter !== "all",
    [filters.searchTerm, filters.statusFilter]
  );

  // Handlers memoizados para evitar recreaciones
  const handleSearchChange = useCallback((searchTerm: string) => {
    onUpdateFilters({ searchTerm });
  }, [onUpdateFilters]);

  const handleStatusChange = useCallback((statusFilter: AppointmentStatus | "all") => {
    onUpdateFilters({ statusFilter });
  }, [onUpdateFilters]);

  // Props comunes memoizadas
  const commonProps = useMemo(() => ({
    filters,
    hasActiveFilters,
    onSearchChange: handleSearchChange,
    onStatusChange: handleStatusChange,
    onClearFilters,
    onRefresh,
    isLoading,
    className
  }), [
    filters,
    hasActiveFilters,
    handleSearchChange,
    handleStatusChange,
    onClearFilters,
    onRefresh,
    isLoading,
    className
  ]);

  // Renderizar versión apropiada según el dispositivo
  return isMobile ? (
    <MobileFilterControls {...commonProps} />
  ) : (
    <DesktopFilterControls {...commonProps} />
  );
});

FilterControls.displayName = "FilterControls";