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
import { useAppointments } from "@/hooks/use-appointments" 
import { usePatientStats } from "@/hooks/use-patient-stats"
import { useProcessedPatients } from "@/hooks/use-processed-patients"
import { EnrichedPatient, PatientStatusEnum, PatientStats } from "@/lib/types"
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

interface StatsDataType {
  totalPatients: number
  surveyRate: number
  pendingConsults: number
  operatedPatients: number
}

interface StatusStatsType {
  all: number
  [key: string]: number
}

type StatusFilterType = keyof typeof PatientStatusEnum | "all"
type DialogType = "details" | "shareSurvey" | "scheduleAppointment"
type StatusCountMap = { [key: string]: number }

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
  statusStats: StatusCountMap
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

  // --- Fetching de Datos ---
  const { 
    data: appointmentsData, 
    isLoading: isLoadingPatients, 
    isError,
    refetch: refetchPatients 
  } = useAppointments(currentPage, PAGE_SIZE)

  const { data: stats, isLoading: isLoadingStats } = usePatientStats()
  
  // Usamos un mock de datos compatibles con el hook mientras se ajusta el API
  // Este enfoque temporal nos permite seguir usando el hook sin cambiar su implementación
  const compatiblePatients = useMemo(() => {
    // Extraemos datos de pacientes a partir de las citas
    const patientsFromAppointments = appointmentsData?.appointments?.map(app => {
      return {
        id: app.patient_id,
        nombre: app.paciente?.nombre || '',
        apellidos: app.paciente?.apellidos || '',
        telefono: app.paciente?.telefono || '',
        email: app.paciente?.email || '',
        fecha_registro: app.created_at || null,
        created_at: app.created_at,
        updated_at: null,
        estado_paciente: "PENDIENTE_DE_CONSULTA" as const, // Valor por defecto
        diagnostico_principal: null,
        diagnostico_principal_detalle: null,
        fecha_nacimiento: null,
        edad: null,
        genero: null,
        // Campos requeridos para el tipo Patient
        comentarios_registro: null,
        creado_por_id: null,
        doctor_asignado_id: app.doctor_id,
        fecha_operacion: null,
        historial_medico: null,
        origen_paciente: null,
        notas_seguimiento: null
      }
    }) || []
    
    // Eliminar duplicados basados en ID
    const uniquePatients = Array.from(
      new Map(patientsFromAppointments.map(item => [item.id, item]))
      .values()
    )
    
    return uniquePatients
  }, [appointmentsData])
  
  // Procesamiento de pacientes con filtros
  const { 
    filteredAndEnrichedPatients: processedPatients,
    statusStats 
  // @ts-ignore - Ignoramos temporalmente incompatibilidades de tipo mientras se ajusta la API
  } = useProcessedPatients(
    compatiblePatients, 
    appointmentsData?.appointments || [], 
    searchTerm,
    statusFilter
  )

  // --- Lógica y Memos ---
  const totalPages = useMemo(() => appointmentsData?.pagination?.totalPages || 1, [appointmentsData])
  
  // Usamos el stats generado por useProcessedPatients

  const statsData: StatsDataType = {
    totalPatients: stats?.total_patients ?? 0,
    surveyRate: stats?.survey_completion_rate ?? 0,
    pendingConsults: stats?.pending_consults ?? 0,
    operatedPatients: stats?.operated_patients ?? 0,
  }

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
  }, [selectedPatient])

  if (isLoadingPatients) {
    return <LoadingSkeleton />
  }

  return (
    <div className="w-full space-y-4 pb-8">
      <PatientHeader 
        statsData={statsData}
        isLoadingStats={isLoadingStats}
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

      {processedPatients && processedPatients.length > 0 ? (
        <PatientTable 
          patients={processedPatients}
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
            loading={isLoadingPatients}
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