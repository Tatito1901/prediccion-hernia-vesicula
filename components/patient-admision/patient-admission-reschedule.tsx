// components/patient-admission/patient-admission-reschedule.tsx
import React, { memo, useCallback, useMemo, useState } from "react";
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  AlertTriangle,
  Info
} from "lucide-react";

// Types e imports
import type { AppointmentWithPatient, RescheduleProps } from './admision-types';
import { getPatientFullName } from './admision-types';
import { useClinic } from "@/contexts/clinic-data-provider";
import { LoadingSpinner } from '@/components/ui/unified-skeletons';

// Configuración centralizada
import { CLINIC_SCHEDULE } from '@/lib/clinic-schedule';
import { isWorkDay } from '@/lib/clinic-schedule';

// Utilidades
const formatAppointmentDate = (date: Date): string => {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
};

const isValidAppointmentDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
  return !isBefore(date, today) && !isBefore(maxDate, date) && isWorkDay(date);
};

const canRescheduleAppointment = (fechaHoraCita: string): boolean => {
  const appointmentTime = new Date(fechaHoraCita);
  const now = new Date();
  const minRescheduleTime = new Date(
    appointmentTime.getTime() - (CLINIC_SCHEDULE.RESCHEDULE_MIN_ADVANCE_HOURS * 60 * 60 * 1000)
  );
  return now < minRescheduleTime;
};

const getAvailableTimeSlots = (date: Date, existingAppointments: AppointmentWithPatient[]): string[] => {
  const slots: string[] = [];
  const { START_HOUR, END_HOUR, LUNCH_START, LUNCH_END, SLOT_DURATION_MINUTES } = {
    START_HOUR: CLINIC_SCHEDULE.START_HOUR,
    END_HOUR: CLINIC_SCHEDULE.END_HOUR,
    LUNCH_START: CLINIC_SCHEDULE.LUNCH_START,
    LUNCH_END: CLINIC_SCHEDULE.LUNCH_END,
    SLOT_DURATION_MINUTES: CLINIC_SCHEDULE.SLOT_DURATION_MINUTES,
  } as const;
  
  // Generar slots disponibles
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
      if (hour >= LUNCH_START && hour < LUNCH_END) continue;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  
  // Filtrar slots ocupados
  const ACTIVE_STATES = new Set(['PROGRAMADA', 'CONFIRMADA', 'PRESENTE']);
  const occupiedSlots = new Set(
    existingAppointments
      .filter(apt => ACTIVE_STATES.has((apt as any).estado_cita))
      .filter(apt => format(new Date(apt.fecha_hora_cita), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
      .map(apt => format(new Date(apt.fecha_hora_cita), 'HH:mm'))
  );
  
  return slots.filter(slot => !occupiedSlots.has(slot));
};

// Componente de slot de tiempo
const TimeSlot = memo<{ 
  time: string; 
  isSelected: boolean;
}>(({ time, isSelected }) => (
  <SelectItem 
    value={time} 
    className={cn(
      "text-sm cursor-pointer transition-colors py-2 px-3",
      isSelected && "bg-blue-50 dark:bg-blue-900/20"
    )}
  >
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4" />
      {time}
    </div>
  </SelectItem>
));
TimeSlot.displayName = 'TimeSlot';

// Componente principal
export const RescheduleDatePicker = memo<RescheduleProps>(({ 
  appointment, 
  onClose,
  onReschedule
}) => {
  // Estados
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Datos de clínica
  const { allAppointments, isLoading: isLoadingAppointments } = useClinic();
  
  // Validaciones
  const canReschedule = useMemo(() => 
    canRescheduleAppointment(appointment.fecha_hora_cita), 
    [appointment.fecha_hora_cita]
  );

  // Slots disponibles
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return [];
    
    const appointments = allAppointments || [];
    const otherAppointments = appointments.filter(apt => apt.id !== appointment.id);
    
    return getAvailableTimeSlots(selectedDate, otherAppointments as any);
  }, [selectedDate, allAppointments, appointment.id]);

  // Handlers
  const handleClose = useCallback(() => onClose(), [onClose]);
  
  const handleConfirm = useCallback(() => {
    if (selectedDate && selectedTime) {
      setIsProcessing(true);
      setTimeout(() => {
        onReschedule(selectedDate, selectedTime);
        handleClose();
      }, 300);
    }
  }, [selectedDate, selectedTime, onReschedule, handleClose]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
    setSelectedTime(null);
    setShowDatePicker(false);
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  // Datos computados
  const dateButtonText = useMemo(() => 
    selectedDate ? formatAppointmentDate(selectedDate) : "Seleccionar fecha",
    [selectedDate]
  );

  const timePlaceholder = useMemo(() => {
    if (!selectedDate) return "Seleccione fecha primero";
    if (isLoadingAppointments) return "Verificando disponibilidad...";
    if (availableTimeSlots.length === 0) return "No hay horarios disponibles";
    return "Seleccionar hora";
  }, [selectedDate, isLoadingAppointments, availableTimeSlots.length]);

  const showConfirmation = !!(selectedDate && selectedTime);
  const patientName = getPatientFullName(appointment.patients);

  // Límites de fechas
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + CLINIC_SCHEDULE.MAX_ADVANCE_DAYS);
    return max;
  }, []);

  // Validación de reagendamiento
  if (!canReschedule) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              No se puede reagendar
            </DialogTitle>
            <DialogDescription>
              Esta cita no puede ser reagendada porque faltan menos de {CLINIC_SCHEDULE.RESCHEDULE_MIN_ADVANCE_HOURS} horas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose} variant="outline">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Reagendar Cita
          </DialogTitle>
          <DialogDescription>
            Seleccione una nueva fecha y hora para <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          {/* Cita actual */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Actual:</strong> {format(new Date(appointment.fecha_hora_cita), "dd/MM/yyyy 'a las' HH:mm")}
            </AlertDescription>
          </Alert>

          {/* Selector de fecha */}
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateButtonText}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate || undefined}
                  onSelect={handleDateChange}
                  disabled={(date) => !isValidAppointmentDate(date)}
                  initialFocus
                  locale={es}
                  fromDate={today}
                  toDate={maxDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Selector de hora */}
          <div className="space-y-2">
            <Label>Hora</Label>
            {isLoadingAppointments ? (
              <LoadingSpinner size="sm" message="Verificando disponibilidad..." />
            ) : (
              <Select onValueChange={handleTimeChange} disabled={!selectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder={timePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-64">
                    {availableTimeSlots.length === 0 ? (
                      <div className="p-6 text-center">
                        <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No hay horarios disponibles para esta fecha
                        </p>
                      </div>
                    ) : (
                      availableTimeSlots.map((time) => (
                        <TimeSlot
                          key={time}
                          time={time}
                          isSelected={selectedTime === time}
                        />
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
            
            {selectedDate && availableTimeSlots.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {availableTimeSlots.length} horarios disponibles
              </p>
            )}
          </div>

          {/* Confirmación */}
          {showConfirmation && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Nueva cita:</strong> {formatAppointmentDate(selectedDate)} 
                {' '}a las {selectedTime}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!showConfirmation || isProcessing}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RescheduleDatePicker.displayName = "RescheduleDatePicker";
export default RescheduleDatePicker;