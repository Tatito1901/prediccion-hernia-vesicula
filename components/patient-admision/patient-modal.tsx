// components/patient-admission/patient-modal.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, isBefore, isSunday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User2, CalendarIcon, Loader2, Search, Clock, 
  Phone, Mail, Stethoscope, Info, CheckCircle2 
} from 'lucide-react';
import { useAdmitPatient } from '@/hooks/use-patient';
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  ZDiagnosisDb, 
  DIAGNOSIS_DB_VALUES, 
  dbDiagnosisToDisplay, 
  type DbDiagnosis 
} from '@/lib/validation/enums';
import type { Lead } from './admision-types';

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

// Schema simplificado y optimizado
const QuickAdmissionSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
  edad: z.coerce.number().int().min(0).max(120).optional(),
  genero: z.enum(['Masculino', 'Femenino']),
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, 'Formato inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  diagnostico_principal: ZDiagnosisDb,
  fecha: z.date({ required_error: 'Seleccione una fecha' }),
  hora: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
});

type FormData = z.infer<typeof QuickAdmissionSchema>;

// Horarios disponibles
const TIME_SLOTS = Array.from({ length: 12 }, (_, i) => {
  const hour = Math.floor(i / 2) + 9;
  const minute = (i % 2) * 30;
  const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  return { value: time, label: time };
});

const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  return !isBefore(date, today) && !isBefore(maxDate, date) && !isSunday(date);
};

export function PatientModal({ trigger, onSuccess }: PatientModalProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'search' | 'form'>('form');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);

  const { fetchSpecificAppointments, fetchLeads } = useClinic();
  const { mutate: admitPatient, isPending } = useAdmitPatient();

  const form = useForm<FormData>({
    resolver: zodResolver(QuickAdmissionSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      edad: undefined,
      genero: undefined as any,
      telefono: '',
      email: '',
      diagnostico_principal: 'HERNIA_INGUINAL',
      fecha: undefined as any,
      hora: '09:00',
    },
  });

  // Búsqueda de leads
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length < 2) {
        setLeadResults([]);
        return;
      }
      
      setSearchingLeads(true);
      try {
        const res = await fetchLeads({ search: searchQuery, pageSize: 5 });
        setLeadResults((res as any)?.data || []);
      } catch (err) {
        console.error('Error buscando leads:', err);
      } finally {
        setSearchingLeads(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchLeads]);

  // Horarios ocupados
  const selectedDate = form.watch('fecha');
  const [occupiedTimes, setOccupiedTimes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!selectedDate) {
      setOccupiedTimes(new Set());
      return;
    }

    const loadAppointments = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      try {
        const res = await fetchSpecificAppointments({
          dateFilter: 'range',
          startDate: dateStr,
          endDate: dateStr,
          pageSize: 100,
        });
        
        const occupied = new Set<string>();
        const blockingStatuses = ['PROGRAMADA', 'CONFIRMADA', 'PRESENTE'];
        
        res.data?.forEach((apt: any) => {
          if (blockingStatuses.includes(apt.estado_cita)) {
            const time = format(new Date(apt.fecha_hora_cita), 'HH:mm');
            occupied.add(time);
          }
        });
        
        setOccupiedTimes(occupied);
      } catch (err) {
        console.error('Error loading appointments:', err);
      }
    };

    loadAppointments();
  }, [selectedDate, fetchSpecificAppointments]);

  // Handlers
  const handleLeadSelect = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    const [nombre, ...apellidosParts] = (lead.full_name || '').split(' ');
    form.setValue('nombre', nombre || '', { shouldValidate: true });
    form.setValue('apellidos', apellidosParts.join(' ') || '', { shouldValidate: true });
    if (lead.phone_number) {
      form.setValue('telefono', formatPhoneNumber(lead.phone_number), { shouldValidate: true });
    }
    if (lead.email) {
      form.setValue('email', lead.email, { shouldValidate: false });
    }
    setStep('form');
    setSearchQuery('');
  }, [form]);

  const onSubmit = useCallback((values: FormData) => {
    const dateTime = new Date(values.fecha);
    const [hours, minutes] = values.hora.split(':').map(Number);
    dateTime.setHours(hours, minutes, 0, 0);

    admitPatient({
      nombre: values.nombre,
      apellidos: values.apellidos,
      edad: values.edad,
      genero: values.genero,
      telefono: values.telefono,
      email: values.email || undefined,
      diagnostico_principal: values.diagnostico_principal,
      fecha_hora_cita: dateTime.toISOString(),
      motivos_consulta: [values.diagnostico_principal],
    }, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
        setSelectedLead(null);
        onSuccess?.();
      },
      onError: (error: any) => {
        const message = error?.message || 'Error al registrar';
        if (message.includes('telefono')) {
          form.setError('telefono', { message: 'Teléfono ya registrado' });
        }
      },
    });
  }, [admitPatient, form, onSuccess]);

  const availableSlots = useMemo(() => 
    TIME_SLOTS.filter(slot => !occupiedTimes.has(slot.value)),
    [occupiedTimes]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <User2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
            Registro Rápido de Paciente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Búsqueda de Leads */}
            {step === 'form' && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Search className="h-3.5 w-3.5" />
                  Buscar paciente existente
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Nombre o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10"
                  />
                  {searchingLeads && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                  )}
                </div>
                
                {leadResults.length > 0 && (
                  <Card className="border-sky-200 dark:border-sky-800 overflow-hidden">
                    <ScrollArea className="max-h-48">
                      {leadResults.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => handleLeadSelect(lead)}
                          className="w-full text-left p-3 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors border-b last:border-0"
                        >
                          <div className="font-medium">{lead.full_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-3">
                            {lead.phone_number && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {lead.phone_number}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {lead.email}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  </Card>
                )}

                {selectedLead && (
                  <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <AlertDescription>
                      Datos cargados de: <strong>{selectedLead.full_name}</strong>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Separator />

            {/* Formulario */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User2 className="h-4 w-4" />
                  Datos Personales
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre *</Label>
                    <Input
                      id="nombre"
                      {...form.register('nombre')}
                      className={form.formState.errors.nombre ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.nombre && (
                      <p className="text-xs text-red-500">{form.formState.errors.nombre.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="apellidos">Apellidos *</Label>
                    <Input
                      id="apellidos"
                      {...form.register('apellidos')}
                      className={form.formState.errors.apellidos ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.apellidos && (
                      <p className="text-xs text-red-500">{form.formState.errors.apellidos.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edad">Edad</Label>
                    <Input
                      id="edad"
                      type="number"
                      {...form.register('edad', { valueAsNumber: true })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="genero">Género *</Label>
                    <Select 
                      value={form.watch('genero')} 
                      onValueChange={(value) => form.setValue('genero', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.genero && (
                      <p className="text-xs text-red-500">{form.formState.errors.genero.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      {...form.register('telefono')}
                      onChange={(e) => form.setValue('telefono', formatPhoneNumber(e.target.value))}
                      className={form.formState.errors.telefono ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.telefono && (
                      <p className="text-xs text-red-500">{form.formState.errors.telefono.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Información Médica */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Información Médica
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="diagnostico">Diagnóstico Principal *</Label>
                  <Select 
                    value={form.watch('diagnostico_principal')} 
                    onValueChange={(value) => form.setValue('diagnostico_principal', value as DbDiagnosis)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar diagnóstico" />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAGNOSIS_DB_VALUES.map((diagnosis) => (
                        <SelectItem key={diagnosis} value={diagnosis}>
                          {dbDiagnosisToDisplay(diagnosis)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {/* Programación de Cita */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Programar Cita
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !form.watch('fecha') && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {form.watch('fecha') 
                            ? format(form.watch('fecha'), 'PPP', { locale: es })
                            : "Seleccionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={form.watch('fecha')}
                          onSelect={(date) => date && form.setValue('fecha', date)}
                          disabled={(date) => !isValidDate(date)}
                          locale={es}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {form.formState.errors.fecha && (
                      <p className="text-xs text-red-500">{form.formState.errors.fecha.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hora *</Label>
                    <Select 
                      value={form.watch('hora')} 
                      onValueChange={(value) => form.setValue('hora', value)}
                      disabled={!form.watch('fecha')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-500">
                            No hay horarios disponibles
                          </div>
                        ) : (
                          availableSlots.map((slot) => (
                            <SelectItem key={slot.value} value={slot.value}>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5" />
                                {slot.label}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    form.reset();
                    setSelectedLead(null);
                  }}
                  className="flex-1"
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 bg-sky-600 hover:bg-sky-700"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Registrar Paciente
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}