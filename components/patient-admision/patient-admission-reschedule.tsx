// patient-admission-reschedule.tsx - Componente de reagendamiento optimizado
import React, { memo, useCallback, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { es } from "date-fns/locale";

import { useClinic } from "@/contexts/clinic-data-provider";

// Importaciones unificadas
import { AppointmentWithPatient, RescheduleProps } from "./admision-types";

// Utilidades centralizadas
import {
  isValidAppointmentDate,
  getAvailableTimeSlots,
  formatAppointmentDate,
  formatAppointmentTime,
  canRescheduleAppointment,
  CLINIC_CONFIG,
} from "@/lib/appointment-utils";

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

const LoadingSpinner = memo(() => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="h-5 w-5 animate-spin text-blue-500" aria-hidden="true" />
    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
      Verificando disponibilidad...
    </span>
  </div>
));

LoadingSpinner.displayName = 'LoadingSpinner';

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
          <CheckCircle className="h-3 w-3 text-green-500" />
        ) : (
          <AlertCircle className="h-3 w-3 text-red-500" />
        )}
      </span>
    </div>
  </SelectItem>
));

TimeSlot.displayName = "TimeSlot";

const WorkingHoursInfo = memo(() => {
  const workDaysLabels = ['L','M','X','J','V','S','D'];
  const workDaysString = CLINIC_CONFIG.WORK_DAYS
    .map(d => workDaysLabels[d-1])
    .join(', ');

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
        <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">
          Horarios de Atención
        </h4>
      </div>
      <p className="text-sm text-blue-700 dark:text-blue-300">
        <strong>{workDaysString}:</strong> {CLINIC_CONFIG.WORK_HOURS.START}:00 - {CLINIC_CONFIG.WORK_HOURS.LUNCH_START}:00 y {CLINIC_CONFIG.WORK_HOURS.LUNCH_END}:00 - {CLINIC_CONFIG.WORK_HOURS.END}:00
      </p>
      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
        Citas cada {CLINIC_CONFIG.APPOINTMENT_DURATION} minutos • No hay atención domingos
      </p>
    </div>
  );
});

WorkingHoursInfo.displayName = "WorkingHoursInfo";

const ConfirmationSummary = memo<{
  selectedDate: Date;
  selectedTime: string;
  appointment: AppointmentWithPatient;
}>(({ selectedDate, selectedTime, appointment }) => {
  const patientName = appointment.patients 
    ? `${appointment.patients.nombre} ${appointment.patients.apellidos}` 
    : appointment.paciente 
    ? `${appointment.paciente.nombre} ${appointment.paciente.apellidos}`
    : 'Paciente sin nombre';

  return (
    <div 
      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
        <h4 className="font-medium text-green-900 dark:text-green-100 text-sm">
          Confirmación de Nueva Cita
        </h4>
      </div>
      <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
        <p>
          <span className="font-medium">Paciente:</span> {patientName}
        </p>
        <p>
          <span className="font-medium">Nueva fecha:</span> {formatAppointmentDate(selectedDate)}
        </p>
        <p>
          <span className="font-medium">Nueva hora:</span> {selectedTime}
        </p>
        <p>
          <span className="font-medium">Fecha anterior:</span> {formatAppointmentDate(appointment.fecha_hora_cita)} a las {formatAppointmentTime(appointment.fecha_hora_cita)}
        </p>
      </div>
      <p className="text-xs text-green-700 dark:text-green-300 mt-2 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Duración estimada: {CLINIC_CONFIG.APPOINTMENT_DURATION} minutos
      </p>
    </div>
  );
});

ConfirmationSummary.displayName = "ConfirmationSummary";

const NoSlotsAvailable = memo<{ selectedDate: Date }>(({ selectedDate }) => (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
    <div className="flex items-start gap-2">
      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          No hay horarios disponibles para {formatAppointmentDate(selectedDate)}.
        </p>
        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
          Intente seleccionar otra fecha o contacte al personal médico.
        </p>
      </div>
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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { allAppointments, isLoading: isLoadingAppointments } = useClinic();
  
  // Verificar si la cita puede ser reagendada
  const canReschedule = useMemo(() => {
    return canRescheduleAppointment(appointment.fecha_hora_cita);
  }, [appointment.fecha_hora_cita]);

  // Calcular slots disponibles usando utilidades centralizadas
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return [];
    
    const appointments = allAppointments || [];
    // Excluir la cita actual de la verificación de disponibilidad
    const otherAppointments = appointments.filter(apt => apt.id !== appointment.id);
    
    return getAvailableTimeSlots(selectedDate, otherAppointments);
  }, [selectedDate, allAppointments, appointment.id]);

  // Handlers optimizados
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
  }, []);

  const handleTimeChange = useCallback((time: string) => {
    setSelectedTime(time);
  }, []);

  // Estados computados memoizados
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

  // Calcular límites de fechas
  const today = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    const max = new Date();
    max.setDate(max.getDate() + CLINIC_CONFIG.SLOT_CONFIG.MAX_ADVANCE_DAYS);
    return max;
  }, []);

  // Si no se puede reagendar, mostrar mensaje
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
              Esta cita no puede ser reagendada porque falta menos de {CLINIC_CONFIG.SLOT_CONFIG.MIN_ADVANCE_HOURS} horas para la fecha programada.
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
            Seleccione una nueva fecha y hora para la consulta.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-2">
          {/* Información de horarios */}
          <WorkingHoursInfo />

          {/* Selector de Fecha */}
          <div className="space-y-3">
            <Label htmlFor="newDate" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Nueva Fecha <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  id="newDate" 
                  variant="outline" 
                  className={cn(
                    "w-full justify-start text-left font-normal h-11 border-slate-300 dark:border-slate-600",
                    !selectedDate && "text-slate-500 dark:text-slate-400"
                  )}
                  aria-label="Seleccionar nueva fecha"
                  disabled={isProcessing}
                >
                  <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="truncate flex-1 text-left">{dateButtonText}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar 
                  mode="single" 
                  selected={selectedDate || undefined} 
                  onSelect={handleDateChange} 
                  initialFocus 
                  locale={es} 
                  disabled={(date) => !isValidAppointmentDate(date)}
                  aria-label="Calendario para seleccionar nueva fecha"
                  className="rounded-lg border border-slate-200 shadow-lg"
                  fromMonth={today}
                  toMonth={maxDate}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Fecha válida seleccionada</span>
              </p>
            )}
          </div>

          {/* Selector de Hora */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="newTime" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nueva Hora <span className="text-red-500">*</span>
              </Label>
              {selectedDate && !isLoadingAppointments && (
                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {availableSlotsCount} {availableSlotsCount === 1 ? 'horario' : 'horarios'} disponible{availableSlotsCount !== 1 && 's'}
                </span>
              )}
            </div>

            <Select 
              value={selectedTime || ""} 
              onValueChange={handleTimeChange}
              disabled={!selectedDate || isLoadingAppointments || availableSlotsCount === 0 || isProcessing}
            >
              <SelectTrigger 
                id="newTime" 
                className={cn(
                  "h-11 border-slate-300 dark:border-slate-600",
                  !selectedDate && "text-slate-500 dark:text-slate-400"
                )}
                aria-label="Seleccionar nueva hora"
              >
                <SelectValue placeholder={timePlaceholder} />
              </SelectTrigger>
              <SelectContent className="max-h-72 w-full">
                {isLoadingAppointments ? (
                  <LoadingSpinner />
                ) : availableTimeSlots.length > 0 ? (
                  <ScrollArea className="max-h-64">
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900 z-10">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        ✅ Disponible | ❌ Ocupado
                      </p>
                    </div>
                    {availableTimeSlots.map((slot) => (
                      <TimeSlot 
                        key={slot} 
                        time={slot}
                        isAvailable={true}
                        isSelected={slot === selectedTime}
                      />
                    ))}
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {selectedDate 
                      ? "No hay horarios disponibles para esta fecha" 
                      : "Seleccione una fecha válida"
                    }
                  </div>
                )}
              </SelectContent>
            </Select>
            
            {selectedDate && !isLoadingAppointments && availableSlotsCount === 0 && (
              <NoSlotsAvailable selectedDate={selectedDate} />
            )}
          </div>

          {/* Confirmación */}
          {showConfirmation && !isProcessing && (
            <ConfirmationSummary 
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              appointment={appointment}
            />
          )}
        </div>

        <DialogFooter className="flex flex-col gap-3">
          {showConfirmation && (
            <Button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white py-3 h-auto w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                "Confirmar Reagendar"
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="border-slate-300 dark:border-slate-600 w-full"
            disabled={isProcessing}
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

RescheduleDatePicker.displayName = "RescheduleDatePicker";

export default RescheduleDatePicker;