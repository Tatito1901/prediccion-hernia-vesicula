import { useState, memo, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { Patient, AppointmentStatusEnum, EnrichedPatient } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Horarios estáticos - calculados una vez en build time en lugar de en runtime
const TIME_SLOTS = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30"
] as const;

// Cache para formateo de fechas - mejora de rendimiento
const dateDisplayCache = new Map<string, string>();

// Función de formateo con cache - consistente con patient-admission.reschedule.tsx
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

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  patient: EnrichedPatient | null;
  onClose: () => void;
}

interface FormState {
  fechaConsulta: Date;
  horaConsulta: string;
  motivoConsulta: string;
  notas: string;
}

// Componente memoizado para mejor rendimiento
const ScheduleAppointmentDialog = memo(function ScheduleAppointmentDialog({ 
  isOpen, 
  patient, 
  onClose 
}: ScheduleAppointmentDialogProps) {
  const { mutateAsync: addAppointment, isPending } = useCreateAppointment();
  
  // Estado del formulario
  const [formData, setFormData] = useState<FormState>({
    fechaConsulta: new Date(),
    horaConsulta: "09:00",
    motivoConsulta: "",
    notas: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validación de formulario memoizada
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fechaConsulta) {
      newErrors.fechaConsulta = "Selecciona una fecha";
    }
    
    if (!formData.horaConsulta) {
      newErrors.horaConsulta = "Selecciona una hora";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.fechaConsulta, formData.horaConsulta]);

  // Función para actualizar campos del formulario
  const updateFormData = useCallback((field: keyof FormState, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }, [errors]);

  // Función para envío del formulario
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patient || !validateForm()) return;

    const promise = addAppointment({
      patient_id: patient.id,
      fecha_hora_cita: `${format(formData.fechaConsulta, "yyyy-MM-dd")}T${formData.horaConsulta}:00`,
      estado_cita: AppointmentStatusEnum.PROGRAMADA,
      motivo_cita: formData.motivoConsulta || "",
      notas_cita_seguimiento: formData.notas || "",
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
  
  // Función para deshabilitar fechas pasadas
  const disabledDates = useCallback((date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  }, []);
  
  // Texto del botón de fecha memoizado
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
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left font-normal mt-1"
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
                />
              </PopoverContent>
            </Popover>
            {errors.fechaConsulta && (
              <p className="text-sm text-red-600 mt-1">{errors.fechaConsulta}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Hora</label>
            <Select
              value={formData.horaConsulta}
              onValueChange={(value) => updateFormData("horaConsulta", value)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Seleccionar hora" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((time) => (
                  <SelectItem key={time} value={time} className="text-sm">
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
          </div>

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

          <div>
            <label className="text-sm font-medium">Notas adicionales</label>
            <Textarea
              value={formData.notas}
              onChange={(e) => updateFormData("notas", e.target.value)}
              placeholder="Notas adicionales"
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
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