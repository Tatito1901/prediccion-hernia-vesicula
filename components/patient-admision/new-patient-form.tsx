import React, { useState, useMemo, FC, memo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, isToday, isAfter, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAppContext } from "@/lib/context/app-context";
import type { DiagnosisType } from "@/app/dashboard/data-model";

// Mejorar el esquema de validación con mensajes específicos
const formSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." })
           .max(50, { message: "El nombre no debe exceder 50 caracteres." }),
  apellidos: z.string().min(2, { message: "Los apellidos deben tener al menos 2 caracteres." })
              .max(100, { message: "Los apellidos no deben exceder 100 caracteres." }),
  edad: z.string()
         .optional()
         .refine(val => val === '' || /^\d+$/.test(val), {
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
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPatient, addAppointment } = useAppContext();

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
      
      const edadNum = values.edad ? parseInt(values.edad, 10) : 0;
      const fechaObj = values.fechaHoraConsulta!;
      const fechaISO = fechaObj.toISOString().split("T")[0];
      const horaStr = format(fechaObj, "HH:mm");

      const patientId = addPatient({
        nombre: values.nombre,
        apellidos: values.apellidos,
        edad: edadNum,
        fechaConsulta: fechaISO,
        fechaRegistro: new Date().toISOString().split("T")[0],
        diagnostico: values.motivoConsulta as DiagnosisType,
        estado: "Pendiente de consulta",
        probabilidadCirugia: 0.5,
        notaClinica: values.notas || "",
        ultimoContacto: new Date().toISOString().split("T")[0],
        proximoContacto: fechaISO,
      });

      addAppointment({
        patientId,
        nombre: values.nombre,
        apellidos: values.apellidos,
        telefono: values.telefono,
        motivoConsulta: values.motivoConsulta,
        fechaConsulta: fechaObj,
        horaConsulta: horaStr,
        notas: values.notas || "",
        estado: "pendiente",
      });

      toast.success("Paciente registrado correctamente", {
        description: `${values.nombre} ${values.apellidos} ha sido agendado para el ${format(fechaObj, "dd/MM/yyyy")} a las ${horaStr}.`,
        duration: 4000,
      });
      
      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error al registrar paciente:", error);
      toast.error("Error al registrar paciente", {
        description: "Por favor inténtelo de nuevo.",
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
          className={`flex items-center space-x-2 ${buttonStyle} ${className}`}
        >
          <PlusIcon className="h-4 w-4" />
          <span>{buttonLabel}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Paciente</DialogTitle>
          <DialogDescription>
            Completa la información y agenda la consulta (lunes–sábado, 9:00–14:00)
          </DialogDescription>
        </DialogHeader>
        <Form<FormValues> {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nombre / Apellidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nombre <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Juan" 
                        {...field} 
                        className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
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
                    <FormLabel>Apellidos <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ej. Pérez" 
                        {...field} 
                        className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
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
                    <FormLabel>Edad</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="Ej. 35" 
                        {...field} 
                        className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
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
                    <FormLabel>Teléfono <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="10 dígitos" 
                        {...field} 
                        className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
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
                  <FormLabel>Motivo de consulta <span className="text-red-500">*</span></FormLabel>
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
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage>{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />

            {/* Fecha y hora de consulta */}
            <Controller<FormValues, 'fechaHoraConsulta'>
              name="fechaHoraConsulta"
              control={form.control}
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Fecha y hora <span className="text-red-500">*</span></FormLabel>
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
                      className={`w-full rounded-md border ${fieldState.error ? 'border-red-500' : 'border-input'} px-3 py-2 text-sm focus:ring-2 ${fieldState.error ? 'focus:ring-red-500' : 'focus:ring-primary'}`}
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
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Información adicional"
                      {...field}
                      className="resize-none h-24"
                    />
                  </FormControl>
                  <FormDescription>
                    Describe cualquier detalle relevante sobre el paciente
                  </FormDescription>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="submit" 
                variant="default" 
                size="lg" 
                className="w-full bg-blue-800 text-white hover:bg-blue-900 shadow-lg hover:shadow-xl transition-all duration-200"
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

NewPatientForm.displayName = "NewPatientForm";