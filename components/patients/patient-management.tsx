"use client";

import { useState, useMemo, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SearchIcon, ListFilter, Filter } from "lucide-react"
import { useAppContext } from "@/lib/context/app-context"
import type { PatientData } from "@/app/dashboard/data-model";
import { UnifiedPatientRegistrationForm } from "@/components/patient-admision/new-patient-form";
import { generateSurveyId } from "@/lib/form-utils"
import { useRouter } from "next/navigation"
import { PatientTable } from "./patient-table"
import { PatientCardView } from "./patient-card-view"
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile, useIsTablet } from "@/hooks/use-breakpoint";

export function PatientManagement() {
  const { patients } = useAppContext()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null)
  const [surveyLink, setSurveyLink] = useState("")
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPatientId, setEditingPatientId] = useState<string | null>(null)
  const router = useRouter()
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Estados para la paginación
  const [currentPage, setCurrentPage] = useState(1);
  // Ajustar elementos por página según tamaño de pantalla
  const itemsPerPage = useMemo(() => {
    if (isMobile) return 5;
    if (isTablet) return 8;
    return 10; // Desktop
  }, [isMobile, isTablet]);

  // Estados para el modal de encuesta y selección de paciente
  const [showSurveyModal, setShowSurveyModal] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Estado para el panel de filtros en móvil
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Memoizar la lista filtrada de pacientes para evitar recálculos innecesarios
  const filteredPatientsRaw = useMemo(() => {
    let filtered = patients

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (patient) =>
          `${patient.nombre} ${patient.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (patient.diagnostico_principal && patient.diagnostico_principal.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    // Aplicar filtro de estado
    if (statusFilter && statusFilter !== "todos") {
      filtered = filtered.filter((patient) => patient.estado === statusFilter)
    }

    return filtered
  }, [patients, searchTerm, statusFilter]);

  // Calcular el número total de páginas (mínimo 1 página si hay pacientes)
  const totalPages = useMemo(() => {
    return filteredPatientsRaw.length > 0 
      ? Math.ceil(filteredPatientsRaw.length / itemsPerPage)
      : 0;
  }, [filteredPatientsRaw, itemsPerPage]);

  // Obtener los pacientes para la página actual
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredPatientsRaw.slice(startIndex, endIndex);
  }, [filteredPatientsRaw, currentPage, itemsPerPage]);

  // Memoizar la lista de pacientes sin encuesta
  const patientsWithoutSurvey = useMemo(() => {
    return patients.filter((patient) => !patient.encuesta)
  }, [patients])

  // Memoizar la función para obtener la clase de color según el estado
  const getStatusColorClass = useCallback((status: string) => {
    switch (status) {
      case "Operado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "No Operado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "Pendiente de consulta":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      case "Seguimiento":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
      case "Cancelado":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
      default:
        return ""
    }
  }, [])

  // Función para ir a la página siguiente
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Función para ir a la página anterior
  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  // Función para abrir el diálogo de compartir encuesta
  const handleShareSurvey = useCallback((patient: PatientData) => {
    const surveyId = generateSurveyId()
    // Generar enlace para la ruta /survey/[id]
    const link = `${window.location.origin}/survey/${surveyId}?patientId=${patient.id}`

    setSelectedPatient(patient)
    setSurveyLink(link)
    setShareDialogOpen(true)
  }, [])

  // Función para contestar la encuesta directamente
  const handleAnswerSurvey = useCallback(
    (patient: PatientData) => {
      const surveyId = generateSurveyId()

      // Mostrar notificación de redirección
      toast.info(`Iniciando encuesta para ${patient.nombre} ${patient.apellidos}`, {
        description: "Redirigiendo a la página de encuesta...",
      })

      // Redirigir al entorno aislado de la encuesta
      router.push(`/survey/${surveyId}?patientId=${patient.id}&mode=internal`)
    },
    [router],
  )

  // Función para abrir el diálogo de edición de paciente
  const handleEditPatient = useCallback((patient: PatientData) => {
    setEditingPatientId(patient.id)
    setEditDialogOpen(true)
  }, [])

  // Función para manejar la selección de pacientes
  const handlePatientSelect = useCallback(
    (patient: PatientData) => {
      console.log("Patient selected:", patient)
      setSelectedPatient(patient)
      setLoading(true)

      // Visual feedback
      toast.info(`Seleccionado: ${patient.nombre} ${patient.apellidos}`, {
        description: `ID: ${patient.id} - ${patient.diagnostico_principal || "Sin diagnóstico"} - ${patient.estado_paciente || "Pendiente"}`,
      })
      
      // Simular una operación asíncrona breve para mejor UX
      setTimeout(() => {
        try {
          // Check if survey is completed
          if (!patient.encuesta) {
            // Mostrar opciones para pacientes sin encuesta
            setShowSurveyModal(true)
          } else {
            // Survey is completed, navigate to results
            router.push(`/survey-results/${patient.id}`)
          }
        } catch (error) {
          console.error("Navigation error:", error)
          toast.error("Error al navegar a los resultados", {
            description: "Intente nuevamente o contacte al soporte técnico",
          })
        } finally {
          // Desactivar el loading en todos los casos
          setLoading(false)
        }
      }, 300)
    },
    [router, toast],
  )

  // Función para iniciar la encuesta internamente desde el diálogo de compartir
  const handleStartInternalSurvey = useCallback(() => {
    if (selectedPatient) {
      const surveyId = generateSurveyId()

      // Cerrar el diálogo
      setShareDialogOpen(false)

      // Mostrar notificación de redirección
      toast.info(`Iniciando encuesta para ${selectedPatient.nombre} ${selectedPatient.apellidos}`, {
        description: "Redirigiendo a la página de encuesta...",
      })

      // Redirigir a la página de encuesta aislada
      router.push(`/survey/${surveyId}?patientId=${selectedPatient.id}&mode=internal`)
    }
  }, [selectedPatient, router])

  return (
    <div className="w-full space-y-4">
      <div className="px-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold tracking-tight mb-1">Gestión de Pacientes</h2>
            <p className="text-muted-foreground">Administre la información de sus pacientes</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Búsqueda */}
            <div className="relative flex-1 sm:w-[220px] md:w-[260px] lg:w-[320px]">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pacientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
            
            {/* Filtro para móvil y tablets pequeñas */}
            {(isMobile || (isTablet && window.innerWidth < 768)) && (
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="sm:hidden">
                    <Filter className="h-4 w-4" />
                    <span className="sr-only">Filtros</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[300px]">
                  <SheetHeader>
                    <SheetTitle>Filtros</SheetTitle>
                    <SheetDescription>Filtra los pacientes por estado</SheetDescription>
                  </SheetHeader>
                  <div className="py-6">
                    <Select value={statusFilter || "todos"} onValueChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1); // Resetear a la primera página al cambiar el filtro
                      setFiltersOpen(false); // Cerrar el panel al seleccionar
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos</SelectItem>
                        <SelectItem value="Pendiente de consulta">Pendiente</SelectItem>
                        <SelectItem value="Operado">Operado</SelectItem>
                        <SelectItem value="No Operado">No Operado</SelectItem>
                        <SelectItem value="Seguimiento">Seguimiento</SelectItem>
                        <SelectItem value="Cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {/* Filtro para tablets grandes y desktop */}
            {(!isMobile && !(isTablet && window.innerWidth < 768)) && (
              <Select value={statusFilter || "todos"} onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1); // Resetear a la primera página al cambiar el filtro
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="Pendiente de consulta">Pendiente</SelectItem>
                  <SelectItem value="Operado">Operado</SelectItem>
                  <SelectItem value="No Operado">No Operado</SelectItem>
                  <SelectItem value="Seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            )}
            
            <UnifiedPatientRegistrationForm 
              mode="registerAndSchedule" 
              buttonLabel="Nuevo Paciente"
              onSuccess={({ patient, appointment }) => {
                // Potentially refresh data or navigate, similar to how NewPatientForm's onSuccess might have worked.
                // For now, just log, as the original onSuccess behavior is not fully visible.
                console.log("New patient and appointment created:", patient, appointment);
                // Example: refetch patients or add to local state if needed
              }}
            />
          </div>
        </div>
      </div>
      <div className="px-4 pt-2">

        {/* Contenedor principal para la tabla/tarjetas y paginación */}
        {isMobile || isTablet ? (
          <PatientCardView
            patients={paginatedPatients}
            loading={loading}
            onShareSurvey={handleShareSurvey}
            onAnswerSurvey={handleAnswerSurvey}
            onEditPatient={handleEditPatient}
            onSelectPatient={handlePatientSelect}
          />
        ) : (
          <PatientTable
            patients={paginatedPatients}
            loading={loading} 
            onShareSurvey={handleShareSurvey}
            onAnswerSurvey={handleAnswerSurvey}
            onEditPatient={handleEditPatient}
            onSelectPatient={handlePatientSelect}
          />
        )}

        {/* Información del total de pacientes - Siempre visible */}
        <div className="flex flex-col gap-2 mt-4">
          <div className="text-center text-sm text-muted-foreground">
            <span className="font-medium">{filteredPatientsRaw.length}</span> pacientes en total
            {searchTerm || statusFilter ? " (filtrados)" : ""}
          </div>
          
          {/* Controles de Paginación - Siempre visibles si hay al menos un paciente */}
          {filteredPatientsRaw.length > 0 && (
            <div className="flex items-center justify-center space-x-2 sm:space-x-4 mt-2 mb-4 px-2">
              <Button 
                onClick={handlePreviousPage} 
                disabled={currentPage === 1} 
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="min-w-[80px] sm:min-w-[100px] h-9 sm:h-10"
              >
                Anterior
              </Button>
              <span className="text-sm font-medium px-1 sm:px-2">
                {currentPage}/{Math.max(totalPages, 1)}
              </span>
              <Button 
                onClick={handleNextPage} 
                disabled={currentPage === totalPages || totalPages === 0} 
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="min-w-[80px] sm:min-w-[100px] h-9 sm:h-10"
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        {/* Diálogo para compartir encuesta */}
        {selectedPatient && (
          <SurveyShareDialog
            isOpen={shareDialogOpen}
            patient={selectedPatient}
            surveyLink={surveyLink}
            onStartInternal={handleStartInternalSurvey}
            onClose={() => setShareDialogOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
