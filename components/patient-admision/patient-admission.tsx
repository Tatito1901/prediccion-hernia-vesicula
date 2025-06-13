// PatientAdmission.tsx - Versión mejorada eliminando redundancias
"use client";

import React, { 
  useState, 
  useMemo, 
  useCallback, 
  useTransition, 
  useEffect, 
  Suspense,
  lazy 
} from "react";
import {
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  Users,
  ClipboardCheck,
  AlertCircle,
  CalendarClock,
  RefreshCcw,
  X,
  ChevronDown,
  UserRoundPlus,
  CalendarHeart,
  CalendarX2,
  History,
  SlidersHorizontal,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

// Imports optimizados
import { AppointmentCard } from "./patient-card";
import { RescheduleDatePicker } from "./patient-admission.reschedule";
import { useAppContext } from "@/lib/context/app-context";
import { usePatientAdmissionFlow } from "./use-patient-admission-flow";
import {
  AppointmentStatusEnum,
  type AppointmentData,
  type AppointmentStatus as AppointmentStatusType,
} from "@/app/dashboard/data-model";

// Lazy loading consolidado
const LazyNewPatientForm = lazy(() => 
  import("./new-patient-form").then(module => ({ default: module.NewPatientForm }))
);

const LazySurveyShareDialog = lazy(() => 
  import("@/components/surveys/survey-share-dialog").then(module => ({ 
    default: module.SurveyShareDialog 
  }))
);

// =================================================================
// CONFIGURACIONES CONSOLIDADAS PARA ELIMINAR REDUNDANCIAS
// =================================================================
type EntityId = string;
type ISODateString = string;
type FormattedTimeString = `${number}:${number}`;
type TabValue = "newPatient" | "today" | "future" | "past";
export type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

export interface Appointment {
  readonly id: EntityId;
  readonly nombre: string;
  readonly apellidos: string;
  readonly telefono: string;
  readonly fechaConsulta: ISODateString | Date;
  readonly horaConsulta: FormattedTimeString;
  readonly dateTime: Date;
  readonly motivoConsulta?: string;
  readonly estado: AppointmentStatusEnum;
  readonly patientId?: EntityId;
}

interface FilterState {
  readonly searchTerm: string;
  readonly statusFilter: AppointmentStatusType | "all";
  readonly sortField: string | null;
}

// Configuraciones consolidadas
const STATUS_CONFIG = {
  [AppointmentStatusEnum.PRESENTE]: {
    className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700",
    icon: CheckCircle,
    label: "En espera",
  },
  [AppointmentStatusEnum.CANCELADA]: {
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700",
    icon: XCircle,
    label: "Cancelada",
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700",
    icon: ClipboardCheck,
    label: "Completada",
  },
  [AppointmentStatusEnum.PROGRAMADA]: {
    className: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
    icon: Clock,
    label: "Programada",
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
    icon: AlertCircle,
    label: "No Asistió",
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700",
    icon: CalendarDays,
    label: "Reagendada",
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700",
    icon: CalendarClock,
    label: "Confirmada",
  },
} as const;

const TABS_CONFIG = [
  { value: "newPatient" as TabValue, label: "Nuevo Paciente", icon: UserRoundPlus, countKey: null, shortLabel: "Nuevo" },
  { value: "today" as TabValue, label: "Hoy", icon: Clock, countKey: "today" as const, shortLabel: "Hoy" },
  { value: "future" as TabValue, label: "Futuras", icon: CalendarHeart, countKey: "future" as const, shortLabel: "Futuras" },
  { value: "past" as TabValue, label: "Historial", icon: History, countKey: "past" as const, shortLabel: "Historial" },
];

const DIALOG_CONFIG = {
  checkIn: { title: "Registrar Llegada", description: "El paciente se marcará como presente.", icon: CheckCircle },
  cancel: { title: "Cancelar Cita", description: "Esta acción cancelará la cita. ¿Continuar?", icon: XCircle },
  complete: { title: "Completar Consulta", description: "La consulta se marcará como completada.", icon: ClipboardCheck },
  noShow: { title: "Marcar No Asistió", description: "Se registrará que el paciente no asistió.", icon: AlertCircle },
  reschedule: { title: "Reagendar Cita", description: "Seleccione la nueva fecha y hora.", icon: CalendarDays }
};

// =================================================================
// UTILIDADES CONSOLIDADAS PARA EVITAR DUPLICACIÓN
// =================================================================
const parseToDate = (dateInput: string | Date | undefined | null): Date | null => {
  if (!dateInput) return null;
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(String(dateInput));
    return !isNaN(date.getTime()) ? date : null;
  } catch {
    return null;
  }
};

const formatDisplay = (date: Date | string | null | undefined): string => {
  const parsedDate = parseToDate(date);
  if (!parsedDate) return "Fecha inválida";
  try {
    return parsedDate.toLocaleDateString("es-ES", { 
      weekday: "long", 
      day: "numeric", 
      month: "long" 
    });
  } catch {
    return "Error de formato";
  }
};

const isToday = (date: Date | string | null | undefined): boolean => {
  const parsedDate = parseToDate(date);
  if (!parsedDate) return false;
  const today = new Date();
  return parsedDate.toDateString() === today.toDateString();
};

const isPast = (date: Date | string | null | undefined): boolean => {
  const parsedDate = parseToDate(date);
  if (!parsedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(parsedDate);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

const isFuture = (date: Date | string | null | undefined): boolean => {
  const parsedDate = parseToDate(date);
  if (!parsedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(parsedDate);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate > today;
};

const adaptAppointmentData = (appointment: AppointmentData): Appointment => {
  let nombre = "N/A";
  let apellidos = "";
  
  if (appointment.paciente?.trim()) {
    const nombreCompleto = appointment.paciente.trim();
    const primerEspacio = nombreCompleto.indexOf(" ");
    if (primerEspacio > 0) {
      nombre = nombreCompleto.substring(0, primerEspacio);
      apellidos = nombreCompleto.substring(primerEspacio + 1);
    } else {
      nombre = nombreCompleto;
    }
  }
  
  const fecha = parseToDate(appointment.fechaConsulta);
  const hora = appointment.horaConsulta as FormattedTimeString;
  let combinedDateTime = new Date(0);
  
  if (fecha && hora && /^\d{2}:\d{2}$/.test(hora)) {
    const [hours, minutes] = hora.split(":").map(Number);
    combinedDateTime = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hours, minutes);
  }
  
  return {
    id: appointment.id,
    nombre,
    apellidos,
    telefono: appointment.telefono || "N/A",
    fechaConsulta: appointment.fechaConsulta,
    horaConsulta: hora,
    dateTime: combinedDateTime,
    motivoConsulta: appointment.motivoConsulta || "N/A",
    estado: appointment.estado as AppointmentStatusEnum,
    patientId: appointment.patientId,
  };
};

// =================================================================
// COMPONENTES UI OPTIMIZADOS
// =================================================================
const AppointmentCardSkeleton = () => (
  <Card className="p-4 shadow-sm bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 animate-pulse">
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32 bg-slate-200 dark:bg-slate-700" />
          <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-8 bg-slate-200 dark:bg-slate-700" />
        <Skeleton className="h-8 bg-slate-200 dark:bg-slate-700" />
      </div>
    </div>
  </Card>
);

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }, (_, i) => (
      <AppointmentCardSkeleton key={i} />
    ))}
  </div>
);

const FilterControls = ({ 
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
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateFilters({ searchTerm: e.target.value });
  };
  
  const handleStatusChange = (value: string) => {
    onUpdateFilters({ statusFilter: value as AppointmentStatusType | "all" });
  };
  
  const hasActiveFilters = filters.searchTerm !== "" || filters.statusFilter !== "all";
  
  const MainControls = () => (
    <div className="flex flex-col sm:flex-row gap-3 w-full">
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 dark:text-slate-400 pointer-events-none" />
        <Input 
          type="text" 
          placeholder="Buscar paciente..." 
          className="pl-10 h-11 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors" 
          value={filters.searchTerm} 
          onChange={handleSearchChange} 
          aria-label="Buscar paciente"
        />
      </div>
      
      <Select value={filters.statusFilter} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-48 h-11 text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 gap-2">
          <Filter size={16} className="text-slate-500 dark:text-slate-400" />
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
          className="h-11 w-11 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 transition-colors"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onRefresh} 
        title="Actualizar citas" 
        className="h-11 w-11 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" 
        disabled={isLoading}
      >
        <RefreshCcw className={cn("h-4 w-4 transition-transform", isLoading && "animate-spin")} />
      </Button>
    </div>
  );

  if (!isMobile) {
    return (
      <div className={cn(
        "flex items-center gap-4 p-4 rounded-xl border transition-all duration-200",
        "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200 dark:border-blue-800"
      )}>
        <MainControls />
        <ActionButtons />
      </div>
    );
  }
  
  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="space-y-3">
      <div className={cn(
        "flex items-center justify-between p-4 rounded-xl border transition-all duration-200",
        "bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700",
        hasActiveFilters && "ring-2 ring-blue-500/10 border-blue-200 dark:border-blue-800"
      )}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filtros</span>
          </div>
          
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              Activos
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ActionButtons />
          
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="gap-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      
      <CollapsibleContent className="space-y-3 animate-in slide-in-from-top-2 fade-in-0">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-200 dark:border-slate-700">
          <MainControls />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const EmptyState = ({ 
  title, 
  description, 
  icon: IconComponent 
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="text-center p-16 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center animate-in fade-in-0 slide-in-from-bottom-4">
    <div className="relative mb-6">
      <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <IconComponent className="h-10 w-10 text-slate-500 dark:text-slate-400" />
      </div>
      <div className="absolute -inset-4 bg-slate-200/50 dark:bg-slate-600/50 rounded-full animate-ping opacity-20" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
  </div>
);

const MobileTabs = ({ 
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
  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.countKey ? appointmentCounts[tab.countKey] : 0;
      const isActive = activeTab === tab.value;
      
      return (
        <div key={tab.value} className="relative">
          <Button 
            variant={isActive ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full transition-all",
              isActive 
                ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100" 
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )} 
            onClick={() => onTabChange(tab.value)}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full">{tab.shortLabel}</span>
          </Button>
          
          {tab.countKey && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full bg-slate-700 dark:bg-slate-300 text-white dark:text-slate-900"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
      );
    })}
  </div>
);

// =================================================================
// COMPONENTE PRINCIPAL CONSOLIDADO
// =================================================================
export default function PatientAdmission() {
  const {
    appointments: rawAppointments = [], 
    isLoadingAppointments,
    errorAppointments,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    refetchAppointments,
  } = usePatientAdmissionFlow();

  const { patients, updateAppointmentStatus } = useAppContext();
  const breakpoints = useBreakpointStore();
  const isMobile = breakpoints.mobile;

  // Estados consolidados
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null as ConfirmAction | null,
    appointmentId: null as string | null,
    appointmentData: null as Appointment | null
  });
  
  const [surveyDialog, setSurveyDialog] = useState({
    isOpen: false,
    patientId: "",
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyLink: ""
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

  // Procesamiento optimizado
  const processedAppointments = useMemo(
    () => (rawAppointments || []).map(adaptAppointmentData),
    [rawAppointments]
  );

  const classifiedAndFilteredAppointments = useMemo(() => {
    const today: Appointment[] = [];
    const future: Appointment[] = [];
    const past: Appointment[] = [];
    
    const searchTermLower = filters.searchTerm.toLowerCase();
    
    for (const appt of processedAppointments) {
      const matchesSearch = !filters.searchTerm || 
        appt.nombre.toLowerCase().includes(searchTermLower) || 
        appt.apellidos.toLowerCase().includes(searchTermLower) || 
        (appt.motivoConsulta || "").toLowerCase().includes(searchTermLower);
      
      const matchesStatus = filters.statusFilter === "all" || appt.estado === filters.statusFilter;
      
      if (matchesSearch && matchesStatus) {
        if (isToday(appt.dateTime)) {
          today.push(appt);
        } else if (isFuture(appt.dateTime)) {
          future.push(appt);
        } else {
          past.push(appt);
        }
      }
    }
    
    const sortByDateTimeAsc = (a: Appointment, b: Appointment) => a.dateTime.getTime() - b.dateTime.getTime();
    const sortByDateTimeDesc = (a: Appointment, b: Appointment) => b.dateTime.getTime() - a.dateTime.getTime();
    
    return {
      today: today.sort(sortByDateTimeAsc),
      future: future.sort(sortByDateTimeAsc),
      past: past.sort(sortByDateTimeDesc),
    };
  }, [processedAppointments, filters]);

  const appointmentCounts = useMemo(() => ({
    today: classifiedAndFilteredAppointments.today.length,
    future: classifiedAndFilteredAppointments.future.length,
    past: classifiedAndFilteredAppointments.past.length,
  }), [classifiedAndFilteredAppointments]);

  // Handlers optimizados
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    startTransition(() => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    });
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      setFilters({ searchTerm: "", statusFilter: "all", sortField: null });
    });
  }, [setFilters]);

  const handleAction = useCallback((action: ConfirmAction, appointment: Appointment) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointmentId: appointment.id,
      appointmentData: appointment
    });
    
    if (action === "reschedule") {
      setRescheduleState({
        appointmentId: appointment.id,
        date: parseToDate(appointment.fechaConsulta),
        time: appointment.horaConsulta
      });
    }
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmDialog.action || !confirmDialog.appointmentId) return;
    
    const { action, appointmentId } = confirmDialog;
    let promise: Promise<any> | undefined;

    try {
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
          const baseDate = rescheduleState.date instanceof Date ? rescheduleState.date : new Date(rescheduleState.date!);
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
      }
    } catch (error) {
      console.error("Error en handleConfirmAction:", error);
    } finally {
      setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
      if (action === "reschedule") {
        setRescheduleState({ appointmentId: null, date: null, time: null });
      }
    }
  }, [confirmDialog, rescheduleState, refetchAppointments, updateAppointmentStatus]);

  const handleOpenSurveyDialog = useCallback((appointment: Appointment) => {
    const patient = patients?.find(p => p.id === (appointment.patientId || appointment.id));
    
    if (!patient) {
      toast.error("No se encontró el paciente para esta cita.");
      return;
    }

    const surveyLink = `/surveys/start?patientId=${patient.id}&appointmentId=${appointment.id}`;
    
    setSurveyDialog({
      isOpen: true,
      patientId: patient.id,
      patientName: patient.nombre || '',
      patientLastName: patient.apellidos || '',
      patientPhone: patient.telefono || '',
      surveyLink,
    });
  }, [patients]);

  const renderAppointmentsContent = useCallback((appointmentsToRender: Appointment[], tabKey: TabValue) => {
    if (isLoadingAppointments || isPending) {
      return <LoadingSkeleton />;
    }

    if (appointmentsToRender.length === 0) {
      const titles: Record<TabValue, string> = {
        today: "No hay citas para hoy",
        future: "No hay citas futuras", 
        past: "No hay citas pasadas",
        newPatient: ""
      };
      
      const descriptions: Record<TabValue, string> = {
        today: "Cuando se agenden citas para hoy, aparecerán aquí con toda la información detallada.",
        future: "Las próximas citas programadas se mostrarán en esta sección para una mejor organización.",
        past: "El historial completo de citas anteriores estará disponible aquí para consulta.",
        newPatient: ""
      };
      
      return (
        <EmptyState
          title={titles[tabKey] || "No hay citas"}
          description={descriptions[tabKey] || "Cuando haya citas disponibles, aparecerán aquí."}
          icon={CalendarX2}
        />
      );
    }

    return (
      <div className="space-y-4">
        {appointmentsToRender.map((cita) => {
          const patientId = cita.patientId || cita.id;
          const patient = patients?.find(p => p.id === patientId);
          
          const surveyCompleted = Boolean(patient?.encuesta?.id && patient?.encuesta?.submitted_at);
          const requireSurvey = [
            AppointmentStatusEnum.PRESENTE, 
            AppointmentStatusEnum.CONFIRMADA,
            AppointmentStatusEnum.PROGRAMADA
          ].includes(cita.estado);
          const disableActions = requireSurvey && !surveyCompleted;
          
          return (
            <AppointmentCard
              key={cita.id}
              appointment={cita}
              onAction={(action, appointmentId) => {
                const appointment = appointmentsToRender.find(apt => apt.id === appointmentId);
                if (appointment) {
                  handleAction(action as ConfirmAction, appointment);
                }
              }}
              onStartSurvey={(appointmentId) => {
                const appointment = appointmentsToRender.find(apt => apt.id === appointmentId);
                if (appointment) {
                  handleOpenSurveyDialog(appointment);
                }
              }}
              onViewHistory={(patientId) => toast.info(`Ver historial del paciente ${patientId}`)}
              disableActions={disableActions}
              surveyCompleted={surveyCompleted}
            />
          );
        })}
      </div>
    );
  }, [isLoadingAppointments, isPending, handleAction, handleOpenSurveyDialog, patients]);

  const handleNewPatientSuccess = () => {
    refetchAppointments();
    setActiveTab("today");
    toast.success("Paciente agregado exitosamente");
  };

  useEffect(() => {
    if (errorAppointments) {
      toast.error(`Error al cargar las citas: ${errorAppointments.message || 'Error desconocido'}`);
    }
  }, [errorAppointments]);

  const dialogConfig = confirmDialog.action ? DIALOG_CONFIG[confirmDialog.action] : null;

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <Card className="w-full overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-800/30 border-b border-slate-200 dark:border-slate-700">
          <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-3 text-2xl text-slate-900 dark:text-slate-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <span className="font-bold">Gestión de Citas</span>
                {(isLoadingAppointments || isPending) && (
                  <div className="ml-2 h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent text-slate-600 dark:text-slate-400" />
                )}
              </CardTitle>
              <CardDescription className="text-sm text-slate-600 dark:text-slate-400">
                Sistema integral de control de admisión y seguimiento de pacientes
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
            <div className="p-4 sm:p-6">
              <div className="mb-6">
                {isMobile ? (
                  <MobileTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    appointmentCounts={appointmentCounts}
                    isLoading={isLoadingAppointments || isPending}
                  />
                ) : (
                  <TabsList className="grid w-full grid-cols-4 h-auto rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1.5 border border-slate-200 dark:border-slate-700">
                    {TABS_CONFIG.map((tab) => (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm py-3 px-4 text-sm font-medium rounded-lg text-slate-600 dark:text-slate-400 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 transition-all"
                      >
                        <div className="flex items-center justify-center gap-2.5">
                          <tab.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          <span>{tab.label}</span>
                          {tab.countKey && appointmentCounts[tab.countKey] > 0 && !(isLoadingAppointments || isPending) && (
                            <Badge 
                              variant="secondary" 
                              className="h-5 px-2 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            >
                              {appointmentCounts[tab.countKey] > 99 ? "99+" : appointmentCounts[tab.countKey]}
                            </Badge>
                          )}
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                )}
              </div>

              {["today", "future", "past"].includes(activeTab) && (
                <div className="mb-6">
                  <FilterControls
                    filters={filters}
                    onUpdateFilters={handleUpdateFilters}
                    onClearFilters={handleClearFilters}
                    onRefresh={refetchAppointments}
                    isLoading={isLoadingAppointments || isPending}
                  />
                </div>
              )}
            </div>

            <div className="px-4 sm:px-6 pb-6">
              <TabsContent value="newPatient" className="mt-0">
                <Suspense fallback={<LoadingSkeleton />}>
                  <LazyNewPatientForm onSuccess={handleNewPatientSuccess} />
                </Suspense>
              </TabsContent>

              <TabsContent value="today" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.today, "today")}
              </TabsContent>

              <TabsContent value="future" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.future, "future")}
              </TabsContent>

              <TabsContent value="past" className="mt-0">
                {renderAppointmentsContent(classifiedAndFilteredAppointments.past, "past")}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Survey Dialog */}
      {surveyDialog.isOpen && (
        <Suspense fallback={null}>
          <LazySurveyShareDialog
            isOpen={surveyDialog.isOpen}
            patient={{
              id: surveyDialog.patientId,
              nombre: surveyDialog.patientName,
              apellidos: surveyDialog.patientLastName,
              telefono: surveyDialog.patientPhone
            }}
            surveyLink={surveyDialog.surveyLink}
            onStartInternal={() => {
              toast.success(`Encuesta iniciada para ${surveyDialog.patientName}`);
              setSurveyDialog(prev => ({ ...prev, isOpen: false }));
            }}
            onClose={() => setSurveyDialog(prev => ({ ...prev, isOpen: false }))}
          />
        </Suspense>
      )}

      {/* Alert Dialog Mejorado */}
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
                    (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action)) && "bg-blue-100 dark:bg-blue-900/50"
                  )}>
                    <dialogConfig.icon className={cn(
                      "h-6 w-6",
                      confirmDialog.action === "cancel" && "text-red-600 dark:text-red-400",
                      confirmDialog.action === "complete" && "text-green-600 dark:text-green-400",
                      confirmDialog.action === "noShow" && "text-amber-600 dark:text-amber-400",
                      (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action)) && "text-blue-600 dark:text-blue-400"
                    )} />
                  </div>
                  
                  <AlertDialogTitle className="text-xl font-bold">
                    {dialogConfig.title}
                  </AlertDialogTitle>
                </div>
                
                <AlertDialogDescription asChild>
                  <div className="pt-2 space-y-4 text-sm">
                    {confirmDialog.appointmentData && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <p className="font-semibold mb-3 text-slate-900 dark:text-slate-100">
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