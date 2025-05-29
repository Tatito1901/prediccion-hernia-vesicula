"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppContext } from "@/lib/context/app-context";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar,
  CalendarClock, 
  Clock, 
  Edit, 
  Info,
  CheckCircle2,
  XCircle,
  Clock8,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import DatePicker from "react-datepicker";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AppointmentHistoryProps {
  appointmentId: string;
  onStatusUpdated?: () => void;
}

interface HistoryEntry {
  id: string;
  appointment_id: string;
  estado_cita_anterior: string;
  estado_cita_nuevo: string;
  fecha_cambio: string;
  fecha_cita_anterior: string | null;
  fecha_cita_nueva: string | null;
  modificado_por_id: string;
  notas: string | null;
  motivo_cambio: string | null;
  profiles: {
    id: string;
    full_name: string;
    role: string;
  };
}

export function AppointmentHistory({ appointmentId, onStatusUpdated }: AppointmentHistoryProps) {
  const { getAppointmentHistory, updateAppointmentStatus } = useAppContext();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Estado para el modal de reagendar
  const [showRescheduleDialog, setShowRescheduleDialog] = useState(false);
  const [newDate, setNewDate] = useState<Date | null>(null);
  const [newTime, setNewTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Estado para confirmación de acciones
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState<{
    type: 'complete' | 'cancel' | 'noShow';
    message: string;
  } | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!appointmentId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const historyData = await getAppointmentHistory(appointmentId);
      setHistory(historyData);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar el historial";
      setError(errorMessage);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [appointmentId, getAppointmentHistory]);

  useEffect(() => {
    if (appointmentId) {
      fetchHistory();
    }
  }, [appointmentId, fetchHistory]);
  
  useEffect(() => {
    // Limpiar estado al cerrar el diálogo de reagendamiento
    if (!showRescheduleDialog) {
      setNewDate(null);
      setNewTime("09:00");
      setReason("");
      setValidationError(null);
    }
  }, [showRescheduleDialog]);

  const getStatusBadgeColor = (status: string) => {
    switch(status) {
      case "PROGRAMADA": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "CONFIRMADA": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "CANCELADA": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "COMPLETADA": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "NO ASISTIO": return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      case "PRESENTE": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
      case "REAGENDADA": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const handleConfirmAction = async () => {
    if (!actionToConfirm) return;
    
    setIsSubmitting(true);
    
    try {
      const status = actionToConfirm.type === 'complete' 
        ? "COMPLETADA" 
        : actionToConfirm.type === 'cancel' 
          ? "CANCELADA" 
          : "NO ASISTIO";
      
      await updateAppointmentStatus(
        appointmentId, 
        status, 
        actionToConfirm.message
      );
      
      toast.success(`La cita ha sido marcada como ${status.toLowerCase()}`);
      fetchHistory();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar estado";
      toast.error(errorMessage);
      console.error("Error al actualizar estado:", err);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
      setActionToConfirm(null);
    }
  };

  const handleUpdateStatus = (status: "COMPLETADA" | "CANCELADA" | "NO ASISTIO") => {
    const actionType = status === "COMPLETADA" 
      ? 'complete' 
      : status === "CANCELADA" 
        ? 'cancel' 
        : 'noShow';
    
    const messages = {
      'complete': "Cita marcada como COMPLETADA",
      'cancel': "Cita marcada como CANCELADA",
      'noShow': "Cita marcada como NO ASISTIO"
    };
    
    setActionToConfirm({
      type: actionType as 'complete' | 'cancel' | 'noShow',
      message: messages[actionType]
    });
    
    setShowConfirmDialog(true);
  };

  const handleReschedule = async () => {
    if (!newDate) {
      setValidationError("La fecha es obligatoria");
      return;
    }
    
    // Validar hora
    if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) {
      setValidationError("Formato de hora inválido");
      return;
    }
    
    // Validar rango de hora (9:00 a 14:00)
    const [hours, minutes] = newTime.split(':').map(Number);
    if (hours < 9 || (hours === 14 && minutes > 0) || hours > 14) {
      setValidationError("El horario debe estar entre 9:00 y 14:00");
      return;
    }
    
    setValidationError(null);
    setIsSubmitting(true);
    
    // Combinar fecha y hora
    const dateTime = new Date(newDate);
    dateTime.setHours(hours, minutes);
    
    try {
      await updateAppointmentStatus(
        appointmentId,
        "REAGENDADA",
        reason || "Cita reagendada",
        dateTime.toISOString()
      );
      
      toast.success("Cita reagendada correctamente");
      setShowRescheduleDialog(false);
      fetchHistory();
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Error al reagendar";
      setValidationError(errorMessage);
      console.error("Error al reagendar:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case "COMPLETADA": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "CANCELADA": return <XCircle className="h-4 w-4 text-red-600" />;
      case "REAGENDADA": return <Calendar className="h-4 w-4 text-blue-600" />;
      case "NO ASISTIO": return <Clock8 className="h-4 w-4 text-amber-600" />;
      default: return <Info className="h-4 w-4 text-slate-600" />;
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      if (!isValid(date)) return "Fecha inválida";
      return format(date, "dd MMM yyyy HH:mm", { locale: es });
    } catch (e) {
      console.error("Error al formatear fecha:", e);
      return "Fecha inválida";
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    fetchHistory();
  };

  // Estadísticas
  const totalChanges = history.length;
  const cancelCount = history.filter(h => h.estado_cita_nuevo === "CANCELADA").length;
  const rescheduleCount = history.filter(h => h.estado_cita_nuevo === "REAGENDADA").length;
  const noShowCount = history.filter(h => h.estado_cita_nuevo === "NO ASISTIO").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">Cargando historial de cita...</p>
          <Progress className="h-1 w-48 mt-2" value={60} />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-0">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error al cargar el historial</AlertTitle>
        <AlertDescription className="mb-2">{error}</AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRetry}
          className="mt-2"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Reintentar ({retryCount})
        </Button>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas de la cita */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription>Total cambios</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalChanges}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription>Reagendamientos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rescheduleCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription>Cancelaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{cancelCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50">
          <CardHeader className="pb-2">
            <CardDescription>No asistencias</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{noShowCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-2">
        <Button 
          variant="outline" 
          onClick={() => handleUpdateStatus("COMPLETADA")}
          className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30 dark:hover:bg-green-900/30 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Completada
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleUpdateStatus("NO ASISTIO")}
          className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30 dark:hover:bg-amber-900/30 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <Clock8 className="mr-2 h-4 w-4" />
          No asistió
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => handleUpdateStatus("CANCELADA")}
          className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:text-red-800 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30 dark:hover:bg-red-900/30 w-full sm:w-auto"
          disabled={isSubmitting}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Cancelar
        </Button>
        
        <Dialog open={showRescheduleDialog} onOpenChange={setShowRescheduleDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30 dark:hover:bg-blue-900/30 w-full sm:w-auto"
              disabled={isSubmitting}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Reagendar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reagendar cita</DialogTitle>
              <DialogDescription>
                Seleccione la nueva fecha y hora para esta cita.
              </DialogDescription>
            </DialogHeader>
            
            {validationError && (
              <Alert variant="destructive" className="mt-2 mb-0">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-sm font-medium">{validationError}</AlertTitle>
              </Alert>
            )}
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right col-span-1" htmlFor="reschedule-date">Fecha</label>
                <div className="col-span-3">
                  <DatePicker
                    id="reschedule-date"
                    selected={newDate}
                    onChange={(date) => {
                      setNewDate(date);
                      if (validationError) setValidationError(null);
                    }}
                    dateFormat="dd/MM/yyyy"
                    locale={es}
                    minDate={new Date()}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    placeholderText="Seleccionar fecha"
                    aria-label="Fecha de reagendamiento"
                    aria-invalid={!!validationError}
                    aria-describedby={validationError ? "reschedule-error" : undefined}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right col-span-1" htmlFor="reschedule-time">Hora</label>
                <Input
                  id="reschedule-time"
                  className="col-span-3"
                  type="time"
                  value={newTime}
                  onChange={(e) => {
                    setNewTime(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  min="09:00"
                  max="14:00"
                  aria-label="Hora de reagendamiento"
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "reschedule-error" : undefined}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right col-span-1" htmlFor="reschedule-reason">Motivo</label>
                <Textarea
                  id="reschedule-reason"
                  className="col-span-3"
                  placeholder="Razón del reagendamiento"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-label="Motivo de reagendamiento"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowRescheduleDialog(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleReschedule} 
                disabled={isSubmitting || !newDate}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Reagendar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Separator />
      
      {/* Timeline de historial */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Historial de cambios</h3>
        
        {history.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded-md">
            <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No hay registros de cambios en esta cita.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div 
                key={entry.id} 
                className="flex items-start gap-3 pb-4 border-b border-slate-200 dark:border-slate-700 animate-in fade-in-50 slide-in-from-top-1"
                style={{ animationDelay: `${history.indexOf(entry) * 75}ms` }}
              >
                <div className="mt-1">
                  {getStatusIcon(entry.estado_cita_nuevo)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadgeColor(entry.estado_cita_nuevo)}>
                      {entry.estado_cita_nuevo}
                    </Badge>
                    {entry.estado_cita_anterior && (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        desde {entry.estado_cita_anterior}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                    {entry.motivo_cambio || "Sin motivo registrado"}
                  </p>
                  
                  {entry.notas && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 italic">
                      "{entry.notas}"
                    </p>
                  )}
                  
                  {entry.fecha_cita_anterior && entry.fecha_cita_nueva && (
                    <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span>De {formatDateTime(entry.fecha_cita_anterior)} a {formatDateTime(entry.fecha_cita_nueva)}</span>
                    </div>
                  )}
                  
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
                    <span>Por {entry.profiles?.full_name || "Usuario desconocido"}</span>
                    <span>•</span>
                    <span>{formatDateTime(entry.fecha_cambio)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Diálogo de confirmación de acción */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionToConfirm?.type === 'complete' ? 'Completar cita' : 
               actionToConfirm?.type === 'cancel' ? 'Cancelar cita' : 
               'Marcar como No Asistió'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea marcar esta cita como 
              {actionToConfirm?.type === 'complete' ? ' completada' : 
               actionToConfirm?.type === 'cancel' ? ' cancelada' : 
               ' no asistió'}?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction} 
              disabled={isSubmitting}
              className={cn(
                actionToConfirm?.type === 'complete' ? 'bg-green-600 hover:bg-green-700' :
                actionToConfirm?.type === 'cancel' ? 'bg-red-600 hover:bg-red-700' :
                'bg-amber-600 hover:bg-amber-700'
              )}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}