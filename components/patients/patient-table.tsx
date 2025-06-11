"use client"

import React, { useState, useMemo, useCallback, FC, memo, useRef, useEffect, startTransition } from "react"
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table"
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
  Hash,
  ArrowUpDown,
  FileText,
  Activity,
  Users,
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

// Funciones Utilitarias mejoradas con mejor tipado
const formatText = (text: string | undefined | null): string => {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

const formatDateTime = (date: string | Date | undefined | null, format: "short" | "long" = "short"): string => {
  if (!date) return "No registrada"
  const dateObj = date instanceof Date ? date : new Date(date)
  if (isNaN(dateObj.getTime())) return "Fecha inválida"
  
  const now = new Date()
  const diffTime = now.getTime() - dateObj.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Mostrar tiempo relativo para fechas recientes
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  
  if (format === "short") {
    return dateObj.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
  
  const datePart = dateObj.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  
  const hasTime = date instanceof Date || (typeof date === 'string' && (date.includes('T') || date.includes(' ')))
  if (hasTime && (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0)) {
    const timePart = dateObj.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    return `${datePart}, ${timePart}`
  }
  return datePart
}

// Configuración mejorada de colores con mejor contraste
const diagnosticColorMap = new Map<string, string>([
  ["hernia", "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50 shadow-blue-100/50 dark:shadow-blue-900/20"],
  ["cole", "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/50 shadow-purple-100/50 dark:shadow-purple-900/20"],
  ["eventra", "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50 shadow-amber-100/50 dark:shadow-amber-900/20"],
  ["apendicitis", "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50 shadow-red-100/50 dark:shadow-red-900/20"],
  ["lipoma", "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50 shadow-emerald-100/50 dark:shadow-emerald-900/20"],
  ["quiste", "bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50 shadow-orange-100/50 dark:shadow-orange-900/20"],
])

const defaultDiagnosticColor = "bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800/50 shadow-slate-100/50 dark:shadow-slate-900/20"

const getDiagnosticColor = (diagnostic: string | undefined | null): string => {
  if (!diagnostic) return defaultDiagnosticColor
  const lowerDiag = diagnostic.toLowerCase()
  for (const [key, value] of diagnosticColorMap) {
    if (lowerDiag.includes(key)) return value
  }
  return defaultDiagnosticColor
}

// Componente SortableHeaderCell mejorado
interface SortableHeaderCellProps {
  children: React.ReactNode
  sortKey: keyof EnrichedPatientData
  className?: string
  currentSortConfig: SortConfig
  onSort: (key: keyof EnrichedPatientData) => void
  icon?: React.ElementType
  align?: "left" | "center" | "right"
}

const SortableHeaderCell: React.FC<SortableHeaderCellProps> = React.memo(({
  children,
  sortKey,
  className,
  currentSortConfig,
  onSort,
  icon: IconComponent,
  align = "left"
}) => {
  const isSorted = currentSortConfig.key === sortKey
  const isAsc = currentSortConfig.direction === "asc"
  
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none font-medium text-xs uppercase tracking-wider",
        "text-slate-600 dark:text-slate-400",
        "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200",
        "border-b border-slate-200 dark:border-slate-700",
        align === "center" && "text-center",
        align === "right" && "text-right",
        isSorted && "bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-100",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className={cn(
        "flex items-center gap-2 py-3",
        align === "center" && "justify-center",
        align === "right" && "justify-end"
      )}>
        {IconComponent && <IconComponent className="h-4 w-4 opacity-50" />}
        <span>{children}</span>
        <div className="ml-1 opacity-50">
          {isSorted ? (
            isAsc ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-30" />
          )}
        </div>
      </div>
    </TableHead>
  )
})
SortableHeaderCell.displayName = "SortableHeaderCell"

// Componente PatientRow mejorado con animaciones
interface PatientRowProps {
  patient: EnrichedPatientData
  onSelectPatient: (patient: PatientData) => void
  onShareSurvey?: (patient: PatientData) => void
  onAnswerSurvey?: (patient: PatientData) => void
  onEditPatient?: (patient: PatientData) => void
  index: number
}

const PatientTableRow: React.FC<PatientRowProps> = React.memo(({
  patient,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
  index,
}) => {
  const handleSelectPatient = useCallback(() => onSelectPatient(patient), [onSelectPatient, patient])
  const [isHovered, setIsHovered] = useState(false)
  
  const handleDropdownAction = useCallback((action?: (p: PatientData) => void) => (e: React.MouseEvent) => {
    e.stopPropagation()
    action?.(patient)
  }, [patient])

  return (
    <tr
      className={cn(
        "group cursor-pointer",
        "hover:bg-slate-50/70 dark:hover:bg-slate-800/50",
        "transition-colors duration-150",
        isHovered && "bg-slate-50/70 dark:bg-slate-800/50",
        "animate-tableRowFadeIn"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
      onClick={handleSelectPatient}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Paciente */}
      <TableCell className="py-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200",
            "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800",
            "group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-900/30 dark:group-hover:to-blue-800/30",
            "shadow-sm group-hover:shadow-md"
          )}>
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Hash className="h-3 w-3 opacity-50" />
              <span className="font-mono">{patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Edad */}
      <TableCell className="text-center lg:table-cell hidden">
        {patient.edad ? (
          <span className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
            "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20",
            "text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-700/30"
          )}>
            {patient.edad} años
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
        )}
      </TableCell>

      {/* Diagnóstico */}
      <TableCell>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="max-w-[200px] lg:max-w-[250px]">
                <span className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium",
                  "border transition-all duration-200 cursor-help",
                  "shadow-sm hover:shadow-md",
                  getDiagnosticColor(patient.diagnostico_principal)
                )}>
                  <Stethoscope className="h-3.5 w-3.5 opacity-60" />
                  <span className="truncate">
                    {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
                  </span>
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
              <p className="font-medium text-sm mb-1">Diagnóstico completo:</p>
              <p className="text-xs">{formatText(patient.diagnostico_principal) || "Sin diagnóstico especificado"}</p>
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
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {formatDateTime(patient.fecha_registro)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {patient.fecha_registro
                        ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", { weekday: "short" })
                        : "—"
                      }
                    </p>
                  </div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-sm">{formatDateTime(patient.fecha_registro, "long")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>

      {/* Estado */}
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
              <div className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200",
                patient.encuesta_completada 
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              )}>
                {patient.encuesta_completada ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
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
              className={cn(
                "h-8 w-8 p-0 transition-all duration-200",
                "opacity-0 group-hover:opacity-100 focus:opacity-100",
                "hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 backdrop-blur-sm bg-white/95 dark:bg-slate-900/95">
            <DropdownMenuItem
              onClick={handleDropdownAction(onSelectPatient)}
              className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Eye className="h-4 w-4 text-slate-500" />
              Ver detalles
            </DropdownMenuItem>

            {onEditPatient && (
              <DropdownMenuItem
                onClick={handleDropdownAction(onEditPatient)}
                className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Edit className="h-4 w-4 text-slate-500" />
                Editar paciente
              </DropdownMenuItem>
            )}

            {(onAnswerSurvey || onShareSurvey) && !patient.encuesta_completada && (
              <>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                {onAnswerSurvey && (
                  <DropdownMenuItem
                    onClick={handleDropdownAction(onAnswerSurvey)}
                    className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <ClipboardList className="h-4 w-4 text-slate-500" />
                    Contestar encuesta
                  </DropdownMenuItem>
                )}
                {onShareSurvey && (
                  <DropdownMenuItem
                    onClick={handleDropdownAction(onShareSurvey)}
                    className="flex items-center gap-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Share2 className="h-4 w-4 text-slate-500" />
                    Compartir encuesta
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </tr>
  )
})
PatientTableRow.displayName = "PatientTableRow"

// Componente Principal PatientTable mejorado
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

      if (key.includes("fecha")) {
        const aTime = new Date(aVal as string).getTime()
        const bTime = new Date(bVal as string).getTime()
        if (isNaN(aTime) && isNaN(bTime)) return 0
        if (isNaN(aTime)) return 1
        if (isNaN(bTime)) return -1
        return direction === "asc" ? aTime - bTime : bTime - aTime
      }
      
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return direction === "asc" ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1)
      }
      
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal
      }
      
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
  }, [patients, sortConfig])

  const handleSort = useCallback((key: keyof EnrichedPatientData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }))
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-slate-800" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white dark:bg-slate-900">
                <div className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-slate-800/30">
            <TableRow className="border-none">
              <SortableHeaderCell 
                sortKey="nombreCompleto" 
                currentSortConfig={sortConfig} 
                onSort={handleSort} 
                icon={User2}
                className="min-w-[200px]"
              >
                Paciente
              </SortableHeaderCell>
              <SortableHeaderCell 
                sortKey="edad" 
                currentSortConfig={sortConfig} 
                onSort={handleSort} 
                icon={Clock}
                align="center"
                className="w-32 lg:table-cell hidden"
              >
                Edad
              </SortableHeaderCell>
              <SortableHeaderCell 
                sortKey="diagnostico_principal" 
                currentSortConfig={sortConfig} 
                onSort={handleSort} 
                icon={Stethoscope}
                className="min-w-[200px] lg:min-w-[250px]"
              >
                Diagnóstico
              </SortableHeaderCell>
              <SortableHeaderCell 
                sortKey="fecha_registro" 
                currentSortConfig={sortConfig} 
                onSort={handleSort} 
                icon={Calendar}
                className="w-40"
              >
                Registro
              </SortableHeaderCell>
              <SortableHeaderCell 
                sortKey="estado_paciente" 
                currentSortConfig={sortConfig} 
                onSort={handleSort}
                icon={Activity}
                className="w-40 xl:table-cell hidden"
              >
                Estado
              </SortableHeaderCell>
              <SortableHeaderCell 
                sortKey="encuesta_completada" 
                currentSortConfig={sortConfig} 
                onSort={handleSort}
                icon={FileText}
                align="center"
                className="w-24"
              >
                Encuesta
              </SortableHeaderCell>
              <TableHead className="w-20 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence>
              {sortedPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <Stethoscope className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                      </div>
                      <div>
                        <p className="font-medium text-lg text-slate-900 dark:text-slate-100">
                          No hay pacientes registrados
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Los pacientes aparecerán aquí cuando sean agregados
                        </p>
                      </div>
                    </motion.div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedPatients.map((patient, index) => (
                  <PatientTableRow
                    key={patient.id}
                    patient={patient}
                    onSelectPatient={onSelectPatient}
                    onShareSurvey={onShareSurvey}
                    onAnswerSurvey={onAnswerSurvey}
                    onEditPatient={onEditPatient}
                    index={index}
                  />
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default PatientTable