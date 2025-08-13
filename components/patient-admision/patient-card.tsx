// components/patient-admission/patient-card.tsx (VERSIÓN CORREGIDA)
import React, { memo, useMemo, useCallback, useState, useRef } from "react";
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
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Types e imports
import type { AppointmentWithPatient, AdmissionAction, PatientCardProps } from './admision-types';
import { getPatientFullName, getStatusConfig, getPatientData } from './admision-types';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { canCheckIn, canCompleteAppointment, canCancelAppointment, canMarkNoShow, canRescheduleAppointment } from '@/lib/admission-business-rules';

// Lazy loading de modales pesados
const RescheduleDatePicker = dynamic(
  () => import('./patient-admission-reschedule').then(m => m.RescheduleDatePicker),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }
);

const PatientHistoryModal = dynamic(
  () => import('./patient-history-modal'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }
);

const ACTION_CONFIG: Record<AdmissionAction, {
  icon: LucideIcon;
  label: string;
  title: string;
  description: string;
  confirmText: string;
  variant: 'default' | 'destructive';
  color: string;
}> = {
  checkIn: { icon: CheckCircle, label: 'Presente', title: 'Marcar como Presente', description: 'El paciente será marcado como presente en la clínica.', confirmText: 'Confirmar Llegada', variant: 'default', color: 'text-emerald-600 dark:text-emerald-400' },
  complete: { icon: CheckCircle, label: 'Completar', title: 'Completar Consulta', description: 'La consulta médica será marcada como completada.', confirmText: 'Completar Consulta', variant: 'default', color: 'text-green-600 dark:text-green-400' },
  cancel: { icon: XCircle, label: 'Cancelar', title: 'Cancelar Cita', description: 'Esta acción cancelará la cita médica. El paciente será notificado.', confirmText: 'Cancelar Cita', variant: 'destructive', color: 'text-red-600 dark:text-red-400' },
  noShow: { icon: AlertTriangle, label: 'No Asistió', title: 'Marcar como No Asistió', description: 'El paciente será marcado como ausente a su cita.', confirmText: 'Marcar Ausencia', variant: 'destructive', color: 'text-orange-600 dark:text-orange-400' },
  reschedule: { icon: Calendar, label: 'Reagendar', title: 'Reagendar Cita', description: 'Seleccionar una nueva fecha y hora para esta cita.', confirmText: 'Reagendar', variant: 'default', color: 'text-blue-600 dark:text-blue-400' },
  viewHistory: { icon: History, label: 'Historial', title: 'Ver Historial', description: 'Ver el historial completo del paciente.', confirmText: 'Ver Historial', variant: 'default', color: 'text-purple-600 dark:text-purple-400' },
};

export const PatientCard = memo<PatientCardProps>(({ 
  appointment, 
  onAction, 
  disableActions = false, 
  className 
}) => {
  const { mutateAsync: updateStatus, isPending: isLoading } = useUpdateAppointmentStatus();
  
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    action: AdmissionAction | null;
  }>({ isOpen: false, action: null });
  const [showReschedule, setShowReschedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const processingRef = useRef(false);

  const patientData = useMemo(() => getPatientData(appointment), [appointment]);
  const statusConfig = useMemo(() => getStatusConfig(appointment.estado_cita), [appointment.estado_cita]);
  const fullName = useMemo(() => getPatientFullName(patientData), [patientData]);
  
  const initials = useMemo(() => {
    const n = patientData?.nombre?.[0] || '';
    const a = patientData?.apellidos?.[0] || '';
    return (n + a).toUpperCase() || 'P';
  }, [patientData?.nombre, patientData?.apellidos]);

  const dateTime = useMemo(() => {
    try {
      const date = parseISO(appointment.fecha_hora_cita);
      if (!isValid(date)) return null;
      
      const now = new Date();
      const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
      const isPast = date < now;
      
      return {
        date: format(date, "d MMM", { locale: es }),
        time: format(date, 'HH:mm'),
        fullDate: format(date, "EEEE d 'de' MMMM", { locale: es }),
        isToday,
        isPast,
        isNear: !isPast && (date.getTime() - now.getTime()) < 3600000,
      };
    } catch {
      return null;
    }
  }, [appointment.fecha_hora_cita]);

  const updateAppointmentStatus = useCallback(async (
    action: AdmissionAction, 
    additionalData?: any
  ) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    try {
      const statusMap = {
        checkIn: 'PRESENTE',
        complete: 'COMPLETADA',
        cancel: 'CANCELADA',
        noShow: 'NO_ASISTIO',
        reschedule: 'REAGENDADA'
      } as const;
      
      await updateStatus({
        appointmentId: appointment.id,
        newStatus: statusMap[action as keyof typeof statusMap],
        motivo: ACTION_CONFIG[action].description,
        ...additionalData
      });
      
      onAction?.(action, appointment.id);
    } finally {
      processingRef.current = false;
    }
  }, [appointment.id, updateStatus, onAction]);

  const availableActions = useMemo(() => {
    const actions: AdmissionAction[] = [];
    const validators = {
      checkIn: () => canCheckIn(appointment),
      complete: () => canCompleteAppointment(appointment),
      cancel: () => canCancelAppointment(appointment),
      noShow: () => canMarkNoShow(appointment),
      reschedule: () => canRescheduleAppointment(appointment),
    };
    
    Object.entries(validators).forEach(([action, validator]) => {
      if (validator().valid) {
        actions.push(action as AdmissionAction);
      }
    });
    
    actions.push('viewHistory');
    return actions;
  }, [appointment]);

  const primaryAction = useMemo(() => 
    availableActions.find(a => a === 'checkIn' || a === 'complete') || null,
    [availableActions]
  );

  const secondaryActions = useMemo(() => 
    availableActions.filter(a => a !== primaryAction),
    [availableActions, primaryAction]
  );

  const handleActionClick = useCallback((action: AdmissionAction) => {
    if (disableActions || processingRef.current) return;
    
    if (action === 'reschedule') {
      setShowReschedule(true);
      return;
    }
    if (action === 'viewHistory') {
      setShowHistory(true);
      return;
    }
    
    setConfirmation({ isOpen: true, action });
  }, [disableActions]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmation.action) return;
    
    try {
      await updateAppointmentStatus(confirmation.action);
    } finally {
      setConfirmation({ isOpen: false, action: null });
    }
  }, [confirmation.action, updateAppointmentStatus]);

  const handleReschedule = useCallback(async (date: Date, time: string) => {
    const [hh, mm] = time.split(':').map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hh, mm, 0, 0);
    
    await updateAppointmentStatus('reschedule', {
      nuevaFechaHora: newDateTime.toISOString()
    });
    setShowReschedule(false);
  }, [updateAppointmentStatus]);

  if (!dateTime) {
    return (
        <Card className={cn("p-4 border-l-4 border-destructive", className)}>
            <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <div>
                    <p className="font-semibold">Error en la Cita</p>
                    <p className="text-sm text-muted-foreground">Fecha de cita inválida.</p>
                </div>
            </div>
        </Card>
    );
  }

  return (
    <>
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300 ease-out",
          "border-l-4 hover:shadow-xl transform-gpu group-hover:scale-[1.02] active:scale-[0.98]",
          statusConfig.borderClass,
          dateTime.isToday && "ring-2 ring-primary/20 shadow-lg",
          dateTime.isNear && "animate-pulse-subtle",
          "w-full",
          className
        )}
      >
        <div className={cn(
          "absolute inset-y-0 left-0 w-1 transition-all duration-300 group-hover:w-2",
          statusConfig.bgClass.replace('bg-', 'bg-gradient-to-b from-').replace('-100', '-400 to-').concat('-600')
        )} />
        
        {dateTime.isToday && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="shadow-md bg-primary/90 text-primary-foreground animate-bounce-subtle" variant="default">
              <Sparkles className="w-3 h-3 mr-1" /> Hoy
            </Badge>
          </div>
        )}

        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
            <div className="flex items-center flex-1 min-w-0 gap-2 sm:gap-3">
              <div className="relative">
                <Avatar className={cn("h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-offset-2 transition-all duration-300 group-hover:ring-4", statusConfig.ringClass)}>
                  <AvatarFallback className={cn("font-semibold text-white text-sm sm:text-base bg-gradient-to-br",
                    statusConfig.bgClass.includes('blue') ? "from-blue-500 to-blue-600" :
                    statusConfig.bgClass.includes('green') ? "from-green-500 to-green-600" :
                    statusConfig.bgClass.includes('red') ? "from-red-500 to-red-600" : "from-gray-500 to-gray-600")}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {dateTime.isNear && (
                  <div className="absolute -bottom-1 -right-1 p-0.5 bg-orange-500 border-2 rounded-full border-background animate-pulse">
                    <Clock className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold truncate sm:text-base text-foreground">{fullName}</h3>
                <div className="flex flex-wrap items-center gap-1 mt-0.5 sm:gap-1.5">
                  {appointment.es_primera_vez && <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">1ª vez</Badge>}
                  {patientData?.edad && <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5">{patientData.edad} años</Badge>}
                  {patientData?.diagnostico_principal && <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 py-0 h-4 sm:h-5 hidden sm:inline-flex">{patientData.diagnostico_principal.replace(/_/g, ' ')}</Badge>}
                </div>
              </div>
            </div>
            <Badge className={cn("text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300 group-hover:scale-105 px-2 py-0.5 sm:px-2.5 sm:py-1 self-start sm:self-center flex-shrink-0", statusConfig.bgClass, statusConfig.textClass)}>
              {statusConfig.label}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 sm:text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="flex-shrink-0 w-3.5 h-3.5 sm:h-4 sm:w-4" />
              <span className="truncate" title={dateTime.fullDate}>{dateTime.date} • {dateTime.time}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="flex-shrink-0 w-3.5 h-3.5 sm:h-4 sm:w-4" />
              {/* FIX APPLIED HERE */}
              <span className="truncate" title={(appointment.motivos_consulta || []).join(', ')}>
                {(appointment.motivos_consulta || []).join(', ') || 'Sin especificar'}
              </span>
            </div>
            {patientData?.telefono && (
              <div className="items-center hidden gap-1.5 sm:flex text-muted-foreground">
                <Phone className="flex-shrink-0 w-3.5 h-3.5 sm:h-4 sm:w-4" />
                <span className="truncate">{patientData.telefono}</span>
              </div>
            )}
            {patientData?.email && (
              <div className="items-center hidden gap-1.5 lg:flex text-muted-foreground">
                <Mail className="flex-shrink-0 w-3.5 h-3.5 sm:h-4 sm:w-4" />
                <span className="text-xs truncate">{patientData.email}</span>
              </div>
            )}
          </div>

          {appointment.notas_breves && (
            <div className="p-2 sm:p-2.5 bg-muted/50 rounded-md text-xs sm:text-sm text-muted-foreground">
              <p className="line-clamp-2">{appointment.notas_breves}</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t sm:pt-3">
            {primaryAction && !disableActions && (
              <Button onClick={() => handleActionClick(primaryAction)} disabled={isLoading} className={cn("flex-1 h-9 sm:h-10 text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation active:scale-95", isLoading && "opacity-50 cursor-wait")} size="sm">
                {isLoading ? (<><Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-1.5" /> Procesando...</>) : (<>{React.createElement(ACTION_CONFIG[primaryAction].icon, { className: cn("h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5", ACTION_CONFIG[primaryAction].color)})} {ACTION_CONFIG[primaryAction].label}</>)}
              </Button>
            )}

            {secondaryActions.length > 0 && !disableActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className={cn("h-9 sm:h-10 w-9 sm:w-10 p-0 transition-all duration-200 hover:bg-accent touch-manipulation", isLoading && "opacity-50 cursor-wait")} disabled={isLoading}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56" sideOffset={5}>
                  {secondaryActions.map((action) => {
                    const config = ACTION_CONFIG[action];
                    return (
                      <DropdownMenuItem key={action} onClick={() => handleActionClick(action)} disabled={isLoading} className="flex items-center h-10 gap-2.5 sm:h-11 text-xs sm:text-sm touch-manipulation focus:bg-accent">
                        <config.icon className={cn("h-4 w-4", config.color)} />
                        <span className="flex-1">{config.label}</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => !open && setConfirmation({ isOpen: false, action: null })}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmation.action && React.createElement(ACTION_CONFIG[confirmation.action].icon, { className: cn("h-5 w-5", ACTION_CONFIG[confirmation.action].color) })}
              {confirmation.action && ACTION_CONFIG[confirmation.action].title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-foreground">{fullName}</p>
              <p>{confirmation.action && ACTION_CONFIG[confirmation.action].description}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isLoading} className={cn(confirmation.action && ACTION_CONFIG[confirmation.action].variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : '')}>
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>) : (confirmation.action && ACTION_CONFIG[confirmation.action].confirmText)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showReschedule && (<RescheduleDatePicker appointment={appointment} onClose={() => setShowReschedule(false)} onReschedule={handleReschedule} />)}
      {showHistory && (<PatientHistoryModal patientId={appointment.patient_id} isOpen={showHistory} onClose={() => setShowHistory(false)} />)}
    </>
  );
});

PatientCard.displayName = "PatientCard";
export default PatientCard;
