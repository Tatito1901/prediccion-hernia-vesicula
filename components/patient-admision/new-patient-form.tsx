import React, { useMemo, useState, useEffect, useCallback } from "react"
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
  format 
} from "date-fns"
import { UserPlus, Loader2 } from "lucide-react"

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

// Tipos mejorados
import { 
  DiagnosisEnum,
  PatientStatusEnum,
  AppointmentStatusEnum,
  type TimeString
} from "@/app/dashboard/data-model"
import { usePatientStore } from "@/lib/stores/patient-store"
import { useAppointmentStore, type AddAppointmentInput } from "@/lib/stores/appointment-store"

// =================================================================
// ESQUEMA DE VALIDACIÓN Y TIPOS
// =================================================================
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
    .optional(),
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
})

type FormValues = z.infer<typeof FORM_SCHEMA>

// Tipos para los slots de tiempo
type TimeSlot = {
  value: TimeString;
  label: string;
  disabled: boolean;
  booked: boolean;
}

// =================================================================
// CONSTANTES Y CONFIGURACIONES
// =================================================================
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
const MAX_MONTHS_AHEAD = 3;

const DEFAULT_VALUES: Partial<FormValues> = {
  nombre: "",
  apellidos: "",
  telefono: "",
  notas: "",
  edad: undefined,
}

// Función optimizada para formatear diagnósticos
const formatDiagnosis = (diagnosis: DiagnosisEnum): string => {
  return diagnosis
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =================================================================
// COMPONENTE PRINCIPAL
// =================================================================
interface NewPatientFormProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export const NewPatientForm = React.memo(({ onSuccess, triggerButton }: NewPatientFormProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stores de Zustand
  const addPatient = usePatientStore(state => state.addPatient);
  const addAppointment = useAppointmentStore(state => state.addAppointment);
  const appointments = useAppointmentStore(state => state.appointments);
  const fetchAppointments = useAppointmentStore(state => state.fetchAppointments);

  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const selectedDate = form.watch("fechaConsulta");

  // Efecto para cargar citas al abrir el formulario
  useEffect(() => {
    if (open) {
      const loadAppointments = async () => {
        setIsLoading(true);
        try {
          await fetchAppointments();
        } catch (error) {
          console.error("Error fetching appointments:", error);
          toast.error("No se pudieron cargar las citas disponibles");
        } finally {
          setIsLoading(false);
        }
      };
      
      loadAppointments();
    }
  }, [open, fetchAppointments]);

  // Generar slots de tiempo memoizados
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    
    const now = new Date();
    const isSelectedDateToday = isToday(selectedDate);
    const startOfSelectedDay = startOfDay(selectedDate);
    
    // Filtrar citas para la fecha seleccionada
    const dayAppointments = new Set<TimeString>(
      appointments
        .filter(app => 
          app.estado !== AppointmentStatusEnum.CANCELADA &&
          startOfDay(new Date(app.fechaConsulta)).getTime() === startOfSelectedDay.getTime()
        )
        .map(app => app.horaConsulta)
    );
    
    // Generar slots
    const slots: TimeSlot[] = [];
    
    for (let hour = WORKING_HOURS.start; hour <= WORKING_HOURS.end; hour++) {
      for (const minute of [0, 30]) {
        // Saltar último slot si sobrepasa horario laboral
        if (hour === (WORKING_HOURS.end as number) && minute === 30) continue;
        
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}` as TimeString;
        const slotDateTime = setMinutes(setHours(new Date(startOfSelectedDay), hour), minute);
        
        const isPast = isSelectedDateToday && isBefore(slotDateTime, now);
        const isBooked = dayAppointments.has(timeStr);
        const isDisabled = isPast || isBooked;
        
        slots.push({ 
          value: timeStr, 
          label: timeStr, 
          disabled: isDisabled, 
          booked: isBooked 
        });
      }
    }
    
    return slots;
  }, [selectedDate, appointments]);

  // Manejo de envío del formulario
  const handleSubmit = useCallback(async (values: FormValues) => {
    const submissionToast = toast.loading("Registrando paciente...");
    
    try {
      setIsLoading(true);
      
      const newPatient = await addPatient({
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad,
        diagnostico_principal: values.motivoConsulta,
        estado_paciente: PatientStatusEnum.PENDIENTE_DE_CONSULTA,
        probabilidad_cirugia: 0.5,
        notas_paciente: values.notas?.trim() || "",
        telefono: values.telefono.trim(),
      });

      await addAppointment({
        patientId: newPatient.id,
        fecha_raw: format(values.fechaConsulta, "yyyy-MM-dd"),
        hora_raw: values.horaConsulta,
        estado: AppointmentStatusEnum.PROGRAMADA,
        motivoConsulta: values.motivoConsulta,
        notas: values.notas?.trim() || "",
      } as AddAppointmentInput);

      toast.success("Paciente registrado y cita agendada.", { id: submissionToast });
      setOpen(false);
      form.reset(DEFAULT_VALUES);
      onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? `Error al registrar paciente: ${error.message}`
        : "Error al registrar paciente. Intente de nuevo.";
      
      toast.error(errorMessage, { id: submissionToast });
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [addPatient, addAppointment, form, onSuccess]);

  // Manejo de cambios en la edad
  const handleAgeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    form.setValue("edad", value === "" ? undefined : Number(value), {
      shouldValidate: true
    });
  }, [form]);

  // Manejo de cambios en la fecha
  const handleDateChange = useCallback((date: Date | null) => {
    if (date) {
      form.setValue("fechaConsulta", date);
    } else {
      form.setValue("fechaConsulta", undefined as any, { shouldValidate: true });
    }
    // Limpiar hora al cambiar fecha
    form.setValue("horaConsulta", "");
  }, [form]);

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
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1 rounded">
                    <UserPlus size={16} />
                  </span>
                  Datos del Paciente
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
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
                            className="h-9 text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500"
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
                            className="h-9 text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500"
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
                            className="h-9 text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500"
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
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={handleAgeChange}
                            className="h-9 text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500"
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
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 text-sm border-slate-300 dark:border-slate-700 focus:ring-blue-500">
                            <SelectValue placeholder="Seleccione un motivo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60 border-slate-200 dark:border-slate-700">
                          {Object.entries(DIAGNOSIS_GROUPS).map(([groupName, diagnoses]) => (
                            <SelectGroup key={groupName}>
                              <SelectLabel className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 py-1 bg-slate-100 dark:bg-slate-800">
                                {groupName}
                              </SelectLabel>
                              {diagnoses.map((diag) => (
                                <SelectItem 
                                  key={diag} 
                                  value={diag} 
                                  className="text-sm pl-8 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                  <FormField
                    control={form.control}
                    name="fechaConsulta"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Fecha de Consulta <span className="text-red-500">*</span>
                        </FormLabel>
                        <DatePicker
                          value={field.value}
                          onChange={handleDateChange}
                          minDate={new Date()}
                          maxDate={addMonths(new Date(), MAX_MONTHS_AHEAD)}
                          placeholder="Seleccione fecha"
                          filterDate={(date) => date.getDay() !== 0}
                          className="h-9 text-sm border-slate-300 dark:border-slate-700"
                          disabled={isLoading}
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
                          disabled={!selectedDate || isLoading}
                        >
                          <FormControl>
                            <SelectTrigger
                              className={cn(
                                "h-9 text-sm border-slate-300 dark:border-slate-700 focus:ring-blue-500", 
                                !selectedDate && "text-slate-400 dark:text-slate-500"
                              )}
                            >
                              <SelectValue 
                                placeholder={selectedDate 
                                  ? (isLoading ? "Cargando horarios..." : "Seleccione hora") 
                                  : "Seleccione fecha primero"} 
                              />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60 border-slate-200 dark:border-slate-700">
                            {isLoading ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                              </div>
                            ) : timeSlots.length > 0 ? (
                              timeSlots.map((slot) => (
                                <SelectItem
                                  key={slot.value}
                                  value={slot.value}
                                  disabled={slot.disabled}
                                  className={cn(
                                    "text-sm pl-8",
                                    slot.booked 
                                      ? "text-red-500 line-through data-[disabled]:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/10" 
                                      : slot.disabled 
                                        ? "text-slate-400 dark:text-slate-600" 
                                        : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
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
                        <FormMessage className="text-xs mt-1" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Notas Adicionales */}
              <section className="space-y-2 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-medium text-slate-800 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                  <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 p-1 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </span>
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
                          className="resize-none min-h-[80px] text-sm border-slate-300 dark:border-slate-700 focus-visible:ring-blue-500"
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-between mt-1">
                        <FormMessage className="text-xs" />
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {field.value?.length || 0}/500 caracteres
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
                    className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isLoading || !form.formState.isValid}
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md disabled:opacity-70"
                >
                  {isLoading ? (
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

NewPatientForm.displayName = "NewPatientForm";