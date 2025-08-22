// components/patient-admission/patient-admission-reschedule.tsx
'use client';
import React, { memo, useCallback, useMemo, useState } from "react";
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar as CalendarDays,
  ArrowRight
} from "lucide-react";

import type { AppointmentWithPatient, RescheduleProps } from './admision-types';
import { getPatientFullName } from './admision-types';
import { useClinic } from "@/contexts/clinic-data-provider";
import { CLINIC_SCHEDULE, isWorkDay } from '@/lib/clinic-schedule';
import { AppointmentStatusEnum } from '@/lib/types';

// Utilidades
const formatAppointmentDate = (date: Date): string => {
  return format(date, "EEEE d 'de' MMMM", { locale: es });
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

// Componente de slot de tiempo mejorado
const TimeSlot = memo<{ 
  time: string; 
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}>(({ time, isSelected, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "relative w-full p-3 text-left rounded-lg transition-all",
      "hover:bg-sky-50 dark:hover:bg-sky-950/30",
      "focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-1",
      isSelected && "bg-sky-100 dark:bg-sky-900/50 border-sky-500 border",
      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
    )}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-500" />
        <span className={cn(
          "font-medium",
          isSelected && "text-sky-700 dark:text-sky-300"
        )}>
          {time}
        </span>
      </div>
      {isSelected && (
        <CheckCircle2 className="h-4 w-4 text-sky-600" />
      )}
    </div>
  </button>
));
TimeSlot.displayName = 'TimeSlot';

export const RescheduleDatePicker = memo<RescheduleProps>(({ 
  appointment, 
  onClose,
  onReschedule
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { allAppointments, isLoading } = useClinic();
  
  // Validación de reagendamiento
  const canReschedule = useMemo(() => 
    canRescheduleAppointment(appointment.fecha_hora_cita), 
    [appointment.fecha_hora_cita]
  );

  // Horarios disponibles
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !isValidAppointmentDate(selectedDate)) return [];
    
    const slots: string[] = [];
    const { START_HOUR, END_HOUR, LUNCH_START, LUNCH_END, SLOT_DURATION_MINUTES } = CLINIC_SCHEDULE;
    
    // Generar slots
    for (let hour = START_HOUR; hour < END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_DURATION_MINUTES) {
        if (hour >= LUNCH_START && hour < LUNCH_END) continue;
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      }
    }
    
    // Filtrar ocupados
    const occupiedSlots = new Set<string>();
    const activeStates = [
      AppointmentStatusEnum.PROGRAMADA,
      AppointmentStatusEnum.CONFIRMADA,
      AppointmentStatusEnum.PRESENTE,
    ];
    
    allAppointments
      ?.filter(apt => 
        apt.id !== appointment.id && 
        activeStates.includes(apt.estado_cita) &&
        format(new Date(apt.fecha_hora_cita), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
      )
      .forEach(apt => {
        occupiedSlots.add(format(new Date(apt.fecha_hora_cita), 'HH:mm'));
      });
    
    return slots.filter(slot => !occupiedSlots.has(slot));
  }, [selectedDate, allAppointments, appointment.id]);

  // Handlers
  const handleConfirm = useCallback(() => {
    if (selectedDate && selectedTime) {
      setIsProcessing(true);
      setTimeout(() => {
        onReschedule(selectedDate, selectedTime);
        onClose();
      }, 500);
    }
  }, [selectedDate, selectedTime, onReschedule, onClose]);

  const patientName = getPatientFullName(appointment.patients);

  // Si no se puede reagendar
  if (!canReschedule) {
    return (
      <Dialog open onOpenChange={onClose}>
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
            <Button onClick={onClose} variant="outline">
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            Reagendar Cita
          </DialogTitle>
          <DialogDescription>
            Seleccione nueva fecha y hora para <strong>{patientName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row h-[500px]">
          {/* Panel izquierdo - Calendario */}
          <div className="flex-1 p-6 border-r">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Fecha Actual
              </h3>
              <Alert className="border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/30">
                <CalendarIcon className="h-4 w-4" />
                <AlertDescription className="font-medium">
                  {format(new Date(appointment.fecha_hora_cita), "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es })}
                </AlertDescription>
              </Alert>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Seleccionar Nueva Fecha
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => {
                  setSelectedDate(date || null);
                  setSelectedTime(null);
                }}
                disabled={(date) => !isValidAppointmentDate(date)}
                locale={es}
                className="rounded-lg border"
              />
            </div>
          </div>

          {/* Panel derecho - Horarios */}
          <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900/50">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Horarios Disponibles
            </h3>
            
            {!selectedDate ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm">Seleccione una fecha primero</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : availableTimeSlots.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No hay horarios disponibles para esta fecha
                </AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-80">
                <div className="grid grid-cols-2 gap-2">
                  {availableTimeSlots.map((time) => (
                    <TimeSlot
                      key={time}
                      time={time}
                      isSelected={selectedTime === time}
                      onClick={() => setSelectedTime(time)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {selectedDate && selectedTime && (
              <Card className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                      Nueva cita programada
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                      {formatAppointmentDate(selectedDate)} a las {selectedTime}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900/50">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedDate || !selectedTime || isProcessing}
            className="gap-2 bg-violet-600 hover:bg-violet-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                Confirmar Cambio
                <ArrowRight className="h-4 w-4" />
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