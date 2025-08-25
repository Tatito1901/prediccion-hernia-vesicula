// components/patient-admission/patient-modal.tsx
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { TextField, NumberField, PhoneField, EmailField, GenderSelectField, DiagnosisSelectField, DatePickerField, TimeSelectField } from '@/components/ui/form-components';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDays, format, isBefore, isSunday, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  User2, CalendarIcon, Loader2, 
  Stethoscope, Info, CheckCircle2 
} from 'lucide-react';
import { useAdmitPatient } from '@/hooks/use-patient';
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  ZDiagnosisDb 
} from '@/lib/validation/enums';
import { AppointmentStatusEnum } from '@/lib/types';

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

  const { fetchSpecificAppointments } = useClinic();
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

  // (Lead search removed)

  // Horarios ocupados
  const selectedDate = form.watch('fecha');
  const [occupiedTimes, setOccupiedTimes] = useState<Set<string>>(new Set());

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
        
        const occupied = new Set<string>();
        const blockingStatuses = [
          AppointmentStatusEnum.PROGRAMADA,
          AppointmentStatusEnum.CONFIRMADA,
          AppointmentStatusEnum.PRESENTE,
        ];
        
        res.data?.forEach((apt: any) => {
          if (blockingStatuses.includes(apt.estado_cita)) {
            const time = format(new Date(apt.fecha_hora_cita), 'HH:mm');
            occupied.add(time);
          }
        });
        
        setOccupiedTimes(occupied);
      } catch (err) {
        // Silently ignore aborts; log other errors
        const isAborted = controller.signal.aborted || (err instanceof Error && err.name === 'AbortError');
        if (!isAborted) {
          console.error('Error loading appointments:', err);
        }
      }
    };

    loadAppointments();
    return () => {
      try { controller.abort(); } catch {}
    };
  }, [selectedDate, fetchSpecificAppointments]);

  // (Lead handlers removed)

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
        // Lead state removed
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
                  <TextField form={form} name="nombre" label="Nombre *" />
                  <TextField form={form} name="apellidos" label="Apellidos *" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <NumberField form={form} name="edad" label="Edad" />
                  <GenderSelectField form={form} name="genero" label="Género *" options={["Masculino", "Femenino"]} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <PhoneField form={form} name="telefono" label="Teléfono *" />
                  <EmailField form={form} name="email" label="Email" />
                </div>
              </div>

              <Separator />

              {/* Información Médica */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Información Médica
                </h3>
                <DiagnosisSelectField form={form} name="diagnostico_principal" label="Diagnóstico Principal *" />
              </div>

              <Separator />

              {/* Programación de Cita */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  Programar Cita
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
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
                    timeSlots={availableSlots}
                    disabled={!form.watch('fecha') || availableSlots.length === 0}
                    description={availableSlots.length === 0 ? 'No hay horarios disponibles' : undefined}
                  />
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