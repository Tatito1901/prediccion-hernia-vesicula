"use client";

import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAppointmentStore, type AddAppointmentInput } from "@/lib/stores/appointment-store";
import type { PatientData } from "@/app/dashboard/data-model";
import { AppointmentStatusEnum } from "@/app/dashboard/data-model";
import { toast } from "sonner";

const FORM_SCHEMA = z.object({
  fechaConsulta: z.date({ required_error: "Selecciona una fecha" }),
  horaConsulta: z.string().min(5, "Selecciona hora"),
  motivoConsulta: z.string().optional(),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof FORM_SCHEMA>;

interface ScheduleAppointmentDialogProps {
  isOpen: boolean;
  patient: PatientData | null;
  onClose: () => void;
}

export function ScheduleAppointmentDialog({ isOpen, patient, onClose }: ScheduleAppointmentDialogProps) {
  const addAppointment = useAppointmentStore(state => state.addAppointment);
  const form = useForm<FormValues>({
    resolver: zodResolver(FORM_SCHEMA),
    defaultValues: {
      fechaConsulta: new Date(),
      horaConsulta: "08:00",
      motivoConsulta: "",
      notas: "",
    },
  });

  const handleSubmit = async (values: FormValues) => {
    if (!patient) return;
    const id = toast.loading("Agendando cita...");
    try {
      await addAppointment({
        patientId: patient.id,
        fecha_raw: format(values.fechaConsulta, "yyyy-MM-dd"),
        hora_raw: values.horaConsulta,
        estado: AppointmentStatusEnum.PROGRAMADA,
        motivoConsulta: values.motivoConsulta || "",
        notas: values.notas || "",
        raw_doctor_id: "default-doctor", // TODO: obtener ID real
      } as AddAppointmentInput);
      toast.success("Cita agendada", { id });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Error desconocido", { id });
    }
  };

  const hourOptions = useMemo(() => {
    const opts: string[] = [];
    for (let h = 7; h <= 20; h++) {
      ["00", "30"].forEach((m) => opts.push(`${String(h).padStart(2, "0")}:${m}`));
    }
    return opts;
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Agendar cita para {patient?.nombre} {patient?.apellidos}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Fecha</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(form.watch("fechaConsulta"), "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("fechaConsulta")}
                  onSelect={(d) => d && form.setValue("fechaConsulta", d)}
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium">Hora</label>
            <select
              {...form.register("horaConsulta")}
              className="mt-1 w-full border rounded px-2 py-1 text-sm"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Motivo</label>
            <Input {...form.register("motivoConsulta")} className="mt-1" />
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <Textarea rows={3} {...form.register("notas")} className="mt-1" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
