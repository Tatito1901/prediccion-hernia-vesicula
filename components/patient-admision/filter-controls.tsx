import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientStatusEnum } from "@/app/dashboard/data-model";

// Tipos para FilterControls
export interface FilterState {
  searchTerm: string;
  statusFilter: string;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  sortField?: string;
  sortDirection?: "asc" | "desc";
}

export interface FilterControlsProps {
  filters: FilterState;
  onUpdateFilters: (filters: FilterState) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
}

// Componente FilterControls para los filtros de búsqueda
export function FilterControls({ filters, onUpdateFilters, onClearFilters, onRefresh }: FilterControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4 items-start sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
        <Input
          type="search"
          placeholder="Buscar paciente..."
          className="pl-8 bg-white dark:bg-slate-950"
          value={filters.searchTerm}
          onChange={(e) => onUpdateFilters({ ...filters, searchTerm: e.target.value })}
        />
      </div>
      
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        <Select
          value={filters.statusFilter}
          onValueChange={(value) => onUpdateFilters({ ...filters, statusFilter: value })}
        >
          <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value={PatientStatusEnum.PENDIENTE_DE_CONSULTA}>Pendientes</SelectItem>
            <SelectItem value={PatientStatusEnum.CONSULTADO}>Consultados</SelectItem>
            <SelectItem value={PatientStatusEnum.EN_SEGUIMIENTO}>En seguimiento</SelectItem>
            <SelectItem value={PatientStatusEnum.OPERADO}>Operados</SelectItem>
            <SelectItem value={PatientStatusEnum.NO_OPERADO}>No operados</SelectItem>
            <SelectItem value={PatientStatusEnum.INDECISO}>Indecisos</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" size="icon" onClick={onRefresh} className="bg-white dark:bg-slate-950">
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="sm" onClick={onClearFilters} className="bg-white dark:bg-slate-950">
          <X className="mr-2 h-4 w-4" />
          Limpiar
        </Button>
      </div>
    </div>
  );
}
