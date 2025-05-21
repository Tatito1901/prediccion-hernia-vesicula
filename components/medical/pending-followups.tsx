"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, PhoneIcon, MailIcon, MessageSquareIcon } from "lucide-react"
import type { FollowUp, PatientData } from "@/app/dashboard/data-model"
import { getPendingFollowUps, samplePatients } from "@/app/pacientes/sample-data"
import { responsiveHeight } from "@/lib/responsive-utils"

interface PendingFollowUpsProps {
  followUps?: FollowUp[]
  patients?: PatientData[]
}

export function PendingFollowUps({ followUps, patients }: PendingFollowUpsProps) {
  // Usar los followUps y patients pasados como prop o los datos de muestra si no se proporcionan
  const followUpsData = followUps || getPendingFollowUps()
  const patientsData = patients || samplePatients

  // Función para obtener el nombre del paciente
  const getPatientName = (patientId: number) => {
    const patient = patientsData.find((p) => p.id === patientId)
    return patient ? `${patient.nombre} ${patient.apellidos}` : "Paciente desconocido"
  }

  // Función para obtener el icono según el tipo de seguimiento
  const getFollowUpIcon = (tipo: string) => {
    switch (tipo) {
      case "Llamada":
        return <PhoneIcon className="h-4 w-4" />
      case "Email":
        return <MailIcon className="h-4 w-4" />
      case "WhatsApp":
        return <MessageSquareIcon className="h-4 w-4" />
      default:
        return <CalendarIcon className="h-4 w-4" />
    }
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Seguimientos Pendientes</CardTitle>
        <CardDescription>Próximos seguimientos programados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={responsiveHeight("max-h-[300px]", "max-h-[350px]", "max-h-[400px]")}
          style={{ overflowY: "auto" }}
        >
          {followUpsData.length === 0 ? (
            <p className="text-center text-muted-foreground">No hay seguimientos pendientes</p>
          ) : (
            followUpsData.map((followUp) => (
              <div key={followUp.id} className="flex flex-col space-y-2 rounded-md border p-3 mb-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate">{getPatientName(followUp.patientId)}</div>
                  <Badge variant="outline" className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {getFollowUpIcon(followUp.tipo)}
                    <span className="hidden sm:inline">{followUp.tipo}</span>
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">{followUp.notas}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground truncate">Asignado a: {followUp.asignadoA}</span>
                  <span className="font-medium flex-shrink-0 ml-2">{followUp.proximoSeguimiento}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
