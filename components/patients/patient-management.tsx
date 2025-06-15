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
import { usePatientStore } from "@/lib/stores/patient-store";
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import type { PatientData, DiagnosisType, AppointmentData } from "@/app/dashboard/data-model";
import { PatientStatusEnum } from "@/app/dashboard/data-model";
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

export interface EnrichedPatientData extends PatientData {
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

// Componente StatsCard simplificado
const StatsCard = ({ 
  icon, 
  label, 
  value, 
  trend, 
  color = "blue" 
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  color?: "blue" | "purple" | "amber" | "emerald" | "red" | "slate";
}) => {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400", 
    amber: "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
    emerald: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400",
    slate: "bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
  };

  const gradientClasses = {
    blue: "from-blue-400 to-blue-600 dark:from-blue-500/70 dark:to-blue-700/70",
    purple: "from-purple-400 to-purple-600 dark:from-purple-500/70 dark:to-purple-700/70",
    amber: "from-amber-400 to-amber-600 dark:from-amber-500/70 dark:to-amber-700/70", 
    emerald: "from-emerald-400 to-emerald-600 dark:from-emerald-500/70 dark:to-emerald-700/70",
    red: "from-red-400 to-red-600 dark:from-red-500/70 dark:to-red-700/70",
    slate: "from-slate-400 to-slate-600 dark:from-slate-500/70 dark:to-slate-700/70"
  };

  return (
    <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
            colorClasses[color]
          )}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              <TrendingUp className={cn("h-3 w-3", trend < 0 && "transform rotate-180")} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-2 sm:mt-3">
          <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{value}</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
      </div>
      <div className={cn("absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r", gradientClasses[color])} />
    </Card>
  );
};

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

// Paginación simple
const SimplePagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  loading 
}: {
  currentPage: number;
  totalPages: number; 
  onPageChange: (page: number) => void;
  loading: boolean;
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1 || loading}
        className="h-8 w-8 sm:w-auto sm:px-3"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline ml-1">Anterior</span>
      </Button>
      
      <div className="flex items-center gap-1">
        {getVisiblePages().map((page, idx) => 
          page === '...' ? (
            <span key={`dots-${idx}`} className="px-2 text-slate-400">...</span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page as number)}
              disabled={loading}
              className={cn(
                "h-8 w-8",
                page === currentPage && "bg-blue-600 hover:bg-blue-700 text-white"
              )}
            >
              {page}
            </Button>
          )
        )}
      </div>

      <Button 
        variant="outline" 
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || loading}
        className="h-8 w-8 sm:w-auto sm:px-3"
      >
        <span className="hidden sm:inline mr-1">Siguiente</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function PatientManagement() {
  // Utilizamos los stores de Zustand en lugar de useAppContext
  const patients = usePatientStore(state => state.patients);
  const isLoadingPatients = usePatientStore(state => state.isLoading);
  const fetchPatients = usePatientStore(state => state.fetchPatients);
  
  const appointments = useAppointmentStore(state => state.appointments);
  const fetchAppointments = useAppointmentStore(state => state.fetchAppointments);
  
  // Efecto para cargar los datos al montar el componente
  useEffect(() => {
    fetchPatients();
    fetchAppointments();
  }, [fetchPatients, fetchAppointments]);
  const router = useRouter();

  // Estados simplificados
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<PatientStatusEnum | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Estados para modales
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatientForSurvey, setSelectedPatientForSurvey] = useState<PatientData | null>(null);
  const [surveyLink, setSurveyLink] = useState("");
  const [isNewPatientFormOpen, setIsNewPatientFormOpen] = useState(false);

  // Estado para detalles de paciente
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<PatientData | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Estado para agendar cita
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientForAppointment, setPatientForAppointment] = useState<PatientData | null>(null);

  // Datos enriquecidos - simplificado
  const enrichedPatients = useMemo((): EnrichedPatientData[] => {
    if (!patients || !appointments) return [];
    
    return patients.map((patient) => {
      const patientAppointments = (appointments as AppointmentData[])
        .filter((appointment) => appointment.patientId === patient.id)
        .sort((a, b) => new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime());

      const nextAppointment = patientAppointments.find(
        appointment => new Date(appointment.fechaConsulta) >= new Date()
      );

      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        fecha_proxima_cita_iso: nextAppointment?.fechaConsulta.toString(),
        encuesta_completada: !!patient.encuesta?.id,
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
      };
    });
  }, [patients, appointments]);

  // Filtrado y paginación combinados
  const { filteredPatients, paginatedPatients, totalPages, statusStats } = useMemo(() => {
    let filtered = enrichedPatients;
    const term = searchTerm.toLowerCase();

    // Filtrar por búsqueda
    if (term) {
      filtered = filtered.filter(p =>
        p.nombreCompleto.toLowerCase().includes(term) ||
        p.telefono?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.displayDiagnostico.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    // Filtrar por estado
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.estado_paciente === statusFilter);
    }

    // Calcular estadísticas
    const stats = enrichedPatients.reduce((acc, patient) => {
      if (patient.estado_paciente && patient.estado_paciente in STATUS_CONFIG) {
        acc[patient.estado_paciente]++;
      }
      return acc;
    }, {
      [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: 0,
      [PatientStatusEnum.CONSULTADO]: 0,
      [PatientStatusEnum.EN_SEGUIMIENTO]: 0,
      [PatientStatusEnum.OPERADO]: 0,
      [PatientStatusEnum.NO_OPERADO]: 0,
      [PatientStatusEnum.INDECISO]: 0,
    });

    // Paginar
    const pages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
    const start = (currentPage - 1) * PAGE_SIZE;
    const paginated = filtered.slice(start, start + PAGE_SIZE);

    return {
      filteredPatients: filtered,
      paginatedPatients: paginated,
      totalPages: pages,
      statusStats: { ...stats, all: enrichedPatients.length }
    };
  }, [enrichedPatients, searchTerm, statusFilter, currentPage]);

  // Estadísticas principales
  const mainStats = useMemo(() => {
    const totalSurveys = enrichedPatients.filter(p => p.encuesta_completada).length;
    return {
      totalPatients: enrichedPatients.length,
      surveyCompletionRate: enrichedPatients.length > 0 
        ? Math.round((totalSurveys / enrichedPatients.length) * 100) 
        : 0,
      pendingConsults: statusStats[PatientStatusEnum.PENDIENTE_DE_CONSULTA] || 0,
      operatedPatients: statusStats[PatientStatusEnum.OPERADO] || 0,
    };
  }, [enrichedPatients, statusStats]);

  // Handlers simplificados
  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPatient = (patient: PatientData) => {
    setSelectedPatientDetails(patient);
    setDetailsDialogOpen(true);
  };

  const handleShareSurvey = (patient: PatientData) => {
    setSelectedPatientForSurvey(patient);
    setSurveyLink(`${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}`);
    setShareDialogOpen(true);
  };

  const handleEditPatient = (patient: PatientData) => {
    toast.info(`Editar paciente: ${patient.nombre} ${patient.apellidos}`);
  };

  const handleAnswerSurvey = (patient: PatientData) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`);
  };

  const handleScheduleAppointment = (patient: PatientData) => {
    setPatientForAppointment(patient);
    setAppointmentDialogOpen(true);
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
    setIsMobileFiltersOpen(false);
  };

  const hasActiveFilters = !!searchTerm || statusFilter !== "all";

  // Componente de filtros
  const FilterContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="space-y-3">
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          setStatusFilter(value as PatientStatusEnum | "all");
          setCurrentPage(1);
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
              <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600">
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
                  {statusStats[status as PatientStatusEnum]}
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

  if (loading) {
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
              value={mainStats.totalPatients} 
              color="blue" 
            />
            <StatsCard 
              icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Encuestas Comp." 
              value={`${mainStats.surveyCompletionRate}%`} 
              trend={mainStats.surveyCompletionRate > 70 ? 5 : -2}
              color="purple" 
            />
            <StatsCard 
              icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Pend. Consulta" 
              value={mainStats.pendingConsults} 
              color="amber" 
            />
            <StatsCard 
              icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />} 
              label="Pac. Operados" 
              value={mainStats.operatedPatients} 
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
                  setCurrentPage(1);
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
                  setStatusFilter(value as PatientStatusEnum | "all");
                  setCurrentPage(1);
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
                          {statusStats[status as PatientStatusEnum]}
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
        patients={paginatedPatients}
        onSelectPatient={handleSelectPatient}
        onShareSurvey={handleShareSurvey}
        onAnswerSurvey={handleAnswerSurvey}
        onEditPatient={handleEditPatient}
        onScheduleAppointment={handleScheduleAppointment}
        loading={false}
      />

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {paginatedPatients.length} de {filteredPatients.length} pacientes
              {filteredPatients.length !== enrichedPatients.length && (
                <span className="text-slate-400 dark:text-slate-500"> (de {enrichedPatients.length} totales)</span>
              )}
            </p>
            <SimplePagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              loading={false}
            />
          </div>
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