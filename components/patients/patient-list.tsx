import React, { useMemo, useCallback, memo } from "react";
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  Eye, 
  CalendarClock, 
  Calendar, 
  Phone, 
  User, 
  Clipboard, 
  AlertCircle, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock8,
  Mail,
  MapPin,
  Activity,
  Stethoscope,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PatientStatus from "./patient-status";

interface PatientListProps {
  patients: PatientData[];
  onViewDetails?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  onMarkPresent?: (patientId: string) => void;
  onReschedule?: (patientId: string) => void;
  onCancel?: (patientId: string) => void;
}

// Configuración de colores para estados
const STATUS_COLORS: Record<PatientStatusEnum, {
  bg: string;
  text: string;
  border: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { 
    bg: "bg-amber-50", 
    text: "text-amber-900", 
    border: "border-amber-300",
    darkBg: "dark:bg-amber-950/30",
    darkText: "dark:text-amber-400",
    darkBorder: "dark:border-amber-800",
    icon: Clock8
  },
  [PatientStatusEnum.CONSULTADO]: { 
    bg: "bg-blue-50", 
    text: "text-blue-900", 
    border: "border-blue-300",
    darkBg: "dark:bg-blue-950/30",
    darkText: "dark:text-blue-400",
    darkBorder: "dark:border-blue-800",
    icon: CheckCircle2
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { 
    bg: "bg-purple-50", 
    text: "text-purple-900", 
    border: "border-purple-300",
    darkBg: "dark:bg-purple-950/30",
    darkText: "dark:text-purple-400",
    darkBorder: "dark:border-purple-800",
    icon: Activity
  },
  [PatientStatusEnum.OPERADO]: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-900", 
    border: "border-emerald-300",
    darkBg: "dark:bg-emerald-950/30",
    darkText: "dark:text-emerald-400",
    darkBorder: "dark:border-emerald-800",
    icon: CheckCircle2
  },
  [PatientStatusEnum.NO_OPERADO]: { 
    bg: "bg-red-50", 
    text: "text-red-900", 
    border: "border-red-300",
    darkBg: "dark:bg-red-950/30",
    darkText: "dark:text-red-400",
    darkBorder: "dark:border-red-800",
    icon: XCircle
  },
  [PatientStatusEnum.INDECISO]: { 
    bg: "bg-slate-50", 
    text: "text-slate-900", 
    border: "border-slate-300",
    darkBg: "dark:bg-slate-950/30",
    darkText: "dark:text-slate-400",
    darkBorder: "dark:border-slate-800",
    icon: AlertCircle
  }
};

// Función mejorada para formatear fecha
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "Sin fecha";
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "Fecha inválida";
    return format(dateObj, "d MMM yyyy", { locale: es });
  } catch {
    return "Fecha inválida";
  }
};

// Componente de lista individual memoizado
const PatientListItem: React.FC<{
  patient: PatientData;
  onViewDetails?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  onMarkPresent?: (patientId: string) => void;
  onReschedule?: (patientId: string) => void;
  onCancel?: (patientId: string) => void;
}> = memo(({
  patient,
  onViewDetails,
  onEditPatient,
  onScheduleAppointment,
  onMarkPresent,
  onReschedule,
  onCancel,
}) => {
  const status = patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA;
  const statusConfig = STATUS_COLORS[status];
  const hasSurvey = Boolean(patient.encuesta);
  
  // Calcular edad si hay fecha de nacimiento
  const age = useMemo(() => {
    if (patient.fecha_nacimiento && typeof patient.fecha_nacimiento === 'string') {
      const birthDate = new Date(patient.fecha_nacimiento);
      if (!isNaN(birthDate.getTime())) { // Verificar que la fecha sea válida tras el parsing
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        return years >= 0 ? years : patient.edad; // Devolver la edad calculada o la edad existente si el cálculo es negativo
      }
    }
    // Si no hay fecha_nacimiento válida, o si es un número (edad precalculada), usar patient.edad
    if (typeof patient.edad === 'number' && patient.edad >= 0) {
      return patient.edad;
    }
    return undefined; // O algún valor por defecto como "N/A" o null si se prefiere
  }, [patient.fecha_nacimiento, patient.edad]);

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200",
        "hover:shadow-md cursor-pointer",
        "border-l-4",
        statusConfig.border,
        statusConfig.darkBorder,
        "group"
      )}
      onClick={() => onViewDetails?.(patient.id)}
    >
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Sección principal de información */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">
                  {patient.nombre} {patient.apellidos}
                </h3>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {age ? `${age} años` : "Edad no disp."}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">•</span>
                  {patient.diagnostico_principal && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className={cn(
                              "py-0.5 px-1.5 text-xs font-medium cursor-help border-opacity-70",
                              patient.diagnostico_principal.includes("HERNIA") ? "bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700" :
                              patient.diagnostico_principal.includes("COLE") ? "bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700" :
                              patient.diagnostico_principal.includes("EVENTRA") ? "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700" :
                              "bg-slate-50 text-slate-600 border-slate-300 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700"
                            )}
                          >
                            <Stethoscope className="h-3 w-3 mr-1" />
                            {patient.diagnostico_principal.length > 20 ? `${patient.diagnostico_principal.substring(0, 20)}...` : patient.diagnostico_principal}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-sm font-medium">{patient.diagnostico_principal}</p>
                          {patient.diagnostico_principal_detalle && <p className="text-xs mt-1 text-muted-foreground">{patient.diagnostico_principal_detalle}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  ID: {patient.id.slice(0,8)}
                </div>
              </div>
              
              <PatientStatus
                status={status}
                surveyCompleted={hasSurvey}
              />
            </div>

            {/* Información de contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              {patient.telefono && (
                <a
                  href={`tel:${patient.telefono}`}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{patient.telefono}</span>
                </a>
              )}
              {patient.email && (
                <a
                  href={`mailto:${patient.email}`}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{patient.email}</span>
                </a>
              )}
            </div>

            {/* Diagnóstico y probabilidad */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {patient.diagnostico_principal && (
                <div className="flex items-start gap-2">
                  <Stethoscope className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Diagnóstico
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                      {patient.diagnostico_principal}
                    </p>
                  </div>
                </div>
              )}
              
              {patient.probabilidad_cirugia !== undefined && patient.probabilidad_cirugia !== null && (
                <div className="flex items-start gap-2">
                  <Activity className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Probabilidad de cirugía
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-300",
                            patient.probabilidad_cirugia > 70 ? "bg-emerald-500" : 
                            patient.probabilidad_cirugia > 40 ? "bg-amber-500" : 
                            "bg-red-500"
                          )}
                          style={{ width: `${patient.probabilidad_cirugia}%` }}
                        />
                      </div>
                      <span className={cn(
                        "text-sm font-medium min-w-[3ch]",
                        patient.probabilidad_cirugia > 70 ? "text-emerald-600 dark:text-emerald-500" :
                        patient.probabilidad_cirugia > 40 ? "text-amber-600 dark:text-amber-500" :
                        "text-red-600 dark:text-red-500"
                      )}>
                        {patient.probabilidad_cirugia}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fechas */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Registro: {formatDate(patient.fecha_registro)}
              </span>
              {patient.fecha_proxima_cita && (
                <>
                  <span className="text-slate-400">•</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "flex items-center gap-1 cursor-help",
                          new Date(patient.fecha_proxima_cita) > new Date() ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-500 dark:text-slate-400"
                        )}>
                          <CalendarClock className="h-3.5 w-3.5" />
                          Próx. Rev: {format(new Date(patient.fecha_proxima_cita), "d MMM yy", { locale: es })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Próxima revisión: {format(new Date(patient.fecha_proxima_cita), "PPPP", { locale: es })}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
              {patient.fecha_primera_consulta && (
                <span className="flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Primera consulta: {formatDate(patient.fecha_primera_consulta)}
                </span>
              )}
            </div>
          </div>

          {/* Sección de acciones */}
          <div 
            className={cn(
              "flex items-center px-4 border-l",
              statusConfig.bg,
              statusConfig.darkBg,
              "border-slate-200 dark:border-slate-700"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <TooltipProvider>
                {onViewDetails && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onViewDetails(patient.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Ver detalles
                    </TooltipContent>
                  </Tooltip>
                )}

                {onScheduleAppointment && !patient.fecha_proxima_cita && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => onScheduleAppointment(patient.id)}
                      >
                        <CalendarClock className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      Agendar cita
                    </TooltipContent>
                  </Tooltip>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {onMarkPresent && status === PatientStatusEnum.PENDIENTE_DE_CONSULTA && (
                          <>
                            <DropdownMenuItem 
                              className="text-green-600 dark:text-green-400"
                              onClick={() => onMarkPresent(patient.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marcar presente
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        
                        {onReschedule && patient.fecha_proxima_cita && (
                          <DropdownMenuItem onClick={() => onReschedule(patient.id)}>
                            <Calendar className="h-4 w-4 mr-2" />
                            Reagendar
                          </DropdownMenuItem>
                        )}
                        
                        {onCancel && patient.fecha_proxima_cita && (
                          <DropdownMenuItem 
                            className="text-red-600 dark:text-red-400"
                            onClick={() => onCancel(patient.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar cita
                          </DropdownMenuItem>
                        )}
                        
                        {onEditPatient && (
                          <>
                            {(onReschedule || onCancel) && <DropdownMenuSeparator />}
                            <DropdownMenuItem onClick={() => onEditPatient(patient.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar paciente
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Más opciones
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PatientListItem.displayName = "PatientListItem";

// Componente principal
const PatientList: React.FC<PatientListProps> = ({
  patients,
  onViewDetails,
  onEditPatient,
  onScheduleAppointment,
  onMarkPresent,
  onReschedule,
  onCancel,
}) => {
  // Memoizar handlers para evitar re-renders
  const handlers = useMemo(() => ({
    onViewDetails,
    onEditPatient,
    onScheduleAppointment,
    onMarkPresent,
    onReschedule,
    onCancel,
  }), [onViewDetails, onEditPatient, onScheduleAppointment, onMarkPresent, onReschedule, onCancel]);

  if (!patients || patients.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 dark:border-slate-700">
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No hay pacientes para mostrar
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Los pacientes aparecerán aquí una vez que sean registrados en el sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {patients.map((patient) => (
        <PatientListItem
          key={patient.id}
          patient={patient}
          {...handlers}
        />
      ))}
    </div>
  );
};

export default memo(PatientList);