"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon, FileTextIcon, TrendingUpIcon } from "lucide-react"

type InitialData = {
  nombre?: string
  apellidos?: string
  edad?: number
}

export type PatientSurveyFormProps = {
  patientId?: number
  surveyTemplateId?: string
  assignedSurveyId?: string
  initialData?: InitialData
  standalone?: boolean
}

/**
 * Componente de formulario de encuesta para pacientes
 *
 * @status EN DESARROLLO
 * @priority MEDIUM
 * @description Este componente está planificado para capturar datos de encuestas de pacientes.
 * Actualmente es un placeholder que documenta la funcionalidad futura.
 *
 * Funcionalidad planeada:
 * - Formulario dinámico basado en templates de encuestas
 * - Validación en tiempo real
 * - Soporte para tablet y móvil
 * - Guardado automático de progreso
 * - Envío por WhatsApp
 *
 * Por ahora, el análisis de predicción se realiza en SurveyResultsAnalyzer
 * basado en datos existentes de las citas y el historial del paciente.
 */
export default function PatientSurveyForm({
  patientId,
  surveyTemplateId,
  assignedSurveyId,
  initialData,
  standalone,
}: PatientSurveyFormProps) {
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileTextIcon className="h-5 w-5 text-sky-600" />
          Encuesta de Evaluación Médica
        </CardTitle>
        <CardDescription>
          {assignedSurveyId ? (
            <span>
              Encuesta asignada: <span className="font-mono text-xs">{assignedSurveyId}</span>
              {surveyTemplateId && assignedSurveyId !== surveyTemplateId && (
                <span className="text-xs"> (Template: {surveyTemplateId})</span>
              )}
            </span>
          ) : (
            <span>Formulario de recopilación de datos del paciente</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialData && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">Información del Paciente</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Nombre:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{initialData.nombre ?? "—"}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Apellidos:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">{initialData.apellidos ?? "—"}</p>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Edad:</span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {typeof initialData.edad === "number" ? `${initialData.edad} años` : "—"}
                </p>
              </div>
              {typeof patientId !== "undefined" && (
                <div>
                  <span className="text-gray-600 dark:text-gray-400">ID:</span>
                  <p className="font-mono text-xs font-medium text-gray-900 dark:text-gray-100">{patientId}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <Alert className="border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800">
          <InfoIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <AlertDescription className="text-sm text-sky-900 dark:text-sky-100">
            <p className="font-semibold mb-1">Módulo en Desarrollo</p>
            <p className="text-sky-800 dark:text-sky-200">
              El formulario de encuestas está siendo desarrollado. Mientras tanto, el análisis predictivo
              se realiza automáticamente basado en los datos de las citas y el historial del paciente.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="button"
            variant="default"
            disabled
            className="flex-1"
          >
            <FileTextIcon className="mr-2 h-4 w-4" />
            Iniciar Encuesta (Próximamente)
          </Button>
          {patientId && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                // En el futuro, esto navegará al análisis del paciente
                window.location.href = `/pacientes`;
              }}
              className="flex-1"
            >
              <TrendingUpIcon className="mr-2 h-4 w-4" />
              Ver Análisis Predictivo
            </Button>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="font-semibold mb-1">Funcionalidad Planeada:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-1">
            <li>Formulario dinámico con validación en tiempo real</li>
            <li>Soporte para tablet de clínica y móvil del paciente</li>
            <li>Guardado automático de progreso</li>
            <li>Compartir por WhatsApp</li>
            <li>Análisis automático al completar</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
