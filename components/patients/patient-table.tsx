import React, { useState, useMemo } from "react"
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
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Patient, PatientStatusEnum, EnrichedPatient } from "@/lib/types"
import { Button } from "@/components/ui/button"

// Usamos EnrichedPatient importado desde @/lib/types

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

// Funciones utilitarias optimizadas
const formatText = (text: string | undefined | null): string => 
  text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : ""

const formatDate = (date: string | Date | undefined | null): string => {
  if (!date) return "No registrada"
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return "Fecha inválida"
    
    return dateObj.toLocaleDateString("es-ES", { 
      day: "2-digit", 
      month: "short",
      year: dateObj.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
    })
  } catch {
    return "Fecha inválida"
  }
}

// Configuración de estilos
const DIAGNOSTIC_STYLES = {
  hernia: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  cole: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  eventra: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  apendicitis: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  lipoma: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  quiste: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
} as const

const STATUS_STYLES = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  [PatientStatusEnum.CONSULTADO]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  [PatientStatusEnum.OPERADO]: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  [PatientStatusEnum.NO_OPERADO]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [PatientStatusEnum.INDECISO]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
} as const

const STATUS_LABELS = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "Pendiente",
  [PatientStatusEnum.CONSULTADO]: "Consultado",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "Seguimiento",
  [PatientStatusEnum.OPERADO]: "Operado",
  [PatientStatusEnum.NO_OPERADO]: "No Operado",
  [PatientStatusEnum.INDECISO]: "Indeciso",
} as const

const getDiagnosticStyle = (diagnostic: string | null | undefined): string => {
  if (!diagnostic) return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  
  const lower = diagnostic.toLowerCase()
  for (const [key, style] of Object.entries(DIAGNOSTIC_STYLES)) {
    if (lower.includes(key)) return style
  }
  
  return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
}

// Componente de cabecera optimizado
const SortableHeader = ({ 
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
        "text-slate-600 border-b border-slate-200 dark:text-slate-400 dark:border-slate-700",
        isSorted && "bg-slate-100 dark:bg-slate-800",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-2 py-3">
        {Icon && <Icon className="h-4 w-4" />}
        <span className="truncate">{children}</span>
        <div className="ml-1">
          {isSorted ? (
            isAsc ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          ) : (
            <ArrowUpDown className="h-4 w-4 opacity-30" />
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
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 w-8 p-0 hover:bg-slate-100 border-slate-200 text-slate-600 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-400"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
          Ver detalles
        </DropdownMenuItem>
        {onEditPatient && (
          <DropdownMenuItem onClick={() => onEditPatient(patient)}>
            Editar paciente
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onAnswerSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onAnswerSurvey(patient)}>
            Completar encuesta
          </DropdownMenuItem>
        )}
        {onShareSurvey && !patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onShareSurvey(patient)}>
            Enviar encuesta
          </DropdownMenuItem>
        )}
        {patient.encuesta_completada && (
          <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
            Ver encuesta
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {onScheduleAppointment && (
          <DropdownMenuItem onClick={() => onScheduleAppointment(patient)}>
            Agendar cita
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Vista de tarjeta optimizada
const PatientCard = ({ 
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
  return (
    <div 
      className="bg-white border border-slate-200 rounded-lg p-3 cursor-pointer shadow-sm hover:shadow transition-all duration-150 dark:bg-slate-950 dark:border-slate-800"
      onClick={() => onSelectPatient(patient)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-800 dark:text-blue-200 flex-shrink-0">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono truncate">ID: {patient.id.slice(0, 8)}</span>
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

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <Stethoscope className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded text-xs font-medium truncate",
            getDiagnosticStyle(patient.diagnostico_principal)
          )}>
            {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
          </span>
        </div>

        <div className="flex items-center justify-between text-sm gap-2">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 min-w-0">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{formatDate(patient.fecha_registro)}</span>
          </div>
          {patient.edad && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 flex-shrink-0">
              <span>{patient.edad} años</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
          <div>
            {patient.estado_paciente && (
              <span className={cn(
                "inline-flex items-center px-2 py-1 rounded text-xs font-medium truncate",
                STATUS_STYLES[patient.estado_paciente]
              )}>
                {STATUS_LABELS[patient.estado_paciente] || "Sin estado"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Encuesta:</span>
            {patient.encuesta_completada ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
  patient: EnrichedPatient
  onSelectPatient: (patient: EnrichedPatient) => void
  onShareSurvey?: (patient: EnrichedPatient) => void
  onAnswerSurvey?: (patient: EnrichedPatient) => void
  onEditPatient?: (patient: EnrichedPatient) => void
  onScheduleAppointment?: (patient: EnrichedPatient) => void
}) => {
  return (
    <TableRow 
      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
      onClick={() => onSelectPatient(patient)}
    >
      <TableCell className="py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-800 dark:text-blue-200 flex-shrink-0">
            {patient.nombreCompleto.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
              {formatText(patient.nombreCompleto)}
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono truncate">ID: {patient.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="text-center">
        {patient.edad ? (
          <span className="inline-block px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {patient.edad} años
          </span>
        ) : (
          <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
        )}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium truncate max-w-[150px]",
            getDiagnosticStyle(patient.diagnostico_principal)
          )}>
            <Stethoscope className="h-3.5 w-3.5 flex-shrink-0" />
            {formatText(patient.diagnostico_principal) || "Sin diagnóstico"}
          </span>
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
            {formatDate(patient.fecha_registro)}
          </span>
        </div>
      </TableCell>

      <TableCell className="py-3">
        {patient.estado_paciente && (
          <span className={cn(
            "inline-flex items-center px-2 py-1 rounded text-xs font-medium truncate",
            STATUS_STYLES[patient.estado_paciente]
          )}>
            {STATUS_LABELS[patient.estado_paciente] || "Sin estado"}
          </span>
        )}
      </TableCell>

      <TableCell className="text-center">
        <div className={cn(
          "inline-flex items-center justify-center w-8 h-8 rounded-full",
          patient.encuesta_completada 
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        )}>
          {patient.encuesta_completada ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
        </div>
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
}

// Estados de carga y vacío
const LoadingState = () => (
  <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="animate-pulse">
      <div className="h-12 bg-slate-100 dark:bg-slate-800" />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Array(5).fill(0).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="flex-1 space-y-2 min-w-0">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
              <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const EmptyState = () => (
  <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-12 text-center">
    <div className="flex flex-col items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <Stethoscope className="h-8 w-8 text-slate-400 dark:text-slate-500" />
      </div>
      <div>
        <p className="font-medium text-slate-900 dark:text-slate-100">
          No hay pacientes registrados
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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

  // Sorting optimizado
  const sortedPatients = useMemo(() => {
    if (!patients?.length) return []
    
    return [...patients].sort((a, b) => {
      const key = sortConfig.key
      const direction = sortConfig.direction
      
      // Handle undefined values
      const aVal = a[key]
      const bVal = b[key]
      
      if (aVal == null) return direction === "asc" ? 1 : -1
      if (bVal == null) return direction === "asc" ? -1 : 1

      // Comparación directa para strings y números
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

  const handleSort = (key: keyof EnrichedPatient) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }))
  }

  if (loading) return <LoadingState />
  if (sortedPatients.length === 0) return <EmptyState />

  return (
    <div className="w-full">
      {/* Vista móvil */}
      <div className="block lg:hidden">
        <div className="space-y-3">
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

      {/* Vista tablet/desktop */}
      <div className="hidden lg:block bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-100 dark:bg-slate-900">
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
              >
                Edad
              </SortableHeader>
              <SortableHeader 
                sortKey="diagnostico_principal" 
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
              >
                Encuesta
              </SortableHeader>
              <TableHead className="w-20 text-right">
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
  )
}

export default PatientTable