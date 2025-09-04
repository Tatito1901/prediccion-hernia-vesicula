// components/patient-admission/patient-modal.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  TextField, PhoneField, EmailField, GenderSelectField,
  DiagnosisSelectField, DatePickerField, TimeSelectField
} from '@/components/ui/form-components';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  addDays, format, startOfDay, isWithinInterval
} from 'date-fns';
import { User2, CalendarIcon, Loader2, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useAdmitPatient } from '@/hooks/use-patient';
import { useClinic } from '@/contexts/clinic-data-provider';
import { ZDiagnosisDb } from '@/lib/validation/enums';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentStatus } from '@/lib/types';
import type { AppError } from '@/lib/errors';
import { generateTimeSlots, CLINIC_SCHEDULE, isWorkDay } from '@/lib/clinic-schedule';
import { mxLocalPartsToUtcIso } from '@/utils/datetime';

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

// ────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────
const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatusEnum.PROGRAMADA,
  AppointmentStatusEnum.CONFIRMADA,
  AppointmentStatusEnum.PRESENTE,
];

// Validación
const QuickAdmissionSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
  genero: z.enum(['Masculino', 'Femenino']),
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, 'Formato inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  diagnostico_principal: ZDiagnosisDb,
  fecha: z.date(),
  hora: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
});

type FormData = z.infer<typeof QuickAdmissionSchema>;

type ClinicAppointment = {
  estado_cita: AppointmentStatus;
  fecha_hora_cita: string; // ISO
};

// ────────────────────────────────────────────────────────────────────────────
// Utilidades
// ────────────────────────────────────────────────────────────────────────────
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
  if (!isWorkDay(date)) return false;
  return isWithinInterval(date, { start: today, end: maxDate });
};

// ────────────────────────────────────────────────────────────────────────────
// Componente
// ────────────────────────────────────────────────────────────────────────────
export function PatientModal({ trigger, onSuccess }: PatientModalProps) {
  const [open, setOpen] = useState(false);
  const { fetchSpecificAppointments } = useClinic();
  const { mutate: admitPatient, isPending } = useAdmitPatient();

  const form = useForm<FormData>({
    resolver: zodResolver(QuickAdmissionSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: '',
      apellidos: '',
      genero: undefined,
      telefono: '',
      email: '',
      diagnostico_principal: 'HERNIA_INGUINAL',
      fecha: undefined,
      hora: `${String(CLINIC_SCHEDULE.START_HOUR).padStart(2, '0')}:00`,
    },
  });

  // Enfoque inicial al abrir
  const nombreInputRef = useRef<HTMLInputElement | null>(null);

  // Observa la fecha seleccionada
  const selectedDate = form.watch('fecha');
  const dateStr = useMemo(
    () => (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined),
    [selectedDate]
  );

  const [occupiedTimes, setOccupiedTimes] = useState<Set<string>>(() => new Set());

  // Memoriza props de inputs para evitar recreaciones
  const givenNameProps = useMemo(() => ({ autoComplete: 'given-name', autoFocus: true, ref: nombreInputRef }), []);
  const familyNameProps = useMemo(() => ({ autoComplete: 'family-name' }), []);
  const telProps = useMemo(() => ({ autoComplete: 'tel' }), []);
  const emailProps = useMemo(() => ({ autoComplete: 'email' }), []);

  // Slots de tiempo: sólo generar si hay fecha
  const timeSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateTimeSlots({ baseDate: selectedDate, includeLunch: false });
  }, [selectedDate]);

  // Carga de horarios ocupados (por día) con AbortController y guardas
  useEffect(() => {
    if (!dateStr) {
      setOccupiedTimes(prev => (prev.size ? new Set() : prev));
      return;
    }

    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetchSpecificAppointments({
          dateFilter: 'range',
          startDate: dateStr,
          endDate: dateStr,
          pageSize: 100,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const next = new Set<string>();
        (res.data as ClinicAppointment[] | undefined)?.forEach((apt) => {
          if (BLOCKING_STATUSES.includes(apt.estado_cita)) {
            next.add(format(new Date(apt.fecha_hora_cita), 'HH:mm'));
          }
        });

        // Solo setea si cambió
        setOccupiedTimes((prev) => {
          if (prev.size === next.size && [...prev].every(t => next.has(t))) return prev;
          return next;
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          // Opcional: toast no intrusivo
          // toast.error('No se pudieron cargar horarios ocupados');
          console.error('Error cargando las citas:', err);
        }
      }
    })();

    return () => controller.abort();
  }, [dateStr, fetchSpecificAppointments]);

  // Submit
  const onSubmit = useCallback((values: FormData) => {
    const [hours, minutes] = values.hora.split(':').map(Number);
    const yyyyMmDd = format(values.fecha, 'yyyy-MM-dd'); // local, evita UTC shift
    const fechaIso = mxLocalPartsToUtcIso(yyyyMmDd, hours, minutes);

    admitPatient(
      {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        genero: values.genero,
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        diagnostico_principal: values.diagnostico_principal,
        fecha_hora_cita: fechaIso,
        motivos_consulta: [values.diagnostico_principal],
        creation_source: 'web_quick_admission',
      },
      {
        onSuccess: () => {
          form.reset();
          setOpen(false);
          onSuccess?.();
        },
        onError: (error: AppError) => {
          const payload: any = error?.details ?? {};
          const code: string | undefined =
            typeof payload?.code === 'string'
              ? payload.code.toUpperCase()
              : (typeof (error as any)?.code === 'string' ? (error as any).code.toUpperCase() : undefined);

          const validationErrors:
            | Array<{ field: string; message: string; code?: string }>
            | undefined = Array.isArray(payload?.validation_errors) ? payload.validation_errors : undefined;

          if (validationErrors?.length) {
            for (const ve of validationErrors) {
              const field = ve.field;
              const message = ve.message || 'Dato inválido';
              switch (field) {
                case 'nombre':
                case 'apellidos':
                case 'genero':
                case 'telefono':
                case 'email':
                case 'diagnostico_principal':
                  form.setError(field as any, { message });
                  break;
                case 'fecha_hora_cita':
                  form.setError('hora', { message });
                  break;
              }
            }
          }

          if (error.status === 409 && code === 'SCHEDULE_CONFLICT') {
            form.setError('hora', { message: error.message || 'Conflicto de horario' });
          }

          if (error.status === 422 && code === 'INVALID_DATE') {
            form.setError('hora', { message: error.message || 'La fecha/hora no puede ser en el pasado' });
          }

          if (error.status === 409 && code === 'DUPLICATE_PATIENT') {
            form.setError('nombre', { message: 'Posible paciente duplicado' });
            form.setError('apellidos', { message: 'Verifique los datos: posible duplicado' });
          }

          const msg = error?.message || '';
          if (msg.toLowerCase().includes('telefono')) {
            form.setError('telefono', { message: 'Teléfono ya registrado' });
          }
        },
      }
    );
  }, [admitPatient, form, onSuccess]);

  const allDisabled = useMemo(
    () => timeSlots.length > 0 && timeSlots.every((slot) => occupiedTimes.has(slot.value)),
    [timeSlots, occupiedTimes]
  );

  const timeDescId = 'time-field-description';

  // Reset al cerrar (sin conservar datos parciales del intento previo)
  const handleOpenChange = useCallback((v: boolean) => {
    setOpen(v);
    if (!v) {
      form.reset();
      setOccupiedTimes(prev => (prev.size ? new Set() : prev));
    } else {
      // enfoque suave en nombre cuando abre
      setTimeout(() => nombreInputRef.current?.focus(), 50);
    }
  }, [form]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="w-[min(100vw-2rem,44rem)] sm:max-w-xl md:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-white dark:bg-zinc-900">
          <DialogTitle className="flex items-center gap-3 text-base sm:text-lg">
            <span className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
              <User2 className="h-5 w-5 text-sky-700 dark:text-sky-400" />
            </span>
            <span className="font-semibold">Registro rápido de paciente</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <User2 className="h-4 w-4" />
                    Datos personales
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField form={form} name="nombre" label="Nombre *" inputProps={givenNameProps} />
                    <TextField form={form} name="apellidos" label="Apellidos *" inputProps={familyNameProps} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GenderSelectField form={form} name="genero" label="Género *" options={['Masculino', 'Femenino']} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-1">
                      <PhoneField form={form} name="telefono" label="Teléfono *" inputProps={telProps} />
                      <EmailField form={form} name="email" label="Email" inputProps={emailProps} />
                    </div>
                  </div>
                </fieldset>

                <Separator />

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4" />
                    Información médica
                  </legend>
                  <DiagnosisSelectField form={form} name="diagnostico_principal" label="Diagnóstico principal *" />
                </fieldset>

                <Separator />

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4" />
                    Programar cita
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DatePickerField
                      form={form}
                      name="fecha"
                      label="Fecha *"
                      isValidDate={isValidDate}
                    />
                    <TimeSelectField
                      form={form}
                      name="hora"
                      label="Hora *"
                      timeSlots={timeSlots}
                      occupiedTimes={occupiedTimes}
                      disabled={!selectedDate || allDisabled}
                      description={allDisabled ? 'No hay horarios disponibles' : 'Horarios de la clínica'}
                      describedById={timeDescId}
                    />
                  </div>
                  <p id={timeDescId} className="text-xs text-muted-foreground">
                    {(allDisabled && selectedDate) ? 'No hay horarios disponibles para esta fecha' : 'Selecciona un horario disponible'}
                  </p>
                </fieldset>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isPending}
                    aria-busy={isPending}
                    aria-live="polite"
                    className="flex-1 bg-sky-700 hover:bg-sky-800 text-white"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registrando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Registrar paciente
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
