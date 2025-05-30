"use client"

import { useMemo } from "react"
import type React from "react"
import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { setHours, setMinutes, isToday, isBefore, addMonths, startOfDay } from "date-fns"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { CustomDatePicker } from "@/components/ui/date-picker"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAppContext } from "@/lib/context/app-context"
import {
  DiagnosisEnum,
  PatientStatusEnum,
  AppointmentStatusEnum,
  type AppointmentData,
} from "@/app/dashboard/data-model"

const formatDiagnosis = (diagnosis: string): string => {
  if (!diagnosis) return ""
  return diagnosis
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

const formSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres.").max(50, "Máximo 50 caracteres."),
  apellidos: z.string().min(2, "Los apellidos deben tener al menos 2 caracteres.").max(50, "Máximo 50 caracteres."),
  edad: z.coerce.number().int().min(0, "La edad no puede ser negativa.").max(120, "Edad no válida.").optional(),
  telefono: z
    .string()
    .min(10, "El teléfono debe tener al menos 10 dígitos.")
    .max(15, "Máximo 15 dígitos.")
    .regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/, "Formato de teléfono no válido."),
  motivoConsulta: z.nativeEnum(DiagnosisEnum, {
    required_error: "Por favor seleccione un motivo de consulta.",
  }),
  fechaConsulta: z.date({
    required_error: "Por favor seleccione una fecha para la consulta.",
  }),
  horaConsulta: z.string({
    required_error: "Por favor seleccione una hora para la consulta.",
  }),
  notas: z.string().max(500, "Máximo 500 caracteres.").optional(),
})

type FormValues = z.infer<typeof formSchema>

const generateTimeSlots = (
  selectedDate: Date | null,
  appointments: AppointmentData[],
): { value: string; label: string; disabled: boolean; booked: boolean }[] => {
  const slots = []
  const now = new Date()

  for (let hour = 9; hour <= 15; hour++) {
    for (const minute of [0, 30]) {
      if (hour === 15 && minute === 30) continue

      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      let isDisabled = false
      let isBooked = false

      if (selectedDate) {
        const slotDateTime = setMinutes(setHours(new Date(selectedDate), hour), minute)
        if (isToday(selectedDate) && isBefore(slotDateTime, now)) {
          isDisabled = true
        }
        if (!isDisabled) {
          isBooked = appointments.some((app) => {
            if (app.estado === AppointmentStatusEnum.CANCELADA) return false
            const appDate = startOfDay(new Date(app.fechaConsulta))
            return startOfDay(selectedDate).getTime() === appDate.getTime() && app.horaConsulta === timeStr
          })
          if (isBooked) isDisabled = true
        }
      } else {
        isDisabled = true
      }
      slots.push({ value: timeStr, label: timeStr, disabled: isDisabled, booked: isBooked })
    }
  }
  return slots
}

interface NewPatientFormProps {
  onSuccess?: () => void
  triggerButton?: React.ReactNode
}

export function NewPatientForm({ onSuccess, triggerButton }: NewPatientFormProps) {
  const [open, setOpen] = useState(false)
  const { addPatient, addAppointment, appointments = [] } = useAppContext()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      telefono: "",
      notas: "",
    },
  })

  const selectedDate = form.watch("fechaConsulta")
  const timeSlots = useMemo(() => generateTimeSlots(selectedDate, appointments), [selectedDate, appointments])

  async function onSubmit(values: FormValues) {
    const submissionToast = toast.loading("Registrando paciente...")
    try {
      const newPatient = await addPatient({
        nombre: values.nombre,
        apellidos: values.apellidos,
        edad: values.edad,
        fecha_registro: new Date().toISOString(),
        diagnostico_principal: values.motivoConsulta,
        estado_paciente: PatientStatusEnum.PENDIENTE_DE_CONSULTA,
        probabilidad_cirugia: 0.5,
        notas_paciente: values.notas || "",
        telefono: values.telefono,
      })

      await addAppointment({
        patientId: newPatient.id,
        fechaConsulta: values.fechaConsulta,
        horaConsulta: values.horaConsulta as `${number}:${number}`,
        paciente: `${values.nombre} ${values.apellidos}`.trim(),
        telefono: values.telefono,
        motivoConsulta: values.motivoConsulta,
        doctor: "Doctor Asignado",
        estado: AppointmentStatusEnum.PROGRAMADA,
        notas: values.notas || "",
      })

      toast.success("Paciente registrado y cita agendada.", { id: submissionToast })
      setOpen(false)
      form.reset()
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error("Error al registrar paciente:", error)
      toast.error("Error al registrar paciente. Intente de nuevo.", { id: submissionToast })
    }
  }

  const diagnosisGroups = {
    Hernias: [
      DiagnosisEnum.EVENTRACION_ABDOMINAL,
      DiagnosisEnum.HERNIA_HIATAL,
      DiagnosisEnum.HERNIA_INGUINAL,
      DiagnosisEnum.HERNIA_INGUINAL_BILATERAL,
      DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE,
      DiagnosisEnum.HERNIA_INCISIONAL,
      DiagnosisEnum.HERNIA_SPIGEL,
      DiagnosisEnum.HERNIA_UMBILICAL,
      DiagnosisEnum.HERNIA_VENTRAL,
    ],
    "Vesícula y Vías Biliares": [
      DiagnosisEnum.COLANGITIS,
      DiagnosisEnum.COLECISTITIS,
      DiagnosisEnum.COLEDOCOLITIASIS,
      DiagnosisEnum.COLELITIASIS,
    ],
    "Otros Diagnósticos": [
      DiagnosisEnum.APENDICITIS,
      DiagnosisEnum.LIPOMA_GRANDE,
      DiagnosisEnum.QUISTE_SEBACEO_INFECTADO,
      DiagnosisEnum.OTRO,
    ],
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="default"
            size="sm"
            className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Paciente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[95vh] flex flex-col p-0 rounded-lg shadow-2xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            Registrar Nuevo Paciente
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            Ingrese los datos para crear un nuevo perfil y agendar su consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Sección de Información Personal */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Datos del Paciente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Nombre(s)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ana Sofía" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="apellidos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Apellidos</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: García Rodríguez" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Teléfono</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="Ej: 55 1234 5678" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="edad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Edad (Opcional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ej: 35" {...field} className="h-9 text-sm" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección de Detalles de Consulta */}
              <div className="space-y-4">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Información de la Consulta
                </h3>
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Motivo de Consulta</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccione un motivo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {Object.entries(diagnosisGroups).map(([groupName, diagnoses]) => (
                            <SelectGroup key={groupName}>
                              <SelectLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1">
                                {groupName}
                              </SelectLabel>
                              {diagnoses.map((diag) => (
                                <SelectItem key={diag} value={diag} className="text-sm">
                                  {formatDiagnosis(diag)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5 items-start">
                  <FormField
                    control={form.control}
                    name="fechaConsulta"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Fecha de Consulta</FormLabel>
                        <CustomDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          minDate={new Date()}
                          maxDate={addMonths(new Date(), 3)}
                          placeholder="Seleccione fecha"
                          shouldDisableDate={(date) => date.getDay() === 0}
                          triggerClassName="h-9 text-sm"
                        />
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="horaConsulta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Hora de Consulta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate}>
                          <FormControl>
                            <SelectTrigger
                              className={cn("h-9 text-sm", !selectedDate && "text-slate-500 dark:text-slate-400")}
                            >
                              <SelectValue placeholder={selectedDate ? "Seleccione hora" : "Seleccione fecha"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {timeSlots.map((slot) => (
                              <SelectItem
                                key={slot.value}
                                value={slot.value}
                                disabled={slot.disabled}
                                className={cn(
                                  "text-sm",
                                  slot.booked && "text-red-500 line-through data-[disabled]:opacity-100",
                                )}
                              >
                                {slot.label} {slot.booked && "(Ocupado)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Sección de Notas Adicionales */}
              <div className="space-y-2">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Notas Adicionales (Opcional)
                </h3>
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only text-xs">Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Información relevante sobre el paciente..."
                          className="resize-none min-h-[70px] text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-800 px-6 pb-5 sticky bottom-0 bg-white dark:bg-slate-950 z-10">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  size="sm"
                  className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white"
                >
                  {form.formState.isSubmitting ? "Registrando..." : "Registrar y Agendar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
