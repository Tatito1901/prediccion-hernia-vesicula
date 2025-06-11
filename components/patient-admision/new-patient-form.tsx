// Asegúrate de que esta línea esté al principio de tu archivo .tsx

import { useMemo, useState } from "react";
import type React from "react"; // Necesario si usas React.ReactNode explícitamente
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { setHours, setMinutes, isToday, isBefore, addMonths, startOfDay } from "date-fns";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/datepicker"; // Asumiendo que es un componente personalizado
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context/app-context"; // Asegúrate que la ruta sea correcta
import {
  DiagnosisEnum,
  PatientStatusEnum,
  AppointmentStatusEnum,
  type AppointmentData,
} from "@/app/dashboard/data-model"; // Asegúrate que la ruta sea correcta

// --- Constantes y Funciones Utilitarias (Fuera del Componente) ---

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
});

type FormValues = z.infer<typeof formSchema>;

const formatDiagnosis = (diagnosis: string): string => {
  if (!diagnosis) return "";
  return diagnosis
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

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
};

/**
 * Genera los horarios disponibles para una fecha dada, considerando las citas existentes.
 * @param selectedDate La fecha para la cual generar horarios.
 * @param appointments Lista de todas las citas existentes.
 * @returns Un array de objetos de horarios con su estado (disponible, ocupado, deshabilitado).
 */
const generateTimeSlots = (
  selectedDate: Date | null,
  appointments: AppointmentData[],
): { value: string; label: string; disabled: boolean; booked: boolean }[] => {
  const slots = [];
  const now = new Date();

  // Si no hay fecha seleccionada, generar todos los slots como deshabilitados
  if (!selectedDate) {
    for (let hour = 9; hour <= 15; hour++) {
      for (const minute of [0, 30]) {
        if (hour === 15 && minute === 30) continue;
        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push({ value: timeStr, label: timeStr, disabled: true, booked: false });
      }
    }
    return slots;
  }

  const isSelectedDateToday = isToday(selectedDate);
  const startOfSelectedDay = startOfDay(selectedDate); // Calcular una vez para la fecha seleccionada

  // Pre-filtrar citas que caen en el día seleccionado para optimizar la búsqueda
  const appointmentsOnSelectedDate = appointments.filter(app => {
    if (app.estado === AppointmentStatusEnum.CANCELADA) return false;
    // Comparar solo la parte de la fecha (ignorando la hora)
    return startOfDay(new Date(app.fechaConsulta)).getTime() === startOfSelectedDay.getTime();
  });

  for (let hour = 9; hour <= 15; hour++) {
    for (const minute of [0, 30]) {
      // Evitar el slot de las 15:30 si el límite es hasta las 15:00 inclusive
      if (hour === 15 && minute === 30) continue;

      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      let isDisabled = false;
      let isBooked = false;

      const slotDateTime = setMinutes(setHours(new Date(startOfSelectedDay), hour), minute);

      // Deshabilitar si el slot es en el pasado para el día de hoy
      if (isSelectedDateToday && isBefore(slotDateTime, now)) {
        isDisabled = true;
      }

      // Verificar si el slot está ocupado solo si no está ya deshabilitado por otra razón
      if (!isDisabled) {
        isBooked = appointmentsOnSelectedDate.some(app => app.horaConsulta === timeStr);
        if (isBooked) {
          isDisabled = true; // Un slot ocupado también está deshabilitado para selección
        }
      }
      
      slots.push({ value: timeStr, label: timeStr, disabled: isDisabled, booked: isBooked });
    }
  }
  return slots;
};

// --- Componente React ---

interface NewPatientFormProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function NewPatientForm({ onSuccess, triggerButton }: NewPatientFormProps) {
  const [open, setOpen] = useState(false);
  const { addPatient, addAppointment, appointments = [] } = useAppContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      telefono: "",
      notas: "",
      edad: undefined, // Correcto para inputs numéricos opcionales
      // fechaConsulta y horaConsulta se inicializarán por el DatePicker/Select o por el usuario
      // motivoConsulta se inicializará por el Select o por el usuario
    },
  });

  const selectedDate = form.watch("fechaConsulta");

  // Memoizar la generación de timeSlots para evitar recálculos innecesarios
  const timeSlots = useMemo(() => generateTimeSlots(selectedDate, appointments), [selectedDate, appointments]);

  async function onSubmit(values: FormValues) {
    const submissionToast = toast.loading("Registrando paciente...");
    try {
      const newPatient = await addPatient({
        nombre: values.nombre,
        apellidos: values.apellidos,
        edad: values.edad,
        fecha_registro: new Date().toISOString(),
        diagnostico_principal: values.motivoConsulta,
        estado_paciente: PatientStatusEnum.PENDIENTE_DE_CONSULTA,
        probabilidad_cirugia: 0.5, // Este valor podría ser configurable o calculado
        notas_paciente: values.notas || "",
        telefono: values.telefono,
      });

      await addAppointment({
        patientId: newPatient.id,
        fechaConsulta: values.fechaConsulta, // Zod asegura que es Date
        horaConsulta: values.horaConsulta as `${number}:${number}`, // Zod asegura que es string, casteamos para el tipo específico
        paciente: `${values.nombre} ${values.apellidos}`.trim(),
        telefono: values.telefono,
        motivoConsulta: values.motivoConsulta,
        doctor: "Doctor Asignado", // Este valor podría ser configurable
        estado: AppointmentStatusEnum.PROGRAMADA,
        notas: values.notas || "",
      });

      toast.success("Paciente registrado y cita agendada.", { id: submissionToast });
      setOpen(false);
      form.reset(); // Resetea el formulario a los defaultValues
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error al registrar paciente:", error);
      // Podrías inspeccionar 'error' para dar un mensaje más específico si tu API lo proporciona
      toast.error("Error al registrar paciente. Intente de nuevo.", { id: submissionToast });
    }
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

        {/* Contenedor del formulario con scroll interno */}
        <div className="flex-grow overflow-y-auto px-6 py-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Sección de Información Personal */}
              <section aria-labelledby="patient-data-heading" className="space-y-4">
                <h3 id="patient-data-heading" className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
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
                            {...field} 
                            // Manejar el valor para que un campo numérico opcional pueda estar vacío
                            // en lugar de mostrar 0 o NaN cuando es undefined.
                            value={field.value === undefined ? '' : String(field.value)}
                            onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            className="h-9 text-sm" 
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
              </section>

              {/* Sección de Detalles de Consulta */}
              <section aria-labelledby="appointment-data-heading" className="space-y-4">
                <h3 id="appointment-data-heading" className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
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
                        {/* Asumiendo que DatePicker es un Client Component y maneja su estado interno o vía props */}
                        <DatePicker
                          value={field.value}
                          onChange={(date) => {
                            field.onChange(date);
                            // Opcional: resetear la hora si la fecha cambia y ya había una hora seleccionada
                            // form.setValue("horaConsulta", undefined, { shouldValidate: true }); 
                          }}
                          minDate={new Date()} // No permitir fechas pasadas
                          maxDate={addMonths(new Date(), 3)} // Limitar a 3 meses en el futuro
                          placeholder="Seleccione fecha"
                          filterDate={(date) => date.getDay() !== 0} // Ejemplo: No permitir Domingos
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
                              className={cn("h-9 text-sm", !selectedDate && "text-slate-500 dark:text-slate-400")}
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
                                    // Si está deshabilitado pero no ocupado (ej. fuera de horario), un estilo diferente
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

              {/* Sección de Notas Adicionales */}
              <section aria-labelledby="additional-notes-heading" className="space-y-2">
                <h3 id="additional-notes-heading" className="text-base font-medium text-slate-800 dark:text-slate-100 border-b pb-2 mb-3 border-slate-200 dark:border-slate-700">
                  Notas Adicionales (Opcional)
                </h3>
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only text-xs">Notas</FormLabel> {/* sr-only si el título de la sección es suficiente */}
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

              {/* Footer del Dialog con acciones, es sticky al final del contenido scrollable */}
              <DialogFooter className="pt-6 border-t border-slate-200 dark:border-slate-800 px-6 pb-5 sticky bottom-0 bg-white dark:bg-slate-950 z-10">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" size="sm" disabled={form.formState.isSubmitting}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting || !form.formState.isValid && form.formState.isSubmitted} // Deshabilitar si se está enviando o si no es válido después del primer intento de envío
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
  );
}