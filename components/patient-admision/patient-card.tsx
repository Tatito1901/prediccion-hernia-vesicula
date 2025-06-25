// patient-card.tsx - Versión optimizada para rendimiento
import React, { memo, useCallback, useMemo } from "react"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Clock,
  MoreHorizontal,
  XCircle,
  MessageSquare,
  History,
  LogIn,
  ListChecks,
  CalendarX,
  Repeat,
  Phone,
} from "lucide-react"
import { AppointmentStatusEnum, AppointmentData } from "@/lib/types"
import { cn } from "@/lib/utils"

// Tipos simplificados
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule"

// Usamos AppointmentData de lib/types en lugar de definir una interfaz local

interface AppointmentCardProps {
  appointment: AppointmentData
  onAction: (action: ConfirmAction, appointmentId: string, appointmentData: AppointmentData) => void
  onStartSurvey: (appointmentId: string, patientId?: string, appointmentData?: AppointmentData) => void
  onViewHistory: (patientId: string) => void
  disableActions?: boolean
  surveyCompleted?: boolean
}

// Configuración estática
const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    dot: "bg-slate-400",
    primary: "checkIn" as ConfirmAction,
    primaryLabel: "Check In",
    variant: "secondary" as const,
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    dot: "bg-blue-500",
    primary: "checkIn" as ConfirmAction,
    primaryLabel: "Check In",
    variant: "default" as const,
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En Consulta",
    dot: "bg-emerald-500",
    primary: "complete" as ConfirmAction,
    primaryLabel: "Completar",
    variant: "success" as const,
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    dot: "bg-green-600",
    primary: null,
    primaryLabel: null,
    variant: "outline" as const,
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    dot: "bg-red-500",
    primary: null,
    primaryLabel: null,
    variant: "destructive" as const,
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No Asistió",
    dot: "bg-amber-500",
    primary: null,
    primaryLabel: null,
    variant: "warning" as const,
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    dot: "bg-purple-500",
    primary: null,
    primaryLabel: null,
    variant: "secondary" as const,
  },
}

const ACTIONABLE_STATUSES = new Set([
  AppointmentStatusEnum.PROGRAMADA,
  AppointmentStatusEnum.CONFIRMADA,
  AppointmentStatusEnum.PRESENTE,
]);

// Cache para formateo
const timeFormatCache = new Map<string, string>();
const dateFormatCache = new Map<string, string>();

// Utilidades de formateo con cache
const formatTime = (time?: string) => {
  if (!time || !time.includes(":")) return "---"
  
  const cached = timeFormatCache.get(time);
  if (cached) return cached;
  
  const [h, m] = time.split(":")
  const hour = Number(h)
  if (isNaN(hour)) return "---"
  const period = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  const formatted = `${displayHour}:${m} ${period}`;
  
  timeFormatCache.set(time, formatted);
  return formatted;
}

const formatDate = (date: string | Date) => {
  const key = date.toString();
  const cached = dateFormatCache.get(key);
  if (cached) return cached;
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return "---"

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diff = (d.setHours(0, 0, 0, 0) - today.getTime()) / 86400000
  let formatted: string;
  
  if (diff === 0) {
    formatted = "Hoy";
  } else if (diff === 1) {
    formatted = "Mañana";
  } else {
    formatted = d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  }
  
  dateFormatCache.set(key, formatted);
  return formatted;
}

const getInitials = (fullName = "", last = "") => {
  if (!fullName) return "";
  
  // Si last está vacío, asumimos que fullName es el nombre completo
  if (!last) {
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  }
  
  return `${fullName.charAt(0)}${last.charAt(0)}`.toUpperCase();
};

// Componente principal optimizado con memo
export const AppointmentCard = memo<AppointmentCardProps>(({
  appointment,
  onAction,
  onStartSurvey,
  onViewHistory,
  disableActions = false,
  surveyCompleted = false,
}) => {
  const {
    paciente, // En lugar de nombre y apellidos
    fechaConsulta,
    horaConsulta,
    motivoConsulta,
    estado,
    patientId,
    id,
    telefono,
  } = appointment

  const statusConfig = STATUS_CONFIG[estado] || STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA]
  const isActionable = ACTIONABLE_STATUSES.has(estado)
  const needsSurvey = estado === AppointmentStatusEnum.PRESENTE && disableActions && !surveyCompleted
  const formattedDate = formatDate(fechaConsulta)
  const formattedTime = formatTime(horaConsulta)
  // Extraer iniciales del nombre completo del paciente
  const initials = getInitials(paciente, '')

  // Definir el tipo para los elementos del menú
  type MenuItem = {
    icon: any;
    label: string;
    action: ConfirmAction;
    destructive?: boolean;
    disabled?: boolean;
  };

  // Generar menu items memoizado
  const menuItems = useMemo<MenuItem[]>(() => {
    switch (estado) {
      case AppointmentStatusEnum.PROGRAMADA:
        return [
          { icon: LogIn, label: "Check In", action: "checkIn" },
          { icon: XCircle, label: "Cancelar", action: "cancel", destructive: true },
        ];
      case AppointmentStatusEnum.CONFIRMADA:
        return [
          { icon: LogIn, label: "Check In", action: "checkIn" },
          { icon: XCircle, label: "Cancelar", action: "cancel", destructive: true },
          { icon: Repeat, label: "Reagendar", action: "reschedule" },
        ];
      case AppointmentStatusEnum.PRESENTE:
        return [
          { icon: ListChecks, label: "Completar", action: "complete" },
          { icon: CalendarX, label: "No Asistió", action: "noShow", destructive: true },
        ];
      default: return [];
    }
  }, [estado]);

  // Callbacks optimizados
  const handlePrimaryAction = useCallback(() => {
    if (!statusConfig.primary) return

    if (needsSurvey && statusConfig.primary === "complete") {
      onStartSurvey(id, patientId, appointment)
      return
    }
    onAction(statusConfig.primary, id, appointment)
  }, [statusConfig.primary, needsSurvey, onStartSurvey, onAction, id, patientId, appointment]);

  const handleAction = useCallback((action: ConfirmAction) => {
    onAction(action, id, appointment)
  }, [onAction, id, appointment]);

  const handleStartSurvey = useCallback(() => {
    onStartSurvey(id, patientId, appointment)
  }, [onStartSurvey, id, patientId, appointment]);

  const handleViewHistory = useCallback(() => {
    patientId && onViewHistory(patientId)
  }, [patientId, onViewHistory]);

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200 ease-out",
      "hover:shadow-md hover:shadow-slate-200/30 dark:hover:shadow-slate-900/30",
      "border-0 shadow-sm bg-white dark:bg-slate-800",
      "dark:border dark:border-slate-700/80",
      "flex flex-col h-full"
    )}>
      <CardContent className="p-4 sm:p-5 flex flex-col flex-grow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Avatar */}
            <div className={cn(
              "flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
              "text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
            )}>
              {initials}
            </div>

            {/* Info principal */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                  {paciente}
                </h3>
                <div className={cn("h-2 w-2 shrink-0 rounded-full", statusConfig.dot)} />
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  {formattedTime}
                </span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="font-medium">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Menú */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
                  "opacity-100 sm:opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100",
                  "hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              {menuItems.map(({ icon: Icon, label, action, destructive = false, disabled = false }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => handleAction(action)}
                  className={cn(
                    "gap-2",
                    destructive ? "text-red-600 focus:text-red-600 dark:text-red-400" : "",
                  )}
                  disabled={disabled}
                >
                  <Icon size={14} /> {label}
                </DropdownMenuItem>
              ))}

              {isActionable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleAction("noShow")} className="gap-2">
                    <CalendarX size={14} /> No asistió
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("reschedule")} className="gap-2">
                    <Repeat size={14} /> Reagendar
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleStartSurvey} className="gap-2">
                <MessageSquare size={14} /> Encuesta
              </DropdownMenuItem>

              {patientId && (
                <DropdownMenuItem onClick={handleViewHistory} className="gap-2">
                  <History size={14} /> Historial
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Body */}
        <div className="space-y-3 pt-2 flex-grow">
          {/* Estado + Teléfono */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <Badge
              variant={statusConfig.variant}
              className="self-start px-2.5 py-1 text-xs font-medium"
            >
              {statusConfig.label}
            </Badge>

            {telefono && telefono !== "N/A" && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Phone size={14} className="flex-shrink-0" />
                <span className="truncate">{telefono}</span>
              </div>
            )}
          </div>

          {/* Motivo Consulta */}
          {motivoConsulta && motivoConsulta !== "N/A" && (
            <div className="mt-2">
              <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">Motivo:</span> {motivoConsulta}
              </p>
            </div>
          )}

          {/* Alerta encuesta */}
          {needsSurvey && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <span className="text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-300">
                  Encuesta requerida
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto shrink-0 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-800/60 dark:hover:text-amber-200"
                onClick={handleStartSurvey}
              >
                Iniciar
              </Button>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        {isActionable && statusConfig.primary && !needsSurvey && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
            <Button
              onClick={handlePrimaryAction}
              className="w-full font-semibold"
              variant="default"
              size="sm"
              disabled={needsSurvey && statusConfig.primary === "complete" ? false : disableActions && !surveyCompleted}
            >
              {needsSurvey && statusConfig.primary === "complete" ? (
                <>
                  <MessageSquare size={16} className="mr-2" />
                  Iniciar Encuesta
                </>
              ) : (
                <>
                  {statusConfig.primary === "checkIn" && (
                    <LogIn size={16} className="mr-2" />
                  )}
                  {statusConfig.primary === "complete" && (
                    <ListChecks size={16} className="mr-2" />
                  )}
                  {statusConfig.primaryLabel}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
});