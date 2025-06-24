"use client"

import type React from "react"

import { useState, useMemo, useCallback } from "react"
import { useIsMobile, useIsTablet } from "@/hooks/use-breakpoint"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ChevronDown,
  Download,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  Table,
  Code
} from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { LoadingState } from "@/components/ui/loading-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key: string
  title: string
  sortable?: boolean
  filterable?: boolean
  filterOptions?: { label: string; value: string }[]
  width?: string
  align?: "left" | "center" | "right"
  render?: (value: any, row: T) => React.ReactNode
  className?: string
}

export interface ResponsiveTableProps<T> {
  data: T[]
  columns: Column<T>[]
  title?: string
  description?: string
  searchable?: boolean
  searchKeys?: (keyof T)[]
  searchPlaceholder?: string
  actions?: (row: T) => React.ReactNode
  emptyMessage?: string
  cardView?: (row: T) => React.ReactNode
  isLoading?: boolean
  pagination?: boolean
  pageSize?: number
  onRefresh?: () => void
  onExport?: (format: "csv" | "json" | "excel") => void
  className?: string
  rowClassName?: string | ((row: T) => string)
  showRowNumbers?: boolean
  selectable?: boolean
  onSelectionChange?: (selectedRows: T[]) => void
  uniqueKey?: keyof T
  forceCardView?: boolean
  showFirstButton?: boolean
  showLastButton?: boolean
  siblingCount?: number
}

export function ResponsiveTable<T extends object>({
  data,
  columns,
  title,
  description,
  searchable = true,
  searchKeys = [],
  searchPlaceholder = "Buscar...",
  actions,
  emptyMessage = "No hay datos disponibles",
  cardView,
  isLoading = false,
  pagination = true,
  pageSize = 10,
  onRefresh,
  onExport,
  className,
  rowClassName,
  showRowNumbers = false,
  selectable = false,
  onSelectionChange,
  uniqueKey,
  forceCardView = false,
  showFirstButton = true,
  showLastButton = true,
  siblingCount = 1,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  
  const shouldUseCardView = useMemo(() => {
    return forceCardView || isMobile || (isTablet && cardView);
  }, [forceCardView, isMobile, isTablet, cardView]);
  
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedRows, setSelectedRows] = useState<T[]>([])
  const [allSelected, setAllSelected] = useState(false)

  const sortedData = useMemo(() => {
    if (!sortConfig) return [...data]

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key as keyof T]
      const bValue = b[sortConfig.key as keyof T]

      if (aValue === undefined || bValue === undefined) return 0
      
      const safeAValue = aValue as any;
      const safeBValue = bValue as any;

      if (safeAValue < safeBValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (safeAValue > safeBValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })
  }, [data, sortConfig])

  const filteredData = useMemo(() => {
    return sortedData.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value && row[key as keyof T] !== value) return false
      }

      if (searchTerm) {
        const keys = searchKeys.length > 0 ? searchKeys : Object.keys(row) as (keyof T)[]

        return keys.some((key) => {
          const value = row[key]
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      }

      return true
    })
  }, [sortedData, filters, searchTerm, searchKeys])

  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData

    const start = currentPage * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, pagination, currentPage, pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredData.length / pageSize)
  }, [filteredData, pageSize])

  const handleSort = useCallback(
    (key: string) => {
      let direction: "asc" | "desc" = "asc"

      if (sortConfig && sortConfig.key === key) {
        direction = sortConfig.direction === "asc" ? "desc" : "asc"
      }

      setSortConfig({ key, direction })
    },
    [sortConfig],
  )

  const handleFilter = useCallback((key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "all" ? null : value,
    }))
    setCurrentPage(0) 
  }, [])

  const handleClearFilters = useCallback(() => {
    setFilters({})
    setSearchTerm("")
    setCurrentPage(0)
  }, [])

  const handleRowSelection = useCallback(
    (row: T, isSelected: boolean) => {
      setSelectedRows((prev) => {
        const newSelection = isSelected
          ? [...prev, row]
          : prev.filter((r) => (uniqueKey ? r[uniqueKey] !== row[uniqueKey] : r !== row))

        if (onSelectionChange) {
          onSelectionChange(newSelection)
        }

        return newSelection
      })
    },
    [onSelectionChange, uniqueKey],
  )

  const handleSelectAll = useCallback(
    (isSelected: boolean) => {
      if (isSelected) {
        setSelectedRows(paginatedData)
        setAllSelected(true)
        if (onSelectionChange) {
          onSelectionChange(paginatedData)
        }
      } else {
        setSelectedRows([])
        setAllSelected(false)
        if (onSelectionChange) {
          onSelectionChange([])
        }
      }
    },
    [paginatedData, onSelectionChange],
  )

  const isRowSelected = useCallback(
    (row: T) => {
      if (uniqueKey) {
        return selectedRows.some((r) => r[uniqueKey] === row[uniqueKey])
      }
      return selectedRows.includes(row)
    },
    [selectedRows, uniqueKey],
  )

  const renderSkeletons = () => (
    <div className="space-y-2">
      {Array.from({ length: pageSize }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          {selectable && <Skeleton className="h-4 w-4" />}
          {showRowNumbers && <Skeleton className="h-4 w-8" />}
          {columns.map((column, colIndex) => (
            <Skeleton key={colIndex} className={cn("h-8", column.width ? `w-[${column.width}]` : "w-full")} />
          ))}
          {actions && <Skeleton className="h-8 w-20" />}
        </div>
      ))}
    </div>
  )

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium">{emptyMessage}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        {searchTerm || Object.keys(filters).length > 0
          ? "Prueba a cambiar los filtros o términos de búsqueda."
          : "No hay datos disponibles en este momento."}
      </p>
      {(searchTerm || Object.keys(filters).length > 0) && (
        <Button variant="outline" className="mt-4" onClick={handleClearFilters}>
          Limpiar filtros
        </Button>
      )}
    </div>
  )

  const renderMobileCard = (row: T, index: number) => {
    if (cardView) {
      return cardView(row)
    }

    return (
      <Card key={uniqueKey ? String(row[uniqueKey]) : index} className="mb-4">
        <CardHeader className="pb-2">
          {selectable && (
            <div className="flex items-center space-x-2 mb-2">
              <Checkbox
                checked={isRowSelected(row)}
                onCheckedChange={(checked) => handleRowSelection(row, !!checked)}
                id={`select-row-mobile-${index}`}
              />
              <Label htmlFor={`select-row-mobile-${index}`}>Seleccionar</Label>
            </div>
          )}
          <div className="flex justify-between items-start">
            <div>
              {showRowNumbers && (
                <Badge variant="outline" className="mb-1">
                  #{currentPage * pageSize + index + 1}
                </Badge>
              )}
              <CardTitle className="text-base">{columns[0] && String(row[columns[0].key as keyof T] ?? '')}</CardTitle>
              {columns[1] && (
                <CardDescription>
                  {columns[1].render
                    ? columns[1].render(row[columns[1].key as keyof T], row)
                    : String(row[columns[1].key as keyof T] ?? '')}
                </CardDescription>
              )}
            </div>
            {actions && <div className="ml-auto">{actions(row)}</div>}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-2">
            {columns.slice(2).map((column, colIndex) => (
              <div key={colIndex} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{column.title}:</span>
                <span>
                  {column.render
                    ? column.render(row[column.key as keyof T], row)
                    : String(row[column.key as keyof T] ?? '')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      {(title || description || searchable || onRefresh || onExport) && (
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {(title || description) && (
              <div>
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {searchable && (
                <div className="relative w-full sm:w-[260px] lg:w-[320px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder || "Buscar..."}
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <X
                      className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground"
                      onClick={() => setSearchTerm("")}
                    />
                  )}
                </div>
              )}
              
              {onRefresh && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={onRefresh}
                >
                  <span className="sr-only">Actualizar</span>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              {onExport && (
                <div className="flex-shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onExport("csv")}>
                        <FileText className="mr-2 h-4 w-4" /> CSV
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport("excel")}>
                        <Table className="mr-2 h-4 w-4" /> Excel
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onExport("json")}>
                        <Code className="mr-2 h-4 w-4" /> JSON
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      )}


      <CardContent>
        {isLoading ? (
          renderSkeletons()
        ) : (
          <>
            {/* Vista de escritorio */}
            <div className="hidden md:block rounded-md border overflow-hidden">
            {filteredData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {selectable && (
                        <th className="p-2 w-[40px]">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={handleSelectAll}
                            aria-label="Seleccionar todas las filas"
                          />
                        </th>
                      )}
                      {showRowNumbers && <th className="p-2 text-left font-medium w-[60px]">#</th>}
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          className={cn(
                            "p-2 font-medium",
                            column.align === "center" && "text-center",
                            column.align === "right" && "text-right",
                            !column.align && "text-left",
                            column.width && `w-[${column.width}]`,
                            column.className,
                          )}
                        >
                          {column.sortable ? (
                            <button
                              className="flex items-center gap-1 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-sm"
                              onClick={() => handleSort(column.key)}
                              aria-label={`Ordenar por ${column.title}`}
                            >
                              {column.title}
                              {sortConfig?.key === column.key ? (
                                sortConfig.direction === "asc" ? (
                                  <SortAsc className="h-4 w-4" />
                                ) : (
                                  <SortDesc className="h-4 w-4" />
                                )
                              ) : (
                                <ChevronDown className="h-4 w-4 opacity-30" />
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
                    {paginatedData.map((row, index) => {
                      const isSelected = isRowSelected(row)
                      const rowClass = typeof rowClassName === "function" ? rowClassName(row) : rowClassName

                      return (
                        <tr
                          key={uniqueKey ? String(row[uniqueKey]) : index}
                          className={cn(
                            "border-b hover:bg-muted/30 transition-colors",
                            isSelected && "bg-primary/5",
                            rowClass,
                          )}
                        >
                          {selectable && (
                            <td className="p-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleRowSelection(row, !!checked)}
                                aria-label={`Seleccionar fila ${index + 1}`}
                              />
                            </td>
                          )}
                          {showRowNumbers && (
                            <td className="p-2 text-muted-foreground">{currentPage * pageSize + index + 1}</td>
                          )}
                          {columns.map((column, colIndex) => (
                            <td
                              key={colIndex}
                              className={cn(
                                "p-2",
                                column.align === "center" && "text-center",
                                column.align === "right" && "text-right",
                                column.className,
                              )}
                            >
                              {column.render
                                ? column.render(row[column.key as keyof T], row)
                                : String(row[column.key as keyof T] ?? '')}
                            </td>
                          ))}
                          {actions && <td className="p-2 text-right">{actions(row)}</td>}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : isLoading ? (
              renderSkeletons()
            ) : (
              renderEmptyState()
            )}
          </div>

          {/* Vista móvil */}
          <div className="md:hidden">
            {filteredData.length > 0 ? (
              paginatedData.map((row, index) => renderMobileCard(row, index))
            ) : isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="mb-4">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="pb-3">
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="flex justify-between items-center">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/2" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredData.length > 0 ? (
              <div className="space-y-4">{paginatedData.map((row, index) => renderMobileCard(row, index))}</div>
            ) : (
              renderEmptyState()
            )}
          </div>
          </>
        )}
      </CardContent>

      {pagination && filteredData.length > 0 && (
        <CardFooter className="flex items-center justify-between px-6 py-4">
          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedData.length} de {filteredData.length} resultados
            {data.length !== filteredData.length && <> (filtrados de {data.length} total)</>}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(0)} disabled={currentPage === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Primera
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm">
              Página {currentPage + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages - 1)}
              disabled={currentPage === totalPages - 1}
            >
              Última
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
