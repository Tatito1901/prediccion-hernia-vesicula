"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
} from "recharts"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  Download,
  Filter,
  Users,
  Clock,
  Activity,
  AlertTriangle,
  Stethoscope,
  HeartPulse,
  ArrowUpRight,
  BarChart2,
  Zap,
  Bookmark,
  BookmarkCheck,
  CalendarIcon,
  CheckCircle,
  Loader2,
} from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { PatientSurvey } from "@/app/dashboard/data-model"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"

// Colores para gráficos - Paleta profesional
const COLORS = [
  "#4361ee",
  "#3a0ca3",
  "#7209b7",
  "#f72585",
  "#4cc9f0",
  "#4895ef",
  "#560bad",
  "#b5179e",
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
]

// Datos de muestra para pruebas
const mockSurveys: PatientSurvey[] = [
  // ... datos de muestra existentes
]

// Datos de ejemplo (los mismos que en la versión de escritorio)
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

// Categorías clínicas para análisis - Simplificadas para móvil
const CLINICAL_CATEGORIES = [
  { id: "overview", label: "Resumen", icon: BarChart2, mobileLabel: "Resumen" },
  { id: "symptoms", label: "Síntomas", icon: Stethoscope, mobileLabel: "Síntomas" },
  { id: "severity", label: "Severidad", icon: Activity, mobileLabel: "Severidad" },
  { id: "comorbidities", label: "Comorbilidades", icon: HeartPulse, mobileLabel: "Comorbil." },
  { id: "demographics", label: "Demografía", icon: Users, mobileLabel: "Demog." },
  { id: "insights", label: "Insights", icon: Zap, mobileLabel: "Insights" },
]

// Mapeo de síntomas a nombres legibles
const SYMPTOM_LABELS: Record<string, string> = {
  dolor_abdominal: "Dolor abdominal",
  bulto_visible: "Bulto visible",
  ictericia: "Ictericia",
  limitacion_movimiento: "Limitación movimiento",
  nauseas: "Náuseas",
  dolor_comidas: "Dolor post-comida",
  pesadez: "Pesadez",
  distension: "Distensión",
  dolor_esfuerzos: "Dolor con esfuerzos",
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
  menos_1_mes: "< 1 mes",
  "1_3_meses": "1-3 meses",
  "3_6_meses": "3-6 meses",
  "6_12_meses": "6-12 meses",
  mas_1_anio: "> 1 año",
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

interface MedicalSurveyAnalysisMobileProps {
  surveys?: PatientSurvey[]
  title?: string
  description?: string
}

export function MedicalSurveyAnalysisMobile() {
  // Add this at the top of your component
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    summary: true,
    diagnosis: false,
    severity: false,
    priority: false,
    insights: false,
  })

  // Create refs for each section
  const diagnosisRef = useRef<HTMLDivElement>(null)
  const severityRef = useRef<HTMLDivElement>(null)
  const priorityRef = useRef<HTMLDivElement>(null)
  const insightsRef = useRef<HTMLDivElement>(null)

  // Estado para la categoría activa
  const [activeCategory, setActiveCategory] = useState("overview")

  // Add a state to track which tabs have been visited
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    overview: true, // Start with overview tab as visited
  })

  // Estado para el diagnóstico seleccionado
  const [selectedDiagnosis, setSelectedDiagnosis] = useState("all")

  // Estado para el rango de edad
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 80])

  // Estado para la severidad seleccionada
  const [selectedSeverity, setSelectedSeverity] = useState("all")

  // Estado para carga
  const [isLoading, setIsLoading] = useState(false)

  // Estado para pacientes filtrados
  const [filteredSurveys, setFilteredSurveys] = useState<PatientSurvey[]>(mockSurveys)

  // Estado para pacientes prioritarios
  const [priorityPatients, setPriorityPatients] = useState<PatientSurvey[]>([])

  // Estado para insights clínicos
  const [clinicalInsights, setClinicalInsights] = useState<string[]>([])

  // Estado para mostrar filtros
  const [showFilters, setShowFilters] = useState(false)

  // Estado para pacientes guardados
  const [savedPatients, setSavedPatients] = useState<number[]>([])

  const [date, setDate] = useState<Date | undefined>(new Date())
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDiagnostico, setSelectedDiagnostico] = useState("todos")
  const [selectedDoctor, setSelectedDoctor] = useState("todos")
  const [selectedEdad, setSelectedEdad] = useState("todos")
  const [selectedPeriodo, setSelectedPeriodo] = useState("mes")
  const [activeTab, setActiveTab] = useState("metricas")

  // Filtrar pacientes prioritarios basados en la búsqueda
  const filteredPatients = sampleData.pacientesPrioritarios.filter(
    (patient) =>
      patient.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Memoize expensive calculations
  const symptomCounts = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredSurveys.forEach((survey) => {
      survey.sintomas?.forEach((symptom) => {
        counts[symptom] = (counts[symptom] || 0) + 1
      })
    })

    return counts
  }, [filteredSurveys])

  // Use the memoized result in rendering
  const sortedSymptoms = useMemo(() => {
    return Object.entries(symptomCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([symptom, count]) => ({
        name: SYMPTOM_LABELS[symptom] || symptom,
        value: count,
        percentage: (count / filteredSurveys.length) * 100,
      }))
  }, [symptomCounts, filteredSurveys.length])

  // Efecto para aplicar filtros y calcular estadísticas
  useEffect(() => {
    setIsLoading(true)

    // Aplicar filtros
    const filtered = mockSurveys.filter((survey) => {
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

      return true
    })

    setFilteredSurveys(filtered)

    // Calcular estadísticas
    setPriorityPatients(getPriorityPatients(filtered))
    setClinicalInsights(generateClinicalInsights(filtered))

    setIsLoading(false)
  }, [mockSurveys, selectedDiagnosis, ageRange, selectedSeverity])

  // Función para exportar datos
  const handleExportData = useCallback(() => {
    try {
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
        const comorbidities = survey.comorbilidades?.map((c) => c).join(";") || ""
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

      const data = [headers, ...rows].join("\n")
      const mimeType = "text/csv;charset=utf-8;"
      const filename = `analisis_clinico_${new Date().toISOString().split("T")[0]}.csv`

      // Crear y descargar el archivo
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Datos exportados correctamente")
    } catch (error) {
      console.error("Error al exportar datos:", error)
      toast.error("Error al exportar los datos")
    }
  }, [filteredSurveys])

  // Función para compartir informe
  const handleShareReport = useCallback(() => {
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
  }, [])

  // Función para guardar/destacar paciente
  const toggleSavePatient = useCallback(
    (patientId: number) => {
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
    },
    [savedPatients],
  )

  // Update the tab change handler
  const handleTabChange = (tabId: string) => {
    setActiveCategory(tabId)
    setVisitedTabs((prev) => ({
      ...prev,
      [tabId]: true,
    }))
  }

  // Set up intersection observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id
            setVisibleSections((prev) => ({
              ...prev,
              [id]: true,
            }))
          }
        })
      },
      { threshold: 0.1 },
    )

    // Observe all section refs
    if (diagnosisRef.current) observer.observe(diagnosisRef.current)
    if (severityRef.current) observer.observe(severityRef.current)
    if (priorityRef.current) observer.observe(priorityRef.current)
    if (insightsRef.current) observer.observe(insightsRef.current)

    return () => observer.disconnect()
  }, [])

  // Renderizar tarjetas de resumen
  const renderSummaryCards = () => {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-0 shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardDescription className="text-xs">Pacientes</CardDescription>
            <CardTitle className="text-xl">{filteredSurveys.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground">
              {Math.round((filteredSurveys.length / mockSurveys.length) * 100)}% del total
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-0 shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardDescription className="text-xs">Edad Media</CardDescription>
            <CardTitle className="text-xl">
              {filteredSurveys.length > 0
                ? Math.round(filteredSurveys.reduce((sum, s) => sum + s.edad, 0) / filteredSurveys.length)
                : 0}{" "}
              años
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground">
              {filteredSurveys.filter((s) => s.edad > 60).length} pacientes &gt;60 años
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-0 shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardDescription className="text-xs">Dolor Promedio</CardDescription>
            <CardTitle className="text-xl">
              {filteredSurveys.length > 0
                ? (filteredSurveys.reduce((sum, s) => sum + s.intensidadDolor, 0) / filteredSurveys.length).toFixed(1)
                : 0}
              /10
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground">
              {filteredSurveys.filter((s) => s.intensidadDolor >= 7).length} con dolor severo
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-0 shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardDescription className="text-xs">Prioritarios</CardDescription>
            <CardTitle className="text-xl">{priorityPatients.length}</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xs text-muted-foreground">
              {Math.round((priorityPatients.length / filteredSurveys.length) * 100)}% de los filtrados
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Renderizar distribución de diagnósticos
  const renderDiagnosisDistribution = () => {
    const diagnosisGroups = groupPatientsByProbableDiagnosis(filteredSurveys)
    const data = Object.entries(diagnosisGroups).map(([name, patients]) => ({
      name,
      value: patients.length,
    }))

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Distribución por Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={70}
                  innerRadius={0}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => (percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : "")}
                  strokeWidth={1}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value}`, "Cantidad"]}
                  contentStyle={{ fontSize: "10px" }}
                  itemStyle={{ fontSize: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Renderizar distribución de severidad
  const renderSeverityDistribution = () => {
    const severityCounts = {
      leve: filteredSurveys.filter((s) => s.severidadCondicion === "leve").length,
      moderada: filteredSurveys.filter((s) => s.severidadCondicion === "moderada").length,
      severa: filteredSurveys.filter((s) => s.severidadCondicion === "severa").length,
    }

    const total = filteredSurveys.length
    const data = [
      { name: "Leve", value: severityCounts.leve },
      { name: "Moderada", value: severityCounts.moderada },
      { name: "Severa", value: severityCounts.severa },
    ]

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Distribución por Severidad</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            {Object.entries(severityCounts).map(([severity, count]) => {
              const percentage = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={severity} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{SEVERITY_LABELS[severity]}</span>
                    <span>
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        severity === "severa" ? "bg-red-500" : severity === "moderada" ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Renderizar pacientes prioritarios
  const renderPriorityPatients = () => {
    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Pacientes Prioritarios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {priorityPatients.length > 0 ? (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 p-4 pt-2">
                {priorityPatients.slice(0, 5).map((patient, index) => {
                  const riskIndex = calculateClinicalRiskIndex(patient)
                  const riskLevel = getRiskLevel(riskIndex)

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-medium truncate">
                            {patient.nombre} {patient.apellidos}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => toggleSavePatient(patient.id || index)}
                          >
                            {savedPatients.includes(patient.id || index) ? (
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            ) : (
                              <Bookmark className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {patient.edad} años -{" "}
                          {patient.diagnosticoPrevio ? patient.detallesDiagnostico : "Sin diagnóstico"}
                        </div>
                      </div>
                      <Badge variant={riskLevel.color as "default" | "destructive" | "outline"}>
                        {riskLevel.level}
                      </Badge>
                    </div>
                  )
                })}

                {priorityPatients.length > 5 && (
                  <Button variant="ghost" className="w-full text-xs" size="sm">
                    Ver {priorityPatients.length - 5} más
                  </Button>
                )}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-32 p-4">
              <p className="text-muted-foreground text-sm text-center">
                No hay pacientes prioritarios según los criterios actuales
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Renderizar insights clínicos
  const renderClinicalInsights = () => {
    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Insights Clínicos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {clinicalInsights.length > 0 ? (
            <ul className="space-y-2">
              {clinicalInsights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">No hay suficientes datos para generar insights clínicos.</p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Renderizar síntomas principales
  const renderTopSymptoms = () => {
    const symptomCounts: Record<string, number> = {}

    filteredSurveys.forEach((survey) => {
      survey.sintomas?.forEach((symptom) => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
      })
    })

    const sortedSymptoms = Object.entries(symptomCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, 5)
      .map(([symptom, count]) => ({
        name: SYMPTOM_LABELS[symptom] || symptom,
        value: count,
        percentage: (count / filteredSurveys.length) * 100,
      }))

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Síntomas Principales</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="space-y-3">
            {sortedSymptoms.map((item, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span>
                    {item.value} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}

            {sortedSymptoms.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay datos de síntomas disponibles.</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Renderizar perfil de síntomas
  const renderSymptomProfile = () => {
    const symptomCounts: Record<string, number> = {}

    filteredSurveys.forEach((survey) => {
      survey.sintomas?.forEach((symptom) => {
        symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1
      })
    })

    const data = Object.entries(symptomCounts)
      .map(([symptom, count]) => ({
        symptom: SYMPTOM_LABELS[symptom] || symptom,
        value: (count / filteredSurveys.length) * 100,
        fullMark: 100,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Perfil de Síntomas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart outerRadius={80} data={data}>
                <PolarGrid />
                <PolarAngleAxis dataKey="symptom" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Frecuencia (%)" dataKey="value" stroke="#4361ee" fill="#4361ee" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Renderizar distribución por edad
  const renderAgeDistribution = () => {
    const ageGroups = {
      "18-30": filteredSurveys.filter((s) => s.edad >= 18 && s.edad <= 30).length,
      "31-45": filteredSurveys.filter((s) => s.edad >= 31 && s.edad <= 45).length,
      "46-60": filteredSurveys.filter((s) => s.edad >= 46 && s.edad <= 60).length,
      "61-75": filteredSurveys.filter((s) => s.edad >= 61 && s.edad <= 75).length,
      "76+": filteredSurveys.filter((s) => s.edad >= 76).length,
    }

    const data = Object.entries(ageGroups).map(([name, value]) => ({ name, value }))

    return (
      <Card className="shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base">Distribución por Edad</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} width={25} />
                <Tooltip contentStyle={{ fontSize: "10px" }} itemStyle={{ fontSize: "10px" }} />
                <Bar dataKey="value" fill="#4361ee" radius={[4, 4, 0, 0]} animationDuration={500} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Renderizar filtros
  const renderFilters = () => {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Filtros Clínicos</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 py-4">
            {/* Filtro por diagnóstico */}
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico Probable</Label>
              <Select value={selectedDiagnosis} onValueChange={setSelectedDiagnosis}>
                <SelectTrigger id="diagnosis">
                  <SelectValue placeholder="Todos los diagnósticos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los diagnósticos</SelectItem>
                  <SelectItem value="Hernia Inguinal">Hernia Inguinal</SelectItem>
                  <SelectItem value="Hernia Umbilical">Hernia Umbilical</SelectItem>
                  <SelectItem value="Hernia Incisional">Hernia Incisional</SelectItem>
                  <SelectItem value="Vesícula">Vesícula</SelectItem>
                  <SelectItem value="Otro">Otros diagnósticos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por rango de edad */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rango de Edad</Label>
                <span className="text-sm text-muted-foreground">
                  {ageRange[0]} - {ageRange[1]} años
                </span>
              </div>
              <Slider
                value={ageRange}
                min={18}
                max={100}
                step={1}
                onValueChange={(value) => setAgeRange(value as [number, number])}
              />
            </div>

            {/* Filtro por severidad */}
            <div className="space-y-2">
              <Label htmlFor="severity">Severidad</Label>
              <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                <SelectTrigger id="severity">
                  <SelectValue placeholder="Todas las severidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las severidades</SelectItem>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="severa">Severa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Estadísticas de filtrado */}
            <div className="space-y-4">
              <h3 className="font-medium">Resumen de Filtros</h3>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total de pacientes:</span>
                  <span className="font-medium">{mockSurveys.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pacientes filtrados:</span>
                  <span className="font-medium">{filteredSurveys.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Pacientes prioritarios:</span>
                  <span className="font-medium">{priorityPatients.length}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSelectedDiagnosis("all")
                  setAgeRange([18, 80])
                  setSelectedSeverity("all")
                }}
              >
                Restablecer Filtros
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  // Renderizar acciones
  const renderActions = () => {
    return (
      <div className="flex gap-2">
        {renderFilters()}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56">
            <div className="grid gap-2">
              <Button variant="ghost" className="justify-start" onClick={handleExportData}>
                Exportar como CSV
              </Button>
              <Button variant="ghost" className="justify-start" onClick={handleShareReport}>
                Compartir informe
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Cabecera con título y acciones */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Análisis Clínico</h1>
            <p className="text-sm text-muted-foreground">Análisis médico de encuestas de pacientes</p>
          </div>

          {renderActions()}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight">Análisis de Encuestas</h1>
        <div className="flex items-center justify-between">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs">
                <CalendarIcon className="mr-1 h-3 w-3" />
                {date ? format(date, "dd/MM/yy", { locale: es }) : "Fecha"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
            </PopoverContent>
          </Popover>

          <Button variant="outline" size="sm" className="h-8 text-xs">
            <Download className="mr-1 h-3 w-3" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Pestañas para diferentes categorías clínicas */}
      <Tabs value={activeCategory} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-6 h-auto p-1">
          {CLINICAL_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex flex-col items-center py-2 px-1 h-auto text-xs"
            >
              <category.icon className="h-4 w-4 mb-1" />
              <span>{category.mobileLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Contenido de la pestaña de resumen */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {renderSummaryCards()}
          <div id="diagnosis" ref={diagnosisRef}>
            {visibleSections.diagnosis ? (
              renderDiagnosisDistribution()
            ) : (
              <Card className="shadow-sm h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </Card>
            )}
          </div>
          <div id="priority" ref={priorityRef}>
            {visibleSections.priority ? (
              renderPriorityPatients()
            ) : (
              <Card className="shadow-sm h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </Card>
            )}
          </div>
          <div id="insights" ref={insightsRef}>
            {visibleSections.insights ? (
              renderClinicalInsights()
            ) : (
              <Card className="shadow-sm h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Contenido de la pestaña de síntomas */}
        <TabsContent value="symptoms" className="space-y-4 mt-4">
          {visitedTabs.symptoms ? (
            <>
              {renderTopSymptoms()}
              {renderSymptomProfile()}
              <Card className="shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-base">Hallazgos Clínicos</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="text-sm py-2">Hernia Inguinal</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          <p>• Predomina la presencia de bulto visible (95%) y dolor abdominal (65%).</p>
                          <p>• Aumento del dolor durante esfuerzos físicos (85%).</p>
                          <p>• Limitación funcional moderada en el 45% de los casos.</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger className="text-sm py-2">Hernia Umbilical</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          <p>• Alta frecuencia de bulto visible (90%) y dolor abdominal (75%).</p>
                          <p>• Distensión abdominal significativa (60%).</p>
                          <p>• Menor asociación con esfuerzos físicos (40%).</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger className="text-sm py-2">Vesícula</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm">
                          <p>• Caracterizada por dolor abdominal (90%) y náuseas (80%).</p>
                          <p>• Dolor post-prandial (85%) altamente específico.</p>
                          <p>• Ictericia en casos avanzados (40%).</p>
                          <p>• Mayor intensidad de dolor promedio (7.5/10).</p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>

        {/* Contenido de la pestaña de severidad */}
        <TabsContent value="severity" className="space-y-4 mt-4">
          <div id="severity" ref={severityRef}>
            {visibleSections.severity ? (
              renderSeverityDistribution()
            ) : (
              <Card className="shadow-sm h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </Card>
            )}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Intensidad del Dolor</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Promedio general:</span>
                  <Badge variant="outline" className="font-mono">
                    {filteredSurveys.length > 0
                      ? (
                          filteredSurveys.reduce((sum, s) => sum + s.intensidadDolor, 0) / filteredSurveys.length
                        ).toFixed(1)
                      : "0"}
                    /10
                  </Badge>
                </div>

                <div className="space-y-2">
                  {["Hernia Inguinal", "Hernia Umbilical", "Vesícula"].map((diagnosis) => {
                    const patients = groupPatientsByProbableDiagnosis(filteredSurveys)[diagnosis]
                    const avgPain =
                      patients.length > 0
                        ? patients.reduce((sum, p) => sum + p.intensidadDolor, 0) / patients.length
                        : 0

                    return (
                      <div key={diagnosis} className="flex items-center justify-between">
                        <span className="text-sm">{diagnosis}:</span>
                        <Badge
                          variant={avgPain >= 7 ? "destructive" : avgPain >= 4 ? "default" : "outline"}
                          className="font-mono"
                        >
                          {avgPain.toFixed(1)}/10
                        </Badge>
                      </div>
                    )
                  })}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="text-sm font-medium">Distribución de intensidad</div>

                  {[
                    { label: "Leve (1-3)", range: [1, 3] },
                    { label: "Moderado (4-6)", range: [4, 6] },
                    { label: "Severo (7-10)", range: [7, 10] },
                  ].map((category) => {
                    const count = filteredSurveys.filter(
                      (s) => s.intensidadDolor >= category.range[0] && s.intensidadDolor <= category.range[1],
                    ).length
                    const percentage = filteredSurveys.length > 0 ? (count / filteredSurveys.length) * 100 : 0

                    return (
                      <div key={category.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{category.label}</span>
                          <span>
                            {count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              category.label.includes("Severo")
                                ? "bg-red-500"
                                : category.label.includes("Moderado")
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {renderPriorityPatients()}
        </TabsContent>

        {/* Contenido de la pestaña de comorbilidades */}
        <TabsContent value="comorbidities" className="space-y-4 mt-4">
          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Comorbilidades Frecuentes</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {["hipertension", "diabetes", "obesidad", "cardiopatia", "hipotiroidismo"].map((comorbidity) => {
                  const count = filteredSurveys.filter((s) => s.comorbilidades?.includes(comorbidity)).length
                  const percentage = filteredSurveys.length > 0 ? (count / filteredSurveys.length) * 100 : 0

                  return (
                    <div key={comorbidity} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{comorbidity.replace("_", " ")}</span>
                        <span>
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Recomendaciones Preoperatorias</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {[
                  { id: "tiempo_recuperacion", label: "Tiempo de recuperación", value: 75 },
                  { id: "miedo_procedimiento", label: "Miedo al procedimiento", value: 65 },
                  { id: "ausencia_laboral", label: "Ausencia laboral", value: 60 },
                  { id: "informacion_insuficiente", label: "Información insuficiente", value: 45 },
                  { id: "dudas_necesidad", label: "Dudas sobre necesidad", value: 40 },
                ].map((item) => {
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de la pestaña de demografía */}
        <TabsContent value="demographics" className="space-y-4 mt-4">
          {renderAgeDistribution()}

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Distribución Geográfica</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={[
                        { name: "CDMX", value: 45 },
                        { name: "Edo. Méx.", value: 35 },
                        { name: "Otros", value: 20 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={70}
                      innerRadius={0}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => (percent > 0.08 ? `${(percent * 100).toFixed(0)}%` : "")}
                      strokeWidth={1}
                    >
                      {[
                        { name: "CDMX", value: 45 },
                        { name: "Edo. Méx.", value: 35 },
                        { name: "Otros", value: 20 },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value}`, "Cantidad"]}
                      contentStyle={{ fontSize: "10px" }}
                      itemStyle={{ fontSize: "10px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Seguro Médico</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-3">
                {[
                  { id: "imss", label: "IMSS", value: 30 },
                  { id: "issste", label: "ISSSTE", value: 20 },
                  { id: "seguro_privado", label: "Seguro Privado", value: 35 },
                  { id: "ninguno", label: "Sin seguro", value: 15 },
                ].map((item) => {
                  return (
                    <div key={item.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de la pestaña de insights */}
        <TabsContent value="insights" className="space-y-4 mt-4">
          {renderClinicalInsights()}

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Plazos Deseados</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Urgente", value: 25 },
                      { name: "30 días", value: 40 },
                      { name: "90 días", value: 25 },
                      { name: "Sin prisa", value: 10 },
                    ]}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                    barSize={20}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} width={25} />
                    <Tooltip contentStyle={{ fontSize: "10px" }} itemStyle={{ fontSize: "10px" }} />
                    <Bar dataKey="value" fill="#4361ee" radius={[4, 4, 0, 0]} animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Inquietudes Principales</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-sm py-2">Tiempo de recuperación</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>• Evaluar control glucémico con HbA1c preoperatoria (objetivo &lt;7%).</p>
                      <p>• Considerar consulta con endocrinología si HbA1c &gt;8%.</p>
                      <p>• Planificar manejo perioperatorio de insulina/hipoglucemiantes.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-sm py-2">Miedo al procedimiento</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>• Verificar control adecuado (objetivo &lt;140/90 mmHg).</p>
                      <p>• Mantener medicación antihipertensiva hasta el día de la cirugía.</p>
                      <p>• Evaluar función renal preoperatoria.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-3">
                  <AccordionTrigger className="text-sm py-2">Ausencia laboral</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>• Evaluar IMC y clasificar riesgo anestésico.</p>
                      <p>• Considerar técnicas quirúrgicas específicas para pacientes obesos.</p>
                      <p>• Evaluar vía aérea y riesgo de apnea obstructiva del sueño.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-4">
                  <AccordionTrigger className="text-sm py-2">Información insuficiente</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>• Evaluar IMC y clasificar riesgo anestésico.</p>
                      <p>• Considerar técnicas quirúrgicas específicas para pacientes obesos.</p>
                      <p>• Evaluar vía aérea y riesgo de apnea obstructiva del sueño.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="item-5">
                  <AccordionTrigger className="text-sm py-2">Dudas sobre necesidad</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p>• Evaluar IMC y clasificar riesgo anestésico.</p>
                      <p>• Considerar técnicas quirúrgicas específicas para pacientes obesos.</p>
                      <p>• Evaluar vía aérea y riesgo de apnea obstructiva del sueño.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="metricas" className="text-xs">
            Métricas
          </TabsTrigger>
          <TabsTrigger value="graficos" className="text-xs">
            Gráficos
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="text-xs">
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="comentarios" className="text-xs">
            Comentarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metricas" className="mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center justify-center rounded-lg border p-3">
              <div className="rounded-full bg-primary/10 p-2 mb-1">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Total Encuestas</div>
              <div className="text-lg font-bold">1,248</div>
              <div className="text-[10px] text-green-600">+12.5%</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-3">
              <div className="rounded-full bg-primary/10 p-2 mb-1">
                <CheckCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Satisfacción</div>
              <div className="text-lg font-bold">87%</div>
              <div className="text-[10px] text-green-600">+3.2%</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-3">
              <div className="rounded-full bg-primary/10 p-2 mb-1">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Tiempo Espera</div>
              <div className="text-lg font-bold">24 min</div>
              <div className="text-[10px] text-red-600">+2 min</div>
            </div>
            <div className="flex flex-col items-center justify-center rounded-lg border p-3">
              <div className="rounded-full bg-primary/10 p-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-xs font-medium text-muted-foreground">Tasa Respuesta</div>
              <div className="text-lg font-bold">68%</div>
              <div className="text-[10px] text-green-600">+5.4%</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="graficos" className="mt-2">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="satisfaccion">
              <AccordionTrigger className="text-sm py-2">Nivel de Satisfacción</AccordionTrigger>
              <AccordionContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <Pie
                        data={sampleData.satisfaccion}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        innerRadius={0}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        strokeWidth={1}
                      >
                        {sampleData.satisfaccion.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}`, "Cantidad"]}
                        contentStyle={{ fontSize: "10px" }}
                        itemStyle={{ fontSize: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1">
                  {sampleData.satisfaccion.map((item, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div className="w-3 h-3 mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      {item.name}: {item.value}%
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tiempoEspera">
              <AccordionTrigger className="text-sm py-2">Tiempo de Espera</AccordionTrigger>
              <AccordionContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sampleData.tiempoEspera}
                      margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      barSize={20}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} width={25} />
                      <Tooltip contentStyle={{ fontSize: "10px" }} itemStyle={{ fontSize: "10px" }} />
                      <Bar dataKey="value" fill="#4361ee" radius={[4, 4, 0, 0]} animationDuration={500} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tendencias">
              <AccordionTrigger className="text-sm py-2">Tendencias Temporales</AccordionTrigger>
              <AccordionContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sampleData.tendencias} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} />
                      <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: "#E5E7EB" }} width={25} />
                      <Tooltip contentStyle={{ fontSize: "10px" }} itemStyle={{ fontSize: "10px" }} />
                      <Line
                        type="monotone"
                        dataKey="satisfaccion"
                        stroke="#4361ee"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                        animationDuration={500}
                      />
                      <Line type="monotone" dataKey="tiempoEspera" stroke="#82ca9d" />
                      <Line type="monotone" dataKey="recomendacion" stroke="#ffc658" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 mr-1 bg-[#4361ee]"></div>
                    Satisfacción
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 mr-1 bg-[#82ca9d]"></div>
                    Tiempo Espera
                  </div>
                  <div className="flex items-center text-xs">
                    <div className="w-3 h-3 mr-1 bg-[#ffc658]"></div>
                    Recomendación
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        <TabsContent value="pacientes" className="mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Input
              placeholder="Buscar paciente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs h-8"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Filter className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-3">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Filtros</h4>
                  <div className="space-y-1">
                    <label className="text-xs">Diagnóstico</label>
                    <Select value={selectedDiagnostico} onValueChange={setSelectedDiagnostico}>
                      <SelectTrigger className="h-8 text-xs">
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
                    <label className="text-xs">Edad</label>
                    <Select value={selectedEdad} onValueChange={setSelectedEdad}>
                      <SelectTrigger className="h-8 text-xs">
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

          <div className="space-y-2">
            {filteredPatients.length > 0 ? (
              filteredPatients.map((patient) => (
                <div key={patient.id} className="rounded-lg border p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{patient.nombre}</div>
                      <div className="text-xs text-muted-foreground">{patient.edad} años</div>
                    </div>
                    <Badge variant={patient.nivelPrioridad === "Alto" ? "destructive" : "outline"} className="text-xs">
                      {patient.nivelPrioridad}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs">{patient.diagnostico}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Última visita: {format(new Date(patient.ultimaVisita), "dd/MM/yyyy")}
                    </div>
                    <Progress value={patient.puntuacion} className="h-1.5 w-16" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">No se encontraron pacientes</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comentarios" className="mt-2">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">Comentarios Recientes</div>
            <Select value={selectedPeriodo} onValueChange={setSelectedPeriodo}>
              <SelectTrigger className="h-8 text-xs w-[110px]">
                <SelectValue placeholder="Periodo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semana">Última semana</SelectItem>
                <SelectItem value="mes">Último mes</SelectItem>
                <SelectItem value="trimestre">Último trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {sampleData.comentariosRecientes.map((comentario) => (
              <div key={comentario.id} className="rounded-lg border p-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{comentario.paciente}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(comentario.fecha), "dd/MM/yy")}
                  </div>
                </div>
                <p className="mt-1 text-xs">{comentario.comentario}</p>
                <div className="mt-1">
                  <Badge
                    variant={
                      comentario.sentimiento === "positivo"
                        ? "default"
                        : comentario.sentimiento === "negativo"
                          ? "destructive"
                          : "outline"
                    }
                    className="text-xs"
                  >
                    {comentario.sentimiento === "positivo" && <CheckCircle className="mr-1 h-2 w-2" />}
                    {comentario.sentimiento === "negativo" && <AlertTriangle className="mr-1 h-2 w-2" />}
                    {comentario.sentimiento.charAt(0).toUpperCase() + comentario.sentimiento.slice(1)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Alerta de privacidad de datos - Simplificada para móvil */}
      <Alert variant="outline" className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm">Privacidad de Datos</AlertTitle>
        <AlertDescription className="text-xs">
          Datos anonimizados y protegidos. Acceso restringido a personal médico autorizado.
        </AlertDescription>
      </Alert>
    </div>
  )
}
