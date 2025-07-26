// components/patient-admision/patient-card-optimized.tsx

import React, { memo, useMemo, useCallback } from "react";
import { format, isValid, parseISO, isToday, isFuture, isPast } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Calendar,
  User,
  Phone,
  Mail,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  History,
  PlayCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointmentActions } from "@/hooks/use-admission-data";

// ==================== TIPOS ====================
// Interfaces para tipar los datos, sin cambios.
interface PatientData {
  id: string;
  nombre?: string;
  apellidos?: string;
  telefono?:string;
  email?: string;
  edad?: number;
}

interface AppointmentData {
  id: string;
  fecha_hora_cita: string; // ISO string
  motivo_cita: string;
  estado_cita: string;
  es_primera_vez?: boolean | null;
  notas_cita_seguimiento?: string | null;
  patients?: PatientData;
  profiles?: {
    full_name?: string;
  };
}

interface PatientCardProps {
  appointment: AppointmentData;
  onAction?: (action: string, appointmentId: string) => void;
  disableActions?: boolean;
  className?: string;
}

type AppointmentAction =
  | 'checkIn'
  | 'startConsult'
  | 'complete'
  | 'cancel'
  | 'noShow'
  | 'reschedule'
  | 'viewHistory';

// ==================== CONFIGURACIÓN DE ESTADOS ====================
// Se ha mejorado la configuración para soportar modo claro y oscuro.
// Las clases ahora usan variables CSS de Tailwind para colores de texto, fondo y borde.
const STATUS_CONFIG = {
  'PROGRAMADA': {
    label: 'Programada',
    colorName: 'blue',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-500/20',
    icon: Calendar,
  },
  'CONFIRMADA': {
    label: 'Confirmada',
    colorName: 'green',
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-500/20',
    icon: CheckCircle,
  },
  'PRESENTE': {
    label: 'Presente',
    colorName: 'emerald',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20',
    icon: CheckCircle,
  },
  'EN_CONSULTA': {
    label: 'En Consulta',
    colorName: 'purple',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-500/20',
    icon: Clock,
  },
  'COMPLETADA': {
    label: 'Completada',
    colorName: 'zinc',
    className: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-400 border-zinc-200 dark:border-zinc-500/20',
    icon: CheckCircle,
  },
  'CANCELADA': {
    label: 'Cancelada',
    colorName: 'red',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-500/20',
    icon: XCircle,
  },
  'NO_ASISTIO': {
    label: 'No Asistió',
    colorName: 'orange',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-500/20',
    icon: AlertTriangle,
  },
  'REAGENDADA': {
    label: 'Reagendada',
    colorName: 'yellow',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-500/20',
    icon: Calendar,
  },
} as const;


// ==================== HELPER FUNCTIONS ====================
// Se mantienen las funciones auxiliares ya que son eficientes y claras.
const getPatientData = (appointment: AppointmentData): PatientData | null => {
  return appointment.patients ?? null;
};

const formatAppointmentDateTime = (dateTimeString: string) => {
  try {
    if (!dateTimeString) throw new Error("Date string is empty");

    const parsedDate = parseISO(dateTimeString);
    if (!isValid(parsedDate)) throw new Error("Invalid date format");

    return {
      date: format(parsedDate, "EEEE, d 'de' MMMM", { locale: es }),
      time: format(parsedDate, "HH:mm"),
      isValid: true,
      isToday: isToday(parsedDate),
      isPast: !isToday(parsedDate) && isPast(parsedDate),
      isFuture: !isToday(parsedDate) && isFuture(parsedDate),
    };
  } catch (error) {
    console.warn('⚠️ [PatientCard] Date formatting error:', (error as Error).message, 'Input:', dateTimeString);
    return { date: 'Fecha inválida', time: '', isValid: false, isToday: false, isPast: false, isFuture: false };
  }
};

const getStatusConfig = (status: string) => {
  return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PROGRAMADA;
};

const canPerformAction = (status: string, action: AppointmentAction): boolean => {
  switch (action) {
    case 'checkIn':
      return ['PROGRAMADA', 'CONFIRMADA'].includes(status);
    case 'startConsult':
      return status === 'PRESENTE';
    case 'complete':
      return ['EN_CONSULTA', 'PRESENTE'].includes(status);
    case 'cancel':
    case 'reschedule':
      return ['PROGRAMADA', 'CONFIRMADA'].includes(status);
    case 'viewHistory':
      return true;
    default:
      return false;
  }
};


// ==================== COMPONENTE PRINCIPAL ====================
export const PatientCard: React.FC<PatientCardProps> = memo(({
  appointment,
  onAction,
  disableActions = false,
  className,
}) => {
  const { isPending } = useAppointmentActions();
  const patientData = useMemo(() => getPatientData(appointment), [appointment]);

  const computedValues = useMemo(() => {
    const status = appointment.estado_cita;
    const statusConfig = getStatusConfig(status);
    const dateTime = formatAppointmentDateTime(appointment.fecha_hora_cita);

    if (!patientData) {
      return {
        fullName: 'Paciente no encontrado',
        initials: '??',
        statusConfig,
        dateTime,
        availableActions: [],
        primaryAction: null,
        isValid: false,
      };
    }

    const allActions: AppointmentAction[] = ['checkIn', 'startConsult', 'complete', 'cancel', 'reschedule', 'viewHistory'];
    const availableActions = allActions.filter(action => canPerformAction(status, action));

    let primaryAction: AppointmentAction | null = null;
    if (availableActions.includes('checkIn')) primaryAction = 'checkIn';
    else if (availableActions.includes('startConsult')) primaryAction = 'startConsult';
    else if (availableActions.includes('complete')) primaryAction = 'complete';

    return {
      fullName: `${patientData.nombre || ''} ${patientData.apellidos || ''}`.trim() || 'Sin nombre',
      initials: `${(patientData.nombre || ' ')[0]}${(patientData.apellidos || ' ')[0]}`.toUpperCase(),
      statusConfig,
      dateTime,
      availableActions,
      primaryAction,
      isValid: true,
    };
  }, [appointment, patientData]);

  const handleAction = useCallback((action: AppointmentAction) => {
    if (onAction && !disableActions && !isPending) {
      onAction(action, appointment.id);
    }
  }, [onAction, disableActions, isPending, appointment.id]);

  if (!computedValues.isValid) {
    return (
      <Card className={cn("p-4 border-dashed border-destructive/50 bg-destructive/10", className)}>
        <div className="flex items-center justify-center text-destructive-foreground">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Datos del paciente no disponibles
        </div>
      </Card>
    );
  }

  const { fullName, initials, statusConfig, dateTime, availableActions, primaryAction } = computedValues;
  const StatusIcon = statusConfig.icon;

  const actionConfig: Record<AppointmentAction, { icon: React.ElementType, label: string }> = {
    checkIn: { icon: CheckCircle, label: 'Marcar Presente' },
    startConsult: { icon: PlayCircle, label: 'Iniciar Consulta' },
    complete: { icon: CheckCircle, label: 'Completar Cita' },
    cancel: { icon: XCircle, label: 'Cancelar Cita' },
    reschedule: { icon: Calendar, label: 'Reagendar Cita' },
    viewHistory: { icon: History, label: 'Ver Historial' },
    noShow: { icon: AlertTriangle, label: 'Marcar como Ausente' },
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-lg dark:hover:shadow-primary/10 border-l-4",
      `border-l-${statusConfig.colorName}-500 dark:border-l-${statusConfig.colorName}-400`,
      "bg-card text-card-foreground", // Soporte para tema claro/oscuro
      dateTime.isToday && "ring-2 ring-blue-500/50 dark:ring-blue-400/30",
      className
    )}>
      <CardContent className="p-4 grid gap-4">
        {/* ========= HEADER: Paciente y Estado ========= */}
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 text-lg">
              <AvatarFallback className={cn(
                "font-medium",
                `bg-${statusConfig.colorName}-500 text-white dark:bg-${statusConfig.colorName}-400 dark:text-${statusConfig.colorName}-950`
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-bold text-lg text-foreground">{fullName}</h3>
              <div className="flex items-center gap-2 mt-1">
                {appointment.es_primera_vez && (
                  <Badge variant="outline" className="text-xs border-primary/50 text-primary">Primera vez</Badge>
                )}
                {patientData?.edad && (
                  <span className="text-xs text-muted-foreground">{patientData.edad} años</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge className={cn("text-xs font-medium", statusConfig.className)}>
              <StatusIcon className="h-3 w-3 mr-1.5" />
              {statusConfig.label}
            </Badge>
            {!disableActions && availableActions.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {availableActions.map((action) => {
                    if (action === primaryAction) return null;
                    const { icon: ActionIcon, label } = actionConfig[action];
                    return (
                      <DropdownMenuItem key={action} onClick={() => handleAction(action)} className="cursor-pointer">
                        <ActionIcon className="h-4 w-4 mr-2" />
                        {label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* ========= BODY: Detalles de la Cita ========= */}
        <div className="grid gap-3 text-sm">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg border",
            dateTime.isToday && "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
            dateTime.isPast && "bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800",
            dateTime.isFuture && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
            !dateTime.isValid && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
          )}>
            <Calendar className={cn(
              "h-5 w-5",
              dateTime.isToday && "text-blue-600 dark:text-blue-400",
              dateTime.isPast && "text-zinc-500 dark:text-zinc-400",
              dateTime.isFuture && "text-green-600 dark:text-green-400",
              !dateTime.isValid && "text-red-600 dark:text-red-400"
            )} />
            <div className="flex-1">
              <span className={cn(
                "font-semibold",
                dateTime.isToday && "text-blue-900 dark:text-blue-200",
                dateTime.isPast && "text-zinc-700 dark:text-zinc-300",
                dateTime.isFuture && "text-green-900 dark:text-green-200",
                !dateTime.isValid && "text-red-800 dark:text-red-200"
              )}>
                {dateTime.date}
              </span>
              {dateTime.time && (
                <span className="ml-2 font-bold text-muted-foreground">a las {dateTime.time}</span>
              )}
            </div>
            {dateTime.isToday && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">Hoy</Badge>
            )}
          </div>

          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <p className="text-foreground leading-relaxed">{appointment.motivo_cita || 'Sin motivo especificado'}</p>
          </div>

          {appointment.profiles?.full_name && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Dr. {appointment.profiles.full_name}</span>
            </div>
          )}

          {appointment.notas_cita_seguimiento && (
            <div className="flex items-start gap-3 p-2 bg-amber-50 dark:bg-amber-950 rounded-md border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-300 italic">{appointment.notas_cita_seguimiento}</p>
            </div>
          )}
        </div>

        {/* ========= FOOTER: Acciones ========= */}
        {!disableActions && availableActions.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            {primaryAction && (
              <Button
                size="sm"
                onClick={() => handleAction(primaryAction)}
                disabled={isPending}
                className="flex-1"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  React.createElement(actionConfig[primaryAction].icon, { className: "h-4 w-4 mr-2" })
                )}
                {actionConfig[primaryAction].label}
              </Button>
            )}
            {availableActions.includes('cancel') && primaryAction !== 'cancel' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('cancel')}
                disabled={isPending}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 border-red-300 hover:border-red-400 dark:border-red-500/50 dark:hover:border-red-500"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

PatientCard.displayName = "PatientCard";

export default PatientCard;
