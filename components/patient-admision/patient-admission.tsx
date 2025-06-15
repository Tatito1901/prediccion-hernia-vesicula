// PatientAdmission.tsx - Versión optimizada y mejorada
import React, { 
  useState, 
  useMemo, 
  useCallback, 
  memo,
  Suspense,
  lazy,
} from "react";
import {
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  RefreshCcw,
  X,
  ChevronDown,
  UserRoundPlus,
  CalendarRange,
  History,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useBreakpointStore } from "@/hooks/use-breakpoint";
import { toast } from "sonner";

// Imports de componentes específicos
import { AppointmentCard } from "./patient-card";
import { usePatientStore } from "@/lib/stores/patient-store";
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import { useSurveyStore } from "@/lib/stores/survey-store";
import { usePatientAdmissionFlow } from "./use-patient-admission-flow";
import {
  AppointmentStatusEnum,
  type AppointmentData,
  type AppointmentStatus,
} from "@/app/dashboard/data-model";
import { FilterControls, type FilterState, STATUS_CONFIG } from "./filter-controls";

// Lazy loading optimizado con mejor splitting
const RescheduleDatePicker = lazy(() => 
  import('./patient-admission.reschedule').then(m => ({ default: m.RescheduleDatePicker }))
);
const NewPatientForm = lazy(() => 
  import('./new-patient-form').then(m => ({ default: m.NewPatientForm }))
);
const SurveyShareDialog = lazy(() => 
  import('@/components/surveys/survey-share-dialog').then(m => ({ default: m.SurveyShareDialog }))
);
const SurveySelector = lazy(() => 
  import('@/components/surveys/survey-selector').then(m => ({ default: m.SurveySelector }))
);

// ============================================================================
// TIPOS OPTIMIZADOS Y CONSOLIDADOS
// ============================================================================
type TabValue = "newPatient" | "today" | "future" | "past";
type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

// Interfaz optimizada para citas
interface OptimizedAppointment {
  readonly id: string;
  readonly nombre: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly fechaConsulta: Date;
  readonly horaConsulta: string;
  readonly dateTime: Date;
  readonly motivoConsulta: string;
  readonly estado: AppointmentStatusEnum;
  readonly paciente: string;
  readonly doctor: string;
  readonly patientId?: string;
}

const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Hoy", icon: Clock, shortLabel: "Hoy" },
  { value: "future" as const, label: "Futuras", icon: Calendar, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Historial" },
] as const;

const DIALOG_CONFIG = {
  checkIn: { title: "Registrar Llegada", description: "El paciente se marcará como presente.", icon: CheckCircle },
  cancel: { title: "Cancelar Cita", description: "Esta acción cancelará la cita. ¿Continuar?", icon: XCircle },
  complete: { title: "Completar Consulta", description: "La consulta se marcará como completada.", icon: ClipboardCheck },
  noShow: { title: "Marcar No Asistió", description: "Se registrará que el paciente no asistió.", icon: AlertCircle },
  reschedule: { title: "Reagendar Cita", description: "Seleccione la nueva fecha y hora.", icon: CalendarDays }
} as const;

// Estado consolidado para diálogos
interface DialogState {
  readonly confirmDialog: {
    isOpen: boolean;
    action: ConfirmAction | null;
    appointmentId: string | null;
    appointmentData: OptimizedAppointment | null;
  };
  readonly surveySelector: {
    isOpen: boolean;
    patientId: string;
    appointmentId: string;
    patientName: string;
  };
  readonly surveyShare: {
    isOpen: boolean;
    patientId: string;
    patientName: string;
    patientLastName: string;
    patientPhone: string;
    surveyLink: string;
    assignmentId: string;
  };
  readonly reschedule: {
    appointmentId: string | null;
    date: Date | null;
    time: string | null;
  };
}

// ============================================================================
// UTILIDADES OPTIMIZADAS
// ============================================================================
const parseToDate = (dateInput: unknown): Date | null => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;
  
  const date = new Date(String(dateInput));
  return isNaN(date.getTime()) ? null : date;
};

const formatDisplay = (date: Date | string | null | undefined): string => {
  const parsedDate = parseToDate(date);
  return parsedDate?.toLocaleDateString("es-ES", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  }) || "Fecha inválida";
};

// Función optimizada para adaptar datos de cita
const adaptAppointmentData = (appointment: AppointmentData): OptimizedAppointment => {
  const nombreCompleto = appointment.paciente?.trim() || "";
  const [nombre = "N/A", ...apellidosParts] = nombreCompleto.split(" ");
  const apellidos = apellidosParts.join(" ");
  
  const fecha = parseToDate(appointment.fechaConsulta) || new Date();
  const hora = /^\d{2}:\d{2}$/.test(appointment.horaConsulta || "") 
    ? appointment.horaConsulta 
    : "00:00";
  
  const combinedDateTime = new Date(fecha.getTime());
  const [hours, minutes] = hora.split(":").map(Number);
  combinedDateTime.setHours(hours, minutes, 0, 0);
  
  return {
    id: appointment.id,
    nombre,
    apellidos,
    telefono: appointment.telefono || "N/A",
    fechaConsulta: fecha,
    horaConsulta: hora,
    dateTime: combinedDateTime,
    motivoConsulta: appointment.motivoConsulta || "N/A",
    paciente: appointment.paciente || '',
    doctor: appointment.doctor || '',
    patientId: appointment.patientId,
    estado: appointment.estado as AppointmentStatusEnum,
  };
};

// ============================================================================
// COMPONENTES UI OPTIMIZADOS
// ============================================================================
const LoadingSkeleton = memo(() => (
  <div className="space-y-4" role="status" aria-label="Cargando citas">
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="p-4 shadow-sm">
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        </div>
      </Card>
    ))}
  </div>
));

LoadingSkeleton.displayName = "LoadingSkeleton";

// Error Boundary para componentes lazy
class LazyComponentErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { hasError: boolean }
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyComponentErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center">
          <p className="text-red-600">Error al cargar el componente. Por favor, recarga la página.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const EmptyState = memo(({ title, description, icon: IconComponent }: EmptyStateProps) => (
  <div className="text-center p-16 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center">
    <div className="relative mb-6">
      <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <IconComponent className="h-10 w-10 text-slate-500 dark:text-slate-400" />
      </div>
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

interface AppointmentsListProps {
  appointments: OptimizedAppointment[];
  isLoading: boolean;
  emptyState: EmptyStateProps;
  onAction: (action: ConfirmAction, id: string, appointment: OptimizedAppointment) => void;
  onStartSurvey: (appointmentId: string, patientId?: string, appointment?: OptimizedAppointment) => void;
  onViewHistory: (patientId: string) => void;
}

const AppointmentsList = memo(({ 
  appointments, 
  isLoading,
  emptyState,
  onAction,
  onStartSurvey,
  onViewHistory,
}: AppointmentsListProps) => {
  if (isLoading) return <LoadingSkeleton />;
  
  if (!appointments?.length) {
    return (
      <EmptyState
        title={emptyState.title}
        description={emptyState.description}
        icon={emptyState.icon}
      />
    );
  }
  
  return (
    <div className="space-y-4 dark:space-y-6">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onAction={onAction}
          onStartSurvey={onStartSurvey}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
});

AppointmentsList.displayName = "AppointmentsList";

interface MobileTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: { today: number; future: number; past: number };
  isLoading: boolean;
}

const MobileTabs = memo(({ 
  activeTab, 
  onTabChange, 
  appointmentCounts, 
  isLoading 
}: MobileTabsProps) => (
  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab: typeof TABS_CONFIG[number]) => {
      const Icon = tab.icon;
      const count = tab.value === "today" ? appointmentCounts.today : 
                    tab.value === "future" ? appointmentCounts.future : 
                    tab.value === "past" ? appointmentCounts.past : 0;
      const isActive = activeTab === tab.value;
      
      return (
        <div key={tab.value} className="relative">
          <Button 
            variant={isActive ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full",
              isActive 
                ? "bg-white dark:bg-slate-900 shadow-sm" 
                : "hover:bg-slate-200 dark:hover:bg-slate-700"
            )} 
            onClick={() => onTabChange(tab.value)}
            aria-label={`${tab.label}${tab.value !== "newPatient" && count > 0 ? ` (${count} citas)` : ""}`}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full">{tab.shortLabel}</span>
          </Button>
          
          {tab.value !== "newPatient" && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full bg-slate-700 text-white"
              aria-hidden="true"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
      );
    })}
  </div>
));

MobileTabs.displayName = "MobileTabs";

// ============================================================================
// HOOKS OPTIMIZADOS
// ============================================================================
const useAppointmentCategorization = (appointments: AppointmentData[] | undefined) => {
  return useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const result = {
      today: [] as OptimizedAppointment[],
      future: [] as OptimizedAppointment[],
      past: [] as OptimizedAppointment[],
    };

    if (!appointments) return result;

    appointments.forEach(rawAppointment => {
      const date = parseToDate(rawAppointment.fechaConsulta);
      if (!date) return;

      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);

      const adapted = adaptAppointmentData(rawAppointment);

      if (compareDate.getTime() === todayDate.getTime()) {
        result.today.push(adapted);
      } else if (compareDate > todayDate) {
        result.future.push(adapted);
      } else {
        result.past.push(adapted);
      }
    });

    return result;
  }, [appointments]);
};

const useFilteredAppointments = (
  categorizedAppointments: {
    today: OptimizedAppointment[];
    future: OptimizedAppointment[];
    past: OptimizedAppointment[];
  },
  filters: FilterState
) => {
  const applyFilters = useCallback((appointmentsToFilter: OptimizedAppointment[]) => {
    let result = appointmentsToFilter;
    const searchLower = filters.searchTerm.toLowerCase().trim();

    if (searchLower) {
      result = result.filter(appointment => {
        const fullName = `${appointment.nombre} ${appointment.apellidos}`.toLowerCase();
        const patientNameInCard = appointment.paciente.toLowerCase();
        return fullName.includes(searchLower) || patientNameInCard.includes(searchLower);
      });
    }

    if (filters.statusFilter !== "all") {
      result = result.filter(appointment => appointment.estado === filters.statusFilter);
    }

    return result;
  }, [filters.searchTerm, filters.statusFilter]);

  return useMemo(() => ({
    today: applyFilters(categorizedAppointments.today),
    future: applyFilters(categorizedAppointments.future),
    past: applyFilters(categorizedAppointments.past),
  }), [categorizedAppointments, applyFilters]);
};

// ============================================================================
// COMPONENTE PRINCIPAL OPTIMIZADO
// ============================================================================
export default function PatientAdmission() {
  const {
    appointments,
    isLoading: isLoadingAppointments,
    activeTab,
    setActiveTab,
    refetchAppointments,
  } = usePatientAdmissionFlow();

  const { patients } = usePatientStore();
  const { updateAppointmentStatus } = useAppointmentStore();
  const { mobile: isMobile } = useBreakpointStore();

  // Estados consolidados
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all"
  });

  const [dialogState, setDialogState] = useState<DialogState>({
    confirmDialog: {
      isOpen: false,
      action: null,
      appointmentId: null,
      appointmentData: null
    },
    surveySelector: {
      isOpen: false,
      patientId: "",
      appointmentId: "",
      patientName: "",
    },
    surveyShare: {
      isOpen: false,
      patientId: "",
      patientName: "",
      patientLastName: "",
      patientPhone: "",
      surveyLink: "",
      assignmentId: "",
    },
    reschedule: {
      appointmentId: null,
      date: null,
      time: null
    }
  });

  const handleClearFilters = useCallback(() => {
    setFilters({ searchTerm: "", statusFilter: "all" });
  }, []);

  // Hooks optimizados
  const categorizedAppointments = useAppointmentCategorization(appointments);
  const filteredAppointments = useFilteredAppointments(categorizedAppointments, filters);

  // Cálculo optimizado de conteos
  const appointmentCounts = useMemo(() => ({
    today: categorizedAppointments.today.length,
    future: categorizedAppointments.future.length,
    past: categorizedAppointments.past.length
  }), [categorizedAppointments]);

  // Callbacks optimizados
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleOpenSurveySelector = useCallback((appointment: OptimizedAppointment) => {
    const patient = patients?.find(p => p.id === (appointment.patientId || appointment.id));
    
    if (!patient) {
      toast.error("No se encontró el paciente para esta cita.");
      return;
    }
    
    setDialogState(prev => ({
      ...prev,
      surveySelector: {
        isOpen: true,
        patientId: patient.id,
        appointmentId: appointment.id,
        patientName: `${patient.nombre || ''} ${patient.apellidos || ''}`,
      }
    }));
  }, [patients]);

  const handleSurveyAssigned = useCallback((assignmentId: string, surveyId: string) => {
    setDialogState(prev => ({
      ...prev,
      surveySelector: { ...prev.surveySelector, isOpen: false }
    }));
    
    const patientId = dialogState.surveySelector.patientId;
    const patient = patients?.find(p => p.id === patientId);
    
    if (!patient) {
      toast.error("No se pudo recuperar la información del paciente");
      return;
    }
    
    const { getAssignmentById } = useSurveyStore.getState();
    const assignment = getAssignmentById(assignmentId);
    
    if (!assignment?.shareUrl) {
      toast.error("No se pudo generar el enlace para compartir la encuesta");
      return;
    }
    
    setDialogState(prev => ({
      ...prev,
      surveyShare: {
        isOpen: true,
        patientId: patient.id,
        patientName: patient.nombre || '',
        patientLastName: patient.apellidos || '',
        patientPhone: patient.telefono || '',
        surveyLink: assignment.shareUrl!,
        assignmentId: assignmentId,
      }
    }));
  }, [patients, dialogState.surveySelector.patientId]);

  const handleConfirmAction = useCallback(async () => {
    const { action, appointmentId, appointmentData } = dialogState.confirmDialog;
    if (!action || !appointmentId) return;

    try {
      let promise: Promise<AppointmentData | void> | undefined;

      switch (action) {
        case "checkIn":
          promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.PRESENTE, "Check-in manual");
          break;
        case "cancel":
          promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.CANCELADA, "Cancelación manual");
          break;
        case "complete":
          promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.COMPLETADA, "Consulta completada");
          break;
        case "noShow":
          promise = updateAppointmentStatus(appointmentId, AppointmentStatusEnum.NO_ASISTIO, "Paciente no asistió");
          break;
        case "reschedule":
          if (!dialogState.reschedule.date || !dialogState.reschedule.time) {
            toast.error("Por favor, seleccione una fecha y hora para reprogramar.");
            return;
          }
          const [hours, minutes] = dialogState.reschedule.time.split(':').map(Number);
          const baseDate = new Date(dialogState.reschedule.date);
          const newDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
          
          promise = updateAppointmentStatus(
            appointmentId,
            AppointmentStatusEnum.REAGENDADA,
            "Cita reprogramada",
            newDate.toISOString()
          );
          break;
      }

      if (promise) {
        toast.promise(promise, {
          loading: "Actualizando...",
          success: "Actualizado correctamente",
          error: (err: Error) => `Error al actualizar: ${err.message || 'Error desconocido'}`,
        });
        await promise;
        refetchAppointments();
        
        if (action === "checkIn" && appointmentData) {
          setTimeout(() => handleOpenSurveySelector(appointmentData), 300);
        }
      }
    } catch (error) {
      console.error("Error en handleConfirmAction:", error);
    } finally {
      setDialogState(prev => ({
        ...prev,
        confirmDialog: { isOpen: false, action: null, appointmentId: null, appointmentData: null },
        reschedule: action === "reschedule" 
          ? { appointmentId: null, date: null, time: null }
          : prev.reschedule
      }));
    }
  }, [dialogState, refetchAppointments, updateAppointmentStatus, handleOpenSurveySelector]);

  const handleAppointmentAction = useCallback((action: ConfirmAction, id: string, appointment: OptimizedAppointment) => {
    setDialogState(prev => ({
      ...prev,
      confirmDialog: {
        isOpen: true,
        action,
        appointmentId: id,
        appointmentData: appointment
      }
    }));
  }, []);

  const handleStartSurvey = useCallback((appointmentId: string, patientId?: string, appointment?: OptimizedAppointment) => {
    if (appointment) {
      handleOpenSurveySelector(appointment);
    }
  }, [handleOpenSurveySelector]);

  const handleViewHistory = useCallback((patientId: string) => {
    if (patientId) {
      window.open(`/pacientes/historial/${patientId}`, "_blank");
    }
  }, []);

  const closeDialogs = useCallback(() => {
    setDialogState(prev => ({
      ...prev,
      surveySelector: { ...prev.surveySelector, isOpen: false },
      surveyShare: { ...prev.surveyShare, isOpen: false }
    }));
  }, []);

  const handleRefreshAfterChanges = useCallback(() => {
    refetchAppointments();
    toast.success("Datos actualizados correctamente");
  }, [refetchAppointments]);

  const dialogConfig = dialogState.confirmDialog.action ? DIALOG_CONFIG[dialogState.confirmDialog.action] : null;

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-6 min-h-screen">
      <Card className="w-full overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalendarRange className="h-6 w-6 text-indigo-500" />
                <span>Admisión de Pacientes</span>
              </h1>
            </div>
            
            {/* Main Content */}
            <div className="p-4 sm:p-6">
              {isMobile && (
                <MobileTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  appointmentCounts={appointmentCounts}
                  isLoading={isLoadingAppointments}
                />
              )}
              
              <FilterControls
                filters={filters}
                onUpdateFilters={handleUpdateFilters}
                onClearFilters={handleClearFilters}
                onRefresh={refetchAppointments}
                isLoading={isLoadingAppointments}
              />
              
              {/* Content Area */}
              <div className="mt-6">
                {!isMobile ? (
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                      {TABS_CONFIG.map((tab: typeof TABS_CONFIG[number]) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="newPatient">
                      <Card>
                        <CardContent className="p-6">
                          <LazyComponentErrorBoundary>
                            <Suspense fallback={<LoadingSkeleton />}>
                              <NewPatientForm onSuccess={handleRefreshAfterChanges} />
                            </Suspense>
                          </LazyComponentErrorBoundary>
                        </CardContent>
                      </Card>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6">
                        <LazyComponentErrorBoundary>
                          <Suspense fallback={<LoadingSkeleton />}>
                            <NewPatientForm onSuccess={handleRefreshAfterChanges} />
                          </Suspense>
                        </LazyComponentErrorBoundary>
                      </div>
                    </TabsContent>
                    <TabsContent value="today" className="mt-6">
                      <AppointmentsList
                        appointments={filteredAppointments.today}
                        isLoading={isLoadingAppointments}
                        emptyState={{
                          title: "No hay citas para hoy",
                          description: "No hay citas programadas para el día de hoy o que coincidan con los filtros.",
                          icon: Calendar
                        }}
                        onAction={handleAppointmentAction}
                        onStartSurvey={handleStartSurvey}
                        onViewHistory={handleViewHistory}
                      />
                    </TabsContent>
                    <TabsContent value="future" className="mt-6">
                      <AppointmentsList
                        appointments={filteredAppointments.future}
                        isLoading={isLoadingAppointments}
                        emptyState={{
                          title: "No hay citas futuras",
                          description: "No hay citas programadas para los próximos días o que coincidan con los filtros.",
                          icon: Calendar
                        }}
                        onAction={handleAppointmentAction}
                        onStartSurvey={handleStartSurvey}
                        onViewHistory={handleViewHistory}
                      />
                    </TabsContent>
                    <TabsContent value="past" className="mt-6">
                      <AppointmentsList
                        appointments={filteredAppointments.past}
                        isLoading={isLoadingAppointments}
                        emptyState={{
                          title: "No hay citas pasadas",
                          description: "No hay registros de citas anteriores que coincidan con los filtros.",
                          icon: Calendar
                        }}
                        onAction={handleAppointmentAction}
                        onStartSurvey={handleStartSurvey}
                        onViewHistory={handleViewHistory}
                      />
                    </TabsContent>
                  </Tabs>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs with Error Boundaries */}
      <LazyComponentErrorBoundary>
        <Suspense fallback={null}>
          {dialogState.surveySelector.isOpen && (
            <SurveySelector
              isOpen={dialogState.surveySelector.isOpen}
              patientId={dialogState.surveySelector.patientId}
              appointmentId={dialogState.surveySelector.appointmentId}
              patientName={dialogState.surveySelector.patientName}
              onClose={closeDialogs}
              onAssigned={handleSurveyAssigned}
            />
          )}
        </Suspense>
      </LazyComponentErrorBoundary>

      <LazyComponentErrorBoundary>
        <Suspense fallback={null}>
          {dialogState.surveyShare.isOpen && (
            <SurveyShareDialog
              isOpen={dialogState.surveyShare.isOpen}
              patient={{
                id: dialogState.surveyShare.patientId,
                nombre: dialogState.surveyShare.patientName,
                apellidos: dialogState.surveyShare.patientLastName,
                telefono: dialogState.surveyShare.patientPhone
              }}
              surveyLink={dialogState.surveyShare.surveyLink}
              onClose={closeDialogs}
              onStartInternal={() => {
                // TODO: Implement actual internal start logic if needed, for now, it's a placeholder
                // This prop is required by SurveyShareDialog, so we provide a minimal implementation.
                console.log("onStartInternal called for patient: ", dialogState.surveyShare.patientId);
                // Potentially close the dialog or navigate, similar to what onSuccess might have done.
                setDialogState(prev => ({
                  ...prev,
                  surveyShare: { ...prev.surveyShare, isOpen: false }
                }));
                toast.info("Acción 'Iniciar Internamente' registrada.");
              }}
            />
          )}
        </Suspense>
      </LazyComponentErrorBoundary>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={dialogState.confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setDialogState(prev => ({
              ...prev,
              confirmDialog: { isOpen: false, action: null, appointmentId: null, appointmentData: null },
              reschedule: dialogState.confirmDialog.action === "reschedule" 
                ? { appointmentId: null, date: null, time: null }
                : prev.reschedule
            }));
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl">
          {dialogConfig && (() => {
            const Icon = dialogConfig.icon;
            return (
              <>
                <AlertDialogHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center",
                      dialogState.confirmDialog.action === "cancel" && "bg-red-100 dark:bg-red-900/50",
                      dialogState.confirmDialog.action === "complete" && "bg-green-100 dark:bg-green-900/50",
                      dialogState.confirmDialog.action === "noShow" && "bg-amber-100 dark:bg-amber-900/50",
                      (!dialogState.confirmDialog.action || !["cancel", "complete", "noShow"].includes(dialogState.confirmDialog.action)) && "bg-blue-100 dark:bg-blue-900/50"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        dialogState.confirmDialog.action === "cancel" && "text-red-600",
                        dialogState.confirmDialog.action === "complete" && "text-green-600",
                        dialogState.confirmDialog.action === "noShow" && "text-amber-600",
                        (!dialogState.confirmDialog.action || !["cancel", "complete", "noShow"].includes(dialogState.confirmDialog.action)) && "text-blue-600"
                      )} />
                    </div>
                    
                    <AlertDialogTitle className="text-xl font-bold">
                      {dialogConfig.title}
                    </AlertDialogTitle>
                  </div>
                  
                  <AlertDialogDescription asChild>
                    <div className="pt-2 space-y-4 text-sm">
                      {dialogState.confirmDialog.appointmentData && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                          <p className="font-semibold mb-3">
                            {dialogState.confirmDialog.appointmentData?.nombre} {dialogState.confirmDialog.appointmentData?.apellidos}
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDisplay(dialogState.confirmDialog.appointmentData?.dateTime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              <span>{dialogState.confirmDialog.appointmentData?.horaConsulta}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {dialogState.confirmDialog.action === "reschedule" ? (
                        <LazyComponentErrorBoundary>
                          <Suspense fallback={<LoadingSkeleton />}>
                            <RescheduleDatePicker
                              rescheduleState={dialogState.reschedule}
                              onStateChange={(update) => setDialogState(prev => ({
                                ...prev,
                                reschedule: { ...prev.reschedule, ...update }
                              }))}
                            />
                          </Suspense>
                        </LazyComponentErrorBoundary>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                          {dialogConfig.description}
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmAction}
                    disabled={
                      (dialogState.confirmDialog.action === "reschedule" && 
                       (!dialogState.reschedule.date || !dialogState.reschedule.time)) || 
                      isLoadingAppointments
                    }
                    className={cn(
                      dialogState.confirmDialog.action === "cancel" && "bg-red-600 hover:bg-red-700 text-white",
                      dialogState.confirmDialog.action === "complete" && "bg-green-600 hover:bg-green-700 text-white",
                      dialogState.confirmDialog.action === "noShow" && "bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                  >
                    {isLoadingAppointments && dialogState.confirmDialog.action !== "reschedule" ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Procesando...
                      </span>
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
}