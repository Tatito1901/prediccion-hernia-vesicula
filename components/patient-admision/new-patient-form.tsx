// new-patient-form.tsx - Actualizado para usar React Query
import React, { useState, useEffect, useMemo, useCallback, memo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { 
  setHours, 
  setMinutes, 
  isToday, 
  isBefore, 
  addMonths, 
  startOfDay, 
  format,
  addDays,
  isSunday
} from "date-fns"
import { UserPlus, Loader2, Clock } from "lucide-react"

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
  PatientStatusEnum,
  AppointmentStatusEnum,
  type TimeString
} from "@/app/dashboard/data-model"
import { useCreatePatient } from "@/lib/hooks/use-patients";
import { useAppointments, useCreateAppointment } from "@/lib/hooks/use-appointments";

// Esquema de validación
const FORM_SCHEMA = z.object({
  nombre: z.string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(50, "Máximo 50 caracteres."),
  apellidos: z.string()
    .trim()
    .min(2, "Los apellidos deben tener al menos 2 caracteres.")
    .max(50, "Máximo 50 caracteres."),
  edad: z.coerce.number()
    .int()
    .min(0, "La edad no puede ser negativa.")
    .max(120, "Edad no válida.")
    .optional()
    .nullable(),
  telefono: z.string()
    .trim()
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
  notas: z.string()
    .max(500, "Máximo 500 caracteres.")
    .optional(),
});

type FormValues = z.infer<typeof FORM_SCHEMA>

// Configuración estática
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
};

const WORKING_HOURS = { start: 9, end: 15, interval: 30 };
const MAX_MONTHS_AHEAD = 3;

const DEFAULT_VALUES: FormValues = {
  nombre: "",
  apellidos: "",
  telefono: "",
  notas: "",
  edad: null,
  fechaConsulta: null as any,
  horaConsulta: "",
  motivoConsulta: null as any,
};

// Cache para formateo
const diagnosisFormatCache = new Map<string, string>();

const formatDiagnosis = (diagnosis: DiagnosisEnum): string => {
  const cached = diagnosisFormatCache.get(diagnosis);
  if (cached) return cached;
  
  const formatted = diagnosis
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  diagnosisFormatCache.set(diagnosis, formatted);
  return formatted;
};

// Generar slots de tiempo - memoizado
const TIME_SLOTS = (() => {
  const slots: TimeString[] = [];
  const totalSlots = (WORKING_HOURS.end - WORKING_HOURS.start) * 2;
  
  for (let i = 0; i < totalSlots; i++) {
    const hour = WORKING_HOURS.start + Math.floor(i / 2);
    const minute = (i % 2) * 30;
    
    if (hour >= WORKING_HOURS.end) continue;
    
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` as TimeString;
    slots.push(timeStr);
  }
  
  return slots;
})();

interface NewPatientFormProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export const NewPatientForm = memo<NewPatientFormProps>(({ onSuccess, triggerButton }) => {
  const [open, setOpen] = useState(false);
  
  // Usar hooks de React Query
  const { data: appointmentsData } = useAppointments(1, 100);
  const createPatientMutation = useCreatePatient();
  const createAppointmentMutation = useCreateAppointment();
  
  const appointments = appointmentsData?.appointments || [];
  const isLoadingAppointments = !appointmentsData;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const selectedDate = form.watch("fechaConsulta");

  // Reset form cuando se cierra
  useEffect(() => {
    if (!open) {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, form]);

  // Calcular slots disponibles - memoizado
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !appointments) return [];
    
    const now = new Date();
    const isSelectedDateToday = isToday(selectedDate);
    const startOfSelectedDay = startOfDay(selectedDate);
    
    // Crear Set de citas ocupadas para búsqueda O(1)
    const dayAppointments = new Set<TimeString>();
    
    const selectedDayTime = startOfSelectedDay.getTime();
    appointments.forEach((app: any) => {
      if (
        app.estado !== AppointmentStatusEnum.CANCELADA &&
        startOfDay(new Date(app.fechaConsulta)).getTime() === selectedDayTime
      ) {
        dayAppointments.add(app.horaConsulta as TimeString);
      }
    });
    
    // Filtrar slots disponibles
    return TIME_SLOTS.filter(timeStr => {
      if (dayAppointments.has(timeStr)) return false;
      
      if (isSelectedDateToday) {
        const [hour, minute] = timeStr.split(':').map(Number);
        const slotDateTime = setMinutes(setHours(new Date(startOfSelectedDay), hour), minute);
        if (isBefore(slotDateTime, now)) return false;
      }
      
      return true;
    });
  }, [selectedDate, appointments]);

  // Función para filtrar fechas disponibles - memoizada
  const filterAvailableDates = useCallback((date: Date) => {
    // Excluir domingos
    if (isSunday(date)) return false;
    
    // Excluir fechas pasadas
    const today = startOfDay(new Date());
    return date >= today;
  }, []);

  // Calcular fechas mínima y máxima - memoizado
  const { minDate, maxDate } = useMemo(() => ({
    minDate: new Date(),
    maxDate: addMonths(new Date(), MAX_MONTHS_AHEAD)
  }), []);

  const handleDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      const today = startOfDay(new Date());
      
      if (date < today) {
        toast.error("No se puede seleccionar una fecha anterior a hoy");
        return;
      }
      
      form.setValue("fechaConsulta", date, { shouldValidate: true });
    } else {
      form.setValue("fechaConsulta", undefined as any, { shouldValidate: true });
    }
    
    // Limpiar hora al cambiar fecha
    form.setValue("horaConsulta", "", { shouldValidate: true });
  }, [form]);

  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue("edad", value === "" ? null : Number(value), {
      shouldValidate: true
    });
  }, [form]);

  const handleSubmit = useCallback(async (values: FormValues) => {
    try {
      // Crear paciente
      const newPatient = await createPatientMutation.mutateAsync({
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad ?? undefined,
        diagnostico_principal: values.motivoConsulta,
        estado_paciente: PatientStatusEnum.PENDIENTE_DE_CONSULTA,
        probabilidad_cirugia: 0.5, // Default value, can be updated later
        notas_paciente: values.notas?.trim() || "",
        telefono: values.telefono.trim(),
        fecha_registro: new Date().toISOString(),
      });

      // Crear cita
      await createAppointmentMutation.mutateAsync({
        patientId: newPatient.id,
        fecha_raw: format(values.fechaConsulta, "yyyy-MM-dd"),
        hora_raw: values.horaConsulta,
        estado: AppointmentStatusEnum.PROGRAMADA,
        motivoConsulta: values.motivoConsulta,
        notas: values.notas?.trim() || "",
        esPrimeraVez: true,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Los errores ya son manejados por los mutations
      console.error("Registration error:", error);
    }
  }, [createPatientMutation, createAppointmentMutation, onSuccess]);

  const isSubmitting = createPatientMutation.isPending || createAppointmentMutation.isPending;
  const isLoading = isLoadingAppointments;
  const canSubmit = form.formState.isValid && !isSubmitting && !isLoading;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="default"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Nuevo Paciente
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90dvh] flex flex-col p-0 rounded-lg shadow-2xl border-0"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 border-slate-200 dark:border-slate-700 rounded-t-lg">
          <DialogTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Registrar Nuevo Paciente
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Complete los datos para crear un nuevo paciente y agendar su consulta
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto px-6 py-5 bg-white dark:bg-slate-900">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Datos del Paciente */}
              <section className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <UserPlus size={16} className="text-blue-600 dark:text-blue-400" />
                  Datos del Paciente
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Nombre(s) <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: Ana Sofía" 
                            {...field} 
                            className="h-9 text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apellidos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Apellidos <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej: García Rodríguez" 
                            {...field} 
                            className="h-9 text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="telefono"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Teléfono <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="tel" 
                            placeholder="Ej: 55 1234 5678" 
                            {...field} 
                            className="h-9 text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="edad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Edad (Opcional)
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Ej: 35" 
                            value={field.value === null || field.value === undefined ? '' : String(field.value)}
                            onChange={handleAgeChange}
                            className="h-9 text-sm"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Información de la Consulta */}
              <section className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <Clock size={16} className="text-blue-600 dark:text-blue-400" />
                  Información de la Consulta
                </h3>
                
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Motivo de Consulta <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Seleccione un motivo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {Object.entries(DIAGNOSIS_GROUPS).map(([groupName, diagnoses]) => (
                            <SelectGroup key={groupName}>
                              <SelectLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                      <FormMessage className="text-xs mt-1" />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="fechaConsulta"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Fecha de Consulta <span className="text-red-500">*</span>
                        </FormLabel>
                        <DatePicker
                          date={field.value}
                          onDateChange={field.onChange}
                          minDate={minDate}
                          maxDate={maxDate}
                          placeholder="Seleccionar fecha"
                          filterDate={filterAvailableDates}
                          className="h-9 text-sm"
                          disabled={isSubmitting}
                        />
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="horaConsulta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Hora de Consulta <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value} 
                          disabled={!selectedDate || isLoading || isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className={cn("h-9 text-sm", !selectedDate && "text-slate-400")}>
                              <SelectValue 
                                placeholder={selectedDate 
                                  ? (isLoading ? "Cargando horarios..." : "Seleccione hora") 
                                  : "Seleccione fecha primero"} 
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                                <span className="ml-2 text-sm">Cargando...</span>
                              </div>
                            ) : availableTimeSlots.length > 0 ? (
                              availableTimeSlots.map((slot) => (
                                <SelectItem key={slot} value={slot} className="text-sm">
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3" />
                                    <span>{slot}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-4 text-center text-sm text-slate-500">
                                {selectedDate ? "No hay horarios disponibles" : "Seleccione una fecha"}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs mt-1" />
                        {selectedDate && !isLoading && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {availableTimeSlots.length} horarios disponibles
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Notas */}
              <section className="space-y-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100">
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
                          className="resize-none min-h-[80px] text-sm"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between mt-1">
                        <FormMessage className="text-xs" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {field.value?.length || 0}/500
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </section>

              <DialogFooter className="pt-4 border-t border-slate-200 dark:border-slate-800 px-0 pb-0">
                <DialogClose asChild>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={!canSubmit}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    "Registrar y Agendar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
});