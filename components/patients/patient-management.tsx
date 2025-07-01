"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  X, 
  Users, 
  UserPlus,
  SlidersHorizontal,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePatients } from "@/hooks/use-patients";
import { useAppointments } from "@/hooks/use-appointments";
import { Patient, DiagnosisEnum, Appointment, PatientStatusEnum } from "@/lib/types";
import { generateSurveyId } from "@/lib/form-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StatsCard } from "@/components/ui/stats-card";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { useProcessedPatients } from "@/hooks/use-processed-patients";
import { usePatientStats } from "@/hooks/use-patient-stats";

// Importaciones directas - eliminamos lazy loading para componentes críticos
import PatientTable from "./patient-table";
import { NewPatientForm } from "@/components/patient-admision/new-patient-form";
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog";
import PatientDetailsDialog from "./patient-details-dialog";
import { ScheduleAppointmentDialog } from "./schedule-appointment-dialog";

export interface EnrichedPatient extends Patient {
  nombreCompleto: string;
  fecha_proxima_cita_iso?: string;
  encuesta_completada: boolean;
  displayDiagnostico: string;
}

const PAGE_SIZE = 15;

// Configuración estática simplificada - eliminamos Map para mejor rendimiento
const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { 
    label: "Pend. Consulta", 
    className: "bg-amber-50 text-amber-700 border-amber-200" 
  },
  [PatientStatusEnum.CONSULTADO]: { 
    label: "Consultado", 
    className: "bg-blue-50 text-blue-700 border-blue-200" 
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { 
    label: "Seguimiento", 
    className: "bg-purple-50 text-purple-700 border-purple-200" 
  },
  [PatientStatusEnum.OPERADO]: { 
    label: "Operado", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200" 
  },
  [PatientStatusEnum.NO_OPERADO]: { 
    label: "No Operado", 
    className: "bg-red-50 text-red-700 border-red-200" 
  },
  [PatientStatusEnum.INDECISO]: { 
    label: "Indeciso", 
    className: "bg-slate-50 text-slate-700 border-slate-200" 
  }
} as const;

// Estado simplificado - eliminamos el reducer complejo
interface AppState {
  currentPage: number;
  statusFilter: keyof typeof PatientStatusEnum | "all";
  searchTerm: string;
  modals: {
    newPatient: boolean;
    shareDialog: boolean;
    detailsDialog: boolean;
    appointmentDialog: boolean;
    mobileFilters: boolean;
  };
  selectedPatient: Patient | null;
  patientForAppointment: Patient | null;
  surveyLink: string;
}

// Loading skeleton simplificado
const LoadingSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="space-y-3">
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
);

// Componente de filtros simplificado
const FilterContent = ({ 
  statusFilter, 
  onStatusChange, 
  onClearFilters, 
  statusStats, 
  isMobile = false 
}: {
  statusFilter: string;
  onStatusChange: (value: string) => void;
  onClearFilters: () => void;
  statusStats: any;
  isMobile?: boolean;
}) => (
  <div className="space-y-3">
    <Select value={statusFilter} onValueChange={onStatusChange}>
      <SelectTrigger className={cn(
        "h-9 text-sm bg-slate-50 border-slate-200",
        isMobile ? "w-full" : "w-[180px]"
      )}>
        <SelectValue placeholder="Filtrar por estado" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center justify-between w-full">
            <span>Todos los estados</span>
            <Badge variant="secondary" className="ml-2">
              {statusStats.all}
            </Badge>
          </div>
        </SelectItem>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center justify-between w-full">
              <span>{config.label}</span>
              <Badge variant="outline" className={cn("ml-2", config.className)}>
                {statusStats[status as keyof typeof PatientStatusEnum]}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    
    <Button 
      variant="ghost" 
      size="sm"
      onClick={onClearFilters}
      className={cn("text-slate-600 hover:bg-slate-100", isMobile ? "w-full" : "")}
    >
      Limpiar Filtros
    </Button>
  </div>
);

// Componente principal optimizado
export const PatientManagement = () => {
  // Estado simplificado
  const [state, setState] = useState<AppState>({
    currentPage: 1,
    statusFilter: "all",
    searchTerm: "",
    modals: {
      newPatient: false,
      shareDialog: false,
      detailsDialog: false,
      appointmentDialog: false,
      mobileFilters: false,
    },
    selectedPatient: null,
    patientForAppointment: null,
    surveyLink: ''
  });

  const router = useRouter();

  // Data fetching
  const { 
    data: patientData, 
    isLoading: isLoadingPatients, 
  } = usePatients(state.currentPage, PAGE_SIZE, state.statusFilter === 'all' ? undefined : state.statusFilter);

  const { data: appointmentsData } = useAppointments(1, 1000);
  const { 
    data: mainStats,
    isLoading: isLoadingStats,
  } = usePatientStats();

  const patients = patientData?.data || [];
  const appointments = appointmentsData?.appointments || [];
  const pagination = patientData?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Procesamiento de datos optimizado
  const {
    filteredAndEnrichedPatients, 
    statusStats
  } = useProcessedPatients(patients, appointments, state.searchTerm, state.statusFilter);

  // Función helper para actualizar estado
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const updateModals = useCallback((updates: Partial<AppState['modals']>) => {
    setState(prev => ({ 
      ...prev, 
      modals: { ...prev.modals, ...updates }
    }));
  }, []);

  // Handlers simplificados
  const handlePageChange = useCallback((page: number) => {
    updateState({ currentPage: page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateState]);

  const handleSelectPatient = useCallback((patient: Patient) => {
    updateState({ selectedPatient: patient });
    updateModals({ detailsDialog: true });
  }, [updateState, updateModals]);

  const handleShareSurvey = useCallback((patient: Patient) => {
    const link = `${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}`;
    updateState({ selectedPatient: patient, surveyLink: link });
    updateModals({ shareDialog: true });
  }, [updateState, updateModals]);

  const handleEditPatient = useCallback((patient: Patient) => {
    toast.info(`Editar paciente: ${patient.nombre} ${patient.apellidos}`);
  }, []);

  const handleAnswerSurvey = useCallback((patient: Patient) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`);
  }, [router]);

  const handleScheduleAppointment = useCallback((patient: Patient) => {
    updateState({ patientForAppointment: patient });
    updateModals({ appointmentDialog: true });
  }, [updateState, updateModals]);

  const handleStatusFilterChange = useCallback((value: string) => {
    updateState({ statusFilter: value as keyof typeof PatientStatusEnum | "all" });
    if (state.modals.mobileFilters) {
      updateModals({ mobileFilters: false });
    }
  }, [updateState, updateModals, state.modals.mobileFilters]);

  const handleClearFilters = useCallback(() => {
    updateState({ searchTerm: "", statusFilter: "all" });
    updateModals({ mobileFilters: false });
  }, [updateState, updateModals]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateState({ searchTerm: e.target.value });
  }, [updateState]);

  const clearSearch = useCallback(() => {
    updateState({ searchTerm: "" });
  }, [updateState]);

  // Cálculos memoizados simplificados
  const hasActiveFilters = state.searchTerm || state.statusFilter !== "all";
  const activeFiltersCount = Number(!!state.searchTerm) + Number(state.statusFilter !== "all");

  // Stats con fallbacks simples
  const statsData = {
    totalPatients: mainStats?.total_patients ?? 0,
    surveyRate: mainStats?.survey_completion_rate ?? 0,
    pendingConsults: mainStats?.pending_consults ?? 0,
    operatedPatients: mainStats?.operated_patients ?? 0
  };

  if (isLoadingPatients) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header */}
      <div className="bg-white rounded-xl border shadow-sm border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Gestión de Pacientes
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-xl">
              Sistema integral para seguimiento médico, historiales y citas.
            </p>
          </div>
          <Button 
            onClick={() => updateModals({ newPatient: true })}
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Paciente
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatsCard 
            icon={<Users className="h-5 w-5" />} 
            label="Total Pacientes" 
            value={isLoadingStats ? "..." : `${statsData.totalPatients}`} 
            color="blue" 
          />
          <StatsCard 
            icon="📊" 
            label="Encuestas Comp." 
            value={isLoadingStats ? "..." : `${statsData.surveyRate}%`} 
            trend={statsData.surveyRate > 70 ? 5 : -2}
            color="purple" 
          />
          <StatsCard 
            icon="📅" 
            label="Pend. Consulta" 
            value={isLoadingStats ? "..." : statsData.pendingConsults} 
            color="amber" 
          />
          <StatsCard 
            icon="⚕️" 
            label="Pac. Operados" 
            value={isLoadingStats ? "..." : statsData.operatedPatients} 
            trend={2}
            color="emerald" 
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-3 py-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Búsqueda */}
          <div className="flex-grow max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar pacientes..."
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
                value={state.searchTerm}
                onChange={handleSearchChange}
              />
              {state.searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Filtros desktop */}
          <div className="hidden sm:flex items-center gap-3">
            <FilterContent
              statusFilter={state.statusFilter}
              onStatusChange={handleStatusFilterChange}
              onClearFilters={handleClearFilters}
              statusStats={statusStats}
            />
          </div>
          
          {/* Filtros móvil */}
          <Sheet open={state.modals.mobileFilters} onOpenChange={(open) => updateModals({ mobileFilters: open })}>
            <SheetTrigger asChild className="sm:hidden">
              <Button variant="outline" className="h-9">
                <SlidersHorizontal className="h-4 w-4 mr-2" /> 
                Filtros {hasActiveFilters && (
                  <span className="ml-1 bg-blue-100 text-blue-700 rounded-full h-5 w-5 inline-flex items-center justify-center text-xs font-medium">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-lg">
              <SheetHeader className="pb-3">
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="px-4 py-4">
                <FilterContent
                  statusFilter={state.statusFilter}
                  onStatusChange={handleStatusFilterChange}
                  onClearFilters={handleClearFilters}
                  statusStats={statusStats}
                  isMobile
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Tabla */}
      <PatientTable 
        patients={filteredAndEnrichedPatients}
        onSelectPatient={handleSelectPatient}
        onShareSurvey={handleShareSurvey}
        onEditPatient={handleEditPatient}
        onAnswerSurvey={handleAnswerSurvey}
        onScheduleAppointment={handleScheduleAppointment}
        loading={isLoadingPatients}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-8 pb-4">
          <SimplePagination 
            currentPage={state.currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
            loading={isLoadingPatients} 
          />
        </div>
      )}

      {/* Modales */}
      {state.modals.newPatient && (
        <NewPatientForm 
          onSuccess={() => updateModals({ newPatient: false })}
        />
      )}
      
      {state.selectedPatient && state.modals.shareDialog && (
        <SurveyShareDialog 
          isOpen={state.modals.shareDialog} 
          patient={state.selectedPatient} 
          surveyLink={state.surveyLink}
          onStartInternal={() => {
            if(state.selectedPatient) {
              router.push(`/survey/${generateSurveyId()}?patientId=${state.selectedPatient.id}&mode=internal`);
              updateModals({ shareDialog: false });
            }
          }}
          onClose={() => updateModals({ shareDialog: false })} 
        />
      )}
      
      {state.selectedPatient && state.modals.detailsDialog && (
        <PatientDetailsDialog
          isOpen={state.modals.detailsDialog}
          patient={state.selectedPatient}
          onClose={() => updateModals({ detailsDialog: false })}
        />
      )}
      
      {state.patientForAppointment && state.modals.appointmentDialog && (
        <ScheduleAppointmentDialog
          isOpen={state.modals.appointmentDialog}
          patient={state.patientForAppointment}
          onClose={() => updateModals({ appointmentDialog: false })}
        />
      )}
    </div>
  );
};

PatientManagement.displayName = "PatientManagement";