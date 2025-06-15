"use client"

import React, { useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model"
import { useIsMobile } from "@/hooks/use-breakpoint"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Configuración optimizada con colores más accesibles
const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    label: "Pendiente",
    icon: Clock,
    style: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100 dark:border-amber-700",
    dotColor: "bg-amber-500",
    priority: 1
  },
  [PatientStatusEnum.CONSULTADO]: {
    label: "Consultado", 
    icon: Stethoscope,
    style: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-700",
    dotColor: "bg-blue-500",
    priority: 3
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    label: "Seguimiento",
    icon: Activity, 
    style: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-700",
    dotColor: "bg-purple-500",
    priority: 2
  },
  [PatientStatusEnum.OPERADO]: {
    label: "Operado",
    icon: CheckCircle2,
    style: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-700",
    dotColor: "bg-emerald-500", 
    priority: 5
  },
  [PatientStatusEnum.NO_OPERADO]: {
    label: "No operado",
    icon: XCircle,
    style: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/40 dark:text-red-100 dark:border-red-700",
    dotColor: "bg-red-500",
    priority: 4
  },
  [PatientStatusEnum.INDECISO]: {
    label: "Indeciso",
    icon: AlertTriangle,
    style: "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-900/40 dark:text-orange-100 dark:border-orange-700", 
    dotColor: "bg-orange-500",
    priority: 3
  },
  SURVEY_PENDING: {
    label: "Encuesta pendiente",
    icon: ClipboardList,
    style: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/40 dark:text-yellow-100 dark:border-yellow-700",
    dotColor: "bg-yellow-500",
    priority: 1
  },
  DEFAULT: {
    label: "Sin estado",
    icon: User,
    style: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-slate-800/50 dark:text-slate-200 dark:border-slate-700",
    dotColor: "bg-gray-500",
    priority: 0
  }
} as const

// Tamaños simplificados
const SIZE_VARIANTS = {
  sm: "px-2.5 py-0.5 text-xs h-6",
  md: "px-3 py-1 text-xs h-7", 
  lg: "px-3.5 py-1.5 text-sm h-8"
} as const

const ICON_SIZES = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5", 
  lg: "h-4 w-4"
} as const

const DOT_SIZES = {
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
  lg: "w-2.5 h-2.5"
} as const

interface PatientStatusProps {
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  showIcon?: boolean
  className?: string
}

// Función utilitaria para obtener la configuración del estado
const getStatusConfig = (status: PatientData["estado_paciente"], surveyCompleted: boolean) => {
  if (!surveyCompleted && status !== PatientStatusEnum.OPERADO) {
    return STATUS_CONFIG.SURVEY_PENDING;
  }
  
  if (status && status in STATUS_CONFIG) {
    return STATUS_CONFIG[status as PatientStatusEnum];
  }
  
  return STATUS_CONFIG.DEFAULT;
};

// Componente principal memoizado
const PatientStatus = React.memo(function PatientStatus({
  status,
  surveyCompleted = false,
  size = "md",
  showIcon = true,
  className
}: PatientStatusProps) {
  const config = useMemo(() => 
    getStatusConfig(status, surveyCompleted), 
    [status, surveyCompleted]
  );
  
  const Icon = config.icon;
  const shouldShowActivityDot = config.priority <= 2;
  const isMobile = useIsMobile();

  // Versión ultra compacta para móviles
  if (isMobile && size === "sm") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "rounded-full flex items-center justify-center",
              DOT_SIZES[size],
              config.dotColor
            )} />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs font-medium">{config.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="relative inline-flex">
      <Badge
        variant="outline"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium border transition-all duration-200",
          "relative overflow-hidden shadow-sm hover:shadow-md",
          SIZE_VARIANTS[size],
          config.style,
          className
        )}
        aria-label={`Estado: ${config.label}`}
      >
        {showIcon && <Icon className={cn("shrink-0", ICON_SIZES[size])} />}
        <span className="truncate max-w-[120px]">{config.label}</span>
      </Badge>
      
      {/* Dot de actividad para estados importantes */}
      {shouldShowActivityDot && (
        <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center">
          <div className={cn(
            "rounded-full animate-ping absolute opacity-75",
            config.dotColor,
            DOT_SIZES[size]
          )} />
          <div className={cn(
            "rounded-full",
            config.dotColor,
            DOT_SIZES[size]
          )} />
        </div>
      )}
    </div>
  );
});

// Componente para mostrar múltiples estados (memoizado)
interface PatientStatusGroupProps {
  statuses: Array<{
    status: PatientData["estado_paciente"]
    surveyCompleted?: boolean
  }>
  size?: "sm" | "md" | "lg"
  className?: string
  maxVisible?: number
}

const PatientStatusGroup = React.memo(function PatientStatusGroup({
  statuses,
  size = "sm",
  className,
  maxVisible = 3
}: PatientStatusGroupProps) {
  const isMobile = useIsMobile();
  
  if (!statuses.length) return null;

  // Para móviles, mostrar solo el estado más importante
  if (isMobile) {
    const highestPriorityStatus = statuses.reduce((prev, current) => {
      const prevConfig = getStatusConfig(prev.status, prev.surveyCompleted ?? false);
      const currentConfig = getStatusConfig(current.status, current.surveyCompleted ?? false);
      return currentConfig.priority > prevConfig.priority ? current : prev;
    }, statuses[0]);
    
    return (
      <div className={className}>
        <PatientStatus
          status={highestPriorityStatus.status}
          surveyCompleted={highestPriorityStatus.surveyCompleted}
          size={size}
        />
      </div>
    );
  }

  // Para desktop, mostrar varios estados con límite
  const visibleStatuses = statuses.slice(0, maxVisible);
  const hiddenCount = statuses.length - maxVisible;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {visibleStatuses.map((statusInfo, index) => (
        <PatientStatus
          key={`${statusInfo.status}-${index}`}
          status={statusInfo.status}
          surveyCompleted={statusInfo.surveyCompleted}
          size={size}
        />
      ))}
      
      {hiddenCount > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className={cn(
                  "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300",
                  SIZE_VARIANTS[size]
                )}
              >
                +{hiddenCount}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {statuses.slice(maxVisible).map((statusInfo, index) => {
                  const config = getStatusConfig(statusInfo.status, statusInfo.surveyCompleted ?? false);
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
                      <span className="text-sm">{config.label}</span>
                    </div>
                  );
                })}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

// Componente compacto optimizado para vista móvil
interface PatientStatusCompactProps {
  status: PatientData["estado_paciente"]
  surveyCompleted?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const PatientStatusCompact = React.memo(function PatientStatusCompact({
  status,
  surveyCompleted,
  size = "md",
  className
}: PatientStatusCompactProps) {
  const config = useMemo(
    () => getStatusConfig(status, surveyCompleted ?? false), 
    [status, surveyCompleted]
  );
  
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 font-medium border px-2 py-0.5",
        SIZE_VARIANTS[size],
        config.style,
        className
      )}
      aria-label={config.label}
    >
      <Icon className={cn(ICON_SIZES[size])} />
      <div className={cn(
        "rounded-full",
        DOT_SIZES[size],
        config.dotColor
      )} />
    </Badge>
  );
});

// Hook utilitario para obtener información del estado
export const usePatientStatusInfo = (
  status: PatientData["estado_paciente"],
  surveyCompleted: boolean = false
) => {
  return useMemo(() => {
    const config = getStatusConfig(status, surveyCompleted);
    
    return {
      label: config.label,
      icon: config.icon,
      style: config.style,
      dotColor: config.dotColor,
      priority: config.priority,
      needsAttention: config.priority <= 2,
      isComplete: config.priority >= 4
    };
  }, [status, surveyCompleted]);
}

// Función utilitaria para ordenar por prioridad de estado
export const sortByStatusPriority = (
  patients: Array<{ 
    status: PatientData["estado_paciente"]
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