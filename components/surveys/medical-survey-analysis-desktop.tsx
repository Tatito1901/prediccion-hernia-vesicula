"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon,
  Download,
  Filter,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Stethoscope,
  HeartPulse,
  Zap,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"
import type { PatientSurvey } from "@/app/dashboard/data-model"

// Datos de ejemplo
const sampleData = {
  satisfaccion: [
    { name: "Muy satisfecho", value: 45 },
    { name: "Satisfecho", value: 30 },
    { name: "Neutral", value: 15 },
    { name: "Insatisfecho", value: 7 },
    { name: "Muy insatisfecho", value: 3 },
  ],
  tiempoEspera: [
    { name: "0-15 min", value: 25 },
    { name: "15-30 min", value: 35 },
    { name: "30-45 min", value: 20 },
    { name: "45-60 min", value: 15 },
    { name: "60+ min", value: 5 },
  ],
  tendencias: [
    { name: "Ene", satisfaccion: 85, tiempoEspera: 20, recomendacion: 90 },
    { name: "Feb", satisfaccion: 83, tiempoEspera: 22, recomendacion: 88 },
    { name: "Mar", satisfaccion: 86, tiempoEspera: 18, recomendacion: 91 },
    { name: "Abr", satisfaccion: 89, tiempoEspera: 15, recomendacion: 93 },
    { name: "May", satisfaccion: 87, tiempoEspera: 17, recomendacion: 92 },
    { name: "Jun", satisfaccion: 90, tiempoEspera: 14, recomendacion: 94 },
  ],
  pacientesPrioritarios: [
    {
      id: 1,
      nombre: "María García",
      edad: 67,
      diagnostico: "Hipertensión severa",
      ultimaVisita: "2023-05-10",
      nivelPrioridad: "Alto",
      puntuacion: 87,
    },
    {
      id: 2,
      nombre: "Juan Pérez",
      edad: 72,
      diagnostico: "Diabetes tipo 2",
      ultimaVisita: "2023-05-12",
      nivelPrioridad: "Alto",
      puntuacion: 82,
    },
    {
      id: 3,
      nombre: "Ana Martínez",
      edad: 58,
      diagnostico: "Artritis reumatoide",
      ultimaVisita: "2023-05-15",
      nivelPrioridad: "Medio",
      puntuacion: 75,
    },
    {
      id: 4,
      nombre: "Carlos Rodríguez",
      edad: 63,
      diagnostico: "EPOC",
      ultimaVisita: "2023-05-18",
      nivelPrioridad: "Alto",
      puntuacion: 80,
    },
    {
      id: 5,
      nombre: "Laura Sánchez",
      edad: 70,
      diagnostico: "Insuficiencia cardíaca",
      ultimaVisita: "2023-05-20",
      nivelPrioridad: "Alto",
      puntuacion: 85,
    },
  ],
  comentariosRecientes: [
    {
      id: 1,
      paciente: "Roberto Gómez",
      fecha: "2023-05-22",
      comentario: "Excelente atención por parte del Dr. Martínez. Muy profesional y amable.",
      sentimiento: "positivo",
    },
    {
      id: 2,
      paciente: "Carmen López",
      fecha: "2023-05-21",
      comentario: "El tiempo de espera fue demasiado largo. Esperé más de una hora para ser atendida.",
      sentimiento: "negativo",
    },
    {
      id: 3,
      paciente: "Miguel Torres",
      fecha: "2023-05-20",
      comentario: "Las instalaciones están muy limpias y el personal es atento.",
      sentimiento: "positivo",
    },
    {
      id: 4,
      paciente: "Isabel Ramírez",
      fecha: "2023-05-19",
      comentario: "La doctora explicó muy bien mi diagnóstico y opciones de tratamiento.",
      sentimiento: "positivo",
    },
    {
      id: 5,
      paciente: "Fernando Díaz",
      fecha: "2023-05-18",
      comentario: "No me quedó claro cómo tomar la medicación. Necesito más información.",
      sentimiento: "neutral",
    },
  ],
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

// Colores para gráficos - Paleta profesional
const CLINICAL_COLORS = ["#4361ee", "#3a0ca3", "#7209b7", "#f72585", "#4cc9f0", "#4895ef", "#560bad", "#b5179e"]

// Datos de muestra para pruebas
const mockSurveys: PatientSurvey[] = [
  // ... datos de muestra existentes
]

// Categorías clínicas para análisis
const CLINICAL_CATEGORIES = [
  { id: "symptoms", label: "Síntomas y Manifestaciones Clínicas", icon: Stethoscope },
  { id: "severity", label: "Severidad y Progresión", icon: Activity },
  { id: "comorbidities", label: "Comorbilidades", icon: HeartPulse },
  { id: "demographics", label: "Demografía", icon: Users },
  { id: "timeframes", label: "Plazos y Urgencia", icon: Clock },
  { id: "insights", label: "Insights Clínicos", icon: Zap },
]

// Mapeo de síntomas a nombres legibles
const SYMPTOM_LABELS: Record<string, string> = {
  dolor_abdominal: "Dolor en zona abdominal",
  bulto_visible: "Bulto o hinchazón visible",
  ictericia: "Coloración amarillenta (ictericia)",
  limitacion_movimiento: "Dificultad para moverse",
  nauseas: "Náuseas y/o vómitos",
  dolor_comidas: "Dolor después de comer",
  pesadez: "Sensación de pesadez",
  distension: "Distensión abdominal",
  dolor_esfuerzos: "Dolor que aumenta con esfuerzos",
  fiebre: "Fiebre",
}

// Mapeo de severidad a nombres legibles
const SEVERITY_LABELS: Record<string, string> = {
  leve: "Leve",
  moderada: "Moderada",
  severa: "Severa",
}

// Mapeo de duración a nombres legibles
const DURATION_LABELS: Record<string, string> = {
  menos_1_mes: "Menos de 1 mes",
  "1_3_meses": "1-3 meses",
  "3_6_meses": "3-6 meses",
  "6_12_meses": "6-12 meses",
  mas_1_anio: "Más de 1 año",
}

// Mapeo de limitación funcional a nombres legibles
const LIMITATION_LABELS: Record<string, string> = {
  ninguna: "Sin limitaciones",
  leve: "Limitación leve",
  moderada: "Limitación moderada",
  severa: "Limitación severa",
}

// Mapeo de comorbilidades a nombres legibles
const COMORBIDITY_LABELS: Record<string, string> = {
  hipertension: "Hipertensión",
  diabetes: "Diabetes",
  obesidad: "Obesidad",
  cardiopatia: "Cardiopatía",
  hipotiroidismo: "Hipotiroidismo",
  otra: "Otra condición",
}

// Mapeo de seguros médicos a nombres legibles
const INSURANCE_LABELS: Record<string, string> = {
  imss: "IMSS",
  issste: "ISSSTE",
  seguro_privado: "Seguro Privado",
  ninguno: "Sin seguro",
}

// Mapeo de plazos deseados a nombres legibles
const TIMEFRAME_LABELS: Record<string, string> = {
  urgente: "Urgente",
  "30_dias": "En 30 días",
  "90_dias": "En 90 días",
  sin_prisa: "Sin prisa",
}

// Mapeo de inquietudes sobre cirugía a nombres legibles
const CONCERN_LABELS: Record<string, string> = {
  miedo_procedimiento: "Miedo al procedimiento",
  tiempo_recuperacion: "Tiempo de recuperación",
  ausencia_laboral: "Ausencia laboral",
  falta_apoyo: "Falta de apoyo familiar",
  dudas_necesidad: "Dudas sobre necesidad real",
  experiencias_negativas: "Experiencias negativas previas",
  informacion_insuficiente: "Información insuficiente",
}

// Función para calcular el índice de riesgo clínico
function calculateClinicalRiskIndex(survey: PatientSurvey): number {
  let score = 0

  // Factores de edad
  if (survey.edad > 65) score += 10
  else if (survey.edad > 50) score += 5

  // Factores de severidad
  if (survey.severidadCondicion === "severa") score += 15
  else if (survey.severidadCondicion === "moderada") score += 8

  // Factores de dolor
  if (survey.intensidadDolor >= 8) score += 12
  else if (survey.intensidadDolor >= 5) score += 6

  // Factores de limitación
  if (survey.limitacionFuncional === "severa") score += 15
  else if (survey.limitacionFuncional === "moderada") score += 8

  // Factores de duración
  if (survey.duracionSintomas === "mas_1_anio") score += 10
  else if (survey.duracionSintomas === "6_12_meses") score += 7
  else if (survey.duracionSintomas === "3_6_meses") score += 5

  // Factores de comorbilidades
  if (survey.comorbilidades && survey.comorbilidades.length > 2) score += 8
  else if (survey.comorbilidades && survey.comorbilidades.length > 0) score += 4

  // Factores de síntomas específicos de alto riesgo
  if (survey.sintomas?.includes("ictericia")) score += 10
  if (survey.sintomas?.includes("fiebre")) score += 8

  // Factores de urgencia expresada
  if (survey.plazoDeseado === "urgente") score += 10

  return score
}

// Función para clasificar el nivel de riesgo
function getRiskLevel(score: number): { level: string; color: string } {
  if (score >= 50) return { level: "Alto", color: "destructive" }
  if (score >= 30) return { level: "Moderado", color: "default" }
  return { level: "Bajo", color: "outline" }
}

// Función para obtener recomendaciones clínicas basadas en el perfil del paciente
function getClinicalRecommendations(survey: PatientSurvey): string[] {
  const recommendations: string[] = []

  // Recomendaciones basadas en síntomas
  if (survey.sintomas?.includes("ictericia")) {
    recommendations.push("Considerar evaluación de función hepática y vías biliares")
  }

  if (survey.sintomas?.includes("fiebre") && survey.intensidadDolor > 6) {
    recommendations.push("Evaluar posible cuadro infeccioso agudo")
  }

  // Recomendaciones basadas en comorbilidades
  if (survey.comorbilidades?.includes("diabetes")) {
    recommendations.push("Verificar control glucémico previo a cualquier intervención")
  }

  if (survey.comorbilidades?.includes("hipertension")) {
    recommendations.push("Evaluar riesgo cardiovascular y control de presión arterial")
  }

  // Recomendaciones basadas en edad
  if (survey.edad > 65) {
    recommendations.push("Considerar evaluación geriátrica integral")
  }

  // Recomendaciones basadas en severidad y duración
  if (survey.severidadCondicion === "severa" && survey.duracionSintomas === "mas_1_anio") {
    recommendations.push("Evaluar posibles complicaciones por cronicidad")
  }

  // Recomendaciones basadas en inquietudes del paciente
  if (survey.inquietudesCirugia?.includes("miedo_procedimiento")) {
    recommendations.push("Proporcionar información detallada sobre el procedimiento y opciones de anestesia")
  }

  // Si no hay recomendaciones específicas
  if (recommendations.length === 0) {
    recommendations.push("Seguir protocolo estándar de evaluación")
  }

  return recommendations
}

// Función para agrupar pacientes por diagnóstico probable
function groupPatientsByProbableDiagnosis(surveys: PatientSurvey[]): Record<string, PatientSurvey[]> {
  const groups: Record<string, PatientSurvey[]> = {
    "Hernia Inguinal": [],
    "Hernia Umbilical": [],
    "Hernia Incisional": [],
    Vesícula: [],
    Otro: [],
  }

  surveys.forEach((survey) => {
    // Si ya tiene diagnóstico previo, usar ese
    if (survey.diagnosticoPrevio && survey.detallesDiagnostico) {
      if (survey.detallesDiagnostico.toLowerCase().includes("inguinal")) {
        groups["Hernia Inguinal"].push(survey)
      } else if (survey.detallesDiagnostico.toLowerCase().includes("umbilical")) {
        groups["Hernia Umbilical"].push(survey)
      } else if (survey.detallesDiagnostico.toLowerCase().includes("incisional")) {
        groups["Hernia Incisional"].push(survey)
      } else if (
        survey.detallesDiagnostico.toLowerCase().includes("vesícula") ||
        survey.detallesDiagnostico.toLowerCase().includes("vesicula") ||
        survey.detallesDiagnostico.toLowerCase().includes("biliar")
      ) {
        groups["Vesícula"].push(survey)
      } else {
        groups["Otro"].push(survey)
      }
      return
    }

    // Si no tiene diagnóstico previo, inferir por síntomas
    if (survey.sintomas?.includes("bulto_visible")) {
      if (survey.sintomas?.includes("dolor_esfuerzos")) {
        groups["Hernia Inguinal"].push(survey)
      } else {
        groups["Hernia Umbilical"].push(survey)
      }
    } else if (survey.sintomas?.includes("dolor_comidas") || survey.sintomas?.includes("ictericia")) {
      groups["Vesícula"].push(survey)
    } else {
      groups["Otro"].push(survey)
    }
  })

  return groups
}

// Función para identificar pacientes prioritarios
function getPriorityPatients(surveys: PatientSurvey[], threshold = 40): PatientSurvey[] {
  return surveys
    .map((survey) => ({
      survey,
      riskScore: calculateClinicalRiskIndex(survey),
    }))
    .filter((item) => item.riskScore >= threshold)
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((item) => item.survey)
}

// Función para generar insights clínicos
function generateClinicalInsights(surveys: PatientSurvey[]): string[] {
  const insights: string[] = []

  if (surveys.length === 0) return ["No hay datos suficientes para generar insights."]

  // Distribución por diagnóstico
  const diagnosisGroups = groupPatientsByProbableDiagnosis(surveys)
  const totalPatients = surveys.length

  // Encontrar el diagnóstico más común
  let maxCount = 0
  let mostCommonDiagnosis = ""

  Object.entries(diagnosisGroups).forEach(([diagnosis, patients]) => {
    if (patients.length > maxCount) {
      maxCount = patients.length
      mostCommonDiagnosis = diagnosis
    }
  })

  if (mostCommonDiagnosis && maxCount > 0) {
    const percentage = Math.round((maxCount / totalPatients) * 100)
    insights.push(`El diagnóstico más común es ${mostCommonDiagnosis} (${percentage}% de los pacientes).`)
  }

  // Analizar severidad
  const severeCount = surveys.filter((s) => s.severidadCondicion === "severa").length
  if (severeCount > 0) {
    const percentage = Math.round((severeCount / totalPatients) * 100)
    insights.push(`El ${percentage}% de los pacientes reporta síntomas severos.`)
  }

  // Analizar dolor
  const highPainCount = surveys.filter((s) => s.intensidadDolor >= 7).length
  if (highPainCount > 0) {
    const percentage = Math.round((highPainCount / totalPatients) * 100)
    insights.push(`El ${percentage}% de los pacientes reporta dolor intenso (≥7/10).`)
  }

  // Analizar comorbilidades
  const withComorbiditiesCount = surveys.filter((s) => s.comorbilidades && s.comorbilidades.length > 0).length
  if (withComorbiditiesCount > 0) {
    const percentage = Math.round((withComorbiditiesCount / totalPatients) * 100)
    insights.push(`El ${percentage}% de los pacientes presenta al menos una comorbilidad.`)
  }

  // Analizar urgencia
  const urgentCount = surveys.filter((s) => s.plazoDeseado === "urgente").length
  if (urgentCount > 0) {
    const percentage = Math.round((urgentCount / totalPatients) * 100)
    insights.push(`El ${percentage}% de los pacientes desea atención urgente.`)
  }

  // Pacientes prioritarios
  const priorityPatients = getPriorityPatients(surveys)
  if (priorityPatients.length > 0) {
    const percentage = Math.round((priorityPatients.length / totalPatients) * 100)
    insights.push(`El ${percentage}% de los pacientes requiere atención prioritaria según criterios clínicos.`)
  }

  return insights
}

interface MedicalSurveyAnalysisDesktopProps {
  surveys?: PatientSurvey[]
  title?: string
  description?: string
}

export function MedicalSurveyAnalysisDesktop({
  surveys = mockSurveys,
  title = "Análisis Clínico de Encuestas",
  description = "Análisis médico detallado de los datos recopilados en las encuestas de pacientes",
}: MedicalSurveyAnalysisDesktopProps) {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDiagnostico, setSelectedDiagnostico] = useState("todos")
  const [selectedDoctor, setSelectedDoctor] = useState("todos")
  const [selectedEdad, setSelectedEdad] = useState("todos")
  const [selectedPeriodo, setSelectedPeriodo] = useState("mes")

  // Estado para la categoría activa
  const [activeCategory, setActiveCategory] = useState("symptoms")

  // Estado para el diagnóstico seleccionado
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("all")

  // Estado para el rango de edad
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 80])

  // Estado para el rango de fechas
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined)

  // Estado para la severidad seleccionada
  const [selectedSeverity, setSelectedSeverity] = useState("all")

  // Estado para carga
  const [isLoading, setIsLoading] = useState(false)

  // Estado para pacientes filtrados
  const [filteredSurveys, setFilteredSurveys] = useState<PatientSurvey[]>(surveys)

  // Estado para pacientes prioritarios
  const [priorityPatients, setPriorityPatients] = useState<PatientSurvey[]>([])

  // Estado para insights clínicos
  const [clinicalInsights, setClinicalInsights] = useState<string[]>([])

  // Estado para pacientes guardados
  const [savedPatients, setSavedPatients] = useState<number[]>([])

  // Filtrar pacientes prioritarios basados en la búsqueda
  const filteredPatients = sampleData.pacientesPrioritarios.filter(
    (patient) =>
      patient.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Efecto para aplicar filtros y calcular estadísticas
  useEffect(() => {
    setIsLoading(true)

    // Aplicar filtros
    const filtered = surveys.filter((survey) => {
      // Filtro por diagnóstico
      if (selectedDiagnosis !== "all") {
        const diagnosisGroups = groupPatientsByProbableDiagnosis([survey])
        if (diagnosisGroups[selectedDiagnosis].length === 0) {
          return false
        }
      }

      // Filtro por edad
      if (survey.edad < ageRange[0] || survey.edad > ageRange[1]) {
        return false
      }

      // Filtro por severidad
      if (selectedSeverity !== "all" && survey.severidadCondicion !== selectedSeverity) {
        return false
      }

      // Filtro por fecha
      if (dateRange && survey.submittedAt) {
        const surveyDate = new Date(survey.submittedAt)
        if (surveyDate < dateRange.from || surveyDate > dateRange.to) {
          return false
        }
      }

      return true
    })

    setFilteredSurveys(filtered)

    // Calcular estadísticas
    setPriorityPatients(getPriorityPatients(filtered))
    setClinicalInsights(generateClinicalInsights(filtered))

    setIsLoading(false)
  }, [surveys, selectedDiagnosis, ageRange, selectedSeverity, dateRange])

  // Función para exportar datos
  const handleExportData = (format: string) => {
    try {
      let data: string
      let mimeType: string
      let filename: string

      if (format === "csv") {
        // Crear CSV con campos relevantes para análisis médico
        const headers = [
          "Nombre",
          "Apellidos",
          "Edad",
          "Diagnóstico",
          "Severidad",
          "Intensidad Dolor",
          "Duración",
          "Síntomas",
          "Comorbilidades",
          "Índice de Riesgo",
        ].join(",")

        const rows = filteredSurveys.map((survey) => {
          const diagnosis = survey.diagnosticoPrevio ? survey.detallesDiagnostico : "Sin diagnóstico previo"
          const symptoms = survey.sintomas?.map((s) => SYMPTOM_LABELS[s]).join(";") || ""
          const comorbidities = survey.comorbilidades?.map((c) => COMORBIDITY_LABELS[c]).join(";") || ""
          const riskIndex = calculateClinicalRiskIndex(survey)

          return [
            survey.nombre,
            survey.apellidos,
            survey.edad,
            diagnosis,
            SEVERITY_LABELS[survey.severidadCondicion || ""] || "",
            survey.intensidadDolor,
            DURATION_LABELS[survey.duracionSintomas || ""] || "",
            symptoms,
            comorbidities,
            riskIndex,
          ].join(",")
        })

        data = [headers, ...rows].join("\n")
        mimeType = "text/csv;charset=utf-8;"
        filename = `analisis_clinico_${new Date().toISOString().split("T")[0]}.csv`
      } else if (format === "json") {
        // Crear JSON con datos enriquecidos para análisis médico
        const enrichedData = filteredSurveys.map((survey) => {
          const riskIndex = calculateClinicalRiskIndex(survey)
          const riskLevel = getRiskLevel(riskIndex)
          const recommendations = getClinicalRecommendations(survey)

          return {
            paciente: {
              nombre: survey.nombre,
              apellidos: survey.apellidos,
              edad: survey.edad,
              contacto: {
                telefono: survey.telefono,
                email: survey.email,
              },
            },
            clinico: {
              diagnosticoPrevio: survey.diagnosticoPrevio,
              detallesDiagnostico: survey.detallesDiagnostico,
              sintomas: survey.sintomas?.map((s) => ({
                codigo: s,
                descripcion: SYMPTOM_LABELS[s],
              })),
              duracion: {
                codigo: survey.duracionSintomas,
                descripcion: DURATION_LABELS[survey.duracionSintomas || ""],
              },
              severidad: {
                codigo: survey.severidadCondicion,
                descripcion: SEVERITY_LABELS[survey.severidadCondicion || ""],
              },
              intensidadDolor: survey.intensidadDolor,
              limitacionFuncional: {
                codigo: survey.limitacionFuncional,
                descripcion: LIMITATION_LABELS[survey.limitacionFuncional || ""],
              },
              comorbilidades: survey.comorbilidades?.map((c) => ({
                codigo: c,
                descripcion: COMORBIDITY_LABELS[c],
              })),
            },
            analisis: {
              indiceRiesgo: riskIndex,
              nivelRiesgo: riskLevel.level,
              recomendaciones: recommendations,
            },
            preferencias: {
              plazoDeseado: {
                codigo: survey.plazoDeseado,
                descripcion: TIMEFRAME_LABELS[survey.plazoDeseado || ""],
              },
              inquietudes: survey.inquietudesCirugia?.map((c) => ({
                codigo: c,
                descripcion: CONCERN_LABELS[c],
              })),
              factoresImportantes: survey.factoresImportantes?.map((f) => ({
                codigo: f,
                descripcion: f,
              })),
            },
          }
        })

        data = JSON.stringify(enrichedData, null, 2)
        mimeType = "application/json;charset=utf-8;"
        filename = `analisis_clinico_${new Date().toISOString().split("T")[0]}.json`
      } else {
        toast.error("Formato no soportado")
        return
      }

      // Crear y descargar el archivo
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Datos exportados en formato ${format.toUpperCase()}`)
    } catch (error) {
      console.error("Error al exportar datos:", error)
      toast.error("Error al exportar los datos")
    }
  }

  // Función para compartir informe
  const handleShareReport = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Análisis Clínico de Encuestas",
          text: "Aquí está el análisis clínico de las encuestas de pacientes",
          url: window.location.href,
        })
        .then(() => toast.success("Informe compartido correctamente"))
        .catch((error) => {
          console.error("Error al compartir:", error)
          toast.error("Error al compartir el informe")
        })
    } else {
      // Fallback para navegadores que no soportan Web Share API
      navigator.clipboard
        .writeText(window.location.href)
        .then(() => toast.success("URL copiada al portapapeles"))
        .catch(() => toast.error("Error al copiar la URL"))
    }
  }

  // Función para guardar/destacar paciente
  const toggleSavePatient = (patientId: number) => {
    setSavedPatients((prev) => {
      if (prev.includes(patientId)) {
        return prev.filter((id) => id !== patientId)
      } else {
        return [...prev, patientId]
      }
    })

    toast.success(
      savedPatients.includes(patientId) ? "Paciente eliminado de destacados" : "Paciente añadido a destacados",
    )
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
            </PopoverContent>
          </Popover>

          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Nivel de Satisfacción</CardTitle>
            <CardDescription>Distribución de satisfacción de pacientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sampleData.satisfaccion}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {sampleData.satisfaccion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Tiempo de Espera</CardTitle>
            <CardDescription>Distribución de tiempos de espera reportados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleData.tiempoEspera} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Tendencias Temporales</CardTitle>
            <CardDescription>Evolución de métricas clave en el tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sampleData.tendencias} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="satisfaccion" stroke="#8884d8" activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="tiempoEspera" stroke="#82ca9d" />
                  <Line type="monotone" dataKey="recomendacion" stroke="#ffc658" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Pacientes Prioritarios</CardTitle>
                <CardDescription>Pacientes que requieren seguimiento prioritario</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[200px]"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">Filtros</h4>
                      <div className="space-y-1">
                        <label className="text-sm">Diagnóstico</label>
                        <Select value={selectedDiagnostico} onValueChange={setSelectedDiagnostico}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="hipertension">Hipertensión</SelectItem>
                            <SelectItem value="diabetes">Diabetes</SelectItem>
                            <SelectItem value="artritis">Artritis</SelectItem>
                            <SelectItem value="epoc">EPOC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm">Edad</label>
                        <Select value={selectedEdad} onValueChange={setSelectedEdad}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="50-60">50-60</SelectItem>
                            <SelectItem value="60-70">60-70</SelectItem>
                            <SelectItem value="70+">70+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Paciente</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead>Prioridad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>
                          <div className="font-medium">{patient.nombre}</div>
                          <div className="text-sm text-muted-foreground">{patient.edad} años</div>
                        </TableCell>
                        <TableCell>{patient.diagnostico}</TableCell>
                        <TableCell>{format(new Date(patient.ultimaVisita), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={patient.nivelPrioridad === "Alto" ? "destructive" : "outline"}>
                              {patient.nivelPrioridad}
                            </Badge>
                            <Progress value={patient.puntuacion} className="h-2 w-16" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No se encontraron pacientes que coincidan con la búsqueda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Comentarios Recientes</CardTitle>
                <CardDescription>Últimos comentarios de pacientes</CardDescription>
              </div>
              <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Periodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Última semana</SelectItem>
                  <SelectItem value="mes">Último mes</SelectItem>
                  <SelectItem value="trimestre">Último trimestre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {sampleData.comentariosRecientes.map((comentario) => (
                  <div key={comentario.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{comentario.paciente}</div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(comentario.fecha), "dd/MM/yyyy")}
                      </div>
                    </div>
                    <p className="mt-1 text-sm">{comentario.comentario}</p>
                    <div className="mt-2">
                      <Badge
                        variant={
                          comentario.sentimiento === "positivo"
                            ? "default"
                            : comentario.sentimiento === "negativo"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {comentario.sentimiento === "positivo" && <CheckCircle className="mr-1 h-3 w-3" />}
                        {comentario.sentimiento === "negativo" && <AlertTriangle className="mr-1 h-3 w-3" />}
                        {comentario.sentimiento.charAt(0).toUpperCase() + comentario.sentimiento.slice(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Métricas Clave</CardTitle>
          <CardDescription>Resumen de indicadores principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Encuestas</div>
                <div className="text-2xl font-bold">1,248</div>
                <div className="text-xs text-green-600">+12.5% vs mes anterior</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Satisfacción Media</div>
                <div className="text-2xl font-bold">87%</div>
                <div className="text-xs text-green-600">+3.2% vs mes anterior</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tiempo Espera Medio</div>
                <div className="text-2xl font-bold">24 min</div>
                <div className="text-xs text-red-600">+2 min vs mes anterior</div>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="rounded-full bg-primary/10 p-2">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Tasa Respuesta</div>
                <div className="text-2xl font-bold">68%</div>
                <div className="text-xs text-green-600">+5.4% vs mes anterior</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
