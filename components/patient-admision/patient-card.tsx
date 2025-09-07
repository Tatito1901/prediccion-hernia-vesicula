// components/patient-admission/patient-card.tsx (Optimizado)
import React, { memo, useMemo, useCallback, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { isValid, parseISO, addMinutes } from 'date-fns';
import { formatMx, isMxToday, mxLocalPartsToUtcIso, mxNow } from '@/utils/datetime';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Clock,
  Calendar,
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
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

import { AppointmentStatusEnum } from '@/lib/types';

import type { AppointmentWithPatient, AdmissionAction, PatientCardProps } from './admision-types';
import { getPatientFullName, getStatusConfig } from './admision-types';
import { getAvailableActions as getAdmissionAvailableActions, suggestNextAction, canCheckIn, getTimeUntilActionAvailable, BUSINESS_RULES } from '@/lib/admission-business-rules';
import { useUpdateAppointmentStatus } from '@/hooks/core/use-appointments';
import { useRescheduleAppointment } from '@/hooks/use-reschedule-appointment';

// Tipos locales para estados derivados (mejoran legibilidad y chequeo estático)
type InfoDialogKind = 'tooEarly' | 'expired' | 'info';
interface DateTimeState {
  date: string;
  time: string;
  fullDate: string;
  isToday: boolean;
  isPast: boolean;
  isNear: boolean;
}

type CheckInState =
  | { state: 'unknown' }
  | { state: 'tooEarly'; minutes?: number; start: Date; end: Date; appt: Date }
  | { state: 'expired'; minutes?: number; start: Date; end: Date; appt: Date }
  | { state: 'open'; start: Date; end: Date; appt: Date };

// Helpers de formato de texto
const toTitleCaseEs = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : ''))
    .join(' ');
const prettifyEnumLabel = (v?: string) => (v ? toTitleCaseEs(v.replace(/_/g, ' ')) : '');

// Lazy loading optimizado (evita cargar estos módulos cuando no se usan)
const RescheduleDatePicker = dynamic(() => import('./patient-admission-reschedule'), {
  ssr: false,
  loading: () => null,
});

const PatientHistoryModal = dynamic(() => import('@/components/patients/patient-history-modal'), {
  ssr: false,
  loading: () => null,
});

// Configuración de acciones con tipado estricto
interface ActionUI {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  title: string;
  description: string;
  variant: 'default' | 'destructive' | 'outline';
  className: string;
}

const ACTION_CONFIG = {
  checkIn: {
    icon: CheckCircle2,
    label: 'Registrar Llegada',
    title: 'Registrar Llegada del Paciente',
    description: 'Confirmar que el paciente ha llegado a la clínica.',
    variant: 'default',
    className: 'bg-teal-600 hover:bg-teal-700 text-white',
  },
  complete: {
    icon: CheckCircle2,
    label: 'Completar',
    title: 'Completar Consulta',
    description: 'Marcar la consulta como completada.',
    variant: 'default',
    className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  cancel: {
    icon: XCircle,
    label: 'Cancelar',
    title: 'Cancelar Cita',
    description: 'La cita será cancelada y el paciente será notificado.',
    variant: 'destructive',
    className: '',
  },
  noShow: {
    icon: AlertTriangle,
    label: 'No Asistió',
    title: 'Marcar Inasistencia',
    description: 'Registrar que el paciente no se presentó.',
    variant: 'destructive',
    className: '',
  },
  reschedule: {
    icon: Calendar,
    label: 'Reagendar',
    title: 'Reagendar Cita',
    description: 'Cambiar fecha y hora de la cita.',
    variant: 'outline',
    className: '',
  },
  viewHistory: {
    icon: History,
    label: 'Ver Historial',
    title: 'Historial del Paciente',
    description: 'Ver historial completo de consultas.',
    variant: 'outline',
    className: '',
  },
} satisfies Record<AdmissionAction, ActionUI>;

// --- Utils de comparación superficial para evitar rerenders innecesarios ---
const shallowEqualPatient = (a: AppointmentWithPatient['patients'], b: AppointmentWithPatient['patients']) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.nombre === b.nombre &&
    a.apellidos === b.apellidos &&
    a.diagnostico_principal === b.diagnostico_principal &&
    a.telefono === b.telefono &&
    a.email === b.email
  );
};

// Subcomponente: Menú de acciones secundarias (memoizado)
const SecondaryActionsMenu = memo(function SecondaryActionsMenu({
  actions,
  onAction,
  disabled,
}: {
  actions: AdmissionAction[];
  onAction: (a: AdmissionAction) => void;
  disabled: boolean;
}) {
  if (actions.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label="Más opciones de la cita"
          disabled={disabled}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action, index) => {
          const config = ACTION_CONFIG[action];
          const showSep = index > 0 && action === 'viewHistory';
          const Icon = config.icon;
          return (
            <React.Fragment key={action}>
              {showSep && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => onAction(action)} className="gap-2 cursor-pointer" aria-label={config.label}>
                <Icon className="h-4 w-4" />
                {config.label}
              </DropdownMenuItem>
            </React.Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

// Subcomponente: Botón de acción primaria (memoizado)
const PrimaryActionButton = memo(function PrimaryActionButton({
  action,
  onClick,
  isPending,
  disabled,
}: {
  action: Exclude<AdmissionAction, 'cancel' | 'noShow' | 'reschedule' | 'viewHistory'> | null;
  onClick: (a: AdmissionAction) => void;
  isPending: boolean;
  disabled?: boolean;
}) {
  if (!action) return null;
  const cfg = ACTION_CONFIG[action];
  const Icon = cfg.icon;
  return (
    <Button
      onClick={() => onClick(action)}
      disabled={isPending || disabled}
      className={cn('w-full gap-2 font-medium', cfg.className)}
      aria-label={cfg.label}
      title={cfg.title}
      aria-busy={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Procesando...
        </>
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {cfg.label}
          <ArrowUpRight className="h-3.5 w-3.5 ml-auto" />
        </>
      )}
    </Button>
  );
});

// Componente principal
function PatientCard({ appointment, onAction, disableActions = false, className, open: controlledOpen, onOpenChange }: PatientCardProps) {
  const { mutateAsync: updateStatus, isPending } = useUpdateAppointmentStatus();
  const { mutate: reschedule, isPending: isRescheduling } = useRescheduleAppointment();

  const [confirmDialog, setConfirmDialog] = useState<AdmissionAction | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [infoDialog, setInfoDialog] = useState<null | { kind: InfoDialogKind; message?: string }>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  // Ticker para recalcular ventanas de check-in sin recargar - solo cuando es necesario
  const [clockTick, setClockTick] = useState(0);

  useEffect(() => {
    // Solo activar el ticker si la cita está en estado que requiere actualización de tiempo
    const needsTicker = appointment.estado_cita === AppointmentStatusEnum.PROGRAMADA || 
                       appointment.estado_cita === AppointmentStatusEnum.CONFIRMADA;
    
    if (!needsTicker) return;
    
    const id = setInterval(() => setClockTick((t) => t + 1), 30_000); // cada 30s
    return () => clearInterval(id);
  }, [appointment.estado_cita]);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  // Derivados (optimizados)
  const patient = useMemo(() => appointment.patients, [appointment.patients]);
  const statusConfig = useMemo(() => getStatusConfig(appointment.estado_cita), [appointment.estado_cita]);
  const fullName = useMemo(() => getPatientFullName(patient || null), [patient]);

  const dateTime = useMemo<DateTimeState | null>(() => {
    try {
      const date = parseISO(appointment.fecha_hora_cita);
      if (!isValid(date)) return null;
      const now = mxNow();
      const isToday = isMxToday(appointment.fecha_hora_cita);
      const isPast = date < now;
      const timeDiff = date.getTime() - now.getTime();
      
      return {
        date: formatMx(appointment.fecha_hora_cita, 'EEE d MMM'),
        time: formatMx(appointment.fecha_hora_cita, 'HH:mm'),
        fullDate: formatMx(appointment.fecha_hora_cita, "EEEE d 'de' MMMM"),
        isToday,
        isPast,
        isNear: !isPast && timeDiff > 0 && timeDiff < 3_600_000, // < 60 min
      };
    } catch {
      return null;
    }
  }, [appointment.fecha_hora_cita, clockTick]);

  const timePillClass = useMemo(() => {
    if (!dateTime) return '';
    if (dateTime.isPast) return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    if (dateTime.isNear) return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }, [dateTime]);

  const dxLabel = useMemo(() => {
    if (!patient?.diagnostico_principal) return '';
    if (!open) return ''; // Lazy compute solo cuando está abierto
    return prettifyEnumLabel(String(patient.diagnostico_principal));
  }, [open, patient?.diagnostico_principal]);

  const initials = useMemo(() => {
    const n = patient?.nombre?.[0] || '';
    const a = patient?.apellidos?.[0] || '';
    return (n + a).toUpperCase() || 'P';
  }, [patient]);

  const checkInWindow = useMemo(() => {
    try {
      const appt = parseISO(appointment.fecha_hora_cita);
      if (!isValid(appt)) return null;
      const start = addMinutes(appt, -BUSINESS_RULES.CHECK_IN_WINDOW_BEFORE_MINUTES);
      const end = addMinutes(appt, BUSINESS_RULES.CHECK_IN_WINDOW_AFTER_MINUTES);
      return { start, end, appt };
    } catch {
      return null;
    }
  }, [appointment.fecha_hora_cita]);

  const availableActions = useMemo(() => {
    // Preferir las acciones calculadas por el backend si están presentes
    if (appointment.actions?.available && Array.isArray(appointment.actions.available)) {
      return appointment.actions.available as AdmissionAction[];
    }

    // Fallback a cálculo local usando reglas centralizadas (sin duplicar lógica ad-hoc)
    const now = mxNow();
    const list = getAdmissionAvailableActions(appointment, now);
    const validActions = list.filter((a) => a.valid).map((a) => a.action as AdmissionAction);
    return validActions;
  }, [appointment, clockTick]);

  const primaryAction = useMemo<AdmissionAction | null>(() => {
    // 1) Preferir sugerencia del backend si existe
    if (typeof appointment.suggested_action !== 'undefined') {
      return appointment.suggested_action as AdmissionAction | null;
    }
    if (appointment.actions?.primary) {
      return appointment.actions.primary as AdmissionAction;
    }

    // 2) Fallback a sugerencia local con reglas centralizadas
    const now = mxNow();
    const suggested = suggestNextAction(appointment, now) as AdmissionAction | null;
    return suggested;
  }, [appointment, clockTick]);

  const isPrimaryDisabled = useMemo(() => {
    if (!primaryAction) return false;
    if (primaryAction === 'checkIn' && appointment.actions) {
      return !appointment.actions.canCheckIn;
    }
    return false;
  }, [primaryAction, appointment.actions]);

  const secondaryActions = useMemo(() => availableActions.filter((a) => a !== primaryAction), [availableActions, primaryAction]);

  const contentId = useMemo(() => `patient-card-content-${appointment.id}`, [appointment.id]);

  const prettyMotivos = useMemo(() => {
    if (!open || !appointment.motivos_consulta?.length) return [];
    
    const base = new Set<string>();
    const dxNorm = dxLabel.toLowerCase().replace(/\s+/g, '');
    const dedup: string[] = [];
    
    for (const motivo of appointment.motivos_consulta) {
      const pretty = prettifyEnumLabel(String(motivo));
      if (!pretty) continue;
      
      const norm = pretty.toLowerCase().replace(/\s+/g, '');
      if (norm && norm !== dxNorm && !base.has(norm)) {
        base.add(norm);
        dedup.push(pretty);
      }
    }
    return dedup;
  }, [open, appointment.motivos_consulta, dxLabel]);

  // --- Handlers ---
  const handleAction = useCallback(
    (action: AdmissionAction) => {
      if (action === 'reschedule') {
        setShowReschedule(true);
        return;
      }
      if (action === 'viewHistory') {
        setShowHistory(true);
        return;
      }
      if (action === 'checkIn') {
        const now = mxNow();
        // Si el backend ya indicó que no se puede hacer check-in, mostrar motivo sin recalcular
        if (appointment.actions && !appointment.actions.canCheckIn) {
          const msg = appointment.action_reasons?.checkIn || 'Acción no disponible por reglas de negocio.';
          // Inferir tipo de info si es posible con mensaje conocido
          const lower = msg.toLowerCase();
          if (lower.includes('expirad')) {
            setInfoDialog({ kind: 'expired', message: msg });
          } else if (lower.includes('disponible en')) {
            setInfoDialog({ kind: 'tooEarly', message: msg });
          } else {
            setInfoDialog({ kind: 'info', message: msg });
          }
          return;
        }

        // Fallback a validación local con reglas centralizadas (misma fuente que backend)
        const result = canCheckIn(appointment, now);
        if (result.valid) {
          setConfirmDialog('checkIn');
        } else {
          const timeInfo = getTimeUntilActionAvailable(appointment, 'checkIn', now);
          if (timeInfo.minutesUntil !== undefined && timeInfo.minutesUntil > 0) {
            setInfoDialog({ kind: 'tooEarly', message: timeInfo.message || result.reason });
          } else if (result.reason && /expirad/i.test(result.reason)) {
            setInfoDialog({ kind: 'expired', message: result.reason });
          } else {
            setInfoDialog({ kind: 'info', message: result.reason || 'Acción no disponible por reglas de negocio.' });
          }
        }
        return;
      }
      setConfirmDialog(action);
    },
    [appointment]
  );

  const isBusy = isPending || isRescheduling;

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

  const handleReschedule = useCallback(
    async (date: Date, time: string) => {
      const [hh, mm] = time.split(':').map(Number);
      const yyyyMmDd = formatMx(date, 'yyyy-MM-dd');
      const newIso = mxLocalPartsToUtcIso(yyyyMmDd, hh, mm);

      reschedule(
        {
          appointmentId: appointment.id,
          newFechaHora: newIso,
          expectedUpdatedAt: appointment.updated_at ?? undefined,
          doctorId: (appointment as any).doctor_id ?? null,
          notasBreves: 'Reagendamiento de cita',
        },
        {
          onSuccess: () => {
            setShowReschedule(false);
            onAction?.('reschedule', appointment.id);
          },
        }
      );
    },
    [appointment, reschedule, onAction]
  );

  if (!dateTime) return null;

  return (
    <>
      <Card
        className={cn(
          'group relative overflow-hidden transition-all duration-200',
          'hover:shadow-lg hover:-translate-y-0.5',
          'border-l-4',
          statusConfig.borderClass,
          dateTime.isToday && 'ring-2 ring-sky-500/20',
          className
        )}
        data-testid="patient-card"
      >
        <CardContent className="p-3 sm:p-4 md:p-5">
          <Collapsible open={open} onOpenChange={setOpen}>
            {/* Header compacto */}
            <div className="flex items-start justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 text-left rounded-md p-1 -m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 touch-manipulation"
                  aria-expanded={open}
                  aria-controls={contentId}
                  aria-label={`Ver detalles de ${fullName}`}
                >
                  <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                    <AvatarFallback className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm sm:text-[15px] md:text-base text-gray-900 dark:text-gray-100 truncate" title={fullName}>
                      {fullName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                      <Badge variant="outline" className={cn('text-[10px] sm:text-xs font-medium', statusConfig.bgClass)}>
                        {statusConfig.label}
                      </Badge>
                      {appointment.es_primera_vez && <Badge variant="secondary" className="text-[10px] sm:text-xs">1ª vez</Badge>}
                      {dateTime.isToday && (
                        <Badge className="bg-sky-500 text-white border-0 text-[10px] sm:text-xs font-medium">HOY</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronDown className={cn('h-4 w-4 text-gray-500 transition-transform', open && 'rotate-180')} />
                </button>
              </CollapsibleTrigger>

              {/* Hora y menú */}
              <div className="flex items-center gap-1 sm:gap-2">
                <span
                  className={cn('inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium shadow-sm', timePillClass)}
                  title={dateTime.fullDate}
                  aria-label={`Hora de la cita: ${dateTime.time}`}
                >
                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                  {dateTime.time}
                </span>
                {!disableActions && (
                  <SecondaryActionsMenu actions={secondaryActions} onAction={handleAction} disabled={isBusy} />
                )}
              </div>
            </div>

            {/* Contenido expandible */}
            <CollapsibleContent id={contentId}>
              <div className="mt-3 space-y-3 md:space-y-0 md:grid md:grid-cols-6 md:gap-4">
                {/* Izquierda: info */}
                <div className="md:col-span-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span className="capitalize">{dateTime.fullDate}</span>
                    <span className="text-gray-400">•</span>
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{dateTime.time}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {patient?.diagnostico_principal && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs max-w-[240px] truncate">Dx: {dxLabel}</Badge>
                    )}
                  </div>

                  {prettyMotivos.length > 0 && (
                    <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <Stethoscope className="h-4 w-4 mt-0.5" />
                      <span className="line-clamp-1">{prettyMotivos.join(', ')}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                    {patient?.telefono && (
                      <a
                        href={`tel:${patient.telefono}`}
                        className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        aria-label={`Llamar al paciente ${fullName}`}
                      >
                        <Phone className="h-4 w-4" />
                        <span>{patient.telefono}</span>
                      </a>
                    )}
                    {patient?.email && (
                      <a
                        href={`mailto:${patient.email}`}
                        className="hidden sm:flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                        aria-label={`Enviar correo a ${patient.email}`}
                      >
                        <Mail className="h-4 w-4" />
                        <span className="truncate max-w-[180px]">{patient.email}</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Derecha: acción principal */}
                <div className="md:col-span-2 mt-3 md:mt-0">
                  {!disableActions && (
                    <PrimaryActionButton action={primaryAction as any} onClick={handleAction} isPending={isBusy} disabled={isPrimaryDisabled} />
                  )}
                </div>
              </div>

              {appointment.notas_breves && (
                <div className="p-2.5 sm:p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mt-3">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{appointment.notas_breves}</p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Diálogo de confirmación */}
      <AlertDialog open={!!confirmDialog} onOpenChange={(o) => !o && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog ? ACTION_CONFIG[confirmDialog].title : ''}</AlertDialogTitle>
            {confirmDialog && ACTION_CONFIG[confirmDialog].description && (
              <AlertDialogDescription>
                {ACTION_CONFIG[confirmDialog].description.replace('{name}', fullName)}
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={isBusy}
              className={cn(
                confirmDialog && ACTION_CONFIG[confirmDialog].variant === 'destructive' &&
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo informativo */}
      <AlertDialog open={!!infoDialog} onOpenChange={(o) => !o && setInfoDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {infoDialog?.kind === 'tooEarly'
                ? 'Check-in aún no disponible'
                : infoDialog?.kind === 'expired'
                  ? 'Ventana de check-in expirada'
                  : 'Acción no disponible'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {infoDialog?.message && <span className="block">{infoDialog.message}</span>}
              {infoDialog?.kind === 'tooEarly' && !infoDialog?.message && (
                <span className="block">El check-in se habilita 30 minutos antes de la cita.</span>
              )}
              {checkInWindow && infoDialog?.kind === 'expired' && (
                <span className="block text-sm text-muted-foreground">
                  Ventana de check-in: {formatMx(checkInWindow.start, 'HH:mm')} - {formatMx(checkInWindow.end, 'HH:mm')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {infoDialog?.kind === 'expired' && availableActions.includes('noShow') && (
              <AlertDialogAction
                onClick={() => {
                  setInfoDialog(null);
                  handleAction('noShow');
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                No Asistió
              </AlertDialogAction>
            )}
            {availableActions.includes('reschedule') && (
              <Button
                onClick={() => {
                  setInfoDialog(null);
                  handleAction('reschedule');
                }}
                variant="outline"
              >
                Reprogramar
              </Button>
            )}
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modales pesados (se montan solo cuando se necesitan) */}
      {showReschedule && (
        <RescheduleDatePicker appointment={appointment} onClose={() => setShowReschedule(false)} onReschedule={handleReschedule} />
      )}
      {showHistory && (
        <PatientHistoryModal patientId={appointment.patient_id} isOpen={showHistory} onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}

// Memo con comparación personalizada: evita rerenders cuando no cambian campos relevantes
const propsAreEqual = (prev: PatientCardProps, next: PatientCardProps) => {
  const pa = prev.appointment;
  const na = next.appointment;
  return (
    pa.id === na.id &&
    pa.estado_cita === na.estado_cita &&
    pa.fecha_hora_cita === na.fecha_hora_cita &&
    pa.notas_breves === na.notas_breves &&
    pa.es_primera_vez === na.es_primera_vez &&
    pa.patient_id === na.patient_id &&
    shallowEqualPatient(pa.patients, na.patients) &&
    prev.disableActions === next.disableActions &&
    prev.className === next.className &&
    prev.open === next.open &&
    prev.onAction === next.onAction &&
    prev.onOpenChange === next.onOpenChange
  );
};

const MemoizedPatientCard = memo(PatientCard, propsAreEqual);
MemoizedPatientCard.displayName = 'PatientCard';
export { MemoizedPatientCard as PatientCard };
export default MemoizedPatientCard;
