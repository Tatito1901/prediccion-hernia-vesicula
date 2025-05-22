"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { format, addDays, isBefore, isAfter, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

interface SurgerySchedulerProps {
  patients: PatientData[]
  onScheduleSurgery: (patientId: number, date: Date, doctor: string, notes: string) => void
  onSendPreOpInstructions: (patientId: number) => void
}

export default function SurgeryScheduler({
  patients,
  onScheduleSurgery,
  onSendPreOpInstructions,
}: SurgerySchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [notes, setNotes] = useState("")
  const [sendReminders, setSendReminders] = useState(true)

  // Get patient by ID
  const getPatientById = (patientId: number) => {
    return patients.find((p) => p.id === patientId)
  }

  // Get patients that need follow-up
  const getPatientsNeedingFollowUp = () => {
    return patients.filter(
      (patient) => patient.ultimaConsulta && isAfter(new Date(), addDays(new Date(patient.ultimaConsulta), 30)),
    )
  }

  // Handle scheduling a follow-up
  const handleScheduleFollowUp = () => {
    if (selectedPatientId && selectedDate) {
      // Schedule the follow-up
      onScheduleSurgery(selectedPatientId, selectedDate, "Seguimiento", notes)

      // Show success message
      toast.success("Seguimiento programado exitosamente")

      // Reset form
      setSelectedPatientId(null)
      setSelectedDate(undefined)
      setNotes("")
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Programador de Seguimiento</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-lg mb-4">Pacientes que Necesitan Seguimiento</h3>
            <div className="border rounded-md h-[400px] overflow-y-auto">
              {getPatientsNeedingFollowUp().length > 0 ? (
                <div className="divide-y">
                  {getPatientsNeedingFollowUp().map((patient) => (
                    <div
                      key={patient.id}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                        selectedPatientId === patient.id && "bg-muted",
                      )}
                      onClick={() => setSelectedPatientId(patient.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">
                            {patient.nombre} {patient.apellidos}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {patient.edad} años | {patient.diagnostico || "Sin diagnóstico"}
                          </div>
                          <div className="text-sm mt-1">
                            Última consulta:{" "}
                            {patient.ultimaConsulta ? format(new Date(patient.ultimaConsulta), "dd/MM/yyyy") : "N/A"}
                          </div>
                        </div>
                        <UserIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">No hay pacientes que necesiten seguimiento</div>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium text-lg mb-4">Detalles del Seguimiento</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Paciente</label>
                <div className="mt-1">
                  {selectedPatientId ? (
                    <div className="p-3 border rounded-md">
                      <div className="font-medium">
                        {getPatientById(selectedPatientId)?.nombre} {getPatientById(selectedPatientId)?.apellidos}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {getPatientById(selectedPatientId)?.edad} años |{" "}
                        {getPatientById(selectedPatientId)?.diagnostico || "Sin diagnóstico"}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-3 text-muted-foreground border rounded-md">
                      Seleccione un paciente
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Fecha de Seguimiento</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate && isValid(selectedDate) ? (
                        format(selectedDate, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      locale={es}
                      disabled={(date) => isBefore(date, new Date())}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-sm font-medium">Notas</label>
                <Textarea
                  placeholder="Notas adicionales para el seguimiento"
                  className="mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="send-reminders"
                    checked={sendReminders}
                    onCheckedChange={(checked) => setSendReminders(checked as boolean)}
                  />
                  <label
                    htmlFor="send-reminders"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Enviar recordatorios automáticos
                  </label>
                </div>
              </div>

              <Button
                className="w-full"
                disabled={!selectedPatientId || !selectedDate}
                onClick={handleScheduleFollowUp}
              >
                Programar Seguimiento
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
