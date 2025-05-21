"use client"

import { useState, useEffect } from "react"
import { SurveyResultsAnalyzer } from "@/components/surveys/survey-results-analyzer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

export default function SurveyResultsPage() {
  const router = useRouter()
  const params = useParams();
  const patientIdFromParams = params.id as string;

  const [isLoading, setIsLoading] = useState(true)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [surveyNotCompleted, setSurveyNotCompleted] = useState(false)

  useEffect(() => {
    const fetchPatientData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        console.log("Fetching data for patient ID:", patientIdFromParams)

        // In a real app, you would fetch the patient data from an API
        // For now, we'll simulate a delay and use mock data
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // This would be replaced with actual API call
        // const response = await fetch(`/api/patients/${params.id}`)
        // const data = await response.json()

        // For demo purposes, we'll just set mock data
        // In a real app, this would come from the API
        const mockData: PatientData = {
          id: Number.parseInt(patientIdFromParams),
          nombre: "Juan",
          apellidos: "Pérez García",
          edad: 45,
          fechaConsulta: new Date().toISOString(),
          fechaRegistro: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          diagnostico: "Hernia Inguinal",
          estado: "Pendiente de consulta",
          probabilidadCirugia: 0.65,
          encuesta: {
            nombre: "Juan",
            apellidos: "Pérez García",
            edad: 45,
            telefono: "5512345678",
            email: "juan.perez@ejemplo.com",
            origen: "Google",
            diagnosticoPrevio: true,
            detallesDiagnostico: "Hernia inguinal derecha",
            intensidadDolor: 7,
            sintomas: ["Dolor en la zona abdominal", "Bulto o hinchazón visible", "Dolor que aumenta con esfuerzos"],
            duracionSintomas: "6_12_meses",
            severidadCondicion: "Moderada",
            afectacionDiaria: "Moderada",
            seguroMedico: "IMSS",
            factoresImportantes: ["Seguridad", "Experiencia", "Proceso rápido"],
            preocupacionesCirugia: ["Tiempo de recuperación", "Ausencia laboral"],
            plazoDeseado: "30 días",
            estudiosPrecios: true,
            tratamientosPrevios: true,
            submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }

        setPatientData(mockData)

        if (mockData && !mockData.encuesta) {
          setSurveyNotCompleted(true)
        }
      } catch (error) {
        console.error("Error fetching patient data:", error)
        setError("No se pudo cargar la información del paciente. Por favor, intente nuevamente.")
      } finally {
        setIsLoading(false)
      }
    }

    if (patientIdFromParams) {
      fetchPatientData()
    }
  }, [patientIdFromParams])

  useEffect(() => {
    if (patientData && !patientData.encuesta && surveyNotCompleted) {
      // If survey is not completed, redirect to patients page with a toast
      toast.error("El paciente no ha completado la encuesta", {
        description: "No se puede mostrar el análisis sin datos de la encuesta",
      })
      router.push("/pacientes")
    }
  }, [patientData, router, surveyNotCompleted])

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

  if (error) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No se pudieron cargar los resultados</CardTitle>
            <CardDescription>Ocurrió un error al intentar cargar los datos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="mr-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Resultados de Encuesta</h1>
      </div>

      <SurveyResultsAnalyzer
        patientId={patientIdFromParams}
        patient={patientData ?? undefined}
        onGeneratePDF={handleGeneratePDF}
        onShare={handleShare}
      />
    </div>
  )
}
