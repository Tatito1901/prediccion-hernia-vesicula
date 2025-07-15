// patient-card.tsx - Versión refactorizada con utilidades integradas
import React, { memo, useMemo, useCallback } from "react";
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

// ==================== UTILIDADES INTEGRADAS ====================

// Función para normalizar el estado de cita
const normalizeAppointmentStatus = (status: string): keyof typeof AppointmentStatusEnum => {
  const statusMap: Record<string, keyof typeof AppointmentStatusEnum> = {
    "NO ASISTIO": "NO_ASISTIO",
    "PROGRAMADA": "PROGRAMADA",
    "CONFIRMADA": "CONFIRMADA",
    "CANCELADA": "CANCELADA",
    "COMPLETADA": "COMPLETADA",
    "PRESENTE": "PRESENTE",
    "REAGENDADA": "REAGENDADA"
  }
  
  return statusMap[status] || "PROGRAMADA"
};

// Generar iniciales optimizado
const getInitials = (nombre = "", apellidos = "") => {
  const n = (nombre || "").charAt(0)
  const a = (apellidos || "").charAt(0)
  return `${n}${a}`.toUpperCase() || "SN"
}

// Formateo de tiempo optimizado con cache
const timeFormatCache = new Map<string, string>();

const formatTime = (dateString: string) => {
  if (!dateString) return "---"
  
  const cached = timeFormatCache.get(dateString);
  if (cached) return cached;
  
  try {
    const date = new Date(dateString)
    const formatted = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Limpiar cache si es muy grande
    if (timeFormatCache.size > 100) {
      timeFormatCache.clear();
    }
    
    timeFormatCache.set(dateString, formatted);
    return formatted;
  } catch {
    return "---"
  }
}

// Formateo de fecha relativa optimizado
const dateFormatCache = new Map<string, string>();

const formatDate = (dateString: string) => {
  if (!dateString) return "---"
  
  const cached = dateFormatCache.get(dateString);
  if (cached) return cached;
  
  try {
    const date = new Date(dateString)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    
    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    let formatted: string;
    if (diffDays === 0) formatted = "Hoy";
    else if (diffDays === 1) formatted = "Mañana";
    else {
      formatted = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
    }
    
    // Limpiar cache si es muy grande
    if (dateFormatCache.size > 100) {
      dateFormatCache.clear();
    }
    
    dateFormatCache.set(dateString, formatted);
    return formatted;
  } catch {
    return "---"
  }
}

// ==================== TIPOS ====================
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule"

interface AppointmentCardProps {
  appointment: ExtendedAppointment | any; // Flexibilidad para diferentes tipos
  onAction: (action: ConfirmAction, appointment: any) => void
  onStartSurvey: () => void
  onViewHistory: (patientId: string) => void
  disableActions?: boolean
  surveyCompleted?: boolean
}

// ==================== CONFIGURACIONES ESTÁTICAS ====================

const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    dot: "bg-slate-400",
    primary: "checkIn" as const,
    primaryLabel: "Check In",
    variant: "secondary" as const,
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    dot: "bg-blue-500",
    primary: "checkIn" as const,
    primaryLabel: "Check In",
    variant: "default" as const,
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En Consulta",
    dot: "bg-emerald-500",
    primary: "complete" as const,
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
])

const MENU_ITEMS_CONFIG = {
  PROGRAMADA: [
    { icon: LogIn, label: "Check In", action: "checkIn" as const },
    { icon: XCircle, label: "Cancelar", action: "cancel" as const, destructive: true }
  ],
  CONFIRMADA: [
    { icon: LogIn, label: "Check In", action: "checkIn" as const },
    { icon: XCircle, label: "Cancelar", action: "cancel" as const, destructive: true },
    { icon: Repeat, label: "Reagendar", action: "reschedule" as const }
  ],
  PRESENTE: [
    { icon: ListChecks, label: "Completar", action: "complete" as const },
    { icon: CalendarX, label: "No Asistió", action: "noShow" as const, destructive: true }
  ]
} as const;

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

const PatientAvatar = memo<{ initials: string }>(({ initials }) => (
  <div className={cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
    "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700",
    "text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600",
    "transition-all duration-200 hover:scale-105"
  )}>
    {initials}
  </div>
));

const PatientInfo = memo<{
  fullName: string;
  formattedTime: string;
  formattedDate: string;
  statusDot: string;
}>(({ fullName, formattedTime, formattedDate, statusDot }) => (
  <div className="min-w-0 flex-1">
    <div className="mb-1 flex items-center gap-2">
      <h3 className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">
        {fullName}
      </h3>
      <div className={cn("h-2 w-2 shrink-0 rounded-full transition-all duration-200", statusDot)} />
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
));

const ActionMenu = memo<{
  menuItems: readonly any[];
  appointment: any;
  onAction: (action: ConfirmAction, appointment: any) => void;
  onStartSurvey: () => void;
  onViewHistory: (patientId: string) => void;
  patientId?: string;
}>(({ menuItems, appointment, onAction, onStartSurvey, onViewHistory, patientId }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300",
          "opacity-100 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800",
          "transition-all duration-200"
        )}
      >
        <MoreHorizontal size={16} />
      </Button>
    </DropdownMenuTrigger>

    <DropdownMenuContent align="end" className="w-48">
      {menuItems.map(({ icon: Icon, label, action, destructive = false }) => (
        <DropdownMenuItem
          key={label}
          onClick={() => onAction(action, appointment)}
          className={cn(
            "gap-2 transition-colors duration-200",
            destructive ? "text-red-600 focus:text-red-600 dark:text-red-400" : "",
          )}
        >
          <Icon size={14} /> {label}
        </DropdownMenuItem>
      ))}

      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={onStartSurvey} 
        className="gap-2 transition-colors duration-200"
      >
        <MessageSquare size={14} /> Encuesta
      </DropdownMenuItem>

      {patientId && (
        <DropdownMenuItem 
          onClick={() => onViewHistory(patientId)} 
          className="gap-2 transition-colors duration-200"
        >
          <History size={14} /> Historial
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
));

const PatientDetails = memo<{
  appointment: any;
  telefono?: string;
  statusConfig: any;
}>(({ appointment, telefono, statusConfig }) => (
  <>
    {/* Estado + Teléfono */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <Badge
        variant={statusConfig.variant as "default" | "secondary" | "destructive" | "outline"}
        className="self-start px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
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

    {/* Información adicional */}
    <div className="mt-2 space-y-2">
      {/* Edad */}
      {appointment.paciente?.edad && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-200">Edad:</span> {appointment.paciente.edad} años
        </p>
      )}
      
      {/* Fecha completa */}
      <p className="text-xs text-slate-600 dark:text-slate-300">
        <span className="font-medium text-slate-700 dark:text-slate-200">Fecha:</span> {new Date(appointment.fecha_hora_cita || appointment.fechaConsulta).toLocaleDateString('es-ES', {
          weekday: 'long',
          day: 'numeric', 
          month: 'long'
        })}
      </p>

      {/* Motivo Consulta */}
      {appointment.motivo_cita && appointment.motivo_cita !== "N/A" && (
        <div className="pt-1">
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
            <span className="font-medium text-slate-700 dark:text-slate-200">Motivo:</span> {appointment.motivo_cita}
          </p>
        </div>
      )}
      
      {/* Indicadores de diagnóstico */}
      {appointment.motivo_cita && (
        <div className="pt-1 flex flex-wrap gap-1">
          {appointment.motivo_cita.includes("HERNIA") && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 text-[10px] px-1.5 py-0.5">
              <span className="mr-1">🔸</span> Hernia
            </Badge>
          )}
          {appointment.motivo_cita.includes("VESICULA") && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700 text-[10px] px-1.5 py-0.5">
              <span className="mr-1">🟡</span> Vesícula
            </Badge>
          )}
        </div>
      )}
    </div>
  </>
));

const SurveyAlert = memo<{
  onStartSurvey: () => void;
}>(({ onStartSurvey }) => (
  <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800/50 dark:bg-amber-900/20 transition-all duration-200 hover:shadow-sm">
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
        Encuesta requerida
      </span>
    </div>
    <Button
      size="sm"
      variant="ghost"
      className="h-auto shrink-0 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-800/60 transition-all duration-200"
      onClick={onStartSurvey}
    >
      Iniciar
    </Button>
  </div>
));

const ActionButton = memo<{
  onAction: () => void;
  needsSurvey: boolean;
  statusConfig: any;
  disabled: boolean;
}>(({ onAction, needsSurvey, statusConfig, disabled }) => (
  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
    <Button
      onClick={onAction}
      className="w-full font-medium transition-all duration-200 hover:scale-[1.02]"
      variant={needsSurvey ? "outline" : "default"}
      size="sm"
      disabled={disabled}
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
));

// ==================== COMPONENTE PRINCIPAL ====================

export const AppointmentCard = memo<AppointmentCardProps>(({
  appointment,
  onAction,
  onStartSurvey,
  onViewHistory,
  disableActions = false,
  surveyCompleted = false,
}) => {
  // Extraer datos con compatibilidad para diferentes estructuras
  const appointmentData = useMemo(() => {
    const id = appointment.id;
    const patientId = appointment.patient_id || appointment.patientId;
    const paciente = appointment.paciente;
    const fechaHoraCita = appointment.fecha_hora_cita || appointment.fechaConsulta;
    const motivoCita = appointment.motivo_cita || appointment.motivoConsulta;
    const estadoCita = appointment.estado_cita || appointment.estado;

    return {
      id,
      patientId,
      paciente,
      fechaHoraCita,
      motivoCita,
      estadoCita
    };
  }, [appointment]);

  // Cálculos memoizados
  const computedValues = useMemo(() => {
    const fullName = `${appointmentData.paciente?.nombre || ''} ${appointmentData.paciente?.apellidos || ''}`.trim();
    const telefono = appointmentData.paciente?.telefono;
    const normalizedStatus = normalizeAppointmentStatus(appointmentData.estadoCita);
    const statusConfig = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
    const isActionable = ACTIONABLE_STATUSES.has(normalizedStatus);
    const needsSurvey = normalizedStatus === AppointmentStatusEnum.PRESENTE && !surveyCompleted;
    const formattedDate = formatDate(appointmentData.fechaHoraCita);
    const formattedTime = formatTime(appointmentData.fechaHoraCita);
    const initials = getInitials(appointmentData.paciente?.nombre, appointmentData.paciente?.apellidos);
    const menuItems = MENU_ITEMS_CONFIG[normalizedStatus] || [];

    return {
      fullName,
      telefono,
      normalizedStatus,
      statusConfig,
      isActionable,
      needsSurvey,
      formattedDate,
      formattedTime,
      initials,
      menuItems
    };
  }, [appointmentData, surveyCompleted]);

  // Handlers memoizados
  const handlePrimaryAction = useCallback(() => {
    if (!computedValues.statusConfig.primary) return;

    if (computedValues.needsSurvey && computedValues.statusConfig.primary === "complete") {
      onStartSurvey();
      return;
    }
    onAction(computedValues.statusConfig.primary, appointment);
  }, [computedValues.needsSurvey, computedValues.statusConfig.primary, onStartSurvey, onAction, appointment]);

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      "hover:shadow-md border-0 shadow-sm bg-white dark:bg-slate-900",
      "dark:border dark:border-slate-700 flex flex-col h-full",
      "hover:scale-[1.01] active:scale-[0.99]"
    )}>
      <CardContent className="p-4 flex flex-col flex-grow">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <PatientAvatar initials={computedValues.initials} />
            <PatientInfo 
              fullName={computedValues.fullName}
              formattedTime={computedValues.formattedTime}
              formattedDate={computedValues.formattedDate}
              statusDot={computedValues.statusConfig.dot}
            />
          </div>

          <ActionMenu
            menuItems={computedValues.menuItems}
            appointment={appointment}
            onAction={onAction}
            onStartSurvey={onStartSurvey}
            onViewHistory={onViewHistory}
            patientId={appointmentData.patientId}
          />
        </div>

        {/* Body */}
        <div className="space-y-3 pt-2 flex-grow">
          <PatientDetails 
            appointment={appointment}
            telefono={computedValues.telefono}
            statusConfig={computedValues.statusConfig}
          />

          {/* Alerta encuesta */}
          {computedValues.needsSurvey && (
            <SurveyAlert onStartSurvey={onStartSurvey} />
          )}
        </div>

        {/* Footer / Actions */}
        {computedValues.isActionable && computedValues.statusConfig.primary && (
          <ActionButton
            onAction={handlePrimaryAction}
            needsSurvey={computedValues.needsSurvey}
            statusConfig={computedValues.statusConfig}
            disabled={disableActions}
          />
        )}
      </CardContent>
    </Card>
  );
});

AppointmentCard.displayName = "AppointmentCard";