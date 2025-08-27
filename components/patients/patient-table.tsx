import React, { useState, useMemo, memo, useCallback } from "react"
import { FixedSizeList as List } from "react-window"
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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Stethoscope,
  User2,
  Clock,
  Hash,
  Phone,
  Mail,
  FileText,
  Send,
  Edit3,
  Eye,
  Activity
} from "lucide-react"
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientStatusEnum, EnrichedPatient } from "@/lib/types"
import EmptyState from "@/components/ui/empty-state"

interface PatientTableProps {
  patients: EnrichedPatient[]
  loading?: boolean
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}

type SortConfig = {
  key: keyof EnrichedPatient
  direction: "asc" | "desc"
}

// Virtualization config
const VIRTUALIZE_THRESHOLD = 100
const ROW_HEIGHT = 64 // px
const VLIST_HEIGHT = 560 // px visible area

// 🎨 Configuración de colores elegante y profesional
const THEME = {
  diagnosis: {
    hernia: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    cole: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    eventra: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    apendicitis: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
    lipoma: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    quiste: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800",
    default: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700"
  },
  status: {
    [PatientStatusEnum.POTENCIAL]: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    [PatientStatusEnum.ACTIVO]: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600",
    [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    [PatientStatusEnum.OPERADO]: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
    [PatientStatusEnum.NO_OPERADO]: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
    [PatientStatusEnum.INACTIVO]: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-700",
    [PatientStatusEnum.ALTA_MEDICA]: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/50 dark:text-slate-500 dark:border-slate-700",
  },
  survey: {
    pendiente: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700",
    sin_contestar: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
    contestando: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
    contestada: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  }
}

// ✅ Helpers optimizados con cache
const formatTextCache = new Map<string, string>()
const formatText = (text: string | undefined | null): string => {
  if (!text) return ""
  if (formatTextCache.has(text)) return formatTextCache.get(text)!
  const formatted = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  formatTextCache.set(text, formatted)
  return formatted
}

const dateFormatCache = new Map<string, string>()
const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "No registrada"
  
  const key = date.toString()
  if (dateFormatCache.has(key)) return dateFormatCache.get(key)!
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return "Fecha inválida"
    
    const formatted = dateObj.toLocaleDateString("es-ES", { 
      day: "2-digit", 
      month: "short",
      year: dateObj.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    })
    dateFormatCache.set(key, formatted)
    return formatted
  } catch {
    return "Fecha inválida"
  }
}

const getDiagnosticStyle = (diagnostic: string | null | undefined): string => {
  if (!diagnostic) return THEME.diagnosis.default
  
  const lower = diagnostic.toLowerCase()
  for (const [key, style] of Object.entries(THEME.diagnosis)) {
    if (key !== 'default' && lower.includes(key)) return style
  }
  
  return THEME.diagnosis.default
}

// Estados de encuesta
type SurveyUiState = 'pendiente' | 'sin_contestar' | 'contestando' | 'contestada'

const SURVEY_LABELS: Record<SurveyUiState, string> = {
  pendiente: 'Pendiente',
  sin_contestar: 'Sin contestar',
  contestando: 'En progreso',
  contestada: 'Completada',
}

const getPatientSurveyState = (patient: EnrichedPatient): SurveyUiState => {
  if (patient.encuesta_completada) return 'contestada'
  
  const dbStatus = patient.encuesta?.assigned_survey?.status as string | undefined
  if (dbStatus) {
    switch (dbStatus) {
      case 'completed': return 'contestada'
      case 'in_progress':
      case 'partially_completed': return 'contestando'
      case 'assigned':
      case 'expired':
      case 'skipped': return 'sin_contestar'
      default: return 'sin_contestar'
    }
  }
  
  if (patient.encuesta) return 'sin_contestar'
  return 'pendiente'
}

// ✅ Componente de cabecera optimizado
const SortableHeader = memo(({ 
  children, 
  sortKey, 
  currentSort, 
  onSort, 
  icon: Icon,
  className = ""
}: {
  children: React.ReactNode
  sortKey: keyof EnrichedPatient
  currentSort: SortConfig
  onSort: (key: keyof EnrichedPatient) => void
  icon?: React.ElementType
  className?: string
}) => {
  const isSorted = currentSort.key === sortKey
  const isAsc = currentSort.direction === "asc"
  
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none font-medium text-xs uppercase tracking-wider",
        "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
        "transition-colors duration-150",
        isSorted && "bg-slate-50 dark:bg-slate-800/50 text-teal-600 dark:text-teal-400",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2 py-3 px-2">
        {Icon && <Icon className="h-4 w-4 opacity-60" />}
        <span className="truncate">{children}</span>
        <div className="ml-auto">
          {isSorted ? (
            isAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-30" />
          )}
        </div>
      </div>
    </TableHead>
  )
})
SortableHeader.displayName = "SortableHeader"

// ✅ Componente de acciones optimizado
const PatientActions = memo(({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment,
}: {
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          onClick={handleClick}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
          <Eye className="h-4 w-4 mr-2 opacity-60" />
          Ver detalles
        </DropdownMenuItem>
        {onEditPatient && (
          <DropdownMenuItem onClick={() => onEditPatient(patient)}>
            <Edit3 className="h-4 w-4 mr-2 opacity-60" />
            Editar paciente
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onAnswerSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onAnswerSurvey(patient)}>
            <FileText className="h-4 w-4 mr-2 opacity-60" />
            Completar encuesta
          </DropdownMenuItem>
        )}
        {onShareSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onShareSurvey(patient)}>
            <Send className="h-4 w-4 mr-2 opacity-60" />
            Enviar encuesta
          </DropdownMenuItem>
        )}
        {patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
            <CheckCircle2 className="h-4 w-4 mr-2 opacity-60" />
            Ver encuesta
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onScheduleAppointment && (
          <DropdownMenuItem onClick={() => onScheduleAppointment(patient)}>
            <Calendar className="h-4 w-4 mr-2 opacity-60" />
            Agendar cita
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})
PatientActions.displayName = "PatientActions"

// ✅ Fila de tabla optimizada
const PatientRow = memo(({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment
}: {
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  const surveyState = getPatientSurveyState(patient)
  
  return (
    <TableRow 
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
      onClick={() => onSelectPatient(patient)}
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 bg-slate-700 dark:bg-slate-600">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono opacity-75">ID: {patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-center">
        {patient.edad ? (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {patient.edad} años
          </Badge>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
        )}
      </TableCell>

      <TableCell>
        <Badge className={cn(
          "border font-medium",
          getDiagnosticStyle(patient.displayDiagnostico)
        )}>
          <Stethoscope className="h-3 w-3 mr-1 opacity-60" />
          {patient.displayDiagnostico}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatDate(patient.fecha_registro)}
          </span>
        </div>
      </TableCell>

      <TableCell>
        {patient.estado_paciente && (
          <Badge className={cn(
            "border font-medium",
            THEME.status[patient.estado_paciente]
          )}>
            {patient.estado_paciente.replace(/_/g, ' ')}
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-center">
        <Badge className={cn(
          "border font-medium",
          THEME.survey[surveyState]
        )}>
          {surveyState === 'contestada' && <CheckCircle2 className="h-3 w-3 mr-1" />}
          {surveyState === 'contestando' && <Clock className="h-3 w-3 mr-1 animate-pulse" />}
          {SURVEY_LABELS[surveyState]}
        </Badge>
      </TableCell>

      <TableCell className="text-right">
        <PatientActions
          patient={patient}
          onSelectPatient={onSelectPatient}
          onShareSurvey={onShareSurvey}
          onAnswerSurvey={onAnswerSurvey}
          onEditPatient={onEditPatient}
          onScheduleAppointment={onScheduleAppointment}
        />
      </TableCell>
    </TableRow>
  )
})
PatientRow.displayName = "PatientRow"

// ✅ Vista móvil optimizada
const MobilePatientCard = memo(({ 
  patient,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
  onScheduleAppointment
}: {
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  const surveyState = getPatientSurveyState(patient)
  
  return (
    <Card 
      className="p-4 hover:shadow-md transition-all cursor-pointer border-slate-200 dark:border-slate-800"
      onClick={() => onSelectPatient(patient)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 bg-slate-700 dark:bg-slate-600">
            {patient.nombre?.charAt(0).toUpperCase() || 'P'}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {patient.nombre} {patient.apellidos}
            </h4>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={cn(
                "text-xs border",
                getDiagnosticStyle(patient.displayDiagnostico)
              )}>
                {patient.displayDiagnostico}
              </Badge>
              
              {patient.estado_paciente && (
                <Badge className={cn(
                  "text-xs border",
                  THEME.status[patient.estado_paciente]
                )}>
                  {patient.estado_paciente.replace(/_/g, ' ')}
                </Badge>
              )}
              
              <Badge className={cn(
                "text-xs border",
                THEME.survey[surveyState]
              )}>
                {SURVEY_LABELS[surveyState]}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
              {patient.telefono && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{patient.telefono}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(patient.fecha_registro)}</span>
              </div>
            </div>
          </div>
        </div>
        
        <PatientActions
          patient={patient}
          onSelectPatient={onSelectPatient}
          onShareSurvey={onShareSurvey}
          onAnswerSurvey={onAnswerSurvey}
          onEditPatient={onEditPatient}
          onScheduleAppointment={onScheduleAppointment}
        />
      </div>
    </Card>
  )
})
MobilePatientCard.displayName = "MobilePatientCard"

// ✅ Fila virtualizada (equivalente visual a PatientRow, usando CSS Grid)
const VirtualPatientRow = memo(({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment
}: {
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  const surveyState = getPatientSurveyState(patient)

  return (
    <div 
      className="grid grid-cols-[2fr_90px_2fr_1.5fr_1fr_1fr_80px] items-center gap-2 px-2 border-b border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50"
      style={{ height: ROW_HEIGHT }}
      onClick={() => onSelectPatient(patient)}
    >
      {/* Paciente */}
      <div className="py-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 bg-slate-700 dark:bg-slate-600">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono opacity-75">ID: {patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edad */}
      <div className="py-2 text-center">
        {patient.edad ? (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            {patient.edad} años
          </Badge>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
        )}
      </div>

      {/* Diagnóstico */}
      <div className="py-2">
        <Badge className={cn(
          "border font-medium",
          getDiagnosticStyle(patient.displayDiagnostico)
        )}>
          <Stethoscope className="h-3 w-3 mr-1 opacity-60" />
          {patient.displayDiagnostico}
        </Badge>
      </div>

      {/* Registro */}
      <div className="py-2">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatDate(patient.fecha_registro)}
          </span>
        </div>
      </div>

      {/* Estado */}
      <div className="py-2">
        {patient.estado_paciente && (
          <Badge className={cn(
            "border font-medium",
            THEME.status[patient.estado_paciente]
          )}>
            {patient.estado_paciente.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      {/* Encuesta */}
      <div className="py-2 text-center">
        <Badge className={cn(
          "border font-medium",
          THEME.survey[surveyState]
        )}>
          {surveyState === 'contestada' && <CheckCircle2 className="h-3 w-3 mr-1" />}
          {surveyState === 'contestando' && <Clock className="h-3 w-3 mr-1 animate-pulse" />}
          {SURVEY_LABELS[surveyState]}
        </Badge>
      </div>

      {/* Acciones */}
      <div className="py-2 text-right">
        <PatientActions
          patient={patient}
          onSelectPatient={onSelectPatient}
          onShareSurvey={onShareSurvey}
          onAnswerSurvey={onAnswerSurvey}
          onEditPatient={onEditPatient}
          onScheduleAppointment={onScheduleAppointment}
        />
      </div>
    </div>
  )
})
VirtualPatientRow.displayName = "VirtualPatientRow"

// 🚀 Componente principal optimizado
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

  // Sorting optimizado con memoización
  const sortedPatients = useMemo(() => {
    if (!patients?.length) return []
    
    return [...patients].sort((a, b) => {
      const key = sortConfig.key
      const direction = sortConfig.direction
      
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal == null) return direction === "asc" ? 1 : -1
      if (bVal == null) return direction === "asc" ? -1 : 1

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal)
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return direction === "asc" ? aVal - bVal : bVal - aVal
      }

      return 0
    })
  }, [patients, sortConfig])

  const handleSort = useCallback((key: keyof EnrichedPatient) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }))
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (sortedPatients.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12">
        <EmptyState 
          title="No hay pacientes" 
          description="Los pacientes aparecerán aquí cuando sean agregados" 
          icon={<Stethoscope className="h-10 w-10 text-slate-300 dark:text-slate-600" />} 
        />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Vista móvil */}
      <div className="block lg:hidden space-y-3">
        {sortedPatients.map((patient) => (
          <MobilePatientCard
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

      {/* Vista desktop */}
      <div className="hidden lg:block bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-800">
            <TableRow className="border-none">
              <SortableHeader 
                sortKey="nombreCompleto" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                icon={User2}
              >
                Paciente
              </SortableHeader>
              <SortableHeader 
                sortKey="edad" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                className="text-center"
              >
                Edad
              </SortableHeader>
              <SortableHeader 
                sortKey="displayDiagnostico" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                icon={Stethoscope}
              >
                Diagnóstico
              </SortableHeader>
              <SortableHeader 
                sortKey="fecha_registro" 
                currentSort={sortConfig} 
                onSort={handleSort} 
                icon={Calendar}
              >
                Registro
              </SortableHeader>
              <SortableHeader 
                sortKey="estado_paciente" 
                currentSort={sortConfig} 
                onSort={handleSort}
              >
                Estado
              </SortableHeader>
              <SortableHeader 
                sortKey="encuesta_completada" 
                currentSort={sortConfig} 
                onSort={handleSort}
                className="text-center"
              >
                Encuesta
              </SortableHeader>
              <TableHead className="w-20 text-right text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPatients.length >= VIRTUALIZE_THRESHOLD ? (
              <TableRow className="border-none">
                <TableCell colSpan={7} className="p-0">
                  <div style={{ height: VLIST_HEIGHT }}>
                    <List
                      height={VLIST_HEIGHT}
                      itemCount={sortedPatients.length}
                      itemSize={ROW_HEIGHT}
                      width={"100%"}
                      itemKey={(index) => sortedPatients[index].id}
                    >
                      {({ index, style }) => (
                        <div style={style} key={sortedPatients[index].id}>
                          <VirtualPatientRow
                            patient={sortedPatients[index]}
                            onSelectPatient={onSelectPatient}
                            onShareSurvey={onShareSurvey}
                            onAnswerSurvey={onAnswerSurvey}
                            onEditPatient={onEditPatient}
                            onScheduleAppointment={onScheduleAppointment}
                          />
                        </div>
                      )}
                    </List>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedPatients.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  onSelectPatient={onSelectPatient}
                  onShareSurvey={onShareSurvey}
                  onAnswerSurvey={onAnswerSurvey}
                  onEditPatient={onEditPatient}
                  onScheduleAppointment={onScheduleAppointment}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export default memo(PatientTable)