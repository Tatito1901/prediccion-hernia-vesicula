// components/patient-admision/new-patient-form-real.tsx
'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

// Hook corregido
import { usePatientAdmission } from '@/hooks/use-admission-realtime';
import { cn } from '@/lib/utils';

// ==================== CONFIGURACIÓN ====================
// Definición del enum de diagnóstico (debe coincidir exactamente con el enum de la base de datos)
const DIAGNOSIS_OPTIONS = [
  'HERNIA_INGUINAL',
  'HERNIA_UMBILICAL', 
  'COLECISTITIS',
  'COLEDOCOLITIASIS',
  'COLANGITIS',
  'APENDICITIS',
  'HERNIA_HIATAL',
  'LIPOMA_GRANDE',
  'HERNIA_INGUINAL_RECIDIVANTE',
  'QUISTE_SEBACEO_INFECTADO',
  'EVENTRACION_ABDOMINAL',
  'VESICULA',
  'OTRO',
  'HERNIA_SPIGEL'
] as const;

// Opciones para mostrar en el select (versiones legibles)
const diagnosisOptions = [
  { value: 'HERNIA_INGUINAL', label: 'Hernia Inguinal' },
  { value: 'HERNIA_UMBILICAL', label: 'Hernia Umbilical' },
  { value: 'COLECISTITIS', label: 'Colecistitis' },
  { value: 'COLEDOCOLITIASIS', label: 'Coledocolitiasis' },
  { value: 'COLANGITIS', label: 'Colangitis' },
  { value: 'APENDICITIS', label: 'Apendicitis' },
  { value: 'HERNIA_HIATAL', label: 'Hernia Hiatal' },
  { value: 'LIPOMA_GRANDE', label: 'Lipoma Grande' },
  { value: 'HERNIA_INGUINAL_RECIDIVANTE', label: 'Hernia Inguinal Recidivante' },
  { value: 'QUISTE_SEBACEO_INFECTADO', label: 'Quiste Sebáceo Infectado' },
  { value: 'EVENTRACION_ABDOMINAL', label: 'Eventración Abdominal' },
  { value: 'VESICULA', label: 'Vesícula (Colecistitis Crónica)' },
  { value: 'OTRO', label: 'Otro' },
  { value: 'HERNIA_SPIGEL', label: 'Hernia Spigel' },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
];

// ==================== VALIDACIÓN SCHEMA ====================
const NewPatientSchema = z.object({
  nombre: z.string().min(2, "Nombre debe tener al menos 2 caracteres").max(50),
  apellidos: z.string().min(2, "Apellidos debe tener al menos 2 caracteres").max(50),
  telefono: z.string().min(10, "Teléfono debe tener al menos 10 caracteres").optional().or(z.literal("")),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  edad: z.number().min(0, "Edad no puede ser negativa").max(120, "Edad no puede ser mayor a 120").optional(),
  diagnostico_principal: z.enum(DIAGNOSIS_OPTIONS, { 
    required_error: "Diagnóstico principal es requerido" 
  }),
  fechaConsulta: z.date({ 
    required_error: "Fecha de consulta es requerida" 
  }),
  horaConsulta: z.string().min(1, "Hora de consulta es requerida"),
  motivoConsulta: z.string().min(5, "Motivo debe tener al menos 5 caracteres").max(200, "Motivo muy largo"),
  comentarios_registro: z.string().max(500, "Comentarios muy largos").optional(),
  probabilidad_cirugia: z.number().min(0, "Probabilidad no puede ser negativa").max(1, "Probabilidad no puede ser mayor a 1").optional(),
});

type FormData = z.infer<typeof NewPatientSchema>;

// ==================== PROPS ====================
interface NewPatientFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ==================== HELPER FUNCTIONS ====================
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  return !isBefore(date, today) && !isWeekend(date);
};

const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    const match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]} ${match[2]} ${match[3]}`;
    }
  }
  return value;
};

// ==================== COMPONENTE PRINCIPAL ====================
export const NewPatientForm: React.FC<NewPatientFormProps> = ({ 
  onSuccess, 
  onCancel 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // ✅ Hook de admisión corregido
  const admissionMutation = usePatientAdmission();

  // ✅ Configuración del formulario con validación en tiempo real
  const form = useForm<FormData>({
    resolver: zodResolver(NewPatientSchema),
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      apellidos: '',
      telefono: '',
      email: '',
      edad: undefined,
      diagnostico_principal: undefined,
      fechaConsulta: undefined,
      horaConsulta: '',
      motivoConsulta: '',
      comentarios_registro: '',
      probabilidad_cirugia: undefined,
    },
  });

  const watchedValues = form.watch();
  const isFormValid = form.formState.isValid && selectedDate && watchedValues.horaConsulta;

  // ==================== HANDLERS ====================
  const onSubmit = useCallback(async (data: FormData) => {
    try {
      console.log('📝 [NewPatientForm] Form data:', data);
      
      // ✅ Construir fecha y hora completa
      const fechaHoraCompleta = new Date(data.fechaConsulta);
      const [horas, minutos] = data.horaConsulta.split(':').map(Number);
      fechaHoraCompleta.setHours(horas, minutos, 0, 0);

      // ✅ PREPARAR PAYLOAD CON NOMBRES EXACTOS DE LA RPC
      const payload = {
        p_nombre: data.nombre.trim(),
        p_apellidos: data.apellidos.trim(),
        p_telefono: data.telefono?.trim() || null,
        p_email: data.email?.trim() || null,
        p_edad: data.edad || null,
        p_diagnostico_principal: data.diagnostico_principal,
        p_comentarios_registro: data.comentarios_registro?.trim() || null,
        p_probabilidad_cirugia: data.probabilidad_cirugia || null,
        p_fecha_hora_cita: fechaHoraCompleta.toISOString(),
        p_motivo_cita: data.motivoConsulta.trim(),
        p_doctor_id: null, // Se puede agregar después si es necesario
        p_creado_por_id: null, // Se obtiene en el backend
      };

      console.log('📞 [NewPatientForm] RPC payload:', payload);

      await admissionMutation.mutateAsync(payload);
      
      // ✅ Reset form on success
      form.reset();
      setSelectedDate(undefined);
      
      // ✅ Callback de éxito
      onSuccess?.();
      
    } catch (error) {
      console.error('❌ [NewPatientForm] Submit error:', error);
      // El error ya se maneja en el hook
    }
  }, [admissionMutation, form, onSuccess]);

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

  // ✅ Opciones memoizadas
  const diagnosisOptions = useMemo(() => 
    DIAGNOSIS_OPTIONS.map(value => ({ value, label: value })), 
    []
  );

  // ==================== RENDER ====================
  return (
    <Card className="w-full max-w-4xl mx-auto">
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
                          className={cn(
                            fieldState.error && "border-red-500 focus:border-red-500",
                            !fieldState.error && field.value && field.value.length >= 2 && "border-green-500"
                          )}
                        />
                      </FormControl>
                      {fieldState.error && <FormMessage />}
                      {!fieldState.error && field.value && field.value.length >= 2 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Válido
                        </div>
                      )}
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
                          placeholder="Pérez García" 
                          {...field}
                          className={cn(
                            fieldState.error && "border-red-500 focus:border-red-500",
                            !fieldState.error && field.value && field.value.length >= 2 && "border-green-500"
                          )}
                        />
                      </FormControl>
                      {fieldState.error && <FormMessage />}
                      {!fieldState.error && field.value && field.value.length >= 2 && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Válido
                        </div>
                      )}
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
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="55 1234 5678" 
                            className={cn(
                              "pl-10",
                              fieldState.error && "border-red-500 focus:border-red-500",
                              !fieldState.error && field.value && field.value.length >= 10 && "border-green-500"
                            )}
                            {...field}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                          />
                        </div>
                      </FormControl>
                      {fieldState.error && <FormMessage />}
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
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="email" 
                            placeholder="juan@email.com" 
                            className={cn(
                              "pl-10",
                              fieldState.error && "border-red-500 focus:border-red-500",
                              !fieldState.error && field.value && field.value.includes('@') && "border-green-500"
                            )}
                            {...field}
                          />
                        </div>
                      </FormControl>
                      {fieldState.error && <FormMessage />}
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
                          className={cn(
                            fieldState.error && "border-red-500 focus:border-red-500",
                            !fieldState.error && field.value && "border-green-500"
                          )}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      {fieldState.error && <FormMessage />}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnostico_principal"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico Principal *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            fieldState.error && "border-red-500 focus:border-red-500",
                            !fieldState.error && field.value && "border-green-500"
                          )}>
                            <SelectValue placeholder="Seleccionar diagnóstico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {diagnosisOptions.map((diagnosis) => (
                            <SelectItem key={diagnosis.value} value={diagnosis.value}>
                              {diagnosis.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FormMessage />}
                      {!fieldState.error && field.value && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Seleccionado
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ PROGRAMACIÓN DE CITA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-medium">Programación de Cita</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Fecha de Consulta *</FormLabel>
                      <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                                fieldState.error && "border-red-500",
                                !fieldState.error && field.value && "border-green-500"
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
                            disabled={date => !isValidDate(date)}
                            initialFocus
                            locale={es}
                          />
                        </PopoverContent>
                      </Popover>
                      {fieldState.error && <FormMessage />}
                      {!fieldState.error && field.value && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Fecha válida
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horaConsulta"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Hora de Consulta *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(
                            fieldState.error && "border-red-500",
                            !fieldState.error && field.value && "border-green-500"
                          )}>
                            <Clock className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Seleccionar hora" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIME_SLOTS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.error && <FormMessage />}
                      {!fieldState.error && field.value && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          Hora seleccionada
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* ✅ MOTIVO Y COMENTARIOS */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="text-lg font-medium">Detalles de la Consulta</h3>
              </div>

              <FormField
                control={form.control}
                name="motivoConsulta"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Motivo de la Consulta *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describa el motivo de la consulta..."
                        className={cn(
                          "min-h-[80px]",
                          fieldState.error && "border-red-500",
                          !fieldState.error && field.value && field.value.length >= 5 && "border-green-500"
                        )}
                        {...field}
                      />
                    </FormControl>
                    {fieldState.error && <FormMessage />}
                    <div className="text-xs text-muted-foreground">
                      {field.value?.length || 0}/200 caracteres
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comentarios_registro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentarios Adicionales</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Información adicional relevante..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <div className="text-xs text-muted-foreground">
                      {field.value?.length || 0}/500 caracteres
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* ✅ ESTADO DE ERROR */}
            {admissionMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error al registrar paciente. Por favor, revise los datos e intente nuevamente.
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ INDICADOR DE VALIDACIÓN */}
            {isFormValid && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Formulario completo. Listo para registrar paciente.
                </AlertDescription>
              </Alert>
            )}

            {/* ✅ BOTONES */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={admissionMutation.isPending}
              >
                Cancelar
              </Button>
              
              <Button 
                type="submit" 
                disabled={admissionMutation.isPending || !isFormValid}
                className="min-w-[140px]"
              >
                {admissionMutation.isPending ? (
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