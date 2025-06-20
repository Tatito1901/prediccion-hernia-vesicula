import React, {
  useState,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  Search,
  RefreshCcw,
  X,
  ChevronDown,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useBreakpointStore } from "@/hooks/use-breakpoint";

// =================================================================
// TIPOS OPTIMIZADOS
// =================================================================
export interface FilterState {
  searchTerm: string;
  statusFilter: string;
}

export type AppointmentStatus = "PRESENTE" | "CANCELADA" | "COMPLETADA" | "PROGRAMADA" | "NO_ASISTIO" | "REAGENDADA" | "CONFIRMADA";

export interface FilterControlsProps {
  filters: FilterState;
  onUpdateFilters: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

// =================================================================
// CONFIGURACIONES ESTÁTICAS PARA EVITAR RE-CREACIONES
// =================================================================
const STATUS_CONFIG = {
  PRESENTE: { label: "En espera" },
  CANCELADA: { label: "Cancelada" },
  COMPLETADA: { label: "Completada" },
  PROGRAMADA: { label: "Programada" },
  NO_ASISTIO: { label: "No Asistió" },
  REAGENDADA: { label: "Reagendada" },
  CONFIRMADA: { label: "Confirmada" },
} as const;

// Opciones para el select estático
const STATUS_OPTIONS = [
  { value: "all", label: "Todos los Estados" },
  ...Object.entries(STATUS_CONFIG).map(([key, { label }]) => ({
    value: key,
    label,
  }))
] as const;

// =================================================================
// COMPONENTES MEMOIZADOS PARA RENDIMIENTO
// =================================================================
const SearchInput = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean;
}) => (
  <div className="relative flex-1 min-w-0">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
    <Input
      type="text"
      placeholder="Buscar paciente..."
      className="pl-10 h-11"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Buscar paciente"
      disabled={disabled}
    />
  </div>
));

SearchInput.displayName = "SearchInput";

const StatusSelect = memo(({ 
  value, 
  onChange, 
  disabled 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  disabled?: boolean;
}) => (
  <Select value={value} onValueChange={onChange} disabled={disabled}>
    <SelectTrigger className="w-full sm:w-48 h-11 gap-2" aria-label="Filtrar por estado">
      <Filter size={16} className="text-slate-500" />
      <SelectValue placeholder="Estado" />
    </SelectTrigger>
    <SelectContent>
      {STATUS_OPTIONS.map(({ value: optionValue, label }) => (
        <SelectItem key={optionValue} value={optionValue}>
          {label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
));

StatusSelect.displayName = "StatusSelect";

const ActionButtons = memo(({ 
  hasActiveFilters, 
  onClearFilters, 
  onRefresh, 
  isLoading 
}: {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}) => (
  <div className="flex gap-2 shrink-0">
    {hasActiveFilters && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearFilters}
        title="Limpiar filtros"
        className="h-11 w-11 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
        aria-label="Limpiar filtros"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
    <Button
      variant="ghost"
      size="icon"
      onClick={onRefresh}
      title="Actualizar citas"
      className="h-11 w-11"
      disabled={isLoading}
      aria-label="Actualizar citas"
    >
      <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
    </Button>
  </div>
));

ActionButtons.displayName = "ActionButtons";

const MainControls = memo(({ 
  filters, 
  onUpdateFilters, 
  isLoading 
}: {
  filters: FilterState;
  onUpdateFilters: (filters: Partial<FilterState>) => void;
  isLoading: boolean;
}) => {
  // Handlers memoizados para evitar re-renders
  const handleSearchChange = useCallback(
    (searchTerm: string) => onUpdateFilters({ searchTerm }),
    [onUpdateFilters]
  );

  const handleStatusChange = useCallback(
    (statusFilter: string) => onUpdateFilters({ statusFilter }),
    [onUpdateFilters]
  );

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <SearchInput
        value={filters.searchTerm}
        onChange={handleSearchChange}
        disabled={isLoading}
      />
      <StatusSelect
        value={filters.statusFilter}
        onChange={handleStatusChange}
        disabled={isLoading}
      />
    </div>
  );
});

MainControls.displayName = "MainControls";

// =================================================================
// COMPONENTE PRINCIPAL OPTIMIZADO
// =================================================================
export const FilterControls = memo<FilterControlsProps>(({
  filters,
  onUpdateFilters,
  onClearFilters,
  onRefresh,
  isLoading
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mobile: isMobile } = useBreakpointStore();

  // Valor derivado memoizado
  const hasActiveFilters = useMemo(() => 
    filters.searchTerm !== "" || filters.statusFilter !== "all",
    [filters.searchTerm, filters.statusFilter]
  );

  // Callback memoizado para toggle
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Clases CSS memoizadas
  const containerClasses = useMemo(() => cn(
    "flex items-center gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
    hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200 dark:border-blue-800"
  ), [hasActiveFilters]);

  const mobileContainerClasses = useMemo(() => cn(
    "flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
    hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200 dark:border-blue-800"
  ), [hasActiveFilters]);

  // Renderizado optimizado para desktop
  if (!isMobile) {
    return (
      <div className={containerClasses}>
        <MainControls
          filters={filters}
          onUpdateFilters={onUpdateFilters}
          isLoading={isLoading}
        />
        <ActionButtons
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          onRefresh={onRefresh}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Renderizado optimizado para mobile
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className={mobileContainerClasses}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </div>

          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
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
              size="sm" 
              className="gap-2"
              onClick={handleToggleExpanded}
            >
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform duration-200", 
                  isExpanded && "rotate-180"
                )} 
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
          <MainControls
            filters={filters}
            onUpdateFilters={onUpdateFilters}
            isLoading={isLoading}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

FilterControls.displayName = "FilterControls";