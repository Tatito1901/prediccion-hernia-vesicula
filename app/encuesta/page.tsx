"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/navigation/app-sidebar"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tablet, Smartphone, ArrowLeft } from "lucide-react"
// ❌ ELIMINADO: import { usePatient } - Ya no es necesario, usamos contexto central
import { useUpdatePatient } from "@/hooks/use-patient";
import { useClinic } from "@/contexts/clinic-data-provider";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";
import MedicalSurveyAnalysis from "@/components/surveys/medical-survey-analysis"
import PatientSurveyForm from "@/components/surveys/patient-survey-form"
import { toast } from "sonner"
import { PatientStatusEnum } from "@/lib/types";

// Componente interno que utiliza useSearchParams
function EncuestaContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // El resto del componente permanece igual...
  

  // Obtener parámetros de la URL
  const patientId = searchParams.get("patientId") ? Number.parseInt(searchParams.get("patientId") || "0") : undefined
  const surveyId = searchParams.get("surveyId") || undefined
  const mode = searchParams.get("mode") || "internal" // internal o tablet

  // Estado para el modo de encuesta (tablet o teléfono)
  const [surveyMode, setSurveyMode] = useState<"tablet" | "phone">("tablet")
  const [showModeSelector, setShowModeSelector] = useState(true)

  // Estado para el modo de visualización (encuesta o análisis)
  const [viewMode, setViewMode] = useState<"survey" | "analysis">("survey")

  // ANTES: const { data: patient, isLoading, isError } = usePatient(patientId ? String(patientId) : null);
  // AHORA: Usar contexto central para obtener datos del paciente
  const { enrichedPatients } = useClinic();
  const patient = enrichedPatients.find(p => p.id === String(patientId));
  const isLoading = false; // Ya no hay loading porque los datos vienen del contexto
  const isError = false; // Ya no hay error porque los datos vienen del contexto
  // Usar la mutación de React Query para actualizar
  const { mutate: updatePatient } = useUpdatePatient();

    // El `useEffect` para cargar datos ya no es necesario, React Query lo maneja.

  // Manejar la finalización de la encuesta
  const handleSurveyComplete = (data: any) => {
    console.log("Encuesta completada:", data)

        // Actualizar el estado del paciente con la mutación de React Query
    if (patientId && patient) {
      updatePatient({ 
        id: String(patientId), 
        updates: {
          // Solo actualizamos las columnas válidas del esquema
          estado_paciente: PatientStatusEnum.POTENCIAL,
        }
      });

      // Mostrar notificación de éxito
      toast.success("Encuesta completada con éxito", {
        description: "El paciente ha sido marcado como 'potencial'",
      })

      // Redirigir a la página de gracias
      router.push(`/survey/gracias?id=${surveyId}`)
    }
  }

  // Efecto para detectar si venimos de un modo específico
  useEffect(() => {
    if (mode === "internal") {
      setShowModeSelector(false)
    }
  }, [mode])

  // Si estamos mostrando el selector de modo
  if (showModeSelector) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>

          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <Card className="w-full max-w-3xl mx-auto">
                    <CardHeader>
                      <CardTitle>Seleccione el Dispositivo para la Encuesta</CardTitle>
                      <CardDescription>Elija cómo desea que el paciente complete la encuesta</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="tablet" onValueChange={(value) => setSurveyMode(value as "tablet" | "phone")}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="tablet">
                            <Tablet className="mr-2 h-4 w-4" />
                            Tablet de la Clínica
                          </TabsTrigger>
                          <TabsTrigger value="phone">
                            <Smartphone className="mr-2 h-4 w-4" />
                            Teléfono del Paciente
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="tablet" className="mt-4 text-center">
                          <p className="mb-4">
                            El paciente completará la encuesta en una tablet proporcionada por la clínica.
                          </p>
                          <Button onClick={() => setShowModeSelector(false)}>Iniciar Encuesta en Tablet</Button>
                        </TabsContent>
                        <TabsContent value="phone" className="mt-4 text-center">
                          <p className="mb-4">El paciente completará la encuesta en su propio teléfono móvil.</p>
                          <Button onClick={() => setShowModeSelector(false)}>Compartir Encuesta por WhatsApp</Button>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Botón para volver atrás */}
                <Button variant="outline" size="sm" className="mb-4" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>

                {/* Información del paciente */}
                {patient && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>
                        Encuesta para {patient.nombre} {patient.apellidos}
                      </CardTitle>
                      <CardDescription>
                        ID: {patient.id} | Edad: {patient.edad} | Diagnóstico: {patient.diagnostico_principal}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                )}

                {/* Selector de modo de visualización */}
                <div className="mb-6">
                  <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "survey" | "analysis")}>
                    <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
                      <TabsTrigger value="survey">Formulario de Encuesta</TabsTrigger>
                      <TabsTrigger value="analysis">Análisis Clínico</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Contenido según el modo seleccionado */}
                {viewMode === "survey" ? (
                  surveyId ? (
                    <PatientSurveyForm
                      patientId={patientId}
                      surveyTemplateId={surveyId}
                      assignedSurveyId={surveyId}
                      initialData={patient ? { nombre: patient.nombre || undefined, apellidos: patient.apellidos || undefined, edad: patient.edad || undefined } : undefined}
                      onComplete={handleSurveyComplete}
                    />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>ID de encuesta no encontrado</CardTitle>
                        <CardDescription>
                          No se pudo encontrar el ID de la encuesta en la URL. Por favor, asegúrese de que el enlace sea correcto.
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  )
                ) : (
                  <MedicalSurveyAnalysis
                    title="Análisis Clínico de Encuestas"
                    description="Análisis médico detallado de los datos recopilados en las encuestas de pacientes"
                    patients={enrichedPatients} // Pasar la lista de pacientes del contexto central
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

// Componente principal envuelto en Suspense y ClinicDataProvider
export default function EncuestaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div></div>}>
      <ClinicDataProvider>
        <EncuestaContent />
      </ClinicDataProvider>
    </Suspense>
  )
}
