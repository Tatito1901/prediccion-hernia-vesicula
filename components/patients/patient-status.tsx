import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"
import {
  CheckCircle2,
  XCircle,
  Clock8,
  UserCheck,
  AlertTriangle,
  User,
  ClipboardList,
  Stethoscope,
  Activity,
  Heart,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface PatientStatusProps {
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  animated?: boolean
}

/**
 * Configuración mejorada de estilos con mejor contraste y diseño
 */
const STATUS_CONFIG: Record<
  PatientStatusEnum | "SURVEY_PENDING" | "DEFAULT",
  { 
    className: string
    label: string
    Icon: React.FC<{ className?: string }>
    gradient?: string
    pulse?: boolean
  }
> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    className: cn(
      "bg-amber-50 text-amber-800 border-amber-200/80",
      "dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-800/50",
      "shadow-amber-100/50 dark:shadow-amber-900/20"
    ),
    label: "Pendiente de consulta",
    Icon: Clock8,
    gradient: "from-amber-400 to-orange-400",
    pulse: true,
  },
  [PatientStatusEnum.CONSULTADO]: {
    className: cn(
      "bg-blue-50 text-blue-800 border-blue-200/80",
      "dark:bg-blue-950/20 dark:text-blue-300 dark:border-blue-800/50",
      "shadow-blue-100/50 dark:shadow-blue-900/20"
    ),
    label: "Consultado",
    Icon: Stethoscope,
    gradient: "from-blue-400 to-indigo-400",
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    className: cn(
      "bg-violet-50 text-violet-800 border-violet-200/80",
      "dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-800/50",
      "shadow-violet-100/50 dark:shadow-violet-900/20"
    ),
    label: "En seguimiento",
    Icon: Activity,
    gradient: "from-violet-400 to-purple-400",
  },
  [PatientStatusEnum.OPERADO]: {
    className: cn(
      "bg-emerald-50 text-emerald-800 border-emerald-200/80",
      "dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-800/50",
      "shadow-emerald-100/50 dark:shadow-emerald-900/20"
    ),
    label: "Operado",
    Icon: CheckCircle2,
    gradient: "from-emerald-400 to-green-400",
  },
  [PatientStatusEnum.NO_OPERADO]: {
    className: cn(
      "bg-red-50 text-red-800 border-red-200/80",
      "dark:bg-red-950/20 dark:text-red-300 dark:border-red-800/50",
      "shadow-red-100/50 dark:shadow-red-900/20"
    ),
    label: "No operado",
    Icon: XCircle,
    gradient: "from-red-400 to-rose-400",
  },
  [PatientStatusEnum.INDECISO]: {
    className: cn(
      "bg-orange-50 text-orange-800 border-orange-200/80",
      "dark:bg-orange-950/20 dark:text-orange-300 dark:border-orange-800/50",
      "shadow-orange-100/50 dark:shadow-orange-900/20"
    ),
    label: "Indeciso",
    Icon: AlertTriangle,
    gradient: "from-orange-400 to-amber-400",
  },
  SURVEY_PENDING: {
    className: cn(
      "bg-yellow-50 text-yellow-800 border-yellow-200/80",
      "dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800/50",
      "shadow-yellow-100/50 dark:shadow-yellow-900/20"
    ),
    label: "Encuesta pendiente",
    Icon: ClipboardList,
    gradient: "from-yellow-400 to-amber-400",
    pulse: true,
  },
  DEFAULT: {
    className: cn(
      "bg-slate-50 text-slate-700 border-slate-200/80",
      "dark:bg-slate-900/20 dark:text-slate-300 dark:border-slate-700/50",
      "shadow-slate-100/50 dark:shadow-slate-900/20"
    ),
    label: "Estado desconocido",
    Icon: User,
    gradient: "from-slate-400 to-gray-400",
  },
}

const SIZE_VARIANTS = {
  sm: {
    badge: "px-2 py-0.5 text-xs",
    icon: "h-3 w-3",
    gap: "gap-1",
  },
  md: {
    badge: "px-2.5 py-1 text-xs",
    icon: "h-3.5 w-3.5",
    gap: "gap-1.5",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm",
    icon: "h-4 w-4",
    gap: "gap-2",
  },
}

const PatientStatus: React.FC<PatientStatusProps> = React.memo(
  ({ 
    status, 
    surveyCompleted = false, 
    size = "md", 
    showIcon = true,
    animated = true 
  }) => {
    // Lógica de prioridad para mostrar el estado
    let configKey: keyof typeof STATUS_CONFIG = "DEFAULT"

    if (status === PatientStatusEnum.PENDIENTE_DE_CONSULTA) {
      configKey = PatientStatusEnum.PENDIENTE_DE_CONSULTA
    } else if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
      configKey = "SURVEY_PENDING"
    } else if (status && status in STATUS_CONFIG) {
      configKey = status as PatientStatusEnum
    }

    const { className, label, Icon, gradient, pulse } = STATUS_CONFIG[configKey]
    const sizeVariant = SIZE_VARIANTS[size]

    const content = (
      <Badge
        variant="outline"
        className={cn(
          "relative overflow-hidden inline-flex items-center font-medium",
          "whitespace-nowrap transition-all duration-300",
          "hover:shadow-md hover:scale-105",
          "backdrop-blur-sm",
          sizeVariant.badge,
          sizeVariant.gap,
          className
        )}
      >
        {/* Gradient overlay para efecto premium */}
        {gradient && (
          <div 
            className={cn(
              "absolute inset-0 opacity-10 bg-gradient-to-r",
              gradient
            )} 
          />
        )}
        
        {/* Efecto pulse para estados importantes */}
        {pulse && animated && (
          <div className="absolute inset-0">
            <div className={cn(
              "absolute inset-0 animate-pulse opacity-30 bg-gradient-to-r",
              gradient
            )} />
          </div>
        )}
        
        {/* Contenido */}
        <div className={cn("relative flex items-center", sizeVariant.gap)}>
          {showIcon && (
            <Icon className={cn(
              "flex-shrink-0 opacity-80",
              sizeVariant.icon
            )} />
          )}
          <span className="truncate">{label}</span>
        </div>

        {/* Indicador de actividad para ciertos estados */}
        {(configKey === PatientStatusEnum.EN_SEGUIMIENTO || 
          configKey === PatientStatusEnum.PENDIENTE_DE_CONSULTA) && 
          animated && (
          <div className="absolute -top-1 -right-1">
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                configKey === PatientStatusEnum.EN_SEGUIMIENTO 
                  ? "bg-violet-400" 
                  : "bg-amber-400"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                configKey === PatientStatusEnum.EN_SEGUIMIENTO 
                  ? "bg-violet-600 dark:bg-violet-400" 
                  : "bg-amber-600 dark:bg-amber-400"
              )} />
            </span>
          </div>
        )}
      </Badge>
    )

    if (!animated) {
      return content
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={configKey}
          initial={{ opacity: 0, scale: 0.9, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          transition={{ 
            duration: 0.2,
            ease: "easeOut"
          }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    )
  }
)

PatientStatus.displayName = "PatientStatus"

// Componente adicional para mostrar múltiples estados
export const PatientStatusGroup: React.FC<{
  statuses: Array<{
    status: PatientData["estado_paciente"]
    surveyCompleted?: boolean
  }>
  size?: "sm" | "md" | "lg"
}> = ({ statuses, size = "sm" }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((statusInfo, index) => (
        <PatientStatus
          key={index}
          status={statusInfo.status}
          surveyCompleted={statusInfo.surveyCompleted}
          size={size}
          animated={false}
        />
      ))}
    </div>
  )
}

// Hook para obtener configuración de estado
export const useStatusConfig = (status: PatientData["estado_paciente"]) => {
  const configKey = status && status in STATUS_CONFIG 
    ? status as PatientStatusEnum 
    : "DEFAULT"
  
  return STATUS_CONFIG[configKey]
}

export default PatientStatus