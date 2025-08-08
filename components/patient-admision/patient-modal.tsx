'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
import { cn, formatPhoneNumber } from '@/lib/utils';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

// Types and hooks
import { useAdmitPatient } from './actions';
import type { AdmissionFormData as TAdmissionForm } from '@/components/patient-admision/admision-types';
import { AdmissionFormSchema } from '@/components/patient-admision/admision-types';

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function PatientModal({ trigger, onSuccess }: PatientModalProps) {
  const [open, setOpen] = useState(false);
  const { mutate: admitPatient, isPending, isError, error } = useAdmitPatient();

  const form = useForm<TAdmissionForm>({
    resolver: zodResolver(AdmissionFormSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      edad: undefined,
      telefono: '',
      email: undefined,
      motivos_consulta: [],
      canal_contacto: 'PHONE_CALL',
      comentarios: '',
      fecha_hora_cita: undefined,
    },
  });

  // 🔄 Memoized date calculations
  const today = useMemo(() => new Date(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const nextAvailableDate = useMemo(() => {
    let date = tomorrow;
    while (isWeekend(date)) {
      date = addDays(date, 1);
    }
    return date;
  }, [tomorrow]);

  // 📤 Submit handler
  const onSubmit = (data: TAdmissionForm) => {
    admitPatient(data, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
        onSuccess?.();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuevo Paciente y Cita
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del paciente" {...field} />
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
                          <Input placeholder="Apellidos del paciente" {...field} />
                        </FormControl>
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
                            type="number" 
                            placeholder="Edad del paciente" 
                            {...field} 
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                        <FormLabel>Teléfono *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="555-123-4567" 
                            {...field}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value);
                              field.onChange(formatted);
                            }}
                          />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="paciente@ejemplo.com" 
                            {...field} 
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="canal_contacto"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de Contacto *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona canal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PHONE_CALL">Llamada telefónica</SelectItem>
                            <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                            <SelectItem value="WALK_IN">Visita directa</SelectItem>
                            <SelectItem value="REFERRAL">Referencia</SelectItem>
                            <SelectItem value="WEBSITE">Página web</SelectItem>
                            <SelectItem value="SOCIAL_MEDIA">Redes sociales</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="comentarios"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comentarios</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Notas adicionales sobre el paciente..." 
                          className="min-h-[80px]" 
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de la Cita</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="motivos_consulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Consulta *</FormLabel>
                      <FormControl>
                        <Select 
                          onValueChange={(value: string) => {
                            // Handle multiple selections
                            const currentValues = Array.isArray(field.value) ? field.value : [];
                            if (currentValues.includes(value)) {
                              field.onChange(currentValues.filter((v: string) => v !== value));
                            } else {
                              field.onChange([...currentValues, value]);
                            }
                          }}
                          value={Array.isArray(field.value) && field.value.length > 0 ? field.value[0] : ''} // For display purposes in single select
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HERNIA_INGUINAL">Hernia Inguinal</SelectItem>
                            <SelectItem value="HERNIA_UMBILICAL">Hernia Umbilical</SelectItem>
                            <SelectItem value="VESICULA">Vesícula</SelectItem>
                            <SelectItem value="CONSULTA_GENERAL">Consulta General</SelectItem>
                            <SelectItem value="SEGUNDA_OPINION">Segunda Opinión</SelectItem>
                            <SelectItem value="SEGUIMIENTO">Seguimiento</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Array.isArray(field.value) && field.value.map((motivo: string) => (
                          <Badge 
                            key={motivo} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => {
                              field.onChange(field.value?.filter((v: string) => v !== motivo));
                            }}
                          >
                            {motivo}
                            <span className="ml-1">×</span>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fecha_hora_cita"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha y Hora de Cita *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="pl-3 text-left font-normal"
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, "PPP 'a las' p", { locale: es })
                              ) : (
                                <span>Selecciona fecha</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? date.toISOString() : undefined)}
                            locale={es}
                            disabled={(date) => 
                              isBefore(date, startOfDay(today)) || isWeekend(date)
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    La cita se programará automáticamente para el próximo día hábil disponible si no se selecciona una fecha específica.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
            
            {isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error al crear paciente y cita: {error?.message || 'Error desconocido'}
                </AlertDescription>
              </Alert>
            )}
            
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Crear Paciente y Cita
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
