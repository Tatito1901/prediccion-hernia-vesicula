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

// Configuración estática simplificada - objetos planos para mejor rendimiento
const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    label: "Pendiente",
    icon: Clock,
    className: "bg-amber-100 text-amber-900 border-amber-300",
    priority: 1
  },
  [PatientStatusEnum.CONSULTADO]: {
    label: "Consultado", 
    icon: Stethoscope,
    className: "bg-blue-100 text-blue-900 border-blue-300",
    priority: 3
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    label: "Seguimiento",
    icon: Activity, 
    className: "bg-purple-100 text-purple-900 border-purple-300",
    priority: 2
  },
  [PatientStatusEnum.OPERADO]: {
    label: "Operado",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-900 border-emerald-300",
    priority: 5
  },
  [PatientStatusEnum.NO_OPERADO]: {
    label: "No operado",
    icon: XCircle,
    className: "bg-red-100 text-red-900 border-red-300",
    priority: 4
  },
  [PatientStatusEnum.INDECISO]: {
    label: "Indeciso",
    icon: AlertTriangle,
    className: "bg-orange-100 text-orange-900 border-orange-300", 
    priority: 3
  },
} as const

const SURVEY_PENDING_CONFIG = {
  label: "Encuesta pendiente",
  icon: ClipboardList,
  className: "bg-yellow-100 text-yellow-900 border-yellow-300",
  priority: 1
}

const DEFAULT_CONFIG = {
  label: "Sin estado",
  icon: User,
  className: "bg-gray-100 text-gray-900 border-gray-300",
  priority: 0
}

// Tamaños simplificados - constantes para evitar cálculos
const SIZE_CLASSES = {
  sm: "px-2.5 py-0.5 text-xs h-6",
  md: "px-3 py-1 text-xs h-7", 
  lg: "px-3.5 py-1.5 text-sm h-8"
} as const

const ICON_SIZE_CLASSES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5", 
  lg: "h-4 w-4"
} as const

interface PatientStatusProps {
  status: Patient["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

// Función utilitaria optimizada para obtener la configuración del estado
const getStatusConfig = (status: Patient["estado_paciente"], surveyCompleted: boolean) => {
  // Priorizar encuesta pendiente para estados no operados
  if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
    return SURVEY_PENDING_CONFIG;
  }
  
  // Retornar configuración específica del estado
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  }
  
  return DEFAULT_CONFIG;
};

// Componente principal optimizado - sin memoization innecesaria
const PatientStatus = ({
  status,
  surveyCompleted = false,
  size = "md",
  showIcon = true,
  className
}: PatientStatusProps) => {
  const config = getStatusConfig(status, surveyCompleted);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 font-medium border transition-colors",
        "shadow-sm hover:shadow-md",
        SIZE_CLASSES[size],
        config.className,
        className
      )}
      aria-label={`Estado: ${config.label}`}
    >
      {showIcon && <Icon className={cn("shrink-0", ICON_SIZE_CLASSES[size])} />}
      <span className="truncate max-w-[120px]">{config.label}</span>
    </Badge>
  );
};

// Componente para mostrar múltiples estados - simplificado
interface PatientStatusGroupProps {
  statuses: Array<{
    status: Patient["estado_paciente"]
    surveyCompleted?: boolean
  }>
  size?: "sm" | "md" | "lg"
  className?: string
  maxVisible?: number
}

const PatientStatusGroup = ({
  statuses,
  size = "sm",
  className,
  maxVisible = 3
}: PatientStatusGroupProps) => {
  if (!statuses.length) return null;

  // Para mostrar solo el más importante (móviles)
  const getHighestPriorityStatus = () => {
    return statuses.reduce((prev, current) => {
      const prevConfig = getStatusConfig(prev.status, prev.surveyCompleted ?? false);
      const currentConfig = getStatusConfig(current.status, current.surveyCompleted ?? false);
      return currentConfig.priority > prevConfig.priority ? current : prev;
    }, statuses[0]);
  };

  const visibleStatuses = statuses.slice(0, maxVisible);
  const hiddenCount = statuses.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {/* En móviles, mostrar solo el más importante */}
      <div className="block sm:hidden">
        <PatientStatus
          status={getHighestPriorityStatus().status}
          surveyCompleted={getHighestPriorityStatus().surveyCompleted}
          size={size}
        />
      </div>
      
      {/* En desktop, mostrar varios */}
      <div className="hidden sm:flex flex-wrap gap-1.5">
        {visibleStatuses.map((statusInfo, index) => (
          <PatientStatus
            key={`${statusInfo.status}-${index}`}
            status={statusInfo.status}
            surveyCompleted={statusInfo.surveyCompleted}
            size={size}
          />
        ))}
        
        {hiddenCount > 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "bg-gray-100 text-gray-700",
              SIZE_CLASSES[size]
            )}
            title={`${hiddenCount} estados adicionales`}
          >
            +{hiddenCount}
          </Badge>
        )}
      </div>
    </div>
  );
};

// Componente compacto para vista móvil optimizada
interface PatientStatusCompactProps {
  status: Patient["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const PatientStatusCompact = ({
  status,
  surveyCompleted = false,
  size = "md",
  className
}: PatientStatusCompactProps) => {
  const config = getStatusConfig(status, surveyCompleted);
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium border px-2 py-0.5",
        SIZE_CLASSES[size],
        config.className,
        className
      )}
      aria-label={config.label}
      title={config.label}
    >
      <Icon className={cn(ICON_SIZE_CLASSES[size])} />
    </Badge>
  );
};

// Hook simplificado para obtener información del estado
export const usePatientStatusInfo = (
  status: Patient["estado_paciente"],
  surveyCompleted: boolean = false
) => {
  const config = getStatusConfig(status, surveyCompleted);
  
  return {
    label: config.label,
    icon: config.icon,
    className: config.className,
    priority: config.priority,
    needsAttention: config.priority <= 2,
    isComplete: config.priority >= 4
  };
}

// Función utilitaria simplificada para ordenar por prioridad de estado
export const sortByStatusPriority = (
  patients: Array<{ 
    status: Patient["estado_paciente"]
    surveyCompleted?: boolean 
  }>
) => {
  return [...patients].sort((a, b) => {
    const aConfig = getStatusConfig(a.status, a.surveyCompleted ?? false);
    const bConfig = getStatusConfig(b.status, b.surveyCompleted ?? false);
    return bConfig.priority - aConfig.priority;
  });
}

// Exportar componentes
export default PatientStatus;
export { PatientStatusGroup, PatientStatusCompact };