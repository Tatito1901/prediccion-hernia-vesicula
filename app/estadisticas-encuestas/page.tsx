import { SurveyStatistics } from "@/components/survey-statistics"

export default function SurveyStatisticsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas de Encuestas</h1>
        <p className="text-muted-foreground mt-2">
          Análisis detallado de las encuestas de pacientes y tendencias de datos
        </p>
      </div>

      <SurveyStatistics />
    </div>
  )
}
