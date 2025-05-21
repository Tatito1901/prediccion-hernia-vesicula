
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ClockIcon, PhoneIcon, NotebookIcon } from "lucide-react"

interface PatientPreviewProps {
  patient: {
    nombre: string
    apellidos: string
    telefono: string
    motivoConsulta: string
    fechaConsulta: Date
    horaConsulta: string
    notas?: string
  }
  onEdit?: () => void
  onConfirm?: () => void
}

export function PatientPreview({ patient, onEdit, onConfirm }: PatientPreviewProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {patient.nombre} {patient.apellidos}
        </CardTitle>
        <CardDescription>Información de la consulta agendada</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <PhoneIcon className="h-4 w-4 text-muted-foreground" />
          <span>{patient.telefono}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{patient.motivoConsulta}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span>{patient.fechaConsulta.toLocaleDateString("es-MX")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <span>{patient.horaConsulta}</span>
          </div>
        </div>

        {patient.notas && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-1">
              <NotebookIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Notas:</span>
            </div>
            <p className="text-sm text-muted-foreground">{patient.notas}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onEdit}>
          Editar
        </Button>
        <Button onClick={onConfirm}>Confirmar</Button>
      </CardFooter>
    </Card>
  )
}
