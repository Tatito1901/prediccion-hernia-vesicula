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

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
}

export type AppointmentStatus = "PRESENTE" | "CANCELADA" | "COMPLETADA" | "PROGRAMADA" | "NO_ASISTIO" | "REAGENDADA" | "CONFIRMADA";

export const STATUS_CONFIG = {
  PRESENTE: { label: "En espera" },
  CANCELADA: { label: "Cancelada" },
  COMPLETADA: { label: "Completada" },
  PROGRAMADA: { label: "Programada" },
  NO_ASISTIO: { label: "No Asistió" },
  REAGENDADA: { label: "Reagendada" },
  CONFIRMADA: { label: "Confirmada" },
};

export interface FilterControlsProps {
  filters: FilterState;
  onUpdateFilters: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const FilterControls = memo(({
  filters,
  onUpdateFilters,
  onClearFilters,
  onRefresh,
  isLoading
}: FilterControlsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mobile: isMobile } = useBreakpointStore();

  const hasActiveFilters = filters.searchTerm !== "" || filters.statusFilter !== "all";

  const MainControls = () => (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input
          type="text"
          placeholder="Buscar paciente..."
          className="pl-10 h-11"
          value={filters.searchTerm}
          onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
          aria-label="Buscar paciente"
        />
      </div>

      <Select
        value={filters.statusFilter}
        onValueChange={(value) => onUpdateFilters({ statusFilter: value as AppointmentStatus | "all" })}
      >
        <SelectTrigger className="w-full sm:w-48 h-11 gap-2" aria-label="Filtrar por estado">
          <Filter size={16} className="text-slate-500" />
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Estados</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const ActionButtons = () => (
    <div className="flex gap-2 shrink-0">
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClearFilters}
          title="Limpiar filtros"
          className="h-11 w-11 hover:bg-red-50 hover:text-red-600"
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
        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")}
        />
      </Button>
    </div>
  );

  if (!isMobile) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200"
      )}>
        <MainControls />
        <ActionButtons />
      </div>
    );
  }

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
          </div>

          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">Activos</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ActionButtons />

          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>

      <CollapsibleContent>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border">
          <MainControls />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

FilterControls.displayName = "FilterControls";
