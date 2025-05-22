"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarIcon, FilterIcon, SortAscIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export type FollowUpFilterState = {
  search: string
  status: string[]
  type: string[]
  result: string[]
  assignedTo: string[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  sortBy: string
  sortOrder: "asc" | "desc"
}

interface FollowUpFiltersProps {
  filters: FollowUpFilterState
  onFilterChange: (filters: Partial<FollowUpFilterState>) => void
  availableAssignees: string[]
  className?: string
}

export function FollowUpFilters({ filters, onFilterChange, availableAssignees, className }: FollowUpFiltersProps) {
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ search: e.target.value })
  }

  // Handle status filter change
  const handleStatusChange = (value: string, checked: boolean) => {
    const newStatus = checked ? [...filters.status, value] : filters.status.filter((s) => s !== value)
    onFilterChange({ status: newStatus })
  }

  // Handle type filter change
  const handleTypeChange = (value: string, checked: boolean) => {
    const newType = checked ? [...filters.type, value] : filters.type.filter((t) => t !== value)
    onFilterChange({ type: newType })
  }

  // Handle result filter change
  const handleResultChange = (value: string, checked: boolean) => {
    const newResult = checked ? [...filters.result, value] : filters.result.filter((r) => r !== value)
    onFilterChange({ result: newResult })
  }

  // Handle assignee filter change
  const handleAssigneeChange = (value: string, checked: boolean) => {
    const newAssignee = checked ? [...filters.assignedTo, value] : filters.assignedTo.filter((a) => a !== value)
    onFilterChange({ assignedTo: newAssignee })
  }

  // Handle date range change
  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    onFilterChange({ dateRange: range })
  }

  // Handle sort change
  const handleSortChange = (value: string) => {
    onFilterChange({ sortBy: value })
  }

  // Handle sort order change
  const handleSortOrderChange = () => {
    onFilterChange({ sortOrder: filters.sortOrder === "asc" ? "desc" : "asc" })
  }

  // Format date range for display
  const formatDateRange = () => {
    const { from, to } = filters.dateRange
    if (from && to) {
      return `${format(from, "dd/MM/yyyy", { locale: es })} - ${format(to, "dd/MM/yyyy", { locale: es })}`
    }
    if (from) {
      return `Desde ${format(from, "dd/MM/yyyy", { locale: es })}`
    }
    if (to) {
      return `Hasta ${format(to, "dd/MM/yyyy", { locale: es })}`
    }
    return "Seleccionar fechas"
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <Input
            placeholder="Buscar por paciente o notas..."
            value={filters.search}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FilterIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.status.includes("Programado")}
                onCheckedChange={(checked) => handleStatusChange("Programado", checked)}
              >
                Programado
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status.includes("Completado")}
                onCheckedChange={(checked) => handleStatusChange("Completado", checked)}
              >
                Completado
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.status.includes("Cancelado")}
                onCheckedChange={(checked) => handleStatusChange("Cancelado", checked)}
              >
                Cancelado
              </DropdownMenuCheckboxItem>

              <DropdownMenuLabel className="mt-2">Tipo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.type.includes("Llamada")}
                onCheckedChange={(checked) => handleTypeChange("Llamada", checked)}
              >
                Llamada
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type.includes("Email")}
                onCheckedChange={(checked) => handleTypeChange("Email", checked)}
              >
                Email
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type.includes("WhatsApp")}
                onCheckedChange={(checked) => handleTypeChange("WhatsApp", checked)}
              >
                WhatsApp
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.type.includes("Consulta")}
                onCheckedChange={(checked) => handleTypeChange("Consulta", checked)}
              >
                Consulta
              </DropdownMenuCheckboxItem>

              <DropdownMenuLabel className="mt-2">Resultado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.result.includes("Interesado")}
                onCheckedChange={(checked) => handleResultChange("Interesado", checked)}
              >
                Interesado
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.result.includes("No interesado")}
                onCheckedChange={(checked) => handleResultChange("No interesado", checked)}
              >
                No interesado
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.result.includes("Indeciso")}
                onCheckedChange={(checked) => handleResultChange("Indeciso", checked)}
              >
                Indeciso
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.result.includes("No contactado")}
                onCheckedChange={(checked) => handleResultChange("No contactado", checked)}
              >
                No contactado
              </DropdownMenuCheckboxItem>

              {availableAssignees.length > 0 && (
                <>
                  <DropdownMenuLabel className="mt-2">Asignado a</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableAssignees.map((assignee) => (
                    <DropdownMenuCheckboxItem
                      key={assignee}
                      checked={filters.assignedTo.includes(assignee)}
                      onCheckedChange={(checked) => handleAssigneeChange(assignee, checked)}
                    >
                      {assignee}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Fechas</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={filters.dateRange}
                onSelect={handleDateRangeChange}
                locale={es}
                className="border-0"
              />
              <div className="flex items-center justify-between p-3 border-t">
                <p className="text-sm text-muted-foreground">{formatDateRange()}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDateRangeChange({ from: undefined, to: undefined })}
                >
                  Limpiar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fecha">Fecha</SelectItem>
              <SelectItem value="proximoSeguimiento">Próximo seguimiento</SelectItem>
              <SelectItem value="resultado">Resultado</SelectItem>
              <SelectItem value="tipo">Tipo</SelectItem>
              <SelectItem value="estado">Estado</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleSortOrderChange} className="h-10 w-10">
            <SortAscIcon className={cn("h-4 w-4", filters.sortOrder === "desc" && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {(filters.status.length > 0 ||
        filters.type.length > 0 ||
        filters.result.length > 0 ||
        filters.assignedTo.length > 0 ||
        filters.dateRange.from ||
        filters.dateRange.to) && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Filtros activos:</span>

          {filters.status.map((status) => (
            <Button
              key={`status-${status}`}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleStatusChange(status, false)}
            >
              Estado: {status} ×
            </Button>
          ))}

          {filters.type.map((type) => (
            <Button
              key={`type-${type}`}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleTypeChange(type, false)}
            >
              Tipo: {type} ×
            </Button>
          ))}

          {filters.result.map((result) => (
            <Button
              key={`result-${result}`}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleResultChange(result, false)}
            >
              Resultado: {result} ×
            </Button>
          ))}

          {filters.assignedTo.map((assignee) => (
            <Button
              key={`assignee-${assignee}`}
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleAssigneeChange(assignee, false)}
            >
              Asignado a: {assignee} ×
            </Button>
          ))}

          {(filters.dateRange.from || filters.dateRange.to) && (
            <Button
              variant="secondary"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => handleDateRangeChange({ from: undefined, to: undefined })}
            >
              Fechas: {formatDateRange()} ×
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() =>
              onFilterChange({
                status: [],
                type: [],
                result: [],
                assignedTo: [],
                dateRange: { from: undefined, to: undefined },
              })
            }
          >
            Limpiar todos
          </Button>
        </div>
      )}
    </div>
  )
}
