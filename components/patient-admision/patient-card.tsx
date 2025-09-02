// components/patient-admission/patient-card.tsx
'use client';
import React, { memo, useMemo, useCallback, useState } from "react";
import dynamic from 'next/dynamic';
import { isValid, parseISO } from 'date-fns';
import { formatMx, isMxToday, mxLocalPartsToUtcIso } from '@/utils/datetime';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  User2,
  Phone,
  Mail,
  MoreVertical,
  CheckCircle2,
  XCircle,
  History,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Stethoscope,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { AppointmentStatusEnum } from '@/lib/types';

import type { AppointmentWithPatient, AdmissionAction, PatientCardProps } from './admision-types';
import { getPatientFullName, getStatusConfig, canPerformAction } from './admision-types';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';

// Helpers de formato de texto
const toTitleCaseEs = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ');
const prettifyEnumLabel = (v?: string) => (v ? toTitleCaseEs(v.replace(/_/g, ' ')) : '');

// Lazy loading optimizado
const RescheduleDatePicker = dynamic(
  () => import('./patient-admission-reschedule').then(m => m.RescheduleDatePicker),
  { ssr: false }
);

const PatientHistoryModal = dynamic(
  () => import('./patient-history-modal'),
  { ssr: false }
);

// Configuración de acciones mejorada
const ACTION_CONFIG = {
  checkIn: { 
    icon: CheckCircle2, 
    label: 'Registrar Llegada', 
    title: 'Registrar Llegada del Paciente',
    description: 'Confirmar que el paciente ha llegado a la clínica.',
    variant: 'default' as const,
    className: 'bg-teal-600 hover:bg-teal-700 text-white'
  },
  complete: { 
    icon: CheckCircle2, 
    label: 'Completar', 
    title: 'Completar Consulta',
    description: 'Marcar la consulta como completada.',
    variant: 'default' as const,
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  },
  cancel: { 
    icon: XCircle, 
    label: 'Cancelar', 
    title: 'Cancelar Cita',
    description: 'La cita será cancelada y el paciente será notificado.',
    variant: 'destructive' as const,
    className: ''
  },
  noShow: { 
    icon: AlertTriangle, 
    label: 'No Asistió', 
    title: 'Marcar Inasistencia',
    description: 'Registrar que el paciente no se presentó.',
    variant: 'destructive' as const,
    className: ''
  },
  reschedule: { 
    icon: Calendar, 
    label: 'Reagendar', 
    title: 'Reagendar Cita',
    description: 'Cambiar fecha y hora de la cita.',
    variant: 'outline' as const,
    className: ''
  },
  viewHistory: { 
    icon: History, 
    label: 'Ver Historial', 
    title: 'Historial del Paciente',
    description: 'Ver historial completo de consultas.',
    variant: 'outline' as const,
    className: ''
  },
};

export const PatientCard = memo<PatientCardProps>(({ 
  appointment, 
  onAction, 
  disableActions = false, 
  className,
  open: controlledOpen,
  onOpenChange
}) => {
  const { mutateAsync: updateStatus, isPending } = useUpdateAppointmentStatus();
  const [confirmDialog, setConfirmDialog] = useState<AdmissionAction | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [infoDialog, setInfoDialog] = useState<null | { kind: 'tooEarly' | 'expired' }>(null);
  // Estado controlado/ no controlado para expansión
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const patient = useMemo(() => appointment.patients, [appointment.patients]);
  const statusConfig = useMemo(() => getStatusConfig(appointment.estado_cita), [appointment.estado_cita]);
  const fullName = useMemo(() => getPatientFullName(patient), [patient]);
  const dxLabel = useMemo(() => prettifyEnumLabel(String(patient?.diagnostico_principal || '')), [patient?.diagnostico_principal]);
  
  const initials = useMemo(() => {
    const n = patient?.nombre?.[0] || '';
    const a = patient?.apellidos?.[0] || '';
    return (n + a).toUpperCase() || 'P';
  }, [patient]);

  const dateTime = useMemo(() => {
    try {
      const date = parseISO(appointment.fecha_hora_cita);
      if (!isValid(date)) return null;
      
      const now = new Date();
      const isToday = isMxToday(appointment.fecha_hora_cita);
      const isPast = date < now;
      
      return {
        date: formatMx(appointment.fecha_hora_cita, "EEE d MMM"),
        time: formatMx(appointment.fecha_hora_cita, 'HH:mm'),
        fullDate: formatMx(appointment.fecha_hora_cita, "EEEE d 'de' MMMM"),
        isToday,
        isPast,
        isNear: !isPast && (date.getTime() - now.getTime()) < 3600000,
      };
    } catch {
      return null;
    }
  }, [appointment.fecha_hora_cita]);

  // Estado de la ventana de check-in (solo para UI preventiva)
  const checkInUi = useMemo(() => {
    try {
      const appt = parseISO(appointment.fecha_hora_cita);
      if (!isValid(appt)) return { state: 'unknown' as const };
      const start = new Date(appt.getTime() - 30 * 60 * 1000); // 30 min antes
      const end = new Date(appt.getTime() + 15 * 60 * 1000);   // 15 min después
      const now = new Date();
      if (now < start) {
        const minutes = Math.ceil((start.getTime() - now.getTime()) / 60000);
        return { state: 'tooEarly' as const, minutes, start, end, appt };
      }
      if (now > end) {
        const minutes = Math.floor((now.getTime() - end.getTime()) / 60000);
        return { state: 'expired' as const, minutes, start, end, appt };
      }
      return { state: 'open' as const, start, end, appt };
    } catch {
      return { state: 'unknown' as const };
    }
  }, [appointment.fecha_hora_cita]);

  const availableActions = useMemo(() => {
    const actions: AdmissionAction[] = [];
    (['checkIn', 'complete', 'cancel', 'noShow', 'reschedule', 'viewHistory'] as const).forEach(action => {
      if (canPerformAction(appointment, action)) {
        actions.push(action);
      }
    });
    return actions;
  }, [appointment]);

  const primaryAction = useMemo(() => 
    availableActions.find(a => a === 'checkIn' || a === 'complete'),
    [availableActions]
  );

  const prettyMotivos = useMemo(() => {
    const base = new Set<string>();
    const dxNorm = (dxLabel || '').toLowerCase().replace(/\s+/g, '');
    const items = (appointment.motivos_consulta || []).map(m => prettifyEnumLabel(String(m)) || '').filter(Boolean);
    const dedup = [] as string[];
    for (const item of items) {
      const norm = item.toLowerCase().replace(/\s+/g, '');
      if (norm && norm !== dxNorm && !base.has(norm)) {
        base.add(norm);
        dedup.push(item);
      }
    }
    return dedup;
  }, [appointment.motivos_consulta, dxLabel]);

  const handleAction = useCallback(async (action: AdmissionAction) => {
    if (action === 'reschedule') {
      setShowReschedule(true);
      return;
    }
    if (action === 'viewHistory') {
      setShowHistory(true);
      return;
    }
    if (action === 'checkIn') {
      if (checkInUi.state === 'open') {
        setConfirmDialog('checkIn');
      } else if (checkInUi.state === 'tooEarly') {
        setInfoDialog({ kind: 'tooEarly' });
      } else if (checkInUi.state === 'expired') {
        setInfoDialog({ kind: 'expired' });
      } else {
        // Estado desconocido: prevenir y mostrar mensaje genérico
        setInfoDialog({ kind: 'tooEarly' });
      }
      return;
    }
    
    setConfirmDialog(action);
  }, [checkInUi.state]);

  const handleConfirm = useCallback(async () => {
    if (!confirmDialog) return;
    
    const statusMap = {
      checkIn: AppointmentStatusEnum.PRESENTE,
      complete: AppointmentStatusEnum.COMPLETADA,
      cancel: AppointmentStatusEnum.CANCELADA,
      noShow: AppointmentStatusEnum.NO_ASISTIO,
    } as const;
    
    try {
      await updateStatus({
        appointmentId: appointment.id,
        newStatus: statusMap[confirmDialog as keyof typeof statusMap],
        motivo: ACTION_CONFIG[confirmDialog].description,
      });
      onAction?.(confirmDialog, appointment.id);
    } finally {
      setConfirmDialog(null);
    }
  }, [confirmDialog, appointment.id, updateStatus, onAction]);

  const handleReschedule = useCallback(async (date: Date, time: string) => {
    const [hh, mm] = time.split(':').map(Number);
    const yyyyMmDd = formatMx(date, 'yyyy-MM-dd');
    const newIso = mxLocalPartsToUtcIso(yyyyMmDd, hh, mm);
    
    // 1) Set REAGENDADA with new datetime to pass server-side validation and log audit trail
    await updateStatus({
      appointmentId: appointment.id,
      newStatus: AppointmentStatusEnum.REAGENDADA,
      nuevaFechaHora: newIso,
      motivo: 'Reagendamiento de cita'
    });

    // Immediately return to PROGRAMADA so the appointment appears in main tabs by the new datetime
    await updateStatus({
      appointmentId: appointment.id,
      newStatus: AppointmentStatusEnum.PROGRAMADA,
      motivo: 'Cita reagendada confirmada en nueva fecha'
    });

    setShowReschedule(false);
    onAction?.('reschedule', appointment.id);
  }, [appointment.id, updateStatus, onAction]);

  if (!dateTime) return null;

  return (
    <>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        "border-l-4",
        statusConfig.borderClass,
        dateTime.isToday && "ring-2 ring-sky-500/20",
        className
      )}>
        {/* Indicador de "Hoy" elegante */}
        {dateTime.isToday && (
          <div className="absolute top-3 right-3 z-10">
            <Badge className="bg-sky-500 text-white border-0 text-xs font-medium">
              HOY
            </Badge>
          </div>
        )}
        <CardContent className="p-3 sm:p-4">
          <Collapsible open={open} onOpenChange={setOpen}>
            {/* Header compacto con Trigger en el lado izquierdo */}
            <div className="flex items-start justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <Avatar className="h-9 w-9 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                    <AvatarFallback className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[15px] sm:text-base text-gray-900 dark:text-gray-100 truncate">
                      {fullName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={cn(
                        "text-[10px] sm:text-xs font-medium",
                        statusConfig.bgClass
                      )}>
                        {statusConfig.label}
                      </Badge>
                      {appointment.es_primera_vez && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">
                          1ª vez
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-gray-500 transition-transform", open && "rotate-180")} />
                </button>
              </CollapsibleTrigger>

              {/* Hora y menú de acciones */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="font-medium">{dateTime.time}</span>
                </div>
                {!disableActions && availableActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
                        disabled={isPending}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {availableActions.filter(a => a !== primaryAction).map((action, index) => {
                        const config = ACTION_CONFIG[action];
                        return (
                          <React.Fragment key={action}>
                            {index > 0 && action === 'viewHistory' && <DropdownMenuSeparator />}
                            <DropdownMenuItem 
                              onClick={() => handleAction(action)}
                              className="gap-2 cursor-pointer"
                            >
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </DropdownMenuItem>
                          </React.Fragment>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>

            {/* Contenido expandible */}
            <CollapsibleContent>
              <div className="mt-3 md:grid md:grid-cols-6 md:gap-4">
                {/* Información de la cita, motivos y contacto */}
                <div className="md:col-span-4 space-y-2 mb-3 md:mb-0">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{dateTime.fullDate}</span>
                    <span className="text-gray-400">•</span>
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{dateTime.time}</span>
                  </div>

                  {/* Badges adicionales (diagnóstico) */}
                  <div className="flex flex-wrap items-center gap-2">
                    
                    {patient?.diagnostico_principal && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs max-w-[240px] truncate">
                        Dx: {dxLabel}
                      </Badge>
                    )}
                  </div>

                  {prettyMotivos.length > 0 && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <Stethoscope className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-1">
                        {prettyMotivos.join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Contacto */}
                  <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                    {patient?.telefono && (
                      <a 
                        href={`tel:${patient.telefono}`}
                        className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        <span>{patient.telefono}</span>
                      </a>
                    )}
                    {patient?.email && (
                      <a 
                        href={`mailto:${patient.email}`}
                        className="hidden sm:flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        <span className="truncate max-w-[180px]">{patient.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Acción principal en columna derecha */}
                <div className="md:col-span-2">
                  {!disableActions && primaryAction && (
                    <Button
                      onClick={() => handleAction(primaryAction)}
                      disabled={isPending}
                      className={cn(
                        "w-full gap-2 font-medium",
                        ACTION_CONFIG[primaryAction].className
                      )}
                    >
                      {isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        <>
                          {React.createElement(ACTION_CONFIG[primaryAction].icon, { 
                            className: "h-4 w-4" 
                          })}
                          {ACTION_CONFIG[primaryAction].label}
                          <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Notas */}
              {appointment.notas_breves && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {appointment.notas_breves}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog && ACTION_CONFIG[confirmDialog].title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">{fullName}</span>
              <span className="block">{confirmDialog && ACTION_CONFIG[confirmDialog].description}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm} 
              disabled={isPending}
              className={confirmDialog && ACTION_CONFIG[confirmDialog].variant === 'destructive' ? 
                'bg-red-600 hover:bg-red-700' : ''
              }
            >
              {isPending ? 'Procesando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo informativo (check-in fuera de ventana) */}
      <AlertDialog open={!!infoDialog} onOpenChange={(open) => !open && setInfoDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {infoDialog?.kind === 'tooEarly' ? (
                <>
                  <Clock className="h-4 w-4 text-sky-600" />
                  Check-in aún no disponible
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Ventana de check-in expirada
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block font-medium text-foreground">{fullName}</span>
              {infoDialog?.kind === 'tooEarly' && (
                <span className="block">
                  El check-in se habilita 30 minutos antes de la cita
                  {checkInUi.start && (
                    <>
                      {" "}(desde {formatMx(checkInUi.start, 'HH:mm')}
                      {typeof checkInUi.minutes === 'number' && `, faltan ${checkInUi.minutes} min`} ).
                    </>
                  )}
                </span>
              )}
              {infoDialog?.kind === 'expired' && (
                <span className="block">
                  La ventana de check-in cerró{checkInUi.end && <> a las {formatMx(checkInUi.end, 'HH:mm')}</>}.
                  Puedes marcar <strong>No Asistió</strong> o <strong>Reagendar</strong>.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            {infoDialog?.kind === 'expired' && availableActions.includes('noShow') && (
              <Button 
                variant="destructive" 
                onClick={() => { setInfoDialog(null); handleAction('noShow'); }}
              >
                No Asistió
              </Button>
            )}
            {availableActions.includes('reschedule') && (
              <Button 
                variant="outline" 
                onClick={() => { setInfoDialog(null); handleAction('reschedule'); }}
              >
                Reagendar
              </Button>
            )}
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modales */}
      {showReschedule && (
        <RescheduleDatePicker 
          appointment={appointment} 
          onClose={() => setShowReschedule(false)} 
          onReschedule={handleReschedule} 
        />
      )}
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