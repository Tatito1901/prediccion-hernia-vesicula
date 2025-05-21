"use client"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertTriangle, Calendar, ArrowRight } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"

interface SurgeryRecommendationCardProps {
  patient: PatientData
  surgeryProbability: number
  onScheduleConsultation?: () => void
}

export function SurgeryRecommendationCard({
  patient,
  surgeryProbability,
  onScheduleConsultation,
}: SurgeryRecommendationCardProps) {
  // Format probability as percentage
  const formatProbability = (probability: number) => {
    return `${(probability * 100).toFixed(0)}%`
  }

  // Get color based on surgery probability
  const getProbabilityColorClass = (probability: number) => {
    if (probability >= 0.7) return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    if (probability >= 0.4) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
  }

  // Get recommendation title based on probability
  const getRecommendationTitle = (probability: number) => {
    if (probability >= 0.7) return "Cirugía altamente recomendada"
    if (probability >= 0.4) return "Cirugía recomendada con consideraciones"
    return "Evaluar otras opciones antes de cirugía"
  }

  // Get key benefits based on patient data
  const getKeyBenefits = () => {
    const benefits = []
    const survey = patient.encuesta

    if (!survey) return []

    if (survey.intensidadDolor >= 7) {
      benefits.push("Alivio inmediato del dolor intenso")
    }

    if (survey.severidadCondicion === "Severa") {
      benefits.push("Resolución de condición severa")
    }

    if (survey.duracionSintomas === "más de 1 año" || survey.duracionSintomas === "6-12 meses") {
      benefits.push("Solución definitiva para condición crónica")
    }

    if (survey.afectacionDiaria === "Severa" || survey.afectacionDiaria === "Moderada") {
      benefits.push("Recuperación de funcionalidad diaria")
    }

    // Add default benefit if none were added
    if (benefits.length === 0) {
      benefits.push("Mejora significativa de calidad de vida")
      benefits.push("Solución definitiva para su condición")
    }

    return benefits
  }

  // Get considerations based on patient data
  const getConsiderations = () => {
    const considerations = []
    const survey = patient.encuesta

    if (!survey) return []

    if (survey.preocupacionesCirugia?.includes("Miedo al procedimiento")) {
      considerations.push("Procedimiento seguro con anestesia controlada")
    }

    if (survey.preocupacionesCirugia?.includes("Tiempo de recuperación")) {
      considerations.push("Programa de recuperación acelerada disponible")
    }

    if (survey.preocupacionesCirugia?.includes("Ausencia laboral")) {
      considerations.push("Opciones de programación flexible para minimizar ausencia")
    }

    // Add default consideration if none were added
    if (considerations.length === 0) {
      considerations.push("Procedimiento estándar con riesgos mínimos")
      considerations.push("Recuperación típica de 2-4 semanas")
    }

    return considerations
  }

  // Get next steps based on probability
  const getNextSteps = (probability: number) => {
    if (probability >= 0.7) {
      return [
        "Programar consulta pre-quirúrgica",
        "Realizar estudios pre-operatorios",
        "Discutir fechas tentativas para cirugía",
      ]
    } else if (probability >= 0.4) {
      return [
        "Programar consulta de seguimiento",
        "Evaluar opciones de tratamiento",
        "Resolver dudas específicas sobre el procedimiento",
      ]
    } else {
      return ["Considerar tratamientos conservadores", "Monitorear evolución de síntomas", "Reevaluar en 3-6 meses"]
    }
  }

  const keyBenefits = getKeyBenefits()
  const considerations = getConsiderations()
  const nextSteps = getNextSteps(surgeryProbability)

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
          <div>
            <CardTitle>{getRecommendationTitle(surgeryProbability)}</CardTitle>
            <CardDescription>Basado en el análisis de la encuesta del paciente</CardDescription>
          </div>
          <Badge className={`text-lg px-3 py-1 ${getProbabilityColorClass(surgeryProbability)}`}>
            {formatProbability(surgeryProbability)} de indicación
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Beneficios clave para este paciente</h3>
          <ul className="space-y-1">
            {keyBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span className="text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium mb-2">Consideraciones importantes</h3>
          <ul className="space-y-1">
            {considerations.map((consideration, index) => (
              <li key={index} className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                <span className="text-sm">{consideration}</span>
              </li>
            ))}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="text-sm font-medium mb-2">Próximos pasos recomendados</h3>
          <ul className="space-y-1">
            {nextSteps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-blue-500 mt-0.5" />
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={onScheduleConsultation}>
          Programar consulta
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
