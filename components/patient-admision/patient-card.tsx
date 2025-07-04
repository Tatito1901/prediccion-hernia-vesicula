import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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
import { cn } from "@/lib/utils"
import { AppointmentStatusEnum, ExtendedAppointment } from "@/lib/types"

type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule"

interface AppointmentCardProps {
  appointment: ExtendedAppointment
  onAction: (action: ConfirmAction, appointmentId: string, appointmentData: ExtendedAppointment) => void
  onStartSurvey: (appointmentId: string, patientId?: string, appointmentData?: ExtendedAppointment) => void
  onViewHistory: (patientId: string) => void
  disableActions?: boolean
  surveyCompleted?: boolean
}

const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    dot: "bg-slate-400",
    primary: "checkIn",
    primaryLabel: "Check In",
    variant: "secondary",
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    dot: "bg-blue-500",
    primary: "checkIn",
    primaryLabel: "Check In",
    variant: "default",
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En Consulta",
    dot: "bg-emerald-500",
    primary: "complete",
    primaryLabel: "Completar",
    variant: "success",
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    dot: "bg-green-600",
    primary: null,
    primaryLabel: null,
    variant: "outline",
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    dot: "bg-red-500",
    primary: null,
    primaryLabel: null,
    variant: "destructive",
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No Asistió",
    dot: "bg-amber-500",
    primary: null,
    primaryLabel: null,
    variant: "warning",
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    dot: "bg-purple-500",
    primary: null,
    primaryLabel: null,
    variant: "secondary",
  },
}

const ACTIONABLE_STATUSES = new Set([
  AppointmentStatusEnum.PROGRAMADA,
  AppointmentStatusEnum.CONFIRMADA,
  AppointmentStatusEnum.PRESENTE,
])

// Función auxiliar para normalizar el estado de cita
const normalizeAppointmentStatus = (status: string): keyof typeof AppointmentStatusEnum => {
  // Crear un mapeo de normalización para garantizar compatibilidad
  const statusMap: Record<string, keyof typeof AppointmentStatusEnum> = {
    "NO ASISTIO": "NO_ASISTIO",
    "PROGRAMADA": "PROGRAMADA",
    "CONFIRMADA": "CONFIRMADA",
    "CANCELADA": "CANCELADA",
    "COMPLETADA": "COMPLETADA",
    "PRESENTE": "PRESENTE",
    "REAGENDADA": "REAGENDADA"
  }
  
  // Usar el valor mapeado o devolver un valor por defecto seguro
  return statusMap[status] || "PROGRAMADA"
};

const getInitials = (nombre = "", apellidos = "") => {
  const n = (nombre || "").charAt(0)
  const a = (apellidos || "").charAt(0)
  return `${n}${a}`.toUpperCase() || "SN"
}

const formatTime = (dateString: string) => {
  if (!dateString) return "---"
  
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return "---"
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return "---"
  
  try {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Hoy"
    if (diffDays === 1) return "Mañana"
    
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    })
  } catch {
    return "---"
  }
}

export const AppointmentCard = ({
  appointment,
  onAction,
  onStartSurvey,
  onViewHistory,
  disableActions = false,
  surveyCompleted = false,
}: AppointmentCardProps) => {
  const {
    id,
    patient_id,
    paciente,
    fecha_hora_cita,
    motivo_cita,
    estado_cita,
  } = appointment as ExtendedAppointment & {
    estado_cita: keyof typeof AppointmentStatusEnum
  }

  const fullName = `${paciente?.nombre || ''} ${paciente?.apellidos || ''}`.trim()
  const telefono = paciente?.telefono
  const normalizedStatus = normalizeAppointmentStatus(estado_cita)
  const statusConfig = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA]
  const isActionable = ACTIONABLE_STATUSES.has(normalizedStatus)
  const needsSurvey = normalizedStatus === AppointmentStatusEnum.PRESENTE && !surveyCompleted
  const formattedDate = formatDate(fecha_hora_cita)
  const formattedTime = formatTime(fecha_hora_cita)
  const initials = getInitials(paciente?.nombre, paciente?.apellidos)

  // Definir elementos del menú
  type MenuItem = {
    icon: React.ElementType
    label: string
    action: ConfirmAction
    destructive?: boolean
  }

  // Crear menú de acciones para la tarjeta de cita
  const menuItems = React.useMemo(() => {
    const items: MenuItem[] = []
    
    switch (normalizedStatus) {
      case AppointmentStatusEnum.PROGRAMADA:
        items.push({ icon: LogIn, label: "Check In", action: "checkIn" })
        items.push({ icon: XCircle, label: "Cancelar", action: "cancel", destructive: true })
        break
      case AppointmentStatusEnum.CONFIRMADA:
        items.push({ icon: LogIn, label: "Check In", action: "checkIn" })
        items.push({ icon: XCircle, label: "Cancelar", action: "cancel", destructive: true })
        items.push({ icon: Repeat, label: "Reagendar", action: "reschedule" })
        break
      case AppointmentStatusEnum.PRESENTE:
        items.push({ icon: ListChecks, label: "Completar", action: "complete" })
        items.push({ icon: CalendarX, label: "No Asistió", action: "noShow", destructive: true })
        break
    }
    
    return items
  }, [estado_cita])

  const handlePrimaryAction = () => {
    if (!statusConfig.primary) return

    if (needsSurvey && statusConfig.primary === "complete") {
      onStartSurvey(id, patient_id, appointment)
      return
    }
    onAction(statusConfig.primary as ConfirmAction, id, appointment)
  }

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-150",
      "hover:shadow-md border-0 shadow-sm bg-white dark:bg-slate-900",
      "dark:border dark:border-slate-700 flex flex-col h-full"
    )}>
      <CardContent className="p-4 flex flex-col flex-grow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Avatar */}
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
              "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
              "text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
            )}>
              {initials}
            </div>

            {/* Info principal */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
                  {fullName}
                </h3>
                <div className={cn("h-2 w-2 shrink-0 rounded-full", statusConfig.dot)} />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formattedTime}
                </span>
                <span className="hidden sm:block text-slate-300 dark:text-slate-600">•</span>
                <span>{formattedDate}</span>
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
                  "opacity-100 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-48">
              {menuItems.map(({ icon: Icon, label, action, destructive = false }) => (
                <DropdownMenuItem
                  key={label}
                  onClick={() => onAction(action, id, appointment)}
                  className={cn(
                    "gap-2",
                    destructive ? "text-red-600 focus:text-red-600 dark:text-red-400" : "",
                  )}
                >
                  <Icon size={14} /> {label}
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onStartSurvey(id, patient_id, appointment)} 
                className="gap-2"
              >
                <MessageSquare size={14} /> Encuesta
              </DropdownMenuItem>

              {patient_id && (
                <DropdownMenuItem 
                  onClick={() => onViewHistory(patient_id)} 
                  className="gap-2"
                >
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
              variant={statusConfig.variant as "default" | "secondary" | "destructive" | "outline" | "success" | "warning"}
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

          {/* Información del paciente y consulta */}
          <div className="mt-2 space-y-2">
            {/* Edad */}
            {(paciente as any)?.edad && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-700 dark:text-slate-200">Edad:</span> {(paciente as any).edad} años
              </p>
            )}
            
            {/* Fecha completa */}
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-700 dark:text-slate-200">Fecha:</span> {new Date(fecha_hora_cita).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric', 
                month: 'long'
              })}
            </p>

            {/* Motivo Consulta */}
            {motivo_cita && motivo_cita !== "N/A" && (
              <div className="pt-1">
                <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                  <span className="font-medium text-slate-700 dark:text-slate-200">Motivo:</span> {motivo_cita}
                </p>
              </div>
            )}
            
            {/* Indicador de diagnóstico */}
            {motivo_cita && (
              <div className="pt-1">
                {motivo_cita.includes("HERNIA") && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700">
                    <span className="mr-1">🔸</span> Hernia
                  </Badge>
                )}
                {motivo_cita.includes("VESICULA") && (
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700">
                    <span className="mr-1">🟡</span> Vesícula
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Alerta encuesta */}
          {needsSurvey && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800/50 dark:bg-amber-900/20">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                  Encuesta requerida
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto shrink-0 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-800/60"
                onClick={() => onStartSurvey(id, patient_id, appointment)}
              >
                Iniciar
              </Button>
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        {isActionable && statusConfig.primary && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
            <Button
              onClick={handlePrimaryAction}
              className="w-full font-medium"
              variant={needsSurvey ? "outline" : "default"}
              size="sm"
              disabled={disableActions}
            >
              {needsSurvey ? (
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
}