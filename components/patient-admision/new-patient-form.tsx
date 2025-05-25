"use client"

import { useState, useMemo, FC, memo } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { format, isToday, isAfter, isBefore, startOfDay, endOfDay, addDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import type { DiagnosisType, PatientStatus } from "@/app/dashboard/data-model"
import { useIsMobile, useIsTablet } from "@/hooks/use-breakpoint"
import { cn } from "@/lib/utils"

// Mejorar el esquema de validación con mensajes específicos
const formSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." })
           .max(50, { message: "El nombre no debe exceder 50 caracteres." }),
  apellidos: z.string().min(2, { message: "Los apellidos deben tener al menos 2 caracteres." })
              .max(100, { message: "Los apellidos no deben exceder 100 caracteres." }),
  edad: z.string()
         .optional()
         .refine(val => {
           if (val === undefined || val === '') return true; 
           return /^\d+$/.test(val);
         }, {
           message: "La edad debe ser un número entero."
         })
         .transform((val) => (val === "" ? "0" : val)),
  telefono: z.string()
            .min(10, { message: "El teléfono debe tener al menos 10 dígitos." })
            .max(15, { message: "El teléfono no debe exceder 15 dígitos." })
            .regex(/^\d+$/, { message: "El teléfono debe contener solo números." }),
  motivoConsulta: z.string({ required_error: "Por favor seleccione un motivo de consulta." }),
  fechaHoraConsulta: z.date({ required_error: "Por favor seleccione fecha y hora de la consulta." })
                     .refine((date): date is Date => date instanceof Date, {
                       message: "La fecha y hora son obligatorias."
                     }),
  notas: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export interface NewPatientFormProps {
  onSuccess?: () => void;
  className?: string;
  buttonVariant?: "primary" | "secondary" | "outline";
  buttonLabel?: string;
}

// Componente de formulario memoizado para mejor rendimiento 
export const NewPatientForm: FC<NewPatientFormProps> = memo(({ 
  onSuccess,
  className = "",
  buttonVariant = "secondary",
  buttonLabel = "Nuevo Paciente" 
}) => {
  // Utilizar nuestro hook de breakpoint para adaptar el formulario
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { patients, setPatients, addAppointment } = useAppContext();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      edad: "",
      telefono: "",
      motivoConsulta: "",
      fechaHoraConsulta: new Date(),
      notas: "",
    },
  });

  // Memoizar rangos de tiempo para evitar recreaciones
  const timeRanges = useMemo(() => {
    const minTime = new Date();
    minTime.setHours(9, 0, 0, 0);
    const maxTime = new Date();
    maxTime.setHours(14, 0, 0, 0);
    return { minTime, maxTime };
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const fechaObj = values.fechaHoraConsulta!; // Fecha/hora de la cita
      const horaStr = format(fechaObj, "HH:mm");
      const fechaISO = fechaObj.toISOString().split("T")[0]; // Solo fecha para la cita

      // 1. Preparar datos para la tabla 'patients' de Supabase
      const patientSupabaseData = {
        full_name: `${values.nombre} ${values.apellidos}`,
        contact_details: { phone: values.telefono },
      };

      // 2. Insertar el nuevo paciente en Supabase
      const { data: newPatient, error: patientInsertError } = await supabase
        .from('patients')
        .insert([patientSupabaseData])
        .select() // Para obtener el registro insertado, incluyendo el 'id' y 'created_at'
        .single(); // Asumimos que se inserta un solo paciente

      if (patientInsertError) {
        console.error("Error inserting patient into Supabase:", patientInsertError);
        toast.error("Error al registrar paciente en BBDD.", {
          description: patientInsertError.message,
        });
        setIsSubmitting(false);
        return;
      }

      if (!newPatient) {
        console.error("No patient data returned from Supabase after insert.");
        toast.error("Error al registrar paciente.", {
          description: "No se recibieron datos del nuevo paciente desde la BBDD.",
        });
        setIsSubmitting(false);
        return;
      }

      const newSupabasePatientId = newPatient.id; // ID del paciente desde Supabase (UUID)

      // 3. (Opcional pero recomendado) Actualizar el estado local de pacientes en el contexto
      const edadNum = values.edad ? parseInt(values.edad.toString(), 10) : undefined;
      const newPatientForContextList: any = { 
        id: newSupabasePatientId, // Usar el ID de Supabase
        nombre: values.nombre,
        apellidos: values.apellidos,
        edad: edadNum,
        telefono: values.telefono,
        fechaRegistro: newPatient.created_at, // Usar created_at de Supabase
        fechaConsulta: fechaISO, // Info de la primera cita
        diagnostico: values.motivoConsulta as DiagnosisType, // Motivo de la primera cita
        estado: "Pendiente de consulta" as PatientStatus, // Estado inicial
      };
      setPatients([...patients, newPatientForContextList]);

      // 4. Añadir la cita (usando el ID de paciente de Supabase)
      addAppointment({
        patientId: newSupabasePatientId,
        nombre: values.nombre,
        apellidos: values.apellidos,
        telefono: values.telefono,
        motivoConsulta: values.motivoConsulta,
        fechaConsulta: fechaObj, // Objeto Date completo para la cita
        horaConsulta: horaStr,
        notas: values.notas || "", // Notas específicas de la cita
        estado: "pendiente",
      });

      toast.success("Paciente registrado en Supabase", {
        description: `${values.nombre} ${values.apellidos} agendado para el ${format(fechaObj, "dd/MM/yyyy 'a las' HH:mm")}.`,
        duration: 5000,
      });

      setOpen(false);
      form.reset();
      onSuccess?.(); // Llama a handleNewPatientSuccess en PatientAdmission

    } catch (error) {
      console.error("Error en el proceso de registro de paciente:", error);
      const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
      toast.error("Error al registrar paciente", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Botón de variante dinámica
  const buttonStyle = useMemo(() => {
    switch (buttonVariant) {
      case "primary": return "bg-primary text-primary-foreground hover:bg-primary/90";
      case "secondary": return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
      case "outline": return "border border-input bg-background hover:bg-accent hover:text-accent-foreground";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/90";
    }
  }, [buttonVariant]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="secondary" 
          size="sm" 
          className={cn("flex items-center space-x-2 transition-all", buttonStyle, className)}
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
            Registrar Nuevo Paciente
          </DialogTitle>
          <DialogDescription className={isMobile ? "text-sm" : ""}>
            Completa la información y agenda la consulta (lunes–sábado, 9:00–14:00)
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6">
              {/* Nombre / Apellidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Nombre <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej. Juan" 
                          {...field} 
                          className={cn(
                            isMobile ? 'h-10' : 'h-9',
                            isMobile ? 'text-base' : 'text-sm',
                            fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Apellidos <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ej. Pérez" 
                          {...field} 
                          className={cn(
                            isMobile ? 'h-10' : 'h-9',
                            isMobile ? 'text-base' : 'text-sm',
                            fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              {/* Edad / Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Edad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Ej. 35" 
                          {...field} 
                          className={cn(
                            isMobile ? 'h-10' : 'h-9',
                            isMobile ? 'text-base' : 'text-sm',
                            fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                          min="0"
                          max="120"
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">
                        Teléfono <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="10 dígitos" 
                          {...field} 
                          className={cn(
                            isMobile ? 'h-10' : 'h-9',
                            isMobile ? 'text-base' : 'text-sm',
                            fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""
                          )}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>

              {/* Motivo de consulta */}
              <FormField
                control={form.control}
                name="motivoConsulta"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Motivo de consulta <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}>
                          <SelectValue placeholder="Selecciona motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hernia Inguinal">Hernia Inguinal</SelectItem>
                          <SelectItem value="Hernia Umbilical">Hernia Umbilical</SelectItem>
                          <SelectItem value="Hernia Incisional">Hernia Incisional</SelectItem>
                          <SelectItem value="Vesícula">Vesícula</SelectItem>
                          <SelectItem value="Colelitiasis">Colelitiasis</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />

              {/* Fecha y hora de consulta */}
              <Controller
                name="fechaHoraConsulta"
                control={form.control}
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">
                      Fecha y hora <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <DatePicker
                        selected={field.value}
                        onChange={(date) => field.onChange(date!)}
                        showTimeSelect
                        timeIntervals={30}
                        dateFormat="dd/MM/yyyy HH:mm"
                        locale={es}
                        minDate={new Date()}
                        filterDate={(date) => date.getDay() !== 0} // No domingos
                        minTime={
                          field.value && isToday(field.value) 
                            ? new Date() 
                            : timeRanges.minTime
                        }
                        maxTime={timeRanges.maxTime}
                        placeholderText="Selecciona fecha y hora"
                        className={cn(
                          "w-full rounded-md border px-3 py-2 text-sm",
                          isMobile ? 'h-10 text-base' : '',
                          fieldState.error ? 'border-red-500 focus:ring-red-500' : 'border-input focus:ring-primary',
                          "focus:ring-2"
                        )}
                        calendarClassName="shadow-lg rounded-lg border bg-card text-card-foreground p-2"
                        popperClassName="shadow-xl"
                        popperPlacement="bottom-start"
                        showPopperArrow={false}
                        wrapperClassName="w-full"
                        enableTabLoop
                      />
                    </FormControl>
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                    <FormDescription>
                      Solo lunes a sábado, de 9:00 AM a 2:00 PM
                    </FormDescription>
                  </FormItem>
                )}
              />

              {/* Notas */}
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">Notas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Información adicional"
                        {...field}
                        className={cn(
                          "resize-none",
                          isMobile ? 'h-32' : 'h-24',
                          isMobile ? 'text-base' : 'text-sm'
                        )}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe cualquier detalle relevante sobre el paciente
                    </FormDescription>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
              {isMobile && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  Limpiar
                </Button>
              )}
              <Button 
                type="submit" 
                variant="default" 
                size={isMobile ? "lg" : "default"}
                className={cn(
                  isMobile ? 'w-full py-2.5 text-base' : '',
                  "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md transition-all duration-200"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
                    Registrando...
                  </>
                ) : (
                  'Registrar Paciente'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

NewPatientForm.displayName = 'NewPatientForm';
