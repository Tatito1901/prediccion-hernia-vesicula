"use client"

import React from "react"
import SurveyResultsAnalyzer from "./survey-results-analyzer"

interface MedicalSurveyAnalysisProps {
  title: string
  description: string
  patients: any[]
}

export default function MedicalSurveyAnalysis({ title, description, patients }: MedicalSurveyAnalysisProps) {
  // For now, we're using the first patient in the list for the analyzer
  // In a real implementation, this component would handle multiple patients or aggregate data
  const firstPatient = patients && patients.length > 0 ? patients[0] : null
  
  if (!firstPatient) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
        <p className="text-muted-foreground mt-4">No hay datos de pacientes disponibles para el análisis.</p>
      </div>
    )
  }
  
  // The SurveyResultsAnalyzer component expects patientData, not patients
  // We'll pass the first patient's data to maintain compatibility
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-muted-foreground">{description}</p>
      <div className="mt-4">
        <SurveyResultsAnalyzer patientData={firstPatient} />
      </div>
    </div>
  )
}
