import React, { FC, memo, useRef, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  FileText,
  Share2,
  Edit,
  ClipboardList,
  Eye,
  CalendarDays,
  User,
  Phone,
  Mail,
  Stethoscope,
  Activity,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PatientData } from "@/app/dashboard/data-model";
import { PatientStatusEnum } from "@/app/dashboard/data-model";
import PatientStatus from "./patient-status";
import { cn } from "@/lib/utils";

// ————————
// 1. Hook para long press optimizado
// ————————
function useLongPress(
  onLongPress: () => void,
  ms = 500
): {
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
} {
  const timeout = useRef<number | undefined>(undefined);
  const start = useCallback(() => {
    timeout.current = window.setTimeout(onLongPress, ms);
  }, [onLongPress, ms]);
  const clear = useCallback(() => {
    window.clearTimeout(timeout.current);
  }, []);
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
  };
}

// ————————
// 2. Props del contenedor de tarjetas
// ————————
export interface PatientCardViewProps {
  patients: PatientData[];
  loading?: boolean;
  onSelectPatient: (p: PatientData) => void;
  onShareSurvey?: (p: PatientData) => void;
  onAnswerSurvey?: (p: PatientData) => void;
  onEditPatient?: (p: PatientData) => void;
}

// ————————
// 3. Configuración de colores para estados
// ————————
const STATUS_ACCENT_COLORS: Record<PatientStatusEnum, {
  accent: string;
  bg: string;
  hover: string;
  gradient: string;
}> = {
  [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: {
    accent: "border-l-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    hover: "hover:bg-amber-100 dark:hover:bg-amber-950/30",
    gradient: "from-amber-500/10 to-transparent"
  },
  [PatientStatusEnum.CONSULTADO]: {
    accent: "border-l-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    hover: "hover:bg-blue-100 dark:hover:bg-blue-950/30",
    gradient: "from-blue-500/10 to-transparent"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    accent: "border-l-purple-500",
    bg: "bg-purple-50 dark:bg-purple-950/20",
    hover: "hover:bg-purple-100 dark:hover:bg-purple-950/30",
    gradient: "from-purple-500/10 to-transparent"
  },
  [PatientStatusEnum.OPERADO]: {
    accent: "border-l-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950/20",
    hover: "hover:bg-emerald-100 dark:hover:bg-emerald-950/30",
    gradient: "from-emerald-500/10 to-transparent"
  },
  [PatientStatusEnum.NO_OPERADO]: {
    accent: "border-l-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    hover: "hover:bg-red-100 dark:hover:bg-red-950/30",
    gradient: "from-red-500/10 to-transparent"
  },
  [PatientStatusEnum.INDECISO]: {
    accent: "border-l-slate-500",
    bg: "bg-slate-50 dark:bg-slate-950/20",
    hover: "hover:bg-slate-100 dark:hover:bg-slate-950/30",
    gradient: "from-slate-500/10 to-transparent"
  }
};

// ————————
// 4. Función para formatear fecha
// ————————
const formatDate = (dateStr?: string | null | Date) => {
  if (!dateStr) return "Sin fecha";
  try {
    const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
    return format(date, "dd MMM yyyy", { locale: es });
  } catch {
    return "Fecha inválida";
  }
};

// ————————
// 5. Componente principal: PatientCardView
// ————————
export const PatientCardView: FC<PatientCardViewProps> = memo(({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}) => {
  // Memoizamos los handlers
  const handlers = useMemo(
    () => ({ onSelectPatient, onShareSurvey, onAnswerSurvey, onEditPatient }),
    [onSelectPatient, onShareSurvey, onAnswerSurvey, onEditPatient]
  );

  if (loading) {
    return <PatientCardViewSkeleton />;
  }

  return (
    <div className="p-6">
      {/* Contador de resultados */}
      {patients.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Mostrando {patients.length} paciente{patients.length !== 1 && "s"}
          </p>
        </div>
      )}

      {/* Grid de tarjetas */}
      {patients.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <User className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
            No se encontraron pacientes
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No hay pacientes que coincidan con los criterios de búsqueda actuales.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {patients.map((p) => (
            <PatientCardItem
              key={p.id}
              patient={p}
              {...handlers}
            />
          ))}
        </div>
      )}
    </div>
  );
});

PatientCardView.displayName = "PatientCardView";

// ————————
// 6. Tarjeta individual mejorada
// ————————
interface PatientCardItemProps {
  patient: PatientData;
  onSelectPatient: (p: PatientData) => void;
  onShareSurvey?: (p: PatientData) => void;
  onAnswerSurvey?: (p: PatientData) => void;
  onEditPatient?: (p: PatientData) => void;
}

const PatientCardItem: FC<PatientCardItemProps> = memo(({
  patient,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}) => {
  // Long press para móviles
  const longPressProps = useLongPress(() => onSelectPatient(patient), 500);
  
  // Obtener colores según estado
  const status = patient.estado_paciente || PatientStatusEnum.PENDIENTE_DE_CONSULTA;
  const statusColors = STATUS_ACCENT_COLORS[status];
  const hasSurvey = Boolean(patient.encuesta);

  // Manejadores
  const handleClick = useCallback(() => onSelectPatient(patient), [onSelectPatient, patient]);

  // Calcular edad si existe fecha de nacimiento
  const age = useMemo(() => {
    if (patient.fecha_nacimiento) {
      const birthDate = patient.fecha_nacimiento instanceof Date 
        ? patient.fecha_nacimiento 
        : new Date(patient.fecha_nacimiento);
      const today = new Date();
      const years = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        return years - 1;
      }
      return years;
    }
    return patient.edad;
  }, [patient.fecha_nacimiento, patient.edad]);

  return (
    <Card
      className={cn(
        "relative overflow-hidden group transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-1",
        "border-l-4",
        statusColors.accent,
        "cursor-pointer"
      )}
      {...longPressProps}
      onClick={handleClick}
    >
      {/* Gradiente de fondo sutil */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        statusColors.gradient
      )} />

      {/* Menú contextual */}
      <div
        className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleClick}>
              <Eye className="mr-2 h-4 w-4" />
              Ver detalles
            </DropdownMenuItem>
            {onEditPatient && (
              <DropdownMenuItem onClick={() => onEditPatient(patient)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!hasSurvey && onShareSurvey && (
              <DropdownMenuItem onClick={() => onShareSurvey(patient)}>
                <Share2 className="mr-2 h-4 w-4" />
                Compartir encuesta
              </DropdownMenuItem>
            )}
            {!hasSurvey && onAnswerSurvey && (
              <DropdownMenuItem onClick={() => onAnswerSurvey(patient)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Contestar encuesta
              </DropdownMenuItem>
            )}
            {hasSurvey && (
              <DropdownMenuItem onClick={handleClick}>
                <FileText className="mr-2 h-4 w-4" />
                Ver resultados
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Encabezado con información principal */}
      <CardHeader className="relative pb-3">
        <div className="pr-10">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {patient.nombre} {patient.apellidos}
          </h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 dark:text-slate-400">
            {age && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      {age} años
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edad del paciente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className="text-slate-400">ID: {patient.id.slice(0, 8)}</span>
          </div>
        </div>
      </CardHeader>

      {/* Contenido principal */}
      <CardContent className="relative space-y-3">
        {/* Estado del paciente */}
        <div className="flex items-center justify-between">
          <PatientStatus
            status={status}
            surveyCompleted={hasSurvey}
          />
          {patient.probabilidad_cirugia !== undefined && patient.probabilidad_cirugia !== null && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-slate-400" />
                    <span className={cn(
                      "text-sm font-medium",
                      patient.probabilidad_cirugia > 70 ? "text-emerald-600 dark:text-emerald-500" :
                      patient.probabilidad_cirugia > 40 ? "text-amber-600 dark:text-amber-500" :
                      "text-red-600 dark:text-red-500"
                    )}>
                      {patient.probabilidad_cirugia}%
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Probabilidad de cirugía</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Información de contacto */}
        <div className="space-y-2">
          {patient.telefono && (
            <a
              href={`tel:${patient.telefono}`}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-4 w-4" />
              <span>{patient.telefono}</span>
            </a>
          )}
          {patient.email && (
            <a
              href={`mailto:${patient.email}`}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-4 w-4" />
              <span className="truncate">{patient.email}</span>
            </a>
          )}
        </div>

        {/* Diagnóstico */}
        {patient.diagnostico_principal && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-2">
              <Stethoscope className="h-4 w-4 text-slate-400 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Diagnóstico principal
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                  {patient.diagnostico_principal}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fechas */}
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock className="h-3.5 w-3.5" />
          <span>Registrado: {formatDate(patient.fecha_registro)}</span>
        </div>
      </CardContent>

      {/* Footer con acciones */}
      <CardFooter className="relative pt-3 pb-4 border-t border-slate-200 dark:border-slate-800">
        <div className="w-full grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Detalles
          </Button>
          {!hasSurvey && onAnswerSurvey ? (
            <Button
              variant="default"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onAnswerSurvey(patient);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Encuesta
            </Button>
          ) : hasSurvey ? (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Resultados
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              disabled
            >
              Sin acciones
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
});

PatientCardItem.displayName = "PatientCardItem";

// ————————
// 7. Skeleton para estado de carga
// ————————
const PatientCardViewSkeleton: FC = () => (
  <div className="p-6">
    <div className="mb-4">
      <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/2 mt-2 animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-full w-32 animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse" />
            </div>
          </CardContent>
          <CardFooter className="pt-3">
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  </div>
);

PatientCardViewSkeleton.displayName = "PatientCardViewSkeleton";