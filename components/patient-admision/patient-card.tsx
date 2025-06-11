"use client";

import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  User,
  Clock,
  CalendarDays,
  FileText,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  MessageSquare,
  History,
  AlertCircle,
  LogIn,
  ListChecks,
  CalendarX,
  Repeat,
  Phone,
  ChevronRight,
} from "lucide-react";
import type { Appointment, ConfirmAction } from "./patient-admission"; // Asegúrate que esta ruta sea correcta
import { AppointmentStatusEnum } from "@/app/dashboard/data-model"; // Asegúrate que esta ruta sea correcta
import { cn } from "@/lib/utils";

interface AppointmentCardProps {
  appointment: Appointment;
  onAction: (action: ConfirmAction, appointmentId: string, patientId?: string) => void;
  onStartSurvey: (appointmentId: string, patientId?: string) => void;
  onViewHistory: (patientId: string) => void;
  disableActions?: boolean;
  surveyCompleted?: boolean;
}

const STATUS_DETAILS: Record<
  AppointmentStatusEnum,
  { label: string; className: string; icon: React.ElementType }
> = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
    icon: Clock,
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    icon: CheckCircle,
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En espera",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: LogIn,
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    className: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    icon: ListChecks,
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    className: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    icon: XCircle,
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No asistió",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    icon: CalendarX,
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    icon: Repeat,
  },
};

const formatTime = (time: string): string => {
  if (!time || typeof time !== 'string' || !time.includes(':')) return "---";
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  if (isNaN(hour) || isNaN(parseInt(minutes, 10))) return "---";
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minutes.padStart(2, '0')} ${period}`;
};

const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "---";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const inputDate = new Date(date);
    inputDate.setHours(0, 0, 0, 0);

    if (inputDate.getTime() === today.getTime()) return "Hoy";
    if (inputDate.getTime() === tomorrow.getTime()) return "Mañana";

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  } catch {
    return "---";
  }
};

const NON_ACTIONABLE_STATUSES = new Set([
  AppointmentStatusEnum.COMPLETADA,
  AppointmentStatusEnum.CANCELADA,
  AppointmentStatusEnum.NO_ASISTIO,
  AppointmentStatusEnum.REAGENDADA,
]);

export const AppointmentCard: React.FC<AppointmentCardProps> = React.memo(({
  appointment,
  onAction,
  onStartSurvey,
  onViewHistory,
  disableActions = false,
  surveyCompleted = false,
}) => {
  const { nombre, apellidos, fechaConsulta, horaConsulta, motivoConsulta, estado, patientId, id, telefono } = appointment;

  const statusDetail = useMemo(
    () => STATUS_DETAILS[estado as AppointmentStatusEnum] || STATUS_DETAILS[AppointmentStatusEnum.PROGRAMADA],
    [estado]
  );
  const StatusIcon = statusDetail.icon;

  const formattedDate = useMemo(() => formatDate(fechaConsulta), [fechaConsulta]);
  const formattedTime = useMemo(() => formatTime(horaConsulta), [horaConsulta]);

  const isPastAppointment = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(fechaConsulta);
    appointmentDate.setHours(0, 0, 0, 0);
    return appointmentDate < today;
  }, [fechaConsulta]);

  const isActionable = useMemo(() => !NON_ACTIONABLE_STATUSES.has(estado), [estado]);
  const needsSurvey = useMemo(() => disableActions && !surveyCompleted && isActionable, [disableActions, surveyCompleted, isActionable]);

  const handleStartSurvey = useCallback(() => {
    onStartSurvey(id, patientId);
  }, [onStartSurvey, id, patientId]);

  const handleViewHistory = useCallback(() => {
    if (patientId) {
      onViewHistory(patientId);
    }
  }, [onViewHistory, patientId]);

  const handleAction = useCallback((action: ConfirmAction) => {
    if (disableActions && !surveyCompleted && action !== "noShow" && action !== "reschedule") { // Permitir noShow y reschedule incluso si la encuesta está pendiente
      handleStartSurvey();
      return;
    }
    onAction(action, id, patientId);
  }, [onAction, id, patientId, disableActions, surveyCompleted, handleStartSurvey]);


  return (
    <Card className={cn(
      "group relative w-full overflow-hidden rounded-lg transition-all duration-200",
      "hover:shadow-lg hover:-translate-y-0.5",
      "bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700/80",
      isPastAppointment && isActionable && "opacity-75 hover:opacity-100"
    )}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
              <User size={18} className="text-slate-500 dark:text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base text-slate-800 dark:text-slate-100 truncate" title={`${nombre} ${apellidos}`}>
                {nombre} {apellidos}
              </h3>
              {telefono && telefono !== "N/A" && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Phone size={12} />
                  {telefono}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Más opciones"
              >
                <MoreHorizontal size={18} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {estado === AppointmentStatusEnum.PROGRAMADA && (
                <>
                  <DropdownMenuItem onClick={() => handleAction("checkIn")} className="gap-2.5">
                    <LogIn size={16} /> Registrar llegada
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAction("cancel")} className="gap-2.5 text-red-600 focus:text-red-600">
                    <XCircle size={16} /> Cancelar cita
                  </DropdownMenuItem>
                </>
              )}
              {estado === AppointmentStatusEnum.CONFIRMADA && (
                <DropdownMenuItem onClick={() => handleAction("checkIn")} className="gap-2.5">
                  <LogIn size={16} /> Registrar llegada
                </DropdownMenuItem>
              )}
              {estado === AppointmentStatusEnum.PRESENTE && (
                <DropdownMenuItem
                  onClick={() => handleAction("complete")}
                  className="gap-2.5"
                  disabled={disableActions && !surveyCompleted}
                >
                  <ListChecks size={16} /> Completar consulta
                </DropdownMenuItem>
              )}
              {isActionable && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleAction("noShow")}
                    className="gap-2.5"
                    // No deshabilitar noShow/reschedule por encuesta pendiente
                  >
                    <CalendarX size={16} /> Marcar no asistió
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleAction("reschedule")}
                    className="gap-2.5"
                     // No deshabilitar noShow/reschedule por encuesta pendiente
                  >
                    <Repeat size={16} /> Reagendar
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleStartSurvey}
                className={cn("gap-2.5", !surveyCompleted && "font-semibold text-blue-600 dark:text-blue-400")}
              >
                <MessageSquare size={16} />
                {surveyCompleted ? "Ver encuesta" : "Iniciar encuesta"}
              </DropdownMenuItem>
              {patientId && (
                <DropdownMenuItem onClick={handleViewHistory} className="gap-2.5">
                  <History size={16} /> Ver historial
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Badge
          variant="secondary"
          className={cn(
            "w-fit text-xs font-medium px-2.5 py-1 rounded-full border-0 mt-3",
            statusDetail.className
          )}
        >
          <StatusIcon size={12} className="mr-1.5" />
          {statusDetail.label}
        </Badge>
      </CardHeader>

      <CardContent className="px-4 pb-3 pt-2 space-y-3">
        {needsSurvey && (
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60">
            <AlertCircle size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 flex-1">
              Encuesta pendiente para continuar.
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-800/50"
              onClick={handleStartSurvey}
            >
              Completar
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <CalendarDays size={14} />
            <span className="font-medium">{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Clock size={14} />
            <span className="font-medium">{formattedTime}</span>
          </div>
        </div>

        {motivoConsulta && motivoConsulta.trim() !== "" && motivoConsulta !== "N/A" && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <FileText size={14} className="text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2" title={motivoConsulta}>
                {motivoConsulta}
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {(isActionable && (estado === AppointmentStatusEnum.PROGRAMADA || estado === AppointmentStatusEnum.CONFIRMADA)) && (
        <CardFooter className="px-4 pb-4 pt-0">
          <Button
            size="sm"
            className="w-full h-9 text-sm font-medium"
            onClick={() => handleAction("checkIn")}
          >
            <LogIn size={16} className="mr-2" />
            Registrar llegada
          </Button>
        </CardFooter>
      )}

      {estado === AppointmentStatusEnum.PRESENTE && (
        <CardFooter className="px-4 pb-4 pt-0">
          <Button
            size="sm"
            variant={(disableActions && !surveyCompleted) ? "secondary" : "default"}
            className="w-full h-9 text-sm font-medium"
            onClick={() => handleAction("complete")}
            disabled={disableActions && !surveyCompleted}
          >
            <ListChecks size={16} className="mr-2" />
            Completar consulta
          </Button>
        </CardFooter>
      )}
    </Card>
  );
});

AppointmentCard.displayName = "AppointmentCard";