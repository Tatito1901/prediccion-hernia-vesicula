// patient-history-modal.tsx - Modal de historial del paciente (Versión Optimizada)
import React, { memo, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Activity,
  Phone,
  Mail,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarX,
  Star,
  MessageSquare,
  Stethoscope,
  ClipboardList,
} from "lucide-react";

// Importaciones de tipos y hooks
import { 
  AppointmentWithPatient, 
  PatientHistoryData,
  APPOINTMENT_STATUS_CONFIG,
  // getPatientData, // Se eliminó ya que no se usaba.
} from "./admision-types";
import { usePatientHistory } from "./actions";
import {
  formatAppointmentDate,
  formatAppointmentTime,
  isAppointmentInPast,
} from "@/lib/appointment-utils";

// ==================== INTERFACES Y TIPOS ====================

interface PatientHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
}

type StatCardColor = "blue" | "green" | "red" | "purple";

// ==================== CONSTANTES Y CONFIGURACIONES ====================

// OPTIMIZACIÓN: Mapeo de colores para evitar purga de clases de Tailwind CSS.
// En lugar de construir clases dinámicamente (ej: `bg-${color}-100`), usamos un objeto
// que devuelve las clases completas. Esto asegura que el compilador JIT de Tailwind
// las detecte y las incluya en el CSS final.
const statCardColorClasses: Record<StatCardColor, string> = {
  blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  green: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
  red: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  purple: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
};

// MEJORA: Centralizamos la lógica de los iconos de estado para mayor claridad y mantenibilidad.
const statusIcons: Record<string, React.ReactNode> = {
  COMPLETADA: <CheckCircle className="h-5 w-5 text-green-600" />,
  CANCELADA: <XCircle className="h-5 w-5 text-red-600" />,
  NO_ASISTIO: <CalendarX className="h-5 w-5 text-gray-600" />,
  DEFAULT: <Calendar className="h-5 w-5 text-blue-600" />,
};

// ==================== COMPONENTES INTERNOS (MEMOIZADOS) ====================

const StatCard = memo<{
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  color?: StatCardColor;
}>(({ label, value, icon, trend, color = "blue" }) => (
  <Card className="border-slate-200 dark:border-slate-700 overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", statCardColorClasses[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-green-600" : "text-red-600"
          )}>
            <TrendingUp className={cn("h-3 w-3", trend < 0 && "rotate-180")} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {value}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
          {label}
        </p>
      </div>
    </CardContent>
  </Card>
));
StatCard.displayName = "StatCard";

const AppointmentHistoryCard = memo<{
  appointment: AppointmentWithPatient;
  isLast?: boolean;
}>(({ appointment, isLast = false }) => {
  const statusConfig = APPOINTMENT_STATUS_CONFIG[appointment.estado_cita];
  const isPast = isAppointmentInPast(appointment.fecha_hora_cita);
  const statusIcon = statusIcons[appointment.estado_cita] || statusIcons.DEFAULT;

  return (
    <div className="relative pl-14">
      {/* Línea de tiempo */}
      {!isLast && (
        <div className="absolute left-5 top-5 -bottom-4 w-0.5 bg-slate-200 dark:bg-slate-700" />
      )}
      
      {/* Punto de la línea de tiempo */}
      <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
        {statusIcon}
      </div>
      
      {/* Contenido */}
      <Card className={cn(
        "transition-all",
        !isPast && "border-blue-300 dark:border-blue-700 shadow-sm"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2 gap-2">
            <div>
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {formatAppointmentDate(appointment.fecha_hora_cita)}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1">
                <Clock className="h-3.5 w-3.5" />
                {formatAppointmentTime(appointment.fecha_hora_cita)}
              </p>
            </div>
            <Badge className={cn("text-xs font-semibold", statusConfig.bgClass)}>
              {statusConfig.label}
            </Badge>
          </div>
          
          <Separator className="my-3" />
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Stethoscope className="h-5 w-5 text-slate-400 shrink-0" />
              <span className="text-slate-800 dark:text-slate-200">
                {appointment.motivo_cita}
              </span>
            </div>
            
            {appointment.notas_cita_seguimiento && (
              <div className="flex items-start gap-3 text-sm">
                <FileText className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-slate-600 dark:text-slate-400 italic">
                  "{appointment.notas_cita_seguimiento}"
                </p>
              </div>
            )}

            {appointment.es_primera_vez && (
              <Badge variant="secondary" className="text-xs font-medium">
                Primera consulta
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
AppointmentHistoryCard.displayName = "AppointmentHistoryCard";

const PatientInfoSection = memo<{
  patient: PatientHistoryData['patient'];
}>(({ patient }) => (
  <Card className="border-slate-200 dark:border-slate-700">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <User className="h-5 w-5" />
        Información del Paciente
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        {/* Usamos un fragmento para renderizar la información y evitar anidación innecesaria */}
        {[
          { label: "Nombre Completo", value: `${patient.nombre} ${patient.apellidos}` },
          { label: "Email", value: patient.email, icon: <Mail className="h-3.5 w-3.5" /> },
          { label: "Edad", value: patient.edad ? `${patient.edad} años` : null },
          { label: "Teléfono", value: patient.telefono, icon: <Phone className="h-3.5 w-3.5" /> },
          { label: "Diagnóstico Principal", value: patient.diagnostico_principal?.replace(/_/g, ' ') },
          { label: "Estado", value: patient.estado_paciente, isBadge: true },
        ].map(item => item.value ? (
          <div key={item.label}>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {item.label}
            </p>
            {item.isBadge ? (
              <Badge variant="outline" className="mt-1 font-medium">{item.value}</Badge>
            ) : (
              <p className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mt-1">
                {item.icon}
                {item.value}
              </p>
            )}
          </div>
        ) : null)}
      </div>
      
      {patient.probabilidad_cirugia !== null && patient.probabilidad_cirugia !== undefined && (
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            Probabilidad de Cirugía
          </p>
          <div className="flex items-center gap-4">
            <Progress value={patient.probabilidad_cirugia} className="h-2 flex-1" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {patient.probabilidad_cirugia}%
            </span>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
));
PatientInfoSection.displayName = "PatientInfoSection";

const LoadingSkeleton = memo(() => (
  <div className="p-6 space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i} className="border-slate-200 dark:border-slate-700">
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
    
    <Card className="border-slate-200 dark:border-slate-700">
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-5/6" />
      </CardContent>
    </Card>
  </div>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

const ErrorDisplay = memo<{ message?: string }>(({ message }) => (
  <div className="p-6">
    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 bg-red-50 dark:bg-red-900/10 rounded-lg">
      <AlertCircle className="h-12 w-12 text-red-500" />
      <div>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Error al cargar el historial
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {message || "Ocurrió un error inesperado. Por favor, intente de nuevo."}
        </p>
      </div>
    </div>
  </div>
));
ErrorDisplay.displayName = "ErrorDisplay";

const EmptyState = memo<{ message: string; icon: React.ReactNode }>(({ message, icon }) => (
    <Card className="border-dashed border-slate-300 dark:border-slate-700">
        <CardContent className="p-12 text-center flex flex-col items-center">
            <div className="text-slate-400 dark:text-slate-600 mb-4">{icon}</div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{message}</p>
        </CardContent>
    </Card>
));
EmptyState.displayName = "EmptyState";

// ==================== COMPONENTE PRINCIPAL ====================

export const PatientHistoryModal = ({ isOpen, onClose, patientId }: PatientHistoryModalProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // El hook de fetching ya está optimizado para ejecutarse solo cuando el modal está abierto.
  const { data: historyData, isLoading, error } = usePatientHistory(
    patientId,
    { 
      includeHistory: true,
      enabled: isOpen && !!patientId
    }
  );

  // OPTIMIZACIÓN: `useMemo` para calcular estadísticas.
  // Este cálculo solo se ejecuta si `historyData` cambia, evitando recálculos en cada render.
  const stats = useMemo(() => {
    if (!historyData) return null;

    const { total_appointments = 0, completed_appointments = 0, cancelled_appointments = 0, no_show_appointments = 0 } = historyData;
    const scheduledTotal = total_appointments - cancelled_appointments;
    
    return {
      total: total_appointments,
      completed: completed_appointments,
      cancelled: cancelled_appointments,
      noShow: no_show_appointments,
      attendanceRate: scheduledTotal > 0 ? Math.round((completed_appointments / scheduledTotal) * 100) : 0,
    };
  }, [historyData]);

  // OPTIMIZACIÓN: `useMemo` para clasificar y ordenar las citas.
  // Filtra y ordena las citas UNA SOLA VEZ cuando `historyData` cambia.
  // Anteriormente, la ordenación se hacía en el `map`, lo que es ineficiente.
  const appointmentsByStatus = useMemo(() => {
    if (!historyData?.appointments) {
      return { upcoming: [], history: [] };
    }

    const now = new Date();
    const upcoming: AppointmentWithPatient[] = [];
    const past: AppointmentWithPatient[] = [];

    for (const apt of historyData.appointments) {
      if (new Date(apt.fecha_hora_cita) > now && apt.estado_cita !== "CANCELADA" && apt.estado_cita !== "NO_ASISTIO") {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    }
    
    // Ordenamos las listas una sola vez aquí.
    upcoming.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    past.sort((a, b) => new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime());

    return { upcoming, history: past };
  }, [historyData]);

  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) return <ErrorDisplay message={error.message} />;
    if (!historyData || !stats) return null;

    const { patient, survey_completion_rate, appointments } = historyData;

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <div className="px-6 border-b border-slate-200 dark:border-slate-800">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="appointments">Citas ({stats.total})</TabsTrigger>
            <TabsTrigger value="details">Detalles</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Citas" value={stats.total} icon={<Calendar className="h-6 w-6" />} color="blue" />
                <StatCard label="Completadas" value={stats.completed} icon={<CheckCircle className="h-6 w-6" />} color="green" />
                <StatCard label="Canceladas/Ausente" value={stats.cancelled + stats.noShow} icon={<XCircle className="h-6 w-6" />} color="red" />
                <StatCard label="Tasa Asistencia" value={`${stats.attendanceRate}%`} icon={<Activity className="h-6 w-6" />} color="purple" />
              </div>
              <PatientInfoSection patient={patient} />
              {survey_completion_rate !== undefined && (
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Star className="h-5 w-5" /> Satisfacción</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{Math.round(survey_completion_rate * 100)}%</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Tasa de completación de encuestas</p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="appointments" className="mt-0 space-y-6">
              {appointments.length === 0 ? (
                <EmptyState message="No hay citas registradas para este paciente." icon={<ClipboardList className="h-16 w-16" />} />
              ) : (
                <>
                  {appointmentsByStatus.upcoming.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" /> Próximas Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByStatus.upcoming.map((apt, index) => (
                          <AppointmentHistoryCard key={apt.id} appointment={apt} isLast={index === appointmentsByStatus.upcoming.length - 1} />
                        ))}
                      </div>
                    </section>
                  )}
                  {appointmentsByStatus.history.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" /> Historial de Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByStatus.history.map((apt, index) => (
                          <AppointmentHistoryCard key={apt.id} appointment={apt} isLast={index === appointmentsByStatus.history.length - 1} />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="details" className="mt-0">
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader><CardTitle>Información Adicional</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Paciente desde</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{patient.created_at ? formatAppointmentDate(patient.created_at) : "No disponible"}</p>
                  </div>
                  {appointments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Primera consulta</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{formatAppointmentDate(appointments[appointments.length - 1].fecha_hora_cita)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Última consulta</p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{formatAppointmentDate(appointments[0].fecha_hora_cita)}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </ScrollArea>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Historial del Paciente
          </DialogTitle>
          {historyData?.patient && (
            <DialogDescription>
              Resumen de {historyData.patient.nombre} {historyData.patient.apellidos}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Asignar displayName para facilitar la depuración en React DevTools
PatientHistoryModal.displayName = "PatientHistoryModal";

// No es estrictamente necesario memoizar el componente principal si sus props (isOpen, onClose, patientId)
// cambian frecuentemente, pero lo mantenemos por consistencia.
export default memo(PatientHistoryModal);
