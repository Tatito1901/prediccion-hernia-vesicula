"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  SearchIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserPlus,
  Activity,
  TrendingUp,
  Calendar,
  FileText,
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
import { Card } from "@/components/ui/card";
import PatientTable from "./patient-table";
import { NewPatientForm } from "@/components/patient-admision/new-patient-form";
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog";
import PatientDetailsDialog from "./patient-details-dialog";
import { ScheduleAppointmentDialog } from "./schedule-appointment-dialog";
import { StatsCard } from "@/components/ui/stats-card";
import { SimplePagination } from "@/components/ui/simple-pagination";
import { useProcessedPatients } from "@/hooks/use-processed-patients";
import { usePatientStats } from "@/hooks/use-patient-stats";

export interface EnrichedPatient extends Patient {
  nombreCompleto: string;
  fecha_proxima_cita_iso?: string;
  encuesta_completada: boolean;
  displayDiagnostico: string;
}

const PAGE_SIZE = 15;

const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    label: "Pend. Consulta",
    style: "bg-amber-50 text-amber-700 border-amber-200"
  },
  [PatientStatusEnum.CONSULTADO]: {
    label: "Consultado", 
    style: "bg-blue-50 text-blue-700 border-blue-200"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    label: "Seguimiento",
    style: "bg-purple-50 text-purple-700 border-purple-200"
  },
  [PatientStatusEnum.OPERADO]: {
    label: "Operado",
    style: "bg-emerald-50 text-emerald-700 border-emerald-200"
  },
  [PatientStatusEnum.NO_OPERADO]: {
    label: "No Operado",
    style: "bg-red-50 text-red-700 border-red-200"
  },
  [PatientStatusEnum.INDECISO]: {
    label: "Indeciso",
    style: "bg-slate-50 text-slate-700 border-slate-200"
  }
} as const;

// El componente StatsCard ahora se importa desde @/components/ui/stats-card

// Loading skeleton simplificado
const LoadingSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
    <div className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 sm:h-24 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 sm:h-16 bg-slate-100 dark:bg-slate-800/50 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// El componente SimplePagination ahora se importa desde @/components/ui/simple-pagination

export function PatientManagement() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<keyof typeof PatientStatusEnum | "all">("all");

  const { 
    data: patientData, 
    isLoading: isLoadingPatients, 
    error: patientError 
  } = usePatients(currentPage, PAGE_SIZE, statusFilter === 'all' ? undefined : statusFilter);

  const patients = patientData?.data || [];
  const pagination = patientData?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Cargar todas las citas (sin paginación por ahora para el enriquecimiento)
  const { data: appointmentsData } = useAppointments(1, 1000); // TODO: Considerar una mejor estrategia si hay muchas citas
  const appointments = appointmentsData?.appointments || [];
  
  const router = useRouter();

  // Estados para filtros locales (aplicados a la página actual)
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Estados para modales
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatientForSurvey, setSelectedPatientForSurvey] = useState<Patient | null>(null);
  const [surveyLink, setSurveyLink] = useState("");
  const [isNewPatientFormOpen, setIsNewPatientFormOpen] = useState(false);

  // Estado para detalles de paciente
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Patient | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Estado para agendar cita
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientForAppointment, setPatientForAppointment] = useState<Patient | null>(null);

  // Usar el hook personalizado para procesamiento de datos
  const {
    enrichedPatients,
    filteredAndEnrichedPatients, 
    statusStats
  } = useProcessedPatients(
    patients,
    appointments,
    searchTerm,
    statusFilter
  );

  // Estadísticas principales desde la API
  const { 
    data: mainStats,
    isLoading: isLoadingStats,
    error: statsError
  } = usePatientStats();

  // Handlers simplificados
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatientDetails(patient);
    setDetailsDialogOpen(true);
  };

  const handleShareSurvey = (patient: Patient) => {
    setSelectedPatientForSurvey(patient);
    setSurveyLink(`${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}`);
    setShareDialogOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    toast.info(`Editar paciente: ${patient.nombre} ${patient.apellidos}`);
  };

  const handleAnswerSurvey = (patient: Patient) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`);
  };

  const handleScheduleAppointment = (patient: Patient) => {
    setPatientForAppointment(patient);
    setAppointmentDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setIsMobileFiltersOpen(false);
  };

  const hasActiveFilters = !!searchTerm || statusFilter !== "all";

  // Componente de filtros
  const FilterContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="space-y-3">
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter(value as keyof typeof PatientStatusEnum | "all");
          if (isMobile) setIsMobileFiltersOpen(false);
        }}
      >
        <SelectTrigger className={cn(
          "h-8 sm:h-9 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
          "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70",
          isMobile ? "w-full" : "w-full sm:w-[180px]"
        )}>
          <SelectValue placeholder="Filtrar por estado" className="text-slate-600 dark:text-slate-300" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
          <SelectItem value="all" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
            <div className="flex items-center justify-between w-full">
              <span>Todos los estados</span>
              <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {statusStats.all}
              </Badge>
            </div>
          </SelectItem>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <SelectItem key={status} value={status} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
              <div className="flex items-center justify-between w-full">
                <span>{config.label}</span>
                <Badge variant="outline" className={cn(
                  "ml-2 shadow-sm font-medium", 
                  status === statusFilter ? "ring-1 ring-offset-1 ring-slate-200 dark:ring-slate-700 dark:ring-offset-slate-900" : "",
                  config.style
                )}>
                  {status === "all" ? statusStats.all : statusStats[status as keyof typeof PatientStatusEnum]}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
        <Button 
          variant="ghost" 
          size="sm"
          onClick={clearAllFilters}
          className={cn(
            "text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100",
            "hover:bg-slate-100 dark:hover:bg-slate-800 h-8 sm:h-9",
            isMobile ? "w-full" : ""
          )}
        >
          Limpiar Filtros
        </Button>
    </div>
  );

  if (isLoadingPatients) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="w-full space-y-3 sm:space-y-4 pb-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl border shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
                Gestión de Pacientes
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 max-w-xl">
                Sistema integral para seguimiento médico, historiales y citas.
              </p>
            </div>
            <Button 
              onClick={() => setIsNewPatientFormOpen(true)} 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Paciente
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-4 sm:mt-6">
            <StatsCard 
              icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Total Pacientes" 
              value={isLoadingStats ? "..." : `${mainStats?.total_patients ?? 0}`} 
              color="blue" 
            />
            <StatsCard 
              icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Encuestas Comp." 
              value={isLoadingStats ? "..." : `${mainStats?.survey_completion_rate ?? 0}%`} 
              trend={mainStats?.survey_completion_rate && mainStats.survey_completion_rate > 70 ? 5 : -2}
              color="purple" 
            />
            <StatsCard 
              icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Pend. Consulta" 
              value={isLoadingStats ? "..." : mainStats?.pending_consults ?? 0} 
              color="amber" 
            />
            <StatsCard 
              icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Pac. Operados" 
              value={isLoadingStats ? "..." : mainStats?.operated_patients ?? 0} 
              trend={2}
              color="emerald" 
            />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 px-3 py-2">
        {/* Contenedor de filtros mejorado */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Sección de búsqueda - priorizada */}
          <div className="flex-grow max-w-md order-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                placeholder="Buscar pacientes..."
                className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                }}
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Filtros desktop - alineados a la derecha */}
          <div className="hidden sm:flex items-center gap-3 order-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <h2 className="text-sm font-medium text-slate-800 dark:text-slate-200">Filtros:</h2>
              </div>
              
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as keyof typeof PatientStatusEnum | "all");
                }}
              >
                <SelectTrigger className="h-9 text-sm bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" className="text-slate-600 dark:text-slate-300" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  <SelectItem value="all" className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                    <div className="flex items-center justify-between w-full">
                      <span>Todos los estados</span>
                      <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {statusStats.all}
                      </Badge>
                    </div>
                  </SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                    <SelectItem key={status} value={status} className="focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span>{config.label}</span>
                        <Badge variant="outline" className={cn(
                          "ml-2 shadow-sm font-medium", 
                          status === statusFilter ? "ring-1 ring-offset-1 ring-slate-200 dark:ring-slate-700 dark:ring-offset-slate-900" : "",
                          config.style
                        )}>
                          {statusStats[status as keyof typeof PatientStatusEnum]}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 h-9"
                >
                  Limpiar Filtros
                </Button>
              )}
            </div>
          </div>
          
          {/* Filtros móvil */}
          <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
            <SheetTrigger asChild className="sm:hidden order-2">
              <Button 
                variant="outline" 
                className="h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2 text-slate-500 dark:text-slate-400" /> 
                Filtros {hasActiveFilters && (
                  <span className="ml-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full h-5 w-5 inline-flex items-center justify-center text-xs font-medium">
                    {Number(!!searchTerm) + Number(statusFilter !== "all")}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <SheetHeader className="pb-3">
                <SheetTitle className="text-slate-900 dark:text-slate-100">Filtros</SheetTitle>
              </SheetHeader>
              <div className="px-4 py-4">
                <FilterContent isMobile />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Tabla */}
      <PatientTable 
        patients={filteredAndEnrichedPatients} // Usar los datos filtrados de la página actual
        onSelectPatient={handleSelectPatient}
        onShareSurvey={handleShareSurvey}
        onEditPatient={handleEditPatient}
        onAnswerSurvey={handleAnswerSurvey}
        onScheduleAppointment={handleScheduleAppointment}
        loading={isLoadingPatients} // Corregido: de isLoading a loading
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-6 sm:mt-8 pb-4">
          <SimplePagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange} 
            loading={isLoadingPatients} 
          />
        </div>
      )}

      {/* Modales */}
      {isNewPatientFormOpen && (
        <NewPatientForm 
          onSuccess={() => setIsNewPatientFormOpen(false)}
        />
      )}
      
      {selectedPatientForSurvey && shareDialogOpen && (
        <SurveyShareDialog 
          isOpen={shareDialogOpen} 
          patient={selectedPatientForSurvey} 
          surveyLink={surveyLink}
          onStartInternal={() => {
            if(selectedPatientForSurvey) {
              router.push(`/survey/${generateSurveyId()}?patientId=${selectedPatientForSurvey.id}&mode=internal`);
              setShareDialogOpen(false);
            }
          }}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedPatientForSurvey(null);
          }} 
        />
      )}
      
      {selectedPatientDetails && detailsDialogOpen && (
        <PatientDetailsDialog
          isOpen={detailsDialogOpen}
          patient={selectedPatientDetails}
          onClose={() => {
            setDetailsDialogOpen(false);
            setSelectedPatientDetails(null);
          }}
        />
      )}
      
      {patientForAppointment && appointmentDialogOpen && (
        <ScheduleAppointmentDialog
          isOpen={appointmentDialogOpen}
          patient={patientForAppointment}
          onClose={() => {
            setAppointmentDialogOpen(false);
            setPatientForAppointment(null);
          }}
        />
      )}
    </div>
  );
}