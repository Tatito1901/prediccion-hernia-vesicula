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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner, PatientTableSkeleton } from '@/components/ui/unified-skeletons';
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from "@/lib/utils"
import { Patient, PatientStatusEnum, EnrichedPatient } from "@/lib/types"

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
  [PatientStatusEnum.POTENCIAL]: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  [PatientStatusEnum.ACTIVO]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  [PatientStatusEnum.OPERADO]: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  [PatientStatusEnum.NO_OPERADO]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  [PatientStatusEnum.INACTIVO]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  [PatientStatusEnum.ALTA_MEDICA]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
} as const

const STATUS_LABELS = {
  [PatientStatusEnum.POTENCIAL]: "Potencial",
  [PatientStatusEnum.ACTIVO]: "Activo",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "En Seguimiento",
  [PatientStatusEnum.OPERADO]: "Operado",
  [PatientStatusEnum.NO_OPERADO]: "No Operado",
  [PatientStatusEnum.INACTIVO]: "Inactivo",
  [PatientStatusEnum.ALTA_MEDICA]: "Alta Médica",
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

// ✅ ELIMINADO: JSX flotante corregido - era parte de PatientCard duplicado ya eliminado

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
// ✅ ELIMINADO: LoadingState redundante - consolidado en unified-skeletons.tsx

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

  if (loading) return <PatientTableSkeleton />
  if (sortedPatients.length === 0) return <EmptyState title="No hay pacientes registrados" description="Los pacientes aparecerán aquí cuando sean agregados" icon={<Stethoscope className="h-8 w-8 text-slate-400 dark:text-slate-500" />} />

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