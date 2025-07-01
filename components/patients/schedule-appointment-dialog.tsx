import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { Patient, AppointmentStatusEnum } from "@/lib/types";
import { toast } from "sonner";

// Horarios estáticos - calculados una vez en build time en lugar de en runtime
const HOUR_OPTIONS = (() => {
  const options: string[] = [];
  for (let h = 7; h <= 20; h++) {
    ["00", "30"].forEach((m) => options.push(`${String(h).padStart(2, "0")}:${m}`));
  }
  return options;
})();

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
}

export function ScheduleAppointmentDialog({ isOpen, patient, onClose }: ScheduleAppointmentDialogProps) {
  const { mutateAsync: addAppointment, isPending } = useCreateAppointment();
  
  // Estado simplificado sin react-hook-form para reducir bundle size
  const [formData, setFormData] = useState({
    fechaConsulta: new Date(),
    horaConsulta: "08:00",
    motivoConsulta: "",
    notas: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validación simple sin zod
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fechaConsulta) {
      newErrors.fechaConsulta = "Selecciona una fecha";
    }
    
    if (!formData.horaConsulta) {
      newErrors.horaConsulta = "Selecciona una hora";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          horaConsulta: "08:00",
          motivoConsulta: "",
          notas: "",
        });
        setErrors({});
        return "Cita agendada con éxito";
      },
      error: (err) => err.message || "Error al agendar la cita",
    });
  };

  const updateFormData = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

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
                  {format(formData.fechaConsulta, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.fechaConsulta}
                  onSelect={(date) => date && updateFormData("fechaConsulta", date)}
                  locale={es}
                  disabled={(date) => date < new Date()} // No permitir fechas pasadas
                />
              </PopoverContent>
            </Popover>
            {errors.fechaConsulta && (
              <p className="text-sm text-red-600 mt-1">{errors.fechaConsulta}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Hora</label>
            <select
              value={formData.horaConsulta}
              onChange={(e) => updateFormData("horaConsulta", e.target.value)}
              className="mt-1 w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {HOUR_OPTIONS.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            {errors.horaConsulta && (
              <p className="text-sm text-red-600 mt-1">{errors.horaConsulta}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium">Motivo</label>
            <Input 
              value={formData.motivoConsulta}
              onChange={(e) => updateFormData("motivoConsulta", e.target.value)}
              className="mt-1" 
              placeholder="Motivo de la consulta (opcional)"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Textarea 
              rows={3} 
              value={formData.notas}
              onChange={(e) => updateFormData("notas", e.target.value)}
              className="mt-1" 
              placeholder="Notas adicionales (opcional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}