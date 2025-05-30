
import { useState, useEffect, useMemo, useCallback, useReducer, lazy, Suspense } from "react";
import { toast } from "sonner";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Icons
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  X, 
  UserPlus, 
  CalendarClock,
  CheckCircle2,
  Calendar,
  XCircle,
  Loader2
} from "lucide-react";

// Context and Utils
import { useAppContext } from "@/lib/context/app-context";
import { cn } from "@/lib/utils";
import { useBreakpointStore, useCurrentBreakpoint } from "@/hooks/use-breakpoint";

// Data Models
import { DiagnosisEnum, PatientData, AppointmentData } from "@/app/dashboard/data-model";

// Lazy loaded components
const NewPatientForm = lazy(() => import("./new-patient-form").then(module => ({ 
  default: module.NewPatientForm 
})));
const PatientList = lazy(() => import("./patient-list"));

// Loading fallbacks
const FormSkeleton = () => (
  <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse">
    <Skeleton className="h-6 w-2/3 mb-4" />
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="flex justify-end mt-4">
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

const PatientListSkeleton = () => (
  <div className="space-y-3 pt-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 border rounded-md">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
    ))}
  </div>
);

// Predefined values
const diagnosisValues = Object.values(DiagnosisEnum);

// State types and reducer
type PatientManagementState = {
  activeTab: string;
  searchTerm: string;
  isPatientFormOpen: boolean;
  isUnifiedFormOpen: boolean;
  isAppointmentFormOpen: boolean;
  selectedPatient: PatientData | null;
  isRefreshing: boolean;
  showFilters: boolean;
  filterDiagnosis: string;
};

type PatientManagementAction = 
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'TOGGLE_PATIENT_FORM'; payload?: boolean }
  | { type: 'TOGGLE_UNIFIED_FORM'; payload?: boolean }
  | { type: 'TOGGLE_APPOINTMENT_FORM'; payload?: boolean }
  | { type: 'SET_SELECTED_PATIENT'; payload: PatientData | null }
  | { type: 'SET_REFRESHING'; payload: boolean }
  | { type: 'TOGGLE_FILTERS'; payload?: boolean }
  | { type: 'SET_FILTER_DIAGNOSIS'; payload: string }
  | { type: 'RESET_FILTERS' };

const initialState: PatientManagementState = {
  activeTab: "pendientes",
  searchTerm: "",
  isPatientFormOpen: false,
  isUnifiedFormOpen: false,
  isAppointmentFormOpen: false,
  selectedPatient: null,
  isRefreshing: false,
  showFilters: false,
  filterDiagnosis: "",
};

function patientManagementReducer(state: PatientManagementState, action: PatientManagementAction): PatientManagementState {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload };
    case 'TOGGLE_PATIENT_FORM':
      return { ...state, isPatientFormOpen: action.payload ?? !state.isPatientFormOpen };
    case 'TOGGLE_UNIFIED_FORM':
      return { ...state, isUnifiedFormOpen: action.payload ?? !state.isUnifiedFormOpen };
    case 'TOGGLE_APPOINTMENT_FORM':
      return { ...state, isAppointmentFormOpen: action.payload ?? !state.isAppointmentFormOpen };
    case 'SET_SELECTED_PATIENT':
      return { ...state, selectedPatient: action.payload };
    case 'SET_REFRESHING':
      return { ...state, isRefreshing: action.payload };
    case 'TOGGLE_FILTERS':
      return { ...state, showFilters: action.payload ?? !state.showFilters };
    case 'SET_FILTER_DIAGNOSIS':
      return { ...state, filterDiagnosis: action.payload };
    case 'RESET_FILTERS':
      return { ...state, searchTerm: "", filterDiagnosis: "", showFilters: false };
    default:
      return state;
  }
}

export function OptimizedPatientManagement() {
  // Use breakpoints from our custom hook instead of direct media query
  const breakpointStore = useBreakpointStore();
  const currentBreakpoint = useCurrentBreakpoint();
  const isMobile = currentBreakpoint === "mobile";
  
  // Use reducer for state management instead of multiple useState calls
  const [state, dispatch] = useReducer(patientManagementReducer, initialState);
  
  // Destructure state for easier access
  const { 
    activeTab, 
    searchTerm, 
    isPatientFormOpen, 
    isUnifiedFormOpen, 
    isAppointmentFormOpen, 
    selectedPatient, 
    isRefreshing, 
    showFilters, 
    filterDiagnosis 
  } = state;

  // App context data
  const { 
    patients = [], 
    appointments = [], 
    fetchPatients = () => Promise.resolve(patients), 
    isLoadingPatients,
  } = useAppContext();

  // Memoized action handlers
  const handleEditPatient = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast.error("Error", { description: "No se pudo encontrar el paciente seleccionado." });
      return;
    }
    toast.info(`Funcionalidad "Editar Paciente" (ID: ${patientId}) pendiente de implementación.`);
    console.log("Edit patient:", patient);
  }, [patients]);

  const handleDeletePatient = useCallback(async (patientId: string) => {
    toast.info(`Funcionalidad "Eliminar Paciente" (ID: ${patientId}) pendiente de implementación.`);
    console.log("Delete patient ID:", patientId);
  }, []);
  
  const handleMarkPresent = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast.error("Error", { description: "No se pudo encontrar el paciente seleccionado." });
      return;
    }
    toast.success(`${patient.nombre} ${patient.apellidos} marcado como presente`, {
      description: "El paciente ha sido marcado como presente para su cita.",
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />
    });
    console.log("Patient marked as present:", patientId);
  }, [patients]);
  
  const handleReschedule = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast.error("Error", { description: "No se pudo encontrar el paciente seleccionado." });
      return;
    }
    toast.info(`Reagendar cita para ${patient.nombre} ${patient.apellidos}`, {
      description: "Funcionalidad de reagendamiento pendiente de implementación.",
      icon: <Calendar className="h-5 w-5 text-blue-500" />
    });
    console.log("Reschedule for patient:", patientId);
  }, [patients]);
  
  const handleCancel = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast.error("Error", { description: "No se pudo encontrar el paciente seleccionado." });
      return;
    }
    toast.info(`Cancelar cita para ${patient.nombre} ${patient.apellidos}`, {
      description: "Funcionalidad de cancelación pendiente de implementación.",
      icon: <XCircle className="h-5 w-5 text-red-500" />
    });
    console.log("Cancel for patient:", patientId);
  }, [patients]);

  // Memoized patient filters
  const pendingPatients = useMemo(() => {
    if (!Array.isArray(patients)) return [];
    return patients.filter((patient) => {
      if (patient.estado_paciente !== "PENDIENTE DE CONSULTA") return false;
      const patientAppointments =
        appointments?.filter((app) => String(app.patientId) === String(patient.id)) || [];
      if (patientAppointments.length === 0) return true;
      return patientAppointments.every((app) => app.estado === "CANCELADA" || app.estado === "REAGENDADA");
    });
  }, [patients, appointments]);

  // Memoized filtered patients
  const filteredPatients = useMemo(() => {
    const basePatients = activeTab === "pendientes" ? pendingPatients : patients || [];
    if (!Array.isArray(basePatients)) return [];

    let filtered = [...basePatients];

    if (filterDiagnosis) {
      filtered = filtered.filter(
        (p) => p.diagnostico_principal === filterDiagnosis ||
              (p as any).diagnostico === filterDiagnosis
      );
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchLower) ||
          p.telefono?.includes(searchTerm) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.diagnostico_principal?.toLowerCase().includes(searchLower) ||
          (p as any).diagnostico?.toLowerCase?.().includes(searchLower),
      );
    }
    return filtered;
  }, [activeTab, pendingPatients, patients, searchTerm, filterDiagnosis]);

  // Handle data refresh
  const handleRefresh = useCallback(async () => {
    if (!fetchPatients) {
      toast.error("Error de configuración", { description: "La función para actualizar pacientes no está disponible." });
      return;
    }
    dispatch({ type: 'SET_REFRESHING', payload: true });
    try {
      await fetchPatients();
      toast.success("Lista de pacientes actualizada.");
    } catch (error: any) {
      console.error("[PatientManagement] Error refreshing:", error);
      toast.error("Error al actualizar", { description: error?.message || "No se pudieron actualizar los datos" });
    } finally {
      dispatch({ type: 'SET_REFRESHING', payload: false });
    }
  }, [fetchPatients]);

  // Form success handlers
  const handlePatientCreated = useCallback(
    (data: { patient?: PatientData; appointment?: AppointmentData } | undefined) => {
      handleRefresh();
      if (data?.patient) {
        dispatch({ type: 'SET_SELECTED_PATIENT', payload: data.patient });
        dispatch({ type: 'TOGGLE_APPOINTMENT_FORM', payload: true });
      }
    },
    [handleRefresh]
  );

  const handleUnifiedFormSuccess = useCallback(
    (data: { patient?: PatientData; appointment?: AppointmentData } | undefined) => {
      handleRefresh();
    },
    [handleRefresh]
  );

  const handleAppointmentCreated = useCallback(
    (data: { patient?: PatientData; appointment?: AppointmentData } | undefined) => {
      dispatch({ type: 'SET_SELECTED_PATIENT', payload: null });
      dispatch({ type: 'TOGGLE_APPOINTMENT_FORM', payload: false });
      handleRefresh();
    },
    [handleRefresh]
  );

  // Reset filters
  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  // Initial data loading
  useEffect(() => {
    if (fetchPatients) {
      fetchPatients().catch((err: Error | any) => {
        console.error("[PatientManagement] Error inicial cargando pacientes:", err);
        toast.error("Error al cargar pacientes", { description: err?.message || "No se pudieron cargar los datos" });
      });
    } else {
      console.error("[PatientManagement] fetchPatients no está disponible");
      toast.error("Error de configuración", { description: "La función para cargar pacientes no está disponible." });
    }
  }, [fetchPatients]);

  // Open appointment modal for a specific patient
  const openAppointmentModalForPatient = useCallback((patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) {
      toast.error("Error", { description: "No se pudo encontrar el paciente seleccionado." });
      return;
    }
    dispatch({ type: 'SET_SELECTED_PATIENT', payload: patient });
    dispatch({ type: 'TOGGLE_APPOINTMENT_FORM', payload: true });
  }, [patients]);

  return (
    <Card className="shadow-md border-slate-200 dark:border-slate-700 w-full">
      <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-t-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Users className="h-5 w-5" /> Gestión de Pacientes
            </CardTitle>
            <CardDescription className="text-sm">
              {pendingPatients.length} pendientes de cita • {patients.length} totales
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {/* Botón para solo registrar un paciente */}
            <Suspense fallback={
              <Button variant="outline" disabled className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando...</span>
              </Button>
            }>
              <NewPatientForm
                mode="registerOnly"
                dialogTrigger={
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-slate-300 bg-white hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span>Nuevo Paciente</span>
                  </Button>
                }
                onSuccess={handlePatientCreated}
                customButtonLabel="Nuevo Paciente"
                buttonVariant="outline"
              />
            </Suspense>
            
            {/* Botón para registrar y agendar en un solo paso */}
            <Suspense fallback={
              <Button variant="default" disabled className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Cargando...</span>
              </Button>
            }>
              <NewPatientForm
                mode="registerAndSchedule"
                dialogTrigger={
                  <Button 
                    variant="default" 
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    <CalendarClock className="h-4 w-4" />
                    <span>{isMobile ? "Reg. + Agendar" : "Registrar y Agendar"}</span>
                    <Badge className="ml-1 bg-blue-700 dark:bg-blue-800 text-xs font-medium px-1.5">2-en-1</Badge>
                  </Button>
                }
                onSuccess={handleUnifiedFormSuccess}
              />
            </Suspense>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Actualizar lista de pacientes"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs 
          defaultValue="pendientes" 
          value={activeTab} 
          onValueChange={(value) => dispatch({ type: 'SET_ACTIVE_TAB', payload: value })}
          className="w-full"
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger
                  value="pendientes"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                >
                  <Users className="h-4 w-4" /> Pendientes{" "}
                  <Badge variant="secondary" className="ml-1.5">
                    {pendingPatients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="todos" className="flex-1 sm:flex-none flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4" /> Todos{" "}
                  <Badge variant="secondary" className="ml-1.5">
                    {patients.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9 w-full"
                    value={searchTerm}
                    onChange={(e) => dispatch({ type: 'SET_SEARCH_TERM', payload: e.target.value })}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => dispatch({ type: 'SET_SEARCH_TERM', payload: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => dispatch({ type: 'TOGGLE_FILTERS' })}
                  className={cn(showFilters && "bg-accent text-accent-foreground")}
                  title="Mostrar/ocultar filtros"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="border rounded-md p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Filtros Avanzados</h3>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                    Limpiar filtros
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FormLabel className="text-xs font-medium">Diagnóstico</FormLabel>
                    <Select
                      value={filterDiagnosis}
                      onValueChange={(value) => dispatch({ type: 'SET_FILTER_DIAGNOSIS', payload: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Cualquier diagnóstico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Cualquier diagnóstico</SelectItem>
                        {diagnosisValues.map((d) => (
                          <SelectItem key={d} value={d || ""}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {["pendientes", "todos"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              {isLoadingPatients ? (
                <PatientListSkeleton />
              ) : filteredPatients.length > 0 ? (
                <Suspense fallback={<PatientListSkeleton />}>
                  <PatientList
                    patients={filteredPatients}
                    onViewDetails={(patientId) => {
                      const patient = patients.find(p => p.id === patientId);
                      if (patient) {
                        toast.info(`Visualizando detalles de ${patient.nombre} ${patient.apellidos}`);
                      }
                    }}
                    onScheduleAppointment={openAppointmentModalForPatient}
                    onEditPatient={handleEditPatient}
                    onMarkPresent={handleMarkPresent}
                    onReschedule={handleReschedule}
                    onCancel={handleCancel}
                  />
                </Suspense>
              ) : (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md min-h-[200px] flex flex-col justify-center items-center">
                  {searchTerm || filterDiagnosis ? (
                    <>
                      <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="mb-3">No se encontraron pacientes que coincidan con los filtros.</p>
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <>
                      <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="mb-3">
                        {tabValue === "pendientes"
                          ? "No hay pacientes pendientes de asignar cita."
                          : "No hay pacientes registrados."}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => dispatch({ type: 'TOGGLE_PATIENT_FORM', payload: true })}
                        >
                          Registrar Paciente
                        </Button>
                        <Button 
                          variant="default" 
                          size="sm" 
                          onClick={() => dispatch({ type: 'TOGGLE_UNIFIED_FORM', payload: true })}
                        >
                          Paciente + Cita
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Formulario de cita separado - cargado solo cuando se necesita */}
      {selectedPatient && (
        <Suspense fallback={<FormSkeleton />}>
          <NewPatientForm
            mode="scheduleOnly"
            patientForScheduling={selectedPatient}
            dialogTrigger={null}
            onSuccess={handleAppointmentCreated}
          />
        </Suspense>
      )}
    </Card>
  );
}

export default OptimizedPatientManagement;