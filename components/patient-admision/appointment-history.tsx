import { useMemo, type ReactElement } from "react";
import { useAppContext } from "@/lib/context/app-context";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale";
import { Separator } from "@/components/ui/separator"; // (Opcional, depende si lo usas)
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  CalendarClock,
  Info,
  CheckCircle2,
  XCircle,
  Clock8,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

import {
  AppointmentStatusEnum,
  type AppointmentData,
} from "@/app/dashboard/data-model";

interface PatientAppointmentsListProps {
  patientId: string;
}

/** 
 * Retorna la clase de estilos para el badge según el estado.
 * Usa directamente AppointmentStatusEnum para mayor seguridad de tipado.
 */
const getStatusBadgeStyle = (
  status: AppointmentStatusEnum
): string => {
  switch (status) {
    case AppointmentStatusEnum.PROGRAMADA:
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case AppointmentStatusEnum.CONFIRMADA:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case AppointmentStatusEnum.CANCELADA:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    case AppointmentStatusEnum.COMPLETADA:
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
    case AppointmentStatusEnum.NO_ASISTIO:
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case AppointmentStatusEnum.PRESENTE:
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300";
    case AppointmentStatusEnum.REAGENDADA:
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
};

/** 
 * Retorna el icono correspondiente a cada estado. 
 * Usa AppointmentStatusEnum como tipo para evitar strings sueltos.
 */
const getStatusIcon = (status: AppointmentStatusEnum): ReactElement => {
  switch (status) {
    case AppointmentStatusEnum.COMPLETADA:
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case AppointmentStatusEnum.CANCELADA:
      return <XCircle className="h-4 w-4 text-red-600" />;
    case AppointmentStatusEnum.REAGENDADA:
      return <Calendar className="h-4 w-4 text-indigo-600" />;
    case AppointmentStatusEnum.NO_ASISTIO:
      return <Clock8 className="h-4 w-4 text-yellow-600" />;
    default:
      return <Info className="h-4 w-4 text-slate-600" />;
  }
};

/**
 * Formatea un string ISO de fecha/hora a "dd MMM yyyy HH:mm".
 * Devuelve "N/A" si es null/undefined, o "Fecha inválida" si no parsea.
 */
const formatDisplayDateTime = (dateString: string | null): string => {
  if (!dateString) return "N/A";
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return "Fecha inválida";
    return format(date, "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    return "Fecha inválida";
  }
};

/**
 * Componente memoizado para representar una tarjeta individual de cita.
 * Recibe un AppointmentData completo y sólo re-renderiza si cambian sus props.
 */
const AppointmentCard = ({
  appointment,
}: {
  appointment: AppointmentData;
}) => {
  // Parseo y formateo de fecha para el título
  const fechaFormateada = useMemo(() => {
    const dateObj = appointment.fechaConsulta instanceof Date ? appointment.fechaConsulta : parseISO(String(appointment.fechaConsulta));
    if (!isValid(dateObj)) return "Fecha inválida";
    return format(dateObj, "eeee, dd 'de' MMMM 'de' yyyy", { locale: es });
  }, [appointment.fechaConsulta]);

  const estadoEnum = appointment
    .estado as AppointmentStatusEnum;

  return (
    <Card className="animate-in fade-in-0 slide-in-from-bottom-5 duration-300 ease-out">
      <CardHeader className="flex justify-between items-start pb-2">
        <div>
          <CardTitle className="text-base">{fechaFormateada}</CardTitle>
          <CardDescription className="text-sm">
            Hora: {appointment.horaConsulta} | Dr(a). {appointment.doctor}
          </CardDescription>
        </div>
        <Badge
          className={cn(
            "flex items-center gap-1 px-2 py-1 text-xs",
            getStatusBadgeStyle(estadoEnum)
          )}
        >
          {getStatusIcon(estadoEnum)}
          {estadoEnum.replace(/_/g, " ").toUpperCase()}
        </Badge>
      </CardHeader>
      <CardContent className="text-sm">
        {appointment.motivoConsulta && (
          <p>
            <strong>Motivo:</strong> {appointment.motivoConsulta}
          </p>
        )}
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Fecha/Hora agendada:{" "}
          {format(appointment.fechaConsulta, "dd MMM yyyy", { locale: es })} {appointment.horaConsulta}
        </p>
      </CardContent>
      <CardFooter>
        {/* Aquí podrías poner botones o acciones adicionales si se requieren */}
      </CardFooter>
    </Card>
  );
};

/** 
 * Componente principal que muestra el historial de citas de un paciente.
 */
export const AppointmentHistory: React.FC<PatientAppointmentsListProps> = ({
  patientId,
}) => {
  const {
    appointments,
    isLoadingAppointments,
    errorAppointments,
  } = useAppContext();

  /**
   * Filtra sólo las citas que corresponden al paciente.
   * Dependencias: appointments o patientId.
   */
  const patientAppointments = useMemo<AppointmentData[]>(() => {
    if (!patientId || !appointments) return [];
    return appointments.filter(
      (app) =>
        app.patientId === patientId || app.raw_patient_id === patientId
    );
  }, [appointments, patientId]);

  /**
   * Calcula las estadísticas básicas de estado de citas para el paciente.
   */
  const statistics = useMemo(() => {
    if (!patientAppointments || patientAppointments.length === 0) {
      return {
        total: 0,
        completadas: 0,
        programadas: 0,
        canceladas: 0,
        noAsistio: 0,
      };
    }

    // Inicializamos contador en cero para cada estado
    const counts: Record<AppointmentStatusEnum, number> = {
      [AppointmentStatusEnum.COMPLETADA]: 0,
      [AppointmentStatusEnum.PROGRAMADA]: 0,
      [AppointmentStatusEnum.CONFIRMADA]: 0,
      [AppointmentStatusEnum.PRESENTE]: 0,
      [AppointmentStatusEnum.REAGENDADA]: 0,
      [AppointmentStatusEnum.CANCELADA]: 0,
      [AppointmentStatusEnum.NO_ASISTIO]: 0,
    };

    // Recorremos para contar cada estado
    patientAppointments.forEach((app) => {
      const estado = app.estado as AppointmentStatusEnum;
      if (counts[estado] !== undefined) {
        counts[estado]++;
      }
    });

    return {
      total: patientAppointments.length,
      completadas: counts[AppointmentStatusEnum.COMPLETADA],
      programadas:
        counts[AppointmentStatusEnum.PROGRAMADA] +
        counts[AppointmentStatusEnum.CONFIRMADA] +
        counts[AppointmentStatusEnum.PRESENTE] +
        counts[AppointmentStatusEnum.REAGENDADA],
      canceladas: counts[AppointmentStatusEnum.CANCELADA],
      noAsistio: counts[AppointmentStatusEnum.NO_ASISTIO],
    };
  }, [patientAppointments]);

  // Render de loading
  if (isLoadingAppointments) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex flex-col items-center justify-center py-8">
          <CalendarClock className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-base text-muted-foreground">
            Cargando citas del paciente...
          </p>
          <Progress value={50} className="h-1 w-56 mt-3" />
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Render de error global
  if (errorAppointments) {
    return (
      <Alert variant="destructive" className="m-4 animate-in fade-in-0">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle>Error al cargar citas</AlertTitle>
        <AlertDescription className="mb-3">
          {errorAppointments.message || "Ocurrió un error desconocido."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-1 md:p-4">
      {/* Sección de estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de citas del paciente</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md shadow-sm">
            <p className="text-xs text-muted-foreground">Total de citas</p>
            <p className="text-xl font-bold">{statistics.total}</p>
          </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-md shadow-sm">
            <p className="text-xs text-green-700 dark:text-green-300">
              Completadas
            </p>
            <p className="text-xl font-bold text-green-700 dark:text-green-300">
              {statistics.completadas}
            </p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md shadow-sm">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Programadas/Pendientes
            </p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {statistics.programadas}
            </p>
          </div>
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-md shadow-sm">
            <p className="text-xs text-red-700 dark:text-red-300">
              Canceladas
            </p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">
              {statistics.canceladas}
            </p>
          </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-md shadow-sm">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              No asistió
            </p>
            <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
              {statistics.noAsistio}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Si no hay citas para este paciente */}
      {patientAppointments.length === 0 ? (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Este paciente no tiene citas registradas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <h3 className="text-lg font-semibold">Historial de citas</h3>
          <div className="space-y-4 mt-4">
            {patientAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
