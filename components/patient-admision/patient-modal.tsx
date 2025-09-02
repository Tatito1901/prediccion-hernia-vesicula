// components/patient-admission/patient-modal.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { TextField, PhoneField, EmailField, GenderSelectField, DiagnosisSelectField, DatePickerField, TimeSelectField } from '@/components/ui/form-components';
import { Form } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, isBefore, isSunday, startOfDay } from 'date-fns';
import { User2, CalendarIcon, Loader2, Stethoscope, CheckCircle2 } from 'lucide-react';
import { useAdmitPatient } from '@/hooks/use-patient';
import { useClinic } from '@/contexts/clinic-data-provider';
import { ZDiagnosisDb } from '@/lib/validation/enums';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentStatus } from '@/lib/types';
import type { AppError } from '@/lib/errors';
import { generateTimeSlots } from '@/lib/clinic-schedule';
import { mxLocalPartsToUtcIso } from '@/utils/datetime';

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

// Constantes hoisted para evitar recreaciones en cada render
const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatusEnum.PROGRAMADA,
  AppointmentStatusEnum.CONFIRMADA,
  AppointmentStatusEnum.PRESENTE,
];

// Schema de validación con Zod
const QuickAdmissionSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellidos: z.string().min(2, 'Mínimo 2 caracteres'),
  genero: z.enum(['Masculino', 'Femenino'], { required_error: 'Seleccione género' }),
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/, 'Formato inválido'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  diagnostico_principal: ZDiagnosisDb,
  fecha: z.date({ required_error: 'Seleccione una fecha' }),
  hora: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
});

type FormData = z.infer<typeof QuickAdmissionSchema>;

// Función helper para validar fechas permitidas en el calendario
const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, 90);
  return !isBefore(date, today) && !isBefore(maxDate, date) && !isSunday(date);
};

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
      hora: '09:00',
    },
  });

  const selectedDate = form.watch('fecha');
  const [occupiedTimes, setOccupiedTimes] = useState<Set<string>>(new Set());

  // Genera los slots de tiempo disponibles, memoizado para rendimiento
  const timeSlots = useMemo(
    () => generateTimeSlots({ baseDate: selectedDate || new Date(), includeLunch: false }),
    [selectedDate]
  );

  // Efecto para buscar los horarios ocupados cuando cambia la fecha seleccionada
  useEffect(() => {
    if (!selectedDate) {
      setOccupiedTimes(new Set());
      return;
    }

    const controller = new AbortController();
    const loadAppointments = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      try {
        const res = await fetchSpecificAppointments({
          dateFilter: 'range',
          startDate: dateStr,
          endDate: dateStr,
          pageSize: 100,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        const occupied = new Set<string>();
        res.data?.forEach((apt: any) => {
          if (BLOCKING_STATUSES.includes(apt.estado_cita)) {
            const time = format(new Date(apt.fecha_hora_cita), 'HH:mm');
            occupied.add(time);
          }
        });
        setOccupiedTimes(occupied);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Error cargando las citas:', err);
        }
      }
    };

    loadAppointments();
    
    // Función de limpieza para cancelar la petición si el componente se desmonta
    return () => {
      controller.abort();
    };
  }, [selectedDate, fetchSpecificAppointments]);
  
  // Lógica de envío del formulario, envuelta en useCallback
  const onSubmit = useCallback((values: FormData) => {
    const [hours, minutes] = values.hora.split(':').map(Number);
    const yyyyMmDd = format(values.fecha, 'yyyy-MM-dd');
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
          const payload: any = (error?.details as any) ?? {};
          const code: string | undefined =
            typeof payload?.code === 'string'
              ? (payload.code as string).toUpperCase()
              : (typeof error?.code === 'string' ? (error.code as string).toUpperCase() : undefined);
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
                default:
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
  
  // Determina si todos los horarios están deshabilitados
  const allDisabled = useMemo(
    () => timeSlots.length > 0 && timeSlots.every((slot) => occupiedTimes.has(slot.value)),
    [timeSlots, occupiedTimes]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-2xl w-[min(100vw-2rem,42rem)] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20">
          <DialogTitle className="flex items-center gap-3">
            <span className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <User2 className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </span>
            Registro Rápido de Paciente
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                    <User2 className="h-4 w-4" />
                    Datos Personales
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TextField form={form} name="nombre" label="Nombre *" inputProps={{ autoComplete: 'given-name', autoFocus: true }} />
                    <TextField form={form} name="apellidos" label="Apellidos *" inputProps={{ autoComplete: 'family-name' }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GenderSelectField form={form} name="genero" label="Género *" options={['Masculino', 'Femenino']} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <PhoneField form={form} name="telefono" label="Teléfono *" inputProps={{ autoComplete: 'tel' }} />
                    <EmailField form={form} name="email" label="Email" inputProps={{ autoComplete: 'email' }} />
                  </div>
                </fieldset>

                <Separator />

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                    <Stethoscope className="h-4 w-4" />
                    Información Médica
                  </legend>
                  <DiagnosisSelectField form={form} name="diagnostico_principal" label="Diagnóstico Principal *" />
                </fieldset>

                <Separator />

                <fieldset className="space-y-4">
                  <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-2">
                    <CalendarIcon className="h-4 w-4" />
                    Programar Cita
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
                      disabled={!form.watch('fecha') || allDisabled}
                      description={allDisabled ? 'No hay horarios disponibles' : 'Horarios de la clínica'}
                      ariaDescribedBy="time-description"
                    />
                  </div>
                </fieldset>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1" disabled={isPending}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending} aria-busy={isPending} className="flex-1 bg-sky-600 hover:bg-sky-700">
                    {isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Registrando...</>
                    ) : (
                      <><CheckCircle2 className="mr-2 h-4 w-4" /> Registrar Paciente</>
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