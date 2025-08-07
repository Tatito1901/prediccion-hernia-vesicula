import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientStatusEnum, type Patient } from "@/lib/types"
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  User,
  ClipboardList,
  Stethoscope,
  Activity,
} from "lucide-react"

type StatusSize = "sm" | "md" | "lg"

interface StatusConfig {
  readonly label: string
  readonly icon: React.ElementType
  readonly className: string
}

const STATUS_CONFIG: Record<keyof typeof PatientStatusEnum, StatusConfig> = {
  POTENCIAL: {
    label: "Potencial",
    icon: Clock,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  ACTIVO: {
    label: "Activo",
    icon: Stethoscope,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  EN_SEGUIMIENTO: {
    label: "En Seguimiento",
    icon: ClipboardList,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  OPERADO: {
    label: "Operado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  },
  NO_OPERADO: {
    label: "No Operado",
    icon: XCircle,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  INACTIVO: {
    label: "Inactivo",
    icon: User,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
  ALTA_MEDICA: {
    label: "Alta Médica",
    icon: User,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
} as const

const SURVEY_PENDING_CONFIG: StatusConfig = {
  label: "Encuesta pendiente",
  icon: ClipboardList,
  className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
} as const

const DEFAULT_CONFIG: StatusConfig = {
  label: "Sin estado",
  icon: User,
  className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
} as const

const SIZE_CLASSES: Record<StatusSize, string> = {
  sm: "px-2 py-0.5 text-xs h-6 gap-1",
  md: "px-2.5 py-1 text-xs h-7 gap-1.5", 
  lg: "px-3 py-1.5 text-sm h-8 gap-2"
} as const

const ICON_SIZE_CLASSES: Record<StatusSize, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5", 
  lg: "h-4 w-4"
} as const

interface PatientStatusProps {
  readonly status: Patient["estado_paciente"]
  readonly surveyCompleted?: boolean
  readonly size?: StatusSize
  readonly showIcon?: boolean
  readonly className?: string
}

interface PatientStatusItem {
  readonly status: Patient["estado_paciente"]
  readonly surveyCompleted?: boolean
}

interface PatientStatusGroupProps {
  readonly statuses: readonly PatientStatusItem[]
  readonly size?: StatusSize
  readonly className?: string
  readonly maxVisible?: number
}

interface PatientStatusCompactProps {
  readonly status: Patient["estado_paciente"]
  readonly surveyCompleted?: boolean
  readonly size?: StatusSize
  readonly className?: string
}

const getStatusConfig = (
  status: Patient["estado_paciente"], 
  surveyCompleted: boolean
): StatusConfig => {
  if (!surveyCompleted && status && status !== PatientStatusEnum.OPERADO) {
    return SURVEY_PENDING_CONFIG
  }
  
  if (!status) return DEFAULT_CONFIG
  
  const statusKey = Object.keys(PatientStatusEnum).find(
    key => PatientStatusEnum[key as keyof typeof PatientStatusEnum] === status
  ) as keyof typeof STATUS_CONFIG || 'POTENCIAL'
  
  return STATUS_CONFIG[statusKey] ?? DEFAULT_CONFIG
}

const PatientStatus: React.FC<PatientStatusProps> = ({
  status,
  surveyCompleted = false,
  size = "md",
  showIcon = true,
  className
}) => {
  const config = getStatusConfig(status, surveyCompleted)
  const Icon = config.icon
  const sizeClasses = SIZE_CLASSES[size]
  const iconSizeClasses = ICON_SIZE_CLASSES[size]

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center font-medium",
        sizeClasses,
        config.className,
        className
      )}
      aria-label={`Estado del paciente: ${config.label}`}
      role="status"
    >
      {showIcon && (
        <Icon 
          className={cn("flex-shrink-0", iconSizeClasses)} 
          aria-hidden="true" 
        />
      )}
      <span className="truncate max-w-[120px] font-medium">
        {config.label}
      </span>
    </Badge>
  )
}

const PatientStatusGroup: React.FC<PatientStatusGroupProps> = ({
  statuses,
  size = "sm",
  className,
  maxVisible = 3
}) => {
  if (!statuses.length) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="group" aria-label="Estados del paciente">
      {/* Vista móvil - Solo el primer estado */}
      <div className="block sm:hidden">
        <PatientStatus
          status={statuses[0].status}
          surveyCompleted={statuses[0].surveyCompleted}
          size={size}
        />
      </div>
      
      {/* Vista desktop - Múltiples estados */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {statuses.slice(0, maxVisible).map((statusItem, index) => (
          <PatientStatus
            key={`${statusItem.status}-${index}`}
            status={statusItem.status}
            surveyCompleted={statusItem.surveyCompleted}
            size={size}
          />
        ))}
        
        {statuses.length > maxVisible && (
          <Badge 
            variant="outline" 
            className={cn(
              "bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-400",
              SIZE_CLASSES[size]
            )}
            title={`${statuses.length - maxVisible} estados adicionales`}
            aria-label={`${statuses.length - maxVisible} estados adicionales`}
          >
            <span className="font-medium">+{statuses.length - maxVisible}</span>
          </Badge>
        )}
      </div>
    </div>
  )
}

const PatientStatusCompact: React.FC<PatientStatusCompactProps> = ({
  status,
  surveyCompleted = false,
  size = "sm",
  className
}) => {
  const config = getStatusConfig(status, surveyCompleted)
  const Icon = config.icon
  const sizeClasses = SIZE_CLASSES[size]
  const iconSizeClasses = ICON_SIZE_CLASSES[size]

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center justify-center font-medium px-1.5",
        sizeClasses,
        config.className,
        className
      )}
      aria-label={`Estado: ${config.label}`}
      title={config.label}
      role="status"
    >
      <Icon className={cn("flex-shrink-0", iconSizeClasses)} aria-hidden="true" />
    </Badge>
  )
}

export const usePatientStatusInfo = (
  status: Patient["estado_paciente"],
  surveyCompleted: boolean = false
) => {
  const config = getStatusConfig(status, surveyCompleted)
  
  return {
    label: config.label,
    icon: config.icon,
    className: config.className,
    needsAttention: status === PatientStatusEnum.POTENCIAL
  } as const
}

export const sortByStatusPriority = <T extends PatientStatusItem>(
  patients: readonly T[]
): T[] => {
  if (!patients.length) return []
  
  return [...patients].sort((a, b) => {
    // Priorizar pacientes potenciales primero
    if (a.status === PatientStatusEnum.POTENCIAL && 
        b.status !== PatientStatusEnum.POTENCIAL) {
      return -1
    }
    if (b.status === PatientStatusEnum.POTENCIAL && 
        a.status !== PatientStatusEnum.POTENCIAL) {
      return 1
    }
    
    // Luego pacientes con encuesta pendiente
    if (!a.surveyCompleted && b.surveyCompleted) return -1
    if (!b.surveyCompleted && a.surveyCompleted) return 1
    
    // Orden alfabético por estado como último criterio
    return (a.status || "").localeCompare(b.status || "")
  })
}

export default PatientStatus
export { 
  PatientStatusGroup, 
  PatientStatusCompact,
  type PatientStatusProps,
  type PatientStatusGroupProps,
  type PatientStatusCompactProps,
  type PatientStatusItem,
  type StatusSize
}