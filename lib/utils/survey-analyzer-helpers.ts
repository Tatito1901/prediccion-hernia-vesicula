import { Patient, PatientSurveyData, SurveyAnswer } from "@/lib/types"
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
 *
 * @param patient - Datos del paciente
 * @param survey - Datos de la encuesta del paciente (puede ser null)
 * @returns Puntaje de conversión entre 0-100. Retorna 0 si no hay datos de encuesta.
 *          El valor por defecto de 0 (en vez de 50) indica explícitamente que no hay información suficiente.
 */
export function calculateConversionScore(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers || survey.answers.length === 0) {
    // Retornar 0 en vez de valor arbitrario cuando no hay datos
    return 0
  }

  let score = 0
  let factorCount = 0

  // Analizar respuestas de la encuesta
  survey.answers.forEach((answer: SurveyAnswer) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''

    // Factor: Severidad de síntomas (peso: 25 puntos)
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

    // Factor: Impacto en actividades diarias (peso: 25 puntos)
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

    // Factor: Tiempo con síntomas (peso: 20 puntos)
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

    // Factor: Tratamientos previos (peso: 20 puntos)
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
  const normalizedScore = maxPossibleScore > 0
    ? Math.min(100, Math.round((score / maxPossibleScore) * 100))
    : 0; // Cambio: retornar 0 en vez de 50 arbitrario

  // Validar que el resultado sea un número válido
  if (!Number.isFinite(normalizedScore) || Number.isNaN(normalizedScore)) {
    console.warn('[calculateConversionScore] Resultado inválido, retornando 0', { score, maxPossibleScore });
    return 0;
  }

  return normalizedScore;
}

/**
 * Genera insights basados en el análisis del paciente y encuesta
 *
 * @param patient - Datos del paciente
 * @param survey - Datos de la encuesta del paciente (puede ser null)
 * @returns Array de insights con recomendaciones accionables. Retorna array vacío si no hay datos.
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
  const severityAnswer = survey.answers.find((a: SurveyAnswer) =>
    a.question?.text?.toLowerCase().includes('severidad')
  )
  const impactAnswer = survey.answers.find((a: SurveyAnswer) =>
    a.question?.text?.toLowerCase().includes('actividad')
  )
  const durationAnswer = survey.answers.find((a: SurveyAnswer) =>
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
 *
 * **IMPORTANTE**: Esta función retorna 0 (en vez de 0.3) cuando no hay datos de encuesta.
 * Un valor de 0 indica explícitamente que no hay información suficiente para hacer una predicción.
 *
 * @param patient - Datos del paciente
 * @param survey - Datos de la encuesta del paciente (puede ser null)
 * @returns Probabilidad entre 0-1 (0% a 100%). Retorna 0 si no hay datos de encuesta.
 *          La función aplica una fórmula de regresión ajustada cuando hay pocos factores.
 */
export function calculateSurgeryProbability(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers || survey.answers.length === 0) {
    // Sin datos de encuesta, no podemos hacer predicción confiable
    console.warn('[calculateSurgeryProbability] Sin datos de encuesta para paciente', patient.id);
    return 0;
  }

  // Constantes de probabilidad base
  const BASE_PROBABILITY = 0.3; // 30% probabilidad base sin factores adicionales
  const MIN_FACTORS_FOR_HIGH_CONFIDENCE = 2; // Mínimo de factores para alta confianza

  let probability = BASE_PROBABILITY;
  let factorWeight = 0;

  // Analizar cada respuesta
  survey.answers.forEach((answer: SurveyAnswer) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''

    // Factor: Severidad (peso alto: +25%)
    if (questionText.includes('severidad') || questionText.includes('dolor')) {
      if (answerText.includes('severo') || answerText.includes('muy')) {
        probability += 0.25
        factorWeight += 1
      } else if (answerText.includes('moderado')) {
        probability += 0.15
        factorWeight += 0.5
      }
    }

    // Factor: Impacto funcional (peso alto: +20%)
    if (questionText.includes('actividad') || questionText.includes('diaria')) {
      if (answerText.includes('mucho') || answerText.includes('completamente')) {
        probability += 0.2
        factorWeight += 1
      } else if (answerText.includes('moderado')) {
        probability += 0.1
        factorWeight += 0.5
      }
    }

    // Factor: Falla de tratamiento conservador (peso medio: +15%)
    if (questionText.includes('tratamiento') || questionText.includes('medicamento')) {
      if (answerText.includes('no funciona') || answerText.includes('sin mejora')) {
        probability += 0.15
        factorWeight += 0.7
      }
    }

    // Factor: Duración de síntomas (peso medio: +10%)
    if (questionText.includes('tiempo') || questionText.includes('duración')) {
      if (answerText.includes('año') || answerText.includes('mucho')) {
        probability += 0.1
        factorWeight += 0.5
      }
    }
  })

  // Ajustar por edad del paciente (validación añadida)
  if (patient.edad && Number.isFinite(patient.edad)) {
    if (patient.edad >= 40 && patient.edad <= 65) {
      probability += 0.05 // Edad óptima para cirugía (+5%)
    } else if (patient.edad > 70) {
      probability -= 0.1 // Mayor riesgo quirúrgico (-10%)
    }
  }

  // Aplicar fórmula de regresión si hay pocos factores de decisión
  // Esto reduce la confianza cuando hay datos insuficientes
  if (factorWeight < MIN_FACTORS_FOR_HIGH_CONFIDENCE) {
    // Factor de confianza: 0.7 (70% del valor) + ajuste base
    const CONFIDENCE_FACTOR = 0.7;
    const LOW_CONFIDENCE_ADJUSTMENT = BASE_PROBABILITY * 0.3; // 9% adicional
    probability = probability * CONFIDENCE_FACTOR + LOW_CONFIDENCE_ADJUSTMENT;
  }

  // Normalizar probabilidad (0-1)
  probability = Math.max(0, Math.min(1, probability));

  // Validación crítica: verificar que el resultado sea un número válido
  if (!Number.isFinite(probability) || Number.isNaN(probability)) {
    console.error('[calculateSurgeryProbability] Resultado inválido detectado', {
      patient_id: patient.id,
      probability,
      factorWeight,
      patient_edad: patient.edad
    });
    // Retornar 0 en caso de cálculo inválido (no hay predicción confiable)
    return 0;
  }

  return probability
}

/**
 * Calcula la relación beneficio/riesgo para la decisión quirúrgica
 *
 * @param patient - Datos del paciente
 * @param survey - Datos de la encuesta del paciente (puede ser null)
 * @returns Ratio beneficio/riesgo. Valores > 1 indican que los beneficios superan los riesgos.
 *          Retorna 1 (neutral) si no hay datos de encuesta.
 *          Valores típicos: 0.1 (muy riesgoso) a 10 (muy beneficioso).
 */
export function calculateBenefitRiskRatio(
  patient: Patient,
  survey: PatientSurveyData | null
): number {
  if (!survey || !survey.answers) {
    console.warn('[calculateBenefitRiskRatio] Sin datos de encuesta, retornando ratio neutral');
    return 1; // Ratio neutral sin datos
  }

  let benefitScore = 0;
  let riskScore = 1; // Score de riesgo base (evita división por cero)

  // Calcular beneficios potenciales
  survey.answers.forEach((answer: SurveyAnswer) => {
    const questionText = answer.question?.text?.toLowerCase() || ''
    const answerText = answer.answer_text?.toLowerCase() || ''
    
    // Beneficios aumentan con severidad de síntomas (peso: +3)
    if ((questionText.includes('severidad') || questionText.includes('dolor')) &&
        (answerText.includes('severo') || answerText.includes('mucho'))) {
      benefitScore += 3
    }

    // Beneficios aumentan con impacto funcional (peso: +3)
    if (questionText.includes('actividad') && answerText.includes('mucho')) {
      benefitScore += 3
    }

    // Riesgos aumentan con comorbilidades (peso: +0.5 por condición)
    if (questionText.includes('condicion') || questionText.includes('enfermedad')) {
      // Validar que answerText exista antes de split
      if (answerText && answerText.length > 0) {
        const conditions = answerText.split(',').length;
        riskScore += conditions * 0.5;
      }
    }
  })

  // Ajustar riesgo por edad (validación añadida)
  if (patient.edad && Number.isFinite(patient.edad)) {
    if (patient.edad > 80) {
      riskScore += 2; // Mayor riesgo para > 80 años
    } else if (patient.edad > 70) {
      riskScore += 1; // Riesgo moderado para > 70 años
    }
  }

  // Calcular ratio con validación
  const ratio = benefitScore / Math.max(1, riskScore);

  // Validación crítica: verificar que el resultado sea un número válido
  if (!Number.isFinite(ratio) || Number.isNaN(ratio)) {
    console.error('[calculateBenefitRiskRatio] Resultado inválido detectado', {
      patient_id: patient.id,
      benefitScore,
      riskScore,
      ratio
    });
    // Retornar ratio neutral en caso de error
    return 1;
  }

  // Retornar ratio con límite mínimo de 0.1 (muy riesgoso)
  return Math.max(0.1, ratio);
}
