// components/patient-admission/patient-card.tsx
import React, { memo, useMemo, useCallback, useState } from "react";
import dynamic from 'next/dynamic';
import { format, isValid, parseISO } from 'date-fns';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  AlertTriangle,
  Loader2,
  CalendarDays,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Types e imports
import type { AppointmentWithPatient, AdmissionAction, PatientCardProps } from './admision-types';
import { getPatientFullName, getStatusConfig, getPatientData } from './admision-types';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { canCheckIn, canCompleteAppointment, canCancelAppointment, canMarkNoShow, canRescheduleAppointment } from '@/lib/admission-business-rules';

// Componentes dinámicos
const RescheduleDatePicker = dynamic(() => import('./patient-admission-reschedule').then(m => m.RescheduleDatePicker), { ssr: false });
const PatientHistoryModal = dynamic(() => import('./patient-history-modal'), { ssr: false });

// Tipado para variantes de acción
type ActionVariant = 'default' | 'destructive';
type ConfirmationState = {
  isOpen: boolean;
  action: AdmissionAction | null;
  title: string;
  description: string;
  confirmText: string;
  variant: ActionVariant;
};

// Configuración de acciones
const ACTION_CONFIG: Record<AdmissionAction, {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  confirmText: string;
  variant: ActionVariant;
}> = {
  checkIn: { icon: CheckCircle, label: 'Presente', title: 'Marcar como Presente', description: 'El paciente será marcado como presente.', confirmText: 'Marcar Presente', variant: 'default' },
  complete: { icon: CheckCircle, label: 'Completar', title: 'Completar Consulta', description: 'La consulta será marcada como completada.', confirmText: 'Completar', variant: 'default' },
  cancel: { icon: XCircle, label: 'Cancelar', title: 'Cancelar Cita', description: 'Esta acción cancelará la cita médica.', confirmText: 'Cancelar Cita', variant: 'destructive' },
  noShow: { icon: AlertTriangle, label: 'No Asistió', title: 'Marcar como No Asistió', description: 'El paciente será marcado como no asistió.', confirmText: 'Marcar No Asistió', variant: 'destructive' },
  reschedule: { icon: Calendar, label: 'Reagendar', title: 'Reagendar Cita', description: 'Se abrirá el diálogo para reagendar esta cita.', confirmText: 'Reagendar', variant: 'default' },
  viewHistory: { icon: History, label: 'Historial', title: 'Ver Historial', description: 'Ver el historial completo del paciente.', confirmText: 'Ver Historial', variant: 'default' },
};

// Componente principal
export const PatientCard = memo<PatientCardProps>(({ 
  appointment, 
  onAction, 
  disableActions = false, 
  className 
}) => {
  // Hooks y estados
  const { mutateAsync: updateStatus, isPending: isLoading } = useUpdateAppointmentStatus();

  const checkIn = useCallback((appointmentId: string, notas?: string) => {
    return updateStatus({ appointmentId, newStatus: 'PRESENTE', motivo: 'Paciente marcado como presente' });
  }, [updateStatus]);

  const complete = useCallback((appointmentId: string, notas?: string) => {
    return updateStatus({ appointmentId, newStatus: 'COMPLETADA', motivo: 'Consulta finalizada' });
  }, [updateStatus]);

  const cancel = useCallback((appointmentId: string, motivo?: string) => {
    return updateStatus({ appointmentId, newStatus: 'CANCELADA', motivo: motivo || 'Cita cancelada' });
  }, [updateStatus]);

  const markNoShow = useCallback((appointmentId: string) => {
    return updateStatus({ appointmentId, newStatus: 'NO_ASISTIO', motivo: 'Paciente no asistió' });
  }, [updateStatus]);

  const reschedule = useCallback((appointmentId: string, newDateTime: string, motivo?: string) => {
    return updateStatus({ appointmentId, newStatus: 'REAGENDADA', nuevaFechaHora: newDateTime, motivo: motivo || 'Cita reagendada por usuario' });
  }, [updateStatus]);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    action: null,
    title: '',
    description: '',
    confirmText: '',
    variant: 'default',
  });
  const [showReschedule, setShowReschedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Datos computados
  const patientData = getPatientData(appointment);
  const statusConfig = useMemo(() => getStatusConfig(appointment.estado_cita), [appointment.estado_cita]);
  const fullName = useMemo(() => getPatientFullName(patientData), [patientData]);
  const initials = useMemo(() => {
    if (!patientData?.nombre && !patientData?.apellidos) return 'P';
    return `${patientData?.nombre?.[0] || ''}${patientData?.apellidos?.[0] || ''}`.toUpperCase();
  }, [patientData]);

  const dateTime = useMemo(() => {
    try {
      const date = parseISO(appointment.fecha_hora_cita);
      if (!isValid(date)) return { date: 'Fecha inválida', time: '', isToday: false };
      return {
        date: format(date, "dd 'de' MMMM", { locale: es }),
        time: format(date, 'HH:mm'),
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
      };
    } catch {
      return { date: 'Fecha inválida', time: '', isToday: false };
    }
  }, [appointment.fecha_hora_cita]);

  // Validaciones de acciones
  const canPerformAction = useCallback((action: AdmissionAction) => {
    switch (action) {
      case 'checkIn': return canCheckIn(appointment);
      case 'complete': return canCompleteAppointment(appointment);
      case 'cancel': return canCancelAppointment(appointment);
      case 'noShow': return canMarkNoShow(appointment);
      case 'reschedule': return canRescheduleAppointment(appointment);
      case 'viewHistory': return { valid: true };
      default: return { valid: false };
    }
  }, [appointment]);

  // Acciones disponibles
  const availableActions = useMemo(() => {
    const actions: AdmissionAction[] = [];
    ['checkIn', 'complete', 'cancel', 'noShow', 'reschedule'].forEach(action => {
      if (canPerformAction(action as AdmissionAction).valid) actions.push(action as AdmissionAction);
    });
    actions.push('viewHistory');
    return actions;
  }, [canPerformAction]);

  // Acción principal
  const primaryAction = useMemo((): AdmissionAction | null => {
    if (availableActions.includes('checkIn')) return 'checkIn';
    if (availableActions.includes('complete')) return 'complete';
    return null;
  }, [availableActions]);

  // Handlers
  const handleActionClick = useCallback((action: AdmissionAction) => {
    if (disableActions) return;
    
    if (action === 'reschedule') return setShowReschedule(true);
    if (action === 'viewHistory') return setShowHistory(true);

    const config = ACTION_CONFIG[action];
    setConfirmation({
      isOpen: true,
      action,
      title: config.title,
      description: config.description,
      confirmText: config.confirmText,
      variant: config.variant,
    });
  }, [disableActions]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmation.action) return;

    try {
      switch (confirmation.action) {
        case 'checkIn': await checkIn(appointment.id); break;
        case 'complete': await complete(appointment.id); break;
        case 'cancel': await cancel(appointment.id, 'Cancelado por usuario'); break;
        case 'noShow': await markNoShow(appointment.id); break;
      }
      onAction?.(confirmation.action, appointment.id);
    } finally {
      setConfirmation(prev => ({ ...prev, isOpen: false }));
    }
  }, [confirmation.action, appointment.id, checkIn, complete, cancel, markNoShow, onAction]);

  const handleReschedule = useCallback(async (date: Date, time: string) => {
    const nuevaFecha = `${date.toISOString().split('T')[0]}T${time}:00`;
    await reschedule(appointment.id, nuevaFecha, 'Reagendado por usuario');
    setShowReschedule(false);
    onAction?.('reschedule', appointment.id);
  }, [appointment.id, reschedule, onAction]);

  return (
    <>
      <Card className={cn(
        "border-l-4 hover:shadow-md transition-shadow",
        statusConfig.borderClass,
        dateTime.isToday && "ring-2 ring-blue-500/20",
        className
      )}>
        <CardContent className="p-4">
          {/* Header: Paciente y estado */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className={cn("h-12 w-12 ring-2 ring-offset-2", statusConfig.ringClass)}>
                  <AvatarFallback className={cn("font-medium text-white", statusConfig.bgClass)}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {dateTime.isToday && (
                  <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-background">
                    <CalendarDays className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-base">{fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {appointment.es_primera_vez && (
                    <Badge variant="secondary" className="text-xs">Primera vez</Badge>
                  )}
                  {patientData?.edad && (
                    <span className="text-xs text-muted-foreground">{patientData.edad} años</span>
                  )}
                </div>
              </div>
            </div>
            <Badge className={cn("text-xs font-medium whitespace-nowrap", statusConfig.bgClass, statusConfig.textClass)}>
              {statusConfig.label}
            </Badge>
          </div>

          {/* Detalles de la cita */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{dateTime.date} a las {dateTime.time}</span>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                {Array.isArray(appointment.motivos_consulta) 
                  ? appointment.motivos_consulta.join(', ') 
                  : "Sin motivos"}
              </span>
            </div>
            {patientData?.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{patientData.telefono}</span>
              </div>
            )}
            {patientData?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate text-xs">{patientData.email}</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2 pt-3 border-t">
            {primaryAction && !disableActions && (
              <Button
                onClick={() => handleActionClick(primaryAction)}
                disabled={isLoading}
                className="flex-1 h-8 text-sm"
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  React.createElement(ACTION_CONFIG[primaryAction].icon, { className: "h-4 w-4 mr-2" })
                )}
                {ACTION_CONFIG[primaryAction].label}
              </Button>
            )}

            {availableActions.length > 1 && !disableActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={isLoading}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {availableActions
                    .filter(action => action !== primaryAction)
                    .map((action) => {
                      const config = ACTION_CONFIG[action];
                      return (
                        <DropdownMenuItem
                          key={action}
                          onClick={() => handleActionClick(action)}
                          disabled={isLoading}
                          className="flex items-center gap-2 py-1.5"
                        >
                          <config.icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de confirmación */}
      <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => setConfirmation(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmation.action && React.createElement(ACTION_CONFIG[confirmation.action].icon, { className: "h-5 w-5" })}
              {confirmation.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="font-medium">{fullName}</p>
              <p className="mt-1">{confirmation.description}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isLoading}
              className={confirmation.variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                confirmation.confirmText
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de reagendar */}
      {showReschedule && (
        <RescheduleDatePicker
          appointment={appointment}
          onClose={() => setShowReschedule(false)}
          onReschedule={handleReschedule}
        />
      )}

      {/* Modal de historial */}
      {showHistory && (
        <PatientHistoryModal
          patientId={appointment.patient_id}
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
        />
      )}
    </>
  );
});

PatientCard.displayName = "PatientCard";
export default PatientCard;