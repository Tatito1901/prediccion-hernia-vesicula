import { Patient, PatientSurveyData } from "@/lib/types"
import { 
  Activity, 
  AlertCircle, 
  Heart, 
  Shield, 
  Stethoscope, 
  DollarSign,
  Lightbulb,
  Zap,
  Calendar,
  MessageCircle,
  FileText
} from "lucide-react"

export interface ConversionInsight {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  actionable: boolean
  recommendation: string
  icon: React.ElementType
}

export interface RecommendationCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  recommendations: string[]
}

/**
 * Calcula el puntaje de conversión basado en datos del paciente y encuesta
 */
export function calculateConversionScore(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers || survey.answers.length === 0) {
    return 0
  }

  let score = 0
  let factorCount = 0

  // Analizar respuestas de la encuesta
  survey.answers.forEach((answer: any) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''
    
    // Factor: Severidad de síntomas
    if (questionText.includes('severidad') || questionText.includes('dolor')) {
      factorCount++
      if (answerText.includes('severo') || answerText.includes('muy')) {
        score += 25
      } else if (answerText.includes('moderado')) {
        score += 15
      } else {
        score += 5
      }
    }
    
    // Factor: Impacto en actividades diarias
    if (questionText.includes('actividad') || questionText.includes('diaria')) {
      factorCount++
      if (answerText.includes('mucho') || answerText.includes('completamente')) {
        score += 25
      } else if (answerText.includes('moderado')) {
        score += 15
      } else {
        score += 5
      }
    }
    
    // Factor: Tiempo con síntomas
    if (questionText.includes('tiempo') || questionText.includes('duración')) {
      factorCount++
      if (answerText.includes('año') || answerText.includes('mucho')) {
        score += 20
      } else if (answerText.includes('meses')) {
        score += 10
      } else {
        score += 5
      }
    }
    
    // Factor: Tratamientos previos
    if (questionText.includes('tratamiento') || questionText.includes('medicamento')) {
      factorCount++
      if (answerText.includes('varios') || answerText.includes('múltiples')) {
        score += 20
      } else if (answerText.includes('algunos')) {
        score += 10
      }
    }
  })

  // Normalizar el score (0-100)
  const maxPossibleScore = factorCount * 25
  return maxPossibleScore > 0 ? Math.min(100, Math.round((score / maxPossibleScore) * 100)) : 50
}

/**
 * Genera insights basados en el análisis del paciente y encuesta
 */
export function generateInsights(
  patient: Patient,
  survey: PatientSurveyData | null
): ConversionInsight[] {
  const insights: ConversionInsight[] = []
  
  if (!survey || !survey.answers) {
    return insights
  }

  // Analizar patrones en las respuestas
  const severityAnswer = survey.answers.find((a: any) => 
    a.question?.text?.toLowerCase().includes('severidad')
  )
  const impactAnswer = survey.answers.find((a: any) => 
    a.question?.text?.toLowerCase().includes('actividad')
  )
  const durationAnswer = survey.answers.find((a: any) => 
    a.question?.text?.toLowerCase().includes('tiempo')
  )

  // Insight sobre severidad
  if (severityAnswer?.answer_text?.toLowerCase().includes('severo')) {
    insights.push({
      id: 'severity-high',
      title: 'Síntomas Severos Detectados',
      description: 'El paciente reporta síntomas severos que afectan significativamente su calidad de vida.',
      impact: 'high',
      actionable: true,
      recommendation: 'Considerar evaluación quirúrgica prioritaria.',
      icon: AlertCircle
    })
  }

  // Insight sobre impacto en actividades
  if (impactAnswer?.answer_text?.toLowerCase().includes('mucho')) {
    insights.push({
      id: 'impact-high',
      title: 'Alto Impacto en Actividades Diarias',
      description: 'Las actividades cotidianas del paciente están siendo gravemente afectadas.',
      impact: 'high',
      actionable: true,
      recommendation: 'La intervención quirúrgica podría restaurar la funcionalidad normal.',
      icon: Activity
    })
  }

  // Insight sobre duración de síntomas
  if (durationAnswer?.answer_text?.toLowerCase().includes('año')) {
    insights.push({
      id: 'chronic-condition',
      title: 'Condición Crónica',
      description: 'El paciente ha estado experimentando síntomas por un período prolongado.',
      impact: 'medium',
      actionable: true,
      recommendation: 'La cirugía podría ser más beneficiosa que continuar con tratamiento conservador.',
      icon: Heart
    })
  }

  // Insight sobre edad del paciente
  if (patient.edad && patient.edad > 50) {
    insights.push({
      id: 'age-factor',
      title: 'Factor de Edad',
      description: `Con ${patient.edad} años, el paciente está en un rango de edad donde la cirugía tiene buenos resultados.`,
      impact: 'medium',
      actionable: false,
      recommendation: 'Evaluar condiciones comórbidas antes de proceder.',
      icon: Shield
    })
  }

  // Si no hay insights específicos, agregar uno general
  if (insights.length === 0) {
    insights.push({
      id: 'general-assessment',
      title: 'Evaluación Inicial Completada',
      description: 'Se ha completado la evaluación inicial del paciente.',
      impact: 'low',
      actionable: true,
      recommendation: 'Proceder con evaluación clínica completa.',
      icon: Stethoscope
    })
  }

  return insights
}

/**
 * Genera categorías de recomendaciones basadas en el análisis
 */
export function generateRecommendationCategories(
  patient: Patient,
  survey: PatientSurveyData | null,
  surgeryProbability: number
): RecommendationCategory[] {
  const categories: RecommendationCategory[] = []

  // Recomendaciones médicas
  const medicalRecs: string[] = []
  if (surgeryProbability > 0.7) {
    medicalRecs.push('Programar consulta con cirujano especialista')
    medicalRecs.push('Realizar estudios preoperatorios completos')
    medicalRecs.push('Evaluar estado cardiovascular antes de la cirugía')
  } else if (surgeryProbability > 0.4) {
    medicalRecs.push('Considerar opciones de tratamiento conservador inicialmente')
    medicalRecs.push('Reevaluar en 3-6 meses si los síntomas persisten')
    medicalRecs.push('Monitorear progresión de síntomas')
  } else {
    medicalRecs.push('Continuar con manejo conservador')
    medicalRecs.push('Implementar cambios en estilo de vida')
    medicalRecs.push('Seguimiento periódico cada 6 meses')
  }

  categories.push({
    id: 'medical',
    title: 'Recomendaciones Médicas',
    description: 'Acciones médicas sugeridas basadas en el análisis.',
    icon: Stethoscope,
    recommendations: medicalRecs
  })

  // Recomendaciones de seguimiento
  const followUpRecs: string[] = []
  if (surgeryProbability > 0.6) {
    followUpRecs.push('Llamada de seguimiento en 48-72 horas')
    followUpRecs.push('Enviar información educativa sobre el procedimiento')
    followUpRecs.push('Coordinar con equipo de anestesiología si procede')
  } else {
    followUpRecs.push('Seguimiento telefónico en 1 semana')
    followUpRecs.push('Programar cita de control en 1 mes')
    followUpRecs.push('Monitorear adherencia al tratamiento conservador')
  }

  categories.push({
    id: 'followup',
    title: 'Plan de Seguimiento',
    description: 'Estrategia de seguimiento y comunicación con el paciente.',
    icon: Calendar,
    recommendations: followUpRecs
  })

  // Recomendaciones de educación
  const educationRecs: string[] = [
    'Proporcionar material educativo sobre la condición',
    'Explicar opciones de tratamiento disponibles',
    'Discutir expectativas realistas de recuperación'
  ]

  if (surgeryProbability > 0.5) {
    educationRecs.push('Informar sobre el proceso quirúrgico paso a paso')
    educationRecs.push('Compartir testimonios de pacientes similares')
  }

  categories.push({
    id: 'education',
    title: 'Educación del Paciente',
    description: 'Información y recursos educativos para el paciente.',
    icon: Lightbulb,
    recommendations: educationRecs
  })

  // Recomendaciones de preparación
  if (surgeryProbability > 0.6) {
    const prepRecs = [
      'Optimizar condiciones médicas preexistentes',
      'Ajustar medicación actual si es necesario',
      'Planificar apoyo postoperatorio en casa',
      'Preparación psicológica para la cirugía'
    ]
    
    categories.push({
      id: 'preparation',
      title: 'Preparación Preoperatoria',
      description: 'Pasos para preparar al paciente para la cirugía.',
      icon: Shield,
      recommendations: prepRecs
    })
  }

  return categories
}

/**
 * Calcula la probabilidad de cirugía basada en múltiples factores
 */
export function calculateSurgeryProbability(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers || survey.answers.length === 0) {
    return 0.3 // Probabilidad base sin datos
  }

  let probability = 0.3 // Probabilidad base
  let factorWeight = 0

  // Analizar cada respuesta
  survey.answers.forEach((answer: any) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''
    
    // Factor: Severidad (peso alto)
    if (questionText.includes('severidad') || questionText.includes('dolor')) {
      if (answerText.includes('severo') || answerText.includes('muy')) {
        probability += 0.25
        factorWeight += 1
      } else if (answerText.includes('moderado')) {
        probability += 0.15
        factorWeight += 0.5
      }
    }
    
    // Factor: Impacto funcional (peso alto)
    if (questionText.includes('actividad') || questionText.includes('diaria')) {
      if (answerText.includes('mucho') || answerText.includes('completamente')) {
        probability += 0.2
        factorWeight += 1
      } else if (answerText.includes('moderado')) {
        probability += 0.1
        factorWeight += 0.5
      }
    }
    
    // Factor: Falla de tratamiento conservador (peso medio)
    if (questionText.includes('tratamiento') || questionText.includes('medicamento')) {
      if (answerText.includes('no funciona') || answerText.includes('sin mejora')) {
        probability += 0.15
        factorWeight += 0.7
      }
    }
    
    // Factor: Duración de síntomas (peso medio)
    if (questionText.includes('tiempo') || questionText.includes('duración')) {
      if (answerText.includes('año') || answerText.includes('mucho')) {
        probability += 0.1
        factorWeight += 0.5
      }
    }
  })

  // Ajustar por edad del paciente
  if (patient.edad) {
    if (patient.edad >= 40 && patient.edad <= 65) {
      probability += 0.05 // Edad óptima para cirugía
    } else if (patient.edad > 70) {
      probability -= 0.1 // Mayor riesgo quirúrgico
    }
  }

  // Normalizar probabilidad (0-1)
  probability = Math.max(0, Math.min(1, probability))
  
  // Si hay pocos factores evaluados, reducir confianza
  if (factorWeight < 2) {
    probability = probability * 0.7 + 0.3 * 0.3 // Regresión hacia la media
  }

  return probability
}

/**
 * Calcula la relación beneficio/riesgo
 */
export function calculateBenefitRiskRatio(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers) {
    return 1 // Ratio neutral sin datos
  }

  let benefitScore = 0
  let riskScore = 1 // Base risk

  // Calcular beneficios potenciales
  survey.answers.forEach((answer: any) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''
    
    // Beneficios aumentan con severidad de síntomas
    if ((questionText.includes('severidad') || questionText.includes('dolor')) &&
        (answerText.includes('severo') || answerText.includes('mucho'))) {
      benefitScore += 3
    }
    
    // Beneficios aumentan con impacto funcional
    if (questionText.includes('actividad') && answerText.includes('mucho')) {
      benefitScore += 3
    }
    
    // Riesgos aumentan con comorbilidades
    if (questionText.includes('condicion') || questionText.includes('enfermedad')) {
      const conditions = answerText.split(',').length
      riskScore += conditions * 0.5
    }
  })

  // Ajustar riesgo por edad
  if (patient.edad) {
    if (patient.edad > 70) {
      riskScore += 1
    } else if (patient.edad > 80) {
      riskScore += 2
    }
  }

  // Calcular ratio
  return Math.max(0.1, benefitScore / Math.max(1, riskScore))
}
