"use client"

import MedicalSurveyAnalysis from "@/components/surveys/medical-survey-analysis"
import { useClinic, ClinicDataProvider } from "@/contexts/clinic-data-provider"

function SurveyAnalysisContent() {
  const { enrichedPatients } = useClinic();
  return (
    <div className="container mx-auto py-6">
      <MedicalSurveyAnalysis
        title="Análisis de Encuestas de Pacientes"
        description="Visualización y análisis detallado de los datos recopilados en las encuestas pre-consulta"
        patients={enrichedPatients}
      />
    </div>
  );
}

export default function SurveyAnalysisPage() {
  return (
    <ClinicDataProvider>
      <SurveyAnalysisContent />
    </ClinicDataProvider>
  )
}
