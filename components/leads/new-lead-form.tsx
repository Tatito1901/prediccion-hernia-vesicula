
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn, formatPhoneNumber } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/unified-skeletons';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';

import { useCreateLead } from '@/hooks/use-leads';
import type { Channel, Motive } from '@/lib/types';

// Validation schema
const leadFormSchema = z.object({
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  phone_number: z.string().min(10, 'Debe ser un número de teléfono válido'),
  channel: z.enum(['TELEFONO', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'REFERENCIA', 'PAGINA_WEB', 'OTRO'], {
    required_error: 'Selecciona el método de contacto'
  }),
  call_reason: z.enum(['ONLY_WANTS_INFORMATION', 'WANTS_TO_SCHEDULE_APPOINTMENT', 'WANTS_TO_COMPARE_PRICES', 'OTHER'], {
    required_error: 'Selecciona el motivo de la llamada'
  }),
  problem_type: z.enum(['INFORMES', 'AGENDAR_CITA', 'URGENCIA_MEDICA', 'SEGUIMIENTO', 'CANCELACION', 'REAGENDAMIENTO', 'OTRO'], {
    required_error: 'Por favor seleccione el motivo de contacto'
  }),
  problem_specification: z.string().optional(),
  notes: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface NewLeadFormProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function NewLeadForm({ trigger, onSuccess }: NewLeadFormProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createLead, isPending } = useCreateLead();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      phone_number: '',
      channel: undefined,
      call_reason: undefined,
      problem_type: undefined,
      problem_specification: '',
      notes: '',
    },
  });

  const onSubmit = (data: LeadFormData) => {
    // Mapear problem_type a motive según los enums existentes
    const motiveMapping: Record<string, Motive> = {
      'INFORMES': 'INFORMES' as Motive,
      'AGENDAR_CITA': 'AGENDAR_CITA' as Motive,
      'URGENCIA_MEDICA': 'URGENCIA_MEDICA' as Motive,
      'SEGUIMIENTO': 'SEGUIMIENTO' as Motive,
      'CANCELACION': 'CANCELACION' as Motive,
      'REAGENDAMIENTO': 'REAGENDAMIENTO' as Motive,
      'OTRO': 'OTRO' as Motive
    };
    
    const submitData = {
      full_name: `${data.first_name} ${data.last_name}`,
      phone_number: data.phone_number,
      channel: data.channel as Channel,
      motive: motiveMapping[data.problem_type],
      problem_specification: data.problem_specification || undefined,
      notes: data.notes || undefined,
      // La fecha de contacto se almacenará automáticamente en el backend
    };

    createLead(submitData, {
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre */}
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                placeholder="Ej: Juan"
                {...form.register('first_name')}
                className={form.formState.errors.first_name ? 'border-red-500' : ''}
              />
              {form.formState.errors.first_name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.first_name.message}
                </p>
              )}
            </div>

            {/* Apellido */}
            <div>
              <Label htmlFor="last_name">Apellido *</Label>
              <Input
                id="last_name"
                placeholder="Ej: Pérez García"
                {...form.register('last_name')}
                className={form.formState.errors.last_name ? 'border-red-500' : ''}
              />
              {form.formState.errors.last_name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone_number">Teléfono *</Label>
              <Input
                id="phone_number"
                placeholder="555-123-4567"
                {...form.register('phone_number')}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  form.setValue('phone_number', formatted);
                }}
                className={form.formState.errors.phone_number ? 'border-red-500' : ''}
              />
              {form.formState.errors.phone_number && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Método de Contacto */}
            <div>
              <Label htmlFor="channel">Método de Contacto *</Label>
              <Select
                value={form.watch('channel') || ''}
                onValueChange={(value) => form.setValue('channel', value as 'WHATSAPP' | 'TELEFONO' | 'FACEBOOK' | 'INSTAGRAM' | 'REFERENCIA' | 'PAGINA_WEB' | 'OTRO')}
              >
                <SelectTrigger className={form.formState.errors.channel ? 'border-red-500' : ''}>
                  <SelectValue placeholder="¿Cómo se comunicó?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TELEFONO">Llamada telefónica</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="FACEBOOK">Facebook</SelectItem>
                  <SelectItem value="INSTAGRAM">Instagram</SelectItem>
                  <SelectItem value="REFERENCIA">Referencia</SelectItem>
                  <SelectItem value="PAGINA_WEB">Página web</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.channel && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.channel.message}
                </p>
              )}
            </div>

            {/* Motivo de la Llamada */}
            <div>
              <Label htmlFor="call_reason">Motivo de la Llamada *</Label>
              <Select
                value={form.watch('call_reason') || ''}
                onValueChange={(value) => form.setValue('call_reason', value as 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'OTHER')}
              >
                <SelectTrigger className={form.formState.errors.call_reason ? 'border-red-500' : ''}>
                  <SelectValue placeholder="¿Para qué llamó?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLY_WANTS_INFORMATION">Solo quiere información</SelectItem>
                  <SelectItem value="WANTS_TO_SCHEDULE_APPOINTMENT">Quiere agendar cita</SelectItem>
                  <SelectItem value="WANTS_TO_COMPARE_PRICES">Quiere comparar precios</SelectItem>
                  <SelectItem value="OTHER">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.call_reason && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.call_reason.message}
                </p>
              )}
            </div>

            {/* Tipo de Problema */}
            <div>
              <Label htmlFor="problem_type">Tipo de Problema *</Label>
              <Select
                value={form.watch('problem_type') || ''}
                onValueChange={(value) => form.setValue('problem_type', value as 'INFORMES' | 'AGENDAR_CITA' | 'URGENCIA_MEDICA' | 'SEGUIMIENTO' | 'CANCELACION' | 'REAGENDAMIENTO' | 'OTRO')}
              >
                <SelectTrigger className={form.formState.errors.problem_type ? 'border-red-500' : ''}>
                  <SelectValue placeholder="¿Qué problema tiene?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFORMES">Informes</SelectItem>
                  <SelectItem value="AGENDAR_CITA">Agendar cita</SelectItem>
                  <SelectItem value="URGENCIA_MEDICA">Urgencia médica</SelectItem>
                  <SelectItem value="SEGUIMIENTO">Seguimiento</SelectItem>
                  <SelectItem value="CANCELACION">Cancelación</SelectItem>
                  <SelectItem value="REAGENDAMIENTO">Reagendamiento</SelectItem>
                  <SelectItem value="OTRO">Otro</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.problem_type && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.problem_type.message}
                </p>
              )}
            </div>

            {/* Especificación del Problema (condicional) */}
            {form.watch('problem_type') === 'OTRO' && (
              <div>
                <Label htmlFor="problem_specification">Especificar Problema</Label>
                <Input
                  id="problem_specification"
                  placeholder="Describa brevemente el problema"
                  {...form.register('problem_specification')}
                  className={form.formState.errors.problem_specification ? 'border-red-500' : ''}
                />
                {form.formState.errors.problem_specification && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.problem_specification.message}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                placeholder="Información adicional sobre el lead..."
                {...form.register('notes')}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <LoadingSpinner size="sm" />
              Guardando...
            </>
          ) : (
            'Crear Lead'
          )}
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
  );
}
