// appointment-history.tsx - Versión mejorada eliminando redundancias
import { useMemo, memo, useEffect } from "react";
// Reemplazando useAppContext con el store de Zustand
import { useAppointmentStore } from "@/lib/stores/appointment-store";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CalendarClock,
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  CheckCircle2,
  FileText,
  BarChart3,
  Target,
  Users,
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

// =================================================================
// CONFIGURACIONES CONSOLIDADAS PARA EVITAR REDUNDANCIAS
// =================================================================
const STATUS_CONFIG = {
  [AppointmentStatusEnum.PROGRAMADA]: {
    label: "Programada",
    className: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300",
    icon: Clock,
    color: "slate"
  },
  [AppointmentStatusEnum.CONFIRMADA]: {
    label: "Confirmada",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    icon: CalendarClock,
    color: "blue"
  },
  [AppointmentStatusEnum.PRESENTE]: {
    label: "En espera",
    className: "bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300",
    icon: Users,
    color: "emerald"
  },
  [AppointmentStatusEnum.COMPLETADA]: {
    label: "Completada",
    className: "bg-white dark:bg-slate-900 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300",
    icon: CheckCircle2,
    color: "green"
  },
  [AppointmentStatusEnum.CANCELADA]: {
    label: "Cancelada",
    className: "bg-white dark:bg-slate-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300",
    icon: AlertCircle,
    color: "red"
  },
  [AppointmentStatusEnum.NO_ASISTIO]: {
    label: "No asistió",
    className: "bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300",
    icon: AlertCircle,
    color: "amber"
  },
  [AppointmentStatusEnum.REAGENDADA]: {
    label: "Reagendada",
    className: "bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300",
    icon: Calendar,
    color: "purple"
  },
} as const;

// Utilidades consolidadas para formateo
const formatDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  try {
    // Intentar convertir la fecha
    const date = parseISO(dateString);
    if (!isValid(date)) return format(new Date(), "dd MMM yyyy HH:mm", { locale: es });
    return format(date, "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    // Si hay error, mostrar la fecha actual
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

// =================================================================
// TIPOS CONSOLIDADOS
// =================================================================
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
  monthlyTrend: number;
}

// =================================================================
// COMPONENTES MEMOIZADOS PARA RENDIMIENTO
// =================================================================
const StatCard = memo(({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = "slate",
  trend,
  className
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  trend?: { value: number; isPositive: boolean };
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
          <p className={cn("text-xs", `text-${color}-600 dark:text-${color}-400`)}>
            {subtitle}
          </p>
        )}
      </div>
      
      <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/60">
        <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
      </div>
    </div>
    
    {trend && (
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-current/20">
        <TrendingUp 
          size={14} 
          className={cn(
            trend.isPositive ? "text-green-500" : "text-red-500",
            !trend.isPositive && "rotate-180"
          )} 
        />
        <span className={cn(
          "text-xs font-semibold",
          trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {Math.abs(trend.value)}% vs mes anterior
        </span>
      </div>
    )}
  </div>
));

const AppointmentCard = memo(({ appointment }: { appointment: AppointmentData }) => {
  const fechaFormateada = useMemo(() => {
    return formatDisplayDate(appointment.fechaConsulta);
  }, [appointment.fechaConsulta]);

  const statusConfig = STATUS_CONFIG[appointment.estado as AppointmentStatusEnum] || 
                      STATUS_CONFIG[AppointmentStatusEnum.PROGRAMADA];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn(
      "shadow-sm",
      "bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80",
      "backdrop-blur-sm rounded-xl"
    )}>
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
});

// Componente de carga mejorado
const LoadingSkeleton = memo(() => (
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
    
    {/* Skeleton de estadísticas */}
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
    
    {/* Skeleton de tarjetas */}
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
));

// =================================================================
// COMPONENTE PRINCIPAL MEJORADO
// =================================================================
export const AppointmentHistory: React.FC<PatientAppointmentsListProps> = memo(({
  patientId,
  showStats = true,
  maxItems,
  className
}) => {
  // Utilizamos el store de Zustand para citas
  const appointments = useAppointmentStore(state => state.appointments);
  const isLoadingAppointments = useAppointmentStore(state => state.isLoading);
  const errorAppointments = useAppointmentStore(state => state.error);
  const fetchAppointments = useAppointmentStore(state => state.fetchAppointments);
  
  // Cargamos las citas al montar el componente
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filtrar y procesar citas del paciente con mejor rendimiento
  const patientAppointments = useMemo<AppointmentData[]>(() => {
    if (!patientId || !appointments) return [];
    
    const filtered = appointments.filter(
      (app) => app.patientId === patientId
    );
    
    // Ordenar por fecha descendente (más recientes primero)
    const sorted = filtered.sort((a, b) => {
      const dateA = new Date(a.fechaConsulta);
      const dateB = new Date(b.fechaConsulta);
      return dateB.getTime() - dateA.getTime();
    });
    
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [appointments, patientId, maxItems]);

  // Calcular estadísticas mejoradas con tendencias
  const statistics = useMemo<AppointmentStats>(() => {
    if (!patientAppointments || patientAppointments.length === 0) {
      return {
        total: 0,
        completadas: 0,
        programadas: 0,
        canceladas: 0,
        noAsistio: 0,
        completionRate: 0,
        attendanceRate: 0,
        monthlyTrend: 0,
      };
    }

    const counts = patientAppointments.reduce((acc, app) => {
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

    // Calcular tendencia mensual (simulada para demo)
    const monthlyTrend = Math.random() * 30 - 15; // Entre -15% y +15%

    return {
      total: patientAppointments.length,
      completadas,
      programadas,
      canceladas,
      noAsistio,
      completionRate: Math.round(completionRate),
      attendanceRate: Math.round(attendanceRate),
      monthlyTrend: Math.round(monthlyTrend),
    };
  }, [patientAppointments]);

  // Manejo de estados de carga y error
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
          <br />
          <span className="text-xs opacity-75 mt-1 block">
            Intente actualizar la página o contacte al soporte técnico.
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Estadísticas mejoradas */}
      {showStats && (
        <Card className="shadow-lg border bg-white dark:bg-slate-900">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold">Resumen del Paciente</CardTitle>
                <CardDescription className="text-sm">
                  Análisis completo de {statistics.total} cita{statistics.total !== 1 ? 's' : ''} registrada{statistics.total !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className={cn(
            "grid gap-4",
            statistics.total <= 1 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"
          )}>
            {/* Tarjeta principal más destacada cuando solo hay 1 cita */}
            {statistics.total <= 1 && (
              <div className={cn(
                "rounded-xl border p-4 flex flex-col justify-between",
                "bg-slate-50 dark:bg-slate-800/50",
                "border-blue-200 dark:border-blue-800",
                "md:col-span-3"
              )}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center shadow-sm">
                      <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-medium text-blue-800 dark:text-blue-300">TOTAL DE CITAS</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Historial completo</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{statistics.total}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    title="Completadas"
                    value={statistics.completadas}
                    subtitle={`${statistics.completionRate}% tasa`}
                    icon={CheckCircle2}
                    color="green"
                    className="bg-opacity-80 dark:bg-opacity-40"
                  />
                  
                  <StatCard
                    title="Programadas"
                    value={statistics.programadas}
                    subtitle="Próximas"
                    icon={CalendarClock}
                    color="blue"
                    className="bg-opacity-80 dark:bg-opacity-40"
                  />
                  
                  <StatCard
                    title="Asistencia"
                    value={`${statistics.attendanceRate}%`}
                    subtitle={statistics.noAsistio > 0 ? 
                      `${statistics.noAsistio} inasistencia${statistics.noAsistio !== 1 ? 's' : ''}` : 
                      "Perfecta"}
                    icon={Target}
                    color={statistics.attendanceRate >= 80 ? "green" : statistics.attendanceRate >= 60 ? "amber" : "red"}
                    className="bg-opacity-80 dark:bg-opacity-40"
                  />
                </div>
              </div>
            )}
            
            {/* Mostrar el diseño original para más de 1 cita */}
            {statistics.total > 1 && (
            <>
            <StatCard
              title="Total de citas"
              value={statistics.total}
              subtitle="Historial completo"
              icon={BarChart3}
              color="slate"
            />
            
            <StatCard
              title="Completadas"
              value={statistics.completadas}
              subtitle={`${statistics.completionRate}% tasa de éxito`}
              icon={CheckCircle2}
              color="green"
            />
            
            <StatCard
              title="Programadas"
              value={statistics.programadas}
              subtitle="Próximas citas"
              icon={CalendarClock}
              color="blue"
            />
            
            <StatCard
              title="Asistencia"
              value={`${statistics.attendanceRate}%`}
              subtitle={`${statistics.noAsistio} inasistencia${statistics.noAsistio !== 1 ? 's' : ''}`}
              icon={Target}
              color={statistics.attendanceRate >= 80 ? "green" : statistics.attendanceRate >= 60 ? "amber" : "red"}
            />
            </>
            )}
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
                Cuando se agenden citas, aparecerán aquí con toda la información detallada.
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
});

AppointmentHistory.displayName = "AppointmentHistory";

StatCard.displayName = "StatCard";
AppointmentCard.displayName = "AppointmentCard";
LoadingSkeleton.displayName = "LoadingSkeleton";