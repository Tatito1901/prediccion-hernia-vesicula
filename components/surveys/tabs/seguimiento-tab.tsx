import { memo } from "react"
import { MessageCircle, Calendar, Lightbulb, Loader2, CheckSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import type { PersuasivePoint } from "@/lib/utils/survey-analyzer-helpers"

interface SeguimientoTabProps {
  persuasivePoints: PersuasivePoint[]
  onScheduleFollowUp: () => void
  isScheduling: boolean
}

export const SeguimientoTab = memo(({
  persuasivePoints,
  onScheduleFollowUp,
  isScheduling
}: SeguimientoTabProps) => {
  return (
    <div className="p-6">
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
              <p className="text-gray-600 mb-4">
                Se recomienda un seguimiento en <strong>7 días</strong> para discutir los resultados y próximos pasos.
              </p>
              <Button
                onClick={onScheduleFollowUp}
                disabled={isScheduling}
                className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full transition-all duration-200"
              >
                {isScheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Programando...
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4 mr-2" /> Programar Llamada de Seguimiento
                  </>
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
    </div>
  )
})

SeguimientoTab.displayName = 'SeguimientoTab'
