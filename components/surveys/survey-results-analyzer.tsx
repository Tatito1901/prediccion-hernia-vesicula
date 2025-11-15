"use client"

import React from "react"
import { useState, useMemo } from "react"
import { addDays } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  AlertCircle,
  Award,
  ClipboardX,
  Download,
  FileText,
  Gauge,
  Lightbulb,
  PhoneIcon,
  RefreshCcw,
  Share2,
  Shield,
} from "lucide-react"
// ❌ ELIMINADO: import { usePatient } - Ya no es necesario, recibimos datos vía props
import { useCreateAppointment } from '@/hooks/core/use-appointments';
import { usePatientSurvey } from '@/hooks/core/use-patients';
import { AppointmentStatusEnum, type Patient } from '@/lib/types';
import {
  calculateConversionScore,
  generateInsights,
  generateRecommendationCategories,
  calculateSurgeryProbability,
  calculateBenefitRiskRatio,
  generatePersuasivePoints,
} from "@/lib/utils/survey-analyzer-helpers"
// Importar componentes de tabs memoizados
import { ResumenTab } from "./tabs/resumen-tab"
import { ProbabilidadTab } from "./tabs/probabilidad-tab"
import { RecomendacionesTab } from "./tabs/recomendaciones-tab"
import { RiesgosTab } from "./tabs/riesgos-tab"
import { SeguimientoTab } from "./tabs/seguimiento-tab"

interface SurveyResultsAnalyzerProps {
  // ANTES: patient_id: string
  patientData: Patient; // <-- AHORA: Recibe el objeto completo
}

export default function SurveyResultsAnalyzer({ patientData }: SurveyResultsAnalyzerProps): React.ReactElement {
  // ANTES: const { data: patientData, isLoading, error: patientError } = usePatient(patient_id);
  // AHORA: Ya no hay fetching aquí. `patientData` se usa directamente.
  const createAppointment = useCreateAppointment();

  // Fetch survey data for this patient
  const { data: surveyData, isLoading: surveyLoading } = usePatientSurvey(patientData.id); 

  const [modelError, setModelError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('analysis')
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const analysisResult = useMemo(() => {
    if (!patientData || !surveyData) return null;

    // Usar las funciones auxiliares reales en lugar de valores mockeados
    const surgeryProbability = calculateSurgeryProbability(patientData, surveyData);
    const conversionScore = calculateConversionScore(patientData, surveyData);
    const insights = generateInsights(patientData, surveyData);
    const recommendationCategories = generateRecommendationCategories(patientData, surveyData, surgeryProbability);
    const persuasivePoints = generatePersuasivePoints(patientData, surveyData);
    const benefitRiskRatio = calculateBenefitRiskRatio(patientData, surveyData);

    return {
      surgeryProbability,
      conversionScore,
      insights,
      recommendationCategories,
      persuasivePoints,
      benefitRiskRatio
    }
  }, [patientData, surveyData]);

  // Show loading state while fetching survey data
  if (surveyLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando datos de encuesta...</p>
        </div>
      </div>
    );
  }
  
  // Show message if no survey data available
  if (!surveyData || !analysisResult) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">No hay datos de encuesta disponibles para este paciente.</p>
        </div>
      </div>
    );
  }

  // ❌ ELIMINADO: useEffect para patientError - Ya no es necesario porque no hay fetching

  const handleScheduleFollowUp = () => {
    if (!patientData) return;

    const followUpDate = addDays(new Date(), 7);

    createAppointment.mutate({
      patient_id: patientData.id,
      fecha_hora_cita: followUpDate.toISOString(),
      estado_cita: AppointmentStatusEnum.PROGRAMADA,
      motivos_consulta: ['Seguimiento de encuesta pre-quirúrgica'],
      es_primera_vez: false,
    });
  };

  const handleRetryAnalysis = () => {
    // This function might need to trigger a refetch if usePatient doesn't automatically.
    // For now, clearing the error is a good first step.
    setModelError(null);
    // queryClient.invalidateQueries(patientKeys.detail(patient_id)); // If you have queryClient access
  }

  if (modelError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-red-50/50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-semibold text-red-700">Error en el Análisis</p>
        <p className="text-red-600 mb-6">{modelError}</p>
        <Button onClick={handleRetryAnalysis} className="rounded-full bg-red-600 hover:bg-red-700 text-white">
          <RefreshCcw className="w-4 h-4 mr-2" />
          Reintentar Análisis
        </Button>
      </div>
    )
  }

  if (!patientData || !surveyData || !analysisResult) {
    return (
       <div className="flex flex-col items-center justify-center h-96 bg-gray-50/50 p-6 text-center">
        <ClipboardX className="w-12 h-12 text-gray-400 mb-4" />
        <p className="text-lg font-semibold text-gray-700">Datos Insuficientes</p>
        <p className="text-gray-600">No se encontró una encuesta para este paciente o no se pudo completar el análisis.</p>
      </div>
    )
  }

  const { surgeryProbability, insights, recommendationCategories, benefitRiskRatio, persuasivePoints } = analysisResult;

  return (
    <Card className="w-full mx-auto shadow-lg rounded-2xl bg-white/80 backdrop-blur-sm border-gray-200/80">
      <CardHeader className="bg-gradient-to-br from-gray-50 to-gray-100/80 rounded-t-2xl border-b border-gray-200/80 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-100/80 border border-blue-200/80">
              <FileText className="w-7 h-7 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800 tracking-tight">
                Análisis de Encuesta Pre-Quirúrgica
              </CardTitle>
              <CardDescription className="text-gray-500 text-base mt-1">
                Paciente: <span className="font-semibold text-gray-700">{patientData.nombre} {patientData.apellidos}</span>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="rounded-full text-gray-600 hover:bg-gray-100/90 hover:text-gray-800 transition-all duration-200">
              <Download className="w-4 h-4 mr-2" />
              Descargar PDF
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full text-gray-500 hover:bg-gray-100/90 hover:text-gray-700 transition-all duration-200">
              <Share2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="bg-gray-50/80 border-b border-gray-200/80 px-6">
              <TabsList className="grid w-full grid-cols-5 gap-2 bg-transparent p-0">
                <TabsTrigger value="resumen" className="text-base font-semibold rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-transparent transition-all duration-200 py-3">
                  <Award className="w-5 h-5 mr-2" /> Resumen Clave
                </TabsTrigger>
                <TabsTrigger value="probabilidad" className="text-base font-semibold rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-transparent transition-all duration-200 py-3">
                  <Gauge className="w-5 h-5 mr-2" /> Probabilidad
                </TabsTrigger>
                <TabsTrigger value="recomendaciones" className="text-base font-semibold rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-transparent transition-all duration-200 py-3">
                  <Lightbulb className="w-5 h-5 mr-2" /> Recomendaciones
                </TabsTrigger>
                <TabsTrigger value="riesgos" className="text-base font-semibold rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-transparent transition-all duration-200 py-3">
                  <Shield className="w-5 h-5 mr-2" /> Riesgos y Beneficios
                </TabsTrigger>
                <TabsTrigger value="seguimiento" className="text-base font-semibold rounded-t-lg data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border-b-transparent transition-all duration-200 py-3">
                  <PhoneIcon className="w-5 h-5 mr-2" /> Plan de Seguimiento
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumen">
              <ResumenTab
                patientData={patientData}
                surveyData={surveyData}
                insights={insights}
              />
            </TabsContent>

            <TabsContent value="probabilidad">
              <ProbabilidadTab surgeryProbability={surgeryProbability} />
            </TabsContent>

            <TabsContent value="recomendaciones">
              <RecomendacionesTab recommendationCategories={recommendationCategories} />
            </TabsContent>

            <TabsContent value="riesgos">
              <RiesgosTab benefitRiskRatio={benefitRiskRatio} />
            </TabsContent>

            <TabsContent value="seguimiento">
              <SeguimientoTab
                persuasivePoints={persuasivePoints}
                onScheduleFollowUp={handleScheduleFollowUp}
                isScheduling={createAppointment.isPending}
              />
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  )
}
