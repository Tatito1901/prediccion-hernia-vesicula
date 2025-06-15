// PatientAdmission.tsx - Versión optimizada
import React, { 
  useState, 
  useMemo, 
  useCallback, 
  useTransition, 
  memo,
  Suspense
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
  CalendarClock,
  RefreshCcw,
  X,
  ChevronDown,
  UserRoundPlus,
  CalendarHeart,
  CalendarX2,
  CalendarRange,
  History,
  SlidersHorizontal,
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

// Imports principales
import { AppointmentCard } from "./patient-card";
import { RescheduleDatePicker } from "./patient-admission.reschedule";
import { NewPatientForm } from "./new-patient-form";
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog";
import { SurveySelector } from "@/components/surveys/survey-selector";
import { usePatientStore } from "@/lib/stores/patient-store";
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import { useSurveyStore } from "@/lib/stores/survey-store";
import { usePatientAdmissionFlow } from "./use-patient-admission-flow";
import {
  AppointmentStatusEnum,
  type AppointmentData,
  type AppointmentStatus as AppointmentStatusType,
} from "@/app/dashboard/data-model";

// ============================================================================
// TIPOS Y CONFIGURACIONES CONSOLIDADAS
// ============================================================================
type TabValue = "newPatient" | "today" | "future" | "past";
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

// Interfaz para datos adaptados (con propiedades necesarias para compatibilidad)
export interface Appointment {
  readonly id: string;
  readonly nombre: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly fechaConsulta: Date;
  readonly horaConsulta: `${number}:${number}`; // Tipado correcto para compatibilidad
  readonly dateTime: Date;
  readonly motivoConsulta?: string;
  readonly estado: AppointmentStatusEnum;
  readonly patientId?: string;
  readonly paciente: string; 
  readonly doctor: string; 
}

interface FilterState {
  readonly searchTerm: string;
  readonly statusFilter: AppointmentStatusType | "all";
}

// Configuraciones estáticas - memo para evitar recreaciones
const STATUS_CONFIG = {
  [AppointmentStatusEnum.PRESENTE]: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300",
    icon: CheckCircle,
    label: "En espera",
  },
  [AppointmentStatusEnum.CANCELADA]: {
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300",
    icon: XCircle,
    label: "Cancelada",
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300",
    icon: ClipboardCheck,
    label: "Completada",
  },
  [AppointmentStatusEnum.PROGRAMADA]: {
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300",
    icon: Clock,
    label: "Programada",
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300",
    icon: AlertCircle,
    label: "No Asistió",
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300",
    icon: CalendarDays,
    label: "Reagendada",
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300",
    icon: CalendarClock,
    label: "Confirmada",
  },
} as const;

const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Hoy", icon: Clock, shortLabel: "Hoy" },
  { value: "future" as const, label: "Futuras", icon: CalendarHeart, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Historial" },
] as const;

const DIALOG_CONFIG = {
  checkIn: { title: "Registrar Llegada", description: "El paciente se marcará como presente.", icon: CheckCircle },
  cancel: { title: "Cancelar Cita", description: "Esta acción cancelará la cita. ¿Continuar?", icon: XCircle },
  complete: { title: "Completar Consulta", description: "La consulta se marcará como completada.", icon: ClipboardCheck },
  noShow: { title: "Marcar No Asistió", description: "Se registrará que el paciente no asistió.", icon: AlertCircle },
  reschedule: { title: "Reagendar Cita", description: "Seleccione la nueva fecha y hora.", icon: CalendarDays }
} as const;

// ============================================================================
// UTILIDADES OPTIMIZADAS
// ============================================================================
const parseToDate = (dateInput: string | Date | null | undefined): Date | null => {
  if (!dateInput) return null;
  const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
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

const isToday = (date: Date | string | null | undefined): boolean => {
  const parsedDate = parseToDate(date);
  if (!parsedDate) return false;
  const today = new Date();
  return parsedDate.toDateString() === today.toDateString();
};

// Función optimizada para adaptar los datos de cita
const adaptAppointmentData = (appointment: AppointmentData): Appointment => {
  // Extraer nombre y apellidos del nombre completo
  const nombreCompleto = appointment.paciente?.trim() || "";
  const [nombre = "N/A", ...apellidosParts] = nombreCompleto.split(" ");
  const apellidos = apellidosParts.join(" ");
  
  // Asegurar que tenemos una fecha válida
  const fecha = parseToDate(appointment.fechaConsulta) || new Date();
  
  // Asegurar que hora tiene el formato correcto 
  const hora = (/^\d{2}:\d{2}$/.test(appointment.horaConsulta || "")) 
    ? appointment.horaConsulta as `${number}:${number}` 
    : "00:00" as `${number}:${number}`;
  
  // Crear dateTime combinando fecha y hora
  let combinedDateTime = new Date(fecha.getTime()); // Clone
  const [hours, minutes] = hora.split(":").map(Number);
  combinedDateTime.setHours(hours, minutes, 0, 0);
  
  return {
    id: appointment.id,
    nombre,
    apellidos,
    telefono: appointment.telefono || "N/A",
    fechaConsulta: fecha, // Usamos el Date parseado
    horaConsulta: hora, // Ya está como `${number}:${number}`
    dateTime: combinedDateTime,
    motivoConsulta: appointment.motivoConsulta || "N/A",
    estado: appointment.estado as AppointmentStatusEnum,
    patientId: appointment.patientId,
    // Garantizar que paciente y doctor nunca sean undefined
    paciente: appointment.paciente || '',
    doctor: appointment.doctor || ''
  };
};

// ============================================================================
// COMPONENTES UI OPTIMIZADOS
// ============================================================================
const AppointmentCardSkeleton = memo(() => (
  <Card className="p-4 shadow-sm animate-pulse">
    <div className="space-y-3">
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
));

const LoadingSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 3 }, (_, i) => (
      <AppointmentCardSkeleton key={i} />
    ))}
  </div>
));

// Interfaz para estado vacío (para TypeScript)
type EmptyStateProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Componente reutilizado para mostrar lista de citas (con memoización para evitar rerenders)
const AppointmentsList = memo(({ 
  appointments, 
  isLoading,
  emptyState,
  onAction,
  onStartSurvey,
  onViewHistory,
}: { 
  appointments: Appointment[];
  isLoading: boolean;
  emptyState: EmptyStateProps;
  onAction: (action: ConfirmAction, id: string, appointment: Appointment) => void;
  onStartSurvey: (appointmentId: string, patientId?: string, appointment?: Appointment) => void;
  onViewHistory: (patientId: string) => void;
}) => {
  if (isLoading) return <LoadingSkeleton />;
  
  if (!appointments || appointments.length === 0) {
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
}, (prevProps, nextProps) => {
  // Custom comparator for AppointmentsList memoization
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.appointments === nextProps.appointments && // Assumes appointments list is immutable
    prevProps.emptyState.title === nextProps.emptyState.title &&
    prevProps.emptyState.description === nextProps.emptyState.description &&
    prevProps.emptyState.icon === nextProps.emptyState.icon &&
    prevProps.onAction === nextProps.onAction &&
    prevProps.onStartSurvey === nextProps.onStartSurvey &&
    prevProps.onViewHistory === nextProps.onViewHistory
  );
});

const EmptyState = memo(({ 
  title, 
  description, 
  icon: IconComponent 
}: EmptyStateProps) => (
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

const FilterControls = memo(({ 
  filters, 
  onUpdateFilters, 
  onClearFilters, 
  onRefresh, 
  isLoading 
}: {
  filters: FilterState;
  onUpdateFilters: (filters: Partial<FilterState>) => void;
  onClearFilters: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mobile: isMobile } = useBreakpointStore();
  
  const hasActiveFilters = filters.searchTerm !== "" || filters.statusFilter !== "all";
  
  const MainControls = () => (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
        <Input 
          type="text" 
          placeholder="Buscar paciente..." 
          className="pl-10 h-11" 
          value={filters.searchTerm} 
          onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })} 
        />
      </div>
      
      <Select value={filters.statusFilter} onValueChange={(value) => onUpdateFilters({ statusFilter: value as AppointmentStatusType | "all" })}>
        <SelectTrigger className="w-full sm:w-48 h-11 gap-2">
          <Filter size={16} className="text-slate-500" />
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los Estados</SelectItem>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
  
  const ActionButtons = () => (
    <div className="flex gap-2 shrink-0">
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClearFilters} 
          title="Limpiar filtros" 
          className="h-11 w-11 hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onRefresh} 
        title="Actualizar citas" 
        className="h-11 w-11" 
        disabled={isLoading}
      >
        <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
      </Button>
    </div>
  );

  if (!isMobile) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200"
      )}>
        <MainControls />
        <ActionButtons />
      </div>
    );
  }
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/30",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtros</span>
          </div>
          
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">Activos</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ActionButtons />
          
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      
      <CollapsibleContent>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border">
          <MainControls />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

const MobileTabs = memo(({ 
  activeTab, 
  onTabChange, 
  appointmentCounts, 
  isLoading 
}: {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: { today: number; future: number; past: number };
  isLoading: boolean;
}) => (
  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
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
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full">{tab.shortLabel}</span>
          </Button>
          
          {tab.value !== "newPatient" && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full bg-slate-700 text-white"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
      );
    })}
  </div>
));

// ============================================================================
// COMPONENTE PRINCIPAL OPTIMIZADO
// ============================================================================
export default function PatientAdmission() {
  const {
    appointments, // Raw appointments list from the hook
    isLoading: isLoadingAppointments,
    activeTab,
    setActiveTab,
    // todayAppointments, // We will derive today's list from raw 'appointments'
    // upcomingAppointments, // We will derive future's list from raw 'appointments'
    refetchAppointments,
  } = usePatientAdmissionFlow();

  const { patients } = usePatientStore();
  const { updateAppointmentStatus } = useAppointmentStore();
  const { mobile: isMobile } = useBreakpointStore();

  // Estados consolidados y optimizados
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all"
  });
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null as ConfirmAction | null,
    appointmentId: null as string | null,
    appointmentData: null as Appointment | null
  });
  
  const [surveySelectorDialog, setSurveySelectorDialog] = useState({
    isOpen: false,
    patientId: "",
    appointmentId: "",
    patientName: "",
  });
  
  const [surveyShareDialog, setSurveyShareDialog] = useState({
    isOpen: false,
    patientId: "",
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyLink: "",
    assignmentId: "",
  });
  
  const [rescheduleState, setRescheduleState] = useState<{
    appointmentId: string | null;
    date: Date | null;
    time: string | null;
  }>({
    appointmentId: null,
    date: null,
    time: null
  });
  
  const [isPending, startTransition] = useTransition();

  // 1. Categorize raw appointments and adapt their data structure
  const categorizedAndAdaptedAppointments = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const result = {
      today: [] as Appointment[],
      future: [] as Appointment[],
      past: [] as Appointment[],
    };

    if (!appointments) return result; // Handle case where appointments might be undefined initially

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

  // 2. Calculate appointment counts based on categorized (pre-filter) lists
  const appointmentCounts = useMemo(() => ({
    today: categorizedAndAdaptedAppointments.today.length,
    future: categorizedAndAdaptedAppointments.future.length,
    past: categorizedAndAdaptedAppointments.past.length
  }), [categorizedAndAdaptedAppointments]);

  // 3. Callback to apply local filters (search term and status)
  const applyFiltersToList = useCallback((appointmentsToFilter: Appointment[]) => {
    let filteredResult = appointmentsToFilter;
    const searchLower = filters.searchTerm.toLowerCase().trim();

    if (searchLower) {
      filteredResult = filteredResult.filter(appointment => {
        const fullName = `${appointment.nombre} ${appointment.apellidos}`.toLowerCase();
        const patientNameInCard = appointment.paciente.toLowerCase(); // 'paciente' in Appointment is the full name string
        return fullName.includes(searchLower) || patientNameInCard.includes(searchLower);
      });
    }

    if (filters.statusFilter !== "all") {
      filteredResult = filteredResult.filter(appointment => appointment.estado === filters.statusFilter);
    }
    return filteredResult;
  }, [filters.searchTerm, filters.statusFilter]);

  // 4. Generate final lists for display by applying filters
  const todayListFinal = useMemo(() => {
    return applyFiltersToList(categorizedAndAdaptedAppointments.today);
  }, [categorizedAndAdaptedAppointments.today, applyFiltersToList]);

  const futureListFinal = useMemo(() => {
    return applyFiltersToList(categorizedAndAdaptedAppointments.future);
  }, [categorizedAndAdaptedAppointments.future, applyFiltersToList]);

  const pastListFinal = useMemo(() => {
    return applyFiltersToList(categorizedAndAdaptedAppointments.past);
  }, [categorizedAndAdaptedAppointments.past, applyFiltersToList]);

  // Callbacks memoizados para evitar recreaciones
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({ searchTerm: "", statusFilter: "all" });
  }, []);

  const handleOpenSurveySelector = useCallback((appointment: Appointment) => {
    const patient = patients?.find(p => p.id === (appointment.patientId || appointment.id));
    
    if (!patient) {
      toast.error("No se encontró el paciente para esta cita.");
      return;
    }
    
    setSurveySelectorDialog({
      isOpen: true,
      patientId: patient.id,
      appointmentId: appointment.id,
      patientName: `${patient.nombre || ''} ${patient.apellidos || ''}`,
    });
  }, [patients]);

  const handleSurveyAssigned = useCallback((assignmentId: string, surveyId: string) => {
    setSurveySelectorDialog(prev => ({ ...prev, isOpen: false }));
    
    const patientId = surveySelectorDialog.patientId;
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
    
    setSurveyShareDialog({
      isOpen: true,
      patientId: patient.id,
      patientName: patient.nombre || '',
      patientLastName: patient.apellidos || '',
      patientPhone: patient.telefono || '',
      surveyLink: assignment.shareUrl,
      assignmentId: assignmentId,
    });
  }, [patients, surveySelectorDialog.patientId]);

  const handleConfirmAction = useCallback(async () => {
    const { action, appointmentId, appointmentData } = confirmDialog;
    if (!action || !appointmentId) return;

    try {
      let promise: Promise<any> | undefined;

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
          if (!rescheduleState.date || !rescheduleState.time) {
            toast.error("Por favor, seleccione una fecha y hora para reprogramar.");
            return;
          }
          const [hours, minutes] = rescheduleState.time.split(':').map(Number);
          const baseDate = new Date(rescheduleState.date);
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
          error: (err) => `Error al actualizar: ${err.message || 'Error desconocido'}`,
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
      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
      if (action === "reschedule") {
        setRescheduleState({ appointmentId: null, date: null, time: null });
      }
    }
  }, [confirmDialog, rescheduleState, refetchAppointments, updateAppointmentStatus, handleOpenSurveySelector]);

  const handleAppointmentAction = useCallback((action: ConfirmAction, id: string, appointment: Appointment) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointmentId: id,
      appointmentData: appointment // Ya es un objeto adaptado
    });
  }, []);

  const handleStartSurvey = useCallback((appointmentId: string, patientId?: string, appointment?: Appointment) => {
    if (appointment) {
      // El objeto ya viene adaptado desde los componentes AppointmentCard
      handleOpenSurveySelector(appointment);
    }
  }, [handleOpenSurveySelector]);

  const handleViewHistory = useCallback((patientId: string) => {
    if (patientId) {
      window.open(`/pacientes/historial/${patientId}`, "_blank");
    }
  }, []);

  const closeDialogs = useCallback(() => {
    setSurveySelectorDialog(prev => ({ ...prev, isOpen: false }));
    setSurveyShareDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  const handleShareSuccess = useCallback(() => {
    setSurveyShareDialog(prev => ({ ...prev, isOpen: false }));
    toast.success("Encuesta compartida correctamente");
  }, []);

  const dialogConfig = confirmDialog.action ? DIALOG_CONFIG[confirmDialog.action] : null;

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
              
              {/* Content Area for Tabs or Mobile View */}
              <div className="mt-6">
                {!isMobile ? (
                  <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                      {TABS_CONFIG.map((tab) => {
                        const Icon = tab.icon;
                        const count = tab.value === "today" ? appointmentCounts.today :
                                      tab.value === "future" ? appointmentCounts.future :
                                      tab.value === "past" ? appointmentCounts.past : 0;
                        return (
                          <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                            {tab.value !== "newPatient" && count > 0 && !isLoadingAppointments && (
                              <Badge variant="secondary" className="ml-1">{count}</Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                    <TabsContent value="newPatient" className="mt-6">
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6">
                        <NewPatientForm />
                      </div>
                    </TabsContent>
                    <TabsContent value="today" className="mt-6">
                      <AppointmentsList
                        appointments={todayListFinal}
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
                        appointments={futureListFinal}
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
                        appointments={pastListFinal}
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
                ) : (
                  // Mobile content without Tabs wrapper
                  <div>
                    {isLoadingAppointments ? (
                      <LoadingSkeleton />
                    ) : (
                      <>
                        {activeTab === "newPatient" && (
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6">
                            <NewPatientForm />
                          </div>
                        )}
                        {activeTab === "today" && (
                          <AppointmentsList
                            appointments={todayListFinal}
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
                        )}
                        {activeTab === "future" && (
                          <AppointmentsList
                            appointments={futureListFinal}
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
                        )}
                        {activeTab === "past" && (
                          <AppointmentsList
                            appointments={pastListFinal}
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
                        )}
                      </>
                    )}
                  </div>
                )}
              </div> {/* Closes <div className="mt-6"> (Content Area for Tabs or Mobile View) */}
            </div>   {/* Closes <div className="p-4 sm:p-6"> (Main Content wrapper) */}
          </div>     {/* Closes <div className="flex flex-col"> */}
        </CardContent>
      </Card>

      {/* Survey Selector Dialog */}
      <Suspense fallback={<div className="p-4">Cargando...</div>}> 
        {surveySelectorDialog.isOpen && (
          <SurveySelector
            isOpen={surveySelectorDialog.isOpen}
            patientId={surveySelectorDialog.patientId ?? ''} // Ensure patientId is always string
            appointmentId={surveySelectorDialog.appointmentId}
            patientName={surveySelectorDialog.patientName}
            onClose={closeDialogs}
            onAssigned={handleSurveyAssigned}
          />
        )}
      </Suspense>

      {/* Survey Share Dialog */}
      <Suspense fallback={<div className="p-4">Cargando...</div>}> 
        {surveyShareDialog.isOpen && (
          <SurveyShareDialog
            isOpen={surveyShareDialog.isOpen}
            patient={{
              id: surveyShareDialog.patientId ?? '', // Ensure patientId is always string
              nombre: surveyShareDialog.patientName,
              apellidos: surveyShareDialog.patientLastName,
              telefono: surveyShareDialog.patientPhone
            }}
            surveyLink={surveyShareDialog.surveyLink}
            onStartInternal={() => {
              toast.success(`Encuesta iniciada para ${surveyShareDialog.patientName}`);
              setSurveyShareDialog(prev => ({ ...prev, isOpen: false }));
            }}
            onClose={closeDialogs}
          />
        )}
      </Suspense>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({
              isOpen: false,
              action: null,
              appointmentId: null,
              appointmentData: null
            });
            if (confirmDialog.action === "reschedule") {
              setRescheduleState({ appointmentId: null, date: null, time: null });
            }
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl">
          {dialogConfig && (
            <>
              <AlertDialogHeader className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    confirmDialog.action === "cancel" && "bg-red-100 dark:bg-red-900/50",
                    confirmDialog.action === "complete" && "bg-green-100 dark:bg-green-900/50",
                    confirmDialog.action === "noShow" && "bg-amber-100 dark:bg-amber-900/50",
                    (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action ?? '')) && "bg-blue-100 dark:bg-blue-900/50"
                  )}>
                    <dialogConfig.icon className={cn(
                      "h-6 w-6",
                      confirmDialog.action === "cancel" && "text-red-600",
                      confirmDialog.action === "complete" && "text-green-600",
                      confirmDialog.action === "noShow" && "text-amber-600",
                      (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action ?? '')) && "text-blue-600"
                    )} />
                  </div>
                  
                  <AlertDialogTitle className="text-xl font-bold">
                    {dialogConfig.title}
                  </AlertDialogTitle>
                </div>
                
                <AlertDialogDescription asChild>
                  <div className="pt-2 space-y-4 text-sm">
                    {confirmDialog.appointmentData && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                        <p className="font-semibold mb-3">
                          {confirmDialog.appointmentData.nombre} {confirmDialog.appointmentData.apellidos}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDisplay(confirmDialog.appointmentData.dateTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{confirmDialog.appointmentData.horaConsulta}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {confirmDialog.action === "reschedule" ? (
                      <RescheduleDatePicker
                        rescheduleState={rescheduleState}
                        onStateChange={(update) => setRescheduleState(prev => ({ ...prev, ...update }))}
                      />
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
                  disabled={(confirmDialog.action === "reschedule" && 
                            (!rescheduleState.date || !rescheduleState.time)) || isPending || isLoadingAppointments}
                  className={cn(
                    confirmDialog.action === "cancel" && "bg-red-600 hover:bg-red-700 text-white",
                    confirmDialog.action === "complete" && "bg-green-600 hover:bg-green-700 text-white",
                    confirmDialog.action === "noShow" && "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                >
                  {(isPending || isLoadingAppointments) && confirmDialog.action !== "reschedule" ? (
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
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}