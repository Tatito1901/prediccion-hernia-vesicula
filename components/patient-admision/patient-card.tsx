// components/patient-admision/patient-card.tsx
import React, { memo, useMemo, useCallback, useState } from "react";
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
  PlayCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  AppointmentWithPatient, 
  AdmissionAction, 
  PatientCardProps
} from './admision-types';

// Import values (constants and functions)
import { 
  APPOINTMENT_STATUS_CONFIG,
  getPatientFullName,
  getStatusConfig
} from './admision-types';

// ✅ Import del hook de acciones corregido
import { useAppointmentActions } from './actions';

// ✅ Import de validaciones de reglas de negocio
import { 
  canCheckIn, 
  canStartConsult, 
  canCompleteAppointment, 
  canCancelAppointment, 
  canMarkNoShow, 
  canRescheduleAppointment 
} from '@/lib/admission-business-rules';

// ✅ Imports de componentes secundarios
import { RescheduleDatePicker } from './patient-admission-reschedule';
import PatientHistoryModal from './patient-history-modal';

// ==================== INTERFACES LOCALES ====================
interface ConfirmationState {
  isOpen: boolean;
  action: AdmissionAction | null;
  title: string;
  description: string;
  confirmText: string;
  variant: 'default' | 'destructive';
}

// ==================== CONFIGURACIÓN DE ACCIONES ====================
const ACTION_CONFIG = {
  checkIn: { 
    icon: CheckCircle, 
    label: 'Marcar Presente',
    title: 'Marcar como Presente',
    description: 'El paciente será marcado como presente y podrá ser llamado para consulta.',
    confirmText: 'Marcar Presente',
    variant: 'default' as const,
  },
  startConsult: { 
    icon: PlayCircle, 
    label: 'Iniciar Consulta',
    title: 'Iniciar Consulta',
    description: 'Se iniciará la consulta médica para este paciente.',
    confirmText: 'Iniciar Consulta',
    variant: 'default' as const,
  },
  complete: { 
    icon: CheckCircle, 
    label: 'Completar Cita',
    title: 'Completar Consulta',
    description: 'La consulta será marcada como completada.',
    confirmText: 'Completar',
    variant: 'default' as const,
  },
  cancel: { 
    icon: XCircle, 
    label: 'Cancelar Cita',
    title: 'Cancelar Cita',
    description: 'Esta acción cancelará la cita médica. Esta acción no se puede deshacer.',
    confirmText: 'Cancelar Cita',
    variant: 'destructive' as const,
  },
  noShow: { 
    icon: AlertTriangle, 
    label: 'No Asistió',
    title: 'Marcar como No Asistió',
    description: 'El paciente será marcado como no asistió a la cita.',
    confirmText: 'Marcar No Asistió',
    variant: 'destructive' as const,
  },
  reschedule: { 
    icon: Calendar, 
    label: 'Reagendar Cita',
    title: 'Reagendar Cita',
    description: 'Se abrirá el diálogo para reagendar esta cita.',
    confirmText: 'Reagendar',
    variant: 'default' as const,
  },
  viewHistory: { 
    icon: History, 
    label: 'Ver Historial',
    title: 'Ver Historial',
    description: 'Ver el historial completo de consultas del paciente.',
    confirmText: 'Ver Historial',
    variant: 'default' as const,
  },
};

// ==================== COMPONENTE PRINCIPAL ====================
export const PatientCard = memo<PatientCardProps>(({ 
  appointment, 
  onAction, 
  disableActions = false, 
  className 
}) => {
  // ✅ HOOKS CORREGIDOS con tipos unificados
  const {
    checkIn,
    complete,
    cancel,
    markNoShow,
    reschedule,
    isLoading,
  } = useAppointmentActions();

  // ✅ ESTADOS LOCALES
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

  // ✅ DATOS COMPUTADOS usando helpers de types
  const patientData = appointment.patients;
  const statusConfig = useMemo(() => {
    return APPOINTMENT_STATUS_CONFIG[appointment.estado_cita] || APPOINTMENT_STATUS_CONFIG.PROGRAMADA;
  }, [appointment.estado_cita]);
  
  const fullName = useMemo(() => 
    getPatientFullName(patientData),
    [patientData]
  );

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

  // ✅ VALIDACIONES usando reglas de negocio reales
  const canPerformAction = useCallback((action: AdmissionAction) => {
    switch (action) {
      case 'checkIn':
        return canCheckIn(appointment);
      case 'startConsult':
        return canStartConsult(appointment);
      case 'complete':
        return canCompleteAppointment(appointment);
      case 'cancel':
        return canCancelAppointment(appointment);
      case 'noShow':
        return canMarkNoShow(appointment);
      case 'reschedule':
        return canRescheduleAppointment(appointment);
      case 'viewHistory':
        return { valid: true };
      default:
        return { valid: false, reason: 'Acción no reconocida' };
    }
  }, [appointment]);

  // ✅ ACCIONES DISPONIBLES basadas en validaciones reales
  const availableActions = useMemo(() => {
    const actions: AdmissionAction[] = [];
    
    // Verificar cada acción usando las reglas de negocio
    if (canPerformAction('checkIn').valid) actions.push('checkIn');
    if (canPerformAction('startConsult').valid) actions.push('startConsult');
    if (canPerformAction('complete').valid) actions.push('complete');
    if (canPerformAction('cancel').valid) actions.push('cancel');
    if (canPerformAction('noShow').valid) actions.push('noShow');
    if (canPerformAction('reschedule').valid) actions.push('reschedule');
    
    // Ver historial siempre disponible
    actions.push('viewHistory');
    
    return actions;
  }, [canPerformAction]);

  // ✅ ACCIÓN PRINCIPAL (más relevante según estado)
  const primaryAction = useMemo((): AdmissionAction | null => {
    if (availableActions.includes('checkIn')) return 'checkIn';
    if (availableActions.includes('startConsult')) return 'startConsult';
    if (availableActions.includes('complete')) return 'complete';
    return null;
  }, [availableActions]);

  // ✅ HANDLERS CORREGIDOS
  const handleActionClick = useCallback((action: AdmissionAction) => {
    // Verificar si está habilitado
    if (disableActions) return;
    
    if (action === 'reschedule') {
      setShowReschedule(true);
      return;
    }
    
    if (action === 'viewHistory') {
      setShowHistory(true);
      return;
    }

    // Para otras acciones, mostrar confirmación
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
        case 'checkIn':
          await checkIn(appointment.id);
          break;
        case 'startConsult':
          // Para iniciar consulta, primero debe estar presente
          await checkIn(appointment.id);
          break;
        case 'complete':
          await complete(appointment.id);
          break;
        case 'cancel':
          await cancel(appointment.id, 'Cancelado por usuario');
          break;
        case 'noShow':
          await markNoShow(appointment.id);
          break;
      }
      
      // Llamar callback externo si existe
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
        "transition-all duration-200 hover:shadow-lg border-l-4",
        `border-l-${statusConfig.colorName}-500`,
        dateTime.isToday && "ring-2 ring-blue-500/50",
        className
      )}>
        <CardContent className="p-4 grid gap-4">
          {/* ========= HEADER: Paciente y Estado ========= */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 text-lg">
                <AvatarFallback className={cn(
                  "font-medium",
                  `bg-${statusConfig.colorName}-500 text-white`
                )}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{fullName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {appointment.es_primera_vez && (
                    <Badge variant="outline" className="text-xs">Primera vez</Badge>
                  )}
                  {patientData?.edad && (
                    <span className="text-xs text-muted-foreground">{patientData.edad} años</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge className={statusConfig.bgClass}>
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          {/* ========= INFORMACIÓN DE LA CITA ========= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{dateTime.date} a las {dateTime.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{appointment.motivo_cita}</span>
            </div>
            {patientData?.telefono && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{patientData.telefono}</span>
              </div>
            )}
            {patientData?.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{patientData.email}</span>
              </div>
            )}
          </div>

          {/* ========= ACCIONES ========= */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
            {/* Acción principal */}
            {primaryAction && !disableActions && (
              <Button
                onClick={() => handleActionClick(primaryAction)}
                disabled={isLoading}
                className="flex-1 min-w-[120px]"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  React.createElement(ACTION_CONFIG[primaryAction].icon, { 
                    className: "h-4 w-4 mr-2" 
                  })
                )}
                {ACTION_CONFIG[primaryAction].label}
              </Button>
            )}

            {/* Menú de acciones secundarias */}
            {availableActions.length > 1 && !disableActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" disabled={isLoading}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {availableActions
                    .filter(action => action !== primaryAction)
                    .map((action) => {
                      const config = ACTION_CONFIG[action];
                      const validation = canPerformAction(action);
                      
                      return (
                        <DropdownMenuItem
                          key={action}
                          onClick={() => handleActionClick(action)}
                          disabled={!validation.valid}
                          className="flex items-center gap-2"
                        >
                          <config.icon className="h-4 w-4" />
                          {config.label}
                          {!validation.valid && validation.reason && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              ({validation.reason})
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========= MODALES ========= */}
      {/* Confirmación de acciones */}
      <AlertDialog open={confirmation.isOpen} onOpenChange={(open) => 
        setConfirmation(prev => ({ ...prev, isOpen: open }))
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmation.title}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{fullName}</strong>
              <br />
              {confirmation.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={isLoading}
              className={confirmation.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
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