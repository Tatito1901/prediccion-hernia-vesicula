"use client";

import {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useDeferredValue,
  Suspense,
} from "react";
import dynamic from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchIcon, Filter, X, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/lib/context/app-context";
import type { PatientData } from "@/app/dashboard/data-model";
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

// Importaciones directas sin lazy loading según la petición
import PatientTable from "./patient-table";
import { PatientCardView } from "./patient-card-view";
import { NewPatientForm } from "@/components/patient-admision/new-patient-form";
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog";

// Interfaz extendida para datos enriquecidos de pacientes
export interface EnrichedPatientData extends PatientData {
  nombreCompleto: string;
  fecha_proxima_cita?: string;
  encuesta_completada: boolean;
  displayDiagnostico: string;
  // Asegurar campos críticos para la tabla de historial
  diagnostico_principal: string;
  edad?: number;
  fecha_registro: string;
}

// Skeleton Components optimizados
const PatientTableSkeleton = () => (
  <div className="bg-white dark:bg-slate-950 shadow-sm rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
    <div className="animate-pulse">
      <div className="h-16 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"></div>
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

const PatientCardSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-2/3"></div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded flex-1"></div>
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded flex-1"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

// Configuración de colores de estado consistente
const STATUS_CONFIG: Record<PatientStatusEnum, { 
  color: string; 
  bgColor: string; 
  borderColor: string;
  darkBgColor: string;
  darkColor: string;
  darkBorderColor: string;
}> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    color: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    darkColor: "dark:text-amber-400",
    darkBgColor: "dark:bg-amber-950/50",
    darkBorderColor: "dark:border-amber-800"
  },
  [PatientStatusEnum.CONSULTADO]: {
    color: "text-blue-800",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    darkColor: "dark:text-blue-400",
    darkBgColor: "dark:bg-blue-950/50",
    darkBorderColor: "dark:border-blue-800"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    color: "text-purple-800",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    darkColor: "dark:text-purple-400",
    darkBgColor: "dark:bg-purple-950/50",
    darkBorderColor: "dark:border-purple-800"
  },
  [PatientStatusEnum.OPERADO]: {
    color: "text-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    darkColor: "dark:text-emerald-400",
    darkBgColor: "dark:bg-emerald-950/50",
    darkBorderColor: "dark:border-emerald-800"
  },
  [PatientStatusEnum.NO_OPERADO]: {
    color: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    darkColor: "dark:text-red-400",
    darkBgColor: "dark:bg-red-950/50",
    darkBorderColor: "dark:border-red-800"
  },
  [PatientStatusEnum.INDECISO]: {
    color: "text-slate-800",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    darkColor: "dark:text-slate-400",
    darkBgColor: "dark:bg-slate-950/50",
    darkBorderColor: "dark:border-slate-800"
  }
};

const getStatusColorClass = (status: PatientStatusEnum) => {
  const config = STATUS_CONFIG[status];
  return cn(
    config.bgColor,
    config.color,
    config.borderColor,
    config.darkBgColor,
    config.darkColor,
    config.darkBorderColor
  );
};

const getStatusLabel = (status: PatientStatusEnum): string => {
  const labels: Record<PatientStatusEnum, string> = {
    [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "Pendiente de consulta",
    [PatientStatusEnum.CONSULTADO]: "Consultado",
    [PatientStatusEnum.EN_SEGUIMIENTO]: "En seguimiento",
    [PatientStatusEnum.OPERADO]: "Operado",
    [PatientStatusEnum.NO_OPERADO]: "No operado",
    [PatientStatusEnum.INDECISO]: "Indeciso"
  };
  return labels[status] || status;
};

export function PatientManagement() {
  const { patients, appointments } = useAppContext();
  const router = useRouter();

  // Estados UI optimizados
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<PatientStatusEnum | "all">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null);
  const [surveyLink, setSurveyLink] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Enriquecimiento optimizado de datos de pacientes CORREGIDO
  const enrichedPatients = useMemo((): EnrichedPatientData[] => {
    if (!patients || !appointments) return [];

    console.log('ENRICHMENT DEBUG - Raw patients sample:', patients.slice(0, 2));

    return patients.map((patient) => {
      // Encontrar citas del paciente ordenadas por fecha
      const patientAppointments = appointments
        .filter((appointment) => appointment.patientId === patient.id)
        .sort((a, b) => {
          const dateA = a.fechaConsulta instanceof Date ? a.fechaConsulta : new Date(a.fechaConsulta);
          const dateB = b.fechaConsulta instanceof Date ? b.fechaConsulta : new Date(b.fechaConsulta);
          return dateA.getTime() - dateB.getTime();
        });

      // Encontrar la próxima cita (futura)
      const nextAppointment = patientAppointments.find(appointment => {
        const appointmentDate = appointment.fechaConsulta instanceof Date 
          ? appointment.fechaConsulta 
          : new Date(appointment.fechaConsulta);
        return appointmentDate >= new Date();
      });

      // Determinar si la encuesta está completada
      const encuesta_completada = Boolean(
        patient.encuesta?.id && 
        patient.encuesta?.completada !== false
      );

      // ← CORREGIDO: Usar la fecha_registro real del paciente, NO generar una nueva fecha
      const fechaAtencion = patient.fecha_registro; // Ya viene como string ISO de la transformación

      const enrichedPatient: EnrichedPatientData = {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        
        // ← CORREGIDO: Usar fecha_registro real del paciente
        fecha_registro: fechaAtencion, // Ya está en formato ISO string
        
        fecha_proxima_cita: nextAppointment?.fechaConsulta 
          ? (nextAppointment.fechaConsulta instanceof Date 
              ? nextAppointment.fechaConsulta.toISOString()
              : nextAppointment.fechaConsulta.toString())
          : undefined,
        encuesta_completada,
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
        
        // ← CORREGIDO: Asegurar que usamos los campos reales del paciente
        diagnostico_principal: patient.diagnostico_principal || "Sin especificar",
        edad: patient.edad || undefined, // Ya viene del transform
      };

      console.log('ENRICHED PATIENT DEBUG:', {
        id: enrichedPatient.id,
        nombre: enrichedPatient.nombreCompleto,
        edad: enrichedPatient.edad,
        diagnostico: enrichedPatient.diagnostico_principal,
        fecha_registro: enrichedPatient.fecha_registro
      });

      return enrichedPatient;
    });
  }, [patients, appointments]);

  // Filtrado optimizado con useMemo
  const filteredPatients = useMemo(() => {
    let result = enrichedPatients;

    // Filtro por búsqueda - incluir búsqueda por diagnóstico
    if (deferredSearch) {
      const term = deferredSearch.toLowerCase();
      result = result.filter(
        (patient) =>
          patient.nombreCompleto.toLowerCase().includes(term) ||
          patient.telefono?.toLowerCase().includes(term) ||
          patient.email?.toLowerCase().includes(term) ||
          patient.diagnostico_principal?.toLowerCase().includes(term) ||
          patient.id.toLowerCase().includes(term) ||
          // Búsqueda adicional por detalles del diagnóstico
          patient.diagnostico_principal_detalle?.toLowerCase().includes(term) ||
          // Búsqueda por notas del paciente
          patient.notas_paciente?.toLowerCase().includes(term)
      );
    }

    // Filtro por estado
    if (statusFilter !== "all") {
      result = result.filter((patient) => patient.estado_paciente === statusFilter);
    }

    return result;
  }, [enrichedPatients, deferredSearch, statusFilter]);

  // Estadísticas de estado optimizadas
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

  // Paginación optimizada
  const PAGE_SIZE = viewMode === "table" ? 20 : 12;
  const totalPages = Math.max(Math.ceil(filteredPatients.length / PAGE_SIZE), 1);
  
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, currentPage, PAGE_SIZE]);

  const goToPage = useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    });
  }, [totalPages]);

  // Manejadores de eventos optimizados
  const createSurveyLink = useCallback(
    (id: string) => `${location.origin}/survey/${generateSurveyId()}?patientId=${id}`,
    []
  );

  const handleShareSurvey = useCallback((patient: PatientData) => {
    setSelectedPatient(patient);
    setSurveyLink(createSurveyLink(patient.id));
    setShareDialogOpen(true);
  }, [createSurveyLink]);

  const handleSelectPatient = useCallback((patient: PatientData) => {
    router.push(`/dashboard/patients/${patient.id}`);
  }, [router]);

  const handleEditPatient = useCallback((patient: PatientData) => {
    toast.info(`Editando paciente: ${patient.nombre} ${patient.apellidos}`);
  }, []);

  const handleAnswerSurvey = useCallback(
    (patient: PatientData) => {
      router.push(
        `/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`
      );
    },
    [router]
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      setSearchTerm("");
      setStatusFilter("all");
      setCurrentPage(1);
    });
  }, []);

  // Componentes de filtro optimizados
  const StatusFilter = useCallback(() => (
    <Select
      value={statusFilter}
      onValueChange={(value) => {
        startTransition(() => {
          setStatusFilter(value as PatientStatusEnum | "all");
          setCurrentPage(1);
        });
      }}
    >
      <SelectTrigger className="w-[200px]">
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
        {Object.values(PatientStatusEnum).map((status) => (
          <SelectItem key={status} value={status}>
            <div className="flex items-center justify-between w-full">
              <span>{getStatusLabel(status)}</span>
              <Badge 
                variant="secondary" 
                className={cn("ml-2", getStatusColorClass(status))}
              >
                {statusStats[status]}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ), [statusFilter, statusStats]);

  const ActiveFilters = useCallback(() => {
    const hasFilters = searchTerm || statusFilter !== "all";
    
    if (!hasFilters) return null;

    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Filtros activos:
        </span>
        {searchTerm && (
          <Badge 
            variant="secondary"
            className="gap-1 pr-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
          >
            <SearchIcon className="h-3 w-3" />
            {searchTerm}
            <Button
              variant="ghost"
              size="icon"
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
            className={cn("gap-1 pr-1", getStatusColorClass(statusFilter))}
          >
            {getStatusLabel(statusFilter)}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
              onClick={() => setStatusFilter("all")}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-7 text-xs"
        >
          Limpiar todo
        </Button>
      </div>
    );
  }, [searchTerm, statusFilter, clearFilters]);

  return (
    <div className="w-full space-y-4">
      {/* Cabecera optimizada */}
      <header className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950/20 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Historial de Pacientes
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Historial completo de atención médica con diagnósticos, fechas y seguimiento
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1">
                <span className="text-lg font-semibold mr-2">{enrichedPatients.length}</span>
                <span className="text-sm">pacientes totales</span>
              </Badge>
            </div>
          </div>

          {/* Barra de herramientas */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-xl">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nombre, diagnóstico, teléfono o email..."
                value={searchTerm}
                onChange={(e) => startTransition(() => setSearchTerm(e.target.value))}
                className="pl-10 pr-10 h-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <div className="hidden sm:block">
                <StatusFilter />
              </div>

              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="sm:hidden"
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[400px]">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>
                      Filtra los pacientes por diferentes criterios
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Estado del paciente
                      </label>
                      <StatusFilter />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className="h-8"
                >
                  Tabla
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                  className="h-8"
                >
                  Tarjetas
                </Button>
              </div>

              <NewPatientForm />
            </div>
          </div>

          <ActiveFilters />
        </div>
      </header>

      {/* Contenido principal */}
      <section className="bg-white dark:bg-slate-950 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Historial: {paginatedPatients.length} de {filteredPatients.length} registros de atención
              {filteredPatients.length !== enrichedPatients.length && (
                <span className="text-slate-500"> (filtrado de {enrichedPatients.length} totales)</span>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || isPending}
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[100px] text-center">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || isPending}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        </div>

        {viewMode === "table" ? (
          <PatientTable
            patients={paginatedPatients}
            onSelectPatient={handleSelectPatient}
            onShareSurvey={handleShareSurvey}
            onAnswerSurvey={handleAnswerSurvey}
            onEditPatient={handleEditPatient}
            loading={isPending}
          />
        ) : (
          <PatientCardView
            patients={paginatedPatients}
            onSelectPatient={handleSelectPatient}
            onShareSurvey={handleShareSurvey}
            onAnswerSurvey={handleAnswerSurvey}
            onEditPatient={handleEditPatient}
            loading={isPending}
          />
        )}

        {totalPages > 5 && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1 || isPending}
              >
                Primera
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1 || isPending}
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </Button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={i}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(pageNum)}
                      disabled={isPending}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isPending}
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages || isPending}
              >
                Última
              </Button>
            </div>
          </div>
        )}

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
      </section>
    </div>
  );
}