import { SurveyAnalysisDashboard } from "@/components/dashboard/survey-analysis-dashboard"

export default function SurveyAnalysisPage() {
  return (
    <div className="container mx-auto py-6">
      <SurveyAnalysisDashboard
        title="Análisis de Encuestas de Pacientes"
        description="Visualización y análisis detallado de los datos recopilados en las encuestas pre-consulta"
      />
    </div>
  )
}
