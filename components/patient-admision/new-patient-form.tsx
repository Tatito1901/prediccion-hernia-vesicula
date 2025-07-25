import React, { useState, useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { UserPlus, Loader2, Clock, Calendar, Phone, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/datepicker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { DiagnosisEnum } from "@/lib/types";
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  AdmissionFormSchema, 
  TAdmissionForm, 
  AdmissionPayload 
} from "./types";
import { useAdmitPatient } from "@/hooks/use-appointments";

// ==================== CONFIGURACIÓN DE HORARIOS ====================
const CLINIC_SCHEDULE = {
  WORK_DAYS: [1, 2, 3, 4, 5, 6], // Lunes a Sábado
  START_HOUR: 9,
  END_HOUR: 14, // 2 PM
  SLOT_DURATION: 30, // 30 minutos
  MAX_ADVANCE_DAYS: 60,
};

const DIAGNOSIS_GROUPS: Record<string, DiagnosisEnum[]> = {
  "🔸 Hernias": [
    DiagnosisEnum.EVENTRACION_ABDOMINAL,
    DiagnosisEnum.HERNIA_HIATAL,
    DiagnosisEnum.HERNIA_INGUINAL,
    DiagnosisEnum.HERNIA_INGUINAL_RECIDIVANTE,
    DiagnosisEnum.HERNIA_SPIGEL,
    DiagnosisEnum.HERNIA_UMBILICAL,
  ],
  "🟡 Vesícula y Vías Biliares": [
    DiagnosisEnum.COLANGITIS,
    DiagnosisEnum.COLECISTITIS,
    DiagnosisEnum.COLEDOCOLITIASIS,
    DiagnosisEnum.VESICULA_COLECISTITIS_CRONICA,
  ],
  "🔹 Otros Diagnósticos": [
    DiagnosisEnum.APENDICITIS,
    DiagnosisEnum.LIPOMA_GRANDE,
    DiagnosisEnum.QUISTE_SEBACEO_INFECTADO,
    DiagnosisEnum.OTRO,
  ],
};

// ==================== UTILIDADES ====================
const isValidAppointmentDate = (date: Date): boolean => {
  const day = date.getDay();
  return CLINIC_SCHEDULE.WORK_DAYS.includes(day);
};

const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = CLINIC_SCHEDULE.START_HOUR; hour < CLINIC_SCHEDULE.END_HOUR; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`);
    slots.push(`${hour.toString().padStart(2, '0')}:30`);
  }
  return slots;
};

const getAvailableSlots = (selectedDate: Date | undefined, existingAppointments: any[]): string[] => {
  if (!selectedDate || !isValidAppointmentDate(selectedDate)) return [];
  
  const allSlots = generateTimeSlots();
  const dateStr = selectedDate.toISOString().split('T')[0];
  
  const occupiedSlots = existingAppointments
    .filter(apt => apt.fecha_hora_cita.startsWith(dateStr))
    .map(apt => {
      const time = new Date(apt.fecha_hora_cita);
      return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
    });
  
  return allSlots.filter(slot => !occupiedSlots.includes(slot));
};

// ==================== VALORES POR DEFECTO ====================
const DEFAULT_VALUES: TAdmissionForm = {
  nombre: "",
  apellidos: "",
  telefono: "",
  email: "",
  notas: "",
  edad: null,
  motivoConsulta: "" as DiagnosisEnum,
  fechaConsulta: new Date(),
  horaConsulta: "",
  probabilidad_cirugia: null,
};

// ==================== COMPONENTE PRINCIPAL ====================
interface NewPatientFormProps {
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

const NewPatientForm: React.FC<NewPatientFormProps> = ({ onSuccess, triggerButton }) => {
  const [open, setOpen] = useState(false);
  const { allAppointments } = useClinic();
  const { mutateAsync: admitPatient, isPending: isSubmitting } = useAdmitPatient();
  
  const form = useForm<TAdmissionForm>({
    resolver: zodResolver(AdmissionFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });
  
  const selectedDate = form.watch("fechaConsulta");
  
  const availableTimeSlots = useMemo(() => {
    return getAvailableSlots(selectedDate, allAppointments || []);
  }, [selectedDate, allAppointments]);
  
  const handleDateChange = useCallback((date: Date | undefined) => {
    if (date) {
      form.setValue("fechaConsulta", date);
      form.setValue("horaConsulta", "");
    }
  }, [form]);
  
  const handleDialogChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      form.reset(DEFAULT_VALUES);
    }
  }, [form]);
  
  const handleSubmit = useCallback(async (values: TAdmissionForm) => {
    try {
      const appointmentDateTime = new Date(values.fechaConsulta);
      const [hours, minutes] = values.horaConsulta.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
      const payload: AdmissionPayload = {
        nombre: values.nombre.trim(),
        apellidos: values.apellidos.trim(),
        telefono: values.telefono.trim(),
        email: values.email?.trim() || undefined,
        edad: values.edad,
        diagnostico_principal: values.motivoConsulta,
        comentarios_registro: values.notas?.trim() || undefined,
        fecha_hora_cita: appointmentDateTime.toISOString(),
        motivo_cita: values.motivoConsulta,
        doctor_id: null,
        probabilidad_cirugia: values.probabilidad_cirugia,
        es_primera_vez: true,
      };

      await admitPatient(payload);
      
      setOpen(false);
      form.reset(DEFAULT_VALUES);
      onSuccess?.();
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  }, [admitPatient, form, onSuccess]);

  const canSubmit = form.formState.isValid && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
            <UserPlus className="mr-2 h-5 w-5" />
            Nuevo Paciente
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Registrar Nuevo Paciente
          </DialogTitle>
          <DialogDescription>
            Complete los datos para crear un nuevo paciente y agendar su consulta
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Información Personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Phone className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold">Información Personal</h3>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <FormField
                    control={form.control}
                    name="nombre"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan Carlos" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="apellidos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellidos *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: González López" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="edad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Edad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="45"
                              disabled={isSubmitting}
                              min="0"
                              max="120"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? null : parseInt(value, 10));
                              }}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="telefono"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="555 123 4567"
                              disabled={isSubmitting}
                              type="tel"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="correo@ejemplo.com"
                            disabled={isSubmitting}
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Información Médica */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Stethoscope className="h-4 w-4 text-red-600" />
                  <h3 className="font-semibold">Información Médica</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="motivoConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo de Consulta *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un motivo..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-72">
                          {Object.entries(DIAGNOSIS_GROUPS).map(([groupName, diagnoses]) => (
                            <SelectGroup key={groupName}>
                              <SelectLabel className="text-xs font-semibold text-slate-600 py-2">
                                {groupName}
                              </SelectLabel>
                              {diagnoses.map((diag) => (
                                <SelectItem key={diag} value={diag} className="text-sm py-2">
                                  {diag.split('_').map(word => 
                                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                                  ).join(' ')}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="probabilidad_cirugia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probabilidad de Cirugía (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="75"
                          disabled={isSubmitting}
                          min="0"
                          max="100"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseInt(value, 10));
                          }}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas Adicionales</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Información relevante, alergias, medicamentos..."
                          className="resize-none h-24"
                          disabled={isSubmitting}
                          maxLength={500}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex justify-end">
                        <span className="text-xs text-slate-500">
                          {field.value?.length || 0}/500
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Programar Cita */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold">Programar Cita</h3>
                </div>
                
                <FormField
                  control={form.control}
                  name="fechaConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha *</FormLabel>
                      <DatePicker
                        date={field.value}
                        onDateChange={handleDateChange}
                        minDate={new Date()}
                        maxDate={new Date(Date.now() + CLINIC_SCHEDULE.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000)}
                        placeholder="Seleccionar fecha"
                        filterDate={isValidAppointmentDate}
                        className="w-full"
                        disabled={isSubmitting}
                      />
                      <FormMessage />
                      <p className="text-xs text-slate-500">
                        Disponible: Lunes a Sábado, 9:00 AM - 2:00 PM
                      </p>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="horaConsulta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!selectedDate || !isValidAppointmentDate(selectedDate) || isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedDate 
                                ? "Seleccione fecha primero" 
                                : !isValidAppointmentDate(selectedDate)
                                  ? "Fecha no válida"
                                  : "Seleccione hora"
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-60">
                          {availableTimeSlots.length > 0 ? (
                            availableTimeSlots.map((slot) => (
                              <SelectItem key={slot} value={slot}>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{slot}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-slate-500">
                              {selectedDate && isValidAppointmentDate(selectedDate) 
                                ? "No hay horarios disponibles" 
                                : "Seleccione una fecha válida"
                              }
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {availableTimeSlots.length > 0 && (
                        <p className="text-xs text-green-600">
                          ✓ {availableTimeSlots.length} horarios disponibles
                        </p>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </form>
        </Form>

        <DialogFooter className="flex justify-between items-center">
          <div className="text-xs text-slate-500">
            Los campos marcados con * son obligatorios
          </div>
          <div className="flex gap-3">
            <DialogClose asChild>
              <Button variant="outline" disabled={isSubmitting}>
                Cancelar
              </Button>
            </DialogClose>
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={!canSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Registrar Paciente
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewPatientForm;