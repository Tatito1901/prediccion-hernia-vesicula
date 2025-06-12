import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { setHours, setMinutes, isToday, isBefore, addMonths, startOfDay, format } from "date-fns"
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
import { DatePicker } from "@/components/ui/datepicker"
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
import { useAppContext, type AddAppointmentInput } from "@/lib/context/app-context" // Import AddAppointmentInput for explicit cast
import {
  DiagnosisEnum,
  PatientStatusEnum,
  AppointmentStatusEnum,
  type AppointmentData,
  type TimeString,
} from "@/app/dashboard/data-model"

// =================================================================
// CONSTANTES Y UTILIDADES (Fuera del componente)
// =================================================================
const FORM_SCHEMA = z.object({
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

type FormValues = z.infer<typeof FORM_SCHEMA>

const DIAGNOSIS_GROUPS = {
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
} as const

const WORKING_HOURS = { start: 9, end: 15, interval: 30 } as const

const DEFAULT_VALUES: Partial<FormValues> = {
  nombre: "",
  apellidos: "",
  telefono: "",
  notas: "",
  edad: undefined,
}

// Función optimizada de formateo
const formatDiagnosis = (diagnosis: string): string => {
  if (!diagnosis) return ""
  return diagnosis
    .replace(/_/g, " ")
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

// Función optimizada para generar slots de tiempo
const generateTimeSlots = (
  selectedDate: Date | null,
  appointments: AppointmentData[]
): Array<{ value: string; label: string; disabled: boolean; booked: boolean }> => {
  const slots = []
  const now = new Date()

  if (!selectedDate) {
    // Generar slots deshabilitados cuando no hay fecha
    for (let hour = WORKING_HOURS.start; hour <= WORKING_HOURS.end; hour++) {
      for (const minute of [0, 30]) {
        // @ts-expect-error Linter false positive: hour can be WORKING_HOURS.end (15), and minute can be 30. Comparison is intentional and correct.
        if (hour === WORKING_HOURS.end && minute === 30) continue
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        slots.push({ value: timeStr, label: timeStr, disabled: true, booked: false })
      }
    }
    return slots
  }

  const isSelectedDateToday = isToday(selectedDate)
  const startOfSelectedDay = startOfDay(selectedDate)

  // Pre-filtrar citas del día seleccionado para optimizar
  const dayAppointments = new Set<TimeString>(
    appointments
      .filter(app => 
        app.estado !== AppointmentStatusEnum.CANCELADA &&
        startOfDay(new Date(app.fechaConsulta)).getTime() === startOfSelectedDay.getTime()
      )
      .map(app => app.horaConsulta)
  )

  // Generar slots eficientemente
  for (let hour = WORKING_HOURS.start; hour <= WORKING_HOURS.end; hour++) {
    for (const minute of [0, 30]) {
      if (hour === WORKING_HOURS.end && minute === 30) continue

      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` as TimeString
      const slotDateTime = setMinutes(setHours(new Date(startOfSelectedDay), hour), minute)
      
      const isPast = isSelectedDateToday && isBefore(slotDateTime, now)
      const isBooked = dayAppointments.has(timeStr)
      const isDisabled = isPast || isBooked
      
      slots.push({ 
        value: timeStr, 
        label: timeStr, 
        disabled: isDisabled, 
        booked: isBooked 
      })
    }
  }
  
  return slots
}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
interface NewPatientFormProps {
  onSuccess?: () => void
  triggerButton?: React.ReactNode
}

export function NewPatientForm({ onSuccess, triggerButton }: NewPatientFormProps) {
  const [open, setOpen] = useState(false)
  const { addPatient, addAppointment, appointments = [] } = useAppContext()

  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: DEFAULT_VALUES,
  })

  const selectedDate = form.watch("fechaConsulta")

  // Memoizar solo cuando es necesario
  const timeSlots = useMemo(() => 
    generateTimeSlots(selectedDate, appointments), 
    [selectedDate, appointments]
  )

  const handleSubmit = async (values: FormValues) => {
    const submissionToast = toast.loading("Registrando paciente...")
    
    try {
      const newPatient = await addPatient({
        nombre: values.nombre,
        apellidos: values.apellidos,
        edad: values.edad,
        diagnostico_principal: values.motivoConsulta,
        estado_paciente: PatientStatusEnum.PENDIENTE_DE_CONSULTA,
        probabilidad_cirugia: 0.5,
        notas_paciente: values.notas || "",
        telefono: values.telefono,
      })

      await addAppointment({
        patientId: newPatient.id,
        fecha_raw: format(values.fechaConsulta, "yyyy-MM-dd"),
        hora_raw: values.horaConsulta,
        estado: AppointmentStatusEnum.PROGRAMADA,
        motivoConsulta: values.motivoConsulta,
        notas: values.notas || "",
        // raw_doctor_id: undefined, // Or provide an actual doctor ID if available
      } as AddAppointmentInput)

      toast.success("Paciente registrado y cita agendada.", { id: submissionToast })
      setOpen(false)
      form.reset()
      onSuccess?.()
    } catch (error) {
      let errorMessage = "Error al registrar paciente. Intente de nuevo.";
      if (error instanceof Error) {
        errorMessage = `Error al registrar paciente: ${error.message}`;
        console.error("Error al registrar paciente:", error);
      } else if (typeof error === 'string') {
        errorMessage = error;
        console.error("Error al registrar paciente (string):", error);
      } else {
        console.error("Error al registrar paciente (unknown type):", error);
      }
      toast.error(errorMessage, { id: submissionToast });
    }
  }

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    form.setValue("edad", value === "" ? undefined : Number(value))
  }

  const handleDateChange = (date: Date | null) => {
    if (date) {
      form.setValue("fechaConsulta", date);
    } else {
      // Handle case where date is cleared (becomes null)
      // For a required Zod field, setting to undefined will trigger validation error as expected.
      form.setValue("fechaConsulta", undefined as any, { shouldValidate: true });
    }
    // Limpiar hora si cambia la fecha
    form.setValue("horaConsulta", "");
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
            <div className="space-y-8">
              {/* Datos del Paciente */}
              <section className="space-y-4">
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
                          <Input 
                            type="number" 
                            placeholder="Ej: 35" 
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={handleAgeChange}
                            className="h-9 text-sm" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Información de la Consulta */}
              <section className="space-y-4">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Información de la Consulta
                </h3>
                
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Motivo de Consulta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccione un motivo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {Object.entries(DIAGNOSIS_GROUPS).map(([groupName, diagnoses]) => (
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-5">
                  <FormField
                    control={form.control}
                    name="fechaConsulta"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs">Fecha de Consulta</FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={handleDateChange}
                          minDate={new Date()}
                          maxDate={addMonths(new Date(), 3)}
                          placeholder="Seleccione fecha"
                          filterDate={(date) => date.getDay() !== 0}
                          className="h-9 text-sm"
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          disabled={!selectedDate || form.formState.isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                "h-9 text-sm", 
                                !selectedDate && "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              <SelectValue placeholder={selectedDate ? "Seleccione hora" : "Seleccione fecha primero"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {timeSlots.length > 0 ? (
                              timeSlots.map((slot) => (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={slot.disabled}
                                  className={cn(
                                    "text-sm",
                                    slot.booked && "text-red-500 line-through data-[disabled]:opacity-100",
                                    slot.disabled && !slot.booked && "text-slate-400 dark:text-slate-600"
                                  )}
                                >
                                  {slot.label} {slot.booked && "(Ocupado)"}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-slots" disabled className="text-sm text-center">
                                {selectedDate ? "No hay horarios disponibles" : "Seleccione una fecha"}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Notas Adicionales */}
              <section className="space-y-2">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Notas Adicionales (Opcional)
                </h3>
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          placeholder="Información relevante sobre el paciente, alergias, etc."
                          className="resize-none min-h-[70px] text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
                              </section>
              </div>
          </Form>
        </div>

        <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-800 px-6 pb-5 bg-white dark:bg-slate-950">
          <DialogClose asChild>
            <Button type="button" variant="ghost" size="sm" disabled={form.formState.isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            onClick={form.handleSubmit(handleSubmit)}
            disabled={form.formState.isSubmitting}
            size="sm"
            className="bg-sky-600 hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-600 text-white"
          >
            {form.formState.isSubmitting ? "Registrando..." : "Registrar y Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}