// patient-card.tsx - Tarjeta de paciente optimizada
import React, { memo, useMemo, useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Clock,
  MoreHorizontal,
  XCircle,
  History,
  LogIn,
  ListChecks,
  CalendarX,
  Repeat,
  Phone,
  Loader2,
  Calendar,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { cn } from "@/lib/utils";

// Importaciones de tipos y utilidades unificadas
import {
  AppointmentWithPatient,
  AppointmentAction,
  AppointmentCardProps,
  APPOINTMENT_STATUS_CONFIG,
  getPatientData,
  canPerformAction,
} from "./types";

import {
  formatAppointmentTime,
  formatAppointmentDate,
  isAppointmentToday,
} from "@/lib/appointment-utils";

// Importar hooks optimizados
import { useAppointmentActions } from "./actions";
import { useAssignSurvey } from '@/hooks/use-survey-templates'

// Importar componentes de modal
import { PatientHistoryModal } from "./patient-history-modal";
import { SurveyModal } from "./survey-modal";

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

const PatientAvatar = memo<{ initials: string; color?: string }>(({ initials, color = "blue" }) => (
  <div 
    className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold",
      "bg-gradient-to-br transition-all duration-200 hover:scale-105 shadow-sm",
      "border",
      color === "blue" && "from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-700 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600",
      color === "green" && "from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600",
      color === "purple" && "from-purple-100 to-purple-200 dark:from-purple-800 dark:to-purple-700 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-600"
    )}
  >
    {initials}
  </div>
));
PatientAvatar.displayName = "PatientAvatar";

const PatientInfo = memo<{
  fullName: string;
  appointment: AppointmentWithPatient;
}>(({ fullName, appointment }) => {
  const formattedTime = formatAppointmentTime(appointment.fecha_hora_cita);
  const isToday = isAppointmentToday(appointment.fecha_hora_cita);

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex items-center gap-2 flex-wrap">
        <h3 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">
          {fullName}
        </h3>
        {appointment.es_primera_vez && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
            Nuevo
          </Badge>
        )}
      </div>
      
      <div className="flex flex-col gap-0.5 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span>{formattedTime}</span>
          {isToday && (
            <span className="text-green-600 font-medium">• Hoy</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{appointment.motivo_cita}</span>
        </div>
      </div>
    </div>
  );
});
PatientInfo.displayName = "PatientInfo";

const StatusBadge = memo<{ 
  status: AppointmentWithPatient['estado_cita'];
  isLoading?: boolean;
}>(({ status, isLoading }) => {
  const config = APPOINTMENT_STATUS_CONFIG[status];
  
  return (
    <Badge 
      className={cn(
        "text-xs font-medium transition-all duration-200 whitespace-nowrap py-1 px-2", 
        config.bgClass
      )}
    >
      {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {config.label}
    </Badge>
  );
});
StatusBadge.displayName = "StatusBadge";

// ==================== COMPONENTE PRINCIPAL ====================

export const AppointmentCard: React.FC<AppointmentCardProps> = memo(({
  appointment,
  onAction,
  disableActions = false,
  surveyCompleted = false,
  showReschedule = true,
  showCancel = true,
  showComplete = true,
}) => {
  // Estados locales para modales
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const assignSurvey = useAssignSurvey();
  const [isSubmittingSurvey, setIsSubmittingSurvey] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Obtener datos del paciente
  const patientData = getPatientData(appointment);
  const patientId = patientData?.id || appointment.patient_id;

  // Hook para acciones de cita
  const appointmentActions = useAppointmentActions();

  // Valores computados memoizados
  const computedValues = useMemo(() => {
    if (!patientData) return null;
    
    const fullName = `${patientData.nombre} ${patientData.apellidos}`.trim();
    
    const initials = `${patientData.nombre.charAt(0)}${patientData.apellidos.charAt(0)}`.toUpperCase();
    
    // Determinar acción principal disponible
    let primaryAction: AppointmentAction | null = null;
    if (canPerformAction(appointment, 'checkIn')) {
      primaryAction = 'checkIn';
    } else if (canPerformAction(appointment, 'complete') && showComplete) {
      primaryAction = 'complete';
    }

    // Color del avatar basado en el estado
    let avatarColor = "blue";
    if (appointment.estado_cita === "COMPLETADA") avatarColor = "green";
    else if (appointment.estado_cita === "CANCELADA" || appointment.estado_cita === "NO_ASISTIO") avatarColor = "purple";

    // Determinar si hay detalles adicionales
    const hasAdditionalDetails = !!(
      patientData.diagnostico_principal || 
      appointment.notas_cita_seguimiento || 
      patientData.estado_paciente || 
      patientData.probabilidad_cirugia !== null
    );

    return {
      fullName,
      initials,
      primaryAction,
      avatarColor,
      hasAdditionalDetails
    };
  }, [appointment, patientData, showComplete]);

  // Handlers principales con memoización
  const handleAction = useCallback((action: AppointmentAction) => {
    if (disableActions) return;
    
    // Todas las acciones usan onAction prop
    onAction(action, appointment);
  }, [appointment, disableActions, onAction]);

  const handleViewHistory = useCallback(() => {
    if (disableActions) return;
    setShowHistoryModal(true);
  }, [disableActions]);

  // Si no hay datos del paciente, mostrar card de error
  if (!patientData || !computedValues) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Error: Datos del paciente no disponibles</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn(
        "group relative overflow-hidden transition-all duration-200",
        "hover:shadow-lg border-0 shadow-sm bg-white dark:bg-slate-900"
      )}>
        <CardContent className="p-4">
          {/* Header con avatar, info y menú */}
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PatientAvatar 
                initials={computedValues.initials} 
                color={computedValues.avatarColor}
              />
              <PatientInfo 
                fullName={computedValues.fullName} 
                appointment={appointment} 
              />
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge 
                status={appointment.estado_cita} 
                isLoading={appointmentActions.isLoading}
              />
              
              {/* Menú de acciones */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    disabled={disableActions}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Menú de opciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* Ver historial */}
                  <DropdownMenuItem
                    onClick={handleViewHistory}
                    className="flex items-center gap-2"
                  >
                    <History className="h-4 w-4" />
                    Ver historial
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />

                  {/* Acciones de cita */}
                  {canPerformAction(appointment, 'checkIn') && (
                    <DropdownMenuItem
                      onClick={() => handleAction('checkIn')}
                      className="flex items-center gap-2"
                      disabled={appointmentActions.isLoading}
                    >
                      <LogIn className="h-4 w-4" />
                      Marcar presente
                    </DropdownMenuItem>
                  )}

                  {canPerformAction(appointment, 'complete') && showComplete && (
                    <DropdownMenuItem
                      onClick={() => handleAction('complete')}
                      className="flex items-center gap-2"
                      disabled={appointmentActions.isLoading}
                    >
                      <ListChecks className="h-4 w-4" />
                      Completar consulta
                    </DropdownMenuItem>
                  )}

                  {canPerformAction(appointment, 'reschedule') && showReschedule && (
                    <DropdownMenuItem
                      onClick={() => handleAction('reschedule')}
                      className="flex items-center gap-2"
                      disabled={appointmentActions.isLoading}
                    >
                      <Repeat className="h-4 w-4" />
                      Reagendar
                    </DropdownMenuItem>
                  )}

                  {(canPerformAction(appointment, 'cancel') || canPerformAction(appointment, 'noShow')) && (
                    <DropdownMenuSeparator />
                  )}

                  {canPerformAction(appointment, 'cancel') && showCancel && (
                    <DropdownMenuItem
                      onClick={() => handleAction('cancel')}
                      className="flex items-center gap-2 text-red-600 dark:text-red-400"
                      disabled={appointmentActions.isLoading}
                    >
                      <XCircle className="h-4 w-4" />
                      Cancelar cita
                    </DropdownMenuItem>
                  )}
                  
                  {canPerformAction(appointment, 'noShow') && (
                    <DropdownMenuItem
                      onClick={() => handleAction('noShow')}
                      className="flex items-center gap-2 text-orange-600 dark:text-orange-400"
                      disabled={appointmentActions.isLoading}
                    >
                      <CalendarX className="h-4 w-4" />
                      Marcar no asistió
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Información básica */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
            {patientData.telefono && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <Phone className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{patientData.telefono}</span>
              </div>
            )}
            
            {patientData.edad !== undefined && patientData.edad !== null && (
              <span className="text-slate-500 dark:text-slate-400">
                {patientData.edad} años
              </span>
            )}
          </div>

          {/* Botón para detalles adicionales */}
          {computedValues.hasAdditionalDetails && (
            <Button 
              variant="ghost"
              size="sm"
              className="mt-2 h-7 px-2 text-xs text-blue-600 dark:text-blue-400"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Ver menos' : 'Ver más'} 
              {showDetails ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          )}

          {/* Detalles adicionales expandibles */}
          {showDetails && (
            <div className="mt-2 space-y-2 text-xs border-t border-slate-100 dark:border-slate-700 pt-2">
              {/* Diagnóstico */}
              {patientData.diagnostico_principal && (
                <div className="text-slate-600 dark:text-slate-300">
                  <span className="font-medium">Diagnóstico: </span>
                  {patientData.diagnostico_principal.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ')}
                </div>
              )}

              {/* Notas de seguimiento */}
              {appointment.notas_cita_seguimiento && (
                <div className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                  <span className="font-medium">Notas: </span>
                  <span className="line-clamp-3">{appointment.notas_cita_seguimiento}</span>
                </div>
              )}

              {/* Estado del paciente */}
              {patientData.estado_paciente && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {patientData.estado_paciente}
                  </Badge>
                  {patientData.probabilidad_cirugia !== null && patientData.probabilidad_cirugia !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {patientData.probabilidad_cirugia}% prob. cirugía
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Botón de acción principal */}
          {computedValues.primaryAction && (
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
              <Button
                onClick={() => handleAction(computedValues.primaryAction!)}
                className="w-full font-medium"
                disabled={disableActions || appointmentActions.isLoading}
                size="sm"
              >
                {appointmentActions.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <>
                    {computedValues.primaryAction === 'checkIn' && (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Marcar Presente
                      </>
                    )}
                    {computedValues.primaryAction === 'complete' && (
                      <>
                        <ListChecks className="h-4 w-4 mr-2" />
                        Completar Consulta
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modales */}
      {showHistoryModal && (
        <PatientHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          patientId={patientId}
        />
      )}

      {showSurveyModal && (
        <SurveyModal
          isOpen={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          appointment={appointment}
          onSubmit={async (data) => {
            if (!appointment.paciente) return;
            setIsSubmittingSurvey(true);
            try {
              await assignSurvey(appointment.paciente.id, data.surveyTemplateId);
              toast.success('Encuesta asignada exitosamente');
              setShowSurveyModal(false);
            } catch (error) {
              toast.error('Error al asignar la encuesta');
            } finally {
              setIsSubmittingSurvey(false);
            }
          }}
          isSubmitting={isSubmittingSurvey}
        />
      )}
    </>
  );
});

AppointmentCard.displayName = "AppointmentCard";

export default AppointmentCard;