// patient-admission.tsx - VERSIÓN OPTIMIZADA
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
  CheckCircle,
  CalendarCheck,
  CalendarClock,
  History,
  UserRoundPlus,
  AlertCircle,
} from "lucide-react";

// Importaciones unificadas
import {
  AppointmentWithPatient,
  AppointmentAction,
  PatientAdmissionTab,
  TabConfig,
} from './types';

// Contexto y Hooks
import { useClinic } from '@/contexts/clinic-data-provider';
import { useUpdateAppointmentStatus } from '@/hooks/use-appointments';

// Utilidades centralizadas
import {
  isAppointmentToday,
  isAppointmentInPast,
  sortAppointmentsByDate
} from '@/lib/appointment-utils';

// Componentes especializados
import { AppointmentsList } from "./appointments-list";

// Componentes Lazy
const NewPatientForm = lazy(() => import("./new-patient-form"));
const RescheduleDatePicker = lazy(() => import("./patient-admission-reschedule"));

// ==================== CONFIGURACIÓN DE TABS ====================

const TABS_CONFIG: TabConfig[] = [
  { 
    value: "newPatient", 
    label: "Nuevo Paciente", 
    icon: UserRoundPlus, 
    shortLabel: "Nuevo" 
  },
  { 
    value: "today", 
    label: "Citas de Hoy", 
    icon: CalendarCheck, 
    shortLabel: "Hoy" 
  },
  { 
    value: "future", 
    label: "Próximas Citas", 
    icon: CalendarClock, 
    shortLabel: "Próximas" 
  },
  { 
    value: "past", 
    label: "Historial", 
    icon: History, 
    shortLabel: "Historial" 
  },
];

// ==================== TIPOS LOCALES ====================

interface ConfirmationAction {
  type: AppointmentAction;
  appointment: AppointmentWithPatient;
  label: string;
  description: string;
}

// ==================== COMPONENTES INTERNOS ====================

const TabNavigation = memo<{
  activeTab: PatientAdmissionTab;
  onTabChange: (tab: PatientAdmissionTab) => void;
  counts: Record<PatientAdmissionTab, number>;
  isLoading: boolean;
}>(({ activeTab, onTabChange, counts, isLoading }) => (
  <div className="grid grid-cols-4 gap-1 sm:gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.value === "newPatient" ? 0 : counts[tab.value];
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
              <Badge 
                variant="secondary" 
                className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs flex items-center justify-center"
              >
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

// ==================== COMPONENTE PRINCIPAL ====================

const PatientAdmission: React.FC = () => {
  // Estado local
  const [activeTab, setActiveTab] = useState<PatientAdmissionTab>("today");
  const [confirmAction, setConfirmAction] = useState<ConfirmationAction | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<AppointmentWithPatient | null>(null);

  // Hooks
  const { allAppointments, isLoading, error } = useClinic();
  const updateStatusMutation = useUpdateAppointmentStatus();

  // Clasificación de citas usando utilidades centralizadas
  const { appointmentsByDate, counts } = useMemo(() => {
    const today: AppointmentWithPatient[] = [];
    const future: AppointmentWithPatient[] = [];
    const past: AppointmentWithPatient[] = [];
    
    if (!allAppointments) {
      return {
        appointmentsByDate: { today, future, past },
        counts: { today: 0, future: 0, past: 0, newPatient: 0 }
      };
    }

    // Clasificación eficiente en un solo recorrido
    for (const appointment of allAppointments) {
      try {
        if (!appointment.fecha_hora_cita) continue;
        
        if (isAppointmentToday(appointment.fecha_hora_cita)) {
          today.push(appointment);
        } else if (isAppointmentInPast(appointment.fecha_hora_cita)) {
          past.push(appointment);
        } else {
          future.push(appointment);
        }
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error);
      }
    }

    // Ordenamiento optimizado
    sortAppointmentsByDate(today, 'asc');
    sortAppointmentsByDate(future, 'asc');
    sortAppointmentsByDate(past, 'desc');

    return {
      appointmentsByDate: { today, future, past },
      counts: {
        today: today.length,
        future: future.length,
        past: past.length,
        newPatient: 0
      }
    };
  }, [allAppointments]);

  // Handlers principales
  const handleUpdateStatus = useCallback((appointmentId: string, status: string) => {
    updateStatusMutation.mutate(
      { appointmentId, newStatus: status },
      {
        onSuccess: () => toast.success('Estado actualizado con éxito'),
        onError: () => toast.error('Error al actualizar el estado')
      }
    );
    setConfirmAction(null);
  }, [updateStatusMutation]);

  const handleAction = useCallback((action: AppointmentAction, appointment: AppointmentWithPatient) => {
    if (action === 'reschedule') {
      setRescheduleAppointment(appointment);
      return;
    }

    // Mapa de acciones para evitar lógica redundante
    const actionMap: Record<AppointmentAction, { label: string; description: string }> = {
      checkIn: { 
        label: 'Presente', 
        description: 'El paciente será marcado como presente en la consulta.' 
      },
      complete: { 
        label: 'Completada', 
        description: 'La consulta será marcada como finalizada.' 
      },
      cancel: { 
        label: 'Cancelada', 
        description: 'La cita será cancelada y liberará el horario.' 
      },
      noShow: { 
        label: 'No Asistió', 
        description: 'Se marcará que el paciente no se presentó a la cita.' 
      },
      reschedule: { label: '', description: '' } // Nunca se usa aquí
    };

    const config = actionMap[action];
    if (config) {
      setConfirmAction({
        type: action,
        appointment,
        label: config.label,
        description: config.description,
      });
    }
  }, []);

  const handleReschedule = useCallback((date: Date, time: string) => {
    if (!rescheduleAppointment) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    
    updateStatusMutation.mutate({
      appointmentId: rescheduleAppointment.id,
      newStatus: 'REAGENDADA',
      nuevaFechaHora: newDate.toISOString(),
    }, {
      onSuccess: () => toast.success('Cita reagendada con éxito'),
      onError: () => toast.error('Error al reagendar la cita')
    });
    
    setRescheduleAppointment(null);
  }, [rescheduleAppointment, updateStatusMutation]);

  // Mapa de estados para confirmación
  const statusMap: Record<AppointmentAction, string> = {
    checkIn: 'PRESENTE',
    complete: 'COMPLETADA',
    cancel: 'CANCELADA',
    noShow: 'NO_ASISTIO',
    reschedule: 'REAGENDADA'
  };

  // Renderizado condicional del contenido
  const renderContent = useMemo(() => {
    const emptyStates = {
      today: {
        title: "No hay citas para hoy",
        description: "Aquí aparecerán las citas programadas para el día de hoy.",
        icon: CalendarCheck,
      },
      future: {
        title: "No hay citas próximas",
        description: "Las citas futuras se mostrarán en esta sección.",
        icon: CalendarClock,
      },
      past: {
        title: "No hay historial de citas",
        description: "Las citas pasadas y completadas aparecerán aquí.",
        icon: History,
      }
    };

    switch (activeTab) {
      case 'newPatient':
        return (
          <Suspense fallback={<AppointmentListSkeleton />}>
            <NewPatientForm onSuccess={() => setActiveTab('today')} />
          </Suspense>
        );
      
      case 'today':
        return (
          <AppointmentsList
            appointments={appointmentsByDate.today}
            isLoading={isLoading}
            onAction={handleAction}
            emptyStateConfig={emptyStates.today}
          />
        );
      
      case 'future':
        return (
          <AppointmentsList
            appointments={appointmentsByDate.future}
            isLoading={isLoading}
            onAction={handleAction}
            emptyStateConfig={emptyStates.future}
          />
        );
      
      case 'past':
        return (
          <AppointmentsList
            appointments={appointmentsByDate.past}
            isLoading={isLoading}
            onAction={handleAction}
            emptyStateConfig={emptyStates.past}
          />
        );
      
      default:
        return null;
    }
  }, [activeTab, appointmentsByDate, isLoading, handleAction]);

  // Renderizado en caso de error
  if (error) {
    return (
      <EmptyState 
        icon={AlertCircle} 
        title="Error al cargar los datos" 
        description={error.message || "Ocurrió un problema al contactar al servidor. Inténtalo de nuevo."} 
      />
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[500px]">
      {/* Navegación de tabs */}
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        counts={counts}
        isLoading={isLoading} 
      />
      
      {/* Contenido principal */}
      <div className="flex-grow overflow-y-auto pr-1">
        {renderContent}
      </div>

      {/* Diálogos de confirmación */}
      {confirmAction && (
        <AlertDialog open onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                Confirmar Acción
              </AlertDialogTitle>
              <AlertDialogDescription className="text-base">
                ¿Estás seguro de que deseas marcar esta cita como{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {confirmAction.label}
                </span>
                ?
                <br />
                <span className="text-sm text-slate-600 dark:text-slate-400 mt-2 block">
                  {confirmAction.description}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => 
                  handleUpdateStatus(
                    confirmAction.appointment.id, 
                    statusMap[confirmAction.type]
                  )
                }
                className={cn(
                  confirmAction.type === 'cancel' || confirmAction.type === 'noShow'
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Diálogo de reagendamiento */}
      {rescheduleAppointment && (
        <Suspense fallback={<div className="fixed inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center"><AppointmentListSkeleton /></div>}>
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