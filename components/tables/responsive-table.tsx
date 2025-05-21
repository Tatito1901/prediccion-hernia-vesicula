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
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [date, setDate] = useState<Date | undefined>(undefined)

  // Función para ordenar datos
  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0

    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]

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

        {/* Vista móvil */}
        <div className="md:hidden space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map((row, index) => (
              <Card key={index} className="overflow-hidden">
                {cardView ? (
                  cardView(row)
                ) : (
                  <>
                    <CardHeader className="p-4 pb-2 bg-muted/20">
                      <CardTitle className="text-base font-medium">{row[columns[0].key]}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-3 space-y-3">
                      {columns.slice(1).map((column) => (
                        <div key={column.key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{column.title}:</span>
                          <span>{column.render ? column.render(row[column.key], row) : row[column.key]}</span>
                        </div>
                      ))}
                      {actions && <div className="flex justify-end gap-2 pt-2">{actions(row)}</div>}
                    </CardContent>
                  </>
                )}
              </Card>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground rounded-md border">{emptyMessage}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
