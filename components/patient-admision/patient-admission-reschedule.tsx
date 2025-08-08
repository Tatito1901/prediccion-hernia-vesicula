// components/patient-admision/patient-admission-reschedule.tsx
import React, { memo, useCallback, useMemo, useState } from "react";
import { format, addDays, isWeekend, isBefore, startOfDay } from 'date-fns';
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

// ✅ IMPORTS CORREGIDOS - usando tipos unificados
import type { 
  AppointmentWithPatient, 
  RescheduleProps
} from './admision-types';
import { getPatientFullName } from './admision-types';

// ✅ Hook corregido para datos de clínica
import { useClinic } from "@/contexts/clinic-data-provider";

// ==================== CONFIGURACIÓN ====================
const CLINIC_CONFIG = {
  SLOT_CONFIG: {
    DURATION_MINUTES: 30,
    START_HOUR: 8, // 8:00 AM
    END_HOUR: 15,  // 3:00 PM (última cita a las 15:30)
    LUNCH_START: 12, // 12:00 PM
    LUNCH_END: 13,   // 1:00 PM
    MAX_ADVANCE_DAYS: 60, // Máximo 60 días en el futuro
    MIN_ADVANCE_HOURS: 2,  // Mínimo 2 horas de anticipación
  }
};

// ==================== UTILIDADES ====================
const formatAppointmentDate = (date: Date): string => {
  return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
};

const formatAppointmentTime = (time: string): string => {
  return time;
};

const isValidAppointmentDate = (date: Date): boolean => {
  const today = startOfDay(new Date());
  const maxDate = addDays(today, CLINIC_CONFIG.SLOT_CONFIG.MAX_ADVANCE_DAYS);
  return !isBefore(date, today) && !isBefore(maxDate, date) && !isWeekend(date);
};

const canRescheduleAppointment = (fechaHoraCita: string): boolean => {
  const appointmentTime = new Date(fechaHoraCita);
  const now = new Date();
  const minRescheduleTime = new Date(appointmentTime.getTime() - (CLINIC_CONFIG.SLOT_CONFIG.MIN_ADVANCE_HOURS * 60 * 60 * 1000));
  
  return now < minRescheduleTime;
};

const getAvailableTimeSlots = (date: Date, existingAppointments: AppointmentWithPatient[]): string[] => {
  const slots: string[] = [];
  const { START_HOUR, END_HOUR, LUNCH_START, LUNCH_END, DURATION_MINUTES } = CLINIC_CONFIG.SLOT_CONFIG;
  
  // Generar todos los slots posibles
  for (let hour = START_HOUR; hour < END_HOUR; hour++) {
    for (let minute = 0; minute < 60; minute += DURATION_MINUTES) {
      // Saltar hora de almuerzo
      if (hour >= LUNCH_START && hour < LUNCH_END) continue;
      
      const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeSlot);
    }
  }
  
  // Filtrar slots ocupados
  const occupiedSlots = new Set(
    existingAppointments
      .filter(apt => {
        const aptDate = new Date(apt.fecha_hora_cita);
        return format(aptDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      })
      .map(apt => format(new Date(apt.fecha_hora_cita), 'HH:mm'))
  );
  
  return slots.filter(slot => !occupiedSlots.has(slot));
};

// ==================== COMPONENTES INTERNOS ====================

// ✅ Importamos LoadingSpinner unificado desde unified-skeletons
import { LoadingSpinner } from '@/components/ui/unified-skeletons';

// ✅ Slot de tiempo optimizado
const TimeSlot = memo<{ 
  time: string; 
  isAvailable: boolean;
  isSelected: boolean;
}>(({ time, isAvailable, isSelected }) => (
  <SelectItem 
    value={time} 
    className={cn(
      "text-sm cursor-pointer transition-colors py-2.5 px-4",
      isAvailable 
        ? "text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800" 
        : "text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed",
      isSelected && "bg-blue-50 dark:bg-blue-900/20"
    )}
    disabled={!isAvailable}
  >
    <div className="flex items-center justify-between w-full">
      <span className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
        {time}
      </span>
      <span className="ml-2 flex-shrink-0">
        {isAvailable ? (
          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <AlertCircle className="h-3.5 w-3.5 text-red-500" />
        )}
      </span>
    </div>
  </SelectItem>
));
TimeSlot.displayName = 'TimeSlot';

// ✅ Estado sin slots disponibles
const NoSlotsAvailable = memo(() => (
  <div className="p-6 text-center">
    <div className="mb-4">
      <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
    </div>
    <div className="space-y-2">
      <h4 className="font-medium text-slate-900 dark:text-slate-100">
        No hay horarios disponibles
      </h4>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Todos los horarios para esta fecha están ocupados.
      </p>
      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
        Intente seleccionar otra fecha o contacte al personal médico.
      </p>
    </div>
  </div>
));
NoSlotsAvailable.displayName = "NoSlotsAvailable";

// ==================== COMPONENTE PRINCIPAL ====================
export const RescheduleDatePicker = memo<RescheduleProps>(({ 
  appointment, 
  onClose,
  onReschedule
}) => {
  // ✅ ESTADOS LOCALES
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // ✅ HOOK CORREGIDO para datos de clínica
  const { allAppointments, isLoading: isLoadingAppointments } = useClinic();
  
  // ✅ VERIFICAR SI LA CITA PUEDE SER REAGENDADA
  const canReschedule = useMemo(() => {
    return canRescheduleAppointment(appointment.fecha_hora_cita);
  }, [appointment.fecha_hora_cita]);

  // ✅ CALCULAR SLOTS DISPONIBLES
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return [];
    
    const appointments = allAppointments || [];
    // Excluir la cita actual de la verificación de disponibilidad
    const otherAppointments = appointments.filter(apt => apt.id !== appointment.id);
    
    return getAvailableTimeSlots(selectedDate, otherAppointments as any);
  }, [selectedDate, allAppointments, appointment.id]);

  // ✅ HANDLERS OPTIMIZADOS
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  const handleConfirm = useCallback(() => {
    if (selectedDate && selectedTime) {
      setIsProcessing(true);
      // Pequeño delay para feedback visual
      setTimeout(() => {
        onReschedule(selectedDate, selectedTime);
        handleClose();
      }, 300);
    }
  }, [selectedDate, selectedTime, onReschedule, handleClose]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    setSelectedDate(date || null);
    setSelectedTime(null); // Reset time when date changes
    setShowDatePicker(false);
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  // ✅ ESTADOS COMPUTADOS MEMOIZADOS
  const dateButtonText = useMemo(() => {
    return selectedDate 
      ? formatAppointmentDate(selectedDate)
      : "Seleccionar fecha";
  }, [selectedDate]);

  const timePlaceholder = useMemo(() => {
    if (!selectedDate) return "Seleccione fecha primero";
    if (isLoadingAppointments) return "Verificando disponibilidad...";
    if (availableTimeSlots.length === 0) return "No hay horarios disponibles";
    return "Seleccionar hora";
  }, [selectedDate, isLoadingAppointments, availableTimeSlots.length]);

  const showConfirmation = !!(selectedDate && selectedTime);
  const availableSlotsCount = availableTimeSlots.length;
  const patientName = getPatientFullName(appointment.patients);

  // ✅ LÍMITES DE FECHAS
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + CLINIC_CONFIG.SLOT_CONFIG.MAX_ADVANCE_DAYS);
    return max;
  }, []);

  // ✅ VALIDACIÓN: Si no se puede reagendar
  if (!canReschedule) {
    return (
      <Dialog open onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              No se puede reagendar
            </DialogTitle>
            <DialogDescription>
              Esta cita no puede ser reagendada porque faltan menos de {CLINIC_CONFIG.SLOT_CONFIG.MIN_ADVANCE_HOURS} horas para la fecha programada.
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
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Reagendar Cita</span>
          </DialogTitle>
          <DialogDescription>
            Seleccione una nueva fecha y hora para la consulta de{' '}
            <strong>{patientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* ✅ INFORMACIÓN DE LA CITA ACTUAL */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Cita actual:</strong> {formatAppointmentDate(new Date(appointment.fecha_hora_cita))} 
              a las {format(new Date(appointment.fecha_hora_cita), 'HH:mm')}
            </AlertDescription>
          </Alert>

          {/* ✅ SELECTOR DE FECHA */}
          <div className="grid gap-2">
            <Label htmlFor="date-picker">Nueva Fecha</Label>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  id="date-picker"
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

          {/* ✅ SELECTOR DE HORA */}
          <div className="grid gap-2">
            <Label htmlFor="time-picker">Nueva Hora</Label>
            {isLoadingAppointments ? (
              <LoadingSpinner size="sm" message="Verificando disponibilidad..." />
            ) : (
              <Select onValueChange={handleTimeChange} disabled={!selectedDate}>
                <SelectTrigger id="time-picker">
                  <SelectValue placeholder={timePlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {availableTimeSlots.length === 0 ? (
                      selectedDate && <NoSlotsAvailable />
                    ) : (
                      availableTimeSlots.map((time) => (
                        <TimeSlot
                          key={time}
                          time={time}
                          isAvailable={true}
                          isSelected={selectedTime === time}
                        />
                      ))
                    )}
                  </ScrollArea>
                </SelectContent>
              </Select>
            )}
            
            {/* Información de disponibilidad */}
            {selectedDate && (
              <p className="text-xs text-muted-foreground">
                {availableSlotsCount > 0 
                  ? `${availableSlotsCount} horarios disponibles para esta fecha`
                  : "No hay horarios disponibles para esta fecha"
                }
              </p>
            )}
          </div>

          {/* ✅ CONFIRMACIÓN DE NUEVA CITA */}
          {showConfirmation && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Nueva cita:</strong> {formatAppointmentDate(selectedDate)} 
                a las {formatAppointmentTime(selectedTime)}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
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
                Reagendando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Confirmar Reagendamiento
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