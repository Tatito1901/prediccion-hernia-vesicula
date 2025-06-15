import type { PatientData, PatientSurveyData } from "@/app/dashboard/data-model"
import type { ConversionInsight, RecommendationCategory } from "@/components/surveys/survey-results-analyzer"
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Lightbulb,
  Stethoscope,
  Calendar,
  User,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
} from "lucide-react"

/**
 * Calculate conversion score based on patient survey data
 */
export function calculateConversionScore(patient: PatientData): number {
  if (!patient?.encuesta) return 50 // Default score if no survey data

  const survey = patient.encuesta
  let score = 50 // Base score

  // Impact of pain intensity (0-10)
  if (survey.intensidadDolorActual) {
    score += (survey.intensidadDolorActual - 5) * 3 // +/- 15 points based on pain (0-10)
  }

  // Impact of symptom severity
  if (survey.severidadSintomasActuales === "severa") score += 10
  if (survey.severidadSintomasActuales === "moderada") score += 5
  if (survey.severidadSintomasActuales === "leve") score -= 5

  // Impact of symptom duration
  if (survey.desdeCuandoSintomaPrincipal === "mas_6_meses") score += 8
  if (survey.desdeCuandoSintomaPrincipal === "1_6_meses") score += 4
  if (survey.desdeCuandoSintomaPrincipal === "menos_2_semanas") score -= 8

  // Impact of daily life interference
  if (survey.afectacionActividadesDiarias === "mucho") score += 10
  if (survey.afectacionActividadesDiarias === "moderadamente") score += 5
  if (survey.afectacionActividadesDiarias === "un_poco") score -= 5

  // Impact of timeframe expectations
  if (survey.plazoResolucionIdeal === "urgente") score += 8
  if (survey.plazoResolucionIdeal === "proximo_mes") score += 5
  if (survey.plazoResolucionIdeal === "2_3_meses") score += 2
  if (survey.plazoResolucionIdeal === "sin_prisa") score -= 5

  // Insurance factor
  if (survey.seguroMedico && survey.seguroMedico !== "ninguno") score += 5

  // Decision timeframe
  if (survey.tiempoTomaDecision === "misma_consulta_dias") score += 5
  if (survey.tiempoTomaDecision === "dias") score += 3
  if (survey.tiempoTomaDecision === "depende_complejidad") score -= 5

  // Clamp score between 0-100
  return Math.max(0, Math.min(100, score))
}

/**
 * Generate insights based on patient survey data
 */
export function generateInsights(patient: PatientData): ConversionInsight[] {
  if (!patient?.encuesta) return []

  const insights: ConversionInsight[] = []
  const survey = patient.encuesta

  // Pain intensity insight
  if (survey.intensidadDolorActual >= 7) {
    insights.push({
      id: "high-pain",
      title: "Dolor intenso",
      description: `El paciente reporta un nivel de dolor ${survey.intensidadDolorActual}/10, lo que indica una necesidad urgente de intervención.`,
      impact: "high",
      actionable: true,
      recommendation: "Enfatizar el alivio inmediato del dolor que proporcionará la cirugía",
      icon: AlertTriangle,
    })
  }

  // Symptom duration insight
  if (survey.desdeCuandoSintomaPrincipal === "mas_6_meses") {
    insights.push({
      id: "long-term-suffering",
      title: "Síntomas de larga duración",
      description: "El paciente ha estado experimentando síntomas durante más de 6 meses.",
      impact: "medium",
      actionable: true,
      recommendation: "Destacar que la cirugía ofrece una solución definitiva a un problema crónico",
      icon: Clock,
    })
  }

  // Daily activities insight
  if (survey.afectacionActividadesDiarias === "mucho") {
    insights.push({
      id: "high-impact-daily-life",
      title: "Alta afectación de calidad de vida",
      description: "El paciente reporta que los síntomas afectan significativamente sus actividades diarias.",
      impact: "high",
      actionable: true,
      recommendation: "Enfatizar recuperación de funcionalidad y retorno a actividades normales",
      icon: ThumbsDown,
    })
  }

  // Decision timeframe insight
  if (survey.tiempoTomaDecision === "misma_consulta_dias" || survey.tiempoTomaDecision === "dias") {
    insights.push({
      id: "quick-decision-maker",
      title: "Tomador de decisiones rápido",
      description: "El paciente indica que tomará una decisión en menos de una semana.",
      impact: "medium",
      actionable: true,
      recommendation: "Proporcionar toda la información necesaria y facilitar el proceso de programación",
      icon: ThumbsUp,
    })
  } else if (survey.tiempoTomaDecision === "depende_complejidad") {
    insights.push({
      id: "slow-decision-maker",
      title: "Precaución en la toma de decisiones",
      description: "El paciente necesitará más de un mes para tomar una decisión.",
      impact: "medium",
      actionable: true,
      recommendation: "Enfocarse en educar y programar seguimientos regulares",
      icon: Clock,
    })
  }

  // Insurance insight
  if (survey.seguroMedico && survey.seguroMedico !== "ninguno") {
    insights.push({
      id: "has-insurance",
      title: "Cobertura de seguro",
      description: `El paciente cuenta con seguro médico (${survey.seguroMedico}).`,
      impact: "medium",
      actionable: true,
      recommendation: "Revisar cobertura específica y proporcionar estimación de costos",
      icon: CheckCircle,
    })
  } else {
    insights.push({
      id: "no-insurance",
      title: "Sin seguro médico",
      description: "El paciente no cuenta con seguro médico.",
      impact: "medium",
      actionable: true,
      recommendation: "Discutir opciones de pago y posibles descuentos o planes de pago",
      icon: AlertTriangle,
    })
  }

  // Add more insights as needed...
  
  return insights
}

/**
 * Generate recommendation categories based on patient data
 */
export function generateRecommendationCategories(
  patient: PatientData,
  surgeryProbability: number
): RecommendationCategory[] {
  if (!patient?.encuesta) return []

  const categories: RecommendationCategory[] = []
  const survey = patient.encuesta

  // Clinical recommendations
  categories.push({
    id: "clinical",
    title: "Recomendaciones Clínicas",
    description: "Basadas en la condición médica del paciente",
    icon: Stethoscope,
    recommendations: [
      surgeryProbability > 0.7
        ? "Programar cirugía lo antes posible"
        : "Evaluar opciones quirúrgicas versus tratamientos conservadores",
      survey.intensidadDolorActual >= 7
        ? "Revisar plan de manejo del dolor pre y post operatorio"
        : "Discutir estrategias de manejo del dolor",
      "Realizar pruebas pre-operatorias completas",
    ],
  })

  // Educational recommendations
  categories.push({
    id: "education",
    title: "Educación del Paciente",
    description: "Información para apoyar la toma de decisiones",
    icon: Lightbulb,
    recommendations: [
      "Proporcionar material educativo sobre el procedimiento",
      "Explicar claramente riesgos y beneficios",
      "Compartir testimonios de pacientes similares",
      typeof survey.mayorPreocupacionCirugia === 'string' 
        ? `Abordar específicamente: ${survey.mayorPreocupacionCirugia}`
        : "Abordar preocupaciones específicas del paciente",
    ],
  })

  // Follow-up recommendations
  categories.push({
    id: "followup",
    title: "Plan de Seguimiento",
    description: "Próximos pasos y monitorización",
    icon: Calendar,
    recommendations: [
      surgeryProbability > 0.7
        ? "Programar consulta prequirúrgica"
        : "Programar seguimiento en 2-4 semanas",
      "Establecer plan de comunicación claro",
      "Definir métricas de éxito post-tratamiento",
    ],
  })

  // Administrative recommendations
  categories.push({
    id: "administrative",
    title: "Aspectos Administrativos",
    description: "Gestión de seguro y documentación",
    icon: FileText,
    recommendations: [
      survey.seguroMedico && survey.seguroMedico !== "ninguno"
        ? `Verificar cobertura de ${survey.seguroMedico} para el procedimiento`
        : "Discutir opciones de financiamiento",
      "Preparar documentación necesaria para autorización",
      "Revisar disponibilidad de fechas para procedimiento",
    ],
  })

  // Support recommendations
  categories.push({
    id: "support",
    title: "Red de Apoyo",
    description: "Recursos para el proceso de recuperación",
    icon: User,
    recommendations: [
      "Evaluar la red de apoyo familiar del paciente",
      "Proporcionar recursos para cuidados post-operatorios",
      "Conectar con grupos de apoyo si es necesario",
    ],
  })

  return categories
}
