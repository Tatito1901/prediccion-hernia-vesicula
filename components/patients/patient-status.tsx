import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"
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

interface PatientStatusProps {
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

// Configuración simplificada y optimizada
const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    label: "Pendiente",
    icon: Clock,
    style: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/50 dark:hover:bg-amber-900/30",
    dotColor: "bg-amber-500 dark:bg-amber-400",
    priority: 1
  },
  [PatientStatusEnum.CONSULTADO]: {
    label: "Consultado", 
    icon: Stethoscope,
    style: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/50 dark:hover:bg-blue-900/30",
    dotColor: "bg-blue-500 dark:bg-blue-400",
    priority: 3
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    label: "Seguimiento",
    icon: Activity, 
    style: "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-800/50 dark:hover:bg-purple-900/30",
    dotColor: "bg-purple-500 dark:bg-purple-400",
    priority: 2
  },
  [PatientStatusEnum.OPERADO]: {
    label: "Operado",
    icon: CheckCircle2,
    style: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/50 dark:hover:bg-emerald-900/30",
    dotColor: "bg-emerald-500 dark:bg-emerald-400", 
    priority: 5
  },
  [PatientStatusEnum.NO_OPERADO]: {
    label: "No operado",
    icon: XCircle,
    style: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800/50 dark:hover:bg-red-900/30",
    dotColor: "bg-red-500 dark:bg-red-400",
    priority: 4
  },
  [PatientStatusEnum.INDECISO]: {
    label: "Indeciso",
    icon: AlertTriangle,
    style: "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800/50 dark:hover:bg-orange-900/30", 
    dotColor: "bg-orange-500 dark:bg-orange-400",
    priority: 3
  },
  SURVEY_PENDING: {
    label: "Encuesta pendiente",
    icon: ClipboardList,
    style: "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800/50 dark:hover:bg-yellow-900/30",
    dotColor: "bg-yellow-500 dark:bg-yellow-400",
    priority: 1
  },
  DEFAULT: {
    label: "Sin estado",
    icon: User,
    style: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800",
    dotColor: "bg-gray-500 dark:bg-gray-400",
    priority: 0
  }
} as const

// Tamaños simplificados
const SIZE_VARIANTS = {
  sm: "px-2 py-1 text-xs",
  md: "px-2.5 py-1 text-xs", 
  lg: "px-3 py-1.5 text-sm"
} as const

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5", 
  lg: "h-4 w-4"
} as const

const PatientStatus: React.FC<PatientStatusProps> = ({
  status,
  surveyCompleted = false,
  size = "md",
  showIcon = true,
  className
}) => {
  // Lógica simplificada para determinar el estado a mostrar
  const getStatusKey = (): keyof typeof STATUS_CONFIG => {
    // Prioridad: Encuesta pendiente > Estado específico > Default
    if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
      return "SURVEY_PENDING"
    }
    
    if (status && status in STATUS_CONFIG) {
      return status as PatientStatusEnum
    }
    
    return "DEFAULT"
  }

  const statusKey = getStatusKey()
  const config = STATUS_CONFIG[statusKey]
  const Icon = config.icon

  const shouldShowActivityDot = 
    statusKey === PatientStatusEnum.PENDIENTE_DE_CONSULTA || 
    statusKey === PatientStatusEnum.EN_SEGUIMIENTO ||
    statusKey === "SURVEY_PENDING"

  return (
    <div className="relative inline-flex">
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium border transition-all duration-200",
          "relative overflow-hidden shadow-sm",
          SIZE_VARIANTS[size],
          config.style,
          className
        )}
      >
        {showIcon && <Icon className={cn("shrink-0", ICON_SIZES[size])} />}
        <span className="truncate">{config.label}</span>
      </Badge>
      
      {/* Dot de actividad para estados importantes */}
      {shouldShowActivityDot && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          <div className="relative">
            <div className={cn(
              "w-2 h-2 rounded-full",
              config.dotColor
            )} />
            <div className={cn(
              "absolute inset-0 w-2 h-2 rounded-full animate-ping opacity-75",
              config.dotColor
            )} />
          </div>
        </div>
      )}
    </div>
  )
}

// Componente para mostrar múltiples estados (simplificado)
export const PatientStatusGroup: React.FC<{
  statuses: Array<{
    status: PatientData["estado_paciente"]
    surveyCompleted?: boolean
  }>
  size?: "sm" | "md" | "lg"
  className?: string
}> = ({ statuses, size = "sm", className }) => {
  if (!statuses.length) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {statuses.map((statusInfo, index) => (
        <PatientStatus
          key={`${statusInfo.status}-${index}`}
          status={statusInfo.status}
          surveyCompleted={statusInfo.surveyCompleted}
          size={size}
        />
      ))}
    </div>
  )
}

// Componente compacto para vista móvil
export const PatientStatusCompact: React.FC<{
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
  className?: string
}> = ({ status, surveyCompleted, className }) => {
  const getStatusKey = (): keyof typeof STATUS_CONFIG => {
    if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
      return "SURVEY_PENDING"
    }
    if (status && status in STATUS_CONFIG) {
      return status as PatientStatusEnum
    }
    return "DEFAULT"
  }

  const statusKey = getStatusKey()
  const config = STATUS_CONFIG[statusKey]
  const Icon = config.icon

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn(
        "w-2 h-2 rounded-full",
        config.dotColor
      )} />
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-gray-500 dark:text-gray-400" />
        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
          {config.label}
        </span>
      </div>
    </div>
  )
}

// Hook utilitario para obtener información del estado
export const usePatientStatusInfo = (
  status: PatientData["estado_paciente"],
  surveyCompleted: boolean = false
) => {
  const getStatusKey = (): keyof typeof STATUS_CONFIG => {
    if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
      return "SURVEY_PENDING"
    }
    if (status && status in STATUS_CONFIG) {
      return status as PatientStatusEnum
    }
    return "DEFAULT"
  }

  const statusKey = getStatusKey()
  const config = STATUS_CONFIG[statusKey]

  return {
    label: config.label,
    icon: config.icon,
    style: config.style,
    dotColor: config.dotColor,
    priority: config.priority,
    needsAttention: statusKey === "SURVEY_PENDING" || 
                    statusKey === PatientStatusEnum.PENDIENTE_DE_CONSULTA,
    isComplete: statusKey === PatientStatusEnum.OPERADO
  }
}

// Función utilitaria para ordenar por prioridad de estado
export const sortByStatusPriority = (
  patients: Array<{ 
    status: PatientData["estado_paciente"]
    surveyCompleted?: boolean 
  }>
) => {
  return patients.sort((a, b) => {
    const aKey = !a.surveyCompleted && a.status !== PatientStatusEnum.OPERADO 
      ? "SURVEY_PENDING" 
      : (a.status in STATUS_CONFIG ? a.status as PatientStatusEnum : "DEFAULT")
    
    const bKey = !b.surveyCompleted && b.status !== PatientStatusEnum.OPERADO
      ? "SURVEY_PENDING"
      : (b.status in STATUS_CONFIG ? b.status as PatientStatusEnum : "DEFAULT")

    return STATUS_CONFIG[bKey].priority - STATUS_CONFIG[aKey].priority
  })
}

export default PatientStatus