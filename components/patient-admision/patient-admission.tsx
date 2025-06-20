// PatientAdmission.tsx - Versión optimizada y simplificada
import React, { useState, Suspense, lazy } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  UserRoundPlus,
  CalendarCheck,
  CalendarClock,
  History,
  Calendar as CalendarBlank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useBreakpointStore } from "@/hooks/use-breakpoint";
import { toast } from "sonner";

import { AppointmentCard } from "./patient-card";
import { usePatientStore } from "@/lib/stores/patient-store";
import { AppointmentData, AppointmentStatusEnum } from "@/app/dashboard/data-model";
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import { useSurveyStore } from "@/lib/stores/survey-store";
import { usePatientAdmissionFlow } from "./use-patient-admission-flow";

// Lazy loading
const RescheduleDatePicker = lazy(() => 
  import('./patient-admission.reschedule').then(m => ({ default: m.RescheduleDatePicker }))
);
const NewPatientForm = lazy(() => 
  import('./new-patient-form').then(m => ({ default: m.NewPatientForm }))
);
const SurveyShareDialog = lazy(() => 
  import('@/components/surveys/survey-share-dialog').then(m => ({ default: m.SurveyShareDialog }))
);
const SurveySelector = lazy(() => 
  import('@/components/surveys/survey-selector').then(m => ({ default: m.SurveySelector }))
);

// Tipos simplificados
type TabValue = "newPatient" | "today" | "future" | "past";
type ConfirmAction = "checkIn" | "cancel" | "complete" | "noShow" | "reschedule";

interface Appointment extends AppointmentData {
  dateTime: Date;
  telefono: string;
}

// Configuración estática
const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Citas de Hoy", icon: CalendarCheck, shortLabel: "Hoy" },
  { value: "future" as const, label: "Citas Futuras", icon: CalendarClock, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Pasadas" },
];

const DIALOG_CONFIG = {
  checkIn: { title: "Registrar Llegada", description: "El paciente se marcará como presente.", icon: CheckCircle },
  cancel: { title: "Cancelar Cita", description: "Esta acción cancelará la cita. ¿Continuar?", icon: XCircle },
  complete: { title: "Completar Consulta", description: "La consulta se marcará como completada.", icon: ClipboardCheck },
  noShow: { title: "Marcar No Asistió", description: "Se registrará que el paciente no asistió.", icon: AlertCircle },
  reschedule: { title: "Reagendar Cita", description: "Seleccione la nueva fecha y hora.", icon: CalendarDays }
};

// Utilidades simplificadas
const formatDisplay = (date: Date | string): string => {
  if (!date) return "Fecha inválida";
  const parsedDate = date instanceof Date ? date : new Date(date);
  if (isNaN(parsedDate.getTime())) return "Fecha inválida";
  
  return parsedDate.toLocaleDateString("es-ES", { 
    weekday: "long", 
    day: "numeric", 
    month: "long" 
  });
};

const transformAppointment = (appointment: AppointmentData): Appointment => {
  const nombreCompleto = appointment.paciente?.split(' ') || ['', ''];
  const nombre = nombreCompleto[0] || '';
  const apellidos = nombreCompleto.slice(1).join(' ') || '';
  
  return {
    ...appointment,
    nombre,
    apellidos,
    telefono: appointment.telefono || "",
    dateTime: appointment.fechaConsulta,
  };
};

// Componentes UI simplificados
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-4 shadow-sm">
        <div className="space-y-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ title, description, icon: Icon }) => (
  <div className="text-center p-16 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center">
    <div className="h-20 w-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
      <Icon className="h-10 w-10 text-slate-500 dark:text-slate-400" />
    </div>
    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h3>
    <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
      {description}
    </p>
  </div>
);

const AppointmentsList = ({ 
  appointments, 
  isLoading,
  emptyState,
  onAction,
  onStartSurvey,
  onViewHistory,
}) => {
  if (isLoading && !appointments?.length) return <LoadingSkeleton />;
  
  if (!appointments?.length) {
    return <EmptyState {...emptyState} />;
  }
  
  return (
    <div className="space-y-4 dark:space-y-6">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onAction={onAction}
          onStartSurvey={() => onStartSurvey(appointment)}
          onViewHistory={onViewHistory}
        />
      ))}
    </div>
  );
};

const MobileTabs = ({ 
  activeTab, 
  onTabChange, 
  appointmentCounts, 
  isLoading 
}) => (
  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.value === "newPatient" ? 0 : appointmentCounts[tab.value] || 0;
      const isActive = activeTab === tab.value;
      
      return (
        <div key={tab.value} className="relative">
          <Button 
            variant={isActive ? "secondary" : "ghost"} 
            size="sm" 
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full",
              isActive ? "bg-white dark:bg-slate-900 shadow-sm" : "hover:bg-slate-200 dark:hover:bg-slate-700"
            )} 
            onClick={() => onTabChange(tab.value)}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full">{tab.shortLabel}</span>
          </Button>
          
          {tab.value !== "newPatient" && count > 0 && !isLoading && (
            <Badge 
              variant="default" 
              className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full"
            >
              {count > 99 ? "99+" : count}
            </Badge>
          )}
        </div>
      );
    })}
  </div>
);

// Componente principal simplificado
export default function PatientAdmission() {
  const {
    appointments,
    isLoading: isLoadingAppointments,
    activeTab,
    setActiveTab,
    refetchAppointments,
    filteredAppointments,
  } = usePatientAdmissionFlow();

  const { patients } = usePatientStore();
  const { updateAppointmentStatus } = useAppointmentStore();
  const { getAssignmentById } = useSurveyStore();
  const { mobile: isMobile } = useBreakpointStore();

  // Estados simplificados
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    action: null,
    appointment: null
  });

  const [surveySelector, setSurveySelector] = useState({
    isOpen: false,
    data: null
  });

  const [surveyShare, setSurveyShare] = useState({
    isOpen: false,
    data: null
  });

  const [rescheduleState, setRescheduleState] = useState({
    date: null,
    time: null
  });

  // Datos derivados simplificados
  const currentAppointments = filteredAppointments[activeTab] || [];
  const appointmentCounts = {
    today: filteredAppointments.today?.length || 0,
    future: filteredAppointments.future?.length || 0,
    past: filteredAppointments.past?.length || 0
  };

  // Handlers simplificados
  const handleAppointmentAction = (action, appointmentId, appointment) => {
    setConfirmDialog({
      isOpen: true,
      action,
      appointment: transformAppointment(appointment)
    });
  };

  const handleStartSurvey = (appointment) => {
    const patient = patients?.find(p => p.id === appointment.patientId);
    
    if (!patient) {
      toast.error("No se encontró el paciente para esta cita.");
      return;
    }
    
    setSurveySelector({
      isOpen: true,
      data: {
        patientId: patient.id,
        appointmentId: appointment.id,
        patientName: `${patient.nombre} ${patient.apellidos}`.trim(),
      }
    });
  };

  const handleViewHistory = (patientId) => {
    if (patientId) {
      window.open(`/pacientes/historial/${patientId}`, "_blank");
    }
  };

  const handleSurveyAssigned = (assignmentId) => {
    const patientId = surveySelector.data?.patientId;
    const patient = patients?.find(p => p.id === patientId);
    const assignment = getAssignmentById(assignmentId);
    
    if (!patient || !assignment?.shareUrl) {
      toast.error("Error al generar el enlace para compartir");
      return;
    }
    
    setSurveySelector({ isOpen: false, data: null });
    setSurveyShare({
      isOpen: true,
      data: {
        patient: {
          id: patient.id,
          nombre: patient.nombre || '',
          apellidos: patient.apellidos || '',
          telefono: patient.telefono || '',
        },
        surveyLink: assignment.shareUrl,
        assignmentId,
      }
    });
  };

  const handleConfirmAction = async () => {
    const { action, appointment } = confirmDialog;
    if (!action || !appointment) return;

    try {
      let statusUpdate;

      switch (action) {
        case "checkIn":
          statusUpdate = { status: AppointmentStatusEnum.PRESENTE, nota: "Check-in manual" };
          break;
        case "cancel":
          statusUpdate = { status: AppointmentStatusEnum.CANCELADA, nota: "Cancelación manual" };
          break;
        case "complete":
          statusUpdate = { status: AppointmentStatusEnum.COMPLETADA, nota: "Consulta completada" };
          break;
        case "noShow":
          statusUpdate = { status: AppointmentStatusEnum.NO_ASISTIO, nota: "Paciente no asistió" };
          break;
        case "reschedule":
          if (!rescheduleState.date || !rescheduleState.time) {
            toast.error("Seleccione fecha y hora para reprogramar");
            return;
          }
          const [hours, minutes] = rescheduleState.time.split(':').map(Number);
          const newDate = new Date(rescheduleState.date);
          newDate.setHours(hours, minutes);
          
          statusUpdate = {
            status: AppointmentStatusEnum.REAGENDADA,
            nota: "Cita reprogramada",
            nuevaFecha: newDate.toISOString()
          };
          break;
        default:
          return;
      }

      await toast.promise(
        updateAppointmentStatus(appointment.id, statusUpdate.status, statusUpdate.nota, statusUpdate.nuevaFecha),
        {
          loading: "Actualizando...",
          success: "Actualizado correctamente",
          error: "Error al actualizar"
        }
      );

      refetchAppointments();
      
      if (action === "checkIn") {
        setTimeout(() => handleStartSurvey(appointment), 300);
      }
    } catch (error) {
      console.error("Error al actualizar cita:", error);
    } finally {
      setConfirmDialog({ isOpen: false, action: null, appointment: null });
      if (action === "reschedule") {
        setRescheduleState({ date: null, time: null });
      }
    }
  };

  const dialogConfig = confirmDialog.action ? DIALOG_CONFIG[confirmDialog.action] : null;

  return (
    <div className="w-full max-w-7xl mx-auto p-3 sm:p-4 lg:p-6 space-y-6 min-h-screen">
      <Card className="w-full overflow-hidden shadow-xl border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
        <CardContent className="p-0">
          <div className="flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
              <h1 className="text-2xl font-bold">Admisión de Pacientes</h1>
            </div>
            
            {/* Main Content */}
            <div className="p-4 sm:p-6">
              {isMobile && (
                <MobileTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  appointmentCounts={appointmentCounts}
                  isLoading={isLoadingAppointments}
                />
              )}
              
              {/* Content Area */}
              <div className="mt-6">
                {isMobile ? (
                  activeTab === "newPatient" ? (
                    <Card>
                      <CardContent className="p-6">
                        <Suspense fallback={<LoadingSkeleton />}>
                          <NewPatientForm />
                        </Suspense>
                      </CardContent>
                    </Card>
                  ) : (
                    <AppointmentsList
                      appointments={currentAppointments}
                      isLoading={isLoadingAppointments}
                      emptyState={{
                        title: activeTab === "today" ? "No hay citas hoy" :
                               activeTab === "future" ? "No hay citas futuras" :
                               "No hay citas anteriores",
                        description: activeTab === "today" ? "No tienes citas programadas para hoy." :
                                    activeTab === "future" ? "No tienes citas programadas para el futuro." :
                                    "No tienes citas anteriores registradas.",
                        icon: activeTab === "today" ? CalendarCheck :
                              activeTab === "future" ? CalendarClock :
                              CalendarBlank,
                      }}
                      onAction={handleAppointmentAction}
                      onStartSurvey={handleStartSurvey}
                      onViewHistory={handleViewHistory}
                    />
                  )
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full max-w-2xl">
                      {TABS_CONFIG.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                          <tab.icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="newPatient" className="mt-6">
                      <Card>
                        <CardContent className="p-6">
                          <Suspense fallback={<LoadingSkeleton />}>
                            <NewPatientForm />
                          </Suspense>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    {["today", "future", "past"].map((tab) => (
                      <TabsContent key={tab} value={tab} className="space-y-4">
                        <AppointmentsList
                          appointments={filteredAppointments[tab]}
                          isLoading={isLoadingAppointments}
                          emptyState={{
                            title: tab === "today" ? "No hay citas hoy" :
                                   tab === "future" ? "No hay citas futuras" :
                                   "No hay citas anteriores",
                            description: tab === "today" ? "No tienes citas programadas para hoy." :
                                        tab === "future" ? "No tienes citas programadas para el futuro." :
                                        "No tienes citas anteriores registradas.",
                            icon: tab === "today" ? CalendarCheck :
                                  tab === "future" ? CalendarClock :
                                  CalendarBlank,
                          }}
                          onAction={handleAppointmentAction}
                          onStartSurvey={handleStartSurvey}
                          onViewHistory={handleViewHistory}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <Suspense fallback={null}>
        {surveySelector.isOpen && surveySelector.data && (
          <SurveySelector
            isOpen={surveySelector.isOpen}
            {...surveySelector.data}
            onClose={() => setSurveySelector({ isOpen: false, data: null })}
            onAssigned={handleSurveyAssigned}
          />
        )}
        
        {surveyShare.isOpen && surveyShare.data && (
          <SurveyShareDialog
            isOpen={surveyShare.isOpen}
            patient={surveyShare.data.patient}
            surveyLink={surveyShare.data.surveyLink}
            onClose={() => setSurveyShare({ isOpen: false, data: null })}
            onStartInternal={() => {
              setSurveyShare({ isOpen: false, data: null });
              toast.info("Iniciando encuesta internamente");
            }}
          />
        )}
      </Suspense>

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ isOpen: false, action: null, appointment: null });
            if (confirmDialog.action === "reschedule") {
              setRescheduleState({ date: null, time: null });
            }
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-2xl">
          {dialogConfig && confirmDialog.appointment && (() => {
            const Icon = dialogConfig.icon;
            const appointment = confirmDialog.appointment;
            
            return (
              <>
                <AlertDialogHeader className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-full flex items-center justify-center",
                      confirmDialog.action === "cancel" && "bg-red-100 dark:bg-red-900/50",
                      confirmDialog.action === "complete" && "bg-green-100 dark:bg-green-900/50",
                      confirmDialog.action === "noShow" && "bg-amber-100 dark:bg-amber-900/50",
                      (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action)) && "bg-blue-100 dark:bg-blue-900/50"
                    )}>
                      <Icon className={cn(
                        "h-6 w-6",
                        confirmDialog.action === "cancel" && "text-red-600",
                        confirmDialog.action === "complete" && "text-green-600",
                        confirmDialog.action === "noShow" && "text-amber-600",
                        (!confirmDialog.action || !["cancel", "complete", "noShow"].includes(confirmDialog.action)) && "text-blue-600"
                      )} />
                    </div>
                    
                    <AlertDialogTitle className="text-xl font-bold">
                      {dialogConfig.title}
                    </AlertDialogTitle>
                  </div>
                  
                  <AlertDialogDescription asChild>
                    <div className="pt-2 space-y-4 text-sm">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border">
                        <p className="font-semibold mb-3">
                          {appointment.nombre} {appointment.apellidos}
                        </p>
                        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDisplay(appointment.dateTime)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{appointment.horaConsulta}</span>
                          </div>
                        </div>
                      </div>
                      
                      {confirmDialog.action === "reschedule" ? (
                        <Suspense fallback={<LoadingSkeleton />}>
                          <RescheduleDatePicker
                            rescheduleState={rescheduleState}
                            onStateChange={setRescheduleState}
                          />
                        </Suspense>
                      ) : (
                        <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                          {dialogConfig.description}
                        </p>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                
                <AlertDialogFooter className="mt-6">
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleConfirmAction}
                    disabled={
                      (confirmDialog.action === "reschedule" && 
                       (!rescheduleState.date || !rescheduleState.time)) || 
                      isLoadingAppointments
                    }
                    className={cn(
                      confirmDialog.action === "cancel" && "bg-red-600 hover:bg-red-700 text-white",
                      confirmDialog.action === "complete" && "bg-green-600 hover:bg-green-700 text-white",
                      confirmDialog.action === "noShow" && "bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                  >
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </>
            );
          })()}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}