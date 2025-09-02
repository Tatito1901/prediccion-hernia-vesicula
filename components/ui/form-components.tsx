// components/ui/form-components.tsx
'use client';
import React from 'react';
import { type FieldValues, type FieldPath, type UseFormReturn } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatPhoneNumber } from '@/lib/utils';
import { DIAGNOSIS_DB_VALUES, dbDiagnosisToDisplay } from '@/lib/validation/enums';

// Generic text input field
export function TextField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  type?: React.ComponentProps<typeof Input>['type'];
  description?: string;
  className?: string;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  const { form, name, label, placeholder, type = 'text', description, className, inputProps } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...inputProps} {...field} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Number input with safe empty -> undefined mapping
export function NumberField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  min?: number;
  max?: number;
  description?: string;
}) {
  const { form, name, label, placeholder, min, max, description } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              placeholder={placeholder}
              value={field.value === null || field.value === undefined ? '' : String(field.value)}
              onChange={(e) => {
                const v = e.target.value;
                const parsed = v === '' ? undefined : Number(v);
                field.onChange(typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : undefined);
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function PhoneField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  const { form, name, label, placeholder = '555-123-4567', description, inputProps } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              {...inputProps}
              {...field}
              onChange={(e) => {
                // Call any external onChange first, then apply formatting to RHF field
                inputProps?.onChange?.(e as React.ChangeEvent<HTMLInputElement>);
                const target = e.target as HTMLInputElement;
                field.onChange(formatPhoneNumber(target.value));
              }}
            />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function EmailField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  const { form, name, label, placeholder = 'correo@ejemplo.com', description, inputProps } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type="email" placeholder={placeholder} {...inputProps} {...field} />
          </FormControl>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function GenderSelectField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label?: string;
  options?: Array<'Masculino' | 'Femenino' | 'Otro'>;
  placeholder?: string;
}) {
  const { form, name, label = 'Género', options = ['Masculino', 'Femenino', 'Otro'], placeholder = 'Seleccionar género' } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={(v) => field.onChange(v)} value={typeof field.value === 'string' ? field.value : undefined}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DiagnosisSelectField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
}) {
  const { form, name, label = 'Diagnóstico Principal', placeholder = 'Seleccionar diagnóstico', description } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={(v) => field.onChange(v)} value={typeof field.value === 'string' ? field.value : undefined}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {DIAGNOSIS_DB_VALUES.map((d) => (
                <SelectItem key={d} value={d}>
                  {dbDiagnosisToDisplay(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function DatePickerField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  isValidDate: (date: Date) => boolean;
  onDateChange?: (date: Date | undefined) => void;
  description?: string;
}) {
  const { form, name, label, isValidDate, onDateChange, description } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        const isDate = Object.prototype.toString.call(field.value) === '[object Date]';
        const selectedDate: Date | undefined = isDate ? (field.value as Date) : undefined;
        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start text-left font-normal', !selectedDate && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, 'PPP', { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    field.onChange(date);
                    onDateChange?.(date);
                  }}
                  disabled={(date) => !isValidDate(date)}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
            {description ? <FormDescription>{description}</FormDescription> : null}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function TimeSelectField<T extends FieldValues>(props: {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  timeSlots: Array<{ value: string; label: string }>;
  occupiedTimes?: Set<string>;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  showOccupiedBadge?: boolean;
}) {
  const { form, name, label, timeSlots, occupiedTimes, disabled, placeholder = 'Seleccionar hora', description, showOccupiedBadge = true } = props;
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <Select onValueChange={(v) => field.onChange(v)} value={typeof field.value === 'string' ? field.value : undefined} disabled={disabled}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {timeSlots.map((slot) => {
                const isOccupied = occupiedTimes?.has(slot.value) ?? false;
                return (
                  <SelectItem key={slot.value} value={slot.value} disabled={isOccupied}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{slot.label}</span>
                      {showOccupiedBadge && isOccupied && (
                        <Badge variant="secondary" className="ml-2 text-xs">Ocupado</Badge>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {description ? <FormDescription>{description}</FormDescription> : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

