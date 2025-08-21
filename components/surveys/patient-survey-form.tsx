"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

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

// Minimal, safe placeholder to unblock builds and routes that render the survey form.
// This can be progressively enhanced with real form fields and submission logic.
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
        <CardTitle>Formulario de Encuesta</CardTitle>
        <CardDescription>
          {assignedSurveyId ? (
            <span>
              Encuesta asignada <span className="font-mono">{assignedSurveyId}</span>
              {surveyTemplateId && assignedSurveyId !== surveyTemplateId && (
                <span> (plantilla: {surveyTemplateId})</span>
              )}
            </span>
          ) : (
            <span>No hay encuesta asignada</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-600 dark:text-slate-300">
          {typeof patientId !== "undefined" ? (
            <div>
              Paciente ID: <span className="font-mono">{patientId}</span>
            </div>
          ) : (
            <div>Paciente no especificado</div>
          )}
          {initialData && (
            <div className="mt-2">
              <div>Nombre: {initialData.nombre ?? "—"}</div>
              <div>Apellidos: {initialData.apellidos ?? "—"}</div>
              <div>Edad: {typeof initialData.edad === "number" ? initialData.edad : "—"}</div>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button type="button" variant="default" disabled>
            Iniciar encuesta (próximamente)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

