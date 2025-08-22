"use client"

import React, { 
  useState, 
  useMemo, 
  useCallback, 
  useEffect,
  memo,
  Suspense,
  startTransition,
  type ChangeEvent
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { 
  Search, 
  X, 
  Users, 
  ClipboardCheck, 
  CalendarClock, 
  Stethoscope, 
  AlertTriangle, 
  Inbox,
  Loader2,
  RefreshCw,
  Activity
} from "lucide-react"
import { useShallow } from "zustand/react/shallow"

// --- UI Components (Importaciones asumidas) ---
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SimplePagination } from "@/components/ui/simple-pagination"
import { EmptyState } from '@/components/ui/empty-state'
import PatientTable from "./patient-table" // Asumimos que este componente está optimizado

// --- Hooks, Tipos y Utilidades ---
import { usePatientStore, type PatientStore } from "@/stores/patient-store"
import { 
  EnrichedPatient, 
  PatientStatusEnum, 
  StatusStats 
} from "@/lib/types"
import { generateSurveyId } from "@/lib/form-utils"
import { cn } from "@/lib/utils"

// --- Componentes Lazy-loaded ---
const SurveyShareDialog = React.lazy(() => import("@/components/surveys/survey-share-dialog"))
const PatientDetailsDialog = React.lazy(() => import("./patient-details-dialog"))
const ScheduleAppointmentDialog = React.lazy(() => import("./schedule-appointment-dialog"))

// --- Constantes y Configuración ---
const DEBOUNCE_DELAY = 300

const STATUS_CONFIG = {
  [PatientStatusEnum.POTENCIAL]: { label: "Potencial", icon: AlertTriangle },
  [PatientStatusEnum.ACTIVO]: { label: "Activo", icon: Activity },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { label: "En Seguimiento", icon: ClipboardCheck },
  [PatientStatusEnum.OPERADO]: { label: "Operado", icon: ClipboardCheck },
  [PatientStatusEnum.NO_OPERADO]: { label: "No Operado", icon: X },
  [PatientStatusEnum.INACTIVO]: { label: "Inactivo", icon: Inbox },
  [PatientStatusEnum.ALTA_MEDICA]: { label: "Alta Médica", icon: Inbox }
} as const

// --- Tipos Definidos ---
type PatientStatsData = {
  totalPatients: number
  surveyRate: number
  pendingConsults: number
  operatedPatients: number
}

type PatientHeaderProps = {
  statsData: PatientStatsData
  isLoadingStats: boolean
  onRefresh: () => void
}

type FilterBarProps = {
  searchTerm: string
  onSearchChange: (e: ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
  statusFilter: string
  onStatusChange: (value: string) => void
  onClearFilters: () => void
  statusStats: StatusStats
  isLoading?: boolean
}

type EmptyStateProps = {
  hasFilters: boolean
  onClearFilters: () => void
}

// --- Componentes Puros y Memoizados ---

const PatientHeader = memo(({ statsData, isLoadingStats, onRefresh }: PatientHeaderProps) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Gestión de Pacientes
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
          Administra y consulta información de pacientes
        </p>
      </div>
      <Button 
        onClick={onRefresh} 
        variant="outline" 
        size="sm"
        disabled={isLoadingStats}
        className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <RefreshCw className={cn("w-4 h-4 mr-2 text-slate-600 dark:text-slate-400", isLoadingStats && "animate-spin")} />
        <span className="text-slate-700 dark:text-slate-300">Actualizar</span>
      </Button>
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatsCard icon={Users} title="Total Pacientes" value={statsData.totalPatients} />
      <StatsCard icon={ClipboardCheck} title="Encuestas" value={`${statsData.surveyRate}%`} description="Completadas" />
      <StatsCard icon={CalendarClock} title="Pendientes" value={statsData.pendingConsults} />
      <StatsCard icon={Stethoscope} title="Operados" value={statsData.operatedPatients} />
    </div>
  </div>
))
PatientHeader.displayName = "PatientHeader"

const StatsCard = memo(({ icon: Icon, title, value, description }: { icon: React.ElementType, title: string, value: string | number, description?: string }) => (
  <div className="relative rounded-xl p-4 sm:p-5 border bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 transition-all">
    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 w-fit mb-3">
      <Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
    </div>
    <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{title}</p>
    {description && <p className="text-xs text-slate-400 dark:text-slate-500">{description}</p>}
  </div>
));
StatsCard.displayName = "StatsCard";

const FilterBar = memo(({ 
  searchTerm, onSearchChange, onClearSearch, 
  statusFilter, onStatusChange, onClearFilters, 
  statusStats, isLoading = false 
}: FilterBarProps) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-4 transition-all">
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch lg:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
          <Input
            placeholder="Buscar paciente por nombre, apellidos o DNI..."
            value={searchTerm}
            onChange={onSearchChange}
            className="pl-10 pr-10 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 transition-colors"
            disabled={isLoading}
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
              disabled={isLoading}
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Select value={statusFilter} onValueChange={onStatusChange} disabled={isLoading}>
          <SelectTrigger className="w-full sm:w-56 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Todos los estados</span>
                <Badge variant="secondary" className="ml-2">{statusStats.all || 0}</Badge>
              </div>
            </SelectItem>
            {Object.entries(STATUS_CONFIG).map(([enumValue, config]) => {
              const count = (statusStats as Record<string, number>)[enumValue] || 0
              return (
                <SelectItem key={enumValue} value={enumValue}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <config.icon className="w-4 h-4 opacity-60" />
                      <span>{config.label}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">{count}</Badge>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      
      {(searchTerm || statusFilter !== 'all') && (
        <Button variant="outline" onClick={onClearFilters} className="w-full lg:w-auto hover:bg-slate-50 dark:hover:bg-slate-800" disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  </div>
))
FilterBar.displayName = "FilterBar"

const EmptyStateComponent = memo(({ hasFilters, onClearFilters }: EmptyStateProps) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-8 sm:p-12">
    <EmptyState
      title={hasFilters ? "No se encontraron pacientes" : "No hay pacientes registrados"}
      description={hasFilters ? "Prueba a modificar o limpiar los filtros de búsqueda." : "Cuando añadas pacientes, aparecerán aquí."}
      actionText={hasFilters ? "Limpiar filtros" : undefined}
      onAction={hasFilters ? onClearFilters : undefined}
      icon={<Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />}
    />
  </div>
))
EmptyStateComponent.displayName = "EmptyState"

// --- Hooks Personalizados ---

/**
 * Hook para manejar los datos de pacientes, incluyendo estado de carga, errores,
 * filtros, paginación y acciones de actualización.
 */
function usePatientData() {
  const {
    paginatedPatients,
    patientsPagination,
    patientsStats,
    patientsFilters,
    isPatientsLoading,
    patientsError,
    setPatientsPage,
    setPatientsSearch,
    setPatientsStatus,
    clearPatientsFilters,
    refetchPatients,
    fetchPatients,
  } = usePatientStore(
    useShallow((s: PatientStore) => ({
      paginatedPatients: s.paginatedPatients,
      patientsPagination: s.patientsPagination,
      patientsStats: s.patientsStats,
      patientsFilters: s.patientsFilters,
      isPatientsLoading: s.isPatientsLoading,
      patientsError: s.patientsError,
      setPatientsPage: s.setPatientsPage,
      setPatientsSearch: s.setPatientsSearch,
      setPatientsStatus: s.setPatientsStatus,
      clearPatientsFilters: s.clearPatientsFilters,
      refetchPatients: s.refetchPatients,
      fetchPatients: s.fetchPatients,
    }))
  )

  const [searchInput, setSearchInput] = useState(patientsFilters.search)

  useEffect(() => {
    setSearchInput(patientsFilters.search)
  }, [patientsFilters.search])

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== patientsFilters.search) {
        startTransition(() => {
          setPatientsSearch(searchInput)
        })
      }
    }, DEBOUNCE_DELAY)
    return () => clearTimeout(handler)
  }, [searchInput, patientsFilters.search, setPatientsSearch])

  useEffect(() => {
    if (!paginatedPatients) {
      fetchPatients().catch(err => console.error("Failed to fetch initial patients:", err))
    }
  }, [fetchPatients, paginatedPatients])

  const patientStatsData = useMemo<PatientStatsData>(() => 
    patientsStats || { totalPatients: 0, surveyRate: 0, pendingConsults: 0, operatedPatients: 0 }, 
    [patientsStats]
  )

  const statusStats = useMemo<StatusStats>(() => {
    const base: StatusStats = {
      potencial: 0,
      activo: 0,
      operado: 0,
      no_operado: 0,
      en_seguimiento: 0,
      inactivo: 0,
      alta_medica: 0,
      all: 0,
    }
    if (!patientsStats) return base
    return { ...base, ...(patientsStats.statusStats || {}), all: patientsStats.totalPatients || 0 }
  }, [patientsStats])
  
  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setPatientsPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [setPatientsPage])

  const handleStatusFilterChange = useCallback((value: string) => {
    startTransition(() => setPatientsStatus(value))
  }, [setPatientsStatus])

  const handleClearFilters = useCallback(() => {
    startTransition(() => clearPatientsFilters())
  }, [clearPatientsFilters])

  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value)
  }, [])

  const handleClearSearch = useCallback(() => {
    setSearchInput("")
  }, [])

  const handleRefresh = useCallback(() => {
    refetchPatients()
  }, [refetchPatients])

  return {
    paginatedPatients: paginatedPatients ?? [],
    patientsPagination,
    patientsFilters,
    isPatientsLoading,
    patientsError,
    patientStatsData,
    statusStats,
    searchInput,
    handlePageChange,
    handleStatusFilterChange,
    handleClearFilters,
    handleSearchChange,
    handleClearSearch,
    handleRefresh
  }
}

/**
 * Hook para gestionar el estado y la lógica de los diálogos modales.
 */
function usePatientDialogs() {
  const router = useRouter()
  const [dialogState, setDialogState] = useState<{
    type: 'details' | 'share' | 'appointment' | null
    patient: EnrichedPatient | null
  }>({ type: null, patient: null })

  const surveyLink = useMemo(() => {
    if (dialogState.type === 'share' && dialogState.patient) {
      const surveyId = generateSurveyId()
      const patientId = dialogState.patient.id
      return `${window.location.origin}/survey/${surveyId}?patientId=${patientId}`
    }
    return ""
  }, [dialogState.type, dialogState.patient])

  const openDialog = useCallback((type: 'details' | 'share' | 'appointment', patient: EnrichedPatient) => {
    setDialogState({ type, patient })
  }, [])

  const closeDialog = useCallback(() => {
    setDialogState({ type: null, patient: null })
  }, [])

  const handleStartInternalSurvey = useCallback(() => {
    if (dialogState.patient) {
      router.push(`/survey/${generateSurveyId()}?patientId=${dialogState.patient.id}&mode=internal`)
      closeDialog()
    }
  }, [dialogState.patient, router, closeDialog])

  return {
    dialogState,
    surveyLink,
    openDialog,
    closeDialog,
    handleStartInternalSurvey
  }
}

// --- Componente de Vista Principal ---

const PatientManagementView: React.FC = () => {
  const router = useRouter()
  const data = usePatientData()
  const dialogs = usePatientDialogs()

  // Callbacks para acciones de la tabla
  const handleEditPatient = useCallback((patient: EnrichedPatient) => {
    toast.info(`Funcionalidad para editar a: ${patient.nombre} ${patient.apellidos}`)
  }, [])

  const handleAnswerSurvey = useCallback((patient: EnrichedPatient) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`)
  }, [router])

  // Variables derivadas para renderizado
  const hasFilters = data.patientsFilters.search !== "" || data.patientsFilters.status !== "all"
  const hasPatients = data.paginatedPatients && data.paginatedPatients.length > 0

  if (data.isPatientsLoading && !data.paginatedPatients) {
    return <LoadingSkeleton />
  }

  if (data.patientsError) {
    return <ErrorState error={data.patientsError} onRetry={data.handleRefresh} />
  }

  return (
    <div className="w-full space-y-4 pb-8">
      <PatientHeader 
        statsData={data.patientStatsData}
        isLoadingStats={data.isPatientsLoading}
        onRefresh={data.handleRefresh}
      />
 
      <FilterBar 
        searchTerm={data.searchInput}
        onSearchChange={data.handleSearchChange}
        onClearSearch={data.handleClearSearch}
        statusFilter={String(data.patientsFilters.status)}
        onStatusChange={data.handleStatusFilterChange}
        onClearFilters={data.handleClearFilters}
        statusStats={data.statusStats}
        isLoading={data.isPatientsLoading}
      />
 
      {hasPatients ? (
        <>
          <div className="relative">
            {data.isPatientsLoading && <UpdatingOverlay />}
            <PatientTable 
              patients={data.paginatedPatients}
              onSelectPatient={(p) => dialogs.openDialog('details', p)}
              onShareSurvey={(p) => dialogs.openDialog('share', p)}
              onEditPatient={handleEditPatient}
              onAnswerSurvey={handleAnswerSurvey}
              onScheduleAppointment={(p) => dialogs.openDialog('appointment', p)}
            />
          </div>
 
          {data.patientsPagination.totalPages > 1 && (
            <div className="mt-4 pb-4">
              <SimplePagination 
                currentPage={data.patientsFilters.page} 
                totalPages={data.patientsPagination.totalPages} 
                onPageChange={data.handlePageChange}
                loading={data.isPatientsLoading}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyStateComponent 
          hasFilters={hasFilters}
          onClearFilters={data.handleClearFilters}
        />
      )}
 
      <Suspense fallback={<ModalLoadingFallback />}>
        {dialogs.dialogState.type === 'share' && dialogs.dialogState.patient && (
          <SurveyShareDialog 
            isOpen={true} 
            patient={dialogs.dialogState.patient} 
            surveyLink={dialogs.surveyLink}
            onStartInternal={dialogs.handleStartInternalSurvey}
            onClose={dialogs.closeDialog} 
          />
        )}
        
        {dialogs.dialogState.type === 'details' && dialogs.dialogState.patient && (
          <PatientDetailsDialog
            isOpen={true}
            patient={dialogs.dialogState.patient}
            onClose={dialogs.closeDialog}
          />
        )}
        
        {dialogs.dialogState.type === 'appointment' && dialogs.dialogState.patient && (
          <ScheduleAppointmentDialog
            isOpen={true}
            patient={dialogs.dialogState.patient}
            onClose={dialogs.closeDialog}
          />
        )}
      </Suspense>
    </div>
  )
}

// --- Componentes de Estado Auxiliares ---

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl h-48" />
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl h-20" />
    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl h-96" />
  </div>
)

const ErrorState = ({ error, onRetry }: { error: Error, onRetry: () => void }) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12">
    <div className="text-center">
      <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mx-auto w-16 h-16 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        Error al cargar pacientes
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
        {error.message || "Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo."}
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Reintentar
      </Button>
    </div>
  </div>
)

const UpdatingOverlay = () => (
  <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center p-4">
    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
      <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Actualizando...
      </span>
    </div>
  </div>
)

const ModalLoadingFallback = () => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 flex items-center shadow-2xl">
      <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-3" />
      <span className="text-slate-700 dark:text-slate-300 font-medium">Cargando...</span>
    </div>
  </div>
)

const MemoizedPatientManagement = memo(PatientManagementView)
MemoizedPatientManagement.displayName = "PatientManagement"

export { MemoizedPatientManagement as PatientManagement }
