// new-patient-form.tsx - Versión refactorizada con utilidades integradas
import React, { useState, useMemo, useCallback, memo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { UserPlus, Loader2, Clock, Calendar, Phone, FileText, Stethoscope } from "lucide-react"
import { isSameDay } from "date-fns"

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

import { 
  DiagnosisEnum,
  AppointmentStatusEnum,
  type TimeString
} from "@/lib/types"
import { useAdmitPatient } from "@/hooks/use-appointments"
import { useAppointments } from "@/hooks/use-appointments"

// ==================== UTILIDADES INTEGRADAS ====================

// Configuración de horarios
const WORK_SCHEDULE = {
  startHour: 9,
  endHour: 14,
  intervalMinutes: 30,
  workDays: [1, 2, 3, 4, 5, 6], // Lun-Sáb
} as const;

// Generar slots de tiempo
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const { startHour, endHour, intervalMinutes } = WORK_SCHEDULE;
  const totalSlots = ((endHour - startHour) * 60) / intervalMinutes;
  
  for (let i = 0; i < totalSlots; i++) {
    const totalMinutes = startHour * 60 + i * intervalMinutes;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    slots.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`);
  }
  
  return slots;
};

// Validaciones de fecha
const isWorkDay = (date: Date): boolean => {
  return (WORK_SCHEDULE.workDays as readonly number[]).includes(date.getDay());
};

const isDateInRange = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);
  maxDate.setHours(23, 59, 59, 999);
  
  return date >= today && date <= maxDate;
};

const isValidAppointmentDate = (date: Date): boolean => {
  return isWorkDay(date) && isDateInRange(date);
};

// Calcular slots disponibles
const calculateAvailableSlots = (
  selectedDate: Date,
  existingAppointments: any[],
  excludeAppointmentId?: string
): { time: string; isAvailable: boolean }[] => {
  if (!isValidAppointmentDate(selectedDate)) {
    return [];
  }

  const today = new Date();
  const isToday = isSameDay(selectedDate, today);
  
  // Crear Set de horarios ocupados para búsqueda O(1)
  const occupiedSlots = new Set<string>();
  
  existingAppointments.forEach((appointment) => {
    // Excluir la cita que se está reagendando
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
      return;
    }
    
    // Solo considerar citas no canceladas
    if (appointment.estado_cita === AppointmentStatusEnum.CANCELADA) {
      return;
    }
    
    // Verificar si es el mismo día
    const appointmentDate = new Date(appointment.fecha_hora_cita);
    if (isSameDay(appointmentDate, selectedDate)) {
      const timeSlot = appointmentDate.toTimeString().slice(0, 5); // HH:MM format
      occupiedSlots.add(timeSlot);
    }
  });
  
  // Filtrar slots disponibles
  return generateTimeSlots().map(timeSlot => {
    let isAvailable = !occupiedSlots.has(timeSlot);
    
    // Si es hoy, excluir horarios que ya pasaron
    if (isToday && isAvailable) {
      const [hour, minute] = timeSlot.split(':').map(Number);
      const slotDateTime = new Date();
      slotDateTime.setHours(hour, minute, 0, 0);
      
      // Agregar 30 minutos de buffer para preparación
      const currentTimeWithBuffer = new Date(today.getTime() + 30 * 60 * 1000);
      isAvailable = slotDateTime > currentTimeWithBuffer;
    }
    
    return {
      time: timeSlot,
      isAvailable
    };
  });
};

// ==================== ESQUEMAS Y CONFIGURACIONES ====================

const FORM_SCHEMA = z.object({
  nombre: z.string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres"),
  apellidos: z.string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(50, "Máximo 50 caracteres"),
  edad: z.coerce.number()
    .int()
    .min(0, "Edad inválida")
    .max(120, "Edad inválida")
    .optional()
    .nullable(),
  telefono: z.string()
    .trim()
    .min(10, "Mínimo 10 dígitos")
    .max(15, "Máximo 15 dígitos")
    .regex(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s./0-9]*$/, "Formato inválido"),
  motivoConsulta: z.enum(Object.values(DiagnosisEnum) as [DiagnosisEnum, ...DiagnosisEnum[]], {
    required_error: "Seleccione un motivo",
  }),
  fechaConsulta: z.date({
    required_error: "Seleccione una fecha",
  }),
  horaConsulta: z.string({
    required_error: "Seleccione una hora",
  }),
  notas: z.string()
    .max(500, "Máximo 500 caracteres")
    .optional(),
})

type FormValues = z.infer<typeof FORM_SCHEMA>

// Agrupación de diagnósticos
const DIAGNOSIS_GROUPS = {
  "🔸 Hernias": [
    DiagnosisEnum.EVENTRACION_ABDOMINAL,
    DiagnosisEnum.HERNIA_HIATAL,
    DiagnosisEnum.HERNIA_INGUINAL,
    DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE,
    DiagnosisEnum.HERNIA_SPIGEL,
    DiagnosisEnum.HERNIA_UMBILICAL,
  ],
  "🟡 Vesícula y Vías Biliares": [
    DiagnosisEnum.COLANGITIS,
    DiagnosisEnum.COLECISTITIS,
    DiagnosisEnum.COLEDOCOLITIASIS,
    DiagnosisEnum.VESICULA_COLECISTITIS_CRONICA,
  ],
  "🔹 Otros Diagnósticos": [
    DiagnosisEnum.APENDICITIS,
    DiagnosisEnum.LIPOMA_GRANDE,
    DiagnosisEnum.QUISTE_SEBACEO_INFECTADO,
    DiagnosisEnum.OTRO,
  ],
} as const

const DEFAULT_VALUES: FormValues = {
  nombre: "",
  apellidos: "",
  telefono: "",
  notas: "",
  edad: null,
  fechaConsulta: null as any,
  horaConsulta: "",
  motivoConsulta: null as any,
}

// ==================== UTILIDADES ESPECÍFICAS ====================

// Cache para formateo de diagnósticos
const diagnosisLabels = new Map<DiagnosisEnum, string>()

const getDiagnosisLabel = (diagnosis: DiagnosisEnum): string => {
  if (!diagnosisLabels.has(diagnosis)) {
    const label = diagnosis
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ')
    diagnosisLabels.set(diagnosis, label)
  }
  return diagnosisLabels.get(diagnosis)!
}

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

const PersonalDataSection = memo<{
  form: any;
  isSubmitting: boolean;
  onAgeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}>(({ form, isSubmitting, onAgeChange }) => (
  <div className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
      <Phone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
        Datos Personales
      </h3>
    </div>
    
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nombre(s) <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="Ana Sofía" 
                {...field} 
                className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                disabled={isSubmitting}
              />
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
            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Apellidos <span className="text-red-500">*</span>
            </FormLabel>
            <FormControl>
              <Input 
                placeholder="García Rodríguez" 
                {...field} 
                className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name="telefono"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Teléfono <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input 
                  type="tel" 
                  placeholder="55 1234 5678" 
                  {...field} 
                  className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isSubmitting}
                />
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
              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Edad
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="35" 
                  value={field.value === null || field.value === undefined ? '' : String(field.value)}
                  onChange={onAgeChange}
                  className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
      </div>
    </div>
  </div>
));

const MedicalInfoSection = memo<{
  form: any;
  isSubmitting: boolean;
}>(({ form, isSubmitting }) => (
  <div className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
      <Stethoscope className="h-4 w-4 text-red-600 dark:text-red-400" />
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
        Información Médica
      </h3>
    </div>
    
    <FormField
      control={form.control}
      name="motivoConsulta"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Motivo de Consulta <span className="text-red-500">*</span>
          </FormLabel>
          <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
            <FormControl>
              <SelectTrigger className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400">
                <SelectValue placeholder="Seleccione un motivo..." />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-72">
              {Object.entries(DIAGNOSIS_GROUPS).map(([groupName, diagnoses]) => (
                <SelectGroup key={groupName}>
                  <SelectLabel className="text-xs font-semibold text-slate-600 dark:text-slate-400 py-2">
                    {groupName}
                  </SelectLabel>
                  {diagnoses.map((diag) => (
                    <SelectItem key={diag} value={diag} className="text-sm py-2">
                      {getDiagnosisLabel(diag)}
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

    <div className="mt-4">
      <FormField
        control={form.control}
        name="notas"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Notas Adicionales
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Información relevante, alergias, etc."
                className="resize-none h-24 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <div className="flex justify-between items-center mt-1">
              <FormMessage className="text-xs" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {field.value?.length || 0}/500
              </span>
            </div>
          </FormItem>
        )}
      />
    </div>
  </div>
));

const AppointmentScheduleSection = memo<{
  form: any;
  isSubmitting: boolean;
  selectedDate: Date | undefined;
  availableTimeSlots: { time: string; isAvailable: boolean }[];
  onDateChange: (date: Date | undefined) => void;
}>(({ form, isSubmitting, selectedDate, availableTimeSlots, onDateChange }) => (
  <div className="bg-white dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200 dark:border-slate-700">
      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
        Programar Cita
      </h3>
    </div>
    
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="fechaConsulta"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fecha <span className="text-red-500">*</span>
            </FormLabel>
            <DatePicker
              date={field.value}
              onDateChange={onDateChange}
              minDate={new Date()}
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)}
              placeholder="Seleccionar fecha"
              filterDate={isValidAppointmentDate}
              className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
              disabled={isSubmitting}
            />
            <FormMessage className="text-xs" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Disponible: Lun-Sáb, {WORK_SCHEDULE.startHour}:00-{WORK_SCHEDULE.endHour}:00
            </p>
          </FormItem>
        )}
      />
      
      <FormField
        control={form.control}
        name="horaConsulta"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Hora <span className="text-red-500">*</span>
            </FormLabel>
            <Select 
              onValueChange={field.onChange} 
              value={field.value} 
              disabled={!selectedDate || !isValidAppointmentDate(selectedDate) || isSubmitting}
            >
              <FormControl>
                <SelectTrigger className="h-10 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400">
                  <SelectValue 
                    placeholder={
                      !selectedDate 
                        ? "Seleccione fecha primero" 
                        : !isValidAppointmentDate(selectedDate)
                          ? "Fecha no válida"
                          : "Seleccione hora"
                    } 
                  />
                </SelectTrigger>
              </FormControl>
              <SelectContent className="max-h-60">
                {availableTimeSlots.length > 0 ? (
                  availableTimeSlots.map((slot) => (
                    <SelectItem 
                      key={slot.time} 
                      value={slot.time} 
                      className="text-sm"
                      disabled={!slot.isAvailable}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{slot.time}</span>
                        {!slot.isAvailable && (
                          <span className="text-xs text-red-500">(Ocupado)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {selectedDate && isValidAppointmentDate(selectedDate) 
                      ? "No hay horarios disponibles" 
                      : "Seleccione una fecha válida"
                    }
                  </div>
                )}
              </SelectContent>
            </Select>
            <FormMessage className="text-xs" />
            {availableTimeSlots.filter(s => s.isAvailable).length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                ✓ {availableTimeSlots.filter(s => s.isAvailable).length} horarios disponibles
              </p>
            )}
          </FormItem>
        )}
      />
    </div>
  </div>
));

// ==================== INTERFACES ====================

interface NewPatientFormProps {
  onSuccess?: () => void
  triggerButton?: React.ReactNode
}

// ==================== COMPONENTE PRINCIPAL ====================

const NewPatientFormComponent = memo<NewPatientFormProps>(({ onSuccess, triggerButton }) => {
  const [open, setOpen] = useState(false)
  
  // React Query hooks
  const { data: appointmentsData } = useAppointments(1, 100)
  const { mutateAsync: admitPatient, isPending: isSubmitting } = useAdmitPatient()
  
  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  })

  const selectedDate = form.watch("fechaConsulta")

  // Calcular slots disponibles de forma optimizada
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return []
    
    const appointments = appointmentsData?.appointments || []
    return calculateAvailableSlots(selectedDate, appointments)
  }, [selectedDate, appointmentsData])

  // Handlers optimizados y memoizados
  const handleDateChange = useCallback((date: Date | undefined) => {
    if (!date) {
      form.setValue("fechaConsulta", undefined as any, { shouldValidate: true })
      form.setValue("horaConsulta", "", { shouldValidate: true })
      return
    }
    
    if (!isValidAppointmentDate(date)) {
      toast.error("Seleccione un día laboral dentro del rango permitido")
      return
    }
    
    form.setValue("fechaConsulta", date, { shouldValidate: true })
    form.setValue("horaConsulta", "", { shouldValidate: true })
  }, [form])

  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    form.setValue("edad", value === "" ? null : Number(value), { shouldValidate: true })
  }, [form])

  const handleSubmit = useCallback(async (values: FormValues) => {
    try {
      // Construir fecha y hora de la cita
      const appointmentDateTime = new Date(values.fechaConsulta)
      const [hours, minutes] = values.horaConsulta.split(':').map(Number)
      appointmentDateTime.setHours(hours, minutes, 0, 0)
      
      await admitPatient({
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        telefono: values.telefono.trim(),
        edad: values.edad ?? null,
        diagnostico_principal: values.motivoConsulta,
        comentarios_registro: values.notas?.trim() || "",
        fecha_hora_cita: appointmentDateTime.toISOString(),
        motivo_cita: values.motivoConsulta,
      })

      setOpen(false)
      form.reset(DEFAULT_VALUES)
      toast.success("Paciente registrado exitosamente")
      onSuccess?.()
    } catch (error) {
      console.error("Error al registrar paciente:", error)
      toast.error("Error al registrar el paciente")
    }
  }, [admitPatient, onSuccess, form])

  const handleDialogChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      form.reset(DEFAULT_VALUES)
    }
  }, [form])

  // Memoizar validación de formulario
  const canSubmit = useMemo(() => form.formState.isValid && !isSubmitting, [form.formState.isValid, isSubmitting])

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="default"
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg border-0 font-medium"
          >
            <UserPlus className="mr-2 h-5 w-5" />
            Nuevo Paciente
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-4xl max-w-[95vw] max-h-[95vh] h-auto flex flex-col p-0 gap-0 rounded-xl shadow-2xl border-0 bg-white dark:bg-slate-900"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header optimizado */}
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-blue-50 via-white to-blue-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Registrar Nuevo Paciente
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Complete los datos para crear un nuevo paciente y agendar su consulta
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido del formulario optimizado */}
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/95">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Grid principal responsivo */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Columna 1: Datos Personales */}
                <div className="lg:col-span-1 space-y-4">
                  <PersonalDataSection 
                    form={form} 
                    isSubmitting={isSubmitting}
                    onAgeChange={handleAgeChange}
                  />
                </div>

                {/* Columna 2: Información Médica */}
                <div className="lg:col-span-1 space-y-4">
                  <MedicalInfoSection 
                    form={form} 
                    isSubmitting={isSubmitting}
                  />
                </div>

                {/* Columna 3: Programación de Cita */}
                <div className="lg:col-span-1 space-y-4">
                  <AppointmentScheduleSection
                    form={form}
                    isSubmitting={isSubmitting}
                    selectedDate={selectedDate}
                    availableTimeSlots={availableTimeSlots}
                    onDateChange={handleDateChange}
                  />
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer con botones optimizado */}
        <DialogFooter className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-xl">
          <div className="flex justify-between items-center w-full">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <FileText className="inline h-3 w-3 mr-1" />
              Todos los campos marcados con * son obligatorios
            </div>
            <div className="flex gap-3">
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="default"
                  disabled={isSubmitting}
                  className="border-slate-300 dark:border-slate-600"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                onClick={form.handleSubmit(handleSubmit)}
                disabled={!canSubmit}
                size="default"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 font-medium min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Registrar Paciente
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
})

NewPatientFormComponent.displayName = "NewPatientForm"

export default NewPatientFormComponent