
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { User, CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { addDays, format, isBefore, isSunday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { useAdmitPatient } from '@/hooks/use-patient';
import type { AdmissionPayload, Lead } from './admision-types';
import { ZDiagnosisDb, DIAGNOSIS_DB_VALUES, dbDiagnosisToDisplay, type DbDiagnosis } from '@/lib/validation/enums';
import { useClinic } from '@/contexts/clinic-data-provider';

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

// ==================== Esquema y utilidades ====================
const MinimalSchema = z.object({
  nombre: z.string().min(2, 'Nombre muy corto'),
  apellidos: z.string().min(2, 'Apellidos muy cortos'),
  edad: z.coerce.number().int().min(0).max(120).optional(),
  genero: z.enum(['Masculino', 'Femenino'], { required_error: 'Selecciona género' }),
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/i, 'Teléfono inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  diagnostico_principal: ZDiagnosisDb,
  fecha: z.date({ required_error: 'Fecha requerida' }),
  hora: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/i, 'Hora inválida (HH:MM)'),
});

type MinimalFormData = z.infer<typeof MinimalSchema>;

// Horarios disponibles (09:00 - 14:30 cada 30 min) — backend valida hour < 15
const TIME_SLOTS = (() => {
  const slots: { value: string; label: string }[] = [];
  let hour = 9;
  let minute = 0;
  while (hour < 15) {
    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    const time = `${hh}:${mm}`;
    slots.push({ value: time, label: time });
    minute += 30;
    if (minute >= 60) { minute = 0; hour += 1; }
  }
  return slots;
})();

// Estados de cita que bloquean el horario (reutilizable, evita re-creación)
const BLOCKED_APPOINTMENT_STATUSES = new Set([
  'PROGRAMADA',
  'CONFIRMADA',
  'PRESENTE',
  'REAGENDADA',
]);

const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  const isPast = isBefore(date, today);
  const isAfterMax = isBefore(maxDate, date);
  return !isPast && !isAfterMax && !isSunday(date);
};

function combineDateTime(date: Date, hhmm: string): Date {
  const [hh, mm] = hhmm.split(':').map((v) => parseInt(v, 10));
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

export function PatientModal({ trigger, onSuccess }: PatientModalProps) {
  const [open, setOpen] = useState(false);

  // ==================== Lead Search State ====================
  const [leadQuery, setLeadQuery] = useState('');
  const [debouncedLeadQuery, setDebouncedLeadQuery] = useState('');
  const [leadResults, setLeadResults] = useState<Lead[]>([]);
  const [searchingLeads, setSearchingLeads] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const form = useForm<MinimalFormData>({
    resolver: zodResolver(MinimalSchema),
    defaultValues: {
      nombre: '',
      apellidos: '',
      edad: undefined,
      genero: undefined as unknown as MinimalFormData['genero'],
      telefono: '',
      email: '',
      diagnostico_principal: undefined as unknown as DbDiagnosis,
      fecha: undefined as unknown as Date,
      hora: undefined as unknown as string,
    },
  });
  const { fetchSpecificAppointments, fetchLeads } = useClinic();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLeadQuery(leadQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [leadQuery]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedLeadQuery) {
      setLeadResults([]);
      return;
    }
    setSearchingLeads(true);
    (async () => {
      try {
        const res = await fetchLeads({ search: debouncedLeadQuery, pageSize: 10 });
        if (cancelled) return;
        const data = Array.isArray((res as any)?.data) ? (res as any).data : [];
        setLeadResults(data as Lead[]);
      } catch (err) {
        if (!cancelled) {
          console.error('Lead search error:', err);
        }
      } finally {
        if (!cancelled) setSearchingLeads(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedLeadQuery, fetchLeads]);

  const splitFullName = (full_name: string): { nombre: string; apellidos: string } => {
    const parts = (full_name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return { nombre: parts[0] || '', apellidos: '' };
    return { nombre: parts[0], apellidos: parts.slice(1).join(' ') };
  };

  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
    setLeadQuery(lead.full_name || '');
    const { nombre, apellidos } = splitFullName(lead.full_name || '');
    form.setValue('nombre', nombre, { shouldValidate: true });
    form.setValue('apellidos', apellidos, { shouldValidate: true });
    if (lead.phone_number) form.setValue('telefono', lead.phone_number, { shouldValidate: true });
    if (lead.email) form.setValue('email', lead.email || '', { shouldValidate: false });

    // Prefill clinical diagnosis using lead information (non-intrusive)
    const currentDx = form.getValues('diagnostico_principal');
    if (!currentDx) {
      let inferred: DbDiagnosis | undefined;
      if ((lead as any).motive === 'URGENCIA_MEDICA') {
        inferred = 'SIN_DIAGNOSTICO';
      } else {
        const notes = ((lead as any).notes || '').toString().toLowerCase();
        if (/ves[íi]cula|colecist/i.test(notes)) {
          inferred = 'COLECISTITIS_CRONICA';
        } else if (/hernia|eventraci[óo]n|eventracion/i.test(notes)) {
          inferred = 'HERNIA_INGUINAL';
        }
      }
      if (inferred) {
        form.setValue('diagnostico_principal', inferred, { shouldValidate: true });
      }
    }
  }, [form]);

  // form inicializado arriba para uso en callbacks memoizados

  const selectedDate = form.watch('fecha');
  const selectedDateISO = useMemo(
    () => (selectedDate ? selectedDate.toISOString().split('T')[0] : undefined),
    [selectedDate]
  );
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedDateISO) {
      setDayAppointments([]);
      return;
    }
    (async () => {
      try {
        const res = await fetchSpecificAppointments({
          dateFilter: 'range',
          startDate: selectedDateISO,
          endDate: selectedDateISO,
          pageSize: 100,
        });
        if (!cancelled) setDayAppointments(res.data || []);
      } catch (e) {
        if (!cancelled) setDayAppointments([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDateISO, fetchSpecificAppointments]);

  const occupiedTimes = useMemo(() => {
    if (!dayAppointments || !Array.isArray(dayAppointments)) return new Set<string>();
    const s = new Set<string>();
    for (const ap of dayAppointments) {
      const st = (ap as any).estado_cita as string | undefined;
      if (st && BLOCKED_APPOINTMENT_STATUSES.has(st)) {
        const dt = new Date((ap as any).fecha_hora_cita);
        const hh = dt.getHours().toString().padStart(2, '0');
        const mm = dt.getMinutes().toString().padStart(2, '0');
        s.add(`${hh}:${mm}`);
      }
    }
    return s;
  }, [dayAppointments]);

  const { mutate: admitPatient, isPending } = useAdmitPatient();

  const onSubmit = useCallback((values: MinimalFormData) => {
    const payload: AdmissionPayload = {
      nombre: values.nombre,
      apellidos: values.apellidos,
      edad: values.edad,
      telefono: values.telefono,
      email: values.email || undefined,
      genero: values.genero,
      diagnostico_principal: values.diagnostico_principal,
      fecha_hora_cita: combineDateTime(values.fecha, values.hora).toISOString(),
      // Alinear con enum de BD: usar el valor del diagnóstico directamente
      motivos_consulta: [values.diagnostico_principal],
    };

    admitPatient(payload, {
      onSuccess: () => {
        form.reset();
        setOpen(false);
        onSuccess?.();
      },
      onError: (err: any) => {
        const cause = err?.cause as any;
        const status = cause?.status as number | undefined;
        const data = cause?.data;
        const message: string = err?.message || data?.error || 'Error en la admisión';

        if (status === 400) {
          // Duplicado de teléfono (UNIQUE)
          if (message?.includes('patients_telefono_key') || /tel[eé]fono/i.test(message)) {
            form.setError('telefono', {
              type: 'manual',
              message: 'Este teléfono ya está registrado. Selecciona al paciente existente o usa otro número.',
            });
            return;
          }
          // Errores de validación de esquema (Zod)
          const ve = Array.isArray(data?.validation_errors) ? data.validation_errors : [];
          if (ve.length) {
            for (const e of ve) {
              const field = String(e.field || '');
              const msg = String(e.message || 'Dato inválido');
              if (field.includes('p_nombre')) form.setError('nombre', { type: 'manual', message: msg });
              else if (field.includes('p_apellidos')) form.setError('apellidos', { type: 'manual', message: msg });
              else if (field.includes('p_email')) form.setError('email', { type: 'manual', message: msg });
              else if (field.includes('p_telefono')) form.setError('telefono', { type: 'manual', message: msg });
              else if (field.includes('p_diagnostico_principal')) form.setError('diagnostico_principal', { type: 'manual', message: msg });
              else if (field.includes('p_fecha_hora_cita')) {
                form.setError('fecha', { type: 'manual', message: msg });
                form.setError('hora', { type: 'manual', message: msg });
              }
            }
            return;
          }
        }
        if (status === 422) {
          // Reglas de negocio de horario/fecha
          if (/domingo|pasado/i.test(message)) {
            form.setError('fecha', { type: 'manual', message });
          } else {
            form.setError('hora', { type: 'manual', message });
          }
          return;
        }
        // Otros errores: el toast global del hook ya informa.
      },
    });
  }, [admitPatient, form, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Nuevo Paciente y Cita
          </DialogTitle>
        </DialogHeader>

        {/* Lead Search */}
        <div className="space-y-2 mb-4" aria-busy={searchingLeads}>
          <label htmlFor="lead-search" className="text-sm font-medium leading-none">Buscar lead</label>
          <Input
            id="lead-search"
            placeholder="Nombre, teléfono o email"
            value={leadQuery}
            onChange={(e) => {
              setLeadQuery(e.target.value);
              setSelectedLead(null);
            }}
            autoComplete="off"
          />
          {leadQuery && (
            <div className="text-xs text-muted-foreground" aria-live="polite">
              {searchingLeads ? 'Buscando…' : `Resultados: ${leadResults.length}`}
            </div>
          )}
          {leadQuery && searchingLeads && (
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
            </div>
          )}
          {leadQuery && leadResults.length > 0 && (
            <ScrollArea className="h-56 border rounded-md">
              <div className="divide-y">
                {leadResults.map((l) => (
                  <button
                    type="button"
                    key={l.id ?? `${l.phone_number}-${l.full_name}`}
                    onClick={() => handleSelectLead(l)}
                    className="w-full text-left px-3 py-2 hover:bg-accent"
                  >
                    <div className="font-medium">{l.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.phone_number}
                      {l.email ? ` • ${l.email}` : ''}
                      {l.channel ? ` • ${l.channel}` : ''}
                      {l.motive ? ` • ${l.motive}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre" autoComplete="given-name" {...field} />
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
                      <Input placeholder="Apellidos" autoComplete="family-name" {...field} />
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
                        placeholder="Edad"
                        inputMode="numeric"
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
                name="genero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Género *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
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
                        onChange={(e) => field.onChange(formatPhoneNumber(e.target.value))}
                        autoComplete="tel"
                        inputMode="tel"
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
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@ejemplo.com" autoComplete="email" {...field} />
                      
                      
                      
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diagnostico_principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo de consulta (Diagnóstico) *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona diagnóstico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIAGNOSIS_DB_VALUES.map((val) => (
                          <SelectItem key={val} value={val}>
                            {dbDiagnosisToDisplay(val)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fecha"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn('pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          locale={es}
                          disabled={(date) => !isValidDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedDate}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedDate ? 'Selecciona hora' : 'Selecciona fecha primero'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TIME_SLOTS.map((slot) => (
                          <SelectItem
                            key={slot.value}
                            value={slot.value}
                            disabled={occupiedTimes.has(slot.value)}
                            className={occupiedTimes.has(slot.value) ? 'opacity-50 pointer-events-none' : ''}
                          >
                            {slot.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} aria-busy={isPending}>
                {isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</>) : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
