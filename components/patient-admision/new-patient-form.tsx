// components/patient-admision/new-patient-form.tsx

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons
import {
  CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  NewPatientFormProps, 
  DiagnosisType,
  AdmissionPayload,
  NewPatientSchema 
} from './admision-types';

// ✅ Hook corregido para admisión
import { useAdmitPatient } from './actions';
import { cn } from '@/lib/utils';

// ==================== CONFIGURACIÓN ====================

// ✅ Opciones de diagnóstico exactamente como en la BD
const diagnosisOptions = [
  { value: 'HERNIA INGUINAL' as DiagnosisType, label: 'Hernia Inguinal' },
  { value: 'HERNIA UMBILICAL' as DiagnosisType, label: 'Hernia Umbilical' },
  { value: 'COLECISTITIS' as DiagnosisType, label: 'Colecistitis' },
  { value: 'COLEDOCOLITIASIS' as DiagnosisType, label: 'Coledocolitiasis' },
  { value: 'COLANGITIS' as DiagnosisType, label: 'Colangitis' },
  { value: 'APENDICITIS' as DiagnosisType, label: 'Apendicitis' },
  { value: 'HERNIA HIATAL' as DiagnosisType, label: 'Hernia Hiatal' },
  { value: 'LIPOMA GRANDE' as DiagnosisType, label: 'Lipoma Grande' },
  { value: 'HERNIA INGUINAL RECIDIVANTE' as DiagnosisType, label: 'Hernia Inguinal Recidivante' },
  { value: 'QUISTE SEBACEO INFECTADO' as DiagnosisType, label: 'Quiste Sebáceo Infectado' },
  { value: 'EVENTRACION ABDOMINAL' as DiagnosisType, label: 'Eventración Abdominal' },
  { value: 'VESICULA (COLECISTITIS CRONICA)' as DiagnosisType, label: 'Vesícula (Colecistitis Crónica)' },
  { value: 'OTRO' as DiagnosisType, label: 'Otro' },
  { value: 'HERNIA SPIGEL' as DiagnosisType, label: 'Hernia Spigel' },
];

// ✅ Horarios disponibles (8:00 AM - 3:30 PM cada 30 min)
const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => {
  const hour = 8 + Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const time = `${hour.toString().padStart(2, '0')}:${minute}`;
  return { value: time, label: time };
});

// ==================== TIPOS PARA EL FORMULARIO ====================
type FormData = {
  nombre: string;
  apellidos: string;
  telefono?: string;
  email?: string;
  edad?: number;
  diagnostico_principal: DiagnosisType;
  fechaConsulta: Date;
  horaConsulta: string;
  comentarios_registro?: string;
  probabilidad_cirugia?: number;
  doctor_id?: string;
};

// ==================== UTILIDADES ====================
const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return cleaned;
};

const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90); // Máximo 90 días en el futuro
  return !isBefore(date, today) && !isBefore(maxDate, date) && !isWeekend(date);
};

// ==================== COMPONENTE PRINCIPAL ====================
const NewPatientForm: React.FC<NewPatientFormProps> = ({ 
  onSuccess, 
  onCancel, 
  className 
}) => {
  // ✅ ESTADOS LOCALES
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ✅ HOOK DE ADMISIÓN CORREGIDO
  const admissionMutation = useAdmitPatient();

  // ✅ FORMULARIO CON VALIDACIÓN CORREGIDA
  const form = useForm<FormData>({
    resolver: zodResolver(NewPatientSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      telefono: '',
      email: '',
      edad: undefined,
      diagnostico_principal: 'HERNIA INGUINAL',
      fechaConsulta: undefined,
      horaConsulta: '09:00',
      comentarios_registro: '',
      probabilidad_cirugia: 0.5,
      doctor_id: undefined,
    },
  });

  // ✅ SUBMIT HANDLER CORREGIDO
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      console.log('📝 [NewPatientForm] Submitting form data:', data);

      // ✅ Transformar datos al formato esperado por la API
      const payload: AdmissionPayload = {
        nombre: data.nombre.trim(),
        apellidos: data.apellidos.trim(),
        telefono: data.telefono?.trim() || undefined,
        email: data.email?.trim() || undefined,
        edad: data.edad,
        diagnostico_principal: data.diagnostico_principal,
        comentarios_registro: data.comentarios_registro?.trim() || undefined,
        probabilidad_cirugia: data.probabilidad_cirugia,
        fecha_hora_cita: `${data.fechaConsulta.toISOString().split('T')[0]}T${data.horaConsulta}:00`,
        motivo_cita: `Primera consulta - ${diagnosisOptions.find(d => d.value === data.diagnostico_principal)?.label}`,
        doctor_id: data.doctor_id,
      };

      console.log('🚀 [NewPatientForm] API payload:', payload);

      // ✅ Enviar datos usando el hook corregido
      const result = await admissionMutation.mutateAsync(payload);
      
      console.log('✅ [NewPatientForm] Admission successful:', result);

      // ✅ Resetear formulario y llamar callback
      form.reset();
      setSelectedDate(undefined);
      onSuccess?.(result);
      
    } catch (error) {
      console.error('❌ [NewPatientForm] Submit error:', error);
      // El error ya se maneja en el hook
    }
  }, [admissionMutation, form, onSuccess]);

  // ✅ HANDLERS OPTIMIZADOS
  const handleDateSelect = useCallback((date: Date | undefined) => {
    if (date && isValidDate(date)) {
      setSelectedDate(date);
      form.setValue('fechaConsulta', date, { shouldValidate: true });
      setShowDatePicker(false);
    }
  }, [form]);

  const handleCancel = useCallback(() => {
    form.reset();
    setSelectedDate(undefined);
    onCancel?.();
  }, [form, onCancel]);

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhoneNumber(value);
    form.setValue('telefono', formatted, { shouldValidate: true });
  }, [form]);

  // ✅ VALORES COMPUTADOS
  const isLoading = admissionMutation.isPending;
  const hasErrors = Object.keys(form.formState.errors).length > 0;

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Registro de Nuevo Paciente
        </CardTitle>
        <p className="text-muted-foreground">
          Complete la información del paciente y programe su primera consulta
        </p>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* ✅ INFORMACIÓN PERSONAL */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-medium">Información Personal</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Nombre *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Juan" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellidos"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Apellidos *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Pérez González" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email"
                          placeholder="juan@email.com" 
                          {...field}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="edad"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="35" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ INFORMACIÓN MÉDICA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <h3 className="text-lg font-medium">Información Médica</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="diagnostico_principal"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico Principal *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleccione diagnóstico" />
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

                <FormField
                  control={form.control}
                  name="probabilidad_cirugia"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Probabilidad de Cirugía (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          placeholder="50" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) / 100 : undefined)}
                          value={field.value ? Math.round(field.value * 100) : ''}
                          className={fieldState.error ? 'border-red-500' : ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="comentarios_registro"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Comentarios Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Notas adicionales sobre el paciente o la condición..." 
                        {...field}
                        className={cn("min-h-[80px]", fieldState.error && 'border-red-500')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ PROGRAMACIÓN DE CITA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-purple-600" />
                <h3 className="text-lg font-medium">Programar Primera Consulta</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field, fieldState }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha de Consulta *</FormLabel>
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                                fieldState.error && "border-red-500"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={handleDateSelect}
                            disabled={(date) => !isValidDate(date)}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horaConsulta"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Hora de Consulta *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className={fieldState.error ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {slot.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ ERRORES Y ACCIONES */}
            {hasErrors && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Por favor, corrija los errores antes de continuar.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isLoading}
                className="sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading || hasErrors}
                className="sm:flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
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