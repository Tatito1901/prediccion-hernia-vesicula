
import { useEffect, useMemo, useState } from 'react';
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
  channel: z.enum(['PHONE_CALL', 'WHATSAPP', 'WALK_IN', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA'], {
    required_error: 'Selecciona el método de contacto'
  }),
  call_reason: z.enum(['ONLY_WANTS_INFORMATION', 'WANTS_TO_SCHEDULE_APPOINTMENT', 'WANTS_TO_COMPARE_PRICES', 'OTHER'], {
    required_error: 'Selecciona el motivo de la llamada'
  }),
  problem_type: z.enum(['VESICULA', 'HERNIA', 'HERNIA_HIATAL', 'APENDICE', 'OTRO_PROBLEMA'], {
    required_error: 'Por favor seleccione el tipo de problema'
  }),
  problem_specification: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Si problem_type es 'OTRO_PROBLEMA', exigir especificación breve
  if (data.problem_type === 'OTRO_PROBLEMA' && !(data.problem_specification && data.problem_specification.trim().length >= 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Por favor especifique el problema cuando seleccione "Otro motivo"',
      path: ['problem_specification'],
    });
  }
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

  // ---------- Inferencia y normalización de motivos ----------
  type ProblemType = 'VESICULA' | 'HERNIA' | 'HERNIA_HIATAL' | 'APENDICE' | 'OTRO_PROBLEMA';
  type CallReason = 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER';

  const inferFromCallReason = (_cr?: CallReason): ProblemType | undefined => {
    // No inferimos tipo médico desde el motivo de la llamada; lo elegirá el usuario
    return undefined;
  };

  const inferFromText = (text?: string): ProblemType | undefined => {
    if (!text) return undefined;
    const t = text.toLowerCase();
    // Específicos
    if (/(apendicitis|ap[ée]ndice)/i.test(t)) return 'APENDICE';
    if (/(hernia\s+hiatal)/i.test(t)) return 'HERNIA_HIATAL';
    if (/(ves[íi]cula|colecistitis|colelitiasis|c[áa]lculos|col[ée]doco)/i.test(t)) return 'VESICULA';
    if (/(hernia)/i.test(t)) return 'HERNIA';
    return undefined;
  };

  const allTextForInference = useMemo(() => {
    const spec = form.watch('problem_specification') || '';
    const notes = form.watch('notes') || '';
    return `${spec}\n${notes}`.trim();
  }, [form.watch('problem_specification'), form.watch('notes')]);

  const suggestedFromCall = useMemo(() => inferFromCallReason(form.watch('call_reason') as CallReason), [form.watch('call_reason')]);
  const suggestedFromText = useMemo(() => inferFromText(allTextForInference), [allTextForInference]);

  useEffect(() => {
    const current = form.getValues('problem_type');
    const next = suggestedFromText;
    if (!current && next) {
      form.setValue('problem_type', next, { shouldValidate: true, shouldDirty: true });
    }
    // Si el usuario eligió OTRO_PROBLEMA y hay sugerencia clara, proponemos actualizar
    if (current === 'OTRO_PROBLEMA' && next) {
      form.setValue('problem_type', next, { shouldValidate: true });
    }
  }, [suggestedFromText]);

  const onSubmit = (data: LeadFormData) => {
    // Mapear problem_type a motive según los enums existentes
    const motiveMapping: Record<ProblemType, Motive> = {
      HERNIA: 'AGENDAR_CITA',
      HERNIA_HIATAL: 'AGENDAR_CITA',
      VESICULA: 'AGENDAR_CITA',
      APENDICE: 'URGENCIA_MEDICA',
      OTRO_PROBLEMA: 'OTRO',
    };
    
    const submitData = {
      full_name: `${data.first_name} ${data.last_name}`,
      phone_number: data.phone_number,
      channel: data.channel as Channel,
      motive: motiveMapping[data.problem_type as ProblemType],
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
      <DialogContent className="w-[95vw] sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20">
          <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-medium">Datos de contacto</h3>
            </div>
            {/* Nombre */}
            <div>
              <Label htmlFor="first_name">Nombre *</Label>
              <Input
                id="first_name"
                placeholder="Ej: Juan"
                autoComplete="given-name"
                autoFocus
                aria-invalid={!!form.formState.errors.first_name}
                aria-describedby={form.formState.errors.first_name ? 'first_name-error' : undefined}
                className={cn(form.formState.errors.first_name ? 'border-red-500' : '', 'min-w-0')}
                {...form.register('first_name')}
              />
              {form.formState.errors.first_name && (
                <p id="first_name-error" className="text-sm text-red-500 mt-1">
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
                autoComplete="family-name"
                aria-invalid={!!form.formState.errors.last_name}
                aria-describedby={form.formState.errors.last_name ? 'last_name-error' : undefined}
                className={cn(form.formState.errors.last_name ? 'border-red-500' : '', 'min-w-0')}
                {...form.register('last_name')}
              />
              {form.formState.errors.last_name && (
                <p id="last_name-error" className="text-sm text-red-500 mt-1">
                  {form.formState.errors.last_name.message}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <Label htmlFor="phone_number">Teléfono *</Label>
              <Input
                id="phone_number"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="555-123-4567"
                {...form.register('phone_number')}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  form.setValue('phone_number', formatted);
                }}
                aria-invalid={!!form.formState.errors.phone_number}
                aria-describedby={form.formState.errors.phone_number ? 'phone_number-error' : undefined}
                className={cn(form.formState.errors.phone_number ? 'border-red-500' : '', 'min-w-0')}
              />
              {form.formState.errors.phone_number && (
                <p id="phone_number-error" className="text-sm text-red-500 mt-1">
                  {form.formState.errors.phone_number.message}
                </p>
              )}
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-1">
              <h3 className="text-sm font-medium">Motivo y problema</h3>
            </div>

            {/* Método de Contacto */}
            <div>
              <Label htmlFor="channel">Método de Contacto *</Label>
              <Select
                value={form.watch('channel') || ''}
                onValueChange={(value) => form.setValue('channel', value as 'WHATSAPP' | 'PHONE_CALL' | 'WALK_IN' | 'REFERRAL' | 'WEBSITE' | 'SOCIAL_MEDIA')}
              >
                <SelectTrigger
                  aria-invalid={!!form.formState.errors.channel}
                  aria-describedby={form.formState.errors.channel ? 'channel-error' : undefined}
                  className={form.formState.errors.channel ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="¿Cómo se comunicó?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHONE_CALL">Llamada telefónica</SelectItem>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="WALK_IN">Visita directa</SelectItem>
                  <SelectItem value="REFERRAL">Referencia</SelectItem>
                  <SelectItem value="WEBSITE">Página web</SelectItem>
                  <SelectItem value="SOCIAL_MEDIA">Redes sociales</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.channel && (
                <p id="channel-error" className="text-sm text-red-500 mt-1">
                  {form.formState.errors.channel.message}
                </p>
              )}
            </div>

            {/* Motivo de la Llamada */}
            <div>
              <Label htmlFor="call_reason">Motivo de la Llamada *</Label>
              <Select
                value={form.watch('call_reason') || ''}
                onValueChange={(value) => form.setValue('call_reason', value as 'ONLY_WANTS_INFORMATION' | 'WANTS_TO_SCHEDULE_APPOINTMENT' | 'WANTS_TO_COMPARE_PRICES' | 'OTHER')}
              >
                <SelectTrigger
                  aria-invalid={!!form.formState.errors.call_reason}
                  aria-describedby={form.formState.errors.call_reason ? 'call_reason-error' : undefined}
                  className={form.formState.errors.call_reason ? 'border-red-500' : ''}
                >
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
                <p id="call_reason-error" className="text-sm text-red-500 mt-1">
                  {form.formState.errors.call_reason.message}
                </p>
              )}
            </div>

            {/* Tipo de Problema */}
            <div>
              <Label htmlFor="problem_type">Tipo de Problema *</Label>
              <Select
                value={form.watch('problem_type') || ''}
                onValueChange={(value) => form.setValue('problem_type', value as 'VESICULA' | 'HERNIA' | 'HERNIA_HIATAL' | 'APENDICE' | 'OTRO_PROBLEMA')}
              >
                <SelectTrigger
                  aria-invalid={!!form.formState.errors.problem_type}
                  aria-describedby={form.formState.errors.problem_type ? 'problem_type-error' : undefined}
                  className={form.formState.errors.problem_type ? 'border-red-500' : ''}
                >
                  <SelectValue placeholder="¿Qué problema tiene?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VESICULA">Problema de vesícula</SelectItem>
                  <SelectItem value="HERNIA">Problema de hernia</SelectItem>
                  <SelectItem value="HERNIA_HIATAL">Hernia hiatal</SelectItem>
                  <SelectItem value="APENDICE">Apendicitis</SelectItem>
                  <SelectItem value="OTRO_PROBLEMA">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
              {/* Sugerencia contextual */}
              {(!form.watch('problem_type') || form.watch('problem_type') === 'OTRO_PROBLEMA') && suggestedFromText && (
                <p className="text-xs text-muted-foreground mt-1">Sugerido: {suggestedFromText}</p>
              )}
              {form.formState.errors.problem_type && (
                <p id="problem_type-error" className="text-sm text-red-500 mt-1">
                  {form.formState.errors.problem_type.message}
                </p>
              )}
            </div>

            {/* Especificación del Problema (condicional) */}
            {form.watch('problem_type') === 'OTRO_PROBLEMA' && (
              <div className="sm:col-span-2 lg:col-span-3">
                <Label htmlFor="problem_specification">Especificar otro motivo</Label>
                <Input
                  id="problem_specification"
                  placeholder="Describa brevemente el problema"
                  {...form.register('problem_specification')}
                  aria-invalid={!!form.formState.errors.problem_specification}
                  aria-describedby={form.formState.errors.problem_specification ? 'problem_specification-error' : undefined}
                  className={cn(form.formState.errors.problem_specification ? 'border-red-500' : '', 'min-w-0')}
                />
                {form.formState.errors.problem_specification && (
                  <p id="problem_specification-error" className="text-sm text-red-500 mt-1">
                    {form.formState.errors.problem_specification.message}
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
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
