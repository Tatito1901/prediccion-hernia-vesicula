"use client"

import { useState, useEffect } from "react"
import SurveyResultsAnalyzer from "@/components/surveys/survey-results-analyzer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, ClipboardCheck, AlertCircle } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
// ❌ ELIMINADO: import { usePatient } - Ya no es necesario, usamos contexto central
import { useClinic } from "@/contexts/clinic-data-provider";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";
import { generateSurveyId } from "@/lib/form-utils"
import type { PatientData } from "@/components/charts/types"

// Componente interno que usa el contexto
function SurveyResultsContent() {
  const router = useRouter()
  const params = useParams();
  const patientIdFromParams = params.id as string;
  // Mantener patientId como string para usar con getPatientById que espera un string
  const patientId = patientIdFromParams;
  
  // ANTES: const { data: patientData, isLoading, isError, error } = usePatient(patientId);
  // AHORA: Usar contexto central para obtener datos del paciente
  const { enrichedPatients } = useClinic();
  const patientData = enrichedPatients.find(p => p.id === patientId);
  const isLoading = false; // Ya no hay loading porque los datos vienen del contexto
  const isError = false; // Ya no hay error porque los datos vienen del contexto
  const error = null; // Ya no hay error porque los datos vienen del contexto

    useEffect(() => {
    // Si tenemos datos del paciente y la encuesta no está completada, redirigimos.
    if (patientData && !patientData.encuesta) {
      toast.error("El paciente no ha completado la encuesta", {
        description: "No se puede mostrar el análisis sin datos de la encuesta",
      })
      router.push("/pacientes")
    }
  }, [patientData, router])

  const handleGeneratePDF = () => {
    toast.success("Generando PDF...", {
      description: "El documento se descargará en breve.",
    })
    // In a real app, this would generate and download a PDF
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `Resultados de encuesta - Paciente ${patientData?.nombre} ${patientData?.apellidos}`,
          text: "Análisis de resultados de encuesta pre-consulta",
          url: window.location.href,
        })
        .then(() => toast.success("Compartido exitosamente"))
        .catch((error) => {
          console.error("Error sharing:", error)
          toast.error("Error al compartir")
        })
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("URL copiada al portapapeles"))
        .catch(() => toast.error("Error al copiar la URL"))
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Resultados de Encuesta</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando resultados de la encuesta...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

    if (isError) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <Card className="mb-6 border-red-300 bg-red-50 dark:bg-red-950/20">
          <CardContent className="pt-6">
            <div className="text-red-600 dark:text-red-400 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Error al cargar los resultados</p>
                                <p className="text-sm">Ocurrió un error inesperado.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => router.back()}>
                  Volver a la lista de pacientes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Función para iniciar una nueva encuesta para el paciente
  const handleStartSurvey = () => {
    if (patientData) {
      const surveyId = generateSurveyId()
      
      // Mostrar notificación de redirección
      toast.info(`Iniciando encuesta para ${patientData.nombre} ${patientData.apellidos}`, {
        description: "Redirigiendo a la página de encuesta...",
      })
      
      // Redirigir a la encuesta con modo interno
      router.push(`/survey/${surveyId}?patientId=${patientData.id}&mode=internal&returnTo=/survey-results/${patientData.id}`)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Resultados de Encuesta</h1>
      </div>

      {patientData ? (
        <SurveyResultsAnalyzer
          patientData={patientData} // Pasar el objeto completo del paciente en lugar del ID
        />
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4" />
              <p>No se encontró el paciente especificado.</p>
              <Button variant="outline" className="mt-4" onClick={() => router.back()}>
                Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componente principal envuelto con ClinicDataProvider
export default function SurveyResultsPage() {
  return (
    <ClinicDataProvider>
      <SurveyResultsContent />
    </ClinicDataProvider>
  )
}
