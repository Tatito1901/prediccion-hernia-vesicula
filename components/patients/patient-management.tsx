"use client"

import React, { 
  useState, 
  useMemo, 
  useCallback, 
  useEffect,
  memo,
  Suspense,
  startTransition 
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
  TrendingUp,
  Activity
} from "lucide-react"

// UI Components
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StatsCard } from "@/components/ui/stats-card"
import { SimplePagination } from "@/components/ui/simple-pagination"
import { EmptyState } from '@/components/ui/empty-state'
import PatientTable from "./patient-table"

// Hooks y Tipos
import { usePatientStore } from "@/stores/patient-store"
import { 
  EnrichedPatient, 
  PatientStatusEnum, 
  StatusStats 
} from "@/lib/types"
import { generateSurveyId } from "@/lib/form-utils"
import { cn } from "@/lib/utils"

// Lazy loading para modales
const SurveyShareDialog = React.lazy(() => import("@/components/surveys/survey-share-dialog"))
const PatientDetailsDialog = React.lazy(() => import("./patient-details-dialog"))
const ScheduleAppointmentDialog = React.lazy(() => import("./schedule-appointment-dialog"))

  // 🎨 Configuración de colores elegante y profesional
const THEME = {
  colors: {
    primary: "from-slate-600 to-slate-700",
    secondary: "from-slate-500 to-slate-600",
    success: "from-slate-600 to-slate-700",
    warning: "from-slate-600 to-slate-700",
    danger: "from-slate-600 to-slate-700",
  },
  stats: {
    total: { 
      bg: "bg-slate-50 dark:bg-slate-900/50",
      border: "border-slate-200 dark:border-slate-700",
      icon: Users,
      iconColor: "text-slate-600 dark:text-slate-400",
      textColor: "text-slate-900 dark:text-slate-100"
    },
    survey: { 
      bg: "bg-blue-50/50 dark:bg-blue-950/20",
      border: "border-blue-200/50 dark:border-blue-800/30",
      icon: ClipboardCheck,
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-slate-900 dark:text-slate-100"
    },
    pending: { 
      bg: "bg-amber-50/30 dark:bg-amber-950/10",
      border: "border-amber-200/30 dark:border-amber-800/20",
      icon: CalendarClock,
      iconColor: "text-amber-600 dark:text-amber-500",
      textColor: "text-slate-900 dark:text-slate-100"
    },
    operated: { 
      bg: "bg-emerald-50/30 dark:bg-emerald-950/10",
      border: "border-emerald-200/30 dark:border-emerald-800/20",
      icon: Stethoscope,
      iconColor: "text-emerald-600 dark:text-emerald-500",
      textColor: "text-slate-900 dark:text-slate-100"
    }
  }
}

const STATUS_CONFIG = {
  [PatientStatusEnum.POTENCIAL]: { 
    label: "Potencial", 
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700",
    icon: AlertTriangle
  },
  [PatientStatusEnum.ACTIVO]: { 
    label: "Activo", 
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700",
    icon: Activity
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { 
    label: "En Seguimiento", 
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700",
    icon: ClipboardCheck
  },
  [PatientStatusEnum.OPERADO]: { 
    label: "Operado", 
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700",
    icon: ClipboardCheck
  },
  [PatientStatusEnum.NO_OPERADO]: { 
    label: "No Operado", 
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700",
    icon: X
  },
  [PatientStatusEnum.INACTIVO]: { 
    label: "Inactivo", 
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700",
    icon: Inbox
  },
  [PatientStatusEnum.ALTA_MEDICA]: { 
    label: "Alta Médica", 
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700",
    icon: Inbox
  }
} as const

type StatusFilterType = keyof typeof PatientStatusEnum | "all"
type PatientStatsData = {
  totalPatients: number
  surveyRate: number
  pendingConsults: number
  operatedPatients: number
}

// ✅ Header Component Elegante y Profesional
const PatientHeader = memo(({ 
  statsData, 
  isLoadingStats, 
  onRefresh 
}: {
  statsData: PatientStatsData
  isLoadingStats: boolean
  onRefresh: () => void
}) => (
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
      {/* Total Pacientes */}
      <div className={cn(
        "relative rounded-xl p-4 sm:p-5 border transition-all",
        THEME.stats.total.bg,
        THEME.stats.total.border
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-slate-800")}>
            <Users className={cn("w-5 h-5", THEME.stats.total.iconColor)} />
          </div>
        </div>
        <p className={cn("text-2xl font-semibold", THEME.stats.total.textColor)}>
          {statsData.totalPatients}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Total Pacientes
        </p>
      </div>
      
      {/* Encuestas */}
      <div className={cn(
        "relative rounded-xl p-4 sm:p-5 border transition-all",
        THEME.stats.survey.bg,
        THEME.stats.survey.border
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-blue-100/50 dark:bg-blue-900/20">
            <ClipboardCheck className={cn("w-5 h-5", THEME.stats.survey.iconColor)} />
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {statsData.surveyRate}%
          </span>
        </div>
        <p className={cn("text-lg font-semibold", THEME.stats.survey.textColor)}>
          Encuestas
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Completadas
        </p>
      </div>
      
      {/* Pendientes */}
      <div className={cn(
        "relative rounded-xl p-4 sm:p-5 border transition-all",
        THEME.stats.pending.bg,
        THEME.stats.pending.border
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-amber-100/30 dark:bg-amber-900/10">
            <CalendarClock className={cn("w-5 h-5", THEME.stats.pending.iconColor)} />
          </div>
          {statsData.pendingConsults > 0 && (
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          )}
        </div>
        <p className={cn("text-2xl font-semibold", THEME.stats.pending.textColor)}>
          {statsData.pendingConsults}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Pendientes
        </p>
      </div>
      
      {/* Operados */}
      <div className={cn(
        "relative rounded-xl p-4 sm:p-5 border transition-all",
        THEME.stats.operated.bg,
        THEME.stats.operated.border
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 rounded-lg bg-emerald-100/30 dark:bg-emerald-900/10">
            <Stethoscope className={cn("w-5 h-5", THEME.stats.operated.iconColor)} />
          </div>
        </div>
        <p className={cn("text-2xl font-semibold", THEME.stats.operated.textColor)}>
          {statsData.operatedPatients}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Operados
        </p>
      </div>
    </div>
  </div>
))
PatientHeader.displayName = "PatientHeader"

// ✅ FilterBar Component Optimizado
const FilterBar = memo(({ 
  searchTerm, 
  onSearchChange, 
  onClearSearch, 
  statusFilter, 
  onStatusChange, 
  onClearFilters, 
  statusStats,
  isLoading = false
}: {
  searchTerm: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
  statusFilter: StatusFilterType
  onStatusChange: (value: StatusFilterType) => void
  onClearFilters: () => void
  statusStats: StatusStats
  isLoading?: boolean
}) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-4 transition-all">
    <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch lg:items-center justify-between">
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="relative flex-1 max-w-full lg:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
          <Input
            placeholder="Buscar paciente..."
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
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        <Select 
          value={statusFilter} 
          onValueChange={onStatusChange}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full sm:w-56 h-10 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">
              <div className="flex items-center justify-between w-full">
                <span className="font-medium">Todos los estados</span>
                <Badge variant="secondary" className="ml-2 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  {statusStats.all || 0}
                </Badge>
              </div>
            </SelectItem>
            {Object.entries(PatientStatusEnum).map(([key, value]) => {
              const config = STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]
              const count = statusStats[value] || 0
              const Icon = config?.icon || Users
              
              return (
                <SelectItem key={key} value={value}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 opacity-60" />
                      <span>{config?.label || value}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      
      {(searchTerm || statusFilter !== 'all') && (
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="w-full lg:w-auto hover:bg-slate-50 dark:hover:bg-slate-800"
          disabled={isLoading}
        >
          <X className="w-4 h-4 mr-2" />
          Limpiar filtros
        </Button>
      )}
    </div>
  </div>
))
FilterBar.displayName = "FilterBar"

// ✅ EmptyState Component
const EmptyStateComponent = memo(({ hasFilters, onClearFilters }: { 
  hasFilters: boolean
  onClearFilters: () => void
}) => (
  <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-8 sm:p-12">
    <EmptyState
      title={hasFilters ? "No se encontraron pacientes" : "No hay pacientes registrados"}
      description={hasFilters 
        ? "No hay pacientes que coincidan con los filtros aplicados."
        : "Aún no tienes pacientes registrados en el sistema."
      }
      actionText={hasFilters ? "Limpiar filtros" : undefined}
      onAction={hasFilters ? onClearFilters : undefined}
      icon={<Users className="h-10 w-10 text-slate-300 dark:text-slate-600" />}
    />
  </div>
))
EmptyStateComponent.displayName = "EmptyState"

// 🚀 Componente Principal Optimizado
const PatientManagement: React.FC = () => {
  const router = useRouter()
  
  // Estados locales optimizados
  const [selectedPatient, setSelectedPatient] = useState<EnrichedPatient | null>(null)
  const [patientForAppointment, setPatientForAppointment] = useState<EnrichedPatient | null>(null)
  const [surveyLink, setSurveyLink] = useState("")
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false)

  // Zustand patient store
  const paginatedPatients = usePatientStore(s => s.paginatedPatients)
  const patientsPagination = usePatientStore(s => s.patientsPagination)
  const patientsStats = usePatientStore(s => s.patientsStats)
  const patientsFilters = usePatientStore(s => s.patientsFilters)
  const isPatientsLoading = usePatientStore(s => s.isPatientsLoading)
  const patientsError = usePatientStore(s => s.patientsError)

  const setPatientsPage = usePatientStore(s => s.setPatientsPage)
  const setPatientsSearch = usePatientStore(s => s.setPatientsSearch)
  const setPatientsStatus = usePatientStore(s => s.setPatientsStatus)
  const clearPatientsFilters = usePatientStore(s => s.clearPatientsFilters)
  const refetchPatients = usePatientStore(s => s.refetchPatients)
  const fetchPatients = usePatientStore(s => s.fetchPatients)

  // Initial fetch on mount if needed
  useEffect(() => {
    if (!paginatedPatients) {
      fetchPatients().catch(() => {})
    }
  }, [fetchPatients, paginatedPatients])
  
  // Datos memoizados
  const patientStatsData: PatientStatsData = useMemo(() => 
    patientsStats || {
      totalPatients: 0,
      surveyRate: 0,
      pendingConsults: 0,
      operatedPatients: 0
    }, [patientsStats])
  
  const statusStats: StatusStats = useMemo(() => {
    if (!patientsStats?.statusStats) {
      return { all: 0 } as StatusStats
    }
    return {
      ...patientsStats.statusStats,
      all: patientsStats.totalPatients || 0
    } as StatusStats
  }, [patientsStats])

  // Callbacks optimizados
  const handlePageChange = useCallback((page: number) => {
    startTransition(() => {
      setPatientsPage(page)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [setPatientsPage])

  const handleSelectPatient = useCallback((patient: EnrichedPatient) => {
    setSelectedPatient(patient)
    setDetailsDialogOpen(true)
  }, [])

  const handleShareSurvey = useCallback((patient: EnrichedPatient) => {
    const link = typeof window !== 'undefined' 
      ? `${window.location.origin}/survey/${generateSurveyId()}?patientId=${patient.id}` 
      : ''
    setSelectedPatient(patient)
    setSurveyLink(link)
    setShareDialogOpen(true)
  }, [])

  const handleEditPatient = useCallback((patient: EnrichedPatient) => {
    toast.info(`Editar paciente: ${patient.nombre} ${patient.apellidos}`)
  }, [])

  const handleAnswerSurvey = useCallback((patient: EnrichedPatient) => {
    router.push(`/survey/${generateSurveyId()}?patientId=${patient.id}&mode=internal`)
  }, [router])

  const handleScheduleAppointment = useCallback((patient: EnrichedPatient) => {
    setPatientForAppointment(patient)
    setAppointmentDialogOpen(true)
  }, [])

  const handleStatusFilterChange = useCallback((value: StatusFilterType) => {
    startTransition(() => {
      setPatientsStatus(value)
    })
  }, [setPatientsStatus])

  const handleClearFilters = useCallback(() => {
    startTransition(() => {
      clearPatientsFilters()
    })
  }, [clearPatientsFilters])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    startTransition(() => {
      setPatientsSearch(e.target.value)
    })
  }, [setPatientsSearch])

  const handleClearSearch = useCallback(() => {
    startTransition(() => {
      setPatientsSearch("")
    })
  }, [setPatientsSearch])

  const handleStartInternal = useCallback(() => {
    if (selectedPatient) {
      router.push(`/survey/${generateSurveyId()}?patientId=${selectedPatient.id}&mode=internal`)
      setShareDialogOpen(false)
    }
  }, [selectedPatient, router])

  const handleRefresh = useCallback(() => {
    refetchPatients()
  }, [refetchPatients])

  // Variables derivadas
  const isLoading = isPatientsLoading
  const isFetching = isPatientsLoading
  const hasFilters = patientsFilters.search !== "" || patientsFilters.status !== "all"
  const hasPatients = paginatedPatients && paginatedPatients.length > 0

  // Loading state
  if (isLoading && !paginatedPatients) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="bg-white dark:bg-slate-950 rounded-2xl h-48 border border-slate-200 dark:border-slate-800" />
        <div className="bg-white dark:bg-slate-950 rounded-xl h-20 border border-slate-200 dark:border-slate-800" />
        <div className="bg-white dark:bg-slate-950 rounded-xl h-96 border border-slate-200 dark:border-slate-800" />
      </div>
    )
  }

  // Error state
  if (patientsError) {
    return (
      <div className="bg-white dark:bg-slate-950 rounded-xl border shadow-sm border-slate-200 dark:border-slate-800 p-8 sm:p-12">
        <div className="text-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-4 mx-auto w-16 h-16 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Error al cargar pacientes
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {patientsError.message || "Ha ocurrido un error inesperado"}
          </p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4 pb-8">
      {/* Header con estadísticas */}
      <PatientHeader 
        statsData={patientStatsData}
        isLoadingStats={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Barra de filtros */}
      <FilterBar 
        searchTerm={patientsFilters.search}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        statusFilter={patientsFilters.status as StatusFilterType}
        onStatusChange={handleStatusFilterChange}
        onClearFilters={handleClearFilters}
        statusStats={statusStats}
        isLoading={isFetching}
      />

      {/* Contenido principal */}
      {hasPatients ? (
        <>
          <div className="relative">
            {isFetching && (
              <div className="absolute inset-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm rounded-xl flex items-center justify-center p-4">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-lg shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    Actualizando...
                  </span>
                </div>
              </div>
            )}
            <PatientTable 
              patients={paginatedPatients}
              onSelectPatient={handleSelectPatient}
              onShareSurvey={handleShareSurvey}
              onEditPatient={handleEditPatient}
              onAnswerSurvey={handleAnswerSurvey}
              onScheduleAppointment={handleScheduleAppointment}
            />
          </div>

          {/* Paginación */}
          {patientsPagination.totalPages > 1 && (
            <div className="mt-4 pb-4">
              <SimplePagination 
                currentPage={patientsFilters.page} 
                totalPages={patientsPagination.totalPages} 
                onPageChange={handlePageChange}
                loading={isFetching}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyStateComponent 
          hasFilters={hasFilters}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Modales con Lazy Loading */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl p-6 flex items-center shadow-2xl">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600 mr-3" />
            <span className="text-slate-700 dark:text-slate-300 font-medium">Cargando...</span>
          </div>
        </div>
      }>
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
      </Suspense>
    </div>
  )
}

const MemoizedPatientManagement = memo(PatientManagement)
MemoizedPatientManagement.displayName = "PatientManagement"

export { MemoizedPatientManagement as PatientManagement }