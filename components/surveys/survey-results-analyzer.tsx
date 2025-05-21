"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { addDays } from "date-fns"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts"
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  Share2,
  Printer,
  ChevronRight,
  FileText,
  Lightbulb,
  Stethoscope,
  Calendar,
  User,
  Activity,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Heart,
  Shield,
  DollarSign,
  Award,
  Zap,
  CheckSquare,
  PhoneIcon,
} from "lucide-react"
import { toast } from "sonner"
import { surgeryPredictionModel } from "@/src/lib/prediction-model"
import { analyzeSurgeryComments, generatePersuasiveMessages } from "@/src/lib/sentiment-analysis"
import type { PatientData, FollowUp } from "@/app/dashboard/data-model"
import { useIsMobile } from "@/src/hooks/use-is-mobile"
import { useAppContext } from "@/src/lib/context/app-context"

// Define the structure for conversion insights
interface ConversionInsight {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  actionable: boolean
  recommendation: string
  icon: React.ElementType
}

// Define the structure for recommendation categories
interface RecommendationCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  recommendations: string[]
}

// Define the structure for persuasive points
interface PersuasivePoint {
  id: string
  title: string
  description: string
  icon: React.ElementType
  category: "clinical" | "quality" | "emotional" | "financial" | "social"
  strength: "high" | "medium" | "low"
}

interface SurveyResultsAnalyzerProps {
  patientId: string | number
  patient?: PatientData
  onGeneratePDF?: () => void
  onShare?: () => void
}

export function SurveyResultsAnalyzer({ patientId, patient, onGeneratePDF, onShare }: SurveyResultsAnalyzerProps) {
  const router = useRouter()
  const { addFollowUp, updatePatient } = useAppContext()
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("overview")
  const [isLoading, setIsLoading] = useState(true)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [conversionScore, setConversionScore] = useState<number>(0)
  const [surgeryProbability, setSurgeryProbability] = useState<number>(0)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [insights, setInsights] = useState<ConversionInsight[]>([])
  const [recommendationCategories, setRecommendationCategories] = useState<RecommendationCategory[]>([])
  const [modelError, setModelError] = useState<string | null>(null)
  const [sentimentAnalysis, setSentimentAnalysis] = useState<any>(null)
  const [persuasivePoints, setPersuasivePoints] = useState<PersuasivePoint[]>([])
  const [persuasiveMessages, setPersuasiveMessages] = useState<string[]>([])
  const [benefitVsRiskRatio, setBenefitVsRiskRatio] = useState<number>(0)

  // Load patient data
  useEffect(() => {
    const loadPatientData = async () => {
      setIsLoading(true)
      try {
        // If patient data is provided directly, use it
        if (patient) {
          setPatientData(patient)
        } else {
          // In a real app, you would fetch the patient data from an API
          // For now, we'll simulate a delay and use mock data
          await new Promise((resolve) => setTimeout(resolve, 1000))

          // This would be replaced with actual API call
          // const response = await fetch(`/api/patients/${patientId}`)
          // const data = await response.json()
          // setPatientData(data)

          // For demo purposes, we'll just set the patient to null
          // This would be replaced with actual patient data in a real app
          setPatientData(null)
        }
      } catch (error) {
        console.error("Error loading patient data:", error)
        toast.error("Error loading patient data")
      } finally {
        setIsLoading(false)
      }
    }

    loadPatientData()
  }, [patientId, patient])

  // Generate analysis when patient data is available
  useEffect(() => {
    const analyzePatientData = async () => {
      if (!patientData) return

      try {
        setModelError(null)

        // Calculate surgery probability using the prediction model
        const probability = await surgeryPredictionModel.predictSurgeryProbability(patientData)
        setSurgeryProbability(probability)

        // Generate recommendations based on the patient data and probability
        const recs = surgeryPredictionModel.generateRecommendations(patientData, probability)
        setRecommendations(recs)

        // Calculate conversion score (0-100) based on various factors
        const score = calculateConversionScore(patientData)
        setConversionScore(score)

        // Generate insights based on survey responses
        const generatedInsights = generateInsights(patientData)
        setInsights(generatedInsights)

        // Generate recommendation categories
        const categories = generateRecommendationCategories(patientData, probability)
        setRecommendationCategories(categories)

        // Perform sentiment analysis on patient comments
        performSentimentAnalysis(patientData)

        // Generate persuasive points
        const points = generatePersuasivePoints(patientData)
        setPersuasivePoints(points)

        // Generate persuasive messages
        const messages = generatePersuasiveMessages(patientData)
        setPersuasiveMessages(messages)

        // Calculate benefit vs risk ratio
        const ratio = calculateBenefitVsRiskRatio(patientData)
        setBenefitVsRiskRatio(ratio)
      } catch (error) {
        console.error("Error analyzing patient data:", error)
        setModelError("No se pudo cargar el modelo de predicción. Usando valores predeterminados.")

        // Set default values for demo purposes
        setSurgeryProbability(0.65)
        setRecommendations([
          "Probabilidad media de cirugía (65%)",
          "Paciente indeciso, enfocarse en resolver sus principales preocupaciones",
          "Programar seguimiento en 1-2 semanas",
        ])

        // Calculate conversion score without the model
        const score = calculateConversionScore(patientData)
        setConversionScore(score)

        // Generate insights without the model
        const generatedInsights = generateInsights(patientData)
        setInsights(generatedInsights)

        // Generate recommendation categories with default probability
        const categories = generateRecommendationCategories(patientData, 0.65)
        setRecommendationCategories(categories)

        // Perform sentiment analysis on patient comments
        performSentimentAnalysis(patientData)

        // Generate persuasive points
        const points = generatePersuasivePoints(patientData)
        setPersuasivePoints(points)

        // Generate persuasive messages
        const messages = generatePersuasiveMessages(patientData)
        setPersuasiveMessages(messages)

        // Calculate benefit vs risk ratio
        const ratio = calculateBenefitVsRiskRatio(patientData)
        setBenefitVsRiskRatio(ratio)

        toast.error("Error al analizar los datos del paciente")
      }
    }

    if (patientData) {
      analyzePatientData()
    }
  }, [patientData])

  // Perform sentiment analysis on patient comments
  const performSentimentAnalysis = (patient: PatientData) => {
    const survey = patient.encuesta
    if (!survey) return

    // Combine all open-ended comments for analysis
    const comments = [
      survey.informacionAdicional || "",
      survey.detallesDiagnostico || "",
      // Add any other open-ended fields here
    ]
      .filter(Boolean)
      .join(" ")

    if (comments.trim() === "") {
      setSentimentAnalysis({
        sentiment: {
          score: 0,
          label: "neutral",
          confidence: 0,
          keywords: { positive: [], negative: [], neutral: [] },
        },
        surgeryReadiness: "medium",
        keyConcerns: [],
        positiveFactors: [],
        persuasiveApproach: "Proporcionar información balanceada y abordar preocupaciones generales",
      })
      return
    }

    // Analyze the comments
    const analysis = analyzeSurgeryComments(comments)
    setSentimentAnalysis(analysis)
  }

  // Calculate benefit vs risk ratio for surgery
  const calculateBenefitVsRiskRatio = (patient: PatientData): number => {
    const survey = patient.encuesta
    if (!survey) return 1.0 // Default neutral ratio

    let benefits = 1.0 // Base benefits
    let risks = 1.0 // Base risks

    // Calculate benefits based on survey responses
    if (survey.intensidadDolor >= 7) benefits += 0.5
    if (survey.severidadCondicion === "severa") benefits += 0.5
    if (survey.duracionSintomas === "mas_1_anio") benefits += 0.3
    if (survey.limitacionFuncional === "severa") benefits += 0.4

    // Calculate risks based on survey responses
    if (survey.edad > 70) risks += 0.3
    if (!survey.personaApoyo || survey.personaApoyo === "ninguno") risks += 0.2
    if (survey.preocupacionesCirugia?.includes("miedo_procedimiento")) risks += 0.1

    // Calculate ratio (benefits / risks)
    return Number.parseFloat((benefits / risks).toFixed(2))
  }

  // Generate persuasive points based on patient data
  const generatePersuasivePoints = (patient: PatientData): PersuasivePoint[] => {
    const points: PersuasivePoint[] = []
    const survey = patient.encuesta

    if (!survey) return points

    // Clinical points
    if (survey.intensidadDolor >= 7) {
      points.push({
        id: "pain-relief",
        title: "Alivio inmediato del dolor",
        description: `La cirugía ofrece una solución definitiva para su dolor intenso (${survey.intensidadDolor}/10).`,
        icon: Zap,
        category: "clinical",
        strength: "high",
      })
    }

    if (survey.severidadCondicion === "severa") {
      points.push({
        id: "prevent-complications",
        title: "Prevención de complicaciones",
        description: "La cirugía evita el empeoramiento de su condición y posibles complicaciones futuras.",
        icon: Shield,
        category: "clinical",
        strength: "high",
      })
    }

    if (survey.duracionSintomas === "mas_1_anio" || survey.duracionSintomas === "6_12_meses") {
      points.push({
        id: "long-term-solution",
        title: "Solución definitiva",
        description: "Después de meses de síntomas, la cirugía ofrece una solución permanente a su problema.",
        icon: CheckSquare,
        category: "clinical",
        strength: "medium",
      })
    }

    // Quality of life points
    if (survey.limitacionFuncional === "severa" || survey.limitacionFuncional === "moderada") {
      points.push({
        id: "improved-function",
        title: "Recuperación funcional",
        description:
          "La cirugía le permitirá recuperar su movilidad y realizar actividades cotidianas sin limitaciones.",
        icon: Activity,
        category: "quality",
        strength: "high",
      })
    }

    // Emotional points
    if (survey.preocupacionesCirugia?.includes("miedo_procedimiento")) {
      points.push({
        id: "peace-of-mind",
        title: "Tranquilidad emocional",
        description: "Nuestro equipo médico altamente capacitado garantiza un procedimiento seguro y controlado.",
        icon: Heart,
        category: "emotional",
        strength: "medium",
      })
    }

    // Financial points
    if (survey.seguroMedico !== "Ninguno") {
      points.push({
        id: "insurance-coverage",
        title: "Cobertura de seguro",
        description: "Su seguro médico cubre gran parte de los gastos asociados con este procedimiento.",
        icon: DollarSign,
        category: "financial",
        strength: "medium",
      })
    }

    // Social points
    if (survey.factoresImportantes?.includes("Recomendaciones positivas")) {
      points.push({
        id: "positive-experiences",
        title: "Experiencias positivas",
        description: "Muchos pacientes con su misma condición han tenido excelentes resultados con este procedimiento.",
        icon: Award,
        category: "social",
        strength: "medium",
      })
    }

    // Add general point if we have few specific ones
    if (points.length < 3) {
      points.push({
        id: "expert-recommendation",
        title: "Recomendación médica experta",
        description:
          "Basado en su caso específico, nuestros especialistas recomiendan este procedimiento como la mejor opción de tratamiento.",
        icon: Award,
        category: "clinical",
        strength: "high",
      })
    }

    // Sort by strength (high to low)
    return points.sort((a, b) => {
      const strengthOrder = { high: 3, medium: 2, low: 1 }
      return strengthOrder[b.strength] - strengthOrder[a.strength]
    })
  }

  // Calculate conversion score based on patient data
  const calculateConversionScore = (patient: PatientData): number => {
    let score = 50 // Base score

    const survey = patient.encuesta
    if (!survey) return score

    // Adjust score based on various factors

    // Factor 1: Urgency/Timeline
    if (survey.plazoDeseado === "Urgente") score += 15
    else if (survey.plazoDeseado === "30 días") score += 10
    else if (survey.plazoDeseado === "90 días") score += 5

    // Factor 2: Pain intensity
    if (survey.intensidadDolor >= 8) score += 15
    else if (survey.intensidadDolor >= 5) score += 10
    else if (survey.intensidadDolor >= 3) score += 5

    // Factor 3: Symptom duration
    if (survey.duracionSintomas === "más de 1 año") score += 10
    else if (survey.duracionSintomas === "6-12 meses") score += 8
    else if (survey.duracionSintomas === "3-6 meses") score += 5

    // Factor 4: Severity
    if (survey.severidadCondicion === "Severa") score += 15
    else if (survey.severidadCondicion === "Moderada") score += 8

    // Factor 5: Previous diagnosis
    if (survey.diagnosticoPrevio) score += 10

    // Factor 6: Functional limitation
    if (survey.afectacionDiaria === "Severa") score += 10
    else if (survey.afectacionDiaria === "Moderada") score += 5

    // Negative factors

    // Barrier 1: Concerns about surgery
    if (survey.preocupacionesCirugia?.includes("Miedo al procedimiento")) score -= 8
    if (survey.preocupacionesCirugia?.includes("Tiempo de recuperación")) score -= 5
    if (survey.preocupacionesCirugia?.includes("Ausencia laboral")) score -= 7
    if (survey.preocupacionesCirugia?.includes("Dudas sobre necesidad real")) score -= 10

    // Barrier 2: No support person
    if (!survey.personaApoyo || survey.personaApoyo === "ninguno") score -= 8

    // Barrier 3: Indecision
    if (survey.plazoDecision === "indeciso") score -= 10

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score))
  }

  // Generate insights based on survey responses
  const generateInsights = (patient: PatientData): ConversionInsight[] => {
    const insights: ConversionInsight[] = []
    const survey = patient.encuesta

    if (!survey) return insights

    // Insight 1: Pain and severity
    if (survey.intensidadDolor >= 7 && survey.severidadCondicion === "Severa") {
      insights.push({
        id: "pain-severity",
        title: "Alto nivel de dolor y severidad",
        description: `El paciente reporta dolor intenso (${survey.intensidadDolor}/10) y condición severa.`,
        impact: "high",
        actionable: true,
        recommendation:
          "Enfatizar el alivio inmediato del dolor que proporciona la cirugía y los riesgos de postergarla.",
        icon: Activity,
      })
    }

    // Insight 2: Time constraints
    if (
      survey.preocupacionesCirugia?.includes("Tiempo de recuperación") ||
      survey.preocupacionesCirugia?.includes("Ausencia laboral")
    ) {
      insights.push({
        id: "time-constraints",
        title: "Preocupación por tiempo de recuperación",
        description: "El paciente está preocupado por el tiempo de recuperación y/o ausencia laboral.",
        impact: "high",
        actionable: true,
        recommendation: "Destacar el programa de recuperación rápida y las opciones de cirugía mínimamente invasiva.",
        icon: Clock,
      })
    }

    // Insight 3: Fear of procedure
    if (survey.preocupacionesCirugia?.includes("Miedo al procedimiento")) {
      insights.push({
        id: "procedure-fear",
        title: "Miedo al procedimiento quirúrgico",
        description: "El paciente expresa miedo o ansiedad respecto al procedimiento quirúrgico.",
        impact: "high",
        actionable: true,
        recommendation:
          "Proporcionar información detallada sobre el procedimiento, opciones de anestesia y compartir testimonios de pacientes satisfechos.",
        icon: AlertTriangle,
      })
    }

    // Insight 4: Long symptom duration
    if (survey.duracionSintomas === "más de 1 año" || survey.duracionSintomas === "6-12 meses") {
      insights.push({
        id: "chronic-condition",
        title: "Condición crónica",
        description: "El paciente ha estado experimentando síntomas por más de 6 meses.",
        impact: "medium",
        actionable: true,
        recommendation:
          "Explicar cómo la cirugía puede resolver una condición crónica que no ha mejorado con el tiempo.",
        icon: Calendar,
      })
    }

    // Insight 5: No support person
    if (!survey.personaApoyo || survey.personaApoyo === "ninguno") {
      insights.push({
        id: "no-support",
        title: "Falta de red de apoyo",
        description: "El paciente no ha identificado una persona de apoyo para su recuperación.",
        impact: "medium",
        actionable: true,
        recommendation:
          "Ofrecer información sobre servicios de enfermería a domicilio y opciones de recuperación asistida.",
        icon: User,
      })
    }

    // Insight 6: Doubts about necessity
    if (survey.preocupacionesCirugia?.includes("Dudas sobre necesidad real")) {
      insights.push({
        id: "necessity-doubts",
        title: "Dudas sobre la necesidad de cirugía",
        description: "El paciente tiene dudas sobre si la cirugía es realmente necesaria.",
        impact: "high",
        actionable: true,
        recommendation:
          "Proporcionar información clara sobre los riesgos de no operarse y los beneficios a largo plazo de la cirugía.",
        icon: Stethoscope,
      })
    }

    // Sort insights by impact (high to low)
    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  // Generate recommendation categories based on patient data and probability
  const generateRecommendationCategories = (patient: PatientData, probability: number): RecommendationCategory[] => {
    const categories: RecommendationCategory[] = []
    const survey = patient.encuesta

    if (!survey) return categories

    // Category 1: Clinical Recommendations
    const clinicalRecs = []

    if (survey.intensidadDolor >= 7) {
      clinicalRecs.push("Enfatizar el alivio inmediato del dolor post-cirugía")
    }

    if (survey.severidadCondicion === "Severa") {
      clinicalRecs.push("Explicar los riesgos de complicaciones si no se trata quirúrgicamente")
    }

    if (survey.duracionSintomas === "más de 1 año" || survey.duracionSintomas === "6-12 meses") {
      clinicalRecs.push("Destacar que la condición crónica no mejorará sin intervención quirúrgica")
    }

    if (clinicalRecs.length > 0) {
      categories.push({
        id: "clinical",
        title: "Recomendaciones Clínicas",
        description: "Aspectos médicos a enfatizar durante la consulta",
        icon: Stethoscope,
        recommendations: clinicalRecs,
      })
    }

    // Category 2: Educational Recommendations
    const educationalRecs = []

    if (survey.preocupacionesCirugia?.includes("Dudas sobre necesidad real")) {
      educationalRecs.push("Proporcionar material educativo sobre la condición y opciones de tratamiento")
    }

    if (survey.preocupacionesCirugia?.includes("Miedo al procedimiento")) {
      educationalRecs.push("Compartir videos explicativos del procedimiento y testimonios de pacientes")
    }

    if (survey.diagnosticoPrevio) {
      educationalRecs.push("Confirmar y validar el diagnóstico previo, explicando la evolución esperada")
    }

    if (educationalRecs.length > 0) {
      categories.push({
        id: "educational",
        title: "Recomendaciones Educativas",
        description: "Información y recursos para el paciente",
        icon: FileText,
        recommendations: educationalRecs,
      })
    }

    // Category 3: Logistical Recommendations
    const logisticalRecs = []

    if (survey.preocupacionesCirugia?.includes("Tiempo de recuperación")) {
      logisticalRecs.push("Presentar el programa de recuperación rápida y tiempos estimados de reincorporación")
    }

    if (survey.preocupacionesCirugia?.includes("Ausencia laboral")) {
      logisticalRecs.push("Ofrecer opciones de programación quirúrgica en fines de semana o periodos vacacionales")
    }

    if (!survey.personaApoyo || survey.personaApoyo === "ninguno") {
      logisticalRecs.push("Proporcionar información sobre servicios de enfermería a domicilio")
    }

    if (logisticalRecs.length > 0) {
      categories.push({
        id: "logistical",
        title: "Recomendaciones Logísticas",
        description: "Aspectos prácticos para facilitar la decisión",
        icon: Calendar,
        recommendations: logisticalRecs,
      })
    }

    // Category 4: Conversion Strategies
    const conversionRecs = []

    if (probability >= 0.7) {
      conversionRecs.push("Ofrecer fecha de cirugía tentativa al final de la consulta")
      conversionRecs.push("Presentar opciones de pago y financiamiento si aplica")
    } else if (probability >= 0.4) {
      conversionRecs.push("Programar seguimiento telefónico en 48 horas")
      conversionRecs.push("Ofrecer segunda opinión gratuita si hay dudas")
    } else {
      conversionRecs.push("Programar seguimiento en 1-3 meses")
      conversionRecs.push("Proporcionar plan de manejo conservador mientras decide")
    }

    categories.push({
      id: "conversion",
      title: "Estrategias de Conversión",
      description: "Tácticas para mejorar la probabilidad de decisión quirúrgica",
      icon: Lightbulb,
      recommendations: conversionRecs,
    })

    return categories
  }

  // Generate chart data for barriers
  const barrierChartData = useMemo(() => {
    if (!patientData?.encuesta) return []

    const barriers = [
      {
        name: "Miedo al procedimiento",
        value: patientData.encuesta.preocupacionesCirugia?.includes("Miedo al procedimiento") ? 1 : 0,
      },
      {
        name: "Tiempo de recuperación",
        value: patientData.encuesta.preocupacionesCirugia?.includes("Tiempo de recuperación") ? 1 : 0,
      },
      {
        name: "Ausencia laboral",
        value: patientData.encuesta.preocupacionesCirugia?.includes("Ausencia laboral") ? 1 : 0,
      },
      {
        name: "Dudas sobre necesidad",
        value: patientData.encuesta.preocupacionesCirugia?.includes("Dudas sobre necesidad real") ? 1 : 0,
      },
      {
        name: "Falta de apoyo",
        value: patientData.encuesta.preocupacionesCirugia?.includes("Falta de apoyo familiar") ? 1 : 0,
      },
    ]

    return barriers.filter((barrier) => barrier.value > 0)
  }, [patientData])

  // Generate chart data for factors
  const factorChartData = useMemo(() => {
    if (!patientData?.encuesta) return []

    return [
      { name: "Dolor", value: patientData.encuesta.intensidadDolor || 0 },
      {
        name: "Severidad",
        value:
          patientData.encuesta.severidadCondicion === "Severa"
            ? 10
            : patientData.encuesta.severidadCondicion === "Moderada"
              ? 6
              : 3,
      },
      {
        name: "Limitación",
        value:
          patientData.encuesta.afectacionDiaria === "Severa"
            ? 10
            : patientData.encuesta.afectacionDiaria === "Moderada"
              ? 6
              : patientData.encuesta.afectacionDiaria === "Leve"
                ? 3
                : 0,
      },
      {
        name: "Urgencia",
        value:
          patientData.encuesta.plazoDeseado === "Urgente"
            ? 10
            : patientData.encuesta.plazoDeseado === "30 días"
              ? 7
              : patientData.encuesta.plazoDeseado === "90 días"
                ? 4
                : 1,
      },
    ]
  }, [patientData])

  // Generate radar chart data for decision factors
  const decisionFactorsData = useMemo(() => {
    if (!patientData?.encuesta) return []

    return [
      {
        subject: "Necesidad médica",
        A:
          patientData.encuesta.severidadCondicion === "Severa"
            ? 100
            : patientData.encuesta.severidadCondicion === "Moderada"
              ? 70
              : 40,
        fullMark: 100,
      },
      {
        subject: "Alivio del dolor",
        A: Math.min(100, patientData.encuesta.intensidadDolor * 10),
        fullMark: 100,
      },
      {
        subject: "Mejora funcional",
        A:
          patientData.encuesta.afectacionDiaria === "Severa"
            ? 90
            : patientData.encuesta.afectacionDiaria === "Moderada"
              ? 60
              : patientData.encuesta.afectacionDiaria === "Leve"
                ? 30
                : 10,
        fullMark: 100,
      },
      {
        subject: "Urgencia",
        A:
          patientData.encuesta.plazoDeseado === "Urgente"
            ? 90
            : patientData.encuesta.plazoDeseado === "30 días"
              ? 70
              : patientData.encuesta.plazoDeseado === "90 días"
                ? 40
                : 20,
        fullMark: 100,
      },
      {
        subject: "Beneficio a largo plazo",
        A:
          patientData.encuesta.duracionSintomas === "más de 1 año"
            ? 90
            : patientData.encuesta.duracionSintomas === "6-12 meses"
              ? 75
              : patientData.encuesta.duracionSintomas === "3-6 meses"
                ? 60
                : 40,
        fullMark: 100,
      },
    ]
  }, [patientData])

  // Chart colors
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  // Get color based on conversion score
  const getConversionScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400"
    if (score >= 60) return "text-blue-600 dark:text-blue-400"
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // Get color based on surgery probability
  const getSurgeryProbabilityColor = (probability: number) => {
    if (probability >= 0.7) return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    if (probability >= 0.4) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
  }

  // Format probability as percentage
  const formatProbability = (probability: number) => {
    return `${(probability * 100).toFixed(0)}%`
  }

  // Get sentiment badge color
  const getSentimentBadgeColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    if (sentiment === "neutral") return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
  }

  // Get readiness badge color
  const getReadinessBadgeColor = (readiness: string) => {
    if (readiness === "high") return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    if (readiness === "medium") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
  }

  // Get benefit vs risk badge color
  const getBenefitRiskBadgeColor = (ratio: number) => {
    if (ratio >= 1.5) return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    if (ratio >= 1.0) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
  }

  // Función para agendar seguimiento
  const handleAgendarSeguimientoDesdeFicha = useCallback(
    (paciente: PatientData) => {
      if (!paciente) return

      // 1. Crear un seguimiento básico inicial
      const nuevoSeguimiento: Omit<FollowUp, "id"> = {
        patientId: Number(patientId),
        fecha: new Date().toISOString(),
        tipo: "Llamada",
        notas: `Seguimiento iniciado desde análisis de encuesta - ${paciente.nombre} ${paciente.apellidos} no ha agendado consulta/cirugía.`,
        resultado: "Indeciso",
        estado: "Programado",
        asignadoA: "Dr. Luis Ángel Medina",
        proximoSeguimiento: addDays(new Date(), 7).toISOString(),
      }

      addFollowUp(nuevoSeguimiento)

      // 2. Actualizar el estado del paciente si es necesario
      updatePatient(Number(patientId), { estado: "Seguimiento" })

      // 3. Navegar al CRM y seleccionar al paciente
      router.push(`/crm?patientId=${patientId}&view=followups`)

      toast.success(`Seguimiento para ${paciente.nombre} agendado. Redirigiendo al CRM.`)
    },
    [patientId, addFollowUp, updatePatient, router],
  )

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Analizando resultados de la encuesta</CardTitle>
          <CardDescription>Procesando las respuestas del paciente</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Generando análisis personalizado...</p>
        </CardContent>
      </Card>
    )
  }

  // Error state - no patient data
  if (!patientData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Resultados no disponibles</CardTitle>
          <CardDescription>No se pudo encontrar la información del paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se encontraron datos para el paciente con ID: {patientId}. Verifique que el ID sea correcto e intente
              nuevamente.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
        </CardFooter>
      </Card>
    )
  }

  // Error state - no survey data
  if (!patientData.encuesta) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Encuesta no completada</CardTitle>
          <CardDescription>El paciente no ha completado la encuesta</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>
              Este paciente no ha completado la encuesta pre-consulta. No es posible generar un análisis de conversión
              sin estos datos.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => window.history.back()}>
            Volver
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <CardTitle className="text-xl md:text-2xl">Análisis de Resultados de Encuesta</CardTitle>
            <CardDescription>
              Paciente: {patientData.nombre} {patientData.apellidos} | ID: {patientId}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onGeneratePDF}>
              <Download className="mr-2 h-4 w-4" />
              {!isMobile && "Exportar PDF"}
            </Button>
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              {!isMobile && "Compartir"}
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              {!isMobile && "Imprimir"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {modelError && (
          <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Aviso</AlertTitle>
            <AlertDescription>{modelError}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Probabilidad de Cirugía</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">{formatProbability(surgeryProbability)}</div>
                <Badge variant="outline" className={getSurgeryProbabilityColor(surgeryProbability)}>
                  {surgeryProbability >= 0.7 ? "Alta" : surgeryProbability >= 0.4 ? "Media" : "Baja"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Basado en el modelo predictivo y respuestas de la encuesta
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Índice de Conversión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-2xl font-bold">{conversionScore}</span>
                  <span className={`text-sm font-medium ${getConversionScoreColor(conversionScore)}`}>
                    {conversionScore >= 80
                      ? "Excelente"
                      : conversionScore >= 60
                        ? "Bueno"
                        : conversionScore >= 40
                          ? "Regular"
                          : "Bajo"}
                  </span>
                </div>
                <Progress value={conversionScore} className="h-2" />
                <p className="text-xs text-muted-foreground">Probabilidad de aceptar tratamiento quirúrgico</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sentimiento del Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold capitalize">
                  {sentimentAnalysis?.sentiment.label === "positive"
                    ? "Positivo"
                    : sentimentAnalysis?.sentiment.label === "negative"
                      ? "Negativo"
                      : "Neutral"}
                </div>
                <Badge
                  variant="outline"
                  className={getSentimentBadgeColor(sentimentAnalysis?.sentiment.label || "neutral")}
                >
                  {(sentimentAnalysis?.sentiment.confidence * 100).toFixed(0)}% confianza
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Análisis de comentarios y respuestas abiertas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Beneficio vs. Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-2xl font-bold">{benefitVsRiskRatio}x</div>
                <Badge variant="outline" className={getBenefitRiskBadgeColor(benefitVsRiskRatio)}>
                  {benefitVsRiskRatio >= 1.5
                    ? "Muy favorable"
                    : benefitVsRiskRatio >= 1.0
                      ? "Favorable"
                      : "Desfavorable"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Relación entre beneficios y riesgos de la cirugía</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="persuasive">Argumentos</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Survey Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumen de Encuesta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Información Clínica</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Diagnóstico:</span> {patientData.diagnostico || "No especificado"}
                      </div>
                      <div>
                        <span className="font-medium">Intensidad dolor:</span> {patientData.encuesta.intensidadDolor}/10
                      </div>
                      <div>
                        <span className="font-medium">Severidad:</span> {patientData.encuesta.severidadCondicion}
                      </div>
                      <div>
                        <span className="font-medium">Duración:</span> {patientData.encuesta.duracionSintomas}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Preferencias y Expectativas</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="font-medium">Plazo deseado:</span> {patientData.encuesta.plazoDeseado}
                      </div>
                      <div>
                        <span className="font-medium">Decisión:</span>{" "}
                        {patientData.encuesta.plazoDecision || "No especificado"}
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className="text-sm font-medium">Preocupaciones:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {patientData.encuesta.preocupacionesCirugia?.map((preocupacion, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {preocupacion}
                          </Badge>
                        ))}
                        {(!patientData.encuesta.preocupacionesCirugia ||
                          patientData.encuesta.preocupacionesCirugia.length === 0) && (
                          <span className="text-xs text-muted-foreground">No se reportaron preocupaciones</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Decision Factors Radar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Factores de Decisión</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius={90} data={decisionFactorsData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar name="Factores" dataKey="A" stroke="#4361ee" fill="#4361ee" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sentiment Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análisis de Sentimientos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className={getSentimentBadgeColor(sentimentAnalysis?.sentiment.label || "neutral")}>
                        {sentimentAnalysis?.sentiment.label === "positive"
                          ? "Positivo"
                          : sentimentAnalysis?.sentiment.label === "negative"
                            ? "Negativo"
                            : "Neutral"}
                      </Badge>
                      <span className="text-sm">
                        Confianza: {(sentimentAnalysis?.sentiment.confidence * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Disposición hacia la cirugía</h4>
                      <Badge className={getReadinessBadgeColor(sentimentAnalysis?.surgeryReadiness || "medium")}>
                        {sentimentAnalysis?.surgeryReadiness === "high"
                          ? "Alta disposición"
                          : sentimentAnalysis?.surgeryReadiness === "low"
                            ? "Baja disposición"
                            : "Disposición media"}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Enfoque recomendado</h4>
                      <p className="text-sm">
                        {sentimentAnalysis?.persuasiveApproach || "Proporcionar información balanceada"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {sentimentAnalysis?.keyConcerns && sentimentAnalysis.keyConcerns.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Preocupaciones detectadas</h4>
                        <div className="flex flex-wrap gap-1">
                          {sentimentAnalysis.keyConcerns.map((concern: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-red-50">
                              <ThumbsDown className="h-3 w-3 mr-1 text-red-500" />
                              {concern}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {sentimentAnalysis?.positiveFactors && sentimentAnalysis.positiveFactors.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Factores positivos detectados</h4>
                        <div className="flex flex-wrap gap-1">
                          {sentimentAnalysis.positiveFactors.map((factor: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-green-50">
                              <ThumbsUp className="h-3 w-3 mr-1 text-green-500" />
                              {factor}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!sentimentAnalysis?.keyConcerns || sentimentAnalysis.keyConcerns.length === 0) &&
                      (!sentimentAnalysis?.positiveFactors || sentimentAnalysis.positiveFactors.length === 0) && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              No se detectaron palabras clave en los comentarios
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Barriers to Conversion */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Barreras para Conversión</CardTitle>
              </CardHeader>
              <CardContent>
                {barrierChartData.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-[200px] flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={barrierChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label
                          >
                            {barrierChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Principales Barreras Identificadas</h4>
                      <ul className="space-y-2">
                        {barrierChartData.map((barrier, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <div
                              className="w-3 h-3 rounded-full mt-1"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <div>
                              <p className="text-sm font-medium">{barrier.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {barrier.name === "Miedo al procedimiento" && "Ansiedad sobre la cirugía y sus riesgos"}
                                {barrier.name === "Tiempo de recuperación" &&
                                  "Preocupación por el periodo post-operatorio"}
                                {barrier.name === "Ausencia laboral" && "Inquietud por faltar al trabajo"}
                                {barrier.name === "Dudas sobre necesidad" &&
                                  "Incertidumbre sobre si la cirugía es necesaria"}
                                {barrier.name === "Falta de apoyo" && "No cuenta con red de apoyo para recuperación"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No se identificaron barreras significativas</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      El paciente no ha reportado preocupaciones específicas sobre la cirugía
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Persuasive Arguments Tab */}
          <TabsContent value="persuasive" className="space-y-6">
            {/* Persuasive Messages */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Argumentos Persuasivos</CardTitle>
                <CardDescription>Mensajes clave para presentar al paciente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {persuasiveMessages.map((message, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                      <div className="mt-0.5 bg-primary/10 p-2 rounded-full">
                        <Lightbulb className="h-4 w-4 text-primary" />
                      </div>
                      <p>{message}</p>
                    </div>
                  ))}
                  {persuasiveMessages.length === 0 && (
                    <div className="text-center py-8">
                      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium">No se pudieron generar argumentos persuasivos</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        No hay suficiente información en la encuesta para generar argumentos persuasivos
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Persuasive Points */}
            <div className="grid grid-cols-1 gap-4">
              {persuasivePoints.map((point, index) => (
                <Card key={index}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <point.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{point.title}</CardTitle>
                        <Badge
                          variant={
                            point.strength === "high"
                              ? "default"
                              : point.strength === "medium"
                                ? "secondary"
                                : "outline"
                          }
                          className="mt-1"
                        >
                          {point.category === "clinical" && "Clínico"}
                          {point.category === "quality" && "Calidad de vida"}
                          {point.category === "emotional" && "Emocional"}
                          {point.category === "financial" && "Financiero"}
                          {point.category === "social" && "Social"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
              {persuasivePoints.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No se pudieron generar puntos persuasivos</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      No hay suficiente información en la encuesta para generar puntos persuasivos
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Benefit vs Risk Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Análisis de Beneficios vs. Riesgos</CardTitle>
                <CardDescription>Relación: {benefitVsRiskRatio}x a favor de los beneficios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-500" />
                      Beneficios de la Cirugía
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Alivio del dolor</p>
                          <p className="text-xs text-muted-foreground">
                            Reducción significativa del dolor reportado (nivel {patientData.encuesta.intensidadDolor}
                            /10)
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Mejora de la calidad de vida</p>
                          <p className="text-xs text-muted-foreground">
                            Recuperación de la funcionalidad y actividades diarias
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Solución definitiva</p>
                          <p className="text-xs text-muted-foreground">
                            Resolución permanente de la condición vs. tratamientos temporales
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Prevención de complicaciones</p>
                          <p className="text-xs text-muted-foreground">
                            Evita el empeoramiento y posibles emergencias futuras
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ThumbsDown className="h-4 w-4 text-red-500" />
                      Riesgos a Considerar
                    </h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Tiempo de recuperación</p>
                          <p className="text-xs text-muted-foreground">
                            Periodo de recuperación de 2-4 semanas según el caso
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Riesgos quirúrgicos estándar</p>
                          <p className="text-xs text-muted-foreground">
                            Infección, sangrado, reacción a anestesia (probabilidad muy baja)
                          </p>
                        </div>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Ausencia laboral</p>
                          <p className="text-xs text-muted-foreground">
                            Necesidad de tiempo fuera del trabajo durante la recuperación
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            {insights.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {insights.map((insight, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-2 rounded-full ${
                              insight.impact === "high"
                                ? "bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                : insight.impact === "medium"
                                  ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            }`}
                          >
                            <insight.icon className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                        </div>
                        <Badge
                          variant={
                            insight.impact === "high"
                              ? "destructive"
                              : insight.impact === "medium"
                                ? "default"
                                : "outline"
                          }
                        >
                          {insight.impact === "high"
                            ? "Alto impacto"
                            : insight.impact === "medium"
                              ? "Impacto medio"
                              : "Bajo impacto"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">{insight.description}</p>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="w-full">
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <Lightbulb className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">Recomendación:</span>
                          </div>
                          <span className="text-sm">{insight.recommendation}</span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No se pudieron generar insights</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No hay suficiente información en la encuesta para generar insights significativos
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-6">
            {recommendationCategories.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {recommendationCategories.map((category, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10 text-primary">
                          <category.icon className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-base">{category.title}</CardTitle>
                      </div>
                      <CardDescription>{category.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {category.recommendations.map((recommendation, recIndex) => (
                          <li key={recIndex} className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5" />
                            <span className="text-sm">{recommendation}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No se pudieron generar recomendaciones</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    No hay suficiente información en la encuesta para generar recomendaciones significativas
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => window.history.back()}>
          Volver
        </Button>
        <div className="flex gap-2">
          {patientData && patientData.estado !== "Operado" && !patientData.fechaCirugia && (
            <Button
              onClick={() => handleAgendarSeguimientoDesdeFicha(patientData)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <PhoneIcon className="mr-2 h-4 w-4" />
              Agendar Seguimiento
            </Button>
          )}
          <Button>
            Programar consulta
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
