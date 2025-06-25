import React, { useState, useMemo, useCallback } from "react"
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
} from "lucide-react"
import PatientStatus from "./patient-status"
import { cn } from "@/lib/utils"
import { Patient, PatientStatusEnum, DiagnosisEnum } from "@/lib/types"
import { Button } from "@/components/ui/button"

export interface EnrichedPatientData extends Omit<Patient, 'diagnostico_principal' | 'edad'> {
  nombreCompleto: string
  fecha_proxima_cita?: string
  encuesta_completada: boolean
  displayDiagnostico: string
  diagnostico_principal: Patient['diagnostico_principal']
  edad: number | null
  fecha_registro: string
}

interface PatientTableProps {
  patients: EnrichedPatientData[]
  loading?: boolean
  onSelectPatient: (patient: Patient) => void
  onShareSurvey?: (patient: Patient) => void
  onAnswerSurvey?: (patient: Patient) => void
  onEditPatient?: (patient: Patient) => void
  onScheduleAppointment?: (patient: Patient) => void
}

type SortConfig = {
  key: keyof EnrichedPatientData
  direction: "asc" | "desc"
}

// Funciones utilitarias optimizadas
const formatText = (text: string | undefined | null): string => {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "No registrada"
  const dateObj = date instanceof Date ? date : new Date(date)
  if (isNaN(dateObj.getTime())) return "Fecha inválida"
  
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `${diffDays}d`
  
  return dateObj.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  })
}

// Configuración de colores de diagnóstico con soporte para modo oscuro
const getDiagnosticStyle = (diagnostic: string | undefined | null): string => {
  if (!diagnostic) return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
  
  const lower = diagnostic.toLowerCase()
  if (lower.includes("hernia")) {
    return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
  }
  if (lower.includes("cole")) {
    return "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
  }
  if (lower.includes("eventra")) {
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
  }
  if (lower.includes("apendicitis")) {
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
  }
  if (lower.includes("lipoma")) {
    return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
  }
  if (lower.includes("quiste")) {
    return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
  }
  
  return "bg-slate-100 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
}

// Componente de cabecera sorteable simplificado
const SortableHeader = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort, 
  icon: Icon,
  className = ""
}: {
  children: React.ReactNode
  sortKey: keyof EnrichedPatientData
  currentSort: SortConfig
  onSort: (key: keyof EnrichedPatientData) => void
  icon?: React.ElementType
  className?: string
}) => {
  const isSorted = currentSort.key === sortKey
  const isAsc = currentSort.direction === "asc"
  
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none font-medium text-xs uppercase tracking-wider",
        "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
        "border-b border-slate-200 dark:border-slate-700",
        isSorted && "bg-slate-50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-100",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2 py-3">
        {Icon && <Icon className="h-4 w-4 opacity-50" />}
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
}

// Vista de tarjeta para móviles
const PatientCard = ({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment
}: {
  patient: EnrichedPatientData
  onSelectPatient: (patient: Patient) => void
  onShareSurvey?: (patient: Patient) => void
  onAnswerSurvey?: (patient: Patient) => void
  onEditPatient?: (patient: Patient) => void
  onScheduleAppointment?: (patient: Patient) => void
}) => {
  return (
    <div 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 cursor-pointer shadow-sm"
      onClick={() => onSelectPatient(patient)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 flex items-center justify-center gap-1 opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only text-xs">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
              Ver detalles del paciente
            </DropdownMenuItem>
            {onEditPatient && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                <Edit className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
                Editar datos del paciente
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            {!patient.encuesta_completada ? (
              <>
                {onAnswerSurvey && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAnswerSurvey(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                    <ClipboardList className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" />
                    Completar encuesta clínica
                  </DropdownMenuItem>
                )}
                {onShareSurvey && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShareSurvey(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                    <Share2 className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    Enviar enlace de encuesta
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                <FileText className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" />
                Ver resultados de encuesta
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem onClick={(e) => { 
              e.stopPropagation();
              // Solo llamamos si la función existe
              if (onScheduleAppointment) onScheduleAppointment(patient);
            }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-400" />
              Agendar cita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { 
              e.stopPropagation();
              const url = `/dashboard/patients/${patient.id}?tab=medical`; 
              onSelectPatient(patient);
            }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Activity className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
              Ver historial médico
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="space-y-1.5">
        {/* Diagnóstico */}
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-slate-400 dark:text-slate-600" />
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
            getDiagnosticStyle(patient.diagnostico_principal)
          )}>
            {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
          </span>
        </div>

        {/* Fecha y edad */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(patient.fecha_registro)}</span>
          </div>
          {patient.edad && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <span>{patient.edad} años</span>
            </div>
          )}
        </div>

        {/* Estado y encuesta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="hidden sm:block">
            <PatientStatus
              status={patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
              surveyCompleted={patient.encuesta_completada}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Encuesta:</span>
            {patient.encuesta_completada ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Fila de tabla optimizada
const PatientRow = ({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment
}: {
  patient: EnrichedPatientData
  onSelectPatient: (patient: Patient) => void
  onShareSurvey?: (patient: Patient) => void
  onAnswerSurvey?: (patient: Patient) => void
  onEditPatient?: (patient: Patient) => void
  onScheduleAppointment?: (patient: Patient) => void
}) => {
  return (
    <TableRow 
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
      onClick={() => onSelectPatient(patient)}
    >
      {/* Paciente */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-medium">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
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
      <TableCell className="text-center hidden lg:table-cell">
        {patient.edad ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            {patient.edad} años
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-600 text-sm">—</span>
        )}
      </TableCell>

      {/* Diagnóstico */}
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
          getDiagnosticStyle(patient.diagnostico_principal)
        )}>
          <Stethoscope className="h-3.5 w-3.5 opacity-60" />
          <span className="truncate max-w-[150px] lg:max-w-[200px]">
            {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
          </span>
        </span>
      </TableCell>

      {/* Fecha */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-600" />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-100">
              {formatDate(patient.fecha_registro)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              {patient.fecha_registro
                ? new Date(patient.fecha_registro).toLocaleDateString("es-ES", { weekday: "short" })
                : "—"
              }
            </p>
          </div>
        </div>
      </TableCell>

      {/* Estado */}
      <TableCell className="py-3 hidden sm:table-cell">
        <PatientStatus
          status={patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA}
          surveyCompleted={patient.encuesta_completada}
        />
      </TableCell>

      {/* Encuesta */}
      <TableCell className="text-center">
        <div className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full",
          patient.encuesta_completada 
            ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
            : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
        )}>
          {patient.encuesta_completada ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>
      </TableCell>

      {/* Acciones */}
      <TableCell className="text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline" 
              size="sm" 
              className="h-8 flex items-center justify-center gap-1 opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only md:not-sr-only text-xs">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-lg">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Eye className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
              Ver detalles del paciente
            </DropdownMenuItem>
            {onEditPatient && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                <Edit className="h-4 w-4 mr-2 text-amber-500 dark:text-amber-400" />
                Editar datos del paciente
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            {!patient.encuesta_completada ? (
              <>
                {onAnswerSurvey && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAnswerSurvey(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                    <ClipboardList className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" />
                    Completar encuesta clínica
                  </DropdownMenuItem>
                )}
                {onShareSurvey && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onShareSurvey(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                    <Share2 className="h-4 w-4 mr-2 text-purple-500 dark:text-purple-400" />
                    Enviar enlace de encuesta
                  </DropdownMenuItem>
                )}
              </>
            ) : (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectPatient(patient); }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
                <FileText className="h-4 w-4 mr-2 text-emerald-500 dark:text-emerald-400" />
                Ver resultados de encuesta
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
            <DropdownMenuItem onClick={(e) => { 
              e.stopPropagation();
              // Solo llamamos si la función existe
              if (onScheduleAppointment) onScheduleAppointment(patient);
            }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Calendar className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-400" />
              Agendar cita
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { 
              e.stopPropagation();
              const url = `/dashboard/patients/${patient.id}?tab=medical`; 
              onSelectPatient(patient);
            }} className="text-slate-700 dark:text-slate-300 focus:bg-slate-100 dark:focus:bg-slate-800">
              <Activity className="h-4 w-4 mr-2 text-red-500 dark:text-red-400" />
              Ver historial médico
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// Componente principal optimizado
const PatientTable: React.FC<PatientTableProps> = ({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
  onScheduleAppointment,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "fecha_registro",
    direction: "desc",
  })

  // Simplificado: solo ordenar cuando sea necesario
  // Sorting logic - memoized to avoid unnecessary re-sorts
  const sortedPatients = useMemo(() => {
    if (!patients?.length) return [];
    
    return [...patients].sort((a, b) => {
      const { key, direction } = sortConfig;
      const aVal = a[key];
      const bVal = b[key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return direction === "asc" ? 1 : -1;
      if (bVal == null) return direction === "asc" ? -1 : 1;

      // Fechas
      if (typeof aVal === "string" && typeof bVal === "string" && 
          (key.toString().includes("fecha") || key.toString().includes("created"))) {
        const aTime = new Date(aVal).getTime();
        const bTime = new Date(bVal).getTime();
        return direction === "asc" ? aTime - bTime : bTime - aTime;
      }
      
      // Booleanos
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return direction === "asc" ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1);
      }
      
      // Números
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }
      
      // Strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [patients, sortConfig]);

  const handleSort = useCallback((key: keyof EnrichedPatientData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-slate-100 dark:bg-slate-800" />
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 5 }).map((_, i) => (
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

  if (sortedPatients.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-16 text-center">
        <div className="flex flex-col items-center gap-4">
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
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Vista móvil - Cards */}
      <div className="block lg:hidden">
        <div className="space-y-2.5">
          {sortedPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onSelectPatient={onSelectPatient}
              onShareSurvey={onShareSurvey}
              onAnswerSurvey={onAnswerSurvey}
              onEditPatient={onEditPatient}
              onScheduleAppointment={onScheduleAppointment}
            />
          ))}
        </div>
      </div>

      {/* Vista desktop - Table */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800">
              <TableRow className="border-none">
                <SortableHeader 
                  sortKey="nombreCompleto" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  icon={User2}
                  className="min-w-[200px]"
                >
                  Paciente
                </SortableHeader>
                <SortableHeader 
                  sortKey="edad" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  icon={Clock}
                  className="w-32 hidden lg:table-cell"
                >
                  Edad
                </SortableHeader>
                <SortableHeader 
                  sortKey="diagnostico_principal" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  icon={Stethoscope}
                  className="min-w-[200px]"
                >
                  Diagnóstico
                </SortableHeader>
                <SortableHeader 
                  sortKey="fecha_registro" 
                  currentSort={sortConfig} 
                  onSort={handleSort} 
                  icon={Calendar}
                  className="w-40"
                >
                  Registro
                </SortableHeader>
                <SortableHeader 
                  sortKey="estado_paciente" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                  icon={Activity}
                  className="w-40 hidden xl:table-cell"
                >
                  Estado
                </SortableHeader>
                <SortableHeader 
                  sortKey="encuesta_completada" 
                  currentSort={sortConfig} 
                  onSort={handleSort}
                  icon={FileText}
                  className="w-24"
                >
                  Encuesta
                </SortableHeader>
                <TableHead className="w-20 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onSelectPatient={onSelectPatient}
                  onShareSurvey={onShareSurvey}
                  onAnswerSurvey={onAnswerSurvey}
                  onEditPatient={onEditPatient}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}

export default PatientTable