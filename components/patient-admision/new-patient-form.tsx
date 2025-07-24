// new-patient-form.tsx - Versión refactorizada con arquitectura modular
import React, { useState, useMemo, useCallback, memo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
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
import { cn } from "@/lib/utils"

import { DiagnosisEnum } from "@/lib/types"
import { useClinic } from "@/contexts/clinic-data-provider"

// Importar desde la nueva arquitectura modular
import { useAdmitPatient } from "./actions"
import { AdmissionFormSchema, TAdmissionForm } from "./types"

// ==================== UTILIDADES INTEGRADAS ====================

// Configuración de horarios
const WORK_SCHEDULE = {
  startHour: 9,
  endHour: 14,
  intervalMinutes: 30,
}

// Generar slots de tiempo
function generateTimeSlots(): string[] {
  const slots: string[] = []
  const { startHour, endHour, intervalMinutes } = WORK_SCHEDULE
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += intervalMinutes) {
      if (hour === endHour - 1 && minute > 0) break
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      slots.push(timeString)
    }
  }
  
  return slots
}

// Validaciones de fecha
function isWorkDay(date: Date): boolean {
  const day = date.getDay()
  return day >= 1 && day <= 5 // Lunes a Viernes
}

function isDateInRange(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const maxDate = new Date(today)
  maxDate.setDate(maxDate.getDate() + 30) // 30 días hacia adelante
  
  return date >= today && date <= maxDate
}

function isValidAppointmentDate(date: Date): boolean {
  return isWorkDay(date) && isDateInRange(date)
}

// Calcular slots disponibles
function calculateAvailableSlots(
  selectedDate: Date,
  existingAppointments: any[],
  excludeAppointmentId?: string
): { time: string; isAvailable: boolean }[] {
  if (!selectedDate || !isValidAppointmentDate(selectedDate)) {
    return []
  }

  const allSlots = generateTimeSlots()
  
  // Filtrar citas del mismo día
  const dayAppointments = existingAppointments.filter(appointment => {
    if (excludeAppointmentId && appointment.id === excludeAppointmentId) {
      return false
    }
    
    const appointmentDate = new Date(appointment.fecha_hora_cita)
    return isSameDay(appointmentDate, selectedDate) && 
           (appointment.estado_cita === 'PROGRAMADA' || 
            appointment.estado_cita === 'PRESENTE' ||
            appointment.estado_cita === 'COMPLETADA')
  })

  // Crear mapeo de horas ocupadas
  const occupiedTimes = new Set(
    dayAppointments.map(appointment => {
      const date = new Date(appointment.fecha_hora_cita)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    })
  )

  // Marcar disponibilidad
  return allSlots.map(time => ({
    time,
    isAvailable: !occupiedTimes.has(time)
  }))
}

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
}

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

const PersonalDataSection = memo<{
  form: any;
  isSubmitting: boolean;
}>(({ form, isSubmitting }) => (
  <div className="bg-white dark:bg-slate-800/50 p-3 sm:p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-200 dark:border-slate-700">
      <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
        Información Personal
      </h3>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormField
        control={form.control}
        name="nombre"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
              Nombre *
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Juan Carlos"
                disabled={isSubmitting}
                className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 touch-auto"
                {...field}
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
            <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
              Apellidos *
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: González López"
                disabled={isSubmitting}
                className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 touch-auto"
                {...field}
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
            <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
              Edad
            </FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="Ej: 45"
                disabled={isSubmitting}
                className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 touch-auto"
                {...field}
                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
              />
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
            <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
              Teléfono *
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: +52 555 123 4567"
                disabled={isSubmitting}
                className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 touch-auto"
                {...field}
              />
            </FormControl>
            <FormMessage className="text-xs" />
          </FormItem>
        )}
      />
    </div>
  </div>
))

PersonalDataSection.displayName = "PersonalDataSection"

const MedicalInfoSection = memo<{
  form: any;
  isSubmitting: boolean;
}>(({ form, isSubmitting }) => (
  <div className="bg-white dark:bg-slate-800/50 p-3 sm:p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-200 dark:border-slate-700">
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
          <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
            Motivo de Consulta *
          </FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value} 
            disabled={isSubmitting}
          >
            <FormControl>
              <SelectTrigger className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400">
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
                      {diag.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')}
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
    
    <FormField
      control={form.control}
      name="notas"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
            Notas Adicionales
          </FormLabel>
          <FormControl>
            <Textarea
              placeholder="Información relevante, alergias, etc."
              className="resize-none h-24 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
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
))

MedicalInfoSection.displayName = "MedicalInfoSection"

const AppointmentScheduleSection = memo<{
  form: any;
  isSubmitting: boolean;
  selectedDate: Date | undefined;
  availableTimeSlots: { time: string; isAvailable: boolean }[];
  onDateChange: (date: Date | undefined) => void;
}>(({ form, isSubmitting, selectedDate, availableTimeSlots, onDateChange }) => (
  <div className="bg-white dark:bg-slate-800/50 p-3 sm:p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
    <div className="flex items-center gap-2 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-slate-200 dark:border-slate-700">
      <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
        Programar Cita
      </h3>
    </div>
    
    <FormField
      control={form.control}
      name="fechaConsulta"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
            Fecha *
          </FormLabel>
          <DatePicker
            date={field.value}
            onDateChange={onDateChange}
            minDate={new Date()}
            maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
            placeholder="Seleccionar fecha"
            filterDate={isValidAppointmentDate}
            className="h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
            disabled={isSubmitting}
          />
          <FormMessage className="text-xs" />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Disponible: Lun-Vie, {WORK_SCHEDULE.startHour}:00-{WORK_SCHEDULE.endHour}:00
          </p>
        </FormItem>
      )}
    />
    
    <FormField
      control={form.control}
      name="horaConsulta"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-slate-700 dark:text-slate-300 text-xs font-medium">
            Hora *
          </FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value} 
            disabled={!selectedDate || !isValidAppointmentDate(selectedDate) || isSubmitting}
          >
            <FormControl>
              <SelectTrigger className="h-10 sm:h-9 text-sm border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400">
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
))

AppointmentScheduleSection.displayName = "AppointmentScheduleSection"

// ==================== INTERFACES ====================

interface NewPatientFormProps {
  onSuccess?: () => void
  triggerButton?: React.ReactNode
}

// ==================== VALORES POR DEFECTO ====================

const DEFAULT_VALUES: Partial<TAdmissionForm> = {
  nombre: "",
  apellidos: "",
  telefono: "",
  notas: "",
  edad: null,
}

// ==================== COMPONENTE PRINCIPAL ====================

const NewPatientFormComponent = memo<NewPatientFormProps>(({ onSuccess, triggerButton }) => {
  const [open, setOpen] = useState(false)
  
  // Hooks centralizados de la nueva arquitectura
  const { allAppointments } = useClinic()
  const { mutateAsync: admitPatient, isPending: isSubmitting } = useAdmitPatient()
  
  // Form setup con nuevo esquema
  const form = useForm<TAdmissionForm>({
    resolver: zodResolver(AdmissionFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  })
  
  const selectedDate = form.watch("fechaConsulta")
  
  // Memoizaciones para optimizar performance
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return []
    const appointments = allAppointments || []
    return calculateAvailableSlots(selectedDate, appointments)
  }, [selectedDate, allAppointments])
  
  // Callbacks optimizados
  const handleDateChange = useCallback((date: Date | undefined) => {
    form.setValue("fechaConsulta", date as Date)
    form.setValue("horaConsulta", "") // Reset time when date changes
  }, [form])
  
  const handleDialogChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      form.reset(DEFAULT_VALUES)
    }
  }, [form])
  
  // Función de submit simplificada - delegando lógica al hook
  const handleSubmit = useCallback(async (values: TAdmissionForm) => {
    const appointmentDateTime = new Date(values.fechaConsulta)
    const [hours, minutes] = values.horaConsulta.split(':').map(Number)
    appointmentDateTime.setHours(hours, minutes, 0, 0)
    
    await admitPatient({
      nombre: values.nombre,
      apellidos: values.apellidos,
      telefono: values.telefono,
      edad: values.edad,
      diagnostico_principal: values.motivoConsulta,
      comentarios_registro: values.notas,
      fecha_hora_cita: appointmentDateTime.toISOString(),
      motivo_cita: values.motivoConsulta,
      doctor_id: null,
    })
    
    setOpen(false)
    form.reset(DEFAULT_VALUES)
    onSuccess?.()
  }, [admitPatient, form, onSuccess])

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
        className="sm:max-w-4xl max-w-[95vw] max-h-[95vh] h-auto flex flex-col p-0 gap-0 rounded-xl shadow-2xl border-0 bg-white dark:bg-slate-900 overflow-hidden"
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
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 py-4 sm:py-5 md:py-6 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/95">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              
              {/* Grid principal responsivo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                
                {/* Columna 1: Datos Personales */}
                <div className="md:col-span-1 space-y-3 sm:space-y-4">
                  <PersonalDataSection 
                    form={form} 
                    isSubmitting={isSubmitting}
                  />
                </div>

                {/* Columna 2: Información Médica */}
                <div className="md:col-span-1 space-y-3 sm:space-y-4">
                  <MedicalInfoSection 
                    form={form} 
                    isSubmitting={isSubmitting}
                  />
                </div>

                {/* Columna 3: Programación de Cita */}
                <div className="md:col-span-1 space-y-3 sm:space-y-4">
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
        <DialogFooter className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 rounded-b-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 sm:gap-2">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <FileText className="inline h-3 w-3 mr-1" />
              Todos los campos marcados con * son obligatorios
            </div>
            <div className="flex gap-2 sm:gap-3 w-full sm:w-auto justify-end">
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