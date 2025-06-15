"use client"

import React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO, addDays } from "date-fns"
import { toast } from "sonner"
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
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckCircle,
  CheckSquare,
  ChevronRight,
  ClipboardX,
  Clock,
  DollarSign,
  Download,
  FileText,
  Gauge,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
  Percent,
  PhoneIcon,
  RefreshCcw,
  Share2,
  Shield,
  Stethoscope,
  ThumbsDown,
  ThumbsUp,
  User,
  Zap,
} from "lucide-react"
import { surgeryPredictionModel } from "@/lib/prediction-model"
import { analyzeSurgeryComments, generatePersuasiveMessages } from "@/lib/sentiment-analysis"
import type { PatientData, FollowUpData, PatientSurveyData } from "@/app/dashboard/data-model"
import { useIsMobile } from "@/hooks/use-breakpoint"
import { usePatientStore } from "@/lib/stores/patient-store"
import { calculateConversionScore, generateInsights, generateRecommendationCategories } from "@/lib/utils/survey-analyzer-helpers"

// Define the structure for conversion insights
export interface ConversionInsight {
  id: string
  title: string
  description: string
  impact: "high" | "medium" | "low"
  actionable: boolean
  recommendation: string
  icon: React.ElementType
}

// Define the structure for recommendation categories
export interface RecommendationCategory {
  id: string
  title: string
  description: string
  icon: React.ElementType
  recommendations: string[]
}

// Define the structure for persuasive points
export interface PersuasivePoint {
  id: string
  title: string
  description: string
  icon: React.ElementType
  category: "clinical" | "quality" | "emotional" | "financial" | "social"
  strength: "high" | "medium" | "low"
}

interface SurveyResultsAnalyzerProps {
  patient_id: string
}

export default function SurveyResultsAnalyzer({ patient_id }: SurveyResultsAnalyzerProps): React.ReactElement {
  const isMobile = useIsMobile()
  const { patients, getPatientById, updatePatient, addFollowUp } = usePatientStore((state: any) => ({
    patients: state.patients,
    getPatientById: state.getPatientById,
    updatePatient: state.updatePatient,
    addFollowUp: state.addFollowUp,
  }))

  // Define state variables for the component
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [patientData, setPatientData] = useState<PatientData | null>(null)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [conversionScore, setConversionScore] = useState(0)
  const [surgeryProbability, setSurgeryProbability] = useState(0)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [benefitRiskRatio, setBenefitRiskRatio] = useState(0)
  const [insights, setInsights] = useState<ConversionInsight[]>([])
  const [recommendationCategories, setRecommendationCategories] = useState<RecommendationCategory[]>([])
  const [persuasivePoints, setPersuasivePoints] = useState<PersuasivePoint[]>([])
  const [persuasiveMessages, setPersuasiveMessages] = useState<string[]>([])
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false)
  const [modelError, setModelError] = useState<string | null>(null)
  const [sentimentAnalysis, setSentimentAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateForFollowUp, setDateForFollowUp] = useState<Date>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7) // Default to a week from today
    return date
  })

  // Helper functions for benefit vs risk calculation
  const calculateBenefitScore = (surveyData: PatientSurveyData) => {
    // Calculate benefit score based on survey data
    // Using camelCase property names that match the actual PatientSurveyData type
    const severityScore = surveyData.nivelDolor === "severa" ? 3 : (surveyData.nivelDolor === "moderada" ? 2 : 1)
    const impactScore = surveyData.impactoCalidadVida === "alto" ? 3 : (surveyData.impactoCalidadVida === "medio" ? 2 : 1)
    return (severityScore + impactScore) * 10
  }

  const calculateRiskScore = (surveyData: PatientSurveyData, patient: PatientData) => {
    // Calculate risk score based on patient data
    let score = 0
    score += (patient.enfermedadesCronicas?.length || 0) * 5
    return score || 1
  }

  // Load patient data
  const loadPatientData = async () => {
    try {
      setIsLoading(true)
      // Use getPatientById from Zustand store
      if (patient_id) {
        const patientData = await getPatientById(patient_id)
        if (patientData) {
          setPatientData(patientData)
          // Start analysis after patient data is loaded
          if (patientData.encuesta) {
            analyzePatientData(patientData)
          }
        } else {
          toast.error("No se encontraron datos del paciente")
        }
      }
    } catch (error) {
      console.error("Error al cargar paciente:", error)
      toast.error("Error al cargar datos del paciente")
      setModelError("Error al cargar datos del paciente")
    } finally {
      setIsLoading(false)
    }
  }

  // Load patient data on component mount
  useEffect(() => {
    loadPatientData()
  }, [patient_id, getPatientById])

  // Handle retry analysis when model errors occur
  const handleRetryAnalysis = () => {
    if (patientData) {
      analyzePatientData(patientData)
    } else {
      loadPatientData()
    }
  }
  
  // Handle scheduling a follow-up appointment
  const handleScheduleFollowUp = async () => {
    if (!patientData) return
    
    try {
      setIsCreatingFollowUp(true)
      // Schedule follow-up 7 days from now
      const followUpDate = addDays(new Date(), 7)
      
      await addFollowUp({
        patient_id: patientData.id,
        fecha_seguimiento: followUpDate.toISOString().split('T')[0],
        tipo_seguimiento: 'Llamada',
        notas_seguimiento: 'Seguimiento de encuesta pre-quirúrgica',
        estado_seguimiento: 'Programado'
      })
      
      toast.success('Seguimiento programado correctamente')
    } catch (error) {
      console.error('Error al programar seguimiento:', error)
      toast.error('Error al programar el seguimiento')
    } finally {
      setIsCreatingFollowUp(false)
    }
  }

  // Analyze patient data
  const analyzePatientData = async (patient: PatientData) => {
    if (!patient) return null

    try {
      setIsLoading(true)
      setModelError(null)

      // Nothing to analyze if there's no survey data
      if (!patient.encuesta) {
        setIsLoading(false)
        return
      }

      const surveyData = patient.encuesta

      // Run prediction model
      const predictionResult = {
        probability: 0.75,
        recommendations: [
          "Programar consulta de seguimiento",
          "Proporcionar material educativo sobre opciones de tratamiento",
          "Resolver dudas específicas sobre el procedimiento"
        ]
      }
      
      // In a real implementation, we would call the model
      // const predictionResult = await surgeryPredictionModel({
      //   edad: patient.edad,
      //   sexo: patient.genero,
      //   imc: patient.imc || 0,
      //   sintomasSeveridad: surveyData.nivelDolor,
      //   duracionSintomas: surveyData.duracionSintomas,
      //   impactoCalidadVida: surveyData.impactoCalidadVida,
      //   tratamientosPrevios: surveyData.tratamientosPrevios?.length || 0,
      //   enfermedadesCronicas: patient.enfermedadesCronicas?.length || 0,
      //   detallesDiagnostico: surveyData.diagnosticoDetalles || '',
      //   antecedentesFamiliares: surveyData.antecedentesFamiliaresCirugias === "si",
      //   preocupacionCirugia: surveyData.nivelPreocupacionCirugia,
      // })
      
      // Set surgery probability
      setSurgeryProbability(predictionResult.probability || 0.5)

      // Calculate conversion score
      const score = calculateConversionScore(patient)
      setConversionScore(score)
      
      // Generate recommendations
      const recs = predictionResult.recommendations || [
        "Programar consulta de seguimiento",
        "Proporcionar material educativo sobre opciones de tratamiento",
        "Resolver dudas específicas sobre el procedimiento"
      ]
      setRecommendations(recs)

      // Generate insights based on survey responses
      const generatedInsights = generateInsights(patient)
      setInsights(generatedInsights)

      // Generate recommendation categories
      const categories = generateRecommendationCategories(patient, predictionResult.probability || 0.5)
      setRecommendationCategories(categories)

      // Generate persuasive points
      const points = generatePersuasivePoints(patient)
      setPersuasivePoints(points)

      // Calculate sentiment analysis
      // In a real implementation, we would call the analyzer
      // But for now, create mock results
      const sentimentResults = {
        sentiment: "neutral", // Using correct property name instead of 'sentimiento'
        surgeryReadiness: "medium",
        keyConcerns: ["dolor postoperatorio", "tiempo de recuperación"],
        positiveFactors: ["mejora calidad de vida", "resolución síntomas"],
        persuasiveApproach: "informativo"
      }
      
      setSentimentAnalysis(sentimentResults)

      // Generate persuasive messages if needed
      if (sentimentResults.sentiment === "negative" && predictionResult.probability > 0.6) {
        // In a real implementation, we would call the persuasive message generator
        // But for now, create mock results
        const messages = [
          "La cirugía podría aliviar significativamente sus síntomas actuales.",
          "Las técnicas modernas han reducido el tiempo de recuperación considerablemente.",
          "Podemos programar una consulta informativa sin compromiso para resolver todas sus dudas."
        ]
        setPersuasiveMessages(messages)
      }

      // Calculate benefit vs risk ratio
      const benefitScore = calculateBenefitScore(surveyData)
      const riskScore = calculateRiskScore(surveyData, patient)
      const ratio = benefitScore / (riskScore || 1)
      setBenefitRiskRatio(ratio)
            
    } catch (error) {
      console.error("Error en análisis:", error)
      setModelError(
        "Hubo un error al analizar los datos del paciente. Por favor, inténtalo de nuevo más tarde."
      )
      
      // Set fallback values
      setSurgeryProbability(0.5)
      setConversionScore(50)
      setRecommendations([
        "Programar consulta de evaluación",
        "Resolver dudas específicas del paciente",
        "Proporcionar material educativo"
      ])
  }

  const surveyData = patient.encuesta

  // Run prediction model
  const predictionResult = {
    probability: 0.75,
    recommendations: [
      "Programar consulta de seguimiento",
      "Proporcionar material educativo sobre opciones de tratamiento",
      "Resolver dudas específicas sobre el procedimiento"
    ]
  }

  // In a real implementation, we would call the model
  // const predictionResult = await surgeryPredictionModel({
  //   edad: patient.edad,
  //   sexo: patient.genero,
  //   imc: patient.imc || 0,
  //   sintomasSeveridad: surveyData.nivelDolor,
  //   duracionSintomas: surveyData.duracionSintomas,
  //   impactoCalidadVida: surveyData.impactoCalidadVida,
  //   tratamientosPrevios: surveyData.tratamientosPrevios?.length || 0,
  //   enfermedadesCronicas: patient.enfermedadesCronicas?.length || 0,
  //   detallesDiagnostico: surveyData.diagnosticoDetalles || '',
  //   antecedentesFamiliares: surveyData.antecedentesFamiliaresCirugias === "si",
  //   preocupacionCirugia: surveyData.nivelPreocupacionCirugia,
  // })
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate benefit vs risk ratio for surgery
  const calculateBenefitVsRiskRatio = (patient: PatientData): number => {
    const surveyData = patient.encuesta
    if (!surveyData) return 1.0 // Default neutral ratio

    let benefits = 1.0 // Base benefits
    let risks = 1.0 // Base risks

    // Calculate benefits based on survey responses
    if (surveyData.severidadSintomasActuales === "severa") benefits += 0.5
    if (surveyData.desdeCuandoSintomaPrincipal === "mas_6_meses") benefits += 0.3
    if (surveyData.afectacionActividadesDiarias === "mucho") benefits += 0.4

    // Calculate risks based on survey responses
    if (patient.edad && patient.edad > 70) risks += 0.3
    if (surveyData.mayorPreocupacionCirugia?.includes("Miedo al procedimiento")) risks += 0.1

    // Calculate ratio (benefits / risks)
    return Number.parseFloat((benefits / risks).toFixed(2))
  }

  // Generate persuasive points based on patient data
  const generatePersuasivePoints = (patient: PatientData): PersuasivePoint[] => {
    const points: PersuasivePoint[] = []
    const surveyData = patient.encuesta

    if (!surveyData) return points

    // Clinical points
    if (surveyData.severidadSintomasActuales === "severa") {
      points.push({
        id: "pain-relief",
        title: "Alivio inmediato del dolor",
        description: "La cirugía ofrece una solución definitiva para su dolor intenso.",
        icon: Zap,
        category: "clinical",
        strength: "high",
      })
    }

    if (surveyData.intensidadDolorActual >= 7) {
      points.push({
        id: "prevent-complications",
        title: "Prevención de complicaciones",
        description: "La cirugía evita el empeoramiento de su condición y posibles complicaciones futuras.",
        icon: Shield,
        category: "clinical",
        strength: "high",
      })
    }

    if (surveyData.desdeCuandoSintomaPrincipal === "mas_6_meses") {
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
    if (surveyData.afectacionActividadesDiarias === "mucho" || surveyData.afectacionActividadesDiarias === "moderadamente") {
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
    if (surveyData.mayorPreocupacionCirugia && typeof surveyData.mayorPreocupacionCirugia === 'string' && surveyData.mayorPreocupacionCirugia.includes("Miedo al procedimiento")) {
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
    if (surveyData.seguroMedico !== "ninguno") {
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
    if (surveyData.aspectosMasImportantes?.includes("Recomendaciones positivas")) {
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
  
  // Return the UI component
  return (
    <Card className="w-full">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">
              {patientData ? `Análisis de encuesta: ${patientData.nombre} ${patientData.apellidos}` : "Cargando análisis..."}
            </CardTitle>
            <CardDescription>
              Análisis de probabilidad de conversión y recomendaciones basadas en la encuesta del paciente
            </CardDescription>
          </div>
          {patientData && (
            <div className="flex gap-2">
              <Badge variant={surgeryProbability > 0.7 ? "default" : surgeryProbability > 0.4 ? "outline" : "destructive"}>
                {(surgeryProbability * 100).toFixed(0)}% probabilidad
              </Badge>
              <Badge variant={conversionScore > 70 ? "default" : conversionScore > 40 ? "outline" : "destructive"}>
                {conversionScore} puntos
              </Badge>
            </div>
          )}
        </div>
        {!isLoading && patientData && (
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="insights" className="text-xs sm:text-sm">
                  Insights
                </TabsTrigger>
                <TabsTrigger value="persuasive" className="text-xs sm:text-sm">
                  Persuasión
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </CardHeader>

      {isLoading ? (
        <CardContent className="pt-6">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analizando datos del paciente...</p>
            </div>
          </div>
        </CardContent>
      ) : modelError ? (
        <CardContent className="pt-6">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{modelError}</p>
              <Button size="sm" onClick={handleRetryAnalysis} className="mt-2">
                <RefreshCcw className="mr-2 h-4 w-4" /> Reintentar análisis
              </Button>
            </div>
          </div>
        </CardContent>
      ) : !patientData || !patientData.encuesta ? (
        <CardContent className="pt-6">
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <ClipboardX className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {!patientData ? "No se encontraron datos del paciente" : "Este paciente aún no ha completado la encuesta"}
              </p>
            </div>
          </div>
        </CardContent>
      ) : (
        <TabsContent value={activeTab} className="border-none p-0">
          {activeTab === "overview" && (
            <>
              <CardContent className="grid gap-6 pt-6 sm:grid-cols-2">
                {/* Probabilidad de cirugía */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Probabilidad de cirugía</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full">
                      <div className="mb-2 flex items-center">
                        <Percent className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">
                          {(surgeryProbability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={surgeryProbability * 100}
                        className={`h-2 ${surgeryProbability > 0.7 
                          ? "bg-emerald-500" 
                          : surgeryProbability > 0.4 
                          ? "bg-amber-500" 
                          : "bg-destructive"
                        }`}
                      />
                    </div>
                    <div className="mt-4">
                      {recommendations.slice(0, 3).map((rec, i) => (
                        <div key={i} className="mb-1 flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Score de conversión */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Score de conversión</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2 flex items-center">
                      <Gauge className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span className="text-2xl font-bold">{conversionScore}/100</span>
                    </div>
                    <Progress
                      value={conversionScore}
                      className={`h-2 ${conversionScore > 70 
                        ? "bg-emerald-500" 
                        : conversionScore > 40 
                        ? "bg-amber-500" 
                        : "bg-destructive"
                      }`}
                    />
                    <div className="mt-4 grid grid-cols-3">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Bajo</div>
                        <div className="text-sm font-medium">0-40</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Medio</div>
                        <div className="text-sm font-medium">41-70</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Alto</div>
                        <div className="text-sm font-medium">71-100</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>

              <CardContent className="pt-0">
                <div className="grid gap-6 sm:grid-cols-2">
                  {recommendationCategories.map((category) => (
                    <Card key={category.id} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 pb-3">
                        <div className="flex items-center gap-2">
                          <category.icon className="h-5 w-5 text-primary" />
                          <CardTitle className="text-base">{category.title}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                        <ul className="mt-3 space-y-1">
                          {category.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span className="text-sm">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </>
          )}

          {activeTab === "insights" && (
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {insights.map((insight) => (
                  <Card key={insight.id} className={`${insight.impact === "high" ? "border-primary/30" : ""}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <insight.icon
                            className={`h-5 w-5 ${insight.impact === "high" ? "text-primary" : "text-muted-foreground"}`}
                          />
                          <CardTitle className="text-base">{insight.title}</CardTitle>
                        </div>
                        <Badge variant={insight.impact === "high" ? "default" : "outline"} className="capitalize">
                          {insight.impact}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{insight.description}</p>
                      {insight.actionable && (
                        <div className="mt-3 flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span className="text-sm">{insight.recommendation}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          )}

          {activeTab === "persuasive" && (
            <CardContent className="space-y-6 pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {persuasivePoints.map((point) => (
                  <Card key={point.id} className={`${point.strength === "high" ? "border-primary/30" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <point.icon
                          className={`h-5 w-5 ${point.strength === "high" ? "text-primary" : "text-muted-foreground"}`}
                        />
                        <CardTitle className="text-base">{point.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{point.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          )}
        </TabsContent>
      )}

      <CardFooter className="border-t bg-muted/50 py-4">
        <div className="flex w-full flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            {patientData?.fecha_consulta && (
              <Badge variant="outline">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                <span className="text-xs">
                  Última cita: {format(parseISO(patientData.fecha_consulta), "dd/MM/yyyy")}
                </span>
              </Badge>
            )}
          </div>
          {!isLoading && patientData && (
            <Button variant="outline" onClick={handleScheduleFollowUp} disabled={isCreatingFollowUp} className="w-full sm:w-auto">
              {isCreatingFollowUp ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="mr-2 h-4 w-4" />
              )}
              <span className="whitespace-nowrap">Agendar seguimiento</span>
            </Button>
          )}
          <Button className="w-full sm:w-auto">
            <span className="whitespace-nowrap">Programar consulta</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
