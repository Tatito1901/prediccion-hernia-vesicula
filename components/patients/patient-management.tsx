"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, X, Users, ClipboardCheck, CalendarClock, Stethoscope, AlertTriangle, Inbox } from "lucide-react"

// --- UI Components ---
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCard } from "@/components/ui/stats-card"
import { SimplePagination } from "@/components/ui/simple-pagination"
import PatientTable from "./patient-table"

// --- Hooks y Tipos ---
import { useClinic } from "@/contexts/clinic-data-provider";
import { EnrichedPatient, PatientStatusEnum, PatientStats, StatusStats } from "@/lib/types"
import { generateSurveyId } from "@/lib/form-utils"
import { cn } from "@/lib/utils"

// Lazy loading para componentes modales
const SurveyShareDialog = React.lazy(() => import("@/components/surveys/survey-share-dialog"))
const PatientDetailsDialog = React.lazy(() => import("./patient-details-dialog"))
const ScheduleAppointmentDialog = React.lazy(() => import("./schedule-appointment-dialog"))

const PAGE_SIZE = 15

const STATUS_CONFIG = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { 
    label: "Pendiente", 
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" 
  },
  [PatientStatusEnum.CONSULTADO]: { 
    label: "Consultado", 
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { 
    label: "Seguimiento", 
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" 
  },
  [PatientStatusEnum.OPERADO]: { 
    label: "Operado", 
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" 
  },
  [PatientStatusEnum.NO_OPERADO]: { 
    label: "No Operado", 
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
  },
  [PatientStatusEnum.INDECISO]: { 
    label: "Indeciso", 
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" 
  }
} as const

type StatusFilterType = keyof typeof PatientStatusEnum | "all"
type DialogType = "details" | "shareSurvey" | "scheduleAppointment"

interface StatsDataType {
  totalPatients: number
  surveyRate: number
  pendingConsults: number
  operatedPatients: number
}

interface PatientHeaderProps {
  statsData: StatsDataType
  isLoadingStats: boolean
}

interface FilterBarProps {
  searchTerm: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
  statusFilter: StatusFilterType
  onStatusChange: (value: StatusFilterType) => void
  onClearFilters: () => void
  statusStats: StatusStats
}

const LoadingSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {Array(4).fill(0).map((_, i) => (
        <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
    <div className="space-y-3">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
      ))}
    </div>
  </div>
)

const PatientHeader: React.FC<PatientHeaderProps> = ({ statsData, isLoadingStats }) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-6">
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
        Gestión de Pacientes
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl">
        Sistema integral para seguimiento médico, historiales y citas.
      </p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <StatsCard 
        icon={<Users className="h-5 w-5" />} 
        label="Total" 
        value={isLoadingStats ? "..." : statsData.totalPatients} 
      />
      <StatsCard 
        icon={<ClipboardCheck className="h-5 w-5" />} 
        label="Encuestas" 
        value={isLoadingStats ? "..." : `${statsData.surveyRate}%`} 
      />
      <StatsCard 
        icon={<CalendarClock className="h-5 w-5" />} 
        label="Pendientes" 
        value={isLoadingStats ? "..." : statsData.pendingConsults} 
      />
      <StatsCard 
        icon={<Stethoscope className="h-5 w-5" />} 
        label="Operados" 
        value={isLoadingStats ? "..." : statsData.operatedPatients} 
      />
    </div>
  </div>
)

const FilterBar: React.FC<FilterBarProps> = ({ 
  searchTerm, 
  onSearchChange, 
  onClearSearch, 
  statusFilter, 
  onStatusChange, 
  onClearFilters, 
  statusStats
}) => {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const hasActiveFilters = Boolean(searchTerm || statusFilter !== "all")
  const activeFiltersCount = Number(!!searchTerm) + Number(statusFilter !== "all")

  return (
    <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 px-3 py-2">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-grow">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <Input
              placeholder="Buscar pacientes..."
              className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              value={searchTerm}
              onChange={onSearchChange}
            />
            {searchTerm && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="all">Todos ({statusStats?.all ?? 0})</SelectItem>
              {Object.entries(statusStats || {}).filter(([key]) => key !== 'all').map(([status, count]) => (
                <SelectItem key={status} value={status}>{status} ({count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {(searchTerm || statusFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClearFilters}
              className="h-9 text-slate-600 dark:text-slate-400"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export const PatientManagement: React.FC = () => {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<EnrichedPatient | null>(null)
  const [patientForAppointment, setPatientForAppointment] = useState<EnrichedPatient | null>(null)
  const [surveyLink, setSurveyLink] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false)

  // ==================== OBTENCIÓN DE DATOS CENTRALIZADA ====================
  const { 
    enrichedPatients, 
    isLoading: isLoadingClinicData, 
    error 
  } = useClinic();
  // ========================================================================

  const { filteredPatients, statusStats } = useMemo(() => {
    let currentViewPatients: EnrichedPatient[] = enrichedPatients;
    const term = (searchTerm || '').toLowerCase();

    if (term) {
      currentViewPatients = currentViewPatients.filter(p =>
        p.nombreCompleto.toLowerCase().includes(term) ||
        (p.telefono?.includes(term)) ||
        (p.email?.toLowerCase().includes(term)) ||
        p.displayDiagnostico.toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      currentViewPatients = currentViewPatients.filter((p) => p.estado_paciente === statusFilter);
    }
    
    const stats = enrichedPatients.reduce((acc, patient) => {
        if (patient.estado_paciente) {
            acc[patient.estado_paciente] = (acc[patient.estado_paciente] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);
    
    return {
        filteredPatients: currentViewPatients,
        statusStats: { ...stats, all: enrichedPatients.length } as StatusStats
    };

  }, [enrichedPatients, searchTerm, statusFilter]);

  const totalPages = useMemo(() => {
    if (!filteredPatients.length) return 1;
    return Math.ceil(filteredPatients.length / PAGE_SIZE);
  }, [filteredPatients]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredPatients.slice(start, end);
  }, [filteredPatients, currentPage]);

  const statsData: StatsDataType = useMemo(() => {
    const totalPatients = enrichedPatients.length;
    if (totalPatients === 0) {
      return { totalPatients: 0, surveyRate: 0, pendingConsults: 0, operatedPatients: 0 };
    }
    const surveyCompleted = enrichedPatients.filter(p => p.encuesta_completada).length;
    const surveyRate = Math.round((surveyCompleted / totalPatients) * 100);
    const pendingConsults = statusStats[PatientStatusEnum.PENDIENTE_DE_CONSULTA] || 0;
    const operatedPatients = statusStats[PatientStatusEnum.OPERADO] || 0;

    return { totalPatients, surveyRate, pendingConsults, operatedPatients };
  }, [enrichedPatients, statusStats]);

  const handlePageChange = (page: number): void => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSelectPatient = (patient: EnrichedPatient): void => {
    setSelectedPatient(patient)
    setDetailsDialogOpen(true)
  }

  const handleShareSurvey = (patient: EnrichedPatient): void => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}` : ''
    setSelectedPatient(patient)
    setSurveyLink(link)
    setShareDialogOpen(true)
  }

  const handleEditPatient = (patient: EnrichedPatient): void => {
    toast.info(`Editar paciente: ${patient.nombre} ${patient.apellidos}`)
  }

  const handleAnswerSurvey = (patient: EnrichedPatient): void => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`)
  }

  const handleScheduleAppointment = (patient: EnrichedPatient): void => {
    setPatientForAppointment(patient)
    setAppointmentDialogOpen(true)
  }

  const handleStatusFilterChange = (value: StatusFilterType): void => {
    setStatusFilter(value)
  }

  const handleClearFilters = useCallback(() => {
    setSearchTerm("")
    setStatusFilter("all" as StatusFilterType)
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value)
  }

  const handleClearSearch = (): void => {
    setSearchTerm("")
  }

  const handleStartInternal = useCallback(() => {
    if (selectedPatient) {
      router.push(`/survey/${generateSurveyId()}?patientId=${selectedPatient.id}&mode=internal`)
      setShareDialogOpen(false)
    }
  }, [selectedPatient, router])

  if (isLoadingClinicData) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="w-full space-y-4 pb-8">
      <PatientHeader 
        statsData={statsData}
        isLoadingStats={isLoadingClinicData}
      />

      <FilterBar 
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        statusFilter={statusFilter}
        onStatusChange={handleStatusFilterChange}
        onClearFilters={handleClearFilters}
        statusStats={statusStats}
      />

      {paginatedPatients && paginatedPatients.length > 0 ? (
        <PatientTable 
          patients={paginatedPatients}
          onSelectPatient={handleSelectPatient}
          onShareSurvey={handleShareSurvey}
          onEditPatient={handleEditPatient}
          onAnswerSurvey={handleAnswerSurvey}
          onScheduleAppointment={handleScheduleAppointment}
        />
      ) : (
        <div className="text-center text-gray-500 p-4">No hay pacientes que mostrar</div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 pb-4">
          <SimplePagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={handlePageChange}
            loading={isLoadingClinicData}
          />
        </div>
      )}

      {/* Modales con Lazy Loading */}
      <React.Suspense fallback={<div className="h-64 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-blue-500" /></div>}>
        {selectedPatient && shareDialogOpen && (
          <SurveyShareDialog 
            isOpen={shareDialogOpen} 
            patient={selectedPatient} 
            surveyLink={surveyLink}
            onStartInternal={handleStartInternal}
            onClose={() => setShareDialogOpen(false)} 
          />
        )}
        
        {selectedPatient && detailsDialogOpen && (
          <PatientDetailsDialog
            isOpen={detailsDialogOpen}
            patient={selectedPatient}
            onClose={() => setDetailsDialogOpen(false)}
          />
        )}
        
        {patientForAppointment && appointmentDialogOpen && (
          <ScheduleAppointmentDialog
            isOpen={appointmentDialogOpen}
            patient={patientForAppointment}
            onClose={() => setAppointmentDialogOpen(false)}
          />
        )}
      </React.Suspense>
    </div>
  )
}