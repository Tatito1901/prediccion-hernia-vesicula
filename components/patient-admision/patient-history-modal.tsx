// components/patient-admission/patient-history-modal.tsx
'use client';
import React, { memo, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn, formatAppointmentDate, formatAppointmentTime } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  User2,
  FileText,
  Activity,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Stethoscope,
  ChartBar,
  CalendarDays,
  Target,
  Award
} from "lucide-react";

import type { 
  AppointmentWithPatient, 
  PatientHistoryModalProps,
} from './admision-types';
import { 
  getPatientFullName,
  getStatusConfig
} from './admision-types';
import { usePatientHistory } from '@/hooks/use-patient';

// ==================== COMPONENTES INTERNOS ====================

// Tarjeta de estadística mejorada
const StatCard = memo<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: 'sky' | 'emerald' | 'amber' | 'purple';
  trend?: number;
}>(({ icon: Icon, label, value, color, trend }) => {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300',
  };

  const iconBgClasses = {
    sky: 'bg-sky-100 dark:bg-sky-900/50',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/50',
    amber: 'bg-amber-100 dark:bg-amber-900/50',
    purple: 'bg-purple-100 dark:bg-purple-900/50',
  };

  return (
    <Card className={cn("border-0 shadow-sm", colorClasses[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium opacity-90">{label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {trend !== undefined && (
                <Badge variant="secondary" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {trend}%
                </Badge>
              )}
            </div>
          </div>
          <div className={cn("p-3 rounded-lg", iconBgClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
StatCard.displayName = "StatCard";

// Timeline de citas mejorado
const AppointmentTimeline = memo<{
  appointment: AppointmentWithPatient;
  isLast?: boolean;
}>(({ appointment, isLast }) => {
  const statusConfig = getStatusConfig(appointment.estado_cita);
  const dateTime = {
    date: formatAppointmentDate(appointment.fecha_hora_cita),
    time: formatAppointmentTime(appointment.fecha_hora_cita),
  };

  const statusIcon = {
    'COMPLETADA': CheckCircle2,
    'CANCELADA': XCircle,
    'NO_ASISTIO': AlertCircle,
  }[appointment.estado_cita] || Calendar;

  const StatusIcon = statusIcon;

  return (
    <div className={cn("relative", !isLast && "pb-8")}>
      {!isLast && (
        <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700" />
      )}
      
      <div className="flex gap-4">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
          "ring-4 ring-white dark:ring-gray-800",
          statusConfig.bgClass
        )}>
          <StatusIcon className="h-5 w-5" />
        </div>
        
        <Card className="flex-1 border shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Badge className={cn("text-xs", statusConfig.bgClass)}>
                  {statusConfig.label}
                </Badge>
                {appointment.es_primera_vez && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Primera consulta
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {dateTime.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {dateTime.time}
                  </span>
                </div>
              </div>
            </div>
            
            {appointment.motivos_consulta?.length > 0 && (
              <div className="flex items-start gap-2 mb-3">
                <Stethoscope className="h-4 w-4 text-gray-400 mt-0.5" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {appointment.motivos_consulta.join(', ')}
                </p>
              </div>
            )}
            
            {appointment.notas_breves && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {appointment.notas_breves}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});
AppointmentTimeline.displayName = "AppointmentTimeline";

// Loading skeleton optimizado
const LoadingSkeleton = () => (
  <div className="space-y-6 p-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="p-4">
          <Skeleton className="h-6 w-20 mb-2" />
          <Skeleton className="h-8 w-16" />
        </Card>
      ))}
    </div>
    <div className="space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Card className="flex-1 p-4">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-full" />
          </Card>
        </div>
      ))}
    </div>
  </div>
);

// ==================== COMPONENTE PRINCIPAL ====================
const PatientHistoryModal = memo<PatientHistoryModalProps>(({ 
  isOpen, 
  onClose, 
  patientId 
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  
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
      return { total: 0, completed: 0, cancelled: 0, noShow: 0, rate: 0 };
    }
    
    const apps = historyData.appointments;
    const total = apps.length;
    const completed = apps.filter(a => a.estado_cita === 'COMPLETADA').length;
    const cancelled = apps.filter(a => a.estado_cita === 'CANCELADA').length;
    const noShow = apps.filter(a => a.estado_cita === 'NO_ASISTIO').length;
    const scheduled = apps.filter(a => 
      ['COMPLETADA', 'CANCELADA', 'NO_ASISTIO'].includes(a.estado_cita)
    ).length;
    
    return {
      total,
      completed,
      cancelled,
      noShow,
      rate: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
    };
  }, [historyData]);
  
  // Clasificación temporal
  const appointmentsByTime = useMemo(() => {
    if (!historyData?.appointments) return { upcoming: [], past: [] };
    
    const now = new Date();
    const upcoming: AppointmentWithPatient[] = [];
    const past: AppointmentWithPatient[] = [];
    
    historyData.appointments.forEach(apt => {
      const aptDate = new Date(apt.fecha_hora_cita);
      if (aptDate > now && !['CANCELADA', 'NO_ASISTIO'].includes(apt.estado_cita)) {
        upcoming.push(apt);
      } else {
        past.push(apt);
      }
    });
    
    upcoming.sort((a, b) => new Date(a.fecha_hora_cita).getTime() - new Date(b.fecha_hora_cita).getTime());
    past.sort((a, b) => new Date(b.fecha_hora_cita).getTime() - new Date(a.fecha_hora_cita).getTime());
    
    return { upcoming, past };
  }, [historyData]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-sky-50 to-teal-50 dark:from-sky-950/20 dark:to-teal-950/20">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Activity className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Historial Clínico</h2>
              {historyData?.patient && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {getPatientFullName(historyData.patient)}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full rounded-none border-b px-6">
            <TabsTrigger value="overview" className="gap-2">
              <ChartBar className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="appointments" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              Citas ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <User2 className="h-4 w-4" />
              Información
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-140px)]">
            {isLoading ? (
              <LoadingSkeleton />
            ) : error ? (
              <Alert variant="destructive" className="m-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Error al cargar el historial. Por favor, intente nuevamente.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <TabsContent value="overview" className="p-6 space-y-6 mt-0">
                  {/* Estadísticas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      icon={Calendar}
                      label="Total Citas"
                      value={stats.total}
                      color="sky"
                    />
                    <StatCard
                      icon={CheckCircle2}
                      label="Completadas"
                      value={stats.completed}
                      color="emerald"
                    />
                    <StatCard
                      icon={XCircle}
                      label="Canceladas"
                      value={stats.cancelled + stats.noShow}
                      color="amber"
                    />
                    <StatCard
                      icon={Target}
                      label="Asistencia"
                      value={`${stats.rate}%`}
                      color="purple"
                    />
                  </div>

                  {/* Información del paciente */}
                  {historyData?.patient && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User2 className="h-5 w-5" />
                          Datos del Paciente
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {historyData.patient.telefono && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <Phone className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Teléfono</p>
                              <p className="font-medium">{historyData.patient.telefono}</p>
                            </div>
                          </div>
                        )}
                        {historyData.patient.email && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <Mail className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Email</p>
                              <p className="font-medium">{historyData.patient.email}</p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Progreso de satisfacción */}
                  {historyData?.survey_completion_rate !== undefined && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Award className="h-5 w-5" />
                          Satisfacción del Paciente
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              Tasa de respuesta a encuestas
                            </span>
                            <span className="font-semibold">
                              {Math.round((historyData.survey_completion_rate || 0) * 100)}%
                            </span>
                          </div>
                          <Progress 
                            value={(historyData.survey_completion_rate || 0) * 100} 
                            className="h-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="appointments" className="p-6 mt-0">
                  {appointmentsByTime.upcoming.length > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <CalendarDays className="h-5 w-5 text-sky-600" />
                        Próximas Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByTime.upcoming.map((apt, idx) => (
                          <AppointmentTimeline 
                            key={apt.id} 
                            appointment={apt} 
                            isLast={idx === appointmentsByTime.upcoming.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {appointmentsByTime.past.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        Historial de Citas
                      </h3>
                      <div className="space-y-4">
                        {appointmentsByTime.past.map((apt, idx) => (
                          <AppointmentTimeline 
                            key={apt.id} 
                            appointment={apt} 
                            isLast={idx === appointmentsByTime.past.length - 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {appointmentsByTime.upcoming.length === 0 && appointmentsByTime.past.length === 0 && (
                    <div className="text-center py-12">
                      <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        No hay citas registradas
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="details" className="p-6 mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Información Adicional</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Paciente desde</p>
                        <p className="font-semibold">
                          {historyData?.patient?.created_at ? 
                            format(new Date(historyData.patient.created_at), "d 'de' MMMM 'de' yyyy", { locale: es }) : 
                            "No disponible"
                          }
                        </p>
                      </div>
                      
                      {historyData?.appointments && historyData.appointments.length > 0 && (
                        <>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Primera consulta</p>
                            <p className="font-semibold">
                              {formatAppointmentDate(
                                historyData.appointments[historyData.appointments.length - 1].fecha_hora_cita
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">Última consulta</p>
                            <p className="font-semibold">
                              {formatAppointmentDate(historyData.appointments[0].fecha_hora_cita)}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
});

PatientHistoryModal.displayName = "PatientHistoryModal";
export default PatientHistoryModal;