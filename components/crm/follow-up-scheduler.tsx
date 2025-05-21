"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, isBefore, isAfter, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, CheckIcon, PhoneIcon, MailIcon, MessageSquareIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

interface FollowUpSchedulerProps {
  patients: PatientData[]
  pendingFollowUps: any[]
  onScheduleFollowUp: (patientId: number, date?: Date, type?: string, template?: string) => void
  onCompleteFollowUp: (followUpId: number) => void
}

// Follow-up templates
const FOLLOW_UP_TEMPLATES = {
  phone: [
    {
      id: "phone_initial",
      name: "Llamada Inicial",
      content:
        "Hola [NOMBRE], le llamo de la Clínica para hacer seguimiento a su consulta. ¿Ha considerado las opciones que discutimos?",
    },
    {
      id: "phone_reminder",
      name: "Recordatorio",
      content:
        "Hola [NOMBRE], le llamo para recordarle que aún no ha programado su cirugía. ¿Podemos ayudarle con alguna duda?",
    },
    {
      id: "phone_urgent",
      name: "Urgente",
      content:
        "Hola [NOMBRE], le llamo porque notamos que han pasado más de 30 días desde su consulta. ¿Podemos ayudarle a programar su cirugía?",
    },
  ],
  email: [
    {
      id: "email_info",
      name: "Información",
      content:
        "Estimado/a [NOMBRE],\n\nEsperamos que esté bien. Le enviamos información adicional sobre el procedimiento que discutimos en su consulta.\n\nSaludos cordiales,\nClínica",
    },
    {
      id: "email_reminder",
      name: "Recordatorio",
      content:
        "Estimado/a [NOMBRE],\n\nLe recordamos que aún no ha programado su cirugía. Estamos disponibles para resolver cualquier duda.\n\nSaludos cordiales,\nClínica",
    },
  ],
  whatsapp: [
    {
      id: "whatsapp_quick",
      name: "Consulta Rápida",
      content:
        "Hola [NOMBRE], le escribimos de la Clínica para saber si tiene alguna duda sobre el procedimiento que discutimos. Estamos para ayudarle.",
    },
    {
      id: "whatsapp_reminder",
      name: "Recordatorio",
      content:
        "Hola [NOMBRE], le recordamos que puede programar su cirugía cuando lo desee. Contáctenos para agendar una fecha conveniente.",
    },
  ],
}

export function FollowUpScheduler({
  patients,
  pendingFollowUps,
  onScheduleFollowUp,
  onCompleteFollowUp,
}: FollowUpSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [selectedFollowUpType, setSelectedFollowUpType] = useState<string>("Llamada")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [activeTab, setActiveTab] = useState("calendar")

  // Get patient by ID
  const getPatientById = (patientId: number) => {
    return patients.find((p) => p.id === patientId)
  }

  // Get patients without scheduled surgery
  const getPatientsWithoutSurgery = () => {
    return patients.filter((patient) => !patient.fechaCirugia)
  }

  // Get follow-ups for a specific date
  const getFollowUpsForDate = (date: Date) => {
    return pendingFollowUps.filter((followUp) => followUp.fecha && isSameDay(new Date(followUp.fecha), date))
  }

  // Get upcoming follow-ups
  const getUpcomingFollowUps = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return pendingFollowUps
      .filter(
        (followUp) =>
          followUp.fecha && (isAfter(new Date(followUp.fecha), today) || isSameDay(new Date(followUp.fecha), today)),
      )
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  // Get overdue follow-ups
  const getOverdueFollowUps = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return pendingFollowUps
      .filter(
        (followUp) => followUp.fecha && isBefore(new Date(followUp.fecha), today) && followUp.estado !== "Completado",
      )
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  // Get templates for selected follow-up type
  const getTemplatesForType = () => {
    switch (selectedFollowUpType) {
      case "Llamada":
        return FOLLOW_UP_TEMPLATES.phone
      case "Email":
        return FOLLOW_UP_TEMPLATES.email
      case "WhatsApp":
        return FOLLOW_UP_TEMPLATES.whatsapp
      default:
        return []
    }
  }

  // Handle scheduling a follow-up
  const handleScheduleFollowUp = () => {
    if (selectedPatientId && selectedDate) {
      onScheduleFollowUp(selectedPatientId, selectedDate, selectedFollowUpType, selectedTemplate)
      toast.success("Seguimiento programado exitosamente")

      // Reset form
      setSelectedPatientId(null)
      setSelectedDate(undefined)
      setSelectedFollowUpType("Llamada")
      setSelectedTemplate("")
    }
  }

  // Format date for display
  const formatDate = (date: Date | string) => {
    return format(new Date(date), "PPP", { locale: es })
  }

  // Get icon for follow-up type
  const getFollowUpIcon = (type: string) => {
    switch (type) {
      case "Llamada":
        return <PhoneIcon className="h-4 w-4" />
      case "Email":
        return <MailIcon className="h-4 w-4" />
      case "WhatsApp":
        return <MessageSquareIcon className="h-4 w-4" />
      default:
        return <PhoneIcon className="h-4 w-4" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Programador de Seguimientos</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="calendar" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="calendar">Calendario</TabsTrigger>
            <TabsTrigger value="schedule">Programar</TabsTrigger>
            <TabsTrigger value="pending">Pendientes</TabsTrigger>
          </TabsList>

          {/* Calendar View */}
          <TabsContent value="calendar">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="p-3 border rounded-md">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={es}
                    className="mx-auto"
                  />
                </div>
              </div>

              <div className="flex-1">
                {selectedDate ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Seguimientos para {formatDate(selectedDate)}</h3>

                    {getFollowUpsForDate(selectedDate).length > 0 ? (
                      <div className="space-y-3">
                        {getFollowUpsForDate(selectedDate).map((followUp, index) => {
                          const patient = getPatientById(followUp.pacienteId)

                          return (
                            <Card key={index} className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium">
                                    {patient ? `${patient.nombre} ${patient.apellidos}` : "Paciente"}
                                  </div>
                                  <div className="flex items-center text-sm text-muted-foreground">
                                    {getFollowUpIcon(followUp.tipo)}
                                    <span className="ml-1">{followUp.tipo}</span>
                                    <span className="mx-1">•</span>
                                    <span>{format(new Date(followUp.fecha), "HH:mm")}</span>
                                  </div>
                                  {patient && <div className="text-sm mt-1">{patient.diagnostico}</div>}
                                </div>
                                <Button
                                  size="sm"
                                  variant={followUp.estado === "Completado" ? "outline" : "default"}
                                  onClick={() => {
                                    if (followUp.estado !== "Completado") {
                                      onCompleteFollowUp(followUp.id)
                                      toast.success("Seguimiento marcado como completado")
                                    }
                                  }}
                                  disabled={followUp.estado === "Completado"}
                                >
                                  {followUp.estado === "Completado" ? (
                                    <>
                                      <CheckIcon className="h-4 w-4 mr-1" />
                                      Completado
                                    </>
                                  ) : (
                                    "Completar"
                                  )}
                                </Button>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-md">
                        No hay seguimientos programados para esta fecha
                      </div>
                    )}

                    <Button className="w-full mt-4" onClick={() => setActiveTab("schedule")}>
                      Programar Nuevo Seguimiento
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md h-full flex flex-col items-center justify-center">
                    <CalendarIcon className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <p>Seleccione una fecha para ver detalles</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Schedule Follow-up */}
          <TabsContent value="schedule">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-lg mb-4">Pacientes sin Cirugía Programada</h3>
                <div className="border rounded-md h-[400px] overflow-y-auto">
                  {getPatientsWithoutSurgery().length > 0 ? (
                    <div className="divide-y">
                      {getPatientsWithoutSurgery().map((patient) => (
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
                                {patient.edad} años | {patient.diagnostico}
                              </div>
                              <div className="text-sm mt-1">
                                Prob. Cirugía: {(patient.probabilidadCirugia * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay pacientes sin cirugía programada
                    </div>
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
                            {getPatientById(selectedPatientId)?.diagnostico}
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
                    <label className="text-sm font-medium">Fecha</label>
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
                          {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Tipo de Seguimiento</label>
                    <Select value={selectedFollowUpType} onValueChange={setSelectedFollowUpType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Llamada">Llamada</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                        <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Plantilla</label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Seleccionar plantilla" />
                      </SelectTrigger>
                      <SelectContent>
                        {getTemplatesForType().map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedTemplate && (
                    <div className="p-3 border rounded-md text-sm">
                      <p className="font-medium mb-1">Vista previa:</p>
                      <p className="whitespace-pre-line">
                        {getTemplatesForType()
                          .find((t) => t.id === selectedTemplate)
                          ?.content.replace("[NOMBRE]", getPatientById(selectedPatientId || 0)?.nombre || "[NOMBRE]")}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={!selectedPatientId || !selectedDate || !selectedFollowUpType}
                    onClick={handleScheduleFollowUp}
                  >
                    Programar Seguimiento
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Pending Follow-ups */}
          <TabsContent value="pending">
            <div className="space-y-6">
              {/* Overdue Follow-ups */}
              <div>
                <h3 className="font-medium text-lg mb-4 text-red-600 dark:text-red-400">Seguimientos Atrasados</h3>

                {getOverdueFollowUps().length > 0 ? (
                  <div className="space-y-3">
                    {getOverdueFollowUps().map((followUp, index) => {
                      const patient = getPatientById(followUp.pacienteId)

                      return (
                        <Card key={index} className="p-4 border-red-200 dark:border-red-800">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="font-medium">
                                {patient ? `${patient.nombre} ${patient.apellidos}` : "Paciente"}
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{formatDate(followUp.fecha)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getFollowUpIcon(followUp.tipo)}
                                  <span>{followUp.tipo}</span>
                                </div>
                              </div>
                              {patient && <div className="mt-1 text-sm">{patient.diagnostico}</div>}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPatientId(followUp.pacienteId)
                                  setSelectedFollowUpType(followUp.tipo)
                                  setActiveTab("schedule")
                                }}
                              >
                                Reprogramar
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  onCompleteFollowUp(followUp.id)
                                  toast.success("Seguimiento marcado como completado")
                                }}
                              >
                                Completar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    No hay seguimientos atrasados
                  </div>
                )}
              </div>

              {/* Upcoming Follow-ups */}
              <div>
                <h3 className="font-medium text-lg mb-4">Próximos Seguimientos</h3>

                {getUpcomingFollowUps().length > 0 ? (
                  <div className="space-y-3">
                    {getUpcomingFollowUps().map((followUp, index) => {
                      const patient = getPatientById(followUp.pacienteId)
                      const isToday = isSameDay(new Date(followUp.fecha), new Date())

                      return (
                        <Card key={index} className={cn("p-4", isToday && "border-blue-300 dark:border-blue-800")}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                {isToday && (
                                  <span className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-medium">
                                    Hoy
                                  </span>
                                )}
                                <h3 className="font-medium">
                                  {patient ? `${patient.nombre} ${patient.apellidos}` : "Paciente"}
                                </h3>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  <span>{formatDate(followUp.fecha)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  {getFollowUpIcon(followUp.tipo)}
                                  <span>{followUp.tipo}</span>
                                </div>
                              </div>
                              {patient && <div className="mt-1 text-sm">{patient.diagnostico}</div>}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedPatientId(followUp.pacienteId)
                                  setSelectedFollowUpType(followUp.tipo)
                                  setActiveTab("schedule")
                                }}
                              >
                                Reprogramar
                              </Button>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  onCompleteFollowUp(followUp.id)
                                  toast.success("Seguimiento marcado como completado")
                                }}
                              >
                                Completar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md">
                    No hay seguimientos programados próximamente
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
