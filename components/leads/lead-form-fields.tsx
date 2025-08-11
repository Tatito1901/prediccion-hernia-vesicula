"use client";

import type { UseFormReturn, FieldValues, Path } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { formatPhoneNumber } from "@/lib/utils";
import type { Channel, Motive } from "@/lib/types";

// Base shape expected by this reusable fields component
export type BaseLeadFields = {
  full_name: string;
  phone_number: string;
  channel: Channel | string;
  motive: Motive | string;
  notes?: string;
};

interface LeadFormFieldsProps<T extends FieldValues & BaseLeadFields> {
  form: UseFormReturn<T>;
  channelOptions: { value: Channel; label: string }[];
  motiveOptions: { value: Motive; label: string }[];
  showNotes?: boolean;
}

export function LeadFormFields<T extends FieldValues & BaseLeadFields>({
  form,
  channelOptions,
  motiveOptions,
  showNotes = true,
}: LeadFormFieldsProps<T>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
      <div className="col-span-1 sm:col-span-2 lg:col-span-3">
        <h3 className="text-sm font-medium">Datos de contacto</h3>
      </div>

      {/* Full name */}
      <div className="md:col-span-2">
        <Label htmlFor="full_name">Nombre Completo *</Label>
        <Input
          id="full_name"
          placeholder="Ej: Juan Pérez García"
          {...form.register("full_name" as Path<T>)}
          className={form.formState.errors.full_name ? "border-red-500" : ""}
        />
        {form.formState.errors.full_name && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors as any).full_name?.message as string}
          </p>
        )}
      </div>

      {/* Phone number */}
      <div>
        <Label htmlFor="phone_number">Teléfono *</Label>
        <Input
          id="phone_number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="555-123-4567"
          {...form.register("phone_number" as Path<T>)}
          onChange={(e) => {
            const formatted = formatPhoneNumber(e.target.value);
            form.setValue("phone_number" as Path<T>, formatted as any, { shouldValidate: true });
          }}
          className={form.formState.errors.phone_number ? "border-red-500" : ""}
        />
        {form.formState.errors.phone_number && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors as any).phone_number?.message as string}
          </p>
        )}
      </div>

      {/* Channel */}
      <div>
        <Label htmlFor="channel">Método de Contacto *</Label>
        <Select
          value={(form.watch("channel" as Path<T>) as any) || ""}
          onValueChange={(value) => form.setValue("channel" as Path<T>, value as any, { shouldValidate: true })}
        >
          <SelectTrigger className={form.formState.errors.channel ? "border-red-500" : ""}>
            <SelectValue placeholder="¿Cómo se comunicó?" />
          </SelectTrigger>
          <SelectContent>
            {channelOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.channel && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors as any).channel?.message as string}
          </p>
        )}
      </div>

      {/* Motive */}
      <div>
        <Label htmlFor="motive">Motivo *</Label>
        <Select
          value={(form.watch("motive" as Path<T>) as any) || ""}
          onValueChange={(value) => form.setValue("motive" as Path<T>, value as any, { shouldValidate: true })}
        >
          <SelectTrigger className={form.formState.errors.motive ? "border-red-500" : ""}>
            <SelectValue placeholder="Selecciona un motivo" />
          </SelectTrigger>
          <SelectContent>
            {motiveOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.motive && (
          <p className="text-sm text-red-500 mt-1">
            {(form.formState.errors as any).motive?.message as string}
          </p>
        )}
      </div>

      {/* Notes */}
      {showNotes && (
        <div className="sm:col-span-2 lg:col-span-3">
          <Label htmlFor="notes">Notas Adicionales</Label>
          <Textarea
            id="notes"
            placeholder="Información adicional sobre el lead..."
            {...form.register("notes" as Path<T>)}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
