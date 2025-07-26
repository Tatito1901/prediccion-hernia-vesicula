// components/admission/new-patient-form-corrected.tsx - CORREGIDO PARA TU ESQUEMA REAL
'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { z } from 'zod';

// UI Components (sin cambios)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

// Icons
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// Utilities
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ==================== CONFIGURACIÓN CORREGIDA ====================
const CLINIC_CONFIG = {
  WORK_HOURS: {
    START: 8,
    END: 18,
    LUNCH_START: 12,
    LUNCH_END: 13,
  },
  APPOINTMENT_DURATION: 30,
  WORK_DAYS: [1, 2, 3, 4, 5],
} as const;

// ==================== DIAGNÓSTICOS SEGÚN TU ENUM REAL ====================
const DIAGNOSIS_OPTIONS = [
  'HERNIA INGUINAL',
  'HERNIA UMBILICAL', 
  'COLECISTITIS',
  'COLEDOCOLITIASIS',
  'COLANGITIS',
  'APENDICITIS',
  'HERNIA HIATAL',
  'LIPOMA GRANDE',
  'HERNIA INGUINAL RECIDIVANTE',
  'QUISTE SEBACEO INFECTADO',
  'EVENTRACION ABDOMINAL',
  'VESICULA (COLECISTITIS CRONICA)',
  'OTRO',
  'HERNIA SPIGEL'
] as const;

// ==================== VALIDACIÓN CORREGIDA ====================
const NewPatientSchema = z.object({
  // Campos requeridos según tu esquema
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres").max(50),
  
  // Campos opcionales según tu esquema
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, "Teléfono inválido").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  edad: z.number().min(0).max(120).optional(),
  
  // Diagnóstico usando tus valores reales
  motivoConsulta: z.enum(DIAGNOSIS_OPTIONS, { required_error: "Motivo de consulta requerido" }),
  
  // Fecha y hora
  fechaConsulta: z.date({ required_error: "Fecha requerida" }),
  horaConsulta: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido"),
  
  // Campos opcionales
  notas: z.string().max(500, "Notas muy largas").optional(),
  
  // CORREGIDO: Probabilidad como porcentaje en UI (0-100) pero se convertirá a decimal (0-1) para BD
  probabilidad_cirugia_percentage: z.number().min(0).max(100).optional(),
});

type NewPatientForm = z.infer<typeof NewPatientSchema>;

// ==================== PAYLOAD PARA API ====================
interface AdmissionPayload {
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  edad?: number;
  diagnostico_principal: string;
  comentarios_registro?: string;
  probabilidad_cirugia?: number; // Decimal 0-1 para la BD
  fecha_hora_cita: string;
  motivo_cita: string;
  doctor_id?: string | null;
}

// ==================== HELPERS ====================
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  const { START, END, LUNCH_START, LUNCH_END } = CLINIC_CONFIG.WORK_HOURS;
  
  for (let hour = START; hour < END; hour++) {
    if (hour >= LUNCH_START && hour < LUNCH_END) continue;
    
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  
  return slots;
};

const isValidAppointmentDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const appointmentDate = startOfDay(date);
  
  if (isBefore(appointmentDate, today)) return false;
  if (isWeekend(date)) return false;
  
  return true;
};

const getEarliestAvailableDate = (): Date => {
  let date = new Date();
  
  if (date.getHours() >= 17) {
    date = addDays(date, 1);
  }
  
  while (isWeekend(date)) {
    date = addDays(date, 1);
  }
  
  return date;
};

const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/[^\d+]/g, '');
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  
  return cleaned;
};

// Convertir porcentaje (0-100) a decimal (0-1) para la BD
const convertPercentageToDecimal = (percentage?: number): number | undefined => {
  if (percentage === undefined || percentage === null) return undefined;
  return percentage / 100;
};

// ==================== API FUNCTION ====================
const submitPatientAdmission = async (data: AdmissionPayload): Promise<any> => {
  const response = await fetch('/api/patient-admission', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al registrar paciente');
  }
  
  return response.json();
};

// ==================== COMPONENTE PRINCIPAL ====================
interface NewPatientFormProps {
  onSuccess?: () => void;
}

export const NewPatientForm: React.FC<NewPatientFormProps> = ({ onSuccess }) => {
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  
  const queryClient = useQueryClient();
  
  // ==================== FORM ====================
  const form = useForm<NewPatientForm>({
    resolver: zodResolver(NewPatientSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      telefono: '',
      email: '',
      edad: undefined,
      motivoConsulta: undefined,
      fechaConsulta: getEarliestAvailableDate(),
      horaConsulta: '',
      notas: '',
      probabilidad_cirugia_percentage: undefined,
    },
    mode: 'onChange',
  });
  
  const watchedDate = form.watch('fechaConsulta');
  const watchedTime = form.watch('horaConsulta');
  
  // ==================== MUTATIONS ====================
  const admissionMutation = useMutation({
    mutationFn: submitPatientAdmission,
    onSuccess: (data) => {
      toast.success('Paciente registrado exitosamente', {
        description: `${form.getValues('nombre')} ${form.getValues('apellidos')} ha sido registrado.`,
        duration: 4000,
      });
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['admission-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['admission-counts'] });
      
      // Reset form
      form.reset();
      
      // Callback de éxito
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error('Error al registrar paciente', {
        description: error.message || 'Intente nuevamente',
        duration: 6000,
      });
    },
  });
  
  // ==================== EFFECTS ====================
  useEffect(() => {
    if (!watchedDate || !isValidAppointmentDate(watchedDate)) {
      setAvailableSlots([]);
      return;
    }
    
    const loadAvailableSlots = async () => {
      setIsCheckingAvailability(true);
      
      try {
        // TODO: Implementar verificación real de slots ocupados
        const allSlots = generateTimeSlots();
        setAvailableSlots(allSlots);
      } catch (error) {
        console.error('Error loading available slots:', error);
        setAvailableSlots([]);
      } finally {
        setIsCheckingAvailability(false);
      }
    };
    
    loadAvailableSlots();
  }, [watchedDate]);
  
  // ==================== HANDLERS ====================
  const handleSubmit = useCallback(async (values: NewPatientForm) => {
    if (!values.fechaConsulta || !values.horaConsulta) {
      toast.error('Fecha y hora de consulta son requeridas');
      return;
    }
    
    // Crear fecha/hora de la cita
    const [hours, minutes] = values.horaConsulta.split(':').map(Number);
    const appointmentDateTime = new Date(values.fechaConsulta);
    appointmentDateTime.setHours(hours, minutes, 0, 0);
    
    const payload: AdmissionPayload = {
      nombre: values.nombre.trim(),
      apellidos: values.apellidos.trim(),
      telefono: values.telefono?.trim() || undefined,
      email: values.email?.trim() || undefined,
      edad: values.edad || undefined,
      diagnostico_principal: values.motivoConsulta,
      comentarios_registro: values.notas?.trim() || undefined,
      // CONVERSIÓN CRÍTICA: porcentaje (0-100) a decimal (0-1)
      probabilidad_cirugia: convertPercentageToDecimal(values.probabilidad_cirugia_percentage),
      fecha_hora_cita: appointmentDateTime.toISOString(),
      motivo_cita: values.motivoConsulta,
      doctor_id: null,
    };
    
    console.log('📋 [Form] Payload para API:', {
      ...payload,
      probabilidad_original: values.probabilidad_cirugia_percentage,
      probabilidad_convertida: payload.probabilidad_cirugia,
    });
    
    admissionMutation.mutate(payload);
  }, [admissionMutation]);
  
  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value);
    form.setValue('telefono', formatted);
  }, [form]);
  
  // ==================== COMPUTED VALUES ====================
  const diagnosisOptions = useMemo(() => 
    DIAGNOSIS_OPTIONS.map(value => ({
      value,
      label: value,
    })), []
  );
  
  const isFormValid = form.formState.isValid && watchedDate && watchedTime;
  const isSubmitting = admissionMutation.isPending;
  
  // ==================== RENDER (UI igual, solo cambios en FormField de probabilidad) ====================
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Registro de Nuevo Paciente</span>
        </CardTitle>
        <p className="text-muted-foreground">
          Complete la información del paciente y programe su primera consulta
        </p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Información Personal - SIN CAMBIOS */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <h3 className="text-lg font-medium">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre del paciente" />
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
                      <FormLabel>Apellidos *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apellidos del paciente" />
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
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="(555) 123-4567"
                          onChange={(e) => handlePhoneChange(e.target.value)}
                        />
                      </FormControl>
                      <FormDescription>Opcional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="correo@ejemplo.com" />
                      </FormControl>
                      <FormDescription>Opcional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="120"
                          placeholder="Edad en años"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Información Médica */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <h3 className="text-lg font-medium">Información Médica</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Consulta *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el diagnóstico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {diagnosisOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* CAMPO CORREGIDO: Probabilidad en porcentaje para UI */}
                <FormField
                  control={form.control}
                  name="probabilidad_cirugia_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidad de Cirugía (%)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0-100"
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Estimación inicial en porcentaje (se convertirá automáticamente)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas Adicionales</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Información adicional, síntomas, comentarios..."
                        className="resize-none"
                        rows={3}
                      />
                    </FormControl>
                    <FormDescription>
                      Información adicional sobre el paciente o la consulta
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <Separator />
            
            {/* Programación de Cita - SIN CAMBIOS */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4" />
                <h3 className="text-lg font-medium">Programar Primera Consulta</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Consulta *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                "Seleccione una fecha"
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => !isValidAppointmentDate(date)}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>Solo días hábiles disponibles</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="horaConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora de Consulta *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!watchedDate || isCheckingAvailability}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              isCheckingAvailability 
                                ? "Verificando disponibilidad..." 
                                : "Seleccione una hora"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>
                              <div className="flex items-center space-x-2">
                                <Clock className="h-3 w-3" />
                                <span>{slot}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Horario: 8:00 - 18:00 (excepto 12:00-13:00)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Botones de Acción - SIN CAMBIOS */}
            <div className="flex justify-end space-x-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => form.reset()}
                disabled={isSubmitting}
              >
                Limpiar Formulario
              </Button>
              
              <Button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                className="min-w-[150px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Registrar Paciente
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NewPatientForm;