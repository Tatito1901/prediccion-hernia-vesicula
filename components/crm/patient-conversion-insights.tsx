"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, Lightbulb, Tag, MessageSquare } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"
import { surgeryPredictionModel } from "@/lib/prediction-model"
import { generatePersuasiveMessages } from "@/lib/sentiment-analysis"
import { useState, useEffect } from "react"

interface PatientConversionInsightsProps {
  patient: PatientData
}

export function PatientConversionInsights({ patient }: PatientConversionInsightsProps) {
  const [persuasiveMessages, setPersuasiveMessages] = useState<string[]>([])
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const generateInsights = async () => {
      setIsLoading(true)
      try {
        // Generar recomendaciones basadas en el modelo predictivo
        const probability = await surgeryPredictionModel.predictSurgeryProbability(patient)
        const recs = surgeryPredictionModel.generateRecommendations(patient, probability)
        setRecommendations(recs)

        // Generar mensajes persuasivos
        const messages = generatePersuasiveMessages(patient)
        setPersuasiveMessages(messages)
      } catch (error) {
        console.error("Error generando insights:", error)
        // Valores por defecto en caso de error
        setRecommendations([
          "Enfocarse en resolver las principales preocupaciones del paciente",
          "Programar seguimiento en 1-2 semanas",
          "Ofrecer información detallada sobre el procedimiento",
        ])
        setPersuasiveMessages([
          "La cirugía ofrece una solución definitiva para su condición actual",
          "Nuestro equipo médico tiene amplia experiencia en este tipo de procedimientos",
          "La recuperación es más rápida de lo que muchos pacientes anticipan",
        ])
      } finally {
        setIsLoading(false)
      }
    }

    if (patient) {
      generateInsights()
    }
  }, [patient])

  if (!patient) {
    return null
  }

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Insights para Conversión
        </CardTitle>
        <CardDescription>Argumentos y puntos clave para el seguimiento efectivo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Preocupaciones Detectadas:
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {patient.encuesta?.preocupacionesCirugia?.length > 0 ? (
                  patient.encuesta.preocupacionesCirugia.map((preocupacion, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30"
                    >
                      {preocupacion}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No se registraron preocupaciones específicas.</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                Argumentos Sugeridos (IA):
              </h4>
              <div className="space-y-2">
                {persuasiveMessages.length > 0 ? (
                  persuasiveMessages.map((message, idx) => (
                    <div
                      key={idx}
                      className="text-sm p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-800/30"
                    >
                      <p className="text-blue-800 dark:text-blue-300">💡 {message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No hay argumentos persuasivos específicos en este momento.
                  </p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-green-500" />
                Recomendaciones para Seguimiento:
              </h4>
              <div className="space-y-2">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="text-sm p-2.5 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-100 dark:border-green-800/30"
                    >
                      <p className="text-green-800 dark:text-green-300">✓ {rec}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No hay recomendaciones específicas en este momento.</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-purple-500" />
                Promociones Aplicables:
              </h4>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-md border border-purple-100 dark:border-purple-800/30">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  {patient.diagnostico === "Hernia Inguinal" &&
                    "15% de descuento para pacientes de primera cirugía (PRIMERA15)"}
                  {patient.diagnostico === "Vesícula" &&
                    "20% de descuento en cirugías programadas para el próximo mes (PROMO20)"}
                  {patient.edad >= 60 && "25% de descuento para pacientes mayores de 60 años (SENIOR25)"}
                  {(!patient.diagnostico ||
                    (patient.diagnostico !== "Hernia Inguinal" &&
                      patient.diagnostico !== "Vesícula" &&
                      patient.edad < 60)) &&
                    "Consulta pre-quirúrgica gratuita (CONSULTA0)"}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
