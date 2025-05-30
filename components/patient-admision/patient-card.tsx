import type React from "react"
import { type FC, memo, useCallback, useMemo } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  FileText,
  MoreHorizontal,
  Phone,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import type { AppointmentStatusEnum } from "@/app/dashboard/data-model"

// ==== TIPOS AUXILIARES ====
type EntityId = string
type ISODateString = string
type FormattedTimeString = `${number}:${number}`

export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule"

export interface Appointment {
  id: EntityId
  nombre: string
  apellidos: string
  telefono: string
  fechaConsulta: ISODateString | Date
  horaConsulta: FormattedTimeString
  motivoConsulta?: string
  estado: AppointmentStatusEnum
  patientId?: EntityId
}

interface AppointmentCardProps {
  appointment: Appointment
  isPastOverride?: boolean
  showNoShowOverride?: boolean
  onAction: (action: ConfirmAction, id: EntityId, appointment: Appointment) => void
  onStartSurvey: (patientId: EntityId, nombre: string, apellidos: string, telefono: string) => void
  onViewHistory: (patientId: EntityId) => void // Nueva prop para ver historial
}

// ==== UTILIDADES FECHA/HORA ====
const parseDate = (input: string | Date): Date => {
  const d = input instanceof Date ? input : new Date(input)
  return isNaN(d.getTime()) ? new Date() : d
}

const formatDate = (d: string | Date): string => {
  return format(parseDate(d), "d MMM, yyyy", { locale: es }) // Formato más corto
}

const formatTime = (t: string): string => {
  const [h, m] = t.split(":").map((v) => Number.parseInt(v, 10))
  return format(new Date().setHours(h, m), "HH:mm", { locale: es })
}

// ==== CONFIGURACIÓN DE ESTADOS (Minimalista) ====
const STATUS_CONFIG: Record<
  AppointmentStatusEnum,
  {
    className: string
    icon: React.ReactNode
    label: string
    borderColor: string
  }
> = {
  PROGRAMADA: {
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    icon: <Clock className="h-3 w-3" />,
    label: "Programada",
    borderColor: "border-l-slate-400",
  },
  CONFIRMADA: {
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    icon: <CalendarDays className="h-3 w-3" />,
    label: "Confirmada",
    borderColor: "border-l-blue-500",
  },
  PRESENTE: {
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: <CheckCircle className="h-3 w-3" />,
    label: "Presente",
    borderColor: "border-l-emerald-500",
  },
  COMPLETADA: {
    className: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300",
    icon: <ClipboardCheck className="h-3 w-3" />,
    label: "Completada",
    borderColor: "border-l-violet-500",
  },
  CANCELADA: {
    className: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    icon: <XCircle className="h-3 w-3" />,
    label: "Cancelada",
    borderColor: "border-l-red-500",
  },
  NO_ASISTIO: {
    className: "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
    icon: <AlertCircle className="h-3 w-3" />,
    label: "No Asistió",
    borderColor: "border-l-gray-500",
  },
  REAGENDADA: {
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    icon: <CalendarDays className="h-3 w-3" />,
    label: "Reagendada",
    borderColor: "border-l-amber-500",
  },
}

// ==== COMPONENTE BADGE DE ESTADO (Minimalista) ====
export const AppointmentStatusBadge: FC<{
  status: AppointmentStatusEnum
}> = memo(({ status }) => {
  const config = STATUS_CONFIG[status] ?? {
    className: "bg-gray-100 text-gray-600",
    icon: null,
    label: status,
    borderColor: "border-l-gray-400",
  }

  return (
    <Badge
      variant="secondary" // Usar variant secondary para un look más plano
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-md ${config.className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  )
})
AppointmentStatusBadge.displayName = "AppointmentStatusBadge"

// ==== COMPONENTE PRINCIPAL (Minimalista) ====
export const AppointmentCard: FC<AppointmentCardProps> = memo(
  ({
    appointment,
    isPastOverride = false,
    showNoShowOverride = false,
    onAction,
    onStartSurvey,
    onViewHistory, // Nueva prop
  }) => {
    const { id, nombre, apellidos, telefono, fechaConsulta, horaConsulta, motivoConsulta, estado, patientId } =
      appointment

    const isPast = useMemo(() => {
      return (
        isPastOverride ||
        estado === "COMPLETADA" ||
        estado === "CANCELADA" ||
        (showNoShowOverride && estado === "NO_ASISTIO")
      )
    }, [estado, isPastOverride, showNoShowOverride])

    const handleAction = useCallback(
      (action: ConfirmAction) => onAction(action, id, appointment),
      [id, appointment, onAction],
    )

    const handleSurvey = useCallback(() => {
      if (!patientId) return
      onStartSurvey(patientId, nombre, apellidos, telefono)
    }, [patientId, nombre, apellidos, telefono, onStartSurvey])

    const handleViewHistory = useCallback(() => {
      if (!patientId) return
      onViewHistory(patientId)
    }, [patientId, onViewHistory])

    const config = STATUS_CONFIG[estado]

    return (
      <Card
        className={`group relative overflow-hidden transition-shadow duration-200 hover:shadow-md border-l-4 ${
          config?.borderColor || "border-l-gray-300"
        } ${isPast ? "opacity-70" : ""} bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            {/* Información principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {nombre} {apellidos}
                </h3>
                <AppointmentStatusBadge status={estado} />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  <span>{formatDate(fechaConsulta)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatTime(horaConsulta)}</span>
                </div>
              </div>

              {motivoConsulta && (
                <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mb-1">
                  <span className="font-medium">Motivo:</span> {motivoConsulta}
                </p>
              )}
              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Phone className="h-3.5 w-3.5" />
                <span>{telefono}</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="ml-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md opacity-50 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {!isPast && (
                    <>
                      <DropdownMenuItem onClick={() => handleAction("checkIn")}>
                        <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                        Marcar presente
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("noShow")}>
                        <AlertCircle className="h-3.5 w-3.5 mr-2 text-gray-600" />
                        No asistió
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("reschedule")}>
                        <CalendarDays className="h-3.5 w-3.5 mr-2 text-amber-600" />
                        Reagendar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleAction("cancel")}>
                        <XCircle className="h-3.5 w-3.5 mr-2 text-red-600" />
                        Cancelar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {estado === "PRESENTE" && (
                    <>
                      <DropdownMenuItem onClick={() => handleAction("complete")}>
                        <ClipboardCheck className="h-3.5 w-3.5 mr-2 text-violet-600" />
                        Completar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}

                  {patientId && (
                    <>
                      <DropdownMenuItem onClick={handleViewHistory}>
                        <History className="h-3.5 w-3.5 mr-2 text-slate-600" />
                        Ver historial
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleSurvey}>
                        <FileText className="h-3.5 w-3.5 mr-2 text-blue-600" />
                        Enviar encuesta
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)
AppointmentCard.displayName = "AppointmentCard"

export default AppointmentCard
