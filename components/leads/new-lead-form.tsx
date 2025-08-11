
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/unified-skeletons';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateLead } from '@/hooks/use-leads';
import { LeadFormFields } from '@/components/leads/lead-form-fields';
import type { Channel, Motive, LeadFormData } from '@/lib/types';
import { ZContactChannel, ZLeadMotive, CONTACT_CHANNEL_VALUES, LEAD_MOTIVE_VALUES } from '@/lib/validation/enums';

// Validation schema (aligned with backend LeadFormData)
const leadFormSchema = z.object({
  full_name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres'),
  phone_number: z.string().min(10, 'Debe ser un número de teléfono válido'),
  channel: ZContactChannel,
  motive: ZLeadMotive,
  notes: z.string().optional(),
});
type NewLeadFormValues = z.infer<typeof leadFormSchema>;

interface NewLeadFormProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function NewLeadForm({ trigger, onSuccess }: NewLeadFormProps) {
  const [open, setOpen] = useState(false);
  const { mutate: createLead, isPending } = useCreateLead();

  const form = useForm<NewLeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      notes: '',
    },
  });

  // Opciones centralizadas con labels legibles
  const CHANNEL_LABELS: Record<Channel, string> = {
    PHONE_CALL: 'Teléfono',
    WHATSAPP: 'WhatsApp',
    SOCIAL_MEDIA: 'Redes Sociales',
    REFERRAL: 'Referido',
    WEBSITE: 'Sitio Web',
    WALK_IN: 'Visita Directa',
  } as const;
  const MOTIVE_LABELS: Record<Motive, string> = {
    INFORMES: 'Informes',
    AGENDAR_CITA: 'Agendar Cita',
    URGENCIA_MEDICA: 'Urgencia Médica',
    SEGUIMIENTO: 'Seguimiento',
    CANCELACION: 'Cancelación',
    REAGENDAMIENTO: 'Reagendamiento',
    OTRO: 'Otro',
  } as const;
  const channelOptions = CONTACT_CHANNEL_VALUES.map((c) => ({
    value: c as Channel,
    label: CHANNEL_LABELS[(c as Channel)] ?? (c as string),
  }));
  const motiveOptions = LEAD_MOTIVE_VALUES.map((m) => ({
    value: m as Motive,
    label: MOTIVE_LABELS[(m as Motive)] ?? (m as string),
  }));

  const onSubmit = (data: NewLeadFormValues) => {
    const submitData: LeadFormData = {
      full_name: data.full_name.trim(),
      phone_number: data.phone_number,
      channel: data.channel as Channel,
      motive: data.motive as Motive,
      notes: data.notes?.trim() || undefined,
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
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <Card>
            <CardContent className="pt-6">
              <LeadFormFields
                form={form}
                channelOptions={channelOptions}
                motiveOptions={motiveOptions}
                showNotes
              />
            </CardContent>
          </Card>

      {/* Submit Button */}
      <div className="sticky bottom-0 left-0 right-0 flex justify-end gap-3 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-3 px-2">
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
