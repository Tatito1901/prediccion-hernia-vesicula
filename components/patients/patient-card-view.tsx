"use client";

import React, {
  FC,
  memo,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  FileText,
  Share2,
  Edit,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { PatientData, PatientStatus } from "@/app/dashboard/data-model";
import { cn } from "@/lib/utils";

// --- Mapeo estático de clases por estado ---
const DEFAULT_STATUS_COLOR =
  "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400";
const STATUS_COLOR: Record<PatientStatus, string> = {
  OPERADO:
    "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400",
  "NO OPERADO":
    "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400",
  "PENDIENTE DE CONSULTA":
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400",
  "EN SEGUIMIENTO":
    "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400",
  INDECISO:
    "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400",
};

// --- Utilería de formato de fecha ---
const formatDate = (iso?: string) =>
  iso
    ? format(new Date(iso), "dd/MM/yyyy", { locale: es })
    : "Sin fecha";

// --- Hook para detectar “long press” sin disparar renders extra ---
function useLongPress(
  onLongPress: () => void,
  ms = 500
): {
  onTouchStart: () => void;
  onTouchEnd: () => void;
  onTouchMove: () => void;
} {
  const timeout = useRef<number>();
  const start = () => {
    timeout.current = window.setTimeout(onLongPress, ms);
  };
  const clear = () => {
    window.clearTimeout(timeout.current);
  };
  return {
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: clear,
  };
}

// --- Props del componente principal ---
export interface PatientCardViewProps {
  patients: PatientData[];
  loading?: boolean;
  onSelectPatient: (p: PatientData) => void;
  onShareSurvey?: (p: PatientData) => void;
  onAnswerSurvey?: (p: PatientData) => void;
  onEditPatient?: (p: PatientData) => void;
}

// --- Componente principal ---
export const PatientCardView: FC<PatientCardViewProps> = ({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}) => {
  // Memoizamos handlers para pasar a cada tarjeta
  const handlers = useMemo(
    () => ({ onSelectPatient, onShareSurvey, onAnswerSurvey, onEditPatient }),
    [onSelectPatient, onShareSurvey, onAnswerSurvey, onEditPatient]
  );

  return (
    <div className="space-y-4">
      {/* Contador */}
      <div className="text-center text-sm font-medium bg-muted/30 py-2 rounded-md border-border/50 border">
        {patients.length} pacientes encontrados
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron pacientes.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <PatientCardSkeleton key={i} />
              ))
            : patients.map((p) => (
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
};

// --- Tarjeta individual (memoizada) ---
interface PatientCardItemProps {
  patient: PatientData;
  onSelectPatient: (p: PatientData) => void;
  onShareSurvey?: (p: PatientData) => void;
  onAnswerSurvey?: (p: PatientData) => void;
  onEditPatient?: (p: PatientData) => void;
}

const PatientCardItem: FC<PatientCardItemProps> = memo(
  ({
    patient,
    onSelectPatient,
    onShareSurvey,
    onAnswerSurvey,
    onEditPatient,
  }) => {
    // Long press en móviles
    const longPressProps = useLongPress(
      () => onSelectPatient(patient),
      500
    );

    const statusColor =
      STATUS_COLOR[patient.estado_paciente] || DEFAULT_STATUS_COLOR;

    const handleClick = useCallback(
      () => onSelectPatient(patient),
      [onSelectPatient, patient]
    );

    return (
      <Card
        className="relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
        {...longPressProps}
        onClick={handleClick}
      >
        {/* Menú contextual */}
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleClick}>
                <FileText className="mr-2 h-4 w-4" />
                Ver detalles
              </DropdownMenuItem>
              {onEditPatient && (
                <DropdownMenuItem
                  onClick={() => onEditPatient(patient)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
              )}
              {!patient.encuesta && onShareSurvey && (
                <DropdownMenuItem
                  onClick={() => onShareSurvey(patient)}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir encuesta
                </DropdownMenuItem>
              )}
              {!patient.encuesta && onAnswerSurvey && (
                <DropdownMenuItem
                  onClick={() => onAnswerSurvey(patient)}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Contestar encuesta
                </DropdownMenuItem>
              )}
              {patient.encuesta && (
                <DropdownMenuItem onClick={handleClick}>
                  <FileText className="mr-2 h-4 w-4" />
                  Ver resultados
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contenido */}
        <CardContent className="pt-6 pb-2 cursor-pointer active:bg-muted/30 transition-colors">
          <h3 className="text-lg font-semibold truncate">
            {patient.nombre} {patient.apellidos}
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatDate(patient.fecha_primera_consulta)} ·{" "}
            {patient.edad ?? "-"} años
          </p>

          <div className="flex flex-wrap gap-2 my-2">
            <Badge className={statusColor}>
              {patient.estado_paciente}
            </Badge>
            <Badge
              className={cn(
                patient.encuesta
                  ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
              )}
            >
              {patient.encuesta
                ? "Encuesta completada"
                : "Encuesta pendiente"}
            </Badge>
          </div>

          <p className="text-sm line-clamp-2">
            <span className="font-medium">Diagnóstico:</span>{" "}
            {patient.diagnostico_principal || "Sin diagnóstico"}
          </p>
        </CardContent>

        {/* Footer con acciones */}
        <CardFooter className="pt-2 pb-4 flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleClick}
          >
            <FileText className="mr-2 h-4 w-4" />
            {patient.encuesta ? "Ver resultados" : "Ver detalles"}
          </Button>

          {!patient.encuesta && onAnswerSurvey && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => onAnswerSurvey(patient)}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              Contestar encuesta
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
);
PatientCardItem.displayName = "PatientCardItem";

// --- Skeleton para loading state ---
const PatientCardSkeleton: FC = memo(() => (
  <Card className="opacity-70">
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
        <div className="flex gap-2">
          <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          <div className="h-6 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-4 bg-muted rounded w-full animate-pulse" />
      </div>
    </CardContent>
  </Card>
));
PatientCardSkeleton.displayName = "PatientCardSkeleton";
