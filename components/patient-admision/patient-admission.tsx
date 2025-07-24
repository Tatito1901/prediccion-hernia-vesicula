// patient-admission.tsx - VERSIÓN FINAL ESTABLE
import React, { 
  useState, 
  useCallback, 
  memo, 
  Suspense,
  lazy,
  useMemo
} from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { AppointmentListSkeleton } from "@/components/ui/unified-skeletons";
import { EmptyState } from "@/components/ui/empty-state";

// Icons
import {
  Calendar,
  CheckCircle,
  XCircle,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  UserRoundPlus,
  CalendarCheck,
  CalendarClock,
  History,
} from "lucide-react";

// Types - Se importa lo que existe, se define localmente lo que no
import { 
  AppointmentStatus, 
  ExtendedAppointment,
  AppointmentStatusEnum,
} from '@/lib/types';

// Contexto y Hooks
import { useClinic } from '@/contexts/clinic-data-provider';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';
import { convertUtcToLocal, isTodayLocal, isFutureLocal, formatTime } from '@/lib/date-utils';

// Componentes Lazy
const NewPatientForm = lazy(() => import("./new-patient-form"));
const RescheduleDatePicker = lazy(() => import("./patient-admission-reschedule"));

// ==================== TIPOS LOCALES Y CONFIGURACIONES ====================
// ✅ SOLUCIÓN: Definir el tipo Normalizado aquí, ya que es para este componente.
// Es simplemente un alias para ExtendedAppointment para mantener la claridad.
type NormalizedAppointment = ExtendedAppointment;

const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Citas de Hoy", icon: CalendarCheck, shortLabel: "Hoy" },
  { value: "future" as const, label: "Próximas Citas", icon: CalendarClock, shortLabel: "Próximas" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Historial" },
] as const;

const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: { label: "Programada", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Calendar },
  [AppointmentStatusEnum.PRESENTE]: { label: "Presente", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle },
  [AppointmentStatusEnum.COMPLETADA]: { label: "Completada", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200", icon: ClipboardCheck },
  [AppointmentStatusEnum.CANCELADA]: { label: "Cancelada", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: XCircle },
  [AppointmentStatusEnum.NO_ASISTIO]: { label: "No asistió", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200", icon: AlertCircle },
  [AppointmentStatusEnum.REAGENDADA]: { label: "Reagendada", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", icon: CalendarDays },
} as const;

type TabValue = typeof TABS_CONFIG[number]['value'];
type ConfirmAction = { type: 'checkIn' | 'complete' | 'cancel' | 'noShow'; appointment: NormalizedAppointment };
type AppointmentCounts = { today: number; future: number; past: number; };

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================
const AppointmentCard = memo<{
  appointment: NormalizedAppointment;
  onCheckIn: (appointment: NormalizedAppointment) => void;
  onComplete: (appointment: NormalizedAppointment) => void;
  onCancel: (appointment: NormalizedAppointment) => void;
  onNoShow: (appointment: NormalizedAppointment) => void;
  onReschedule: (appointment: NormalizedAppointment) => void;
}>(({ appointment, onCheckIn, onComplete, onCancel, onNoShow, onReschedule }) => {
  const statusConfig = STATUS_CONFIG[appointment.estado_cita] || STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
  const StatusIcon = statusConfig.icon;

  const canCheckIn = appointment.estado_cita === AppointmentStatusEnum.PROGRAMADA;
  const canComplete = appointment.estado_cita === AppointmentStatusEnum.PRESENTE;
  const canModify = [AppointmentStatusEnum.PROGRAMADA, AppointmentStatusEnum.PRESENTE].includes(appointment.estado_cita);

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {appointment.patients?.nombre} {appointment.patients?.apellidos}
              </h3>
              {appointment.es_primera_vez && (
                <Badge variant="secondary" className="text-xs">Nuevo</Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {/* ✅ SOLUCIÓN: Usar formatTime con la fecha UTC directamente */}
              {formatTime(convertUtcToLocal(appointment.fecha_hora_cita))} • {appointment.motivo_cita}
            </p>
            <p className="text-xs text-gray-500">
              {appointment.patients?.telefono || 'Sin teléfono'} • Estado: {appointment.estado_cita}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={cn("text-xs", statusConfig.className)}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {appointment.notas_cita_seguimiento && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
            <strong>Notas:</strong> {appointment.notas_cita_seguimiento}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          {canCheckIn && <Button size="sm" onClick={() => onCheckIn(appointment)} className="flex-1 min-w-0"><CheckCircle className="w-4 h-4 mr-1" />Check-in</Button>}
          {canComplete && <Button size="sm" variant="outline" onClick={() => onComplete(appointment)} className="flex-1 min-w-0"><ClipboardCheck className="w-4 h-4 mr-1" />Completar</Button>}
          {canModify && (
            <>
              <Button size="sm" variant="outline" onClick={() => onReschedule(appointment)}><CalendarDays className="w-4 h-4 mr-1" />Reagendar</Button>
              <Button size="sm" variant="outline" onClick={() => onCancel(appointment)}><XCircle className="w-4 h-4 mr-1" />Cancelar</Button>
              <Button size="sm" variant="outline" onClick={() => onNoShow(appointment)}><AlertCircle className="w-4 h-4 mr-1" />No asistió</Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
AppointmentCard.displayName = "AppointmentCard";

const TabNavigation = memo<{
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: AppointmentCounts;
  isLoading: boolean;
}>(({ activeTab, onTabChange, appointmentCounts, isLoading }) => (
  <div className="grid grid-cols-4 gap-1 sm:gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.value === "newPatient" ? 0 : appointmentCounts[tab.value];
      const isActive = activeTab === tab.value;

      return (
        <button
          key={tab.value}
          onClick={() => onTabChange(tab.value)}
          className={cn(
            "flex flex-col items-center gap-1 p-2 sm:p-3 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium",
            isActive
              ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-700/50"
          )}
        >
          <div className="relative">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
            {tab.value !== "newPatient" && (
              <Badge variant="secondary" className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center">
                {isLoading ? "..." : count}
              </Badge>
            )}
          </div>
          <span className="hidden sm:block">{tab.label}</span>
          <span className="sm:hidden">{tab.shortLabel}</span>
        </button>
      );
    })}
  </div>
));
TabNavigation.displayName = "TabNavigation";

const AppointmentsList = memo<{
  appointments: NormalizedAppointment[];
  isLoading: boolean;
  emptyState: React.ReactNode;
  onCheckIn: (appointment: NormalizedAppointment) => void;
  onComplete: (appointment: NormalizedAppointment) => void;
  onCancel: (appointment: NormalizedAppointment) => void;
  onNoShow: (appointment: NormalizedAppointment) => void;
  onReschedule: (appointment: NormalizedAppointment) => void;
}>(({ appointments, isLoading, emptyState, ...handlers }) => {
  if (isLoading) {
    return <AppointmentListSkeleton />;
  }

  if (appointments.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} {...handlers} />
      ))}
    </div>
  );
});
AppointmentsList.displayName = "AppointmentsList";

// ==================== COMPONENTE PRINCIPAL ====================
const PatientAdmission: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("today");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<NormalizedAppointment | null>(null);

  const { allAppointments, isLoading, error } = useClinic();
  const updateStatusMutation = useUpdateAppointmentStatus();

  const appointmentsByDate = useMemo(() => {
    if (!allAppointments) {
      return { today: [], future: [], past: [] };
    }
    const today: NormalizedAppointment[] = [];
    const future: NormalizedAppointment[] = [];
    const past: NormalizedAppointment[] = [];

    allAppointments.forEach(appointment => {
      const localDate = convertUtcToLocal(appointment.fecha_hora_cita);
      if (isTodayLocal(localDate)) {
        today.push(appointment);
      } else if (isFutureLocal(localDate)) {
        future.push(appointment);
      } else {
        past.push(appointment);
      }
    });
    return { today, future, past };
  }, [allAppointments]);

  const handleUpdateStatus = useCallback((appointmentId: string, status: AppointmentStatus) => {
    toast.promise(updateStatusMutation.mutateAsync({ appointmentId, newStatus: status }), {
      loading: 'Actualizando estado...', 
      success: 'Estado actualizado con éxito.',
      error: 'Error al actualizar el estado.',
    });
    setConfirmAction(null);
  }, [updateStatusMutation]);

  const handleReschedule = useCallback((appointment: NormalizedAppointment, newDate: Date) => {
    toast.promise(
      updateStatusMutation.mutateAsync({
        appointmentId: appointment.id,
        newStatus: AppointmentStatusEnum.REAGENDADA,
        nuevaFechaHora: newDate.toISOString(),
      }),
      {
        loading: 'Reagendando cita...',
        success: 'Cita reagendada con éxito.',
        error: 'Error al reagendar la cita.',
      }
    );
    setRescheduleAppointment(null);
  }, [updateStatusMutation]);

  const actionHandlers = {
    onCheckIn: (appt: NormalizedAppointment) => setConfirmAction({ type: 'checkIn', appointment: appt }),
    onComplete: (appt: NormalizedAppointment) => setConfirmAction({ type: 'complete', appointment: appt }),
    onCancel: (appt: NormalizedAppointment) => setConfirmAction({ type: 'cancel', appointment: appt }),
    onNoShow: (appt: NormalizedAppointment) => setConfirmAction({ type: 'noShow', appointment: appt }),
    onReschedule: (appt: NormalizedAppointment) => setRescheduleAppointment(appt),
  };

  const appointmentCounts = useMemo(() => ({
    today: appointmentsByDate.today.length,
    future: appointmentsByDate.future.length,
    past: appointmentsByDate.past.length,
  }), [appointmentsByDate]);

  const renderContent = () => {
    switch (activeTab) {
      case 'newPatient':
        return <Suspense fallback={<AppointmentListSkeleton />}><NewPatientForm /></Suspense>;
      case 'today':
        return <AppointmentsList appointments={appointmentsByDate.today} isLoading={isLoading} emptyState={<EmptyState icon={CalendarCheck} title="No hay citas para hoy" description="Aquí aparecerán las citas programadas para el día de hoy." />} {...actionHandlers} />;
      case 'future':
        return <AppointmentsList appointments={appointmentsByDate.future} isLoading={isLoading} emptyState={<EmptyState icon={CalendarClock} title="No hay citas próximas" description="Las citas futuras se mostrarán en esta sección." />} {...actionHandlers} />;
      case 'past':
        return <AppointmentsList appointments={appointmentsByDate.past} isLoading={isLoading} emptyState={<EmptyState icon={History} title="No hay historial de citas" description="Las citas pasadas y completadas aparecerán aquí." />} {...actionHandlers} />;
      default:
        return null;
    }
  };

  if (error) {
    return <EmptyState icon={AlertCircle} title="Error al cargar los datos" description={error.message || "Ocurrió un problema al contactar al servidor. Inténtalo de nuevo."} />;
  }

  return (
    <div className="flex flex-col h-full">
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab)} 
        appointmentCounts={appointmentCounts} 
        isLoading={isLoading} 
      />
      <div className="flex-grow overflow-y-auto pr-2">
        {renderContent()}
      </div>

      {confirmAction && (
        <AlertDialog open onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Acción</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que deseas marcar esta cita como {'"'}
                {confirmAction.type === 'checkIn' && 'Presente'}
                {confirmAction.type === 'complete' && 'Completada'}
                {confirmAction.type === 'cancel' && 'Cancelada'}
                {confirmAction.type === 'noShow' && 'No Asistió'}
                {'"'}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                const statusMap = {
                  checkIn: AppointmentStatusEnum.PRESENTE,
                  complete: AppointmentStatusEnum.COMPLETADA,
                  cancel: AppointmentStatusEnum.CANCELADA,
                  noShow: AppointmentStatusEnum.NO_ASISTIO,
                };
                handleUpdateStatus(confirmAction.appointment.id, statusMap[confirmAction.type]);
              }}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {rescheduleAppointment && (
        <Suspense fallback={<div />}>
          <RescheduleDatePicker
            appointment={rescheduleAppointment}
            onClose={() => setRescheduleAppointment(null)}
            onReschedule={handleReschedule}
          />
        </Suspense>
      )}
    </div>
  );
};

const MemoizedPatientAdmission = memo(PatientAdmission);
MemoizedPatientAdmission.displayName = "PatientAdmission";

export default MemoizedPatientAdmission;
