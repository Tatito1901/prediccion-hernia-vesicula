// Simple sentiment analysis utility for patient comments
// In a production environment, you would use a more sophisticated NLP model

type SentimentResult = {
  score: number // -1 to 1 (negative to positive)
  label: "negative" | "neutral" | "positive"
  confidence: number
  keywords: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
}

// Lists of sentiment-related keywords
const positiveKeywords = [
  "alivio",
  "mejor",
  "esperanza",
  "confianza",
  "seguro",
  "optimista",
  "excelente",
  "bueno",
  "recomendado",
  "profesional",
  "calidad",
  "eficaz",
  "rápido",
  "satisfecho",
  "contento",
  "feliz",
  "agradecido",
  "tranquilo",
  "favorable",
  "positivo",
  "éxito",
  "recuperación",
  "solución",
  "mejoría",
  "progreso",
  "avance",
  "beneficio",
]

const negativeKeywords = [
  "miedo",
  "dolor",
  "preocupación",
  "ansiedad",
  "duda",
  "riesgo",
  "complicación",
  "problema",
  "difícil",
  "costoso",
  "caro",
  "peligroso",
  "inseguro",
  "malo",
  "terrible",
  "horrible",
  "insatisfecho",
  "desconfianza",
  "negativo",
  "fracaso",
  "error",
  "muerte",
  "incapacidad",
  "invalidez",
  "sufrimiento",
  "trauma",
]

const medicalKeywords = [
  "cirugía",
  "operación",
  "médico",
  "doctor",
  "hospital",
  "clínica",
  "tratamiento",
  "recuperación",
  "anestesia",
  "medicamento",
  "diagnóstico",
  "síntoma",
  "herida",
  "cicatriz",
  "infección",
  "sangrado",
  "dolor",
  "inflamación",
  "fiebre",
]

/**
 * Analyzes the sentiment of a text
 * @param text The text to analyze
 * @returns Sentiment analysis result
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim() === "") {
    return {
      score: 0,
      label: "neutral",
      confidence: 1,
      keywords: { positive: [], negative: [], neutral: [] },
    }
  }

  // Normalize text: lowercase and remove special characters
  const normalizedText = text.toLowerCase().replace(/[^\w\s]/gi, "")
  const words = normalizedText.split(/\s+/)

  // Count positive and negative words
  let positiveCount = 0
  let negativeCount = 0

  const foundPositive: string[] = []
  const foundNegative: string[] = []
  const foundNeutral: string[] = []

  // Check for positive and negative keywords
  words.forEach((word) => {
    if (positiveKeywords.includes(word)) {
      positiveCount++
      if (!foundPositive.includes(word)) foundPositive.push(word)
    } else if (negativeKeywords.includes(word)) {
      negativeCount++
      if (!foundNegative.includes(word)) foundNegative.push(word)
    } else if (medicalKeywords.includes(word)) {
      if (!foundNeutral.includes(word)) foundNeutral.push(word)
    }
  })

  // Calculate sentiment score (-1 to 1)
  const totalSentimentWords = positiveCount + negativeCount
  let score = 0

  if (totalSentimentWords > 0) {
    score = (positiveCount - negativeCount) / totalSentimentWords
  }

  // Determine sentiment label
  let label: "negative" | "neutral" | "positive" = "neutral"
  if (score > 0.1) label = "positive"
  else if (score < -0.1) label = "negative"

  // Calculate confidence (simplified)
  const confidence = Math.min(1, Math.abs(score) + 0.3)

  return {
    score,
    label,
    confidence,
    keywords: {
      positive: foundPositive,
      negative: foundNegative,
      neutral: foundNeutral,
    },
  }
}

/**
 * Analyzes patient comments for surgery-related sentiments
 * @param comments The patient's comments
 * @returns Analysis with surgery-specific insights
 */
export function analyzeSurgeryComments(comments: string): {
  sentiment: SentimentResult
  surgeryReadiness: "high" | "medium" | "low"
  keyConcerns: string[]
  positiveFactors: string[]
  persuasiveApproach: string
} {
  const sentiment = analyzeSentiment(comments)

  // Determine surgery readiness based on sentiment
  let surgeryReadiness: "high" | "medium" | "low" = "medium"
  if (sentiment.score > 0.3) surgeryReadiness = "high"
  else if (sentiment.score < -0.3) surgeryReadiness = "low"

  // Extract key concerns from negative keywords
  const keyConcerns = sentiment.keywords.negative.map((word) => {
    switch (word) {
      case "miedo":
        return "Miedo al procedimiento"
      case "dolor":
        return "Preocupación por el dolor"
      case "riesgo":
        return "Inquietud sobre riesgos"
      case "complicación":
        return "Temor a complicaciones"
      case "costoso":
      case "caro":
        return "Preocupación por costos"
      default:
        return word.charAt(0).toUpperCase() + word.slice(1)
    }
  })

  // Extract positive factors
  const positiveFactors = sentiment.keywords.positive.map((word) => {
    switch (word) {
      case "alivio":
        return "Deseo de alivio"
      case "confianza":
        return "Confianza en el procedimiento"
      case "esperanza":
        return "Esperanza de mejoría"
      case "solución":
        return "Búsqueda de solución definitiva"
      default:
        return word.charAt(0).toUpperCase() + word.slice(1)
    }
  })

  // Determine persuasive approach based on sentiment
  let persuasiveApproach = ""
  if (surgeryReadiness === "high") {
    persuasiveApproach = "Enfatizar beneficios y resultados positivos, ofrecer fecha tentativa"
  } else if (surgeryReadiness === "medium") {
    persuasiveApproach = "Abordar preocupaciones específicas, proporcionar más información y testimonios"
  } else {
    persuasiveApproach = "Enfoque educativo, desmitificar temores, ofrecer alternativas y tiempo para decidir"
  }

  return {
    sentiment,
    surgeryReadiness,
    keyConcerns,
    positiveFactors,
    persuasiveApproach,
  }
}

// Helper function to generate persuasive messages based on patient data
export function generatePersuasiveMessages(patientData: any): string[] {
  const messages: string[] = []
  const survey = patientData.encuesta

  if (!survey) return messages

  // Pain-based messages
  if (survey.intensidadDolor >= 7) {
    messages.push(
      `El nivel de dolor actual (${survey.intensidadDolor}/10) podría aliviarse significativamente con la intervención quirúrgica.`,
    )
  }

  // Duration-based messages
  if (survey.duracionSintomas === "mas_1_anio" || survey.duracionSintomas === "6_12_meses") {
    messages.push(
      "Los síntomas de larga duración raramente mejoran sin intervención, la cirugía ofrece una solución definitiva.",
    )
  }

  // Severity-based messages
  if (survey.severidadCondicion === "severa") {
    messages.push("La condición severa actual presenta riesgos de complicaciones si no se trata quirúrgicamente.")
  }

  // Functional limitation messages
  if (survey.limitacionFuncional === "severa" || survey.limitacionFuncional === "moderada") {
    messages.push(
      "La cirugía podría restaurar su capacidad funcional y mejorar significativamente su calidad de vida diaria.",
    )
  }

  // Address common concerns
  if (survey.preocupacionesCirugia?.includes("miedo_procedimiento")) {
    messages.push(
      "Las técnicas quirúrgicas modernas han reducido significativamente los riesgos y mejorado la experiencia del paciente.",
    )
  }

  if (survey.preocupacionesCirugia?.includes("tiempo_recuperacion")) {
    messages.push(
      "Nuestro programa de recuperación acelerada permite a la mayoría de los pacientes retomar sus actividades normales en menos tiempo.",
    )
  }

  // Add general persuasive message if we have few specific ones
  if (messages.length < 2) {
    messages.push(
      "La intervención quirúrgica ofrece la mejor oportunidad para resolver definitivamente su condición y mejorar su calidad de vida.",
    )
  }

  return messages
}
