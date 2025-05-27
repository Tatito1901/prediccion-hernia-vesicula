"use client";

import React, { useState, useMemo, FC, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, CalendarIcon } from 'lucide-react';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from "@/components/ui/form";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

import { useAppContext } from "@/lib/context/app-context";
import type { PatientData, AppointmentData, PatientStatus, AppointmentStatus, TimeString, DiagnosisType } from "@/app/dashboard/data-model";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

registerLocale("es", es);

// Default user ID until auth is implemented
const DEFAULT_USER_ID = "5e4d29a2-5eec-49ee-ac0f-8d349d5660ed";

// Helper functions
const isValidDate = (date: any): boolean => {
  return date instanceof Date && !isNaN(date.getTime()) && isValid(date);
};

const safeFormatDate = (date: any, formatString: string, options?: any): string => {
  try {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    if (!isValidDate(dateObj)) return "";
    return format(dateObj, formatString, options);
  } catch (error) {
    console.error("[safeFormatDate] Error formatting date:", error);
    return "";
  }
};

const normalizeId = (id: any): string => {
  if (id === null || id === undefined) return "";
  return String(id);
};

// Validation schema
const newPatientFormSchema = z.object({
  nombre: z.string()
    .min(2, "Nombre debe tener al menos 2 caracteres.")
    .max(50, "Nombre no puede exceder 50 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombre solo debe contener letras."),
  apellidos: z.string()
    .min(2, "Apellidos deben tener al menos 2 caracteres.")
    .max(100, "Apellidos no pueden exceder 100 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo deben contener letras."),
  edad: z.string()
    .optional()
    .refine(val => val === "" || val === undefined || (Number(val) >= 0 && Number(val) <= 120), "Edad debe ser un número válido entre 0 y 120.")
    .transform(val => val === "" || val === undefined ? undefined : Number(val)),
  telefono: z.string()
    .min(10, "Teléfono debe tener al menos 10 dígitos.")
    .max(15, "Teléfono no puede exceder 15 dígitos.")
    .regex(/^\d+$/, "Teléfono solo debe contener números."),
  email: z.string()
    .email("Email inválido.")
    .optional()
    .or(z.literal("")),
  motivoConsulta: z.string({ required_error: "Motivo es requerido." }) as z.ZodType<DiagnosisType>,
  fechaHoraConsulta: z.date({ required_error: "Fecha y hora son requeridas." })
    .refine(date => isValidDate(date), "Fecha inválida.")
    .refine(date => date >= new Date(), "La fecha debe ser futura."),
  comentarios_registro: z.string().max(500, "Comentarios no pueden exceder 500 caracteres.").optional(),
  origen_paciente: z.string().optional(),
});

type NewPatientFormValues = z.infer<typeof newPatientFormSchema>;

interface NewPatientFormProps {
  onSuccess?: (newPatient: PatientData, newAppointment: AppointmentData) => void;
  className?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | null | undefined;
  buttonLabel?: string;
}

export const NewPatientForm: FC<NewPatientFormProps> = ({
  onSuccess,
  className = "",
  buttonVariant = "secondary",
  buttonLabel = "Nuevo Paciente",
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPatient, addAppointment } = useAppContext();

  // Check if context functions are available
  useEffect(() => {
    if (!addPatient || !addAppointment) {
      console.error("[NewPatientForm] Context functions not available");
      toast.error("Error de configuración", { 
        description: "Las funciones necesarias no están disponibles. Por favor, recarga la página." 
      });
    }
  }, [addPatient, addAppointment]);

  const form = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientFormSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: undefined,
      telefono: "",
      email: "",
      motivoConsulta: undefined,
      fechaHoraConsulta: addDays(new Date(), 1),
      comentarios_registro: "",
      origen_paciente: "Recomendación",
    },
  });

  const timeRanges = useMemo(() => {
    const minTime = new Date(); minTime.setHours(9, 0, 0, 0);
    const maxTime = new Date(); maxTime.setHours(17, 0, 0, 0);
    return { minTime, maxTime };
  }, []);

  const onSubmit = async (values: NewPatientFormValues) => {
    // Validate context functions
    if (!addPatient || !addAppointment) {
      toast.error("Error de configuración", { 
        description: "Las funciones necesarias no están disponibles." 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Use default user ID
      const currentUserId = DEFAULT_USER_ID;

      // Validate date
      if (!isValidDate(values.fechaHoraConsulta)) {
        throw new Error("La fecha seleccionada no es válida");
      }

      // Format date correctly
      const fechaRegistro = new Date().toISOString().split('T')[0];
      const fechaConsulta = safeFormatDate(values.fechaHoraConsulta, 'yyyy-MM-dd');
      const horaConsulta = safeFormatDate(values.fechaHoraConsulta, 'HH:mm');

      if (!fechaConsulta || !horaConsulta) {
        throw new Error("Error al procesar la fecha y hora de la consulta");
      }

      // Build patient payload
      const patientPayload = {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad,
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        estado_paciente: "PENDIENTE DE CONSULTA" as PatientStatus,
        diagnostico_principal: values.motivoConsulta,
        comentarios_registro: values.comentarios_registro?.trim(),
        creado_por_id: currentUserId,
        origen_paciente: values.origen_paciente as "Google" | "Facebook" | "Instagram" | "Recomendación de Médico" | "Recomendación Familiar/Amigo" | "Seguro Médico" | "Sitio Web" | "Urgencias" | "Referido por Gastroenterólogo" | "Otro",
        fecha_registro: fechaRegistro,
      };

      // Create patient
      const newPatientResponse = await addPatient(patientPayload);

      if (!newPatientResponse) {
        throw new Error("No se pudo crear el paciente");
      }

      // Extract patient ID from response
      let patientId: string;
      let newPatient: PatientData;

      if (typeof newPatientResponse === 'number' || typeof newPatientResponse === 'string') {
        // Response is just an ID
        patientId = normalizeId(newPatientResponse);
        
        // Build complete patient object
        newPatient = {
          id: patientId,
          ...patientPayload,
          estado: patientPayload.estado_paciente,
          probabilidadCirugia: 0,
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: fechaRegistro,
        } as PatientData;
      } else if (typeof newPatientResponse === 'object' && newPatientResponse.id) {
        // Response is a complete object
        patientId = normalizeId(newPatientResponse.id);
        newPatient = newPatientResponse as PatientData;
      } else {
        throw new Error("Respuesta inesperada al crear paciente");
      }

      // Build appointment payload
      const appointmentPayload = {
        patient_id: normalizeId(newPatient.id),
        estado: "PROGRAMADA" as AppointmentStatus,
        horaConsulta: format(values.fechaHoraConsulta, 'HH:mm'),
        fecha_hora_cita: format(values.fechaHoraConsulta, "yyyy-MM-dd'T'HH:mm:ss") 
      };

      // Create appointment
      const newAppointmentResponse = await addAppointment(appointmentPayload);

      if (!newAppointmentResponse) {
        // If appointment creation fails, we still have the patient created
        console.warn("[NewPatientForm] No se pudo crear la cita, pero el paciente fue creado");
        toast.warning("Paciente creado", {
          description: "El paciente fue registrado pero no se pudo agendar la cita. Por favor, agenda la cita manualmente.",
        });
        
        setOpen(false);
        form.reset();
        
        // Call onSuccess with just the patient
        if (onSuccess) {
          // Create an empty appointment for compatibility
          const emptyAppointment = {
            id: "temp-" + Date.now(),
            paciente: `${newPatient.nombre} ${newPatient.apellidos}`,
            telefono: newPatient.telefono || "",
            fechaConsulta: values.fechaHoraConsulta,
            horaConsulta: horaConsulta,
            motivoConsulta: values.motivoConsulta,
            estado: "pendiente" as AppointmentStatus,
            patientId: patientId,
          } as AppointmentData;
          
          onSuccess(newPatient, emptyAppointment);
        }
        return;
      }

      // Complete success
      const successMessage = `${values.nombre} ${values.apellidos} agendado para el ${safeFormatDate(
        values.fechaHoraConsulta, 
        "dd/MM/yyyy 'a las' HH:mm", 
        { locale: es }
      )}.`;
      
      toast.success("Registro exitoso", {
        description: successMessage,
      });
      
      setOpen(false);
      form.reset();
      
      if (onSuccess && typeof newAppointmentResponse === 'object') {
        onSuccess(newPatient, newAppointmentResponse as AppointmentData);
      }
      
    } catch (error: any) {
      console.error("[NewPatientForm] Error completo:", error);
      
      // Improved error handling
      let errorMessage = "Ocurrió un problema al registrar.";
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast.error("Error al registrar", { 
        description: errorMessage,
        duration: 5000,
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

  // Reset form when opening dialog
  const handleOpenDialog = () => {
    form.reset({
      nombre: "",
      apellidos: "",
      edad: undefined,
      telefono: "",
      email: "",
      motivoConsulta: undefined,
      fechaHoraConsulta: addDays(new Date(), 1),
      comentarios_registro: "",
      origen_paciente: "Recomendación",
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
        <Button
          variant={buttonVariant || "secondary"}
          size="sm"
          className={cn("flex items-center gap-2", className)}
        >
          <Plus className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6",
        isMobile ? 'w-[95vw]' : ''
      )}>
        <DialogHeader>
          <DialogTitle className={isMobile ? "text-xl" : "text-2xl"}>
            Registrar Nuevo Paciente y Cita
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-sm" : ""}>
            Completa la información y agenda la consulta (Lunes–Sábado, 9:00–17:00)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre(s) <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Juan Alberto" 
                        {...field} 
                        autoComplete="given-name"
                      />
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
                    <FormLabel>Apellidos <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Pérez García" 
                        {...field} 
                        autoComplete="family-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="edad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Edad</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ej. 35" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : val);
                        }}
                        min="0"
                        max="120"
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
                    <FormLabel>Teléfono <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="tel" 
                        placeholder="10 dígitos" 
                        {...field} 
                        autoComplete="tel"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="ejemplo@correo.com" 
                      {...field} 
                      value={field.value ?? ''} 
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="motivoConsulta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de consulta / Diagnóstico inicial <span className="text-red-500">*</span></FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {motivosConsultaOptions.map(motivo => (
                        <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Controller
              name="fechaHoraConsulta"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha y hora de consulta <span className="text-red-500">*</span></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                            fieldState.error && "border-red-500 focus-visible:ring-red-500"
                          )}
                        >
                          {field.value && isValidDate(field.value) ? (
                            safeFormatDate(field.value, "PPP HH:mm", { locale: es }) || "Fecha inválida"
                          ) : (
                            <span>Selecciona fecha y hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DatePicker
                        selected={field.value && isValidDate(field.value) ? field.value : null}
                        onChange={(date: Date | null) => {
                          if (date && isValidDate(date)) {
                            field.onChange(date);
                          }
                        }}
                        showTimeSelect
                        timeIntervals={30}
                        dateFormat="dd/MM/yyyy HH:mm"
                        locale="es"
                        minDate={new Date()}
                        filterDate={(date: Date) => date.getDay() !== 0} // No Sundays
                        minTime={timeRanges.minTime}
                        maxTime={timeRanges.maxTime}
                        inline
                        calendarClassName="border-0 shadow-none"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>Lunes a Sábado, 9:00 AM - 5:00 PM.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comentarios_registro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios de Registro (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ej. Referido por Dr. X, llamó preguntando por costos..." 
                      {...field} 
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="origen_paciente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Origen del Paciente</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="¿Cómo nos conoció?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Recomendación">Recomendación</SelectItem>
                      <SelectItem value="Redes Sociales">Redes Sociales</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Página Web">Página Web</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => { 
                  setOpen(false); 
                  form.reset();
                }} 
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !addPatient || !addAppointment}
              >
                {isSubmitting && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                )}
                {isSubmitting ? "Registrando..." : "Registrar y Agendar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
