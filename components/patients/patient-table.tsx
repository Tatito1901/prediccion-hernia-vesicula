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
  FileText as FileTextIcon,
  Phone,
  BriefcaseMedical,
  User,
} from "lucide-react"
import PatientStatus from "./patient-status"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"
import { Button } from "@/components/ui/button"

// Interfaz para datos enriquecidos de pacientes (debe coincidir con PatientManagement)
export interface EnrichedPatientData extends PatientData {
  nombreCompleto: string
  fecha_proxima_cita?: string
  encuesta_completada: boolean
  displayDiagnostico: string
  // Campos críticos para la tabla de historial
  diagnostico_principal: string
  edad?: number
  fecha_registro: string
}

interface PatientTableProps {
  patients: EnrichedPatientData[]
  loading?: boolean
  onSelectPatient: (patient: PatientData) => void
  onShareSurvey?: (patient: PatientData) => void
  onAnswerSurvey?: (patient: PatientData) => void
  onEditPatient?: (patient: PatientData) => void
}

type SortableColumnKey =
  | "nombreCompleto"
  | "fecha_proxima_cita"
  | "diagnostico_principal"
  | "estado_paciente"
  | "encuesta_completada"
  | "fecha_registro"
  | "edad"

type TableColumnKey =
  | "nombre"
  | "edad"
  | "fechaConsulta"
  | "diagnostico_principal"
  | "estado"
  | "encuesta"
  | "acciones"

interface SortConfig {
  key: SortableColumnKey
  direction: "asc" | "desc"
}

interface Column<T extends EnrichedPatientData> {
  key: TableColumnKey
  label: string
  icon?: React.ReactNode
  widthClass?: string
  hideBelow?: "sm" | "md" | "lg" | "xl"
  align?: "left" | "center" | "right"
  renderCell: (item: T) => React.ReactNode
  sortable?: boolean
}

const TABLE_KEY_TO_SORTABLE_KEY: Partial<
  Record<TableColumnKey, SortableColumnKey>
> = {
  nombre: "nombreCompleto",
  edad: "edad",
  fechaConsulta: "fecha_registro",
  fechaRevision: "fecha_proxima_cita",
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
  // Debug: Verificar datos de pacientes
  console.log("PATIENT_TABLE DEBUG: Datos recibidos:", {
    totalPatients: patients?.length || 0,
    samplePatient: patients?.[0] ? {
      id: patients[0].id,
      nombreCompleto: patients[0].nombreCompleto,
      edad: patients[0].edad,
      diagnostico_principal: patients[0].diagnostico_principal,
      fecha_registro: patients[0].fecha_registro,
      encuesta_completada: patients[0].encuesta_completada
    } : null
  });
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "fecha_registro",
    direction: "desc",
  })

  const toggleSort = useCallback((key: SortableColumnKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  // Procesamiento optimizado de pacientes con ordenamiento
  const processedPatients = useMemo(() => {
    if (loading || !patients) return []

    // Ordenamiento optimizado
    const { key, direction } = sortConfig
    const asc = direction === "asc"

    return [...patients].sort((a, b) => {
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
  }, [patients, loading, sortConfig])

  // Definición de columnas optimizada - TODAS las columnas críticas SIEMPRE visibles
  const columns = useMemo<Column<EnrichedPatientData>[]>(() => [
    {
      key: "nombre",
      label: "Nombre",
      icon: <User className="h-4 w-4" />,
      widthClass: "min-w-[180px] max-w-[250px]",
      sortable: true,
      renderCell: (patient: EnrichedPatientData) => (
        <div className="flex flex-col gap-0.5">
          <button
            onClick={() => onSelectPatient(patient)}
            className="font-semibold text-left hover:underline text-blue-700 dark:text-blue-400 truncate transition-colors"
          >
            {normalizarTexto(patient.nombreCompleto)}
          </button>
          <span className="text-xs text-muted-foreground">
            ID: {patient.id.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: "edad",
      label: "Edad",
      widthClass: "w-[90px]",
      sortable: true,
      // SIEMPRE VISIBLE - Sin hideBelow
      renderCell: (patient: EnrichedPatientData) => (
        <div className="text-center">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
            {patient.edad ? `${patient.edad}` : "N/D"}
          </span>
          {patient.edad && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">años</p>
          )}
        </div>
      ),
    },
    {
      key: "diagnostico_principal",
      label: "Diagnóstico / Motivo",
      icon: <BriefcaseMedical className="h-4 w-4" />,
      widthClass: "min-w-[200px] max-w-[320px]",
      sortable: true,
      // SIEMPRE VISIBLE - Sin hideBelow
      renderCell: (patient: EnrichedPatientData) => {
        const diagnostico = normalizarTexto(patient.diagnostico_principal)
        let badgeColor = "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
        
        // Códigos de color por especialidad médica
        if (diagnostico.includes("HERNIA")) {
          badgeColor = "bg-blue-50 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200"
        } else if (diagnostico.includes("COLE")) {
          badgeColor = "bg-purple-50 text-purple-800 dark:bg-purple-900 dark:text-purple-200 border border-purple-200"
        } else if (diagnostico.includes("EVENTRA")) {
          badgeColor = "bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border border-amber-200"
        } else if (diagnostico.includes("APENDICITIS")) {
          badgeColor = "bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200"
        } else if (diagnostico.includes("LIPOMA")) {
          badgeColor = "bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200"
        } else if (diagnostico.includes("QUISTE")) {
          badgeColor = "bg-orange-50 text-orange-800 dark:bg-orange-900 dark:text-orange-200 border border-orange-200"
        }
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <span 
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold cursor-help truncate max-w-[280px] block",
                      badgeColor
                    )}
                  >
                    {diagnostico || "Sin diagnóstico"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-sm font-medium">Motivo de consulta:</p>
                <p className="text-sm">{diagnostico || "Sin diagnóstico especificado"}</p>
                {patient.diagnostico_principal_detalle && (
                  <p className="text-xs mt-1 text-muted-foreground">{normalizarTexto(patient.diagnostico_principal_detalle)}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
    },
    {
      key: "fechaConsulta",
      label: "Fecha de Atención",
      icon: <CalendarDays className="h-4 w-4" />,
      widthClass: "w-[140px]",
      sortable: true,
      // SIEMPRE VISIBLE - Sin hideBelow
      renderCell: (patient: EnrichedPatientData) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col gap-0.5 text-center">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {patient.fecha_registro
                    ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        year: "2-digit",
                      })
                    : "No registrada"}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {patient.fecha_registro
                    ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", {
                        weekday: "short",
                      })
                    : "-"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm font-medium">Fecha de primera atención</p>
              <p className="text-sm">
                {patient.fecha_registro
                  ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Fecha no registrada"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ),
    },
    {
      key: "estado",
      label: "Estado",
      widthClass: "w-[160px]",
      sortable: true,
      renderCell: (patient: EnrichedPatientData) => (
        <PatientStatus
          status={patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
          surveyCompleted={patient.encuesta_completada}
        />
      ),
    },
    {
      key: "encuesta",
      label: "Encuesta",
      align: "center",
      widthClass: "w-[100px]",
      sortable: true,
      renderCell: (patient) => {
        let icon: React.ReactNode, tooltip: string, colorClass: string

        if (patient.encuesta_completada) {
          icon = <CheckCircle2 className="h-5 w-5" />
          tooltip = "Encuesta completada"
          colorClass = "text-green-600 dark:text-green-500"
        } else if (patient.encuesta?.id) {
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
      renderCell: (patient: EnrichedPatientData) => (
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
                  <Edit className="h-4 w-4" /> Editar paciente
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onAnswerSurvey && !patient.encuesta_completada && (
                <DropdownMenuItem
                  onClick={() => onAnswerSurvey(patient)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ClipboardList className="h-4 w-4" /> Contestar encuesta
                </DropdownMenuItem>
              )}
              {onShareSurvey && !patient.encuesta_completada && (
                <DropdownMenuItem
                  onClick={() => onShareSurvey(patient)}
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
  ], [onSelectPatient, onEditPatient, onAnswerSurvey, onShareSurvey])

  // Componente de fila memoizado
  const TableRowItem = memo(({ patient }: { patient: EnrichedPatientData }) => (
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

  // Componente de tarjeta móvil optimizado - HISTORIAL MÉDICO COMPLETO
  const MobileCard = memo(({ patient }: { patient: EnrichedPatientData }) => (
    <div 
      className="bg-white dark:bg-slate-900 shadow-md hover:shadow-lg rounded-xl p-5 mb-4 transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
      onClick={() => onSelectPatient(patient)}
    >
      {/* Header del paciente */}
      <div className="flex justify-between items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {normalizarTexto(patient.nombreCompleto)}
            </h3>
            {patient.edad && (
              <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full font-bold border border-blue-200">
                {patient.edad} años
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            ID: {patient.id.slice(0, 8)}
          </p>
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

      {/* Información crítica del historial médico */}
      <div className="grid grid-cols-1 gap-3">
        {/* Fecha de atención - PROMINENTE */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="p-2 bg-blue-500 rounded-lg">
            <CalendarDays className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wide">Fecha de Atención</p>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
              {patient.fecha_registro
                ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    weekday: "long",
                  })
                : "No registrada"}
            </p>
          </div>
        </div>

        {/* Diagnóstico/Motivo - PROMINENTE */}
        {patient.diagnostico_principal && (
          <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="p-2 bg-purple-500 rounded-lg">
              <BriefcaseMedical className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wide">Motivo de Consulta</p>
              <p className="text-sm font-bold text-purple-900 dark:text-purple-200 line-clamp-2">
                {normalizarTexto(patient.diagnostico_principal)}
              </p>
            </div>
          </div>
        )}

        {/* Estado de encuesta */}
        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {patient.encuesta_completada ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">Encuesta Completada</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Encuesta Pendiente</span>
              </>
            )}
          </div>
        </div>

        {/* Próxima revisión si existe */}
        {patient.fecha_proxima_cita && (
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg border border-green-200 dark:border-green-800">
            <div className="p-2 bg-green-500 rounded-lg">
              <CalendarDays className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase tracking-wide">Próxima Revisión</p>
              <p className="text-sm font-bold text-green-900 dark:text-green-200">
                {new Date(patient.fecha_proxima_cita).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  ))
  MobileCard.displayName = "MobileCard"

  if (loading) {
    return <TableSkeleton rows={8} columns={columns.length} />
  }

  return (
    <div className="bg-white dark:bg-slate-950 shadow-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Vista Desktop - Tabla */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => {
                const sortableKey = TABLE_KEY_TO_SORTABLE_KEY[col.key]
                const isSorted = sortableKey === sortConfig.key
                const canSort = col.sortable && sortableKey
                
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider select-none bg-slate-50 dark:bg-slate-900",
                      col.widthClass,
                      // NUNCA ocultar las columnas críticas
                      col.hideBelow && `hidden ${col.hideBelow}:table-cell`,
                      col.align === "center" && "text-center",
                      col.align === "right" && "text-right",
                      canSort && "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    )}
                    onClick={canSort ? () => toggleSort(sortableKey) : undefined}
                  >
                    <div
                      className={cn("inline-flex items-center gap-1.5 py-2", {
                        "justify-center": col.align === "center",
                        "justify-end": col.align === "right",
                      })}
                    >
                      {col.icon}
                      <span className="font-bold">{col.label}</span>
                      {canSort && (
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
                      <BriefcaseMedical className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        No hay registros de atención médica
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Los pacientes atendidos aparecerán aquí con su historial completo
                      </p>
                    </div>
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
              <BriefcaseMedical className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                No hay registros de atención médica
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Los pacientes atendidos aparecerán aquí con su historial completo
              </p>
            </div>
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