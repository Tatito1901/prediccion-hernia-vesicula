"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format, addDays, isValid, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import { registerLocale } from "react-datepicker"
import type { Locale } from "date-fns"
import type { Database } from "@/lib/types/database.types"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Users,
  UserPlus,
  RefreshCcw,
  CalendarIcon,
  Phone,
  Mail,
  FileText,
  CalendarClock,
  Filter,
  Plus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Context and Utils
import { useAppContext } from "@/lib/context/app-context"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

// Register Spanish locale for DatePicker
if (es) {
  registerLocale("es", es)
}

// === CONSTANTS ===
const DiagnosisEnum = {
  HERNIA_INGUINAL: "HERNIA INGUINAL",
  HERNIA_UMBILICAL: "HERNIA UMBILICAL",
  COLECISTITIS: "COLECISTITIS",
  COLEDOCOLITIASIS: "COLEDOCOLITIASIS",
  COLANGITIS: "COLANGITIS",
  APENDICITIS: "APENDICITIS",
  HERNIA_HIATAL: "HERNIA HIATAL",
  LIPOMA_GRANDE: "LIPOMA GRANDE",
  HERNIA_INGUINAL_RECIDIVANTE: "HERNIA INGUINAL RECIDIVANTE",
  QUISTE_SEBACEO_INFECTADO: "QUISTE SEBACEO INFECTADO",
  EVENTRACION_ABDOMINAL: "EVENTRACION ABDOMINAL",
  VESICULA: "VESICULA (COLECISTITIS CRONICA)",
  OTRO: "OTRO",
} as const

// Default user ID
const DEFAULT_USER_ID = "1"

// === TYPES ===
export type PatientStatus =
  | "PENDIENTE DE CONSULTA"
  | "EN CONSULTA"
  | "EN TRATAMIENTO"
  | "ALTA"
  | "CONSULTADO"
  | "EN SEGUIMIENTO"
  | "OPERADO"
  | "NO OPERADO"
  | "INDECISO"
export type AppointmentStatus = "PROGRAMADA" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA" | "REAGENDADA" | "NO_ASISTIO"
export type DiagnosisType = (typeof DiagnosisEnum)[keyof typeof DiagnosisEnum]

export interface PatientData {
  id: string
  nombre: string
  apellidos: string
  edad?: number
  telefono: string
  email?: string
  estado_paciente: PatientStatus
  diagnostico_principal?: DiagnosisType
  comentarios_registro?: string
  fecha_registro?: string
  estado?: PatientStatus
  diagnostico?: DiagnosisType
  probabilidadCirugia?: number
  timestampRegistro?: string
  ultimoContacto?: string
}

export interface AppointmentData {
  id: string
  patientId: string
  motivo: string
  estado: AppointmentStatus
  esPrimeraVez: boolean
  notas?: string
  fechaHora: string
  patient_id?: string
  motivo_cita?: string
  estado_cita?: AppointmentStatus
  es_primera_vez?: boolean
  notas_cita_seguimiento?: string
  fecha_hora_cita?: string
  fechaConsulta?: Date | string
  horaConsulta?: string
  createdAt?: string
  updatedAt?: string
}

// Define supabase insert types
type PatientInsert = Omit<Database['public']['Tables']['patients']['Insert'], 'id'>
type AppointmentInsert = Omit<Database['public']['Tables']['appointments']['Insert'], 'id'>

// === UTILITY FUNCTIONS ===
const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !isNaN(date.getTime()) && isValid(date)
}

const safeFormatDate = (
  dateInput: Date | string | number | undefined,
  formatStr: string,
  options?: { locale?: Locale },
): string => {
  try {
    if (!dateInput) return ""
    const dateObj =
      typeof dateInput === "string"
        ? parseISO(dateInput)
        : typeof dateInput === "number"
          ? new Date(dateInput)
          : dateInput

    if (!isValidDate(dateObj)) return "Fecha Inválida"
    return format(dateObj, formatStr, options)
  } catch (error) {
    console.error("[safeFormatDate] Error formatting date:", dateInput, error)
    return "Error de Formato"
  }
}

const normalizeId = (id: string | number): string => String(id)

// Helper for Zod enums
const zodEnumFromArray = <T extends string>(arr: readonly T[]): z.ZodEnum<[T, ...T[]]> => {
  if (arr.length === 0) {
    throw new Error("Cannot create Zod enum from empty array")
  }
  return z.enum(arr as [T, ...T[]])
}

const diagnosisValues = Object.values(DiagnosisEnum)

// === SCHEMAS ===
const patientSchema = z.object({
  nombre: z
    .string()
    .min(2, "Nombre: Mínimo 2 caracteres.")
    .max(50, "Nombre: Máximo 50 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/, "Nombre: Solo letras, espacios, apóstrofes o guiones."),
  apellidos: z
    .string()
    .min(2, "Apellidos: Mínimo 2 caracteres.")
    .max(100, "Apellidos: Máximo 100 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/, "Apellidos: Solo letras, espacios, apóstrofes o guiones."),
  edad: z.coerce.number().min(0, "Edad: No puede ser negativa.").max(120, "Edad: Valor irreal.").optional(),
  telefono: z
    .string()
    .min(7, "Teléfono: Mínimo 7 dígitos.")
    .max(20, "Teléfono: Máximo 20 caracteres.")
    .regex(/^[\d\s+()-ext.EXT#*]+$/, "Teléfono: Formato inválido."),
  email: z.string().email("Email: Formato inválido.").optional().or(z.literal("")),
  diagnostico: diagnosisValues.length > 0 ? zodEnumFromArray(diagnosisValues).optional() : z.string().optional(),
  comentarios: z.string().max(500, "Comentarios: Máximo 500 caracteres.").optional(),
})

const appointmentSchema = z.object({
  motivo: diagnosisValues.length > 0 ? zodEnumFromArray(diagnosisValues) : z.string(),
  fechaHora: z
    .date({ required_error: "Fecha y Hora: Requeridas." })
    .refine(isValidDate, "Fecha y Hora: Inválidas.")
    .refine((date) => date > new Date(Date.now() - 60000), "Fecha y Hora: Deben ser futuras.")
    .refine((date) => date.getDay() !== 0, "Fecha y Hora: No se permiten citas en domingo."),
  esPrimeraVez: z.boolean().default(false),
  notas: z.string().max(500, "Notas: Máximo 500 caracteres.").optional(),
})

const unifiedFormSchema = patientSchema.extend({
  fechaHora: z
    .date({ required_error: "Fecha y Hora: Requeridas." })
    .refine(isValidDate, "Fecha y Hora: Inválidas.")
    .refine((date) => date > new Date(Date.now() - 60000), "Fecha y Hora: Deben ser futuras.")
    .refine((date) => date.getDay() !== 0, "Fecha y Hora: No se permiten citas en domingo."),
  diagnostico: diagnosisValues.length > 0 ? zodEnumFromArray(diagnosisValues) : z.string(),
  esPrimeraVez: z.boolean().default(true),
})

type PatientFormValues = z.infer<typeof patientSchema>
type AppointmentFormValues = z.infer<typeof appointmentSchema>
type UnifiedFormValues = z.infer<typeof unifiedFormSchema>

// === FORM COMPONENTS ===
interface PatientFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSuccess: (patient: PatientData) => void
  initialValues?: Partial<PatientFormValues>
  buttonLabel?: string
  buttonVariant?: string
  className?: string
}

const PatientForm = memo<PatientFormProps>(
  ({
    open,
    setOpen,
    onSuccess,
    initialValues,
    buttonLabel = "Nuevo Paciente",
    buttonVariant = "default",
    className,
  }) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { addPatient } = useAppContext()

    const defaultValues = useMemo<PatientFormValues>(
      () => ({
        nombre: initialValues?.nombre || "",
        apellidos: initialValues?.apellidos || "",
        edad: initialValues?.edad ?? undefined,
        telefono: initialValues?.telefono || "",
        email: initialValues?.email || "",
        diagnostico: initialValues?.diagnostico,
        comentarios: initialValues?.comentarios || "",
      }),
      [initialValues],
    )

    const form = useForm<PatientFormValues>({
      resolver: zodResolver(patientSchema),
      defaultValues,
    })

    useEffect(() => {
      if (open) {
        form.reset(defaultValues)
      }
    }, [open, form, defaultValues])

    const onSubmit = useCallback(
      async (values: PatientFormValues) => {
        if (!addPatient) {
          toast.error("Error de configuración", { description: "Función addPatient no disponible." })
          return
        }
        setIsSubmitting(true)
        try {
          const fechaRegistro = new Date().toISOString().split("T")[0]
          const patientPayloadAPI: PatientInsert = {
            nombre: values.nombre.trim(),
            apellidos: values.apellidos.trim(),
            edad: values.edad,
            telefono: values.telefono.trim(),
            email: values.email?.trim() || undefined,
            estado_paciente: 'PENDIENTE DE CONSULTA',
            diagnostico_principal: values.diagnostico || undefined,
            comentarios_registro: values.comentarios?.trim() || undefined,
            fecha_registro: fechaRegistro,
          }

          const newPatientResponse = await addPatient(patientPayloadAPI)
          if (!newPatientResponse) throw new Error("No se pudo crear el paciente. Respuesta vacía del servidor.")

          let newPatientData: PatientData
          if (typeof newPatientResponse === "object" && "id" in newPatientResponse && newPatientResponse.id) {
            newPatientData = {
              ...patientPayloadAPI,
              ...(newPatientResponse as Partial<PatientData>),
              id: normalizeId(newPatientResponse.id),
              timestampRegistro: newPatientResponse.timestampRegistro || new Date().toISOString(),
              ultimoContacto: newPatientResponse.ultimoContacto || fechaRegistro,
              estado: newPatientResponse.estado || patientPayloadAPI.estado_paciente,
              diagnostico: newPatientResponse.diagnostico || patientPayloadAPI.diagnostico_principal,
            }
          } else if (typeof newPatientResponse === "string" || typeof newPatientResponse === "number") {
            newPatientData = {
              ...patientPayloadAPI,
              id: normalizeId(newPatientResponse),
              timestampRegistro: new Date().toISOString(),
              ultimoContacto: fechaRegistro,
              estado: patientPayloadAPI.estado_paciente,
              diagnostico: patientPayloadAPI.diagnostico_principal,
            }
          } else {
            throw new Error("Respuesta inesperada del servidor al crear paciente.")
          }

          toast.success("Paciente registrado", {
            description: `${newPatientData.nombre} ${newPatientData.apellidos} ha sido registrado.`,
          })
          setOpen(false)
          form.reset()
          onSuccess(newPatientData)
        } catch (error: any) {
          console.error("[PatientForm] Error:", error)
          toast.error("Error al registrar paciente", {
            description: error.message || "Ocurrió un problema desconocido.",
          })
        } finally {
          setIsSubmitting(false)
        }
      },
      [addPatient, setOpen, form, onSuccess],
    )

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} className={cn("flex items-center gap-1.5", className)}>
            <UserPlus className="h-4 w-4" /> {buttonLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
            <DialogDescription>Ingresa los datos del paciente. Los campos con * son obligatorios.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre*</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Juan" {...field} />
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
                      <FormLabel>Apellidos*</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Pérez García" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ej: 35"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                          value={field.value ?? ""}
                        />
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
                      <FormLabel>Teléfono*</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-8" placeholder="Ej: 5512345678" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-8" type="email" placeholder="Ej: juan.perez@correo.com" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="diagnostico"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico Principal</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange} defaultValue={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar diagnóstico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diagnosisValues.map((d) => (
                          <SelectItem key={d} value={d || ""}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="comentarios"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentarios</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales sobre el paciente..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting || (!form.formState.isDirty && !Object.keys(form.formState.errors).length === 0)
                  }
                >
                  {isSubmitting ? "Guardando..." : "Guardar Paciente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  },
)
PatientForm.displayName = "PatientForm"

interface AppointmentFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  setSelectedPatientForDialog?: (patient: PatientData | null) => void
  patient: PatientData
  onSuccess: (appointment: AppointmentData) => void
  buttonLabel?: string
  buttonVariant?: string
  buttonSize?: string
  className?: string
  isIcon?: boolean
}

const AppointmentForm = memo<AppointmentFormProps>(
  ({
    open,
    setOpen,
    setSelectedPatientForDialog,
    patient,
    onSuccess,
    buttonLabel = "Agendar Cita",
    buttonVariant = "default",
    buttonSize = "default",
    className,
    isIcon = false,
  }) => {
    const isMobile = useMediaQuery("(max-width: 768px)")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { addAppointment } = useAppContext()

    const timeRanges = useMemo(() => {
      const today = new Date()
      return {
        minTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0),
        maxTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 0, 0),
      }
    }, [])

    const hasHadPreviousAppointment = useCallback(
      () => ["CONSULTADO", "EN SEGUIMIENTO", "OPERADO", "NO OPERADO", "INDECISO"].includes(patient.estado_paciente),
      [patient.estado_paciente],
    )

    const defaultDate = useMemo(() => {
      let tomorrow = addDays(new Date(), 1)
      if (tomorrow.getDay() === 0) tomorrow = addDays(tomorrow, 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow
    }, [])

    const formDefaultValues = useMemo<AppointmentFormValues>(
      () => ({
        motivo: patient.diagnostico_principal || patient.diagnostico || diagnosisValues[0],
        fechaHora: defaultDate,
        esPrimeraVez: !hasHadPreviousAppointment(),
        notas: "",
      }),
      [patient.diagnostico_principal, patient.diagnostico, defaultDate, hasHadPreviousAppointment],
    )

    const form = useForm<AppointmentFormValues>({
      resolver: zodResolver(appointmentSchema),
      defaultValues: formDefaultValues,
    })

    useEffect(() => {
      if (open) {
        form.reset(formDefaultValues)
      }
    }, [open, form, formDefaultValues])

    const onSubmit = useCallback(
      async (values: AppointmentFormValues) => {
        if (!addAppointment) {
          toast.error("Error de configuración", { description: "Función addAppointment no disponible." })
          return
        }
        setIsSubmitting(true)
        try {
          if (!isValidDate(values.fechaHora)) throw new Error("Fecha de cita inválida.")

          const appointmentPayloadAPI: AppointmentInsert = {
            patient_id: normalizeId(patient.id),
            motivo_cita: values.motivo,
            estado_cita: 'PROGRAMADA',
            es_primera_vez: values.esPrimeraVez,
            notas_cita_seguimiento:
              values.notas?.trim() ||
              (values.esPrimeraVez ? "Primera consulta agendada." : "Consulta de seguimiento agendada."),
            fecha_hora_cita: values.fechaHora.toISOString(),
          }

          const newAppointmentResponse = await addAppointment(appointmentPayloadAPI)
          if (!newAppointmentResponse) throw new Error("No se pudo crear la cita. Respuesta vacía del servidor.")

          let newAppointmentData: AppointmentData
          if (
            typeof newAppointmentResponse === "object" &&
            "id" in newAppointmentResponse &&
            newAppointmentResponse.id
          ) {
            newAppointmentData = {
              patientId: normalizeId(patient.id),
              motivo: values.motivo,
              estado: "PROGRAMADA",
              esPrimeraVez: values.esPrimeraVez,
              notas: values.notas,
              fechaHora: values.fechaHora.toISOString(),
              ...(newAppointmentResponse as Partial<AppointmentData>),
              id: normalizeId(newAppointmentResponse.id),
            }
          } else {
            throw new Error("Respuesta inesperada del servidor al crear cita.")
          }

          toast.success("Cita agendada", {
            description: `${patient.nombre} ${patient.apellidos} agendado para ${safeFormatDate(values.fechaHora, "EEEE, dd 'de' MMMM 'a las' HH:mm", { locale: es })}.`,
          })
          setOpen(false)
          form.reset()
          onSuccess(newAppointmentData)
        } catch (error: any) {
          console.error("[AppointmentForm] Error:", error)
          toast.error("Error al agendar cita", { description: error.message || "Ocurrió un problema desconocido." })
        } finally {
          setIsSubmitting(false)
        }
      },
      [addAppointment, patient, setOpen, form, onSuccess],
    )

    const triggerButtonContent = useMemo(() => {
      const icon = <CalendarClock className="h-4 w-4" />
      if (isIcon) return icon
      return (
        <>
          {icon} <span className="ml-1.5">{buttonLabel}</span>
        </>
      )
    }, [isIcon, buttonLabel])

    const trigger = useMemo(
      () => (
        <Button
          variant={buttonVariant}
          size={isIcon ? "icon" : buttonSize}
          className={cn(!isIcon && "flex items-center", className)}
          title={`Agendar cita para ${patient.nombre} ${patient.apellidos}`}
          onClick={() => {
            if (setSelectedPatientForDialog) setSelectedPatientForDialog(patient)
          }}
          type="button"
        >
          {triggerButtonContent}
          {isIcon && <span className="sr-only">{buttonLabel}</span>}
        </Button>
      ),
      [
        buttonVariant,
        isIcon,
        buttonSize,
        className,
        patient,
        buttonLabel,
        triggerButtonContent,
        setSelectedPatientForDialog,
      ],
    )

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          className={cn("sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6", isMobile ? "w-[95vw]" : "")}
        >
          <DialogHeader>
            <DialogTitle className={isMobile ? "text-xl" : "text-2xl"}>Agendar Cita para Paciente</DialogTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              <span className="block font-medium text-primary">
                {patient.nombre} {patient.apellidos}
              </span>
              <span className="block mt-1">Lunes–Sábado, 9:00–17:00 (Excl. 14:00-14:59)</span>
            </div>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
              <FormField
                control={form.control}
                name="motivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de Consulta*</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {diagnosisValues.map((d) => (
                          <SelectItem key={d} value={d || ""}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Motivo principal de la consulta.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fechaHora"
                render={({ field: { onChange, value, name, ref } }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha y Hora*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal w-full justify-start",
                              !value && "text-muted-foreground",
                            )}
                          >
                            {value ? (
                              safeFormatDate(value, "EEEE, d MMM yyyy, HH:mm", { locale: es })
                            ) : (
                              <span>Seleccionar fecha y hora</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <DatePicker
                          selected={value}
                          onChange={onChange}
                          name={name}
                          ref={ref}
                          showTimeSelect
                          minDate={new Date()}
                          minTime={timeRanges.minTime}
                          maxTime={timeRanges.maxTime}
                          dateFormat="MMMM d, yyyy h:mm aa"
                          timeFormat="HH:mm"
                          locale={es}
                          timeIntervals={30}
                          timeCaption="Hora"
                          inline
                          filterDate={(date) => date.getDay() !== 0}
                          filterTime={(time) => time.getHours() !== 14}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>Selecciona fecha y hora para la consulta.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="esPrimeraVez"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Primera Consulta</FormLabel>
                      <FormDescription>Marcar si es la primera vez del paciente.</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas para la cita</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notas adicionales para esta cita..."
                        {...field}
                        className="resize-none min-h-[80px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting ? "Agendando..." : "Agendar Cita"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  },
)
AppointmentForm.displayName = "AppointmentForm"

interface UnifiedPatientFormProps {
  open: boolean
  setOpen: (open: boolean) => void
  onSuccess: (data: { patient: PatientData; appointment?: AppointmentData }) => void
  buttonLabel?: string
  buttonVariant?: string
  className?: string
}

const UnifiedPatientForm = memo<UnifiedPatientFormProps>(
  ({ open, setOpen, onSuccess, buttonLabel = "Paciente + Cita", buttonVariant = "default", className }) => {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const { addPatient, addAppointment } = useAppContext()

    const defaultDate = useMemo(() => {
      let tomorrow = addDays(new Date(), 1)
      if (tomorrow.getDay() === 0) tomorrow = addDays(tomorrow, 1)
      tomorrow.setHours(9, 0, 0, 0)
      return tomorrow
    }, [])

    const timeRanges = useMemo(() => {
      const today = new Date()
      return {
        minTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0),
        maxTime: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 0, 0),
      }
    }, [])

    const formDefaultValues = useMemo<UnifiedFormValues>(
      () => ({
        nombre: "",
        apellidos: "",
        edad: undefined,
        telefono: "",
        email: "",
        diagnostico: diagnosisValues[0],
        fechaHora: defaultDate,
        esPrimeraVez: true,
        comentarios: "",
      }),
      [defaultDate],
    )

    const form = useForm<UnifiedFormValues>({
      resolver: zodResolver(unifiedFormSchema),
      defaultValues: formDefaultValues,
    })

    useEffect(() => {
      if (open) form.reset(formDefaultValues)
    }, [open, form, formDefaultValues])

    const onSubmit = useCallback(
      async (values: UnifiedFormValues) => {
        if (!addPatient || !addAppointment) {
          toast.error("Error de configuración", { description: "Funciones de registro no disponibles." })
          return
        }
        setIsSubmitting(true)
        let createdPatientData: PatientData | null = null

        try {
          // 1. Register Patient
          const fechaRegistro = new Date().toISOString().split("T")[0]
          const patientPayloadAPI: PatientInsert = {
            nombre: values.nombre.trim(),
            apellidos: values.apellidos.trim(),
            edad: values.edad,
            telefono: values.telefono.trim(),
            email: values.email?.trim() || undefined,
            estado_paciente: 'PENDIENTE DE CONSULTA',
            diagnostico_principal: values.diagnostico || undefined,
            comentarios_registro: values.comentarios?.trim() || undefined,
            fecha_registro: fechaRegistro,
          }
          const newPatientResponse = await addPatient(patientPayloadAPI)
          if (!newPatientResponse) throw new Error("No se pudo crear el paciente. Respuesta vacía del servidor.")

          if (typeof newPatientResponse === "object" && "id" in newPatientResponse && newPatientResponse.id) {
            createdPatientData = {
              ...patientPayloadAPI,
              ...(newPatientResponse as Partial<PatientData>),
              id: normalizeId(newPatientResponse.id),
              timestampRegistro: newPatientResponse.timestampRegistro || new Date().toISOString(),
              ultimoContacto: newPatientResponse.ultimoContacto || fechaRegistro,
              estado: newPatientResponse.estado || patientPayloadAPI.estado_paciente,
              diagnostico: newPatientResponse.diagnostico || patientPayloadAPI.diagnostico_principal,
            }
          } else if (typeof newPatientResponse === "string" || typeof newPatientResponse === "number") {
            createdPatientData = {
              ...patientPayloadAPI,
              id: normalizeId(newPatientResponse),
              timestampRegistro: new Date().toISOString(),
              ultimoContacto: fechaRegistro,
              estado: patientPayloadAPI.estado_paciente,
              diagnostico: patientPayloadAPI.diagnostico_principal,
            }
          } else {
            throw new Error("Respuesta inesperada del servidor al crear paciente.")
          }

          // 2. Create Appointment
          if (!isValidDate(values.fechaHora)) throw new Error("Fecha de cita inválida.")
          const appointmentPayloadAPI: AppointmentInsert = {
            patient_id: createdPatientData.id,
            motivo_cita: values.diagnostico,
            estado_cita: 'PROGRAMADA',
            es_primera_vez: values.esPrimeraVez,
            notas_cita_seguimiento: values.comentarios?.trim() || "Primera consulta agendada (registro unificado).",
            fecha_hora_cita: values.fechaHora.toISOString(),
          }
          const newAppointmentResponse = await addAppointment(appointmentPayloadAPI)

          if (!newAppointmentResponse) {
            toast.warning("Paciente registrado, pero falló la creación de la cita.", {
              description: "Intenta agendar la cita manualmente desde la lista de pacientes.",
            })
            setOpen(false)
            form.reset()
            onSuccess({ patient: createdPatientData }) // Partial success
            return
          }

          let createdAppointmentData: AppointmentData
          if (
            typeof newAppointmentResponse === "object" &&
            "id" in newAppointmentResponse &&
            newAppointmentResponse.id
          ) {
            createdAppointmentData = {
              patientId: createdPatientData.id,
              motivo: values.diagnostico,
              estado: "PROGRAMADA",
              esPrimeraVez: values.esPrimeraVez,
              notas: values.comentarios?.trim(),
              fechaHora: values.fechaHora.toISOString(),
              ...(newAppointmentResponse as Partial<AppointmentData>),
              id: normalizeId(newAppointmentResponse.id),
            }
          } else {
            throw new Error("Respuesta inesperada del servidor al crear la cita.")
          }

          toast.success("Paciente y Cita Registrados", {
            description: `${values.nombre} agendado para ${safeFormatDate(values.fechaHora, "EEEE, dd MMM, HH:mm", { locale: es })}.`,
          })
          setOpen(false)
          form.reset()
          onSuccess({ patient: createdPatientData, appointment: createdAppointmentData })
        } catch (error: any) {
          console.error("[UnifiedPatientForm] Error:", error)
          toast.error("Error en el proceso", { description: error.message || "Ocurrió un problema desconocido." })
        } finally {
          setIsSubmitting(false)
        }
      },
      [addPatient, addAppointment, setOpen, form, onSuccess],
    )

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={buttonVariant} className={cn("flex items-center gap-1.5", className)}>
            <Plus className="h-4 w-4" /> {buttonLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Paciente y Agendar Primera Cita</DialogTitle>
            <DialogDescription>Completa el formulario. Los campos con * son obligatorios.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
              <div className="space-y-4 py-2 border-b">
                <h3 className="text-sm font-medium text-primary">Información Personal del Paciente</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Ana" {...field} />
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
                        <FormLabel>Apellidos*</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: López Soto" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="edad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ej: 42"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                            value={field.value ?? ""}
                          />
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
                        <FormLabel>Teléfono*</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Ej: 5587654321" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-8" type="email" placeholder="Ej: ana.lopez@correo.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <div className="space-y-4 py-2 border-b">
                <h3 className="text-sm font-medium text-primary">Información de la Primera Cita</h3>
                <FormField
                  control={form.control}
                  name="diagnostico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Consulta*</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar motivo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {diagnosisValues.map((d) => (
                            <SelectItem key={d} value={d || ""}>
                              {d}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Motivo principal de esta primera consulta.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fechaHora"
                  render={({ field: { onChange, value, name, ref } }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha y Hora de Cita*</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal w-full justify-start",
                                !value && "text-muted-foreground",
                              )}
                            >
                              {value ? (
                                safeFormatDate(value, "EEEE, d MMM yyyy, HH:mm", { locale: es })
                              ) : (
                                <span>Seleccionar fecha y hora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePicker
                            selected={value}
                            onChange={onChange}
                            name={name}
                            ref={ref}
                            showTimeSelect
                            minDate={new Date()}
                            minTime={timeRanges.minTime}
                            maxTime={timeRanges.maxTime}
                            dateFormat="MMMM d, yyyy h:mm aa"
                            timeFormat="HH:mm"
                            locale={es}
                            timeIntervals={30}
                            timeCaption="Hora"
                            inline
                            filterDate={(date) => date.getDay() !== 0}
                            filterTime={(time) => time.getHours() !== 14}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Excluye domingos y 14:00-14:59 (hora de comida).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4 py-2">
                <FormField
                  control={form.control}
                  name="esPrimeraVez"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Primera Consulta</FormLabel>
                        <FormDescription>Automáticamente seleccionado para nuevos pacientes con cita.</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="comentarios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comentarios Adicionales (Paciente/Cita)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas relevantes sobre el paciente o esta primera cita..."
                          {...field}
                          className="resize-none min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
                  {isSubmitting ? "Procesando..." : "Registrar y Agendar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  },
)
UnifiedPatientForm.displayName = "UnifiedPatientForm"

// === MAIN COMPONENT ===
export function EnhancedPatientManagement() {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [activeTab, setActiveTab] = useState<string>("pendientes")
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [isPatientFormOpen, setIsPatientFormOpen] = useState<boolean>(false)
  const [isUnifiedFormOpen, setIsUnifiedFormOpen] = useState<boolean>(false)
  const [isAppointmentFormOpen, setIsAppointmentFormOpen] = useState<boolean>(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [filterDiagnosis, setFilterDiagnosis] = useState<DiagnosisType | "">("")

  const { patients = [], appointments = [], fetchPatients, isLoadingPatients } = useAppContext()

  const pendingPatients = useMemo(() => {
    if (!Array.isArray(patients)) return []
    return patients.filter((patient) => {
      if (patient.estado_paciente !== "PENDIENTE DE CONSULTA") return false
      const patientAppointments =
        appointments?.filter((app) => String(app.patientId || app.patient_id) === String(patient.id)) || []
      if (patientAppointments.length === 0) return true
      return patientAppointments.every((app) => app.estado === "CANCELADA" || app.estado === "REAGENDADA")
    })
  }, [patients, appointments])

  const filteredPatients = useMemo(() => {
    const basePatients = activeTab === "pendientes" ? pendingPatients : patients || []
    if (!Array.isArray(basePatients)) return []

    let filtered = [...basePatients]

    if (filterDiagnosis) {
      filtered = filtered.filter(
        (p) => p.diagnostico_principal === filterDiagnosis || p.diagnostico === filterDiagnosis,
      )
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim()
      filtered = filtered.filter(
        (p) =>
          `${p.nombre} ${p.apellidos}`.toLowerCase().includes(searchLower) ||
          p.telefono?.includes(searchTerm) ||
          p.email?.toLowerCase().includes(searchLower) ||
          p.diagnostico_principal?.toLowerCase().includes(searchLower) ||
          p.diagnostico?.toLowerCase().includes(searchLower),
      )
    }
    return filtered
  }, [activeTab, pendingPatients, patients, searchTerm, filterDiagnosis])

  const handleRefresh = useCallback(async () => {
    if (!fetchPatients) return
    setIsRefreshing(true)
    try {
      await fetchPatients()
      toast.success("Lista de pacientes actualizada.")
    } catch (error: any) {
      console.error("[PatientManagement] Error refreshing:", error)
      toast.error("Error al actualizar", { description: error.message })
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchPatients])

  const handlePatientCreated = useCallback(
    (patient: PatientData) => {
      handleRefresh()
      setSelectedPatient(patient)
      setIsAppointmentFormOpen(true)
    },
    [handleRefresh],
  )

  const handleUnifiedFormSuccess = useCallback(() => {
    handleRefresh()
  }, [handleRefresh])

  const handleAppointmentCreated = useCallback(() => {
    setSelectedPatient(null)
    setIsAppointmentFormOpen(false)
    handleRefresh()
  }, [handleRefresh])

  const resetFilters = useCallback(() => {
    setFilterDiagnosis("")
    setSearchTerm("")
    setShowFilters(false)
  }, [])

  useEffect(() => {
    if (fetchPatients) {
      fetchPatients().catch((err) => {
        console.error("[PatientManagement] Error inicial cargando pacientes:", err)
        toast.error("Error al cargar pacientes", { description: err.message })
      })
    }
  }, [fetchPatients])

  const openAppointmentModalForPatient = useCallback((patient: PatientData) => {
    setSelectedPatient(patient)
    setIsAppointmentFormOpen(true)
  }, [])

  // Subcomponente memoizado para la lista de pacientes
  interface PatientListProps {
    patients: PatientData[];
    isLoading: boolean;
    onPatientClick: (patient: PatientData) => void;
    emptyMessage: string;
  }
  const PatientList = memo(function PatientList({ patients, isLoading, onPatientClick, emptyMessage }: PatientListProps) {
    if (isLoading) {
      return (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded" />
          ))}
        </div>
      )
    }
    if (!patients.length) {
      return <div className="text-center text-muted-foreground py-6">{emptyMessage}</div>
    }
    return (
      <ScrollArea className="max-h-[60vh] md:max-h-[70vh] w-full pr-2">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {patients.map((patient) => (
            <li key={patient.id} className="py-3 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors rounded"
                onClick={() => onPatientClick(patient)}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">{patient.nombre} {patient.apellidos}</div>
                  <div className="text-xs text-muted-foreground">{patient.diagnostico_principal || patient.diagnostico || 'Sin diagnóstico'}</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-end">
                  <span className="text-xs text-slate-500 dark:text-slate-400">{patient.telefono}</span>
                  {patient.estado_paciente && (
                    <Badge variant="outline" className="text-xs">{patient.estado_paciente}</Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </ScrollArea>
    )
  })

  return (
    <Card className="shadow-lg border-slate-200 dark:border-slate-700 w-full">
      <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-t-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <CardTitle className="text-xl font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <Users className="h-5 w-5" /> Gestión de Pacientes
            </CardTitle>
            <CardDescription className="text-sm">
              {pendingPatients.length} pendientes de cita • {patients.length} totales
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <PatientForm
              open={isPatientFormOpen}
              setOpen={setIsPatientFormOpen}
              onSuccess={handlePatientCreated}
              buttonLabel="Nuevo Paciente"
              buttonVariant="outline"
            />
            <UnifiedPatientForm
              open={isUnifiedFormOpen}
              setOpen={setIsUnifiedFormOpen}
              onSuccess={handleUnifiedFormSuccess}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Actualizar lista de pacientes"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span className="sr-only">Actualizar</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        <Tabs defaultValue="pendientes" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger
                  value="pendientes"
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5"
                >
                  <Users className="h-4 w-4" /> Pendientes{" "}
                  <Badge variant="secondary" className="ml-1.5">
                    {pendingPatients.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="todos" className="flex-1 sm:flex-none flex items-center justify-center gap-1.5">
                  <Users className="h-4 w-4" /> Todos{" "}
                  <Badge variant="secondary" className="ml-1.5">
                    {patients.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    className="pl-9 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                      onClick={() => setSearchTerm("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(showFilters && "bg-accent text-accent-foreground")}
                  title="Mostrar/ocultar filtros"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="border rounded-md p-3 space-y-3 bg-slate-50 dark:bg-slate-900/50 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium">Filtros Avanzados</h3>
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 px-2 text-xs">
                    Limpiar filtros
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <FormLabel className="text-xs font-medium">Diagnóstico</FormLabel>
                    <Select
                      value={filterDiagnosis}
                      onValueChange={(value) => setFilterDiagnosis(value as DiagnosisType | "")}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Cualquier diagnóstico" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Cualquier diagnóstico</SelectItem>
                        {diagnosisValues.map((d) => (
                          <SelectItem key={d} value={d || ""}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {["pendientes", "todos"].map((tabValue) => (
            <TabsContent key={tabValue} value={tabValue}>
              {isLoadingPatients ? (
                <div className="space-y-3 pt-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredPatients.length > 0 ? (
                <ScrollArea className="h-[450px] pr-3">
                  <div className="space-y-2">
                    {filteredPatients.map((patient) => {
                      const isActuallyPending = pendingPatients.some((p) => p.id === patient.id)
                      const patientAppointments =
                        appointments?.filter((app) => String(app.patientId || app.patient_id) === String(patient.id)) ||
                        []
                      const activeAppointments = patientAppointments.filter(
                        (app) =>
                          app.estado !== "CANCELADA" && app.estado !== "COMPLETADA" && app.estado !== "NO_ASISTIO",
                      )

                      return (
                        <div
                          key={patient.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="flex-grow">
                            <div className="font-medium flex items-center gap-2 text-sm">
                              {patient.nombre} {patient.apellidos}
                              {isActuallyPending ? (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-xs border-orange-500 text-orange-600"
                                >
                                  Pendiente Cita
                                </Badge>
                              ) : activeAppointments.length > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="font-normal text-xs border-green-500 text-green-600"
                                >
                                  {activeAppointments.length} Cita(s) Activa(s)
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="font-normal text-xs">
                                  {patient.estado_paciente || "Sin estado"}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                              {patient.telefono && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" /> {patient.telefono}
                                </span>
                              )}
                              {patient.edad != null && <span>• {patient.edad} años</span>}
                              {(patient.diagnostico_principal || patient.diagnostico) && (
                                <span className="flex items-center gap-1">
                                  <FileText className="h-3 w-3" />{" "}
                                  {patient.diagnostico_principal || patient.diagnostico}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <AppointmentForm
                              open={isAppointmentFormOpen && selectedPatient?.id === patient.id}
                              setOpen={(isOpen) => {
                                setIsAppointmentFormOpen(isOpen)
                                if (!isOpen) setSelectedPatient(null)
                              }}
                              setSelectedPatientForDialog={setSelectedPatient}
                              patient={patient}
                              onSuccess={handleAppointmentCreated}
                              buttonLabel={isActuallyPending ? "Agendar" : "Nueva Cita"}
                              buttonVariant={isActuallyPending ? "default" : "outline"}
                              buttonSize="sm"
                              isIcon={isMobile && !isActuallyPending}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="p-8 text-center text-muted-foreground border border-dashed rounded-md min-h-[200px] flex flex-col justify-center items-center">
                  {searchTerm || filterDiagnosis ? (
                    <>
                      <Search className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="mb-3">No se encontraron pacientes que coincidan con los filtros.</p>
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Limpiar filtros
                      </Button>
                    </>
                  ) : (
                    <>
                      <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="mb-3">
                        {tabValue === "pendientes"
                          ? "No hay pacientes pendientes de asignar cita."
                          : "No hay pacientes registrados."}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setIsPatientFormOpen(true)}>
                          Registrar Paciente
                        </Button>
                        <Button variant="default" size="sm" onClick={() => setIsUnifiedFormOpen(true)}>
                          Paciente + Cita
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default EnhancedPatientManagement
