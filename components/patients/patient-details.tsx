"use client"
import type React from "react"
import { useRouter } from "next/navigation"
import { addDays } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { PhoneIcon } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"
import { useAppContext } from "@/src/lib/context/app-context"

interface PatientDetailsProps {
  patient: PatientData
  trigger: React.ReactNode
}

export function PatientDetails({ patient, trigger }: PatientDetailsProps) {
  const router = useRouter()
  const { addFollowUp, updatePatient } = useAppContext()

  const handleAgendarSeguimientoDesdeFicha = (paciente: PatientData) => {
    // 1. Crear un seguimiento básico inicial
    const nuevoSeguimiento = {
      patientId: paciente.id,
      fecha: new Date().toISOString(),
      tipo: "Llamada",
      notas: `Seguimiento iniciado desde ficha del paciente - ${paciente.nombre} ${paciente.apellidos} no ha agendado consulta/cirugía.`,
      resultado: "Indeciso",
      estado: "Programado",
      asignadoA: "Dr. Luis Ángel Medina",
      proximoSeguimiento: addDays(new Date(), 7).toISOString(),
    }

    addFollowUp(nuevoSeguimiento)

    // 2. Actualizar el estado del paciente si es necesario
    updatePatient(paciente.id, { estado: "Seguimiento" })

    // 3. Navegar al CRM y seleccionar al paciente
    router.push(`/crm?patientId=${paciente.id}&view=followups`)

    toast.success(`Seguimiento para ${paciente.nombre} agendado. Redirigiendo al CRM.`)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalles del Paciente</DialogTitle>
          <DialogDescription>Información detallada del paciente.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-sm font-medium">
              Nombre
            </label>
            <p className="text-sm">{patient.nombre + " " + patient.apellidos}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="age" className="text-sm font-medium">
              Edad
            </label>
            <p className="text-sm">{patient.edad}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="diagnosis" className="text-sm font-medium">
              Diagnóstico
            </label>
            <p className="text-sm">{patient.diagnostico}</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="fechaConsulta" className="text-sm font-medium">
              Fecha de Consulta
            </label>
            <p className="text-sm">{patient.fechaConsulta}</p>
          </div>
          {patient.notaClinica && (
            <div className="flex flex-col gap-2">
              <label htmlFor="notaClinica" className="text-sm font-medium">
                Nota Clínica
              </label>
              <p className="text-sm">{patient.notaClinica}</p>
            </div>
          )}
        </div>

        {/* Botón de Agendar Seguimiento */}
        {patient && patient.estado !== "Operado" && !patient.fechaCirugia && (
          <div className="mt-2">
            <Button
              onClick={() => handleAgendarSeguimientoDesdeFicha(patient)}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <PhoneIcon className="mr-2 h-4 w-4" />
              Agendar Seguimiento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
