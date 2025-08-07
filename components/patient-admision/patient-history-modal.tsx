// components/patient-admision/patient-history-modal.tsx

import React, { memo, useMemo, useState, Suspense } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User,
  FileText,
  Activity,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  CalendarX,
  Star,
  MessageSquare,
  ClipboardList,
  Loader2,
} from "lucide-react";

// Tipos unificados
import type { 
  AppointmentWithPatient, 
  PatientHistoryData,
  PatientHistoryModalProps,
} from './admision-types';

// Funciones auxiliares de tipos
import { 
  getPatientFullName,
  getStatusConfig
} from './admision-types';

// Hook corregido
import { usePatientHistory } from './actions';

// ==================== INTERFACES LOCALES ====================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple';
}

interface AppointmentHistoryCardProps {
  appointment: AppointmentWithPatient;
  isLast?: boolean;
}

interface PatientInfoSectionProps {
  patient: {
    id: string;
    nombre: string;
    apellidos: string;
    telefono?: string;
    email?: string;
    created_at: string;
  };
}

// ==================== UTILIDADES ====================
const formatAppointmentDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Fecha inválida';
    return format(date, "dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return 'Fecha inválida';
  }
};

const formatAppointmentTime = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '--:--';
    return format(date, 'HH:mm');
  } catch {
    return '--:--';
  }
};

// ==================== COMPONENTES INTERNOS MEMOIZADOS ====================
// Tarjeta de estadística optimizada
const StatCard = memo<StatCardProps>(({ label, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    red: "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    purple: "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };
  
  return (
    <Card className="border-slate-200 dark:border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          </div>
          <div className={cn("p-3 rounded-full", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
StatCard.displayName = "StatCard";

// Tarjeta de cita en historial
const AppointmentHistoryCard = memo<AppointmentHistoryCardProps>(({ appointment, isLast = false }) => {
  const statusConfig = useMemo(() => 
    getStatusConfig(appointment.estado_cita), 
    [appointment.estado_cita]
  );
  
  const dateTime = useMemo(() => ({
    date: formatAppointmentDate(appointment.fecha_hora_cita),
    time: formatAppointmentTime(appointment.fecha_hora_cita),
  }), [appointment.fecha_hora_cita]);
  
  const statusIcon = useMemo(() => {
    switch (appointment.estado_cita) {
      case 'COMPLETADA':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'CANCELADA':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'NO_ASISTIO':
        return <CalendarX className="h-5 w-5 text-gray-600" />;
      default:
        return <Calendar className="h-5 w-5 text-blue-600" />;
    }
  }, [appointment.estado_cita]);
  
  const displayMotivos = useMemo(() => {
    if (Array.isArray(appointment.motivos_consulta) && appointment.motivos_consulta.length > 0) {
      return appointment.motivos_consulta.join(', ');
    }
    return 'Sin especificar';
  }, [appointment.motivos_consulta]);
  
  return (
    <div className={cn("relative", !isLast && "pb-4")}>
      {/* Línea conectora */}
      {!isLast && (
        <div className="absolute left-6 top-12 w-0.5 h-full bg-slate-200 dark:bg-slate-700" />
      )}
      <div className="flex items-start gap-4">
        {/* Icono de estado */}
        <div className="flex-shrink-0 relative">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700">
            {statusIcon}
          </div>
        </div>
        {/* Contenido de la cita */}
        <div className="flex-1 min-w-0">
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge className={statusConfig.bgClass}>
                      {statusConfig.label}
                    </Badge>
                    {appointment.es_primera_vez && (
                      <Badge variant="outline" className="text-xs">
                        Primera vez
                      </Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-1">
                    {displayMotivos}
                  </h4>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {dateTime.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {dateTime.time}
                    </div>
                  </div>
                  {appointment.notas_breves && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {appointment.notas_breves}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});
AppointmentHistoryCard.displayName = "AppointmentHistoryCard";

// Información del paciente
const PatientInfoSection = memo<PatientInfoSectionProps>(({ patient }) => (
  <Card className="border-slate-200 dark:border-slate-700">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-lg">
        <User className="h-5 w-5" />
        Información del Paciente
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {patient.telefono && (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Teléfono</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{patient.telefono}</p>
            </div>
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
              <p className="font-medium text-slate-900 dark:text-slate-100">{patient.email}</p>
            </div>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));
PatientInfoSection.displayName = "PatientInfoSection";

// Skeleton de carga
import { PageSkeleton } from '@/components/ui/unified-skeletons';

const LoadingSkeleton = memo(() => (
  <PageSkeleton />
));
LoadingSkeleton.displayName = "LoadingSkeleton";

// Display de error
const ErrorDisplay = memo<{ message: string }>(({ message }) => (
  <div className="text-center py-12">
    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
      Error al cargar datos
    </h3>
    <p className="text-slate-500 dark:text-slate-400 mb-4">
      {message}
    </p>
  </div>
));
ErrorDisplay.displayName = "ErrorDisplay";

// ==================== COMPONENTE PRINCIPAL ====================
const PatientHistoryModal = memo<PatientHistoryModalProps>(({ 
  isOpen, 
  onClose, 
  patientId 
}) => {
  // Estados locales
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'details'>('overview');
  
  // Hook corregido para obtener historial
  const { 
    data: historyData, 
    isLoading, 
    error 
  } = usePatientHistory(patientId, { 
    includeHistory: true,
    enabled: isOpen && !!patientId 
  });
  
  // Estadísticas computadas
  const stats = useMemo(() => {
    if (!historyData?.appointments) {
      return { total: 0, completed: 0, cancelled: 0, noShow: 0, attendanceRate: 0 };
    }
    
    const appointments = historyData.appointments;
    const total = appointments.length;
    const completed = appointments.filter(apt => apt.estado_cita === 'COMPLETADA').length;
    const cancelled = appointments.filter(apt => apt.estado_cita === 'CANCELADA').length;
    const noShow = appointments.filter(apt => apt.estado_cita === 'NO_ASISTIO').length;
    const scheduledTotal = appointments.filter(apt => 
      ['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'].includes(apt.estado_cita)
    ).length;
    
    return {
      total,
      completed,
      cancelled,
      noShow,
      attendanceRate: scheduledTotal > 0 ? Math.round((completed / scheduledTotal) * 100) : 0,
    };
  }, [historyData]);
  
  // Clasificación de citas por tiempo
  const appointmentsByStatus = useMemo(() => {
    if (!historyData?.appointments) {
      return { upcoming: [], history: [] };
    }
    
    const now = new Date();
    const upcoming: AppointmentWithPatient[] = [];
    const past: AppointmentWithPatient[] = [];
    
    for (const apt of historyData.appointments) {
      if (new Date(apt.fecha_hora_cita) > now && 
          apt.estado_cita !== "CANCELADA" && 
          apt.estado_cita !== "NO_ASISTIO") {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    }
    
    // Ordenar listas
    upcoming.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    past.sort((a, b) => new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime());
    
    return { upcoming, history: past };
  }, [historyData]);
  
  // Renderizado del contenido
  const renderContent = () => {
    if (isLoading) return <LoadingSkeleton />;
    if (error) return <ErrorDisplay message={error.message} />;
    if (!historyData || !stats) return null;
    
    const { patient, survey_completion_rate, appointments } = historyData;
    
    return (
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
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
              {/* Estadísticas principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                  label="Total Citas" 
                  value={stats.total} 
                  icon={<Calendar className="h-6 w-6" />} 
                  color="blue" 
                />
                <StatCard 
                  label="Completadas" 
                  value={stats.completed} 
                  icon={<CheckCircle className="h-6 w-6" />} 
                  color="green" 
                />
                <StatCard 
                  label="Canceladas/Ausente" 
                  value={stats.cancelled + stats.noShow} 
                  icon={<XCircle className="h-6 w-6" />} 
                  color="red" 
                />
                <StatCard 
                  label="Tasa Asistencia" 
                  value={`${stats.attendanceRate}%`} 
                  icon={<Activity className="h-6 w-6" />} 
                  color="purple" 
                />
              </div>
              {/* Información del paciente */}
              <PatientInfoSection patient={patient} />
              {/* Satisfacción */}
              {survey_completion_rate !== undefined && (
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Star className="h-5 w-5" /> 
                      Satisfacción
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {Math.round(survey_completion_rate * 100)}%
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Tasa de completación de encuestas
                        </p>
                      </div>
                      <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="appointments" className="mt-0 space-y-6">
              {appointments.length === 0 ? (
                <EmptyState 
                  title="No hay citas registradas para este paciente" 
                  description="Los datos aparecerán aquí cuando estén disponibles." 
                  icon={<ClipboardList className="h-16 w-16 text-slate-400 dark:text-slate-500" />} 
                />
              ) : (
                <>
                  {/* Próximas citas */}
                  {appointmentsByStatus.upcoming.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" /> 
                        Próximas Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByStatus.upcoming.map((apt, index) => (
                          <AppointmentHistoryCard 
                            key={apt.id} 
                            appointment={apt} 
                            isLast={index === appointmentsByStatus.upcoming.length - 1} 
                          />
                        ))}
                      </div>
                    </section>
                  )}
                  {/* Historial de citas */}
                  {appointmentsByStatus.history.length > 0 && (
                    <section>
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-500" /> 
                        Historial de Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByStatus.history.map((apt, index) => (
                          <AppointmentHistoryCard 
                            key={apt.id} 
                            appointment={apt} 
                            isLast={index === appointmentsByStatus.history.length - 1} 
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </TabsContent>
            <TabsContent value="details" className="mt-0">
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle>Información Adicional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                      Paciente desde
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {patient.created_at ? formatAppointmentDate(patient.created_at) : "No disponible"}
                    </p>
                  </div>
                  {appointments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                          Primera consulta
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatAppointmentDate(appointments[appointments.length - 1]?.fecha_hora_cita || '')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                          Última consulta
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatAppointmentDate(appointments[0]?.fecha_hora_cita || '')}
                        </p>
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
              Resumen de {getPatientFullName(historyData.patient)}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
});
PatientHistoryModal.displayName = "PatientHistoryModal";
export default PatientHistoryModal;