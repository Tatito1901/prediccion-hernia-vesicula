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
import { PatientData, DiagnosisType, AppointmentStatus, PatientStatus, DateString, TimeString, DiagnosisEnum, AppointmentData } from "@/app/dashboard/data-model";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";
import type { Database } from "@/lib/types/database.types";

registerLocale("es", es);

// Derive options from enums
const diagnosticoOptions = Object.values(DiagnosisEnum) as DiagnosisType[];

// Default user ID until auth is implemented
const DEFAULT_USER_ID = "5e4d29a2-5eec-49ee-ac0f-8d349d5660ed";

// Define supabase insert types
type PatientInsert = Omit<Database['public']['Tables']['patients']['Insert'], 'id'>
type AppointmentInsert = Omit<Database['public']['Tables']['appointments']['Insert'], 'id'>

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

// Validation schema generator

// Base schema with common fields
const baseSchema = z.object({
  nombre: z.string()
    .min(2, "Nombre debe tener al menos 2 caracteres.")
    .max(50, "Nombre no puede exceder 50 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Nombre solo debe contener letras."),
  apellidos: z.string()
    .min(2, "Apellidos deben tener al menos 2 caracteres.")
    .max(100, "Apellidos no pueden exceder 100 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, "Apellidos solo deben contener letras."),
  edad: z.coerce.number().min(0).max(120).optional(),
  telefono: z.string()
    .min(10, "Teléfono debe tener al menos 10 dígitos.")
    .max(15, "Teléfono no puede exceder 15 dígitos.")
    .regex(/^\d+$/, "Teléfono solo debe contener números."),
  email: z.string()
    .email("Email inválido.")
    .optional()
    .or(z.literal("")),
  comentarios_registro: z.string().max(500, "Comentarios no pueden exceder 500 caracteres.").optional(),
});

const getUnifiedPatientFormSchema = (mode: 'registerOnly' | 'registerAndSchedule') => {
  if (mode === 'registerAndSchedule') {
    return baseSchema.extend({
      diagnostico: z.enum(diagnosticoOptions as [string, ...string[]]), // Required
      fechaHoraConsulta: z.date({ required_error: "Fecha y hora son requeridas." })
        .refine(date => isValidDate(date), "Fecha inválida.")
        .refine(date => date >= new Date(), "La fecha debe ser futura."), // Required
    });
  }
  // mode === 'registerOnly'
  return baseSchema.extend({
    diagnostico: z.enum(diagnosticoOptions as [string, ...string[]]).optional(), // Optional
    fechaHoraConsulta: z.date().optional(), // Optional
  });
};

type UnifiedPatientFormValues = z.infer<ReturnType<typeof getUnifiedPatientFormSchema>>;

interface UnifiedPatientFormProps {
  mode?: 'registerOnly' | 'registerAndSchedule';
  onSuccess?: (data: { patient: PatientData; appointment?: AppointmentData }) => void;
  className?: string;
  buttonVariant?: "default" | "secondary" | "outline" | "ghost" | "link" | null | undefined;
  buttonLabel?: string;
  dialogTrigger?: React.ReactNode; // Allow custom trigger
}

export const UnifiedPatientRegistrationForm: FC<UnifiedPatientFormProps> = ({
  mode = 'registerAndSchedule',
  onSuccess,
  className = "",
  buttonVariant = "secondary",
  buttonLabel: customButtonLabel,
  dialogTrigger,
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPatient, addAppointment } = useAppContext();

  const formSchema = useMemo(() => getUnifiedPatientFormSchema(mode), [mode]);

  useEffect(() => {
    if (!addPatient || (mode === 'registerAndSchedule' && !addAppointment)) {
      console.error("[UnifiedPatientForm] Context functions not available for mode:", mode);
      toast.error("Error de configuración", {
        description: "Las funciones necesarias no están disponibles. Por favor, recarga la página."
      });
    }
  }, [addPatient, addAppointment, mode]);

  const form = useForm<UnifiedPatientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: undefined,
      telefono: "",
      email: "",
      diagnostico: undefined,
      fechaHoraConsulta: mode === 'registerAndSchedule' ? addDays(new Date(), 1) : undefined,
      comentarios_registro: "",
    },
  });

  useEffect(() => {
    // Reset form when mode changes and dialog is closed, or when dialog opens
    if (open) {
        form.reset({
            nombre: "",
            apellidos: "",
            edad: undefined,
            telefono: "",
            email: "",
            diagnostico: undefined,
            fechaHoraConsulta: mode === 'registerAndSchedule' ? addDays(new Date(), 1) : undefined,
            comentarios_registro: "",
        });
    }
  }, [mode, open, form]);


  const timeRanges = useMemo(() => {
    const minTime = new Date(); minTime.setHours(9, 0, 0, 0);
    const maxTime = new Date(); maxTime.setHours(17, 0, 0, 0);
    return { minTime, maxTime };
  }, []);

  const onSubmit = async (values: UnifiedPatientFormValues) => {
    if (!addPatient || (mode === 'registerAndSchedule' && !addAppointment)) {
      toast.error("Error de configuración", { description: "Las funciones necesarias no están disponibles." });
      return;
    }

    setIsSubmitting(true);

    try {
      const currentUserId = DEFAULT_USER_ID;
      const fechaRegistro = new Date().toISOString().split('T')[0];

      // Use supabase Insert type for patients
      const patientPayload: PatientInsert = {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        edad: values.edad,
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        estado_paciente: "PENDIENTE DE CONSULTA" as PatientStatus,
        diagnostico_principal: values.diagnostico as DiagnosisType | undefined,
        comentarios_registro: values.comentarios_registro?.trim(),
        creado_por_id: currentUserId,
        fecha_registro: fechaRegistro,
      };

      const newPatientResponse = await addPatient(patientPayload);
      if (!newPatientResponse) throw new Error("No se pudo crear el paciente");

      let patientId: string;
      let newPatient: PatientData;

      if (typeof newPatientResponse === 'number' || typeof newPatientResponse === 'string') {
        patientId = normalizeId(newPatientResponse);
        newPatient = {
          id: patientId,
          ...patientPayload,
          estado: patientPayload.estado_paciente,
          probabilidadCirugia: 0, // Default value
          timestampRegistro: new Date().toISOString(),
          ultimoContacto: fechaRegistro,
        } as PatientData;
      } else if (typeof newPatientResponse === 'object' && newPatientResponse.id) {
        patientId = normalizeId(newPatientResponse.id);
        newPatient = newPatientResponse as PatientData;
      } else {
        throw new Error("Respuesta inesperada al crear paciente");
      }

      let newAppointment: AppointmentData | undefined = undefined;
      if (mode === 'registerAndSchedule') {
        if (!values.fechaHoraConsulta || !values.diagnostico) {
          throw new Error("Fecha, hora y diagnóstico son requeridos para agendar cita.");
        }

        const formattedHoraConsulta = safeFormatDate(values.fechaHoraConsulta, 'HH:mm') as TimeString;

        const appointmentPayload: AppointmentInsert = {
          patient_id: patientId,
          motivo_cita: values.diagnostico as Database['public']['Enums']['diagnosis_enum'],
          fecha_hora_cita: values.fechaHoraConsulta.toISOString(),
          estado_cita: 'PROGRAMADA',
          es_primera_vez: true,
          notas_cita_seguimiento: `Consulta inicial por: ${values.diagnostico}. Registrado vía formulario unificado.`,
        };

        const createdAppointment = await addAppointment(appointmentPayload);
        if (!createdAppointment) throw new Error("No se pudo crear la cita");
        newAppointment = createdAppointment;
      }

      toast.success("Operación exitosa", {
        description: mode === 'registerAndSchedule' 
          ? `${values.nombre} ${values.apellidos} ha sido registrado y su cita programada.`
          : `${values.nombre} ${values.apellidos} ha sido registrado.`
      });
      
      setOpen(false);
      form.reset();
      if (onSuccess) {
        onSuccess({ patient: newPatient, appointment: newAppointment });
      }

    } catch (error: any) {
      console.error("[UnifiedPatientForm] Error:", error);
      toast.error("Error en el formulario", { description: error.message || "Ocurrió un problema." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentButtonLabel = customButtonLabel || (mode === 'registerAndSchedule' ? "Nuevo Paciente y Cita" : "Registrar Paciente");
  const dialogTitle = mode === 'registerAndSchedule' ? "Registrar Nuevo Paciente y Agendar Cita" : "Registrar Nuevo Paciente";

  const trigger = dialogTrigger || (
    <Button variant={buttonVariant} className={cn("flex items-center", className)}>
      <Plus className="mr-2 h-4 w-4" /> {currentButtonLabel}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {mode === 'registerAndSchedule'
              ? "Completa los datos para registrar al paciente y programar su primera consulta."
              : "Completa los datos básicos para registrar al nuevo paciente."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre(s)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Juan" {...field} />
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
                    <FormLabel>Apellidos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Pérez García" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Ej. 5512345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Ej. juan.perez@correo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="edad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad (Opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Ej. 35" 
                      {...field} 
                      onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} 
                      value={field.value === undefined ? '' : field.value} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnostico"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{mode === 'registerAndSchedule' ? "Motivo de Consulta" : "Diagnóstico Principal (Opcional)"}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={`Selecciona un ${mode === 'registerAndSchedule' ? 'motivo' : 'diagnóstico'}`} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {diagnosticoOptions.map(option => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'registerAndSchedule' && (
              <>
                <FormField
                  control={form.control}
                  name="fechaHoraConsulta"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha y Hora de Consulta</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                safeFormatDate(field.value, "PPP HH:mm", { locale: es })
                              ) : (
                                <span>Selecciona fecha y hora</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Controller
                            control={form.control}
                            name="fechaHoraConsulta"
                            render={({ field: controllerField }) => (
                              <DatePicker
                                selected={controllerField.value}
                                onChange={(date) => controllerField.onChange(date)}
                                inline
                                showTimeSelect
                                timeFormat="HH:mm"
                                timeIntervals={15}
                                dateFormat="Pp"
                                locale={es}
                                minDate={new Date()} // Prevent past dates
                                minTime={timeRanges.minTime}
                                maxTime={timeRanges.maxTime}
                                filterDate={date => date.getDay() !== 0 && date.getDay() !== 6} // No weekends
                              />
                            )}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="comentarios_registro"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentarios Adicionales (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Alergias, medicación actual, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : (mode === 'registerAndSchedule' ? "Registrar y Agendar" : "Registrar Paciente")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
