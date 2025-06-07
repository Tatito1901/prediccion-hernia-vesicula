import React, { useState, useMemo } from "react"
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
  Calendar,
  Stethoscope,
  User2,
  Clock,
  Phone,
} from "lucide-react"
import PatientStatus from "./patient-status"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum, DiagnosisType } from "@/app/dashboard/data-model"
import { Button } from "@/components/ui/button"

export interface EnrichedPatientData extends PatientData {
  nombreCompleto: string
  fecha_proxima_cita?: string
  encuesta_completada: boolean
  displayDiagnostico: string
  diagnostico_principal?: DiagnosisType
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

type SortConfig = {
  key: keyof EnrichedPatientData
  direction: "asc" | "desc"
}

const formatText = (text: string | undefined | null): string => {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

const formatDateTime = (date: string | undefined, format: "short" | "long" = "short"): string => {
  if (!date) return "No registrada";

  const dateObj = new Date(date);
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return "Fecha inválida"; 
  }

  if (format === "short") {
    return dateObj.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric", // Changed from 2-digit for clarity
    });
  }

  // Long format
  const datePart = dateObj.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Check if the original date string likely contained time information or if the parsed date object has a non-midnight time.
  const hasTime = date.includes('T') || dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;

  if (hasTime) {
    const timePart = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // Using 24-hour format
    });
    return `${datePart}, ${timePart}`;
  }

  return datePart;
};

const getDiagnosticColor = (diagnostic: string): string => {
  const lowerDiag = diagnostic.toLowerCase()
  if (lowerDiag.includes("hernia")) return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700/50"
  if (lowerDiag.includes("cole")) return "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700/50"
  if (lowerDiag.includes("eventra")) return "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/50"
  if (lowerDiag.includes("apendicitis")) return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700/50"
  if (lowerDiag.includes("lipoma")) return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700/50"
  if (lowerDiag.includes("quiste")) return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-700/50"
  return "bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-300 border-gray-200 dark:border-slate-700"
};

const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "fecha_registro",
    direction: "desc",
  })

  const sortedPatients = useMemo(() => {
    if (!patients?.length) return []

    return [...patients].sort((a, b) => {
      const { key, direction } = sortConfig
      const aVal = a[key]
      const bVal = b[key]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return direction === "asc" ? 1 : -1
      if (bVal == null) return direction === "asc" ? -1 : 1

      // Handle dates
      if (key.includes("fecha")) {
        const aTime = new Date(aVal as string).getTime()
        const bTime = new Date(bVal as string).getTime()
        return direction === "asc" ? aTime - bTime : bTime - aTime
      }

      // Handle booleans
      if (typeof aVal === "boolean") {
        if (aVal === bVal) return 0
        return direction === "asc" ? (aVal ? 1 : -1) : (aVal ? -1 : 1)
      }

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [patients, sortConfig])

  const handleSort = (key: keyof EnrichedPatientData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const SortableHeader = ({ 
    children, 
    sortKey, 
    className 
  }: { 
    children: React.ReactNode
    sortKey: keyof EnrichedPatientData
    className?: string 
  }) => {
    const isSorted = sortConfig.key === sortKey
    return (
      <TableHead 
        className={cn(
          "cursor-pointer hover:bg-muted/80 dark:hover:bg-slate-700/50 transition-colors select-none font-semibold text-foreground dark:text-slate-300",
          className
        )}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-2">
          {children}
          {isSorted && (
            sortConfig.direction === "asc" 
              ? <ChevronUp className="h-4 w-4" />
              : <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </TableHead>
    )
  }

  if (loading && patients.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden dark:bg-slate-800 dark:border-slate-700">
        <div className="block md:hidden p-4">
          {/* Skeleton para móvil */}
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted dark:bg-slate-700 h-32 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden md:block">
          <TableSkeleton rows={8} columns={6} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden dark:bg-slate-900 dark:border-slate-700">


      {/* Vista tablet y desktop - Tabla */}
      <div className="block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                <SortableHeader sortKey="nombreCompleto" className="min-w-[200px]">
                  <User2 className="h-4 w-4" />
                  Paciente
                </SortableHeader>
                <SortableHeader sortKey="edad" className="w-20 text-center lg:table-cell hidden">
                  <Clock className="h-4 w-4" />
                  Edad
                </SortableHeader>
                <SortableHeader sortKey="diagnostico_principal" className="min-w-[200px] lg:min-w-[250px]">
                  <Stethoscope className="h-4 w-4" />
                  Diagnóstico
                </SortableHeader>
                <SortableHeader sortKey="fecha_registro" className="w-32">
                  <Calendar className="h-4 w-4" />
                  Fecha
                </SortableHeader>
                <SortableHeader sortKey="estado_paciente" className="w-36 xl:table-cell hidden">
                  Estado
                </SortableHeader>
                <SortableHeader sortKey="encuesta_completada" className="w-24 text-center">
                  Encuesta
                </SortableHeader>
                <TableHead className="w-16 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <Stethoscope className="h-12 w-12 text-muted-foreground/50 dark:text-slate-600" />
                      <div>
                        <p className="font-medium">No hay pacientes registrados</p>
                        <p className="text-sm text-muted-foreground dark:text-slate-400">Los pacientes aparecerán aquí cuando sean agregados</p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPatients.map((patient) => (
                  <TableRow 
                    key={patient.id} 
                    className="hover:bg-muted/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    onClick={() => onSelectPatient(patient)}
                  >
                    {/* Paciente */}
                    <TableCell className="py-4">
                      <div>
                        <p className="font-semibold text-foreground dark:text-slate-100 group-hover:text-primary dark:group-hover:text-sky-400 transition-colors">
                          {formatText(patient.nombreCompleto)}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-slate-400">ID: {patient.id.slice(0, 8)}</p>
                      </div>
                    </TableCell>

                    {/* Edad - oculta en tablet */}
                    <TableCell className="text-center lg:table-cell hidden">
                      {patient.edad ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                          {patient.edad}
                        </span>
                      ) : (
                        <span className="text-muted-foreground dark:text-slate-500 text-sm">N/D</span>
                      )}
                    </TableCell>

                    {/* Diagnóstico */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[200px] lg:max-w-[250px]">
                              <span className={cn(
                                "inline-block px-3 py-1.5 rounded-lg text-xs font-medium border truncate cursor-help w-full",
                                getDiagnosticColor(patient.diagnostico_principal || "")
                              )}>
                                {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="font-medium">Diagnóstico completo:</p>
                            <p>{formatText(patient.diagnostico_principal) || "Sin diagnóstico especificado"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Fecha */}
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-center cursor-help">
                              <p className="text-sm font-medium text-gray-900">
                                {formatDateTime(patient.fecha_registro)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {patient.fecha_registro 
                                  ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", { weekday: "short" })
                                  : "-"
                                }
                              </p>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Fecha completa: {formatDateTime(patient.fecha_registro, "long")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Estado - oculto en tablet */}
                    <TableCell className="xl:table-cell hidden">
                      <PatientStatus
                        status={patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
                        surveyCompleted={patient.encuesta_completada}
                      />
                    </TableCell>

                    {/* Encuesta */}
                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              {patient.encuesta_completada ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-amber-500" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {patient.encuesta_completada ? "Encuesta completada" : "Encuesta pendiente"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectPatient(patient)
                            }}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver detalles
                          </DropdownMenuItem>
                          
                          {onEditPatient && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditPatient(patient)
                              }}
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Editar paciente
                            </DropdownMenuItem>
                          )}
                          
                          {(onAnswerSurvey || onShareSurvey) && !patient.encuesta_completada && (
                            <>
                              <DropdownMenuSeparator />
                              {onAnswerSurvey && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onAnswerSurvey(patient)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                  Contestar encuesta
                                </DropdownMenuItem>
                              )}
                              {onShareSurvey && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onShareSurvey(patient)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Share2 className="h-4 w-4" />
                                  Compartir encuesta
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

export default PatientTable