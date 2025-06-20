// appointment-history.tsx - Versión optimizada y simplificada
import { useEffect } from "react";
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CalendarClock,
  AlertCircle,
  Activity,
  Clock,
  CheckCircle2,
  FileText,
  BarChart3,
  Target,
  History
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { AppointmentStatusEnum, type AppointmentData } from "@/app/dashboard/data-model";

// Configuración estática
const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    className: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300",
    icon: Clock,
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    icon: CalendarClock,
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En espera",
    className: "bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
    icon: CalendarClock,
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    className: "bg-white dark:bg-slate-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300",
    icon: CheckCircle2,
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    className: "bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
    icon: AlertCircle,
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No asistió",
    className: "bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300",
    icon: AlertCircle,
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    className: "bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300",
    icon: Calendar,
  },
};

// Utilidades simplificadas
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return format(new Date(), "dd MMM yyyy HH:mm", { locale: es });
    return format(date, "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    return format(new Date(), "dd MMM yyyy HH:mm", { locale: es });
  }
};

const formatDisplayDate = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
    if (!isValid(date)) return "Fecha inválida";
    return format(date, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
  } catch {
    return "Fecha inválida";
  }
};

const formatTime = (time: string): string => {
  if (!time?.includes(':')) return "---";
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  if (isNaN(hour) || isNaN(parseInt(minutes, 10))) return "---";
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minutes.padStart(2, '0')} ${period}`;
};

// Tipos
interface PatientAppointmentsListProps {
  patientId: string;
  showStats?: boolean;
  maxItems?: number;
  className?: string;
}

interface AppointmentStats {
  total: number;
  completadas: number;
  programadas: number;
  canceladas: number;
  noAsistio: number;
  completionRate: number;
  attendanceRate: number;
}

// Componentes UI
const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  className
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}) => (
  <div className={cn(
    "p-4 rounded-xl border shadow-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700",
    className
  )}>
    <div className="flex items-start justify-between">
      <div className="space-y-2 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
          {title}
        </p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/60">
        <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
      </div>
    </div>
  </div>
);

const AppointmentCard = ({ appointment }: { appointment: AppointmentData }) => {
  const fechaFormateada = formatDisplayDate(appointment.fechaConsulta);
  const statusConfig = STATUS_CONFIG[appointment.estado as AppointmentStatusEnum] || 
                      STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="shadow-sm bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 backdrop-blur-sm rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {fechaFormateada}
            </CardTitle>
            <CardDescription className="text-sm mt-1.5 flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock size={12} />
              {formatTime(appointment.horaConsulta)}
              {appointment.doctor && (
                <>
                  <span>•</span>
                  <span>Dr(a). {appointment.doctor}</span>
                </>
              )}
            </CardDescription>
          </div>
          
          <Badge className={cn(
            "text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5",
            statusConfig.className
          )}>
            <StatusIcon size={12} />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {appointment.motivoConsulta && appointment.motivoConsulta !== "N/A" && (
          <div className="flex gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0">
              <FileText size={16} className="text-slate-600 dark:text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium mb-1">
                Motivo de consulta
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                {appointment.motivoConsulta}
              </p>
            </div>
          </div>
        )}
        
        <div className="pt-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <Calendar size={12} />
          <span>Registrado: {appointment.created_at ? formatDateTime(appointment.created_at) : 'Fecha actual'}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <CalendarClock className="h-12 w-12 text-blue-500 animate-pulse mb-4" />
        <div className="absolute -inset-2 bg-blue-500/20 rounded-full animate-ping" />
      </div>
      <p className="text-base text-slate-600 dark:text-slate-400 mb-4 font-medium">
        Cargando historial de citas...
      </p>
      <Progress value={75} className="h-2 w-64" />
    </div>
    
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800/50 animate-pulse">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-16" />
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-12" />
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-20" />
            </div>
            <div className="h-12 w-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
    
    {Array.from({ length: 3 }, (_, i) => (
      <Card key={i} className="p-4 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20" />
        </div>
        <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
      </Card>
    ))}
  </div>
);

// Componente principal
export const AppointmentHistory: React.FC<PatientAppointmentsListProps> = ({
  patientId,
  showStats = true,
  maxItems,
  className
}) => {
  const appointments = useAppointmentStore(state => state.appointments);
  const isLoadingAppointments = useAppointmentStore(state => state.isLoading);
  const errorAppointments = useAppointmentStore(state => state.error);
  const fetchAppointments = useAppointmentStore(state => state.fetchAppointments);
  
  // Cargar citas
  useEffect(() => {
    if (!appointments?.length && !isLoadingAppointments) {
      fetchAppointments();
    }
  }, [appointments?.length, isLoadingAppointments, fetchAppointments]);

  // Filtrar citas del paciente
  const patientAppointments = appointments?.filter(app => app.patientId === patientId)
    .sort((a, b) => new Date(b.fechaConsulta).getTime() - new Date(a.fechaConsulta).getTime())
    .slice(0, maxItems) || [];

  // Calcular estadísticas
  const calculateStats = (appointmentsList: AppointmentData[]): AppointmentStats => {
    if (!appointmentsList.length) {
      return {
        total: 0,
        completadas: 0,
        programadas: 0,
        canceladas: 0,
        noAsistio: 0,
        completionRate: 0,
        attendanceRate: 0,
      };
    }

    const counts = appointmentsList.reduce((acc, app) => {
      const estado = app.estado as AppointmentStatusEnum;
      acc[estado] = (acc[estado] || 0) + 1;
      return acc;
    }, {} as Record<AppointmentStatusEnum, number>);

    const completadas = counts[AppointmentStatusEnum.COMPLETADA] || 0;
    const noAsistio = counts[AppointmentStatusEnum.NO_ASISTIO] || 0;
    const canceladas = counts[AppointmentStatusEnum.CANCELADA] || 0;
    const programadas = (counts[AppointmentStatusEnum.PROGRAMADA] || 0) +
                       (counts[AppointmentStatusEnum.CONFIRMADA] || 0) +
                       (counts[AppointmentStatusEnum.PRESENTE] || 0) +
                       (counts[AppointmentStatusEnum.REAGENDADA] || 0);

    const totalFinalizadas = completadas + noAsistio + canceladas;
    const completionRate = totalFinalizadas > 0 ? (completadas / totalFinalizadas) * 100 : 0;
    const attendanceRate = (completadas + noAsistio) > 0 ? (completadas / (completadas + noAsistio)) * 100 : 0;

    return {
      total: appointmentsList.length,
      completadas,
      programadas,
      canceladas,
      noAsistio,
      completionRate: Math.round(completionRate),
      attendanceRate: Math.round(attendanceRate),
    };
  };

  const statistics = calculateStats(patientAppointments);

  if (isLoadingAppointments) {
    return <LoadingSkeleton />;
  }

  if (errorAppointments) {
    return (
      <Alert variant="destructive" className="animate-in fade-in-0 shadow-lg">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error al cargar el historial</AlertTitle>
        <AlertDescription>
          {errorAppointments.message || "Ocurrió un error al cargar las citas del paciente."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Estadísticas */}
      {showStats && (
        <Card className="shadow-lg border bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Resumen del Paciente</CardTitle>
                <CardDescription className="text-sm">
                  Análisis completo de {statistics.total} cita{statistics.total !== 1 ? 's' : ''} registrada{statistics.total !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total de citas"
              value={statistics.total}
              subtitle="Historial completo"
              icon={BarChart3}
            />
            
            <StatCard
              title="Completadas"
              value={statistics.completadas}
              subtitle={`${statistics.completionRate}% tasa de éxito`}
              icon={CheckCircle2}
            />
            
            <StatCard
              title="Programadas"
              value={statistics.programadas}
              subtitle="Próximas citas"
              icon={CalendarClock}
            />
            
            <StatCard
              title="Asistencia"
              value={`${statistics.attendanceRate}%`}
              subtitle={`${statistics.noAsistio} inasistencia${statistics.noAsistio !== 1 ? 's' : ''}`}
              icon={Target}
            />
          </CardContent>
        </Card>
      )}

      {/* Lista de citas */}
      {patientAppointments.length === 0 ? (
        <Card className="text-center py-16 shadow-lg bg-white dark:bg-slate-900">
          <CardContent className="space-y-6">
            <div className="relative">
              <div className="h-20 w-20 mx-auto rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                <Calendar className="h-10 w-10 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="absolute -inset-2 bg-slate-300/50 dark:bg-slate-600/50 rounded-full animate-ping opacity-20" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Sin historial de citas
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                Este paciente no tiene citas registradas en el sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Citas
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Registro cronológico de todas las consultas
              </p>
            </div>
            {maxItems && patientAppointments.length >= maxItems && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                Mostrando {maxItems} de {statistics.total}
              </Badge>
            )}
          </div>
          
          <div className="grid gap-4">
            {patientAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};