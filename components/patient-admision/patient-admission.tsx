// patient-admission.tsx - Versión optimizada
import React, { 
  useState, 
  useCallback, 
  useMemo, 
  memo, 
  Suspense,
  lazy,
  startTransition
} from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  UserRoundPlus,
  CalendarCheck,
  CalendarClock,
  History,
  Calendar as CalendarBlank,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { useBreakpointStore } from "@/hooks/use-breakpoint";
import { toast } from "sonner";

// Lazy loading de componentes pesados para mejorar LCP
const AppointmentCard = lazy(() => import("./patient-card").then(module => ({ default: module.AppointmentCard })));
const RescheduleDatePicker = lazy(() => import('./patient-admission.reschedule').then(module => ({ default: module.RescheduleDatePicker })));
const NewPatientForm = lazy(() => import('./new-patient-form'));
const SurveyShareDialog = lazy(() => import('@/components/surveys/survey-share-dialog'));
const SurveySelector = lazy(() => import('@/components/surveys/survey-selector').then(module => ({ default: module.SurveySelector })));

import { usePatients } from "@/hooks/use-patients";
import { 
  ExtendedAppointment, 
  AppointmentStatusEnum, 
  Patient, 
  AppointmentStatus 
} from "@/lib/types";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";

// ==================== TIPOS OPTIMIZADOS ====================

type TabValue = "newPatient" | "today" | "future" | "past";
type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

// Tipo unificado y optimizado para citas
interface UnifiedAppointment {
  readonly id: string;
  readonly patientId: string;
  readonly fechaConsulta: Date;
  readonly horaConsulta: string;
  readonly estado: AppointmentStatus;
  readonly motivoConsulta: string;
  readonly notas?: string;
  readonly paciente: {
    readonly nombre: string;
    readonly apellidos: string;
    readonly telefono: string;
  } | string;
  readonly doctor: string;
  readonly esNuevoPaciente: boolean;
}

interface ConfirmDialogState {
  readonly isOpen: boolean;
  readonly action: ConfirmAction | null;
  readonly appointment: UnifiedAppointment | null;
}

interface SurveySelectorState {
  readonly isOpen: boolean;
  readonly data: {
    readonly patientId: string;
    readonly appointmentId: string;
    readonly patientName: string;
  } | null;
}

interface SurveyShareState {
  readonly isOpen: boolean;
  readonly data: {
    readonly patient: Patient;
    readonly surveyLink: string;
    readonly assignmentId: string;
  } | null;
}

interface RescheduleState {
  readonly selectedDate: Date | null;
  readonly selectedTime: string | null;
}

interface AppointmentCounts {
  readonly today: number;
  readonly future: number;
  readonly past: number;
}

// ==================== CONFIGURACIONES ESTÁTICAS ====================

const TABS_CONFIG = [
  { 
    value: "newPatient" as const, 
    label: "Nuevo Paciente", 
    icon: UserRoundPlus, 
    shortLabel: "Nuevo" 
  },
  { 
    value: "today" as const, 
    label: "Citas de Hoy", 
    icon: CalendarCheck, 
    shortLabel: "Hoy" 
  },
  { 
    value: "future" as const, 
    label: "Citas Futuras", 
    icon: CalendarClock, 
    shortLabel: "Futuras" 
  },
  { 
    value: "past" as const, 
    label: "Historial", 
    icon: History, 
    shortLabel: "Pasadas" 
  },
] as const;

const DIALOG_CONFIG = {
  checkIn: { 
    title: "Registrar Llegada", 
    description: "El paciente se marcará como presente.", 
    icon: CheckCircle 
  },
  cancel: { 
    title: "Cancelar Cita", 
    description: "Esta acción cancelará la cita. ¿Continuar?", 
    icon: XCircle 
  },
  complete: { 
    title: "Completar Consulta", 
    description: "La consulta se marcará como completada.", 
    icon: ClipboardCheck 
  },
  noShow: { 
    title: "Marcar No Asistió", 
    description: "Se registrará que el paciente no asistió.", 
    icon: AlertCircle 
  },
  reschedule: { 
    title: "Reagendar Cita", 
    description: "Seleccione la nueva fecha y hora.", 
    icon: CalendarDays 
  }
} as const;

const EMPTY_STATES = {
  today: {
    title: "No hay citas hoy",
    description: "No tienes citas programadas para hoy.",
    icon: CalendarCheck,
  },
  future: {
    title: "No hay citas futuras",
    description: "No tienes citas programadas para el futuro.",
    icon: CalendarClock,
  },
  past: {
    title: "No hay citas anteriores",
    description: "No tienes citas anteriores registradas.",
    icon: CalendarBlank,
  }
} as const;

// ==================== UTILIDADES OPTIMIZADAS ====================

// Cache con WeakMap para mejor gestión de memoria
const dateFormatCache = new WeakMap<Date, string>();

const formatDisplay = (date: Date | string): string => {
  if (!date) return "Fecha inválida";
  
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (isNaN(parsedDate.getTime())) return "Fecha inválida";
  
  // Usar WeakMap para caché más eficiente
  if (dateFormatCache.has(parsedDate)) {
    return dateFormatCache.get(parsedDate)!;
  }
  
  const formatted = parsedDate.toLocaleDateString("es-ES", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  });
  
  dateFormatCache.set(parsedDate, formatted);
  return formatted;
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Mapper optimizado con memoización
const mapAppointmentStatus = (status: string): AppointmentStatus => {
  const statusMap: Record<string, AppointmentStatus> = {
    'PENDING': AppointmentStatusEnum.PROGRAMADA,
    'PROGRAMADA': AppointmentStatusEnum.PROGRAMADA,
    'CONFIRMED': AppointmentStatusEnum.CONFIRMADA,
    'CONFIRMADA': AppointmentStatusEnum.CONFIRMADA,
    'IN_PROGRESS': AppointmentStatusEnum.PRESENTE,
    'PRESENTE': AppointmentStatusEnum.PRESENTE,
    'COMPLETED': AppointmentStatusEnum.COMPLETADA,
    'COMPLETADA': AppointmentStatusEnum.COMPLETADA,
    'CANCELED': AppointmentStatusEnum.CANCELADA,
    'CANCELADA': AppointmentStatusEnum.CANCELADA,
    'NO_SHOW': AppointmentStatusEnum.NO_ASISTIO,
    'NO ASISTIO': AppointmentStatusEnum.NO_ASISTIO,
    'RESCHEDULED': AppointmentStatusEnum.REAGENDADA,
    'REAGENDADA': AppointmentStatusEnum.REAGENDADA,
  };
  
  return statusMap[status] || AppointmentStatusEnum.PROGRAMADA;
};

// Adaptador optimizado
const adaptAppointmentData = (appointment: ExtendedAppointment): UnifiedAppointment => {
  const dateObj = new Date(appointment.fecha_hora_cita);
  const timeString = dateObj.toTimeString().slice(0, 5); // HH:MM format
  
  return {
    id: appointment.id,
    patientId: appointment.patient_id,
    fechaConsulta: dateObj,
    horaConsulta: timeString,
    estado: mapAppointmentStatus(appointment.estado_cita),
    motivoConsulta: appointment.motivo_cita,
    notas: appointment.notas_cita_seguimiento || undefined,
    paciente: typeof appointment.paciente === 'object' && appointment.paciente 
      ? {
          nombre: (appointment.paciente as any)?.nombre || '',
          apellidos: (appointment.paciente as any)?.apellidos || '',
          telefono: (appointment.paciente as any)?.telefono || ''
        }
      : appointment.patient_id,
    doctor: (appointment.doctor as any)?.nombre || '',
    esNuevoPaciente: appointment.es_primera_vez ?? false
  };
};

// ==================== HOOKS PERSONALIZADOS ====================

const useFilteredAppointments = (rawAppointments: ExtendedAppointment[]) => {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const result = {
      today: [] as UnifiedAppointment[],
      future: [] as UnifiedAppointment[],
      past: [] as UnifiedAppointment[],
    };

    if (!rawAppointments?.length) return result;

    // Procesar en lotes para mejor rendimiento
    const batchSize = 50;
    for (let i = 0; i < rawAppointments.length; i += batchSize) {
      const batch = rawAppointments.slice(i, i + batchSize);
      
      for (const appointment of batch) {
        try {
          const adaptedAppointment = adaptAppointmentData(appointment);
          const appointmentDate = new Date(adaptedAppointment.fechaConsulta);
          appointmentDate.setHours(0, 0, 0, 0);
          const appointmentTime = appointmentDate.getTime();

          if (appointmentTime === todayTime) {
            result.today.push(adaptedAppointment);
          } else if (appointmentTime > todayTime) {
            result.future.push(adaptedAppointment);
          } else {
            result.past.push(adaptedAppointment);
          }
        } catch (error) {
          console.error(`Error procesando cita ${appointment.id}:`, error);
        }
      }
    }

    // Ordenar optimizado
    const sortByTime = (a: UnifiedAppointment, b: UnifiedAppointment): number => {
      return a.horaConsulta.localeCompare(b.horaConsulta);
    };

    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a)); // Descendente para pasadas

    return result;
  }, [rawAppointments]);
};

// ==================== COMPONENTES OPTIMIZADOS ====================

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
));

const EmptyState = memo<{
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}>(({ title, description, icon: Icon }) => (
  <div className="text-center p-8 sm:p-16 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[300px] sm:min-h-[400px] flex flex-col items-center justify-center">
    <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 sm:mb-6">
      <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-500 dark:text-slate-400" />
    </div>
    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-2 sm:mb-3">
      {title}
    </h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed px-4">
      {description}
    </p>
  </div>
));

const AppointmentsList = memo<{
  appointments: UnifiedAppointment[];
  isLoading: boolean;
  emptyState: typeof EMPTY_STATES[keyof typeof EMPTY_STATES];
  onAction: (action: ConfirmAction, appointment: UnifiedAppointment) => void;
  onStartSurvey: (appointment: UnifiedAppointment) => void;
  onViewHistory: (patientId: string) => void;
}>(({ 
  appointments, 
  isLoading,
  emptyState,
  onAction,
  onStartSurvey,
  onViewHistory,
}) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!appointments?.length) {
    return <EmptyState {...emptyState} />;
  }
  
  return (
    <div className="space-y-3 sm:space-y-4">
      <Suspense fallback={<LoadingSpinner />}>
        {appointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            onAction={onAction}
            onStartSurvey={() => onStartSurvey(appointment)}
            onViewHistory={onViewHistory}
          />
        ))}
      </Suspense>
    </div>
  );
});

const MobileTabs = memo<{
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: AppointmentCounts;
  isLoading: boolean;
}>(({ 
  activeTab, 
  onTabChange, 
  appointmentCounts, 
  isLoading 
}) => (
  <div className="grid grid-cols-4 gap-1 sm:gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.value === "newPatient" ? 0 : appointmentCounts[tab.value];
      const isActive = activeTab === tab.value;
      
      return (
        <div key={tab.value} className="relative">
          <Button 
            variant={isActive ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-auto py-2 sm:py-3 px-1 sm:px-2 text-xs font-medium w-full transition-all duration-200",
              isActive 
                ? "bg-white dark:bg-slate-900 shadow-sm scale-105" 
                : "hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-102"
            )} 
            onClick={() => onTabChange(tab.value)}
            aria-label={`${tab.label} (${count} citas)`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate w-full text-[10px] sm:text-xs">
              {tab.shortLabel}
            </span>
          </Button>
          
          {tab.value !== "newPatient" && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-4 sm:h-5 min-w-[1rem] sm:min-w-[1.25rem] text-[9px] sm:text-[10px] px-1 rounded-full animate-in fade-in-0 zoom-in-95"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
      );
    })}
  </div>
));

// ==================== COMPONENTE PRINCIPAL ====================

const PatientAdmission: React.FC = () => {
  // React Query hooks
  const { data: appointmentsData, isLoading: isLoadingAppointments } = useAppointments(1, 100);
  const { data: patientsData } = usePatients(1, 100);
  const updateAppointmentStatusMutation = useUpdateAppointmentStatus();

  // Responsive hook
  const { mobile: isMobile } = useBreakpointStore();

  // Estados optimizados con valores iniciales inmutables
  const [activeTab, setActiveTab] = useState<TabValue>("today");
  
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    action: null,
    appointment: null
  });

  const [surveySelector, setSurveySelector] = useState<SurveySelectorState>({
    isOpen: false,
    data: null
  });
  
  const [surveyShare, setSurveyShare] = useState<SurveyShareState>({
    isOpen: false,
    data: null
  });
  
  const [rescheduleState, setRescheduleState] = useState<RescheduleState>({
    selectedDate: null,
    selectedTime: null
  });
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos derivados memoizados
  const rawAppointments = useMemo(() => 
    appointmentsData?.appointments || [], 
    [appointmentsData]
  );

  const filteredAppointments = useFilteredAppointments(rawAppointments);

  const currentAppointments = useMemo(() => {
    if (activeTab === "newPatient") return [];
    return filteredAppointments[activeTab] || [];
  }, [filteredAppointments, activeTab]);

  const appointmentCounts = useMemo((): AppointmentCounts => ({
    today: filteredAppointments.today.length,
    future: filteredAppointments.future.length,
    past: filteredAppointments.past.length
  }), [filteredAppointments]);

  // ==================== HANDLERS OPTIMIZADOS ====================

  const handleTabChange = useCallback((tab: TabValue) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  }, []);

  const handleAppointmentAction = useCallback((
    action: ConfirmAction, 
    appointment: UnifiedAppointment
  ) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointment
    });
  }, []);

  const handleStartSurvey = useCallback((appointment: UnifiedAppointment) => {
    if (!appointment?.patientId) return;
    
    const patientName = typeof appointment.paciente === 'string' 
      ? appointment.paciente 
      : `${appointment.paciente.nombre} ${appointment.paciente.apellidos}`.trim();
    
    setSurveySelector({
      isOpen: true,
      data: {
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        patientName
      }
    });
  }, []);

  const handleViewHistory = useCallback((patientId: string) => {
    if (!patientId) return;
    toast.info(`Ver historial del paciente ${patientId}`);
  }, []);

  const handleSurveyAssigned = useCallback((data: {
    patient: Patient;
    surveyLink: string;
    assignmentId: string;
  }) => {
    setSurveySelector({ isOpen: false, data: null });
    setSurveyShare({
      isOpen: true,
      data
    });
  }, []);

  const handleRescheduleStateChange = useCallback((
    partialState: Partial<RescheduleState>
  ) => {
    setRescheduleState(prevState => ({
      ...prevState,
      ...partialState
    }));
  }, []);

  const executeAppointmentAction = useCallback(() => {
    if (!confirmDialog.action || !confirmDialog.appointment) return;
    
    const { action, appointment } = confirmDialog;
    
    try {
      setIsProcessing(true);
      
      const statusMapping: Record<ConfirmAction, string> = {
        checkIn: "IN_PROGRESS",
        complete: "COMPLETED",
        cancel: "CANCELED",
        noShow: "NO_SHOW",
        reschedule: "RESCHEDULED"
      };
      
      const appointmentDate = action === "reschedule" && 
        rescheduleState.selectedDate && 
        rescheduleState.selectedTime
        ? new Date(`${formatDate(rescheduleState.selectedDate)} ${rescheduleState.selectedTime}`)
        : undefined;
      
      updateAppointmentStatusMutation.mutate({
        appointmentId: appointment.id,
        status: statusMapping[action],
        rescheduleDate: appointmentDate
      }, {
        onSuccess: () => {
          setConfirmDialog({ isOpen: false, action: null, appointment: null });
          if (action === "checkIn") {
            handleStartSurvey(appointment);
          }
          toast.success("Cita actualizada correctamente");
        },
        onError: (error: any) => {
          console.error("Error al actualizar estado:", error);
          toast.error("No se pudo actualizar la cita. Intente nuevamente.");
        },
        onSettled: () => {
          setIsProcessing(false);
        }
      });
    } catch (error) {
      console.error("Error al procesar acción:", error);
      toast.error("Error al procesar la acción. Intente nuevamente.");
      setIsProcessing(false);
    }
  }, [
    confirmDialog, 
    rescheduleState, 
    updateAppointmentStatusMutation, 
    handleStartSurvey
  ]);

  const handleDialogClose = useCallback((open: boolean) => {
    if (!open) {
      setConfirmDialog({ isOpen: false, action: null, appointment: null });
      if (confirmDialog.action === "reschedule") {
        setRescheduleState({ selectedDate: null, selectedTime: null });
      }
    }
  }, [confirmDialog.action]);

  // ==================== RENDER ====================

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 min-h-screen">
      <Card className="w-full overflow-hidden shadow-lg sm:shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
                Admisión de Pacientes
              </h1>
            </div>
            
            {/* Main Content */}
            <div className="p-3 sm:p-6">
              {isMobile && (
                <MobileTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  appointmentCounts={appointmentCounts}
                  isLoading={isLoadingAppointments}
                />
              )}
              
              {/* Content Area */}
              <div className="mt-4 sm:mt-6">
                {isMobile ? (
                  activeTab === "newPatient" ? (
                    <Card className="border-slate-200 dark:border-slate-700">
                      <CardContent className="p-4 sm:p-6">
                        <Suspense fallback={<LoadingSpinner />}>
                          <NewPatientForm />
                        </Suspense>
                      </CardContent>
                    </Card>
                  ) : (
                    <AppointmentsList
                      appointments={currentAppointments}
                      isLoading={isLoadingAppointments}
                      emptyState={EMPTY_STATES[activeTab as keyof typeof EMPTY_STATES]}
                      onAction={handleAppointmentAction}
                      onStartSurvey={handleStartSurvey}
                      onViewHistory={handleViewHistory}
                    />
                  )
                ) : (
                  <Tabs 
                    value={activeTab} 
                    onValueChange={handleTabChange} 
                    className="w-full"
                  >
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
                      {TABS_CONFIG.map((tab) => (
                        <TabsTrigger 
                          key={tab.value} 
                          value={tab.value} 
                          className="flex items-center gap-2 text-sm"
                        >
                          <tab.icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                          <span className="sm:hidden">{tab.shortLabel}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="newPatient" className="mt-6">
                      <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                          <Suspense fallback={<LoadingSpinner />}>
                            <NewPatientForm />
                          </Suspense>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {(["today", "future", "past"] as const).map((tab) => (
                      <TabsContent key={tab} value={tab} className="space-y-4">
                        <AppointmentsList
                          appointments={filteredAppointments[tab]}
                          isLoading={isLoadingAppointments}
                          emptyState={EMPTY_STATES[tab]}
                          onAction={handleAppointmentAction}
                          onStartSurvey={handleStartSurvey}
                          onViewHistory={handleViewHistory}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs con Suspense para mejorar LCP */}
      <Suspense fallback={null}>
        {surveySelector.isOpen && surveySelector.data && (
          <SurveySelector
            isOpen={surveySelector.isOpen}
            {...surveySelector.data}
            onClose={() => setSurveySelector({ isOpen: false, data: null })}
            onSurveyAssigned={handleSurveyAssigned}
          />
        )}
      </Suspense>
      
      <Suspense fallback={null}>
        {surveyShare.isOpen && surveyShare.data && (
          <SurveyShareDialog
            isOpen={surveyShare.isOpen}
            patient={surveyShare.data.patient}
            surveyLink={surveyShare.data.surveyLink}
            onClose={() => setSurveyShare({ isOpen: false, data: null })}
            onStartInternal={() => {
              setSurveyShare({ isOpen: false, data: null });
              toast.info("Iniciando encuesta internamente");
            }}
          />
        )}
      </Suspense>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={handleDialogClose}>
        <AlertDialogContent className="sm:max-w-2xl max-w-[95vw]">
          {confirmDialog.action && confirmDialog.appointment && (() => {
            const dialogConfig = DIALOG_CONFIG[confirmDialog.action];
            const Icon = dialogConfig.icon;
            const appointment = confirmDialog.appointment;
            
            return (
              <>
                <AlertDialogHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0",
                      {
                        "bg-red-100 dark:bg-red-900/50": confirmDialog.action === "cancel",
                        "bg-green-100 dark:bg-green-900/50": confirmDialog.action === "complete",
                        "bg-amber-100 dark:bg-amber-900/50": confirmDialog.action === "noShow",
                        "bg-blue-100 dark:bg-blue-900/50": !["cancel", "complete", "noShow"].includes(confirmDialog.action)
                      }
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 sm:h-6 sm:w-6",
                        {
                          "text-red-600": confirmDialog.action === "cancel",
                          "text-green-600": confirmDialog.action === "complete",
                          "text-amber-600": confirmDialog.action === "noShow",
                          "text-blue-600": !["cancel", "complete", "noShow"].includes(confirmDialog.action)
                        }
                      )} />
                    </div>
                    
                    <AlertDialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                      {dialogConfig.title}
                    </AlertDialogTitle>
                  </div>
                  
                  <AlertDialogDescription asChild>
                    <div className="pt-2 space-y-4 text-sm">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="font-semibold mb-3 text-slate-900 dark:text-slate-100">
                          {typeof appointment.paciente === 'string' 
                            ? appointment.paciente 
                            : `${appointment.paciente.nombre} ${appointment.paciente.apellidos}`.trim()
                          }
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {formatDisplay(appointment.fechaConsulta)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>{appointment.horaConsulta || "Sin hora"}</span>
                          </div>
                        </div>
                      </div>
                      
                      {confirmDialog.action === "reschedule" ? (
                        <Suspense fallback={<LoadingSpinner />}>
                          <RescheduleDatePicker
                            rescheduleState={rescheduleState}
                            onStateChange={handleRescheduleStateChange}
                          />
                        </Suspense>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                          {dialogConfig.description}
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter className="mt-6 gap-2">
                  <AlertDialogCancel disabled={isProcessing}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={executeAppointmentAction}
                    disabled={
                      isProcessing ||
                      (confirmDialog.action === "reschedule" && 
                       (!rescheduleState.selectedDate || !rescheduleState.selectedTime))
                    }
                    className={cn(
                      "min-w-[100px]",
                      {
                        "bg-red-600 hover:bg-red-700 text-white": confirmDialog.action === "cancel",
                        "bg-green-600 hover:bg-green-700 text-white": confirmDialog.action === "complete",
                        "bg-amber-600 hover:bg-amber-700 text-white": confirmDialog.action === "noShow"
                      }
                    )}
                  >
                    {isProcessing ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      "Confirmar"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default memo(PatientAdmission);