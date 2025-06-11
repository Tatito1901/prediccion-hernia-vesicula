"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useTransition,
  useDeferredValue,
  Suspense,
  lazy,
  useEffect, // Mantener si se usa explícitamente, sino se puede quitar si no hay useEffects directos
  FC, // Añadido para tipar StatsCard
} from "react";
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
  // Filter, // No usado directamente
  X, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  UserPlus,
  Activity,
  TrendingUp,
  Calendar,
  FileText,
  Loader2,
  SlidersHorizontal, // Icono para botón de filtros en móvil
} from "lucide-react";
import { useRouter } from "next/navigation"; // Correcto para App Router
import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, DiagnosisType, AppointmentData } from "@/app/dashboard/data-model"; // Asumiendo AppointmentData type
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
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card"; // StatsCard lo usa

// Lazy load de componentes
const PatientTable = lazy(() => import("./patient-table"));
// Asumiendo que NewPatientForm es un default export
const NewPatientForm = lazy(() => import("@/components/patient-admision/new-patient-form"));
const SurveyShareDialog = lazy(() => import("@/components/surveys/survey-share-dialog"));


export interface EnrichedPatientData extends PatientData {
  nombreCompleto: string;
  fecha_proxima_cita_iso?: string; // Usar ISO string para consistencia
  encuesta_completada: boolean;
  displayDiagnostico: string;
  // diagnostico_principal?: DiagnosisType; // Ya está en PatientData
  // edad?: number; // Ya está en PatientData
  // fecha_registro: string; // Ya está en PatientData
}

const PAGE_SIZE = 15; // Reducido para mejor visualización en diferentes dispositivos

const STATUS_LABELS: Readonly<Record<PatientStatusEnum, string>> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "Pend. Consulta", // Abreviado para móvil
  [PatientStatusEnum.CONSULTADO]: "Consultado",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "Seguimiento", // Abreviado
  [PatientStatusEnum.OPERADO]: "Operado",
  [PatientStatusEnum.NO_OPERADO]: "No Operado",
  [PatientStatusEnum.INDECISO]: "Indeciso"
};

const STATUS_STYLES: Readonly<Record<PatientStatusEnum, string>> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800",
  [PatientStatusEnum.CONSULTADO]: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800",
  [PatientStatusEnum.EN_SEGUIMIENTO]: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800",
  [PatientStatusEnum.OPERADO]: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800",
  [PatientStatusEnum.NO_OPERADO]: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 dark:border-red-800",
  [PatientStatusEnum.INDECISO]: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-700"
};

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number; // Porcentaje
  color?: "blue" | "purple" | "amber" | "emerald" | "red" | "slate"; // Colores de Tailwind
  className?: string;
}

const StatsCard: FC<StatsCardProps> = ({ icon, label, value, trend, color = "blue", className }) => (
  <Card className={cn(
    "relative overflow-hidden border-0 shadow-sm transition-all duration-300 hover:shadow-lg",
    "bg-white dark:bg-slate-800/50 backdrop-blur-sm", // Ajustado dark mode
    className
  )}>
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between">
        <div className={cn(
          "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0",
          // Usar clases completas para que Tailwind las detecte
          color === "blue" && "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
          color === "purple" && "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
          color === "amber" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
          color === "emerald" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
          color === "red" && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
          color === "slate" && "bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400",
        )}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-2xs sm:text-xs font-medium",
            trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            <TrendingUp className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3", trend < 0 && "transform rotate-180")} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-2 sm:mt-3">
        <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate" title={String(value)}>{value}</p>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate" title={label}>{label}</p>
      </div>
    </div>
    <div className={cn(
      "absolute inset-x-0 bottom-0 h-1",
      color === "blue" && "bg-gradient-to-r from-blue-400 to-blue-600",
      color === "purple" && "bg-gradient-to-r from-purple-400 to-purple-600",
      color === "amber" && "bg-gradient-to-r from-amber-400 to-amber-600",
      color === "emerald" && "bg-gradient-to-r from-emerald-400 to-emerald-600",
      color === "red" && "bg-gradient-to-r from-red-400 to-red-600",
      color === "slate" && "bg-gradient-to-r from-slate-400 to-slate-600",
    )} />
  </Card>
);

const TableLoadingSkeleton: FC = () => (
  <div className="bg-white dark:bg-slate-800/30 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 overflow-hidden backdrop-blur-sm">
    <div className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 sm:h-24 bg-slate-100 dark:bg-slate-700/40 rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="space-y-2 sm:space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 sm:h-16 bg-slate-100 dark:bg-slate-700/40 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

const GenericSuspenseFallback: FC = () => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"> {/* Mayor z-index */}
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 sm:p-6 shadow-xl">
      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
    </div>
  </div>
);


export function PatientManagement() {
  const { patients, appointments } = useAppContext();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<PatientStatusEnum | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false); // Para Sheet en móvil

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedPatientForSurvey, setSelectedPatientForSurvey] = useState<PatientData | null>(null);
  const [surveyLink, setSurveyLink] = useState("");
  const [isNewPatientFormOpen, setIsNewPatientFormOpen] = useState(false);

  const enrichedPatients = useMemo((): EnrichedPatientData[] => {
    if (!patients || !appointments) return [];
    
    return patients.map((patient) => {
      const patientAppointments = (appointments as AppointmentData[]) // Type assertion
        .filter((appointment) => appointment.patientId === patient.id)
        .sort((a, b) => new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime());

      const nextAppointment = patientAppointments.find(
        appointment => new Date(appointment.fechaConsulta) >= new Date()
      );

      return {
        ...patient,
        nombreCompleto: `${patient.nombre || ''} ${patient.apellidos || ''}`.trim(),
        fecha_proxima_cita_iso: nextAppointment?.fechaConsulta.toString(), // Asume que es string ISO o serializable
        encuesta_completada: !!(patient.encuesta?.id && patient.encuesta?.completada !== false),
        displayDiagnostico: patient.diagnostico_principal || "Sin diagnóstico",
      };
    });
  }, [patients, appointments]);

  const filteredPatients = useMemo(() => {
    let result = enrichedPatients;
    const term = deferredSearch.toLowerCase();

    if (term) {
      result = result.filter(p =>
        p.nombreCompleto.toLowerCase().includes(term) ||
        p.telefono?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.diagnostico_principal?.nombre?.toLowerCase().includes(term) || // Asumiendo que diagnostico_principal es un objeto
        p.id.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((p) => p.estado_paciente === statusFilter);
    }
    return result;
  }, [enrichedPatients, deferredSearch, statusFilter]);

  const statusStats = useMemo(() => {
    const initialStats: Record<PatientStatusEnum, number> = {
      [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: 0,
      [PatientStatusEnum.CONSULTADO]: 0,
      [PatientStatusEnum.EN_SEGUIMIENTO]: 0,
      [PatientStatusEnum.OPERADO]: 0,
      [PatientStatusEnum.NO_OPERADO]: 0,
      [PatientStatusEnum.INDECISO]: 0,
    };
    const stats = enrichedPatients.reduce((acc, patient) => {
      if (patient.estado_paciente && patient.estado_paciente in acc) {
        acc[patient.estado_paciente]++;
      }
      return acc;
    }, initialStats);
    return { ...stats, all: enrichedPatients.length };
  }, [enrichedPatients]);

  const totalPages = Math.max(Math.ceil(filteredPatients.length / PAGE_SIZE), 1);
  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPatients.slice(start, start + PAGE_SIZE);
  }, [filteredPatients, currentPage]);

  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }, [totalPages]);

  const handleSelectPatient = useCallback((patientId: string) => { // Recibe ID
    router.push(`/dashboard/patients/${patientId}`);
  }, [router]);

  const handleShareSurvey = useCallback((patient: PatientData) => {
    setSelectedPatientForSurvey(patient);
    // Asegurarse que location.origin está disponible (Client Component)
    setSurveyLink(`${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}`);
    setShareDialogOpen(true);
  }, []);

  const handleEditPatient = useCallback((patientId: string) => { // Recibe ID
    const patient = patients?.find(p => p.id === patientId);
    if (patient) {
      toast.info(`Funcionalidad para editar a: ${patient.nombre} ${patient.apellidos} (ID: ${patientId})`);
      // Lógica para abrir formulario de edición, posiblemente con router.push o un modal/sheet.
      // router.push(`/dashboard/patients/${patientId}/edit`);
    }
  }, [patients, router]);

  const handleAnswerSurvey = useCallback((patientId: string) => { // Recibe ID
    router.push(`/survey/${generateSurveyId()}?patientId=${patientId}&mode=internal`);
  }, [router]);

  const clearAllFilters = useCallback(() => {
    startTransition(() => {
      setSearchTerm("");
      setStatusFilter("all");
      setCurrentPage(1);
      setIsMobileFiltersOpen(false); // Cerrar sheet de filtros si está abierto
    });
  }, []);

  const hasActiveFilters = !!searchTerm || statusFilter !== "all";

  const mainStats = useMemo(() => {
    const totalSurveys = enrichedPatients.filter(p => p.encuesta_completada).length;
    return {
      totalPatients: enrichedPatients.length,
      surveyCompletionRate: enrichedPatients.length > 0 ? Math.round((totalSurveys / enrichedPatients.length) * 100) : 0,
      pendingConsults: statusStats[PatientStatusEnum.PENDIENTE_DE_CONSULTA] || 0,
      operatedPatients: statusStats[PatientStatusEnum.OPERADO] || 0,
    };
  }, [enrichedPatients, statusStats]);

  const renderFilters = (isMobileSheet: boolean = false) => (
    <>
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          startTransition(() => {
            setStatusFilter(value as PatientStatusEnum | "all");
            setCurrentPage(1);
            if (isMobileSheet) setIsMobileFiltersOpen(false);
          });
        }}
      >
        <SelectTrigger className={cn("h-9 sm:h-10 text-xs sm:text-sm", isMobileSheet ? "w-full" : "w-full sm:w-[200px] lg:w-[220px]", "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200")}>
          <SelectValue placeholder="Filtrar por estado" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <SelectItem value="all">
            <div className="flex items-center justify-between w-full text-xs sm:text-sm">
              <span>Todos los estados</span>
              <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-2xs sm:text-xs">{statusStats.all}</Badge>
            </div>
          </SelectItem>
          {Object.values(PatientStatusEnum).map((status) => (
            <SelectItem key={status} value={status}>
              <div className="flex items-center justify-between w-full text-xs sm:text-sm">
                <span>{STATUS_LABELS[status]}</span>
                <Badge variant="outline" className={cn("ml-2 px-1.5 py-0.5 text-2xs sm:text-xs border", STATUS_STYLES[status])}>{statusStats[status]}</Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasActiveFilters && (
        <Button 
          variant="ghost" 
          size={isMobileSheet ? "default" : "sm"}
          onClick={clearAllFilters}
          className={cn("h-9 sm:h-10 text-xs sm:text-sm", isMobileSheet && "w-full mt-4", !isMobileSheet && "hidden sm:inline-flex")}
        >
          Limpiar Filtros
        </Button>
      )}
    </>
  );

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-lg sm:rounded-xl border shadow-sm bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-slate-900 dark:via-blue-950/20 dark:to-indigo-950/20 border-slate-200 dark:border-slate-700/50">
        <div className="absolute inset-0 opacity-5 overflow-hidden"><div className="absolute -top-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 bg-blue-500 rounded-full blur-3xl" /><div className="absolute -bottom-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-indigo-500 rounded-full blur-3xl" /></div>
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Gestión de Pacientes</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 max-w-xl">Sistema integral para seguimiento médico, historiales y citas.</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={() => setIsNewPatientFormOpen(true)} size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 h-auto">
                  <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />Nuevo Paciente
                </Button>
              </motion.div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 mt-4 sm:mt-6">
            <StatsCard icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />} label="Total Pacientes" value={mainStats.totalPatients} color="blue" />
            <StatsCard icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />} label="Encuestas Comp." value={`${mainStats.surveyCompletionRate}%`} trend={mainStats.surveyCompletionRate > 70 ? 5 : (mainStats.surveyCompletionRate < 30 ? -2 : 1) } color="purple" />
            <StatsCard icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5" />} label="Pend. Consulta" value={mainStats.pendingConsults} color="amber" />
            <StatsCard icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5" />} label="Pac. Operados" value={mainStats.operatedPatients} trend={2} color="emerald" />
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-slate-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="relative flex-grow w-full sm:max-w-md lg:max-w-lg">
              <SearchIcon className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-400 dark:text-slate-500" />
              <Input placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => startTransition(() => setSearchTerm(e.target.value))} className="pl-8 sm:pl-10 pr-8 sm:pr-10 h-9 sm:h-10 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 w-full" />
              <AnimatePresence>{searchTerm && (<motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute right-1 sm:right-1.5 top-1/2 transform -translate-y-1/2">
                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-slate-100 dark:hover:bg-slate-700" onClick={() => startTransition(() => setSearchTerm(""))}><X className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button></motion.div>)}</AnimatePresence>
            </div>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3">{renderFilters()}</div>
            <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
              <SheetTrigger asChild className="sm:hidden w-full">
                <Button variant="outline" className="h-9 text-xs flex items-center justify-center gap-2 w-full bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros ({hasActiveFilters ? Object.values(STATUS_LABELS).includes(statusFilter) ? 1 + (searchTerm?1:0) : (searchTerm?1:0) : 0})
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="p-4 rounded-t-lg bg-white dark:bg-slate-900">
                <SheetHeader className="mb-4"><SheetTitle>Filtros</SheetTitle></SheetHeader>
                <div className="space-y-4">{renderFilters(true)}</div>
              </SheetContent>
            </Sheet>
          </div>
          <AnimatePresence>{hasActiveFilters && (<motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="hidden sm:flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <span className="text-xs text-slate-500 dark:text-slate-400">Filtros activos:</span>
            {searchTerm && (<Badge variant="secondary" className="gap-1 pr-0.5 text-xs bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"><SearchIcon className="h-3 w-3" />{searchTerm.length > 15 ? searchTerm.substring(0,15)+'...' : searchTerm}<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50" onClick={() => startTransition(() => setSearchTerm(""))}><X className="h-2.5 w-2.5" /></Button></Badge>)}
            {statusFilter !== "all" && (<Badge variant="outline" className={cn("gap-1 pr-0.5 text-xs border", STATUS_STYLES[statusFilter])}>{STATUS_LABELS[statusFilter]}<Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => startTransition(() => setStatusFilter("all"))}><X className="h-2.5 w-2.5" /></Button></Badge>)}
          </motion.div>)}</AnimatePresence>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Suspense fallback={<TableLoadingSkeleton />}>
          <PatientTable patients={paginatedPatients} onSelectPatient={handleSelectPatient} onShareSurvey={handleShareSurvey} onAnswerSurvey={handleAnswerSurvey} onEditPatient={handleEditPatient} loading={isPending} />
        </Suspense>
        {totalPages > 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-4 sm:mt-6 bg-white dark:bg-slate-800/30 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-sm border border-slate-200 dark:border-slate-700/50 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Mostrando {paginatedPatients.length} de {filteredPatients.length} pacientes
                {filteredPatients.length !== enrichedPatients.length && (<span className="text-slate-400 dark:text-slate-500"> (de {enrichedPatients.length} totales)</span>)}
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="outline" size="icon-sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || isPending} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"><ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /><span className="hidden sm:inline ml-1 text-xs">Ant.</span></Button>
                <div className="flex items-center gap-1">{(() => {
                  const pages = []; const maxPagesToShow = 3; const wingSize = 1;
                  if (totalPages <= maxPagesToShow + wingSize*2) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
                  else {
                    pages.push(1); if (currentPage > wingSize + 2) pages.push(-1); // Ellipsis
                    for (let i = Math.max(2, currentPage - wingSize); i <= Math.min(totalPages - 1, currentPage + wingSize); i++) pages.push(i);
                    if (currentPage < totalPages - wingSize - 1) pages.push(-1); pages.push(totalPages);
                  }
                  return pages.map((p, idx) => p === -1 ? <span key={`ellipsis-${idx}`} className="text-slate-400 dark:text-slate-500 text-xs px-1">...</span> : <Button key={p} variant={p === currentPage ? "default" : "outline"} size="icon-sm" onClick={() => handlePageChange(p)} disabled={isPending} className={cn("h-8 w-8 sm:h-9 sm:w-9 text-xs min-w-0", p === currentPage && "bg-blue-600 hover:bg-blue-700 text-white border-blue-600")}>{p}</Button>);
                })()}</div>
                <Button variant="outline" size="icon-sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || isPending} className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"><span className="hidden sm:inline mr-1 text-xs">Sig.</span><ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {isNewPatientFormOpen && (<Suspense fallback={<GenericSuspenseFallback />}>
        <NewPatientForm isOpen={isNewPatientFormOpen} onClose={() => setIsNewPatientFormOpen(false)} />
      </Suspense>)}
      
      {selectedPatientForSurvey && shareDialogOpen && (<Suspense fallback={<GenericSuspenseFallback />}>
        <SurveyShareDialog isOpen={shareDialogOpen} patient={selectedPatientForSurvey} surveyLink={surveyLink}
          onStartInternal={() => { if(selectedPatientForSurvey) { router.push(`/survey/${generateSurveyId()}?patientId=${selectedPatientForSurvey.id}&mode=internal`); setShareDialogOpen(false); }}}
          onClose={() => { setShareDialogOpen(false); setSelectedPatientForSurvey(null); }} />
      </Suspense>)}
    </div>
  );
}