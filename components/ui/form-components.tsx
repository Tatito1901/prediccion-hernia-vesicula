// ✅ CONSOLIDACIÓN MASIVA: Componentes base para formularios
// Elimina redundancias entre NewPatientForm, NewLeadForm, PatientSurveyForm, etc.

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { cn } from '@/lib/utils';

// UI Components
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Phone, User, Mail, MapPin } from 'lucide-react';

// ==================== UTILIDADES COMPARTIDAS ====================

export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return value;
};

export const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

// ==================== CAMPOS BÁSICOS CONSOLIDADOS ====================

interface BaseFieldProps {
  form: UseFormReturn<any>;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const NameField: React.FC<BaseFieldProps> = ({ 
  form, name, label, placeholder, required = true, className 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="flex items-center gap-2">
          <User className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <FormControl>
          <Input
            placeholder={placeholder || `Ingrese ${label.toLowerCase()}`}
            {...field}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const PhoneField: React.FC<BaseFieldProps> = ({ 
  form, name, label, placeholder, required = true, className 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="flex items-center gap-2">
          <Phone className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <FormControl>
          <Input
            type="tel"
            placeholder={placeholder || "(000) 000-0000"}
            {...field}
            onChange={(e) => {
              const formatted = formatPhoneNumber(e.target.value);
              field.onChange(formatted);
            }}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const EmailField: React.FC<BaseFieldProps> = ({ 
  form, name, label, placeholder, required = false, className 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <FormControl>
          <Input
            type="email"
            placeholder={placeholder || "correo@ejemplo.com"}
            {...field}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const LocationField: React.FC<BaseFieldProps> = ({ 
  form, name, label, placeholder, required = false, className 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <FormControl>
          <Input
            placeholder={placeholder || `Ingrese ${label.toLowerCase()}`}
            {...field}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

interface TextAreaFieldProps extends BaseFieldProps {
  rows?: number;
}

export const TextAreaField: React.FC<TextAreaFieldProps> = ({ 
  form, name, label, placeholder, required = false, className, rows = 3 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <FormControl>
          <Textarea
            placeholder={placeholder || `Ingrese ${label.toLowerCase()}`}
            rows={rows}
            {...field}
            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

interface SelectFieldProps extends BaseFieldProps {
  options: { value: string; label: string }[];
}

export const SelectField: React.FC<SelectFieldProps> = ({ 
  form, name, label, placeholder, required = true, className, options 
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className={className}>
        <FormLabel>
          {label}
          {required && <span className="text-red-500">*</span>}
        </FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value}>
          <FormControl>
            <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-blue-500/20">
              <SelectValue placeholder={placeholder || `Seleccione ${label.toLowerCase()}`} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )}
  />
);

// ==================== SECCIONES DE FORMULARIO CONSOLIDADAS ====================

interface PersonalInfoSectionProps {
  form: UseFormReturn<any>;
  className?: string;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({ form, className }) => (
  <div className={cn("space-y-4", className)}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <NameField form={form} name="nombre" label="Nombre" />
      <NameField form={form} name="apellidos" label="Apellidos" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PhoneField form={form} name="telefono" label="Teléfono" />
      <EmailField form={form} name="email" label="Email" required={false} />
    </div>
  </div>
);

interface ContactInfoSectionProps {
  form: UseFormReturn<any>;
  className?: string;
}

export const ContactInfoSection: React.FC<ContactInfoSectionProps> = ({ form, className }) => (
  <div className={cn("space-y-4", className)}>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LocationField form={form} name="ciudad" label="Ciudad" />
      <LocationField form={form} name="estado" label="Estado" />
    </div>
  </div>
);

// ==================== ESQUEMAS ZOD CONSOLIDADOS ====================

import { z } from 'zod';

export const basePersonalInfoSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  apellidos: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  telefono: z.string().min(10, 'Debe ser un número de teléfono válido'),
  email: z.string().email('Debe ser un email válido').optional().or(z.literal('')),
});

export const baseContactInfoSchema = z.object({
  ciudad: z.string().optional(),
  estado: z.string().optional(),
});

export const baseNotesSchema = z.object({
  comentarios_registro: z.string().optional(),
  antecedentes_medicos: z.string().optional(),
});

// ==================== TIPOS BASE CONSOLIDADOS ====================

export type BasePersonalInfo = z.infer<typeof basePersonalInfoSchema>;
export type BaseContactInfo = z.infer<typeof baseContactInfoSchema>;
export type BaseNotes = z.infer<typeof baseNotesSchema>;
