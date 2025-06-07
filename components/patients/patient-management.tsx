"use client";

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useDeferredValue,
} from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, DiagnosisType } from "@/app/dashboard/data-model";
import { PatientStatusEnum } from "@/app/dashboard/data-model";
import { generateSurveyId } from "@/lib/form-utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PatientTable from "./patient-table";
import { NewPatientForm } from "@/components/patient-admision/new-patient-form";
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog";

export interface EnrichedPatientData extends PatientData {
  nombreCompleto: string;
  fecha_proxima_cita?: string;
  encuesta_completada: boolean;
  displayDiagnostico: string;
  diagnostico_principal?: DiagnosisType;
  edad?: number;
  fecha_registro: string;
}

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<PatientStatusEnum, string> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "Pendiente de consulta",
  [PatientStatusEnum.CONSULTADO]: "Consultado",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "En seguimiento",
  [PatientStatusEnum.OPERADO]: "Operado",
  [PatientStatusEnum.NO_OPERADO]: "No operado",
  [PatientStatusEnum.INDECISO]: "Indeciso"
};

const STATUS_STYLES: Record<PatientStatusEnum, string> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  [PatientStatusEnum.CONSULTADO]: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
  [PatientStatusEnum.OPERADO]: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  [PatientStatusEnum.NO_OPERADO]: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  [PatientStatusEnum.INDECISO]: "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600"
};

export function PatientManagement() {
  const { patients, appointments } = useAppContext();
  const router = useRouter();

  // Estados UI simplificados
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<PatientStatusEnum | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Estados para diálogos
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [surveyLink, setSurveyLink] = useState("");

  // Enriquecimiento de datos optimizado
  const enrichedPatients = useMemo((): EnrichedPatientData[] => {
    if (!patients || !appointments) return [];

    return patients.map((patient) => {
      const patientAppointments = appointments
        .filter((appointment) => appointment.patientId === patient.id)
        .sort((a, b) => {
          const dateA = a.fechaConsulta instanceof Date ? a.fechaConsulta : new Date(a.fechaConsulta);
          const dateB = b.fechaConsulta instanceof Date ? b.fechaConsulta : new Date(b.fechaConsulta);
          return dateA.getTime() - dateB.getTime();
        });

      const nextAppointment = patientAppointments.find(appointment => {
        const appointmentDate = appointment.fechaConsulta instanceof Date 
          ? appointment.fechaConsulta 
          : new Date(appointment.fechaConsulta);
        return appointmentDate >= new Date();
      });

      const encuesta_completada = Boolean(
        patient.encuesta?.id && 
        patient.encuesta?.completada !== false
      );

      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        fecha_registro: patient.fecha_registro,
        fecha_proxima_cita: nextAppointment?.fechaConsulta 
          ? (nextAppointment.fechaConsulta instanceof Date 
              ? nextAppointment.fechaConsulta.toISOString()
              : nextAppointment.fechaConsulta.toString())
          : undefined,
        encuesta_completada,
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
        diagnostico_principal: patient.diagnostico_principal,
        edad: patient.edad || undefined,
      };
    });
  }, [patients, appointments]);

  // Filtrado optimizado
  const filteredPatients = useMemo(() => {
    let result = enrichedPatients;

    if (deferredSearch) {
      const term = deferredSearch.toLowerCase();
      result = result.filter(
        (patient) =>
          patient.nombreCompleto.toLowerCase().includes(term) ||
          patient.telefono?.toLowerCase().includes(term) ||
          patient.email?.toLowerCase().includes(term) ||
          patient.diagnostico_principal?.toLowerCase().includes(term) ||
          patient.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((patient) => patient.estado_paciente === statusFilter);
    }

    return result;
  }, [enrichedPatients, deferredSearch, statusFilter]);

  // Estadísticas por estado
  const statusStats = useMemo(() => {
    const stats: Record<PatientStatusEnum | "all", number> = {
      all: enrichedPatients.length,
      [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: 0,
      [PatientStatusEnum.CONSULTADO]: 0,
      [PatientStatusEnum.EN_SEGUIMIENTO]: 0,
      [PatientStatusEnum.OPERADO]: 0,
      [PatientStatusEnum.NO_OPERADO]: 0,
      [PatientStatusEnum.INDECISO]: 0,
    };

    enrichedPatients.forEach(patient => {
      if (patient.estado_paciente && patient.estado_paciente in stats) {
        stats[patient.estado_paciente]++;
      }
    });

    return stats;
  }, [enrichedPatients]);

  // Paginación
  const totalPages = Math.max(Math.ceil(filteredPatients.length / PAGE_SIZE), 1);
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, currentPage]);

  // Manejadores optimizados
  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    });
  }, [totalPages]);

  const handleSelectPatient = useCallback((patient: PatientData) => {
    router.push(`/dashboard/patients/${patient.id}`);
  }, [router]);

  const handleShareSurvey = useCallback((patient: PatientData) => {
    setSelectedPatient(patient);
    setSurveyLink(`${location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}`);
    setShareDialogOpen(true);
  }, []);

  const handleEditPatient = useCallback((patient: PatientData) => {
    toast.info(`Editando paciente: ${patient.nombre} ${patient.apellidos}`);
  }, []);

  const handleAnswerSurvey = useCallback((patient: PatientData) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`);
  }, [router]);

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      setSearchTerm("");
      setStatusFilter("all");
      setCurrentPage(1);
    });
  }, []);

  const hasActiveFilters = searchTerm || statusFilter !== "all";

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Historial de Pacientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gestión completa del historial médico y seguimiento de pacientes
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mr-2">
                {enrichedPatients.length}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">pacientes</span>
            </Badge>
            <NewPatientForm />
          </div>
        </div>

        {/* Barra de herramientas */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder="Buscar pacientes..."
                value={searchTerm}
                onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
                className="pl-10 pr-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              {/* Filtro de estado - Desktop */}
              <div className="hidden sm:block">
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    startTransition(() => {
                      setStatusFilter(value as PatientStatusEnum | "all");
                      setCurrentPage(1);
                    });
                  }}
                >
                  <SelectTrigger className="w-[220px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                    <SelectItem value="all" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="flex items-center justify-between w-full">
                        <span>Todos los estados</span>
                        <Badge variant="secondary" className="ml-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {statusStats.all}
                        </Badge>
                      </div>
                    </SelectItem>
                    {Object.values(PatientStatusEnum).map((status) => (
                      <SelectItem key={status} value={status} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <div className="flex items-center justify-between w-full">
                          <span>{STATUS_LABELS[status]}</span>
                          <Badge 
                            variant="secondary" 
                            className={cn("ml-2 border", STATUS_STYLES[status])}
                          >
                            {statusStats[status]}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro móvil */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="sm:hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {hasActiveFilters && (
                      <Badge className="ml-2 h-5 w-5 p-0 text-xs bg-blue-600 dark:bg-blue-500">
                        {Number(!!searchTerm) + Number(statusFilter !== "all")}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[300px] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <SheetHeader>
                    <SheetTitle className="text-gray-900 dark:text-gray-100">Filtros</SheetTitle>
                    <SheetDescription className="text-gray-600 dark:text-gray-400">
                      Filtra la lista de pacientes
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <label className="text-sm font-medium mb-2 block text-gray-700 dark:text-gray-300">
                      Estado del paciente
                    </label>
                    <Select
                      value={statusFilter}
                      onValueChange={(value) => {
                        setStatusFilter(value as PatientStatusEnum | "all");
                        setCurrentPage(1);
                        setFiltersOpen(false);
                      }}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                        <SelectItem value="all" className="hover:bg-gray-50 dark:hover:bg-gray-800">Todos los estados</SelectItem>
                        {Object.values(PatientStatusEnum).map((status) => (
                          <SelectItem key={status} value={status} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            {STATUS_LABELS[status]} ({statusStats[status]})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Filtros activos */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filtros activos:</span>
              
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 pr-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700">
                  <SearchIcon className="h-3 w-3" />
                  {searchTerm}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-blue-200 dark:hover:bg-blue-800"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {statusFilter !== "all" && (
                <Badge 
                  variant="secondary" 
                  className={cn("gap-1 pr-1 border", STATUS_STYLES[statusFilter])}
                >
                  {STATUS_LABELS[statusFilter]}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                    onClick={() => setStatusFilter("all")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Limpiar todo
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Información de resultados */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Mostrando {paginatedPatients.length} de {filteredPatients.length} pacientes
                {filteredPatients.length !== enrichedPatients.length && (
                  <span className="text-gray-500 dark:text-gray-400"> (filtrado de {enrichedPatients.length} totales)</span>
                )}
              </p>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                  className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Anterior</span>
                </Button>
                
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                    {currentPage} / {totalPages}
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                  className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <span className="hidden sm:inline mr-1">Siguiente</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de pacientes */}
        <PatientTable
          patients={paginatedPatients}
          onSelectPatient={handleSelectPatient}
          onShareSurvey={handleShareSurvey}
          onAnswerSurvey={handleAnswerSurvey}
          onEditPatient={handleEditPatient}
          loading={isPending}
        />

        {/* Paginación inferior para listas largas */}
        {totalPages > 3 && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1 || isPending}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Primera
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1">
                {(() => {
                  const maxPages = Math.min(5, totalPages);
                  const pages = [];
                  let start = Math.max(1, currentPage - 2);
                  let end = Math.min(totalPages, start + maxPages - 1);
                  
                  if (end - start < maxPages - 1) {
                    start = Math.max(1, end - maxPages + 1);
                  }

                  for (let i = start; i <= end; i++) {
                    pages.push(
                      <Button
                        key={i}
                        variant={i === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(i)}
                        disabled={isPending}
                        className={cn(
                          "min-w-[40px]",
                          i === currentPage 
                            ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700" 
                            : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                        )}
                      >
                        {i}
                      </Button>
                    );
                  }
                  return pages;
                })()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages || isPending}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Última
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo para compartir encuesta */}
      {selectedPatient && (
        <SurveyShareDialog
          isOpen={shareDialogOpen}
          patient={selectedPatient}
          surveyLink={surveyLink}
          onStartInternal={() =>
            router.push(
              `/survey/${generateSurveyId()}?patientId=${selectedPatient.id}&mode=internal`
            )
          }
          onClose={() => setShareDialogOpen(false)}
        />
      )}
    </div>
  );
}