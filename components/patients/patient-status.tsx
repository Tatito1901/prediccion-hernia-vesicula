import React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"
import {
  CheckCircle2,
  XCircle,
  Clock8,
  UserCheck,
  UserX,
  User,
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
  | PatientStatusEnum.PENDIENTE_DE_CONSULTA
  | PatientStatusEnum.OPERADO
  | PatientStatusEnum.NO_OPERADO
  | PatientStatusEnum.EN_SEGUIMIENTO
  | "SURVEY_PENDING"
  | "DEFAULT",
  { className: string; label: string; Icon: React.FC<{ className?: string }> }
> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    className:
      "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-900 dark:text-amber-100 dark:border-amber-600",
    label: "Pendiente de consulta",
    Icon: Clock8,
  },
  [PatientStatusEnum.OPERADO]: {
    className:
      "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900 dark:text-emerald-100 dark:border-emerald-600",
    label: "Operado",
    Icon: CheckCircle2,
  },
  [PatientStatusEnum.NO_OPERADO]: {
    className:
      "bg-red-100 text-red-900 border border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-600",
    label: "No operado",
    Icon: XCircle,
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    className:
      "bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-600",
    label: "En seguimiento",
    Icon: UserCheck,
  },
  SURVEY_PENDING: {
    className:
      "bg-violet-100 text-violet-900 border border-violet-300 dark:bg-violet-900 dark:text-violet-100 dark:border-violet-600",
    label: "Encuesta pendiente",
    Icon: UserX,
  },
  DEFAULT: {
    className:
      "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600",
    label: "Estado desconocido",
    Icon: User,
  },
}

const PatientStatus: React.FC<PatientStatusProps> = React.memo(
  ({ status, surveyCompleted = false }) => {
    // El orden de chequeo: si está pendiente de consulta, siempre muestra ese estado.
    // Si no, y la encuesta NO está completada, muestra "Encuesta pendiente".
    // Finalmente, intenta mapear el estado a CONFIG; si no se encuentra, usa DEFAULT.
    let configEntry =
      STATUS_CONFIG[PatientStatusEnum.PENDIENTE_DE_CONSULTA]

    if (status !== PatientStatusEnum.PENDIENTE_DE_CONSULTA) {
      if (!surveyCompleted) {
        configEntry = STATUS_CONFIG.SURVEY_PENDING
      } else if (status in STATUS_CONFIG) {
        // @ts-expect-error — TypeScript entiende que status es string; forzamos el tipo
        configEntry = STATUS_CONFIG[status]
      } else {
        configEntry = STATUS_CONFIG.DEFAULT
      }
    }

    const { className, label, Icon } = configEntry

    return (
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </Badge>
    )
  }
)

PatientStatus.displayName = "PatientStatus"
export default PatientStatus
