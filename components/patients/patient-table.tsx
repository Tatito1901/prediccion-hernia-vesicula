import React, {
  useState,
  useMemo,
  useCallback,
  memo,
} from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/tables/table-skeleton"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import {
  MoreHorizontal,
  Edit,
  Share2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Eye,
  CalendarDays,
  Filter,
  FileText as FileTextIcon,
  Phone,
  BriefcaseMedical,
  User,
  Search,
  X,
} from "lucide-react"
import PatientStatus from "./patient-status"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"

interface PatientTableProps {
  patients: ItemType[]
  loading?: boolean
  onSelectPatient: (patient: PatientData) => void
  onShareSurvey?: (patient: PatientData) => void
  onAnswerSurvey?: (patient: PatientData) => void
  onEditPatient?: (patient: PatientData) => void
}

export type ItemType = PatientData & {
  nombreCompleto: string
  fecha_proxima_cita?: string
  encuesta_completada?: boolean
  displayDiagnostico?: string
}

type SortableColumnKey =
  | "nombreCompleto"
  | "fecha_proxima_cita"
  | "diagnostico_principal"
  | "estado_paciente"
  | "encuesta_completada"
  | "fecha_registro"

type TableColumnKey =
  | "nombre"
  | "telefono"
  | "fechaConsulta"
  | "diagnostico_principal"
  | "notas_paciente"
  | "estado"
  | "encuesta"
  | "acciones"

interface SortConfig {
  key: SortableColumnKey
  direction: "asc" | "desc"
}

interface Column<T extends ItemType> {
  key: TableColumnKey
  label: string
  icon?: React.ReactNode
  widthClass?: string
  hideBelow?: "sm" | "md" | "lg" | "xl"
  align?: "left" | "center" | "right"
  renderCell: (item: T) => React.ReactNode
}

const TABLE_KEY_TO_SORTABLE_KEY: Partial<
  Record<TableColumnKey, SortableColumnKey>
> = {
  nombre: "nombreCompleto",
  fechaConsulta: "fecha_registro",
  diagnostico_principal: "diagnostico_principal",
  estado: "estado_paciente",
  encuesta: "encuesta_completada",
}

const normalizarTexto = (texto: string | undefined | null): string => {
  if (!texto) return ""
  return texto
    .toLowerCase()
    .split(" ")
    .map((palabra) => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(" ")
}

const PatientTableComponent: React.FC<PatientTableProps> = ({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}) => {
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<PatientStatusEnum | "all">("all")
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "fecha_registro",
    direction: "desc",
  })
  const [showFilters, setShowFilters] = useState(false)

  // Obtener opciones de estado del enum
  const statusOptions = useMemo(
    () => ["all", ...Object.values(PatientStatusEnum)] as const,
    []
  )

  const toggleSort = useCallback((key: SortableColumnKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  // Procesamiento optimizado de pacientes
  const processedPatients = useMemo(() => {
    if (loading || !patients) return []

    const mapped = patients.map((patient) => ({
      ...patient,
      displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico"
    }))

    // Filtrado por búsqueda
    let filtered = mapped
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((p) => {
        return (
          p.nombreCompleto?.toLowerCase().includes(term) ||
          p.telefono?.toLowerCase().includes(term) ||
          p.diagnostico_principal?.toLowerCase().includes(term) ||
          p.email?.toLowerCase().includes(term)
        )
      })
    }

    // Filtrado por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.estado_paciente === statusFilter)
    }

    // Ordenamiento
    const { key, direction } = sortConfig
    const asc = direction === "asc"

    return [...filtered].sort((a, b) => {
      const valA = a[key]
      const valB = b[key]

      if (valA == null && valB != null) return asc ? 1 : -1
      if (valA != null && valB == null) return asc ? -1 : 1
      if (valA == null && valB == null) return 0

      if (key === "fecha_proxima_cita" || key === "fecha_registro") {
        const timeA = new Date(valA as string).getTime()
        const timeB = new Date(valB as string).getTime()
        return asc ? timeA - timeB : timeB - timeA
      }

      if (key === "encuesta_completada") {
        const boolA = Boolean(valA)
        const boolB = Boolean(valB)
        if (boolA === boolB) return 0
        return asc ? (boolA ? 1 : -1) : boolA ? -1 : 1
      }

      if (typeof valA === "number" && typeof valB === "number") {
        return asc ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return asc ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [patients, loading, searchTerm, statusFilter, sortConfig])

  // Definición de columnas con renderizado optimizado
  const columns = useMemo<Column<ItemType>[]>(
    () => [
      {
        key: "nombre",
        label: "Nombre",
        icon: <User className="h-4 w-4" />,
        widthClass: "min-w-[180px] max-w-[300px]",
        renderCell: (p) => (
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onSelectPatient(p)}
              className="font-semibold text-left hover:underline text-blue-700 dark:text-blue-400 truncate transition-colors"
            >
              {normalizarTexto(p.nombreCompleto)}
            </button>
            <span className="text-xs text-muted-foreground">
              ID: {p.id.slice(0, 8)}
              {p.edad && ` • ${p.edad} años`}
            </span>
          </div>
        ),
      },
      {
        key: "telefono",
        label: "Teléfono",
        icon: <Phone className="h-4 w-4" />,
        widthClass: "w-[140px]",
        hideBelow: "lg",
        renderCell: (p) => (
          <a 
            href={`tel:${p.telefono}`} 
            className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {p.telefono || "-"}
          </a>
        ),
      },
      {
        key: "fechaConsulta",
        label: "Registro",
        icon: <CalendarDays className="h-4 w-4" />,
        widthClass: "w-[120px]",
        hideBelow: "md",
        renderCell: (p) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {p.fecha_registro
              ? new Date(p.fecha_registro).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "-"}
          </span>
        ),
      },
      {
        key: "diagnostico_principal",
        label: "Diagnóstico",
        icon: <BriefcaseMedical className="h-4 w-4" />,
        widthClass: "min-w-[140px] max-w-[240px]",
        hideBelow: "md",
        renderCell: (p) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-sm text-slate-600 dark:text-slate-400 block truncate cursor-help">
                  {normalizarTexto(p.displayDiagnostico)}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm">{normalizarTexto(p.displayDiagnostico)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        key: "notas_paciente",
        label: "Notas",
        icon: <FileTextIcon className="h-4 w-4" />,
        widthClass: "max-w-[200px]",
        hideBelow: "xl",
        renderCell: (p) => {
          if (!p.notas_paciente) {
            return (
              <span className="text-slate-400 italic text-sm">
                Sin notas
              </span>
            )
          }
          const texto = normalizarTexto(p.notas_paciente)
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm truncate cursor-help">
                    {texto}
                  </p>
                </TooltipTrigger>
                <TooltipContent
                  align="start"
                  className="max-w-xs whitespace-normal break-words"
                >
                  {texto}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        key: "estado",
        label: "Estado",
        widthClass: "w-[180px]",
        renderCell: (p) => (
          <PatientStatus
            status={p.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
            surveyCompleted={p.encuesta_completada}
          />
        ),
      },
      {
        key: "encuesta",
        label: "Encuesta",
        align: "center",
        widthClass: "w-[100px]",
        renderCell: (p) => {
          let icon: React.ReactNode, tooltip: string, colorClass: string

          if (p.encuesta_completada) {
            icon = <CheckCircle2 className="h-5 w-5" />
            tooltip = "Encuesta completada"
            colorClass = "text-green-600 dark:text-green-500"
          } else if (p.encuesta?.id) {
            icon = <ClipboardList className="h-5 w-5" />
            tooltip = "Encuesta enviada"
            colorClass = "text-blue-600 dark:text-blue-500"
          } else {
            icon = <AlertCircle className="h-5 w-5" />
            tooltip = "Encuesta pendiente"
            colorClass = "text-amber-600 dark:text-amber-500"
          }

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className={cn("transition-colors", colorClass)}>
                    {icon}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        },
      },
      {
        key: "acciones",
        label: "Acciones",
        align: "right",
        widthClass: "w-[80px]",
        renderCell: (p) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => onSelectPatient(p)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Eye className="h-4 w-4" /> Ver detalles
                </DropdownMenuItem>
                {onEditPatient && (
                  <DropdownMenuItem
                    onClick={() => onEditPatient(p)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" /> Editar paciente
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onAnswerSurvey && !p.encuesta_completada && (
                  <DropdownMenuItem
                    onClick={() => onAnswerSurvey(p)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <ClipboardList className="h-4 w-4" /> Contestar encuesta
                  </DropdownMenuItem>
                )}
                {onShareSurvey && !p.encuesta_completada && (
                  <DropdownMenuItem
                    onClick={() => onShareSurvey(p)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="h-4 w-4" /> Compartir encuesta
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [onSelectPatient, onEditPatient, onAnswerSurvey, onShareSurvey]
  )

  // Componente de fila de tabla memoizado
  const TableRowItem = memo(({ patient }: { patient: ItemType }) => (
    <TableRow 
      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
      onClick={() => onSelectPatient(patient)}
    >
      {columns.map((col) => (
        <TableCell
          key={`${patient.id}-${col.key}`}
          onClick={col.key === "acciones" ? (e) => e.stopPropagation() : undefined}
          className={cn(
            "py-3 px-4",
            col.widthClass,
            col.hideBelow && `hidden ${col.hideBelow}:table-cell`,
            col.align === "center" && "text-center",
            col.align === "right" && "text-right"
          )}
        >
          {col.renderCell(patient)}
        </TableCell>
      ))}
    </TableRow>
  ))
  TableRowItem.displayName = "TableRowItem"

  // Componente de tarjeta móvil mejorado
  const MobileCard = memo(({ patient }: { patient: ItemType }) => (
    <div 
      className="bg-white dark:bg-slate-900 shadow-sm hover:shadow-md rounded-lg p-4 mb-3 last:mb-0 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
      onClick={() => onSelectPatient(patient)}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {normalizarTexto(patient.nombreCompleto)}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            ID: {patient.id.slice(0, 8)}
            {patient.edad && ` • ${patient.edad} años`}
          </p>
          <div className="mt-3 space-y-1.5">
            {patient.telefono && (
              <a 
                href={`tel:${patient.telefono}`}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="h-3.5 w-3.5" />
                {patient.telefono}
              </a>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {patient.fecha_registro
                ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "Sin fecha"}
            </p>
            {patient.diagnostico_principal && (
              <p className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                <BriefcaseMedical className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">
                  {normalizarTexto(patient.diagnostico_principal)}
                </span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
          <PatientStatus
            status={patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
            surveyCompleted={patient.encuesta_completada}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => onSelectPatient(patient)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Eye className="h-4 w-4" /> Ver detalles
              </DropdownMenuItem>
              {onEditPatient && (
                <DropdownMenuItem
                  onClick={() => onEditPatient(patient)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-4 w-4" /> Editar
                </DropdownMenuItem>
              )}
              {(onAnswerSurvey || onShareSurvey) && !patient.encuesta_completada && (
                <>
                  <DropdownMenuSeparator />
                  {onAnswerSurvey && (
                    <DropdownMenuItem
                      onClick={() => onAnswerSurvey(patient)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <ClipboardList className="h-4 w-4" /> Contestar encuesta
                    </DropdownMenuItem>
                  )}
                  {onShareSurvey && (
                    <DropdownMenuItem
                      onClick={() => onShareSurvey(patient)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Share2 className="h-4 w-4" /> Compartir encuesta
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  ))
  MobileCard.displayName = "MobileCard"

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter("all")
  }, [])

  if (loading) {
    return <TableSkeleton rows={8} columns={columns.length} />
  }

  return (
    <div className="bg-white dark:bg-slate-950 shadow-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Toolbar mejorado */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        {/* Barra principal */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "transition-colors",
                showFilters && "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800"
              )}
            >
              <Filter className="h-4 w-4" />
            </Button>
            
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as PatientStatusEnum | "all")}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {statusOptions.slice(1).map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="text-sm text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            {processedPatients.length} paciente{processedPatients.length !== 1 && "s"}
          </div>
        </div>
        
        {/* Filtros activos */}
        {(searchTerm || statusFilter !== "all") && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Filtros activos:</span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                Búsqueda: "{searchTerm}"
                <button
                  onClick={() => setSearchTerm("")}
                  className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                Estado: {statusFilter.replace(/_/g, " ").toLowerCase()}
                <button
                  onClick={() => setStatusFilter("all")}
                  className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs"
            >
              Limpiar todo
            </Button>
          </div>
        )}
      </div>

      {/* Vista Desktop - Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => {
                const sortableKey = TABLE_KEY_TO_SORTABLE_KEY[col.key]
                const isSorted = sortableKey === sortConfig.key
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs font-medium uppercase tracking-wider select-none",
                      col.widthClass,
                      col.hideBelow && `hidden ${col.hideBelow}:table-cell`,
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      sortableKey && "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                    )}
                    onClick={sortableKey ? () => toggleSort(sortableKey) : undefined}
                  >
                    <div
                      className={cn("inline-flex items-center gap-1.5", {
                        "justify-center": col.align === "center",
                        "justify-end": col.align === "right",
                      })}
                    >
                      {col.icon}
                      <span>{col.label}</span>
                      {sortableKey && (
                        <>
                          {isSorted ? (
                            sortConfig.direction === "asc" ? (
                              <ChevronUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <div className="w-4 h-4 opacity-0 group-hover:opacity-30">
                              <ChevronUp className="h-4 w-4" />
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>

          <TableBody>
            {processedPatients.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                      <Filter className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        No se encontraron pacientes
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {searchTerm || statusFilter !== "all" 
                          ? "Prueba con otros términos o ajusta los filtros"
                          : "No hay pacientes registrados"
                        }
                      </p>
                    </div>
                    {(searchTerm || statusFilter !== "all") && (
                      <Button variant="outline" size="sm" onClick={clearFilters}>
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              processedPatients.map((patient) => (
                <TableRowItem key={patient.id} patient={patient} />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vista Móvil - Tarjetas */}
      <div className="md:hidden p-4">
        {processedPatients.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Filter className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                No se encontraron pacientes
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {searchTerm || statusFilter !== "all" 
                  ? "Prueba con otros términos o ajusta los filtros"
                  : "No hay pacientes registrados"
                }
              </p>
            </div>
            {(searchTerm || statusFilter !== "all") && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          processedPatients.map((patient) => (
            <MobileCard key={patient.id} patient={patient} />
          ))
        )}
      </div>
    </div>
  )
}

// Memoizar el componente completo
const PatientTable = memo(PatientTableComponent)
PatientTable.displayName = "PatientTable"
export default PatientTable