"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { format, addDays } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Award,
  Calendar,
  Check,
  CheckSquare,
  ClipboardX,
  DollarSign,
  Download,
  FileText,
  Gauge,
  Heart,
  Lightbulb,
  Loader2,
  MessageCircle,
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
// ❌ ELIMINADO: import { usePatient } - Ya no es necesario, recibimos datos vía props
import { useCreateAppointment } from '@/hooks/core/use-appointments';
import { usePatientSurvey } from '@/hooks/core/use-patients';
import { AppointmentStatusEnum, type Appointment, type Patient, type PatientSurveyData } from '@/lib/types';
import {
  calculateConversionScore,
  generateInsights,
  generateRecommendationCategories,
  calculateSurgeryProbability,
  calculateBenefitRiskRatio,
  generatePersuasivePoints,
  type ConversionInsight,
  type RecommendationCategory,
  type PersuasivePoint
} from "@/lib/utils/survey-analyzer-helpers"

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

            <TabsContent value="resumen" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-md rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-700 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-500" />
                      Información del Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600"><strong>Edad:</strong> {patientData.edad} años</p>
                    {/* <p className="text-gray-600"><strong>Género:</strong> {patientData.genero}</p> */}
                    {/* ❌ COMENTADO: 'genero' no existe en el tipo Patient según el esquema de BD */}
                    {/* <p className="text-gray-600"><strong>Motivo:</strong> {surveyData?.motivo_visita}</p> */}
                  </CardContent>
                </Card>
                <Card className="shadow-md rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-semibold text-gray-700 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-green-500" />
                      Estado de Salud General
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* <p className="text-gray-600"><strong>Condiciones Crónicas:</strong> {surveyData.condiciones_medicas_cronicas?.join(', ') || 'Ninguna'}</p> */}
                    {/* <p className="text-gray-600"><strong>Diagnóstico Previo:</strong> {surveyData?.diagnostico_previo ? 'Sí' : 'No'}</p> */}
                  </CardContent>
                </Card>
              </div>
              <Separator className="my-6" />
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Puntos Clave de la Encuesta</h3>
              <div className="space-y-4">
                {insights.map((insight: ConversionInsight) => (
                  <Alert key={insight.id} className={`bg-${insight.impact === 'high' ? 'yellow' : 'blue'}-50/70 border-${insight.impact === 'high' ? 'yellow' : 'blue'}-200/80 shadow-sm rounded-lg`}>
                    <insight.icon className={`w-5 h-5 text-${insight.impact === 'high' ? 'yellow' : 'blue'}-600`} />
                    <AlertTitle className="font-semibold text-gray-800">{insight.title}</AlertTitle>
                    <AlertDescription className="text-gray-600">{insight.description}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="probabilidad" className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col items-center justify-center">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">Probabilidad de Cirugía</h3>
                  <div style={{ width: 200, height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={[{ name: 'Probabilidad', value: surgeryProbability }, { name: 'Resto', value: 1 - surgeryProbability }]}
                          dataKey="value"
                          innerRadius="70%"
                          outerRadius="100%"
                          startAngle={90}
                          endAngle={-270}
                          paddingAngle={0}
                          cornerRadius={10}
                        >
                          <Cell fill="#3b82f6" />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-5xl font-bold text-blue-600 mt-[-120px]">{(surgeryProbability * 100).toFixed(0)}%</p>
                  <p className="text-gray-500 mt-[80px]">Basado en el modelo predictivo</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">Factores Influyentes</h3>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <ThumbsUp className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-700">Severidad de síntomas</span>
                    </div>
                    <div className="flex items-center">
                      <ThumbsUp className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-gray-700">Impacto en calidad de vida</span>
                    </div>
                    <div className="flex items-center">
                      <ThumbsDown className="w-5 h-5 text-red-500 mr-3" />
                      <span className="text-gray-700">Preocupaciones sobre recuperación</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recomendaciones" className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Plan de Acción Sugerido</h3>
              <div className="space-y-4">
                {recommendationCategories.map((category: RecommendationCategory) => (
                  <Accordion key={category.id} type="single" collapsible className="w-full">
                    <AccordionItem value={category.id} className="border rounded-lg shadow-sm">
                      <AccordionTrigger className="px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50/80 rounded-t-lg">
                        <div className="flex items-center">
                          <category.icon className="w-5 h-5 mr-3 text-blue-500" />
                          {category.title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-3 border-t bg-white">
                        <p className="text-gray-600 mb-3">{category.description}</p>
                        <ul className="list-disc list-inside space-y-2 text-gray-700">
                          {category.recommendations.map((rec: string, index: number) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="riesgos" className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Balanza: Beneficios vs. Riesgos</h3>
              <div className="w-full flex flex-col items-center">
                <div className="w-full max-w-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-green-600">Beneficios Potenciales</span>
                    <span className="font-semibold text-red-600">Riesgos Potenciales</span>
                  </div>
                  <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                      style={{ width: `${Math.min(100, (benefitRiskRatio / (benefitRiskRatio + 1)) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500 mt-2">
                    <span>Alivio del dolor, mejora de movilidad</span>
                    <span>Complicaciones, recuperación</span>
                  </div>
                </div>
              </div>
              <Separator className="my-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-lg text-green-700 mb-2">Principales Beneficios</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Reducción significativa y duradera del dolor.</li>
                    <li>Retorno a actividades diarias sin limitaciones.</li>
                    <li>Prevención de complicaciones a largo plazo.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-lg text-red-700 mb-2">Principales Riesgos</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-600">
                    <li>Riesgos inherentes a cualquier procedimiento quirúrgico.</li>
                    <li>Posibilidad de recurrencia de la hernia.</li>
                    <li>Tiempo de recuperación y rehabilitación.</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="seguimiento" className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Plan de Comunicación y Seguimiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-md rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageCircle className="w-5 h-5 mr-2 text-blue-500" />
                      Mensajes Clave
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-gray-600">
                      {persuasivePoints.map(point => (
                        <li key={point.id}>{point.title}: {point.description}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <div className="space-y-6">
                  <Card className="shadow-md rounded-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-green-500" />
                        Agendar Próxima Interacción
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-4">Se recomienda un seguimiento en <strong>7 días</strong> para discutir los resultados y próximos pasos.</p>
                      <Button 
                        onClick={handleScheduleFollowUp} 
                        disabled={createAppointment.isPending}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full transition-all duration-200"
                      >
                        {createAppointment.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Programando...</>
                        ) : (
                          <><CheckSquare className="w-4 h-4 mr-2" /> Programar Llamada de Seguimiento</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                  <Alert className="bg-blue-50/70 border-blue-200/80">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Sugerencia</AlertTitle>
                    <AlertDescription>
                      Envíe un resumen por correo electrónico al paciente con los puntos más importantes y el plan de acción.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            </TabsContent>
          </Tabs>
      </CardContent>
    </Card>
  )
}
