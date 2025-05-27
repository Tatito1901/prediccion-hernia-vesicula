"use client";

import React, { useState, useMemo, FC, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarClock, CalendarIcon } from 'lucide-react';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, AppointmentData, AppointmentStatus, DiagnosisType } from "@/app/dashboard/data-model";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

registerLocale("es", es);

// Helper functions
const isValidDateInternal = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime()) && isValid(date);
};

const safeFormatDateInternal = (date: any, formatString: string, options?: any): string => {
  try {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValidDateInternal(dateObj)) return "";
    return format(dateObj, formatString, options);
  } catch (error) {
    return "";
  }
};

const normalizeIdInternal = (id: any): string => {
  if (id === null || id === undefined) return "";
  return String(id);
};

// Validation schema for appointments
const appointmentFormSchema = z.object({
  motivoConsulta: z.string({ required_error: "Motivo es requerido." }) as z.ZodType<DiagnosisType>,
  fechaHoraConsulta: z.date({ required_error: "Fecha y hora son requeridas." })
    .refine(date => isValidDateInternal(date), {
      message: "La fecha y hora son inválidas.",
    }),
  notas_cita: z.string().optional(),
  es_primera_vez: z.boolean(),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface AppointmentFormProps {
  patient: PatientData;
  onSuccess?: (newAppointment: AppointmentData) => void;
  className?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | null | undefined;
  buttonLabel?: string;
  isIcon?: boolean;
}

export const AppointmentForm: FC<AppointmentFormProps> = ({
  patient,
  onSuccess,
  className = "",
  buttonVariant = "outline",
  buttonLabel = "Agendar Cita",
  isIcon = false,
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addAppointment } = useAppContext();

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      motivoConsulta: patient.diagnostico_principal || undefined,
      fechaHoraConsulta: addDays(new Date(), 1),
      notas_cita: "",
      es_primera_vez: true,
    },
  });

  const timeRanges = useMemo(() => {
    const minTime = new Date(); minTime.setHours(9, 0, 0, 0);
    const maxTime = new Date(); maxTime.setHours(17, 0, 0, 0);
    return { minTime, maxTime };
  }, []);

  const onSubmit = async (values: AppointmentFormValues) => {
    if (!addAppointment) {
      toast.error("Error de configuración", { 
        description: "La función para añadir citas no está disponible." 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isValidDateInternal(values.fechaHoraConsulta)) {
        throw new Error("La fecha seleccionada no es válida");
      }

      const fechaConsulta = safeFormatDateInternal(values.fechaHoraConsulta, 'yyyy-MM-dd');
      const horaConsulta = safeFormatDateInternal(values.fechaHoraConsulta, 'HH:mm');

      if (!fechaConsulta || !horaConsulta) {
        throw new Error("Error al procesar la fecha y hora de la consulta");
      }

      const fechaHoraCita = `${fechaConsulta}T${horaConsulta}:00`;

      const appointmentPayload: any = {
        patient_id: normalizeIdInternal(patient.id),
        motivo_cita: values.motivoConsulta, 
        estado_cita: "PROGRAMADA",
        es_primera_vez: values.es_primera_vez,
        notas_cita_seguimiento: values.notas_cita || 
          (values.es_primera_vez 
            ? "Primera consulta agendada."
            : "Consulta de seguimiento agendada."),
        fecha_hora_cita: fechaHoraCita
      };
      
      let newAppointmentResponse;
      
      try {
        newAppointmentResponse = await addAppointment(appointmentPayload);

        if (!newAppointmentResponse) {
          throw new Error("No se pudo crear la cita. La respuesta del servidor fue vacía.");
        }
      } catch (innerError: any) {
        throw new Error(innerError.message || "Error interno al intentar guardar la cita.");
      }
      
      const successMessage = `${patient.nombre} ${patient.apellidos} agendado para el ${safeFormatDateInternal(
        values.fechaHoraConsulta, 
        "dd/MM/yyyy 'a las' HH:mm", 
        { locale: es }
      )}.`;
      
      toast.success("Cita agendada con éxito", {
        description: successMessage,
      });
      
      form.reset();
      setOpen(false);
      
      if (onSuccess && newAppointmentResponse) {
        onSuccess(newAppointmentResponse as AppointmentData);
      }
    } catch (error: any) {
      let errorMessage = "Ocurrió un problema al agendar la cita.";
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error("Error al agendar cita", { 
        description: errorMessage,
        duration: 5000,
        id: `appointment-error-${errorMessage}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const motivosConsultaOptions: DiagnosisType[] = [
    "HERNIA INGUINAL", "HERNIA UMBILICAL", "COLECISTITIS", "COLEDOCOLITIASIS",
    "COLANGITIS", "APENDICITIS", "HERNIA HIATAL", "LIPOMA GRANDE",
    "HERNIA INGUINAL RECIDIVANTE", "QUISTE SEBACEO INFECTADO",
    "EVENTRACION ABDOMINAL", "VESICULA (COLECISTITIS CRONICA)", "OTRO"
  ];

  const hasHadPreviousAppointment = useCallback(() => {
    return patient.estado_paciente === "CONSULTADO" || 
           patient.estado_paciente === "EN SEGUIMIENTO" || 
           patient.estado_paciente === "OPERADO" || 
           patient.estado_paciente === "NO OPERADO" || 
           patient.estado_paciente === "INDECISO";
  }, [patient.estado_paciente]);

  const handleOpenDialog = () => {
    const isPrimeraVez = !hasHadPreviousAppointment();
    
    form.reset({
      motivoConsulta: patient.diagnostico_principal || undefined,
      fechaHoraConsulta: addDays(new Date(), 1),
      notas_cita: "",
      es_primera_vez: isPrimeraVez,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(newOpenState) => {
      setOpen(newOpenState);
      if (newOpenState) {
        handleOpenDialog();
      }
    }}>
      <DialogTrigger asChild>
        {isIcon ? (
          <Button
            variant={buttonVariant || "outline"}
            size="sm"
            className={cn("transition-all", className)}
            title={`Agendar cita para ${patient.nombre} ${patient.apellidos}`}
          >
            <CalendarClock className="h-4 w-4" />
            <span className="sr-only">Agendar cita</span>
          </Button>
        ) : (
          <Button
            variant={buttonVariant || "outline"}
            size="sm"
            className={cn("flex items-center gap-2", className)}
          >
            <CalendarClock className="h-4 w-4" />
            <span>{buttonLabel}</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6",
        isMobile ? 'w-[95vw]' : ''
      )}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-xl" : "text-2xl"}>
            Agendar Cita para Paciente
          </DialogTitle>
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="block font-medium text-blue-600 dark:text-blue-400">
              {patient.nombre} {patient.apellidos}
            </span>
            <span className="block mt-1">
              Completa la información para agendar una cita (Lunes–Sábado, 9:00–17:00)
            </span>
          </div>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <FormField
              control={form.control}
              name="motivoConsulta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de Consulta <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {motivosConsultaOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormDescription>
                    Motivo principal de la consulta médica
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fechaHoraConsulta"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha y Hora <span className="text-red-500">*</span></FormLabel>
                  <Controller
                    control={form.control}
                    name="fechaHoraConsulta"
                    render={({ field: controllerField }) => ( 
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal w-full justify-start", 
                                !controllerField.value && "text-muted-foreground"
                              )}
                            >
                              {controllerField.value ? (
                                safeFormatDateInternal(
                                  controllerField.value,
                                  "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", 
                                  { locale: es }
                                )
                              ) : (
                                <span>Seleccionar fecha y hora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DatePicker
                            selected={controllerField.value}
                            onChange={controllerField.onChange}
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
                            filterDate={(date) => date.getDay() !== 0} // Exclude Sundays
                            filterTime={(time) => {
                              const hour = time.getHours();
                              return hour !== 14; // Exclude 14:00-14:59 (lunch hour)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  />
                  <FormDescription>
                    Selecciona fecha y hora para la consulta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="es_primera_vez"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      id={field.name} 
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel htmlFor={field.name}>Primera Consulta</FormLabel> 
                    <FormDescription>
                      Marca esta opción si es la primera consulta del paciente
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notas_cita"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas para la cita</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales para esta cita..." 
                      {...field} 
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting || !form.formState.isValid}
              >
                {isSubmitting ? "Agendando..." : "Agendar Cita"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
