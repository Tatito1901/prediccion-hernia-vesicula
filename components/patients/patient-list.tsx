import React, { useMemo, useCallback, memo, MouseEvent } from "react"; // Añadido MouseEvent
import { PatientData, PatientStatusEnum } from "@/app/dashboard/data-model";
import { Card, CardContent } from "@/components/ui/card";
// Badge no se usa directamente, pero PatientStatus podría usarlo.
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Edit,
  Eye,
  CalendarClock,
  Calendar,
  Phone,
  User,
  // Clipboard, // No usado
  AlertCircle,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock8,
  Mail,
  // MapPin, // No usado
  Activity,
  Stethoscope,
  // FileText, // No usado
  Hash,
  // TrendingUp, // No usado
  // Heart, // No usado
  // Star, // No usado
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
import PatientStatus from "./patient-status"; // Asumimos que este componente existe y es optimizado
import { motion, AnimatePresence } from "framer-motion";

interface PatientListProps {
  patients: PatientData[];
  onViewDetails?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  onMarkPresent?: (patientId: string) => void;
  onReschedule?: (patientId: string) => void;
  onCancel?: (patientId: string) => void;
}

const STATUS_COLORS: Record<PatientStatusEnum, {
  bg: string;
  text: string;
  border: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: { 
    bg: "bg-amber-50", 
    text: "text-amber-900", 
    border: "border-amber-200",
    darkBg: "dark:bg-amber-950/20",
    darkText: "dark:text-amber-300",
    darkBorder: "dark:border-amber-800",
    icon: Clock8,
    gradient: "from-amber-500 to-orange-500"
  },
  [PatientStatusEnum.CONSULTADO]: { 
    bg: "bg-blue-50", 
    text: "text-blue-900", 
    border: "border-blue-200",
    darkBg: "dark:bg-blue-950/20",
    darkText: "dark:text-blue-300",
    darkBorder: "dark:border-blue-800",
    icon: CheckCircle2,
    gradient: "from-blue-500 to-indigo-500"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: { 
    bg: "bg-purple-50", 
    text: "text-purple-900", 
    border: "border-purple-200",
    darkBg: "dark:bg-purple-950/20",
    darkText: "dark:text-purple-300",
    darkBorder: "dark:border-purple-800",
    icon: Activity,
    gradient: "from-purple-500 to-pink-500"
  },
  [PatientStatusEnum.OPERADO]: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-900", 
    border: "border-emerald-200",
    darkBg: "dark:bg-emerald-950/20",
    darkText: "dark:text-emerald-300",
    darkBorder: "dark:border-emerald-800",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-green-500"
  },
  [PatientStatusEnum.NO_OPERADO]: { 
    bg: "bg-red-50", 
    text: "text-red-900", 
    border: "border-red-200",
    darkBg: "dark:bg-red-950/20",
    darkText: "dark:text-red-300",
    darkBorder: "dark:border-red-800",
    icon: XCircle,
    gradient: "from-red-500 to-rose-500"
  },
  [PatientStatusEnum.INDECISO]: { 
    bg: "bg-slate-50", 
    text: "text-slate-900", 
    border: "border-slate-200",
    darkBg: "dark:bg-slate-950/20",
    darkText: "dark:text-slate-300",
    darkBorder: "dark:border-slate-800",
    icon: AlertCircle,
    gradient: "from-slate-500 to-gray-500"
  }
};

const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "Sin fecha";
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "Fecha inválida";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Hoy a las 00:00
    const inputDateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()); // Fecha de entrada a las 00:00

    const diffTime = inputDateOnly.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Mañana";
    if (diffDays === -1) return "Ayer";
    if (diffDays > 1 && diffDays < 7) return `En ${diffDays} días`;
    if (diffDays < -1 && diffDays > -7) return `Hace ${Math.abs(diffDays)} días`;
    
    return format(dateObj, "d MMM yy", { locale: es }); // Formato más corto
  } catch {
    return "Fecha inválida";
  }
};

const getDiagnosisColor = (diagnosis: string | undefined): { bg: string; text: string; border: string } => {
  if (!diagnosis) return { bg: "bg-slate-50 dark:bg-slate-900/20", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" };
  const lower = diagnosis.toLowerCase();
  if (lower.includes("hernia")) return { bg: "bg-blue-50 dark:bg-blue-950/20", text: "text-blue-700 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" };
  if (lower.includes("cole")) return { bg: "bg-purple-50 dark:bg-purple-950/20", text: "text-purple-700 dark:text-purple-300", border: "border-purple-200 dark:border-purple-800" };
  if (lower.includes("eventra")) return { bg: "bg-amber-50 dark:bg-amber-950/20", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" };
  if (lower.includes("apendicitis")) return { bg: "bg-red-50 dark:bg-red-950/20", text: "text-red-700 dark:text-red-300", border: "border-red-200 dark:border-red-800" };
  return { bg: "bg-slate-50 dark:bg-slate-900/20", text: "text-slate-600 dark:text-slate-400", border: "border-slate-200 dark:border-slate-700" };
};

const PatientListItem: React.FC<{
  patient: PatientData;
  onViewDetails?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  onMarkPresent?: (patientId: string) => void;
  onReschedule?: (patientId: string) => void;
  onCancel?: (patientId: string) => void;
  index: number;
}> = memo(({
  patient,
  onViewDetails,
  onEditPatient,
  onScheduleAppointment,
  onMarkPresent,
  onReschedule,
  onCancel,
  index,
}) => {
  const status = patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA;
  const statusConfig = STATUS_COLORS[status];
  const hasSurvey = Boolean(patient.encuesta);
  const diagnosisColor = getDiagnosisColor(patient.diagnostico_principal);

  const age = useMemo(() => {
    if (patient.fecha_nacimiento && typeof patient.fecha_nacimiento === 'string') {
      const birthDate = new Date(patient.fecha_nacimiento);
      if (!isNaN(birthDate.getTime())) {
        const today = new Date();
        let years = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          years--;
        }
        return years >= 0 ? years : patient.edad;
      }
    }
    if (typeof patient.edad === 'number' && patient.edad >= 0) return patient.edad;
    return undefined;
  }, [patient.fecha_nacimiento, patient.edad]);

  const urgencyLevel = useMemo(() => {
    if (status === PatientStatusEnum.PENDIENTE_DE_CONSULTA) return "high";
    if (status === PatientStatusEnum.EN_SEGUIMIENTO) return "medium";
    return "low";
  }, [status]);

  const handleCardClick = useCallback(() => {
    onViewDetails?.(patient.id);
  }, [onViewDetails, patient.id]);

  const stopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "circOut" }}
      whileHover={{ y: -3, transition: { duration: 0.15, ease: "circOut" } }}
      className="relative"
    >
      <Card
        className={cn(
          "overflow-hidden transition-all duration-300 group",
          "bg-white dark:bg-slate-900/80 backdrop-blur-sm", // Sutil efecto translúcido
          "border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
          "hover:shadow-xl dark:hover:shadow-slate-950/50", // Sombra más pronunciada
          urgencyLevel === "high" && "ring-1 sm:ring-2 ring-amber-500/60 dark:ring-amber-600/50 shadow-amber-500/10"
        )}
      >
        <div
          className={cn("absolute left-0 top-0 bottom-0 w-1.5 z-10", statusConfig.gradient)}
          aria-hidden="true"
        />
        
        <div 
          className="pl-3 pr-2 py-3 sm:pl-4 sm:pr-3 sm:py-4 md:pl-5 md:pr-4 md:py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
          onClick={onViewDetails ? handleCardClick : undefined}
          tabIndex={onViewDetails ? 0 : -1}
          onKeyDown={onViewDetails ? (e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(); } : undefined}
          role={onViewDetails ? "button" : undefined}
          style={{ cursor: onViewDetails ? 'pointer' : 'default' }}
        >
          <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0 mb-3 sm:mb-0 w-full sm:w-auto">
              <div className={cn(
                "h-10 w-10 sm:h-12 sm:w-12 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-base font-semibold shrink-0",
                "bg-gradient-to-br shadow-md", statusConfig.gradient, "text-white"
              )}>
                {patient.nombre?.charAt(0).toUpperCase()}{patient.apellidos?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                  <h3 className="font-semibold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate" title={`${patient.nombre} ${patient.apellidos}`}>
                    {patient.nombre} {patient.apellidos}
                  </h3>
                  {urgencyLevel === "high" && (
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger className="flex-shrink-0" onClick={stopPropagation}>
                          <AlertCircle className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-amber-500 animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs sm:text-sm">Requiere atención prioritaria</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <span className="flex items-center gap-1 sm:gap-1.5"><User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{age !== undefined ? `${age}a` : "N/A"}</span>
                  <span className="flex items-center gap-1 sm:gap-1.5"><Hash className="h-3 w-3 sm:h-3.5 sm:w-3.5" /><code className="text-2xs sm:text-xs font-mono">{patient.id.substring(0, 8)}...</code></span>
                  {patient.fecha_registro && <span className="flex items-center gap-1 sm:gap-1.5"><Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{formatDate(patient.fecha_registro)}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 self-start sm:self-center ml-auto sm:ml-0 pl-[calc(2.5rem+0.75rem)] sm:pl-0"> {/* Ajuste pl para avatar */}
              <PatientStatus status={status} surveyCompleted={hasSurvey} size="sm" className="hidden [@media(min-width:400px)]:flex" />
              <PatientStatus status={status} surveyCompleted={hasSurvey} size="icon" className="flex [@media(min-width:400px)]:hidden" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={stopPropagation}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-foreground focus-visible:ring-1 focus-visible:ring-ring" aria-label="Más acciones">
                    <MoreHorizontal className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52" onClick={stopPropagation}>
                  {onViewDetails && <DropdownMenuItem onClick={() => onViewDetails(patient.id)}><Eye className="mr-2 h-4 w-4" />Ver detalles</DropdownMenuItem>}
                  {onEditPatient && <DropdownMenuItem onClick={() => onEditPatient(patient.id)}><Edit className="mr-2 h-4 w-4" />Editar paciente</DropdownMenuItem>}
                  {onScheduleAppointment && !patient.fecha_proxima_cita && <DropdownMenuItem onClick={() => onScheduleAppointment(patient.id)}><CalendarClock className="mr-2 h-4 w-4" />Agendar cita</DropdownMenuItem>}
                  {onMarkPresent && status === PatientStatusEnum.PENDIENTE_DE_CONSULTA && (<> <DropdownMenuSeparator /> <DropdownMenuItem className="!text-green-600 dark:!text-green-400 focus:!bg-green-100 dark:focus:!bg-green-700/30" onClick={() => onMarkPresent(patient.id)}><CheckCircle2 className="mr-2 h-4 w-4" />Marcar presente</DropdownMenuItem></>)}
                  {patient.fecha_proxima_cita && (<> <DropdownMenuSeparator />
                    {onReschedule && <DropdownMenuItem onClick={() => onReschedule(patient.id)}><Calendar className="mr-2 h-4 w-4" />Reagendar</DropdownMenuItem>}
                    {onCancel && <DropdownMenuItem className="!text-red-600 dark:!text-red-400 focus:!bg-red-100 dark:focus:!bg-red-700/30" onClick={() => onCancel(patient.id)}><XCircle className="mr-2 h-4 w-4" />Cancelar cita</DropdownMenuItem>}
                  </>)}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(patient.telefono || patient.email) && (
            <div className="grid grid-cols-1 [@media(min-width:480px)]:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs sm:text-sm">
              {patient.telefono && <a href={`tel:${patient.telefono}`} onClick={stopPropagation} title={`Llamar a ${patient.telefono}`} className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"><Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> <span className="truncate">{patient.telefono}</span></a>}
              {patient.email && <a href={`mailto:${patient.email}`} onClick={stopPropagation} title={`Enviar email a ${patient.email}`} className="flex items-center gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-md bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors truncate"><Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /> <span className="truncate">{patient.email}</span></a>}
            </div>
          )}

          {patient.diagnostico_principal && (
            <div className="mb-3 sm:mb-4">
              <div className={cn("p-2.5 sm:p-3 rounded-lg border", diagnosisColor.bg, diagnosisColor.border)}>
                <div className="flex items-start gap-2 sm:gap-3">
                  <Stethoscope className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 shrink-0", diagnosisColor.text)} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs sm:text-sm font-medium", diagnosisColor.text)} title={patient.diagnostico_principal}>{patient.diagnostico_principal}</p>
                    {patient.diagnostico_principal_detalle && <p className="text-2xs sm:text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={patient.diagnostico_principal_detalle}>{patient.diagnostico_principal_detalle}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {patient.probabilidad_cirugia !== undefined && patient.probabilidad_cirugia !== null && (
            <div className="mb-3 sm:mb-4">
              <div className="flex items-center justify-between mb-1 sm:mb-1.5">
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Prob. Cirugía</span>
                <span className={cn("text-xs sm:text-sm font-bold", patient.probabilidad_cirugia > 70 ? "text-emerald-600 dark:text-emerald-400" : patient.probabilidad_cirugia > 40 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400")}>{patient.probabilidad_cirugia}%</span>
              </div>
              <div className="relative h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <motion.div className={cn("absolute inset-y-0 left-0 rounded-full", patient.probabilidad_cirugia > 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : patient.probabilidad_cirugia > 40 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-600")}
                  initial={{ width: 0 }} animate={{ width: `${patient.probabilidad_cirugia}%` }} transition={{ duration: 0.8, delay: index * 0.08 + 0.2, ease: "circOut" }} />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800/70 gap-2 sm:gap-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs sm:text-xs text-slate-500 dark:text-slate-400">
              {patient.fecha_proxima_cita && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild onClick={stopPropagation}>
                      <span className={cn("flex items-center gap-1", new Date(patient.fecha_proxima_cita).setHours(0,0,0,0) >= new Date().setHours(0,0,0,0) ? "text-green-600 dark:text-green-400 font-medium" : "text-slate-500 dark:text-slate-400")}>
                        <CalendarClock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />{formatDate(patient.fecha_proxima_cita)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent onClick={stopPropagation}><p>Próxima cita: {format(new Date(patient.fecha_proxima_cita), "EEEE, d 'de' MMMM 'de' yyyy 'a las' p", { locale: es })}</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <span className="flex items-center gap-1">
                {hasSurvey ? <><CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" /><span>Encuesta OK</span></> : <><AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-amber-500" /><span>Encuesta Pend.</span></>}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="text-2xs sm:text-xs text-primary hover:text-primary-focus self-end sm:self-center p-1 sm:px-2 sm:py-1" onClick={(e) => { stopPropagation(e); onViewDetails?.(patient.id); }}>
              Ver más<Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-1 sm:ml-1.5" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
});
PatientListItem.displayName = "PatientListItem";

const PatientList: React.FC<PatientListProps> = ({
  patients,
  onViewDetails,
  onEditPatient,
  onScheduleAppointment,
  onMarkPresent,
  onReschedule,
  onCancel,
}) => {
  const handlers = useMemo(() => ({
    onViewDetails, onEditPatient, onScheduleAppointment, onMarkPresent, onReschedule, onCancel,
  }), [onViewDetails, onEditPatient, onScheduleAppointment, onMarkPresent, onReschedule, onCancel]);

  if (!patients || patients.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-700/60 bg-slate-50/30 dark:bg-slate-900/30 backdrop-blur-sm">
          <CardContent className="p-8 sm:p-12 md:p-16 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full mb-4 sm:mb-6 shadow-inner">
              <User className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100 mb-1 sm:mb-2">No hay pacientes para mostrar</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xs sm:max-w-sm mx-auto">Los pacientes aparecerán aquí una vez que sean registrados en el sistema.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <AnimatePresence mode="popLayout">
        {patients.map((patient, index) => (
          <PatientListItem key={patient.id} patient={patient} index={index} {...handlers} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default memo(PatientList);