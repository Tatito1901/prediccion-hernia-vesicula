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
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Patient, PatientStatusEnum } from "@/lib/types"
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

// Funciones utilitarias optimizadas - movidas fuera del componente para evitar recreación
const formatText = (text: string | undefined | null): string => 
  text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : ""

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "No registrada"
  
  const dateObj = date instanceof Date ? date : new Date(date)
  if (isNaN(dateObj.getTime())) return "Fecha inválida"
  
  const diffDays = Math.floor((Date.now() - dateObj.getTime()) / 86400000)
  
  if (diffDays === 0) return "Hoy"
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `${diffDays}d`
  
  return dateObj.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
}

// Configuración estática simplificada - objeto plano para mejor rendimiento
const DIAGNOSTIC_STYLES = {
  hernia: "bg-blue-100 text-blue-700 border-blue-200",
  cole: "bg-purple-100 text-purple-700 border-purple-200",
  eventra: "bg-amber-100 text-amber-700 border-amber-200",
  apendicitis: "bg-red-100 text-red-700 border-red-200",
  lipoma: "bg-emerald-100 text-emerald-700 border-emerald-200",
  quiste: "bg-orange-100 text-orange-700 border-orange-200",
} as const;

const STATUS_STYLES = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "bg-amber-50 text-amber-700 border-amber-200",
  [PatientStatusEnum.CONSULTADO]: "bg-blue-50 text-blue-700 border-blue-200",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-purple-50 text-purple-700 border-purple-200",
  [PatientStatusEnum.OPERADO]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [PatientStatusEnum.NO_OPERADO]: "bg-red-50 text-red-700 border-red-200",
  [PatientStatusEnum.INDECISO]: "bg-slate-50 text-slate-700 border-slate-200",
} as const;

const STATUS_LABELS = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "Pendiente",
  [PatientStatusEnum.CONSULTADO]: "Consultado",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "Seguimiento",
  [PatientStatusEnum.OPERADO]: "Operado",
  [PatientStatusEnum.NO_OPERADO]: "No Operado",
  [PatientStatusEnum.INDECISO]: "Indeciso",
} as const;

const getDiagnosticStyle = (diagnostic: string | undefined | null): string => {
  if (!diagnostic) return "bg-gray-100 text-gray-700 border-gray-200"
  
  const lower = diagnostic.toLowerCase()
  for (const [key, style] of Object.entries(DIAGNOSTIC_STYLES)) {
    if (lower.includes(key)) return style
  }
  
  return "bg-slate-100 text-slate-700 border-slate-200"
}

// Componente de cabecera simplificado sin memo
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
        "text-slate-600 hover:bg-slate-50 transition-colors border-b border-slate-200",
        isSorted && "bg-slate-50 text-slate-900",
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

// Componente de acciones simplificado
const PatientActions = ({ 
  patient, 
  onSelectPatient, 
  onShareSurvey, 
  onAnswerSurvey, 
  onEditPatient,
  onScheduleAppointment,
}: {
  patient: EnrichedPatientData
  onSelectPatient: (patient: Patient) => void
  onShareSurvey?: (patient: Patient) => void
  onAnswerSurvey?: (patient: Patient) => void
  onEditPatient?: (patient: Patient) => void
  onScheduleAppointment?: (patient: Patient) => void
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 flex items-center justify-center gap-1 hover:bg-slate-100 border-slate-200 text-slate-600"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only md:not-sr-only text-xs">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onSelectPatient(patient) }}>
          👁️ Ver detalles del paciente
        </DropdownMenuItem>
        {onEditPatient && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onEditPatient(patient) }}>
            ✏️ Editar datos del paciente
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onAnswerSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onAnswerSurvey(patient) }}>
            📋 Completar encuesta clínica
          </DropdownMenuItem>
        )}
        {onShareSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onShareSurvey(patient) }}>
            📤 Enviar enlace de encuesta
          </DropdownMenuItem>
        )}
        {patient.encuesta_completada && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onSelectPatient(patient) }}>
            📄 Ver resultados de encuesta
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onScheduleAppointment && (
          <DropdownMenuItem onClick={e => { e.stopPropagation(); onScheduleAppointment(patient) }}>
            📅 Agendar cita
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={e => { e.stopPropagation(); onSelectPatient(patient) }}>
          📊 Ver historial médico
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Vista de tarjeta simplificada
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
      className="bg-white border border-slate-200 rounded-lg p-2.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      onClick={() => onSelectPatient(patient)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Hash className="h-3 w-3" />
              <span className="font-mono">{patient.id.slice(0, 8)}</span>
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

      {/* Content */}
      <div className="space-y-1.5">
        {/* Diagnóstico */}
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-slate-400" />
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
            getDiagnosticStyle(patient.diagnostico_principal)
          )}>
            {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
          </span>
        </div>

        {/* Fecha y edad */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(patient.fecha_registro)}</span>
          </div>
          {patient.edad && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="h-4 w-4" />
              <span>{patient.edad} años</span>
            </div>
          )}
        </div>

        {/* Estado y encuesta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {patient.estado_paciente && (
            <span className={cn(
              "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
              STATUS_STYLES[patient.estado_paciente] || "bg-gray-100 text-gray-700 border-gray-200"
            )}>
              {STATUS_LABELS[patient.estado_paciente] || "Sin estado"}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Encuesta:</span>
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

// Fila de tabla simplificada
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
      className="cursor-pointer hover:bg-slate-50 transition-colors"
      onClick={() => onSelectPatient(patient)}
    >
      {/* Paciente */}
      <TableCell className="py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-medium">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-slate-900">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Hash className="h-3 w-3 opacity-50" />
              <span className="font-mono">{patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </TableCell>

      {/* Edad */}
      <TableCell className="text-center hidden lg:table-cell">
        {patient.edad ? (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm bg-blue-50 text-blue-700 border border-blue-200">
            {patient.edad} años
          </span>
        ) : (
          <span className="text-slate-400 text-sm">—</span>
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
          <Calendar className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-sm font-medium text-slate-700">
              {formatDate(patient.fecha_registro)}
            </p>
            <p className="text-xs text-slate-500 hidden sm:block">
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
        {patient.estado_paciente && (
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded text-xs font-medium border",
            STATUS_STYLES[patient.estado_paciente] || "bg-gray-100 text-gray-700 border-gray-200"
          )}>
            {STATUS_LABELS[patient.estado_paciente] || "Sin estado"}
          </span>
        )}
      </TableCell>

      {/* Encuesta */}
      <TableCell className="text-center">
        <div className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full",
          patient.encuesta_completada 
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-amber-100 text-amber-700 border-amber-200"
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
}

// Estados simplificados
const LoadingState = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="animate-pulse">
      <div className="h-12 bg-slate-100" />
      <div className="divide-y divide-slate-100">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 bg-white">
            <div className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const EmptyState = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
        <Stethoscope className="h-10 w-10 text-slate-400" />
      </div>
      <div>
        <p className="font-medium text-lg text-slate-900">
          No hay pacientes registrados
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Los pacientes aparecerán aquí cuando sean agregados
        </p>
      </div>
    </div>
  </div>
)

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

  // Sorting logic optimizado - simplificado sin tanto overhead
  const sortedPatients = useMemo(() => {
    if (!patients?.length) return []
    
    return [...patients].sort((a, b) => {
      const { key, direction } = sortConfig
      const aVal = a[key]
      const bVal = b[key]

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return direction === "asc" ? 1 : -1
      if (bVal == null) return direction === "asc" ? -1 : 1

      // Optimizar comparaciones - casos más comunes primero
      if (typeof aVal === "string" && typeof bVal === "string") {
        // Fechas
        if (key.toString().includes("fecha")) {
          const aTime = new Date(aVal).getTime()
          const bTime = new Date(bVal).getTime()
          return direction === "asc" ? aTime - bTime : bTime - aTime
        }
        // Strings normales
        const aStr = aVal.toLowerCase()
        const bStr = bVal.toLowerCase()
        return direction === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
      }
      
      // Números
      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal
      }
      
      // Booleanos
      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return direction === "asc" ? (aVal === bVal ? 0 : aVal ? 1 : -1) : (aVal === bVal ? 0 : aVal ? -1 : 1)
      }
      
      return 0
    })
  }, [patients, sortConfig])

  const handleSort = useCallback((key: keyof EnrichedPatientData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }))
  }, [])

  if (loading) return <LoadingState />
  if (sortedPatients.length === 0) return <EmptyState />

  return (
    <>
      {/* Vista móvil - Cards (usando CSS para mostrar/ocultar) */}
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
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
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
                  className="w-24"
                >
                  Encuesta
                </SortableHeader>
                <TableHead className="w-20 text-right text-xs uppercase tracking-wider text-slate-600">
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
                  onScheduleAppointment={onScheduleAppointment}
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