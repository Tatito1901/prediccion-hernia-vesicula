"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { PlusIcon, LayoutDashboardIcon, UsersIcon, ClipboardListIcon, TagIcon } from "lucide-react"
import { toast } from "sonner"
import { FollowUpItem } from "../crm/follow-up-item"
import { FollowUpFilters, type FollowUpFilterState } from "../crm/follow-up-filters"
import { FollowUpForm } from "../crm/follow-up-form"
import { PatientInfoCard } from "../crm/patient-info-card"
import { FollowUpStats } from "../crm/follow-up-stats"
import { EmptyState } from "../crm/empty-state"
import { PatientSelector } from "../crm/patient-selector"
import { ResourcesPanel } from "../crm/resources-panel"
import { AiRecommendations } from "../crm/ai-recommendations"
import { FollowUpStrategies } from "../crm/follow-up-strategies"
import { PromotionsPanel } from "../crm/promotions-panel"
import { PatientConversionInsights } from "../crm/patient-conversion-insights"
import type { FollowUp, PatientData } from "@/app/dashboard/data-model"

interface CrmFollowupProps {
  followUps?: FollowUp[]
  patients?: PatientData[]
  initialSelectedPatientId?: number | null
  initialMainView?: "dashboard" | "patients" | "followups" | "resources"
}

export function CrmFollowup({
  followUps: initialFollowUps,
  patients: initialPatients,
  initialSelectedPatientId = null,
  initialMainView = "dashboard",
}: CrmFollowupProps) {
  // State for follow-ups and patients
  const [followUps, setFollowUps] = useState<FollowUp[]>(initialFollowUps || [])
  const [patients, setPatients] = useState<PatientData[]>(initialPatients || [])

  // State for active tab
  const [activeTab, setActiveTab] = useState("pendientes")

  // State for main view
  const [mainView, setMainView] = useState<"dashboard" | "patients" | "followups" | "resources">(initialMainView)

  // State for selected patient
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(initialSelectedPatientId)

  // State for follow-up form
  const [formState, setFormState] = useState({
    isOpen: false,
    editingFollowUp: null as FollowUp | null,
  })

  // State for filters
  const [filters, setFilters] = useState<FollowUpFilterState>({
    search: "",
    status: [],
    type: [],
    result: [],
    assignedTo: [],
    dateRange: {
      from: undefined,
      to: undefined,
    },
    sortBy: "fecha",
    sortOrder: "desc",
  })

  // Update local state when props change
  useEffect(() => {
    if (initialFollowUps) {
      setFollowUps(initialFollowUps)
    }
    if (initialPatients) {
      setPatients(initialPatients)
    }
  }, [initialFollowUps, initialPatients])

  // Get selected patient
  const selectedPatient = useMemo(() => {
    return selectedPatientId ? patients.find((p) => p.id === selectedPatientId) || null : null
  }, [selectedPatientId, patients])

  // Get available assignees
  const availableAssignees = useMemo(() => {
    const assignees = new Set<string>()
    followUps.forEach((followUp) => {
      if (followUp.asignadoA) {
        assignees.add(followUp.asignadoA)
      }
    })
    return Array.from(assignees)
  }, [followUps])

  // Filter follow-ups based on active tab and filters
  const filteredFollowUps = useMemo(() => {
    // Start with a base filtered set based on the active tab
    let filtered = followUps.filter((f) => {
      if (activeTab === "pendientes") return f.estado === "Programado"
      if (activeTab === "completados") return f.estado === "Completado"
      if (activeTab === "cancelados") return f.estado === "Cancelado"
      return true // "todos" tab
    })

    // Apply patient filter if selected
    if (selectedPatientId) {
      filtered = filtered.filter((f) => f.patientId === selectedPatientId)
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter((f) => {
        const patient = patients.find((p) => p.id === f.patientId)
        return (
          f.notas.toLowerCase().includes(searchLower) ||
          f.tipo.toLowerCase().includes(searchLower) ||
          f.resultado.toLowerCase().includes(searchLower) ||
          f.asignadoA.toLowerCase().includes(searchLower) ||
          (patient && `${patient.nombre} ${patient.apellidos}`.toLowerCase().includes(searchLower))
        )
      })
    }

    // Apply other filters (status, type, result, assignee)
    if (filters.status.length > 0) {
      filtered = filtered.filter((f) => filters.status.includes(f.estado))
    }

    if (filters.type.length > 0) {
      filtered = filtered.filter((f) => filters.type.includes(f.tipo))
    }

    if (filters.result.length > 0) {
      filtered = filtered.filter((f) => filters.result.includes(f.resultado))
    }

    if (filters.assignedTo.length > 0) {
      filtered = filtered.filter((f) => filters.assignedTo.includes(f.asignadoA))
    }

    // Apply date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter((f) => {
        const followUpDate = new Date(f.fecha)
        followUpDate.setHours(0, 0, 0, 0)

        if (filters.dateRange.from && filters.dateRange.to) {
          const fromDate = new Date(filters.dateRange.from)
          fromDate.setHours(0, 0, 0, 0)
          const toDate = new Date(filters.dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return followUpDate >= fromDate && followUpDate <= toDate
        } else if (filters.dateRange.from) {
          const fromDate = new Date(filters.dateRange.from)
          fromDate.setHours(0, 0, 0, 0)
          return followUpDate >= fromDate
        } else if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to)
          toDate.setHours(23, 59, 59, 999)
          return followUpDate <= toDate
        }

        return true
      })
    }

    // Apply sorting
    return [...filtered].sort((a, b) => {
      let valueA, valueB

      switch (filters.sortBy) {
        case "fecha":
          valueA = new Date(a.fecha).getTime()
          valueB = new Date(b.fecha).getTime()
          break
        case "proximoSeguimiento":
          valueA = a.proximoSeguimiento ? new Date(a.proximoSeguimiento).getTime() : 0
          valueB = b.proximoSeguimiento ? new Date(b.proximoSeguimiento).getTime() : 0
          break
        default:
          valueA = a[filters.sortBy as keyof FollowUp]
          valueB = b[filters.sortBy as keyof FollowUp]
      }

      if (valueA === valueB) return 0

      const result = valueA > valueB ? 1 : -1
      return filters.sortOrder === "asc" ? result : -result
    })
  }, [followUps, activeTab, selectedPatientId, filters, patients])

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<FollowUpFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
  }

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters({
      search: "",
      status: [],
      type: [],
      result: [],
      assignedTo: [],
      dateRange: {
        from: undefined,
        to: undefined,
      },
      sortBy: "fecha",
      sortOrder: "desc",
    })
  }

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value)
  }

  // Handle patient selection
  const handleSelectPatient = (patientId: number | null) => {
    setSelectedPatientId(patientId)
    if (patientId) {
      setMainView("followups")
    }
  }

  // Handle opening follow-up form for creation
  const handleOpenFollowUpForm = (patientId?: number) => {
    if (patientId) {
      setSelectedPatientId(patientId)
    }

    setFormState({
      isOpen: true,
      editingFollowUp: null,
    })
  }

  // Handle opening follow-up form for editing
  const handleEditFollowUp = (followUp: FollowUp) => {
    setFormState({
      isOpen: true,
      editingFollowUp: followUp,
    })
  }

  // Handle closing follow-up form
  const handleCloseFollowUpForm = () => {
    setFormState({
      isOpen: false,
      editingFollowUp: null,
    })
  }

  // Handle saving follow-up
  const handleSaveFollowUp = (followUpData: Partial<FollowUp>) => {
    try {
      if (formState.editingFollowUp) {
        // Update existing follow-up
        const updatedFollowUps = followUps.map((f) =>
          f.id === formState.editingFollowUp?.id ? { ...f, ...followUpData } : f,
        )
        setFollowUps(updatedFollowUps)
        toast.success("Seguimiento actualizado correctamente")
      } else {
        // Create new follow-up
        const newFollowUp: FollowUp = {
          id: Math.max(0, ...followUps.map((f) => f.id)) + 1,
          patientId: selectedPatientId || 0,
          fecha: followUpData.fecha || new Date().toISOString(),
          tipo: followUpData.tipo || "Llamada",
          notas: followUpData.notas || "",
          resultado: followUpData.resultado || "Interesado",
          proximoSeguimiento: followUpData.proximoSeguimiento,
          estado: followUpData.estado || "Programado",
          asignadoA: followUpData.asignadoA || availableAssignees[0] || "Sin asignar",
        }

        setFollowUps([...followUps, newFollowUp])
        toast.success("Seguimiento creado correctamente")
      }
    } catch (error) {
      console.error("Error saving follow-up:", error)
      toast.error("Error al guardar el seguimiento")
    }
  }

  // Handle changing follow-up status
  const handleFollowUpStatusChange = (id: number, status: "Completado" | "Cancelado" | "Programado") => {
    const updatedFollowUps = followUps.map((f) => (f.id === id ? { ...f, estado: status } : f))
    setFollowUps(updatedFollowUps)
    toast.success(`Seguimiento marcado como ${status}`)
  }

  // Memoize the getPatient function
  const getPatient = useCallback(
    (patientId: number) => {
      return patients.find((p) => p.id === patientId)
    },
    [patients],
  )

  // Render dashboard view
  const renderDashboardView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FollowUpStats followUps={followUps} patients={patients} />
        <Card>
          <CardHeader>
            <CardTitle>Seguimientos Pendientes</CardTitle>
            <CardDescription>Próximos seguimientos programados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {followUps
                .filter((f) => f.estado === "Programado")
                .slice(0, 5)
                .map((followUp) => {
                  const patient = getPatient(followUp.patientId)
                  if (!patient) return null

                  return (
                    <FollowUpItem
                      key={followUp.id}
                      followUp={followUp}
                      patient={patient}
                      onStatusChange={handleFollowUpStatusChange}
                      onEdit={handleEditFollowUp}
                      compact
                    />
                  )
                })}
              {followUps.filter((f) => f.estado === "Programado").length === 0 && (
                <EmptyState type="no-followups" onAction={() => handleOpenFollowUpForm()} />
              )}
              {followUps.filter((f) => f.estado === "Programado").length > 5 && (
                <Button variant="outline" className="w-full" onClick={() => setMainView("followups")}>
                  Ver todos los seguimientos
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Render patients view
  const renderPatientsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PatientSelector
            patients={patients}
            onSelectPatient={handleSelectPatient}
            selectedPatientId={selectedPatientId}
          />
        </div>
        <div className="lg:col-span-2">
          {selectedPatient ? (
            <div className="space-y-6">
              <PatientInfoCard
                patient={selectedPatient}
                onAddFollowUp={() => handleOpenFollowUpForm(selectedPatient.id)}
              />
              <PatientConversionInsights patient={selectedPatient} />
              <AiRecommendations patient={selectedPatient} />
            </div>
          ) : (
            <Card className="h-full flex items-center justify-center p-6">
              <div className="text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Seleccione un paciente</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Seleccione un paciente de la lista para ver su información y gestionar su seguimiento
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Add pagination state
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  // Get paginated results
  const paginatedFollowUps = useMemo(() => {
    const start = page * pageSize
    return filteredFollowUps.slice(start, start + pageSize)
  }, [filteredFollowUps, page, pageSize])

  // Render followups view
  const renderFollowupsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Seguimientos</CardTitle>
              <CardDescription>
                {selectedPatient
                  ? `Seguimientos para ${selectedPatient.nombre} ${selectedPatient.apellidos}`
                  : "Todos los seguimientos"}
              </CardDescription>

              <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-2">
                <TabsList>
                  <TabsTrigger value="pendientes">
                    Pendientes ({followUps.filter((f) => f.estado === "Programado").length})
                  </TabsTrigger>
                  <TabsTrigger value="completados">
                    Completados ({followUps.filter((f) => f.estado === "Completado").length})
                  </TabsTrigger>
                  <TabsTrigger value="cancelados">
                    Cancelados ({followUps.filter((f) => f.estado === "Cancelado").length})
                  </TabsTrigger>
                  <TabsTrigger value="todos">Todos ({followUps.length})</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>

            <CardContent>
              <FollowUpFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                availableAssignees={availableAssignees}
                className="mb-4"
              />

              <div className="space-y-4">
                {paginatedFollowUps.length > 0 ? (
                  paginatedFollowUps.map((followUp) => {
                    const patient = getPatient(followUp.patientId)
                    if (!patient) return null

                    return (
                      <FollowUpItem
                        key={followUp.id}
                        followUp={followUp}
                        patient={patient}
                        onStatusChange={handleFollowUpStatusChange}
                        onEdit={handleEditFollowUp}
                      />
                    )
                  })
                ) : (
                  <EmptyState
                    type={
                      filters.search ||
                      filters.status.length > 0 ||
                      filters.type.length > 0 ||
                      filters.result.length > 0 ||
                      filters.assignedTo.length > 0 ||
                      filters.dateRange.from ||
                      filters.dateRange.to
                        ? "no-results"
                        : "no-followups"
                    }
                    onAction={
                      filters.search ||
                      filters.status.length > 0 ||
                      filters.type.length > 0 ||
                      filters.result.length > 0 ||
                      filters.assignedTo.length > 0 ||
                      filters.dateRange.from ||
                      filters.dateRange.to
                        ? handleClearFilters
                        : () => handleOpenFollowUpForm()
                    }
                  />
                )}
              </div>

              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {paginatedFollowUps.length} de {filteredFollowUps.length} resultados
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * pageSize >= filteredFollowUps.length}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedPatient ? (
            <>
              <PatientInfoCard
                patient={selectedPatient}
                onAddFollowUp={() => handleOpenFollowUpForm(selectedPatient.id)}
              />
              <PatientConversionInsights patient={selectedPatient} />
              <AiRecommendations patient={selectedPatient} />
            </>
          ) : (
            <>
              <Card className="p-4">
                <Button onClick={() => setMainView("patients")} className="w-full">
                  Seleccionar Paciente
                </Button>
              </Card>
              <FollowUpStats followUps={followUps} patients={patients} />
            </>
          )}
        </div>
      </div>
    )
  }

  // Render resources view
  const renderResourcesView = () => {
    return (
      <div className="space-y-6">
        <Tabs defaultValue="strategies">
          <TabsList className="w-full">
            <TabsTrigger value="strategies" className="flex-1">
              Estrategias
            </TabsTrigger>
            <TabsTrigger value="promotions" className="flex-1">
              Promociones
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex-1">
              Recursos
            </TabsTrigger>
          </TabsList>
          <TabsContent value="strategies" className="mt-6">
            <FollowUpStrategies />
          </TabsContent>
          <TabsContent value="promotions" className="mt-6">
            <PromotionsPanel />
          </TabsContent>
          <TabsContent value="resources" className="mt-6">
            <ResourcesPanel />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Salesforce CRM</h2>
            <p className="text-muted-foreground">Gestión integral de pacientes y seguimientos</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => handleOpenFollowUpForm()}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nuevo Seguimiento
            </Button>

            {selectedPatientId && (
              <Button variant="outline" onClick={() => handleSelectPatient(null)}>
                Ver Todos
              </Button>
            )}
          </div>
        </div>

        {/* Main navigation */}
        <div className="flex overflow-x-auto pb-2">
          <div className="flex space-x-1">
            <Button
              variant={mainView === "dashboard" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setMainView("dashboard")}
            >
              <LayoutDashboardIcon className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant={mainView === "patients" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setMainView("patients")}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              Pacientes
            </Button>
            <Button
              variant={mainView === "followups" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setMainView("followups")}
            >
              <ClipboardListIcon className="mr-2 h-4 w-4" />
              Seguimientos
            </Button>
            <Button
              variant={mainView === "resources" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setMainView("resources")}
            >
              <TagIcon className="mr-2 h-4 w-4" />
              Recursos
            </Button>
          </div>
        </div>
      </div>

      {/* Main content based on selected view */}
      {mainView === "dashboard" && renderDashboardView()}
      {mainView === "patients" && renderPatientsView()}
      {mainView === "followups" && renderFollowupsView()}
      {mainView === "resources" && renderResourcesView()}

      {/* Follow-up form dialog */}
      <FollowUpForm
        isOpen={formState.isOpen}
        onClose={handleCloseFollowUpForm}
        onSave={handleSaveFollowUp}
        followUp={formState.editingFollowUp}
        patient={selectedPatient}
        availableAssignees={availableAssignees.length > 0 ? availableAssignees : ["Sin asignar"]}
      />
    </div>
  )
}
