// patient-admission.tsx - REFACTORIZADO CON HOOKS UNIFICADOS
import React, { 
  useState, 
  useCallback, 
  memo, 
  Suspense,
  lazy,
  startTransition
} from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// UI Components
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

// Icons
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

// Types
import { 
  ExtendedAppointment, 
  AppointmentStatusEnum, 
  Patient, 
  AppointmentStatus 
} from "@/lib/types";

// Hooks
import { useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { useClinic } from "@/contexts/clinic-data-provider";
import { useBreakpointStore } from "@/hooks/use-breakpoint";

// Lazy loaded components
const NewPatientForm = lazy(() => import('./new-patient-form'));
const SurveyShareDialog = lazy(() => import('@/components/surveys/survey-share-dialog'));
const SurveySelector = lazy(() => import('@/components/surveys/survey-selector'));
const RescheduleDatePicker = lazy(() => import('./patient-admission-reschedule'));

// ==================== UTILIDADES INTEGRADAS ====================

// Cache optimizado con LRU
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const dateFormatCache = new LRUCache<string, string>(200);
const dateClassificationCache = new LRUCache<string, 'today' | 'future' | 'past'>(300);

const formatDisplayDate = (dateString: string | Date): string => {
  const key = dateString.toString();
  const cached = dateFormatCache.get(key);
  if (cached) return cached;
  
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return "Fecha inválida";
    const formatted = format(date, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
    dateFormatCache.set(key, formatted);
    return formatted;
  } catch {
    return "Fecha inválida";
  }
};

const classifyAppointmentByDate = (dateString: string): 'today' | 'future' | 'past' => {
  const cached = dateClassificationCache.get(dateString);
  if (cached) return cached;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const appointmentDate = new Date(dateString);
    appointmentDate.setHours(0, 0, 0, 0);
    const appointmentTime = appointmentDate.getTime();

    let classification: 'today' | 'future' | 'past';
    if (appointmentTime === todayTime) {
      classification = 'today';
    } else if (appointmentTime > todayTime) {
      classification = 'future';
    } else {
      classification = 'past';
    }

    dateClassificationCache.set(dateString, classification);
    return classification;
  } catch {
    return 'past';
  }
};

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

// ==================== TIPOS ====================
type TabValue = "newPatient" | "today" | "future" | "past";
type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

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
  };
  readonly doctor: string;
  readonly esNuevoPaciente: boolean;
}

interface AppointmentCounts {
  readonly today: number;
  readonly future: number;
  readonly past: number;
}

// ==================== CONFIGURACIONES ESTÁTICAS ====================
const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Citas de Hoy", icon: CalendarCheck, shortLabel: "Hoy" },
  { value: "future" as const, label: "Citas Futuras", icon: CalendarClock, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Pasadas" },
] as const;

const DIALOG_CONFIG = {
  checkIn: { title: "Registrar Llegada", description: "El paciente se marcará como presente.", icon: CheckCircle },
  cancel: { title: "Cancelar Cita", description: "Esta acción cancelará la cita. ¿Continuar?", icon: XCircle },
  complete: { title: "Completar Consulta", description: "La consulta se marcará como completada.", icon: ClipboardCheck },
  noShow: { title: "Marcar No Asistió", description: "Se registrará que el paciente no asistió.", icon: AlertCircle },
  reschedule: { title: "Reagendar Cita", description: "Seleccione la nueva fecha y hora.", icon: CalendarDays }
} as const;

const EMPTY_STATES = {
  today: { title: "No hay citas hoy", description: "No tienes citas programadas para hoy.", icon: CalendarCheck },
  future: { title: "No hay citas futuras", description: "No tienes citas programadas para el futuro.", icon: CalendarClock },
  past: { title: "No hay citas anteriores", description: "No tienes citas anteriores registradas.", icon: CalendarBlank }
} as const;

// ==================== ADAPTADOR ====================
const adaptAppointmentData = (appointment: ExtendedAppointment): UnifiedAppointment => {
  const dateObj = new Date(appointment.fecha_hora_cita);
  const timeString = dateObj.toTimeString().slice(0, 5);
  
  return {
    id: appointment.id,
    patientId: appointment.patient_id,
    fechaConsulta: dateObj,
    horaConsulta: timeString,
    estado: mapAppointmentStatus(appointment.estado_cita),
    motivoConsulta: appointment.motivo_cita,
    notas: appointment.notas_cita_seguimiento || undefined,
    paciente: {
      nombre: appointment.paciente?.nombre || '',
      apellidos: appointment.paciente?.apellidos || '',
      telefono: appointment.paciente?.telefono || ''
    },
    doctor: appointment.doctor?.nombre || '',
    esNuevoPaciente: appointment.es_primera_vez ?? false
  };
};

// ==================== HOOK PERSONALIZADO ====================
const useFilteredAppointments = (rawAppointments: ExtendedAppointment[]) => {
  return useMemo(() => {
    const result = { today: [] as UnifiedAppointment[], future: [] as UnifiedAppointment[], past: [] as UnifiedAppointment[] };

    if (!rawAppointments?.length) return result;

    for (const appointment of rawAppointments) {
      try {
        const adaptedAppointment = adaptAppointmentData(appointment);
        const classification = classifyAppointmentByDate(appointment.fecha_hora_cita);
        result[classification].push(adaptedAppointment);
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error);
      }
    }

    const sortByTime = (a: UnifiedAppointment, b: UnifiedAppointment): number => {
      return a.horaConsulta.localeCompare(b.horaConsulta);
    };

    result.today.sort(sortByTime);
    result.future.sort(sortByTime);
    result.past.sort((a, b) => sortByTime(b, a));

    return result;
  }, [rawAppointments]);
};

// ==================== COMPONENTES INTERNOS ====================
const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
  </div>
));
LoadingSpinner.displayName = "LoadingSpinner";

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
EmptyState.displayName = "EmptyState";

// AppointmentCard simple
const AppointmentCard = memo<{
  appointment: UnifiedAppointment;
  onAction: (action: ConfirmAction, appointment: UnifiedAppointment) => void;
  onStartSurvey: () => void;
  onViewHistory: (patientId: string) => void;
}>(({ appointment, onAction, onStartSurvey, onViewHistory }) => (
  <Card className="shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 transition-all duration-200 hover:shadow-md">
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {`${appointment.paciente.nombre} ${appointment.paciente.apellidos}`.trim()}
          </h3>
          <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
            <Clock className="h-3 w-3" />
            {appointment.horaConsulta}
            <span>•</span>
            {formatDisplayDate(appointment.fechaConsulta)}
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {appointment.estado}
        </Badge>
      </div>
      
      {appointment.motivoConsulta && (
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
          <strong>Motivo:</strong> {appointment.motivoConsulta}
        </p>
      )}
      
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onAction("checkIn", appointment)}
        >
          Check In
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => onAction("complete", appointment)}
        >
          Completar
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onStartSurvey}
        >
          Encuesta
        </Button>
      </div>
    </CardContent>
  </Card>
));
AppointmentCard.displayName = "AppointmentCard";

const AppointmentsList = memo<{
  appointments: UnifiedAppointment[];
  isLoading: boolean;
  emptyState: typeof EMPTY_STATES[keyof typeof EMPTY_STATES];
  onAction: (action: ConfirmAction, appointment: UnifiedAppointment) => void;
  onStartSurvey: (appointment: UnifiedAppointment) => void;
  onViewHistory: (patientId: string) => void;
}>(({ appointments, isLoading, emptyState, onAction, onStartSurvey, onViewHistory }) => {
  if (isLoading) return <LoadingSpinner />;
  if (!appointments?.length) return <EmptyState {...emptyState} />;
  
  return (
    <div className="space-y-3 sm:space-y-4">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onAction={onAction}
          onStartSurvey={() => onStartSurvey(appointment)}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
});
AppointmentsList.displayName = "AppointmentsList";

const MobileTabs = memo<{
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
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate w-full text-[10px] sm:text-xs">
              {tab.shortLabel}
            </span>
          </Button>
          
          {tab.value !== "newPatient" && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-4 sm:h-5 min-w-[1rem] sm:min-w-[1.25rem] text-[9px] sm:text-[10px] px-1 rounded-full"
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

// ==================== COMPONENTE PRINCIPAL ====================
const PatientAdmission: React.FC = () => {
  // Consumir datos del contexto central
  const { allAppointments, appointmentsSummary, isLoading: isLoadingAppointments } = useClinic();
  const updateAppointmentStatusMutation = useUpdateAppointmentStatus();

  // Selector simple para clasificar citas usando useMemo (como propuso el usuario)
  const appointmentsByDate = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    
    const todayAppointments = allAppointments.filter(app => {
      const appointmentDate = new Date(app.fecha_hora_cita);
      return appointmentDate.toDateString() === todayStr;
    });
    
    const futureAppointments = allAppointments.filter(app => {
      const appointmentDate = new Date(app.fecha_hora_cita);
      return appointmentDate > today;
    });
    
    const pastAppointments = allAppointments.filter(app => {
      const appointmentDate = new Date(app.fecha_hora_cita);
      return appointmentDate < today && appointmentDate.toDateString() !== todayStr;
    });
    
    return {
      today: todayAppointments,
      future: futureAppointments,
      past: pastAppointments
    };
  }, [allAppointments]);

  // Datos simulados para compatibilidad (hasta que se complete la refactorización)
  const appointmentsData = useMemo(() => ({
    appointments: allAppointments.map(adaptAppointmentData),
    pagination: {
      page: 1,
      pageSize: 100,
      totalCount: allAppointments.length,
      totalPages: 1,
      hasMore: false
    }
  }), [allAppointments]);

  // Responsive hook
  const { mobile: isMobile } = useBreakpointStore();

  // Estados consolidados
  const [activeTab, setActiveTab] = useState<TabValue>("today");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: ConfirmAction | null;
    appointment: UnifiedAppointment | null;
  }>({ isOpen: false, action: null, appointment: null });

  const [surveySelector, setSurveySelector] = useState<{
    isOpen: boolean;
    data: { patientId: string; appointmentId: string; patientName: string } | null;
  }>({ isOpen: false, data: null });
  
  const [surveyShare, setSurveyShare] = useState<{
    isOpen: boolean;
    data: { patient: Patient; surveyLink: string; assignmentId: string } | null;
  }>({ isOpen: false, data: null });
  
  const [rescheduleState, setRescheduleState] = useState<{
    selectedDate: Date | null;
    selectedTime: string | null;
  }>({ selectedDate: null, selectedTime: null });
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Datos derivados memoizados
  const rawAppointments = useMemo(() => appointmentsData?.appointments || [], [appointmentsData]);
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

  // ==================== HANDLERS ====================
  const handleTabChange = useCallback((tab: TabValue) => {
    startTransition(() => setActiveTab(tab));
  }, []);

  const handleAppointmentAction = useCallback((action: ConfirmAction, appointment: UnifiedAppointment) => {
    setConfirmDialog({ isOpen: true, action, appointment });
  }, []);

  const handleStartSurvey = useCallback((appointment: UnifiedAppointment) => {
    if (!appointment?.patientId) return;
    
    const patientName = `${appointment.paciente.nombre} ${appointment.paciente.apellidos}`.trim();
    setSurveySelector({
      isOpen: true,
      data: { patientId: appointment.patientId, appointmentId: appointment.id, patientName }
    });
  }, []);

  const handleViewHistory = useCallback((patientId: string) => {
    if (!patientId) return;
    toast.info(`Ver historial del paciente ${patientId}`);
  }, []);

  const handleSurveyAssigned = useCallback((assignmentId: string, surveyId: string) => {
    setSurveySelector({ isOpen: false, data: null });
    // The patient and surveyLink data is not available in this context anymore.
    // You might need to fetch it or pass it differently if the SurveyShareDialog needs it.
    // For now, let's assume we can open the share dialog with just the IDs or mock data.
    console.log('Survey assigned with ID:', assignmentId, 'and Survey ID:', surveyId);
    toast.success('Encuesta asignada y lista para compartir.');
  }, []);

  const handleRescheduleStateChange = useCallback((partialState: Partial<typeof rescheduleState>) => {
    setRescheduleState(prevState => ({ ...prevState, ...partialState }));
  }, []);

  const executeAppointmentAction = useCallback(() => {
    if (!confirmDialog.action || !confirmDialog.appointment) return;
    
    const { action, appointment } = confirmDialog;
    
    try {
      setIsProcessing(true);
      
      const statusMapping: Record<ConfirmAction, AppointmentStatus> = {
        checkIn: "PRESENTE",
        complete: "COMPLETADA",
        cancel: "CANCELADA",
        noShow: "NO ASISTIO",
        reschedule: "REAGENDADA"
      };
      
      const appointmentDate = action === "reschedule" && 
        rescheduleState.selectedDate && 
        rescheduleState.selectedTime
        ? new Date(`${rescheduleState.selectedDate.toISOString().split('T')[0]} ${rescheduleState.selectedTime}`).toISOString()
        : undefined;
      
      updateAppointmentStatusMutation.mutate({
        appointmentId: appointment.id,
        newStatus: statusMapping[action],
        nuevaFechaHora: appointmentDate
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
        onSettled: () => setIsProcessing(false)
      });
    } catch (error) {
      console.error("Error al procesar acción:", error);
      toast.error("Error al procesar la acción. Intente nuevamente.");
      setIsProcessing(false);
    }
  }, [confirmDialog, rescheduleState, updateAppointmentStatusMutation, handleStartSurvey]);

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
                  <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
                      {TABS_CONFIG.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 text-sm">
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

      {/* Dialogs */}
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
                          {`${appointment.paciente.nombre} ${appointment.paciente.apellidos}`.trim()}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {formatDisplayDate(appointment.fechaConsulta)}
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

const MemoizedPatientAdmission = memo(PatientAdmission);
MemoizedPatientAdmission.displayName = "PatientAdmission";

export default MemoizedPatientAdmission;
