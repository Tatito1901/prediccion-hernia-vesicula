'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { addDays, startOfDay, isWithinInterval } from 'date-fns';
import { User2, Calendar as CalendarIcon, Loader2, Stethoscope, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  TextField,
  PhoneField,
  EmailField,
  GenderSelectField,
  DiagnosisSelectField,
  DatePickerField,
  TimeSelectField,
} from '@/components/ui/form-components';
import { Form } from '@/components/ui/form';

// Project-specific imports
import { useAdmitPatient } from '@/hooks/core/use-patients';
import { ZDiagnosisDb } from '@/lib/constants';
import { AppointmentStatusEnum } from '@/lib/types';
import type { AppointmentStatus, AppError } from '@/lib/types';
import { generateTimeSlots, CLINIC_SCHEDULE, isWorkDay } from '@/lib/clinic-schedule';
import { mxLocalPartsToUtcIso, formatMx } from '@/utils/datetime';
import { endpoints, buildSearchParams } from '@/lib/api-endpoints';
import { queryFetcher } from '@/lib/http';
import { queryKeys } from '@/lib/query-keys';

// ============================================================================
// Constants & Types
// ============================================================================

const BLOCKING_STATUSES: ReadonlySet<AppointmentStatus> = new Set([
  AppointmentStatusEnum.PROGRAMADA,
  AppointmentStatusEnum.CONFIRMADA,
  AppointmentStatusEnum.PRESENTE,
]);

const QuickAdmissionSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres.'),
  genero: z.enum(['Masculino', 'Femenino'] as const).refine(val => val, {
    message: 'Seleccione un género.'
  }),
  telefono: z.string().regex(/^[0-9+\-\s()]{10,15}$/u, 'El formato del teléfono es inválido.'),
  email: z.string().email('El correo electrónico es inválido.').optional().or(z.literal('')),
  diagnostico_principal: ZDiagnosisDb,
  fecha: z.date().refine(val => val, {
    message: 'La fecha es obligatoria.'
  }),
  hora: z.string().regex(/^([01]?\d|2[0-3]):([0-5]\d)$/u, 'Seleccione una hora válida.'),
});

type FormData = z.infer<typeof QuickAdmissionSchema>;
type ClinicAppointment = { estado_cita: AppointmentStatus; fecha_hora_cita: string };

// ============================================================================
// Utility Hooks & Functions
// ============================================================================

const isValidDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
  return isWorkDay(date) && isWithinInterval(date, { start: today, end: maxDate });
};

/**
 * Hook para obtener los horarios de citas ocupados para una fecha específica.
 * Utiliza React Query para cacheo, reintentos y gestión de estado.
 */
function useOccupiedTimes(date: Date | undefined) {
  const dateStr = date ? formatMx(date, 'yyyy-MM-dd') : null;

  return useQuery({
    queryKey: queryKeys.appointments.occupied(dateStr),
    queryFn: async () => {
      if (!dateStr) return new Set<string>();

      const params = buildSearchParams({
        dateFilter: 'range',
        startDate: dateStr,
        endDate: dateStr,
        pageSize: 200, // Asumimos que no hay más de 200 citas en un día
        includePatient: false,
      });
      const { data } = await queryFetcher<{ data?: ClinicAppointment[] }>(endpoints.appointments.list(params));
      
      const occupied = new Set<string>();
      data?.forEach((apt) => {
        if (BLOCKING_STATUSES.has(apt.estado_cita)) {
          occupied.add(formatMx(apt.fecha_hora_cita, 'HH:mm'));
        }
      });
      return occupied;
    },
    enabled: !!dateStr,
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
    refetchOnWindowFocus: true,
  });
}

/**
 * Maneja los errores de la API y los mapea a los campos del formulario.
 */
function handleAdmissionError(error: AppError, setError: any) {
  const details = error.details as any;
  const code = (details?.code || error.code || '').toUpperCase();

  if (details?.validation_errors?.length > 0) {
    details.validation_errors.forEach((err: { field: string; message: string }) => {
      const fieldName = err.field === 'fecha_hora_cita' ? 'hora' : err.field;
      setError(fieldName, { type: 'manual', message: err.message });
    });
  }

  const message = error.message || 'Ocurrió un error inesperado.';
  switch (code) {
    case 'SCHEDULE_CONFLICT':
      setError('hora', { message });
      break;
    case 'INVALID_DATE':
      setError('fecha', { message });
      break;
    case 'DUPLICATE_PATIENT':
      setError('nombre', { message: 'Posible paciente duplicado.' });
      setError('apellidos', { message: 'Verifique si el paciente ya existe.' });
      break;
    default:
      if (message.toLowerCase().includes('telefono')) {
        setError('telefono', { message: 'Este teléfono ya está registrado.' });
      }
      break;
  }
}

// ============================================================================
// Main Component
// ============================================================================

interface PatientModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export const PatientModal = memo(({ trigger, onSuccess }: PatientModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const nombreInputRef = useRef<HTMLInputElement>(null);
  const timeDescriptionId = useRef(`time-desc-${React.useId()}`).current;

  const { mutate: admitPatient, isPending } = useAdmitPatient();
  
  const form = useForm<FormData>({
    resolver: zodResolver(QuickAdmissionSchema),
    mode: 'onBlur',
    defaultValues: {
      nombre: '',
      apellidos: '',
      telefono: '',
      email: '',
      diagnostico_principal: 'HERNIA_INGUINAL',
    },
  });

  const selectedDate = useWatch({ control: form.control, name: 'fecha' });
  const { data: occupiedTimes = new Set(), isLoading: isLoadingTimes } = useOccupiedTimes(selectedDate);

  const timeSlots = useMemo(() => 
    selectedDate ? generateTimeSlots({ baseDate: selectedDate, includeLunch: false }) : [],
    [selectedDate]
  );
  
  const allTimesDisabled = useMemo(() => 
    timeSlots.length > 0 && timeSlots.every(slot => occupiedTimes.has(slot.value)),
    [timeSlots, occupiedTimes]
  );

  const onSubmit = useCallback((values: FormData) => {
    const [hours, minutes] = values.hora.split(':').map(Number);
    const fechaIso = mxLocalPartsToUtcIso(formatMx(values.fecha, 'yyyy-MM-dd'), hours, minutes);

    admitPatient({
      ...values,
      nombre: values.nombre.trim(),
      apellidos: values.apellidos.trim(),
      email: values.email || undefined,
      fecha_hora_cita: fechaIso,
      motivos_consulta: [values.diagnostico_principal],
      creation_source: 'web_quick_admission',
    }, {
      onSuccess: () => {
        toast.success('Paciente registrado y cita agendada.');
        form.reset();
        setIsOpen(false);
        onSuccess?.();
      },
      onError: (err) => handleAdmissionError(err as AppError, form.setError),
    });
  }, [admitPatient, form, onSuccess]);
  
  const handleOpenChange = useCallback((open: boolean) => {
      setIsOpen(open);
      if (!open) form.reset();
  }, [form]);
  
  useEffect(() => {
    if (isOpen) {
        // Enfoca el primer campo al abrir el modal para una mejor experiencia de teclado.
        requestAnimationFrame(() => nombreInputRef.current?.focus());
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-[min(90vw,44rem)] max-h-[85vh] sm:max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b">
          <DialogTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg">
            <User2 className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" />
            <span className="truncate">Registro Rápido de Paciente</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-x-hidden">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-6">
              <fieldset disabled={isPending} className="space-y-8">
                
                <div className="space-y-3 sm:space-y-4">
                  <legend className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <User2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Datos Personales</span>
                  </legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <TextField form={form} name="nombre" label="Nombre(s)" inputProps={{ ref: nombreInputRef }} />
                    <TextField form={form} name="apellidos" label="Apellidos" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <GenderSelectField form={form} name="genero" label="Género" options={['Masculino', 'Femenino']} />
                    <PhoneField form={form} name="telefono" label="Teléfono" />
                  </div>
                   <EmailField form={form} name="email" label="Email (Opcional)" />
                </div>

                <Separator />

                <div className="space-y-3 sm:space-y-4">
                  <legend className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <Stethoscope className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>Información Médica</span>
                  </legend>
                  <DiagnosisSelectField form={form} name="diagnostico_principal" label="Diagnóstico Principal" />
                </div>

                <Separator />
                
                <div className="space-y-3 sm:space-y-4">
                   <legend className="text-sm sm:text-base font-semibold flex items-center gap-2">
                     <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                     <span>Agendar Cita</span>
                   </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <DatePickerField form={form} name="fecha" label="Fecha" isValidDate={isValidDate} />
                      <TimeSelectField
                        form={form}
                        name="hora"
                        label="Hora"
                        timeSlots={timeSlots}
                        occupiedTimes={occupiedTimes}
                        disabled={!selectedDate || isLoadingTimes || allTimesDisabled}
                        aria-describedby={timeDescriptionId}
                      />
                    </div>
                    <p id={timeDescriptionId} className="text-xs text-muted-foreground mt-1">
                      {!selectedDate ? 'Seleccione una fecha para ver horarios disponibles.' : 
                       isLoadingTimes ? 'Buscando horarios...' :
                       allTimesDisabled ? 'No hay horarios disponibles para este día.' :
                       'Horario en zona horaria de la Ciudad de México.'}
                    </p>
                </div>
              </fieldset>
              
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-6 sm:pt-8 mt-3 sm:mt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="w-full sm:w-auto sm:flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending} className="w-full sm:w-auto sm:flex-1 bg-sky-700 hover:bg-sky-800 text-white">
                  {isPending ? <Loader2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                  <span className="text-sm sm:text-base">{isPending ? 'Registrando...' : 'Confirmar'}</span>
                </Button>
              </div>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

