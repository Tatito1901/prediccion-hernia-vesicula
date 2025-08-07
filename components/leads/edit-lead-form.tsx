'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatPhoneNumber } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/unified-skeletons';

import { useUpdateLead } from '@/hooks/use-leads';
import type { Lead, Channel, Motive, LeadStatus } from '@/lib/types';

// Validation schema
const editLeadFormSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone_number: z.string().min(10, 'Debe ser un número de teléfono válido'),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
  channel: z.string().min(1, 'Selecciona un canal'),
  motive: z.string().min(1, 'Selecciona un motivo'),
  status: z.string().min(1, 'Selecciona un estado'),
  notes: z.string().optional(),
  follow_up_notes: z.string().optional(),
  lead_intent: z.enum(['ONLY_WANTS_INFORMATION', 'WANTS_TO_SCHEDULE_APPOINTMENT', 'WANTS_TO_COMPARE_PRICES', 'OTHER']).optional(),
  next_follow_up_date: z.date().optional(),
});

type EditLeadFormData = z.infer<typeof editLeadFormSchema>;

interface EditLeadFormProps {
  lead: Lead;
  onSuccess: () => void;
  statusOptions: { value: LeadStatus; label: string; color: string }[];
  channelOptions: { value: Channel; label: string }[];
  motiveOptions: { value: Motive; label: string }[];
}

export function EditLeadForm({ 
  lead, 
  onSuccess, 
  statusOptions, 
  channelOptions, 
  motiveOptions 
}: EditLeadFormProps) {
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    lead.next_follow_up_date ? new Date(lead.next_follow_up_date) : undefined
  );
  
  const { mutate: updateLead, isPending } = useUpdateLead();

  const form = useForm<EditLeadFormData>({
    resolver: zodResolver(editLeadFormSchema),
    defaultValues: {
      full_name: lead.full_name,
      phone_number: lead.phone_number,
      email: lead.email || '',
      channel: lead.channel,
      motive: lead.motive,
      status: lead.status,
      notes: lead.notes || '',
      follow_up_notes: lead.follow_up_notes || '',
      lead_intent: lead.lead_intent as 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER' | undefined,
    },
  });

  const onSubmit = (data: EditLeadFormData) => {
    const submitData = {
      ...data,
      email: data.email || undefined,
      notes: data.notes || undefined,
      follow_up_notes: data.follow_up_notes || undefined,
      next_follow_up_date: followUpDate ? followUpDate.toISOString() : undefined,
      channel: data.channel as Channel,
      motive: data.motive as Motive,
      status: data.status as LeadStatus,
      last_contact_date: new Date().toISOString(), // Update contact date when editing
    };

    updateLead({
      id: lead.id,
      data: submitData
    }, {
      onSuccess: () => {
        onSuccess();
      },
    });
  };

  // ✅ ELIMINADO: formatPhoneNumber redundante - consolidado en lib/utils.ts

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

            {/* Status */}
            <div>
              <Label htmlFor="status">Estado *</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value)}
              >
                <SelectTrigger className={form.formState.errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${option.color}`} />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.status.message}
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
                onValueChange={(value) => form.setValue('lead_intent', value as 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER' | undefined)}
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
              <Label>Próximo Seguimiento</Label>
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
              {followUpDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFollowUpDate(undefined)}
                  className="mt-1 text-sm"
                >
                  Limpiar fecha
                </Button>
              )}
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes">Notas Generales</Label>
              <Textarea
                id="notes"
                placeholder="Información general sobre el lead..."
                {...form.register('notes')}
                rows={2}
              />
            </div>

            {/* Follow Up Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="follow_up_notes">Notas de Seguimiento</Label>
              <Textarea
                id="follow_up_notes"
                placeholder="Registra aquí las acciones de seguimiento realizadas..."
                {...form.register('follow_up_notes')}
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <Label className="text-xs font-medium">Creado</Label>
              <p>{lead.created_at ? format(new Date(lead.created_at), 'PPP', { locale: es }) : 'N/A'}</p>
            </div>
            <div>
              <Label className="text-xs font-medium">Última Actualización</Label>
              <p>{lead.updated_at ? format(new Date(lead.updated_at), 'PPP', { locale: es }) : 'N/A'}</p>
            </div>
            {lead.last_contact_date && (
              <div>
                <Label className="text-xs font-medium">Último Contacto</Label>
                <p>{format(new Date(lead.last_contact_date), 'PPP', { locale: es })}</p>
              </div>
            )}
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
            'Actualizar Lead'
          )}
        </Button>
      </div>
    </form>
  );
}
