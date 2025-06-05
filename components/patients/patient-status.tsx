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
  UserMinus
} from "lucide-react"

interface PatientStatusProps {
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
}

/**
 * Configuración de estilos y etiquetas para cada estado.
 * Incluye un ícono asociado para mayor elegancia visual.
 */
const STATUS_CONFIG: Record<
  | PatientStatusEnum
  | "SURVEY_PENDING"
  | "DEFAULT",
  { 
    className: string
    label: string
    Icon: React.FC<{ className?: string }>
  }
> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    className:
      "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600",
    label: "Pendiente de consulta",
    Icon: Clock8,
  },
  [PatientStatusEnum.CONSULTADO]: {
    className:
      "bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600",
    label: "Consultado",
    Icon: Stethoscope,
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    className:
      "bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-600",
    label: "En seguimiento",
    Icon: UserCheck,
  },
  [PatientStatusEnum.OPERADO]: {
    className:
      "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600",
    label: "Operado",
    Icon: CheckCircle2,
  },
  [PatientStatusEnum.NO_OPERADO]: {
    className:
      "bg-red-100 text-red-900 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600",
    label: "No operado",
    Icon: XCircle,
  },
  [PatientStatusEnum.INDECISO]: {
    className:
      "bg-orange-100 text-orange-900 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-600",
    label: "Indeciso",
    Icon: AlertTriangle,
  },
  SURVEY_PENDING: {
    className:
      "bg-yellow-100 text-yellow-900 border border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-600",
    label: "Encuesta pendiente",
    Icon: ClipboardList,
  },
  DEFAULT: {
    className:
      "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800/30 dark:text-slate-300 dark:border-slate-600",
    label: "Estado desconocido",
    Icon: User,
  },
}

const PatientStatus: React.FC<PatientStatusProps> = React.memo(
  ({ status, surveyCompleted = false }) => {
    // Lógica de prioridad para mostrar el estado:
    // 1. Si está pendiente de consulta, siempre muestra ese estado
    // 2. Si no está pendiente de consulta pero la encuesta no está completada, muestra "Encuesta pendiente"
    // 3. Si la encuesta está completada, muestra el estado actual del paciente
    // 4. Si no se reconoce el estado, muestra estado por defecto

    let configKey: keyof typeof STATUS_CONFIG = "DEFAULT"

    if (status === PatientStatusEnum.PENDIENTE_DE_CONSULTA) {
      // Siempre mostrar pendiente de consulta cuando ese es el estado
      configKey = PatientStatusEnum.PENDIENTE_DE_CONSULTA
    } else if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
      // Solo mostrar "encuesta pendiente" si no está operado y no ha completado la encuesta
      configKey = "SURVEY_PENDING"
    } else if (status && status in STATUS_CONFIG) {
      // Mostrar el estado actual si la encuesta está completada o si ya está operado
      configKey = status as PatientStatusEnum
    }

    const { className, label, Icon } = STATUS_CONFIG[configKey]

    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors",
          className
        )}
      >
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{label}</span>
      </Badge>
    )
  }
)

PatientStatus.displayName = "PatientStatus"
export default PatientStatus