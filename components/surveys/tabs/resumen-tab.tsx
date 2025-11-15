import { memo } from "react"
import { User, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { Patient, PatientSurveyData } from "@/lib/types"
import type { ConversionInsight } from "@/lib/utils/survey-analyzer-helpers"

interface ResumenTabProps {
  patientData: Patient
  surveyData: PatientSurveyData
  insights: ConversionInsight[]
}

export const ResumenTab = memo(({ patientData, surveyData, insights }: ResumenTabProps) => {
  return (
    <div className="p-6">
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
            {/* Placeholder for future health data */}
            <p className="text-gray-500 text-sm">Información disponible en la encuesta</p>
          </CardContent>
        </Card>
      </div>
      <Separator className="my-6" />
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Puntos Clave de la Encuesta</h3>
      <div className="space-y-4">
        {insights.map((insight: ConversionInsight) => (
          <Alert
            key={insight.id}
            className={`bg-${insight.impact === 'high' ? 'yellow' : 'blue'}-50/70 border-${insight.impact === 'high' ? 'yellow' : 'blue'}-200/80 shadow-sm rounded-lg`}
          >
            <insight.icon className={`w-5 h-5 text-${insight.impact === 'high' ? 'yellow' : 'blue'}-600`} />
            <AlertTitle className="font-semibold text-gray-800">{insight.title}</AlertTitle>
            <AlertDescription className="text-gray-600">{insight.description}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  )
})

ResumenTab.displayName = 'ResumenTab'
