"use client"

import { useState } from "react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { es } from "date-fns/locale"

// Define types
type PatientStatus = "PENDIENTE DE CONSULTA" | "EN CONSULTA" | "EN TRATAMIENTO" | "ALTA"

interface PatientData {
  id: string
  nombre: string
  apellidos: string
  edad: number
  telefono: string
  email?: string
  estado: PatientStatus
  diagnostico_principal: string
  comentarios_registro?: string
  probabilidadCirugia: number
  timestampRegistro: string
  ultimoContacto: string
}

interface AppointmentData {
  id: string
  patient_id: string
  motivo_cita: string
  estado_cita: string
  es_primera_vez: boolean
  notas_cita_seguimiento?: string
  fecha_hora_cita: string
}

interface PatientOnlyFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSuccess?: (patient: PatientData) => void
  addPatient?: (patientData: any) => Promise<any>
}

interface AppointmentOnlyFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  patient: PatientData
  onSuccess?: (appointment: AppointmentData) => void
  addAppointment?: (appointmentData: any) => Promise<any>
}

// Define schemas
const patientOnlyFormSchema = z.object({
  nombre: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  apellidos: z.string().min(2, {
    message: "Los apellidos deben tener al menos 2 caracteres.",
  }),
  edad: z
    .number()
    .min(0, {
      message: "La edad debe ser un número positivo.",
    })
    .max(120, {
      message: "Por favor, introduce una edad válida.",
    }),
  telefono: z.string().min(7, {
    message: "El teléfono debe tener al menos 7 caracteres.",
  }),
  email: z
    .string()
    .email({
      message: "Por favor, introduce un email válido.",
    })
    .optional(),
  diagnostico_principal: z.string().min(3, {
    message: "El diagnóstico principal debe tener al menos 3 caracteres.",
  }),
  comentarios_registro: z.string().optional(),
})

const appointmentOnlyFormSchema = z.object({
  motivoConsulta: z.string().min(3, {
    message: "El motivo de la consulta debe tener al menos 3 caracteres.",
  }),
  fechaHoraConsulta: z.date({
    required_error: "Se requiere una fecha y hora para la consulta.",
  }),
  es_primera_vez: z.boolean().default(false),
  notas_cita: z.string().optional(),
})

// Define types from schemas
type PatientOnlyFormValues = z.infer<typeof patientOnlyFormSchema>
type AppointmentOnlyFormValues = z.infer<typeof appointmentOnlyFormSchema>

// Utility functions
const DEFAULT_USER_ID = "1"

function normalizeId(id: string | number): string {
  if (typeof id === "number") {
    return id.toString()
  }
  return id
}

function safeFormatDate(date: Date, formatStr: string, options: any = {}): string {
  try {
    return format(date, formatStr, options)
  } catch (error) {
    console.error("Error formatting date:", error)
    return ""
  }
}

function isValidDate(date: any): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

// Components
function PatientOnlyForm({ open, setOpen, onSuccess, addPatient }: PatientOnlyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<PatientOnlyFormValues>({
    resolver: zodResolver(patientOnlyFormSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: 0,
      telefono: "",
      email: "",
      diagnostico_principal: "",
      comentarios_registro: "",
    },
  })

  const onSubmit = async (values: PatientOnlyFormValues) => {
    if (!addPatient) {
      toast.error("Error de configuración", {
        description: "La función necesaria no está disponible.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const currentUserId = DEFAULT_USER_ID
      const fechaRegistro = new Date().toISOString().split("T")[0]

      // Construcción del payload del paciente
      const patientPayload = {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad,
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        estado_paciente: "PENDIENTE DE CONSULTA" as PatientStatus,
        diagnostico_principal: values.diagnostico_principal,
        comentarios_registro: values.comentarios_registro?.trim(),
        creado_por_id: currentUserId,
        fecha_registro: fechaRegistro,
      }

      if (!addPatient) {
        throw new Error("La función para añadir pacientes no está disponible")
      }

      const newPatientResponse = await addPatient(patientPayload)

      if (!newPatientResponse) {
        throw new Error("No se pudo crear el paciente")
      }

      // Procesamiento de la respuesta
      let patientId: string
      let newPatient: PatientData

      if (typeof newPatientResponse === "number" || typeof newPatientResponse === "string") {
        patientId = normalizeId(newPatientResponse)
        newPatient = {
          id: patientId,
          ...patientPayload,
          estado: patientPayload.estado_paciente,
          probabilidadCirugia: 0,
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: fechaRegistro,
        } as PatientData
      } else if (typeof newPatientResponse === "object" && newPatientResponse.id) {
        patientId = normalizeId(newPatientResponse.id)
        newPatient = newPatientResponse as PatientData
      } else {
        throw new Error("Respuesta inesperada al crear paciente")
      }

      toast.success("Paciente registrado con éxito", {
        description: `${values.nombre} ${values.apellidos} ha sido registrado. Ahora puedes asignarle una cita.`,
      })

      setOpen(false)
      form.reset()

      if (onSuccess) {
        onSuccess(newPatient)
      }
    } catch (error: any) {
      console.error("[PatientOnlyForm] Error completo:", error)

      let errorMessage = "Ocurrió un problema al registrar."
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast.error("Error al registrar", {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Añadir Paciente</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Paciente</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos</FormLabel>
                  <FormControl>
                    <Input placeholder="Apellidos del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="edad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Edad del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Teléfono del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email del paciente (opcional)" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="diagnostico_principal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnóstico Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Diagnóstico principal del paciente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comentarios_registro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios de Registro</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Comentarios adicionales sobre el registro del paciente (opcional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function AppointmentForm({ open, setOpen, patient, onSuccess, addAppointment }: AppointmentOnlyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<AppointmentOnlyFormValues>({
    resolver: zodResolver(appointmentOnlyFormSchema),
    defaultValues: {
      motivoConsulta: "",
      fechaHoraConsulta: new Date(),
      es_primera_vez: false,
      notas_cita: "",
    },
  })

  const onSubmit = async (values: AppointmentOnlyFormValues) => {
    if (!addAppointment) {
      toast.error("Error de configuración", {
        description: "La función para añadir citas no está disponible.",
      })
      return
    }

    setIsSubmitting(true)

    try {
      if (!isValidDate(values.fechaHoraConsulta)) {
        throw new Error("La fecha seleccionada no es válida")
      }

      const fechaConsulta = safeFormatDate(values.fechaHoraConsulta, "yyyy-MM-dd", { locale: es }, "")
      const horaConsulta = safeFormatDate(values.fechaHoraConsulta, "HH:mm", { locale: es }, "")

      if (!fechaConsulta || !horaConsulta) {
        throw new Error("Error al procesar la fecha y hora de la consulta")
      }

      const fechaHoraCita = `${fechaConsulta}T${horaConsulta}:00`

      // Construcción del payload de la cita
      const appointmentPayload: any = {
        patient_id: normalizeId(patient.id),
        motivo_cita: values.motivoConsulta,
        estado_cita: "PROGRAMADA",
        es_primera_vez: values.es_primera_vez,
        notas_cita_seguimiento:
          values.notas_cita ||
          (values.es_primera_vez ? "Primera consulta agendada." : "Consulta de seguimiento agendada."),
        fecha_hora_cita: fechaHoraCita,
      }

      const newAppointmentResponse = await addAppointment(appointmentPayload)

      if (!newAppointmentResponse) {
        throw new Error("No se pudo crear la cita. La respuesta del servidor fue vacía.")
      }

      const successMessage = `${patient.nombre} ${patient.apellidos} agendado para el ${safeFormatDate(
        values.fechaHoraConsulta,
        "dd/MM/yyyy 'a las' HH:mm",
        { locale: es },
      )}.`

      toast.success("Cita agendada con éxito", {
        description: successMessage,
      })

      form.reset()
      setOpen(false)

      if (onSuccess && newAppointmentResponse) {
        onSuccess(newAppointmentResponse as AppointmentData)
      }
    } catch (error: any) {
      let errorMessage = "Ocurrió un problema al agendar la cita."
      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast.error("Error al agendar cita", {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Agendar Cita</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Agendando cita para: {patient.nombre} {patient.apellidos}
          </p>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="motivoConsulta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la Consulta</FormLabel>
                  <FormControl>
                    <Input placeholder="Motivo de la consulta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fechaHoraConsulta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha y Hora de la Consulta</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-[240px] pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            safeFormatDate(field.value, "dd/MM/yyyy, HH:mm")
                          ) : (
                            <span>Seleccionar fecha y hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        locale={es}
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="es_primera_vez"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Primera vez</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      ¿Es la primera vez que el paciente asiste a una consulta?
                    </p>
                  </div>
                  <FormControl>
                    <Input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notas_cita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas de la Cita</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Notas adicionales sobre la cita (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando..." : "Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

interface PatientManagementProps {
  addPatient?: (patientData: any) => Promise<any>
  addAppointment?: (appointmentData: any) => Promise<any>
  onPatientCreated?: (patient: PatientData) => void
  onAppointmentCreated?: (appointment: AppointmentData) => void
}

export function PatientManagement({
  addPatient,
  addAppointment,
  onPatientCreated,
  onAppointmentCreated,
}: PatientManagementProps) {
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false)
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null)

  const handlePatientCreated = (newPatient: PatientData) => {
    setSelectedPatient(newPatient)
    setIsPatientFormOpen(false)
    setIsAppointmentFormOpen(true)
    if (onPatientCreated) {
      onPatientCreated(newPatient)
    }
  }

  const handleAppointmentCreated = (newAppointment: AppointmentData) => {
    setIsAppointmentFormOpen(false)
    setSelectedPatient(null)
    if (onAppointmentCreated) {
      onAppointmentCreated(newAppointment)
    }
  }

  return (
    <>
      <PatientOnlyForm
        open={isPatientFormOpen}
        setOpen={setIsPatientFormOpen}
        onSuccess={handlePatientCreated}
        addPatient={addPatient}
      />

      {selectedPatient && (
        <AppointmentForm
          open={isAppointmentFormOpen}
          setOpen={setIsAppointmentFormOpen}
          patient={selectedPatient}
          onSuccess={handleAppointmentCreated}
          addAppointment={addAppointment}
        />
      )}

      {!selectedPatient && (
        <Button variant="outline" onClick={() => setIsPatientFormOpen(true)}>
          Añadir Paciente
        </Button>
      )}

      {selectedPatient && (
        <Button variant="outline" onClick={() => setIsAppointmentFormOpen(true)}>
          Agendar Cita para {selectedPatient.nombre} {selectedPatient.apellidos}
        </Button>
      )}
    </>
  )
}
