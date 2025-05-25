"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarIcon, ChevronUpIcon, FilterIcon, SearchIcon, SortAscIcon, SortDescIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Column {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

interface ResponsiveTableProps {
  data: any[]
  columns: Column[]
  title?: string
  description?: string
  searchable?: boolean
  searchKeys?: string[]
  actions?: (row: any) => React.ReactNode
  emptyMessage?: string
  cardView?: (row: any) => React.ReactNode
}

export function ResponsiveTable({
  data,
  columns,
  title,
  description,
  searchable = true,
  searchKeys = [],
  actions,
  emptyMessage = "No hay datos disponibles",
  cardView,
}: ResponsiveTableProps) {
  // Referencia a la fecha actual
  const currentDate = new Date();
  
  // Estado para controlar si se muestran o no las consultas futuras
  const [showFutureDates, setShowFutureDates] = useState(true); // Por defecto, mostrar todas
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [date, setDate] = useState<Date | undefined>(undefined)

  // Función mejorada para ordenar datos
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0

    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

    // Manejo de nulos/indefinidos
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return sortConfig.direction === "asc" ? 1 : -1
    if (bValue === undefined) return sortConfig.direction === "asc" ? -1 : 1

    // Detectar si el campo es una fecha (por su nombre o estructura)
    const isDateField = sortConfig.key.toLowerCase().includes('fecha') || 
                         sortConfig.key.toLowerCase().includes('date') ||
                         sortConfig.key.toLowerCase().includes('time')

    if (isDateField) {
      // Para fechas, convertimos a timestamp para comparación
      const dateA = new Date(aValue).getTime()
      const dateB = new Date(bValue).getTime()
      
      // Para fechas, generalmente queremos mostrar las más recientes primero en orden descendente
      // y las más antiguas primero en orden ascendente
      if (sortConfig.direction === "asc") {
        return dateA - dateB // Más antigua primero
      } else {
        return dateB - dateA // Más reciente primero
      }
    }

    // Para otros tipos de valores
    if (aValue < bValue) {
      return sortConfig.direction === "asc" ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === "asc" ? 1 : -1
    }
    return 0
  })

  // Función para filtrar datos
  const filteredData = sortedData.filter((row) => {
    // Aplicar filtro de fechas futuras (solo si hay alguna columna fecha)
    if (!showFutureDates) {
      // Buscar columnas de fecha (que contengan 'fecha', 'date', etc.)
      const dateCols = columns.filter(col => 
        col.key.toLowerCase().includes('fecha') || 
        col.key.toLowerCase().includes('date') ||
        col.title.toLowerCase().includes('fecha') ||
        col.title.toLowerCase().includes('date')
      );
      
      // Verificar cada columna de fecha
      for (const dateCol of dateCols) {
        const dateValue = row[dateCol.key];
        if (dateValue && typeof dateValue === 'string') {
          try {
            const rowDate = new Date(dateValue);
            // Ignorar hora para comparar solo fechas
            rowDate.setHours(0, 0, 0, 0);
            const today = new Date(currentDate);
            today.setHours(0, 0, 0, 0);
            
            // Si es fecha futura, excluir
            if (rowDate > today) {
              return false;
            }
          } catch (e) {
            // Si no se puede parsear como fecha, ignorar
            console.warn("No se pudo parsear la fecha:", dateValue);
          }
        }
      }
    }
    
    // Aplicar filtros
    for (const [key, value] of Object.entries(filters)) {
      if (value && row[key] !== value) return false
    }

    // Aplicar búsqueda
    if (searchTerm) {
      const keys = searchKeys.length > 0 ? searchKeys : Object.keys(row)
      return keys.some((key) => String(row[key]).toLowerCase().includes(searchTerm.toLowerCase()))
    }

    return true
  })

  // Función para manejar el ordenamiento
  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"

    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === "asc" ? "desc" : "asc"
    }

    setSortConfig({ key, direction })
  }

  // Función para manejar los filtros
  const handleFilter = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Función para limpiar filtros
  const clearFilters = () => {
    setFilters({})
    setSearchTerm("")
    setDate(undefined)
  }

  return (
    <Card className="w-full">
      {(title || description || searchable) && (
        <CardHeader className="pb-3">
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}

          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            {searchable && (
              <div className="relative flex-1">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2">
              {/* Botón para mostrar/ocultar fechas futuras */}
              {columns.some(col => 
                col.key.toLowerCase().includes('fecha') || 
                col.key.toLowerCase().includes('date') ||
                col.title.toLowerCase().includes('fecha') ||
                col.title.toLowerCase().includes('date')
              ) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9"
                  onClick={() => setShowFutureDates(!showFutureDates)}
                >
                  {showFutureDates ? "Ocultar fechas futuras" : "Mostrar todas las fechas"}
                </Button>
              )}
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Filtros
                    {Object.keys(filters).length > 0 && (
                      <Badge variant="secondary" className="ml-2 rounded-full">
                        {Object.keys(filters).length}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-4">
                    <h4 className="font-medium">Filtrar por</h4>

                    {columns
                      .filter((col) => col.filterable)
                      .map((column) => (
                        <div key={column.key} className="space-y-2">
                          <Label htmlFor={`filter-${column.key}`}>{column.title}</Label>
                          <Select
                            value={filters[column.key] || ""}
                            onValueChange={(value) => handleFilter(column.key, value || null)}
                          >
                            <SelectTrigger id={`filter-${column.key}`}>
                              <SelectValue placeholder="Todos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {/* Aquí se pueden agregar opciones dinámicas basadas en los datos */}
                              <SelectItem value="option1">Opción 1</SelectItem>
                              <SelectItem value="option2">Opción 2</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}

                    <div className="space-y-2">
                      <Label>Fecha</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      Limpiar filtros
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent>
        {/* Vista de escritorio */}
        <div className="hidden md:block rounded-md border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((column) => (
                  <th key={column.key} className="p-2 text-left font-medium">
                    {column.sortable ? (
                      <button
                        className="flex items-center gap-1 hover:text-primary"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.title}
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === "asc" ? (
                            <SortAscIcon className="h-4 w-4" />
                          ) : (
                            <SortDescIcon className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronUpIcon className="h-4 w-4 opacity-30" />
                        )}
                      </button>
                    ) : (
                      column.title
                    )}
                  </th>
                ))}
                {actions && <th className="p-2 text-right font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={index} className="border-b">
                    {columns.map((column) => (
                      <td key={`${index}-${column.key}`} className="p-2">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                    {actions && <td className="p-2 text-right">{actions(row)}</td>}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (actions ? 1 : 0)} className="p-4 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Vista móvil optimizada */}
        <div className="md:hidden space-y-4">
          {/* Contador de elementos siempre visible en móvil */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border rounded-md p-2 text-center text-sm font-medium shadow-sm">
            <span className="text-muted-foreground">Mostrando </span>
            <span className="font-semibold">{filteredData.length}</span>
            <span className="text-muted-foreground"> resultados</span>
          </div>
          
          {filteredData.length > 0 ? (
            filteredData.map((row, index) => (
              <Card 
                key={index} 
                className="overflow-hidden hover:shadow-md transition-shadow border-muted/80 active:bg-muted/10"
              >
                {cardView ? (
                  cardView(row)
                ) : (
                  <>
                    <CardHeader className="p-4 pb-2 bg-muted/20">
                      <CardTitle className="text-base font-medium">{row[columns[0].key]}</CardTitle>
                      
                      {/* Badge indicators for common statuses (detect if there's a "status" or "estado" field) */}
                      {(row["status"] || row["estado"]) && (
                        <div className="mt-1">
                          <Badge 
                            variant="outline"
                            className="text-xs"
                          >
                            {row["status"] || row["estado"]}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="p-4 pt-3 space-y-3">
                      {columns.slice(1).map((column) => (
                        <div key={column.key} className="flex justify-between text-sm items-start">
                          <span className="text-muted-foreground font-medium min-w-[100px] mr-2">{column.title}:</span>
                          <span className="text-right">{column.render ? column.render(row[column.key], row) : row[column.key]}</span>
                        </div>
                      ))}
                      {actions && (
                        <div className="flex justify-end gap-2 pt-2 mt-2 border-t border-border/40">
                          {actions(row)}
                        </div>
                      )}
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          ) : (
            <div className="p-6 text-center text-muted-foreground rounded-md border flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-2">
                <FilterIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              {emptyMessage}
              <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
