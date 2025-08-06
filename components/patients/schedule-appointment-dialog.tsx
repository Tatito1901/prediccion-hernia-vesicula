// components/patient-admision/schedule-appointment-dialog.tsx

import { useState, memo, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, isBefore, startOfDay, isWeekend, setHours, setMinutes } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { EnrichedPatient } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ✅ HORARIOS ESTÁTICOS - Solo de 9 AM a 3 PM (15:00) de lunes a sábado
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00"
] as const;

// ✅ CACHE PARA FORMATEO DE FECHAS - Mejora de rendimiento
const dateDisplayCache = new Map<string, string>();

// ✅ FUNCIÓN DE FORMATEO CON CACHE - Consistente con otros componentes
const formatDisplayDate = (date: Date | null): string => {
  if (!date) return "Fecha inválida";
  
  const key = date.toISOString();
  const cached = dateDisplayCache.get(key);
  if (cached) return cached;
  
  try {
    const formatted = format(date, "EEEE, d 'de' MMMM", { locale: es });
    dateDisplayCache.set(key, formatted);
    return formatted;
  } catch {
    return "Error de formato";
  }
};

// ✅ TIPOS CORREGIDOS Y UNIFICADOS
interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  patient: EnrichedPatient | null;
  onClose: () => void;
}

interface FormState {
  fechaConsulta: Date;
  horaConsulta: typeof TIME_SLOTS[number]; // ✅ Tipo específico para horas válidas
  motivoConsulta: string;
  notas: string;
}

// ✅ COMPONENTE PRINCIPAL MEMOIZADO
const ScheduleAppointmentDialog = memo(function ScheduleAppointmentDialog({ 
  isOpen, 
  patient, 
  onClose 
}: ScheduleAppointmentDialogProps) {
  const { mutateAsync: addAppointment, isPending } = useCreateAppointment();
  
  // ✅ ESTADO DEL FORMULARIO CON VALORES INICIALES SEGURAS
  const [formData, setFormData] = useState<FormState>({
    fechaConsulta: new Date(),
    horaConsulta: "09:00",
    motivoConsulta: "",
    notas: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ✅ VALIDACIÓN DE FECHA Y HORA SEGÚN REGLAS DE NEGOCIO
  const validateDateTime = useCallback((date: Date, time: string): boolean => {
    // Verificar día de la semana (lunes a sábado)
    if (isWeekend(date)) {
      return false;
    }
    
    // Verificar rango horario (9 AM - 3 PM)
    const [hours, minutes] = time.split(':').map(Number);
    const appointmentTime = setMinutes(setHours(date, hours), minutes);
    
    const startTime = setHours(date, 9);
    const endTime = setHours(date, 15); // 3 PM
    
    return (
      appointmentTime >= startTime && 
      appointmentTime <= endTime
    );
  }, []);

  // ✅ VALIDACIÓN DE FORMULARIO MEMOIZADA
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fechaConsulta) {
      newErrors.fechaConsulta = "Selecciona una fecha";
    } else if (isBefore(formData.fechaConsulta, startOfDay(new Date()))) {
      newErrors.fechaConsulta = "No puedes agendar en fechas pasadas";
    } else if (isWeekend(formData.fechaConsulta)) {
      newErrors.fechaConsulta = "Solo se permiten citas de lunes a sábado";
    }
    
    if (!formData.horaConsulta) {
      newErrors.horaConsulta = "Selecciona una hora";
    } else if (!validateDateTime(formData.fechaConsulta, formData.horaConsulta)) {
      newErrors.horaConsulta = "Hora fuera del horario permitido (9 AM - 3 PM)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.fechaConsulta, formData.horaConsulta, validateDateTime]);

  // ✅ FUNCIÓN PARA ACTUALIZAR CAMPOS DEL FORMULARIO
  const updateFormData = useCallback((field: keyof FormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario cambie el valor
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // ✅ FUNCIÓN PARA ENVÍO DEL FORMULARIO
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patient || !validateForm()) return;

    const promise = addAppointment({
      patient_id: patient.id,
      fecha_hora_cita: `${format(formData.fechaConsulta, "yyyy-MM-dd")}T${formData.horaConsulta}:00`,
      estado_cita: "PROGRAMADA", 
      motivos_consulta: formData.motivoConsulta ? [formData.motivoConsulta] : [],
      notas_breves: formData.notas || "",
      doctor_id: "default-doctor", // TODO: obtener ID real
      es_primera_vez: false,
    });

    toast.promise(promise, {
      loading: "Agendando cita...",
      success: () => {
        onClose();
        // Reset form
        setFormData({
          fechaConsulta: new Date(),
          horaConsulta: "09:00",
          motivoConsulta: "",
          notas: "",
        });
        setErrors({});
        return "Cita agendada con éxito";
      },
      error: (err) => err.message || "Error al agendar la cita",
    });
  }, [patient, validateForm, addAppointment, formData, onClose]);
  
  // ✅ FUNCIÓN PARA DESHABILITAR FECHAS NO VÁLIDAS
  const disabledDates = useCallback((date: Date) => {
    // No permitir fechas pasadas
    if (isBefore(date, startOfDay(new Date()))) {
      return true;
    }
    // No permitir fines de semana
    if (isWeekend(date)) {
      return true;
    }
    return false;
  }, []);
  
  // ✅ TEXTO DEL BOTÓN DE FECHA MEMOIZADO
  const dateButtonText = useMemo(() => {
    return formatDisplayDate(formData.fechaConsulta);
  }, [formData.fechaConsulta]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Agendar cita para {patient?.nombre} {patient?.apellidos}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ✅ CAMPO DE FECHA */}
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal mt-1",
                    errors.fechaConsulta && "border-red-500"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateButtonText}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.fechaConsulta}
                  onSelect={(date) => date && updateFormData("fechaConsulta", date)}
                  locale={es}
                  disabled={disabledDates}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.fechaConsulta && (
              <p className="text-sm text-red-600 mt-1">{errors.fechaConsulta}</p>
            )}
          </div>

          {/* ✅ CAMPO DE HORA */}
          <div>
            <label className="text-sm font-medium">Hora</label>
            <Select
              value={formData.horaConsulta}
              onValueChange={(value) => updateFormData("horaConsulta", value as typeof TIME_SLOTS[number])}
            >
              <SelectTrigger className={cn(
                "mt-1 w-full",
                errors.horaConsulta && "border-red-500"
              )}>
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((time) => (
                  <SelectItem 
                    key={time} 
                    value={time} 
                    className="text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {time}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.horaConsulta && (
              <p className="text-sm text-red-600 mt-1">{errors.horaConsulta}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Horario disponible: Lunes a sábado, 9:00 AM - 3:00 PM
            </p>
          </div>

          {/* ✅ CAMPO DE MOTIVO */}
          <div>
            <label className="text-sm font-medium">Motivo de la consulta</label>
            <Input
              type="text"
              value={formData.motivoConsulta}
              onChange={(e) => updateFormData("motivoConsulta", e.target.value)}
              placeholder="Motivo de la consulta"
              className="mt-1"
            />
          </div>

          {/* ✅ CAMPO DE NOTAS */}
          <div>
            <label className="text-sm font-medium">Notas adicionales</label>
            <Textarea
              value={formData.notas}
              onChange={(e) => updateFormData("notas", e.target.value)}
              placeholder="Notas adicionales"
              className="mt-1"
              rows={3}
            />
          </div>

          {/* ✅ BOTONES DE ACCIÓN */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default ScheduleAppointmentDialog;