
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/unified-skeletons';

import { useCreateLead } from '@/hooks/use-leads';
import type { Channel, Motive } from '@/lib/types';

// Validation schema
const leadFormSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone_number: z.string().min(10, 'Debe ser un número de teléfono válido'),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
  channel: z.string().min(1, 'Selecciona un canal'),
  motive: z.string().min(1, 'Selecciona un motivo'),
  notes: z.string().optional(),
  lead_intent: z.enum(['ONLY_WANTS_INFORMATION', 'WANTS_TO_SCHEDULE_APPOINTMENT', 'WANTS_TO_COMPARE_PRICES', 'OTHER']).optional(),
  next_follow_up_date: z.date().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface NewLeadFormProps {
  onSuccess: () => void;
  channelOptions: { value: Channel; label: string }[];
  motiveOptions: { value: Motive; label: string }[];
}

export function NewLeadForm({ onSuccess, channelOptions, motiveOptions }: NewLeadFormProps) {
  const [followUpDate, setFollowUpDate] = useState<Date>();
  const { mutate: createLead, isPending } = useCreateLead();

  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      email: '',
      channel: '',
      motive: '',
      notes: '',
      lead_intent: undefined,
    },
  });

  const onSubmit = (data: LeadFormData) => {
    const submitData = {
      ...data,
      email: data.email || undefined,
      notes: data.notes || undefined,
      next_follow_up_date: followUpDate ? followUpDate.toISOString() : undefined,
      channel: data.channel as Channel,
      motive: data.motive as Motive,
    };

    createLead(submitData, {
      onSuccess: () => {
        form.reset();
        setFollowUpDate(undefined);
        onSuccess();
      },
    });
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numeric = value.replace(/\D/g, '');
    
    // Format as Mexican phone number if applicable
    if (numeric.length <= 10) {
      return numeric.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }
    
    return numeric;
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="md:col-span-2">
              <Label htmlFor="full_name">Nombre Completo *</Label>
              <Input
                id="full_name"
                placeholder="Ej: Juan Pérez García"
                {...form.register('full_name')}
                className={form.formState.errors.full_name ? 'border-red-500' : ''}
              />
              {form.formState.errors.full_name && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.full_name.message}
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

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                {...form.register('email')}
                className={form.formState.errors.email ? 'border-red-500' : ''}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            {/* Channel */}
            <div>
              <Label htmlFor="channel">Canal de Contacto *</Label>
              <Select
                value={form.watch('channel')}
                onValueChange={(value) => form.setValue('channel', value)}
              >
                <SelectTrigger className={form.formState.errors.channel ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar canal" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.channel && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.channel.message}
                </p>
              )}
            </div>

            {/* Motive */}
            <div>
              <Label htmlFor="motive">Motivo de Consulta *</Label>
              <Select
                value={form.watch('motive')}
                onValueChange={(value) => form.setValue('motive', value)}
              >
                <SelectTrigger className={form.formState.errors.motive ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motiveOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.motive && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.motive.message}
                </p>
              )}
            </div>

            {/* Lead Intent */}
            <div>
              <Label htmlFor="lead_intent">Intención del Lead</Label>
              <Select
                value={form.watch('lead_intent') || ''}
                onValueChange={(value) => form.setValue('lead_intent', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona la intención" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONLY_WANTS_INFORMATION">Solo quiere información</SelectItem>
                  <SelectItem value="WANTS_TO_SCHEDULE_APPOINTMENT">Quiere agendar cita</SelectItem>
                  <SelectItem value="WANTS_TO_COMPARE_PRICES">Quiere comparar precios</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Follow Up Date */}
            <div>
              <Label>Fecha de Seguimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !followUpDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {followUpDate ? (
                      format(followUpDate, "PPP", { locale: es })
                    ) : (
                      "Seleccionar fecha"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={setFollowUpDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

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
        <Button type="button" variant="outline" onClick={onSuccess}>
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
  );
}
