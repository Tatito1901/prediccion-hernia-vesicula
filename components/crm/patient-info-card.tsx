"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { CalendarIcon, PhoneIcon, MailIcon, ExternalLinkIcon } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"
import { useRouter } from "next/navigation"

interface PatientInfoCardProps {
  patient: PatientData
  onAddFollowUp: () => void
}

export function PatientInfoCard({ patient, onAddFollowUp }: PatientInfoCardProps) {
  const router = useRouter()

  // Function to get status badge color
  const getStatusBadgeClass = (estado: string) => {
    switch (estado) {
      case "Operado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "No Operado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "En Consulta":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      case "Seguimiento":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  // Function to get probability badge color
  const getProbabilityBadgeClass = (probability: number) => {
    if (probability >= 0.7) {
      return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    } else if (probability >= 0.4) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    } else {
      return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Handle view patient details
  const handleViewPatient = () => {
    router.push(`/pacientes?id=${patient.id}`)
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 bg-primary/10">
              <AvatarFallback className="text-primary font-medium">
                {patient.nombre.charAt(0)}
                {patient.apellidos.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-xl">
                {patient.nombre} {patient.apellidos}
              </CardTitle>
              <CardDescription>
                {patient.edad} años | {patient.diagnostico}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={getStatusBadgeClass(patient.estado)}>
            {patient.estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>Consulta: {formatDate(patient.fechaConsulta)}</span>
            </div>
            {patient.ultimoContacto && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>Último contacto: {formatDate(patient.ultimoContacto)}</span>
              </div>
            )}
            {patient.proximoContacto && (
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span>Próximo contacto: {formatDate(patient.proximoContacto)}</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {patient.encuesta?.telefono && (
              <div className="flex items-center gap-2 text-sm">
                <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                <span>{patient.encuesta.telefono}</span>
              </div>
            )}
            {patient.encuesta?.email && (
              <div className="flex items-center gap-2 text-sm">
                <MailIcon className="h-4 w-4 text-muted-foreground" />
                <span>{patient.encuesta.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className={`${getProbabilityBadgeClass(patient.probabilidadCirugia)}`}>
                Prob. Cirugía: {(patient.probabilidadCirugia * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button onClick={onAddFollowUp} className="flex-1">
            Nuevo Seguimiento
          </Button>
          <Button variant="outline" onClick={handleViewPatient} className="flex-1">
            <ExternalLinkIcon className="mr-2 h-4 w-4" />
            Ver Paciente
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
