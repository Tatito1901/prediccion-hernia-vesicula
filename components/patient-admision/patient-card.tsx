"use client";

import React, { FC, memo, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CheckCircle,
  XCircle,
  Clock,
  CalendarDays,
  ClipboardCheck,
  AlertCircle,
  FileText,
  MoreHorizontal,
  Phone,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import type { AppointmentStatusEnum, AppointmentData } from "@/app/dashboard/data-model";

// ==== AUX TYPES ====
type EntityId = string;
// ISODateString and FormattedTimeString are implicitly handled by AppointmentData types

export type ConfirmAction =
  | "checkIn"
  | "cancel"
  | "complete"
  | "noShow"
  | "reschedule";

// Local Appointment interface removed as AppointmentData will be used directly

interface AppointmentCardProps {
  appointment: AppointmentData;
  isPastOverride?: boolean;
  showNoShowOverride?: boolean;
  onAction: (
    action: ConfirmAction,
    id: EntityId, // appointment ID
    appointment: AppointmentData
  ) => void;
  onStartSurvey: (
    patientId: EntityId, // patient's ID
    nombre: string,
    apellidos: string,
    telefono: string
  ) => void;
  onViewHistory: (patientId: EntityId) => void;
}

// ==== STATUS CONFIG (fuera del componente para no redefinir en cada render) ====
interface StatusConfig {
  borderClass: string;
  icon: React.ReactNode;
  label: string;
  bgClass: string;
  textClass: string;
}

const defaultStatusCfg: StatusConfig = {
  borderClass: "border-l-slate-400",
  icon: <Clock className="h-4 w-4" />,
  label: "Desconocido",
  bgClass: "bg-gray-100 dark:bg-gray-800",
  textClass: "text-gray-700 dark:text-gray-300",
};

const STATUS_CONFIG: Record<AppointmentStatusEnum, StatusConfig> = {
  PROGRAMADA: {
    borderClass: "border-l-slate-400",
    icon: <Clock className="h-4 w-4" />,
    label: "Programada",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
  },
  CONFIRMADA: {
    borderClass: "border-l-blue-500",
    icon: <CalendarDays className="h-4 w-4" />,
    label: "Confirmada",
    bgClass: "bg-blue-100 dark:bg-blue-900/50",
    textClass: "text-blue-800 dark:text-blue-300",
  },
  PRESENTE: {
    borderClass: "border-l-emerald-500",
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Presente",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/50",
    textClass: "text-emerald-800 dark:text-emerald-300",
  },
  COMPLETADA: {
    borderClass: "border-l-violet-500",
    icon: <ClipboardCheck className="h-4 w-4" />,
    label: "Completada",
    bgClass: "bg-violet-100 dark:bg-violet-900/50",
    textClass: "text-violet-800 dark:text-violet-300",
  },
  CANCELADA: {
    borderClass: "border-l-red-500",
    icon: <XCircle className="h-4 w-4" />,
    label: "Cancelada",
    bgClass: "bg-red-100 dark:bg-red-900/50",
    textClass: "text-red-800 dark:text-red-300",
  },
  "NO ASISTIO": {
    borderClass: "border-l-gray-500",
    icon: <AlertCircle className="h-4 w-4" />,
    label: "No asistió",
    bgClass: "bg-gray-200 dark:bg-gray-700",
    textClass: "text-gray-700 dark:text-gray-300",
  },
  REAGENDADA: {
    borderClass: "border-l-amber-500",
    icon: <CalendarDays className="h-4 w-4" />,
    label: "Reagendada",
    bgClass: "bg-amber-100 dark:bg-amber-900/50",
    textClass: "text-amber-800 dark:text-amber-300",
  },
};

// ==== STATUS BADGE (sin cambios, ya estaba memoizado) ====
export const AppointmentStatusBadge: FC<{ status: AppointmentStatusEnum }> = memo(
  ({ status }) => {
    const cfg = STATUS_CONFIG[status] ?? defaultStatusCfg;

    return (
      <Badge
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${cfg.bgClass} ${cfg.textClass}`}
      >
        {cfg.icon}
        <span>{cfg.label}</span>
      </Badge>
    );
  }
);
AppointmentStatusBadge.displayName = "AppointmentStatusBadge";

// ==== SUBCOMPONENTE: InfoSection ====
interface InfoSectionProps {
  nombre: string;
  apellidos: string;
  telefono: string;
  formattedDate: string;
  formattedTime: string;
  motivoConsulta?: string;
  estado: AppointmentStatusEnum;
}
const InfoSection: FC<InfoSectionProps> = memo(
  ({ nombre, apellidos, telefono, formattedDate, formattedTime, motivoConsulta, estado }) => {
    return (
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="truncate font-semibold text-lg text-slate-900 dark:text-slate-100">
            <span className="font-bold">{nombre}</span>{apellidos ? ` ${apellidos}` : ''}
          </h3>
          <AppointmentStatusBadge status={estado as AppointmentStatusEnum} />
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <CalendarDays className="h-5 w-5" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-5 w-5" />
            <span>{formattedTime}</span>
          </div>
        </div>
        {motivoConsulta && (
          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
            <strong>Motivo:</strong> {motivoConsulta}
          </p>
        )}
        <div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
          <Phone className="h-5 w-5" />
          <span className="truncate">{telefono}</span>
        </div>
      </div>
    );
  }
);
InfoSection.displayName = "InfoSection";

// ==== SUBCOMPONENTE: ActionsMenu ====
interface ActionsMenuProps {
  isPast: boolean;
  estado: AppointmentStatusEnum;
  patientId?: EntityId;
  onAction: (action: ConfirmAction) => void;
  onStartSurvey: () => void;
  onViewHistory: () => void;
}
const ActionsMenu: FC<ActionsMenuProps> = memo(
  ({ isPast, estado, patientId, onAction, onStartSurvey, onViewHistory }) => {
    // Definir cada handler por separado para reuso
    const handleCheckIn = useCallback(() => onAction("checkIn"), [onAction]);
    const handleNoShow = useCallback(() => onAction("noShow"), [onAction]);
    const handleReschedule = useCallback(() => onAction("reschedule"), [onAction]);
    const handleCancel = useCallback(() => onAction("cancel"), [onAction]);
    const handleComplete = useCallback(() => onAction("complete"), [onAction]);

    return (
      <div className="self-start sm:self-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-70 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Opciones de cita"
            >
              <MoreHorizontal className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-md">
            {!isPast && (
              <>
                <DropdownMenuItem onClick={handleCheckIn}>
                  <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
                  Marcar presente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNoShow}>
                  <AlertCircle className="h-4 w-4 mr-2 text-gray-600" />
                  No asistió
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleReschedule}>
                  <CalendarDays className="h-4 w-4 mr-2 text-amber-600" />
                  Reagendar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCancel}>
                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  Cancelar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {estado === "PRESENTE" && (
              <>
                <DropdownMenuItem onClick={handleComplete}>
                  <ClipboardCheck className="h-4 w-4 mr-2 text-violet-600" />
                  Completar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {patientId && (
              <>
                <DropdownMenuItem onClick={onViewHistory}>
                  <History className="h-4 w-4 mr-2 text-slate-600" />
                  Ver historial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onStartSurvey}>
                  <FileText className="h-4 w-4 mr-2 text-blue-600" />
                  Enviar encuesta
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
);
ActionsMenu.displayName = "ActionsMenu";

// ==== COMPONENTE PRINCIPAL: AppointmentCard ====
export const AppointmentCard: FC<AppointmentCardProps> = memo(
  ({
    appointment,
    isPastOverride = false,
    showNoShowOverride = false,
    onAction,
    onStartSurvey,
    onViewHistory,
  }) => {
    const {
      id, // Appointment's own ID
      paciente: pacienteFullName, // Patient's full name string from AppointmentData
      telefono,
      patientId, // Patient's actual ID from AppointmentData
      fechaConsulta,
      horaConsulta,
      motivoConsulta,
      estado,
      // surveyStatus, // Potentially from AppointmentData if needed later
      // patientSurveys, // Potentially from AppointmentData if needed later
    } = appointment; // appointment is AppointmentData
    
    // Separar nombre y apellidos
    const { nombre, apellidos } = useMemo(() => {
      // Registrar el valor recibido para depuración
      console.log('Valor de pacienteFullName recibido en tarjeta:', pacienteFullName);
      
      // Caso: Valor vacío o indefinido
      if (!pacienteFullName) {
        return { nombre: 'Sin Datos', apellidos: 'de Paciente' };
      }
      
      // Mantener la información de ID, si está presente
      if (pacienteFullName.startsWith('Paciente ID:')) {
        const parts = pacienteFullName.split('ID:');
        return { nombre: 'Paciente ID:', apellidos: parts[1].trim() };
      }
      
      // Ya no necesitamos esta condicional porque el nombre real viene en pacienteFullName
      // directamente desde transformAppointmentData, que maneja correctamente los datos
      // de paciente, ya sea desde patients o patient en la respuesta API
      
      // Procesamiento normal para nombres completos
      const parts = pacienteFullName.split(' ');
      if (parts.length === 1) return { nombre: parts[0], apellidos: '' };
      return { nombre: parts[0], apellidos: parts.slice(1).join(' ') };
    }, [pacienteFullName]);

    // Determinar si la cita se considera "pasada"
    const isPast = useMemo(
      () =>
        isPastOverride ||
        estado === "COMPLETADA" ||
        estado === "CANCELADA" ||
        (showNoShowOverride && estado === "NO ASISTIO"),
      [estado, isPastOverride, showNoShowOverride]
    );

    // Memoizar la configuración de estado para no redefinir en cada render
    const statusCfg = useMemo(
      () => STATUS_CONFIG[estado as AppointmentStatusEnum] ?? defaultStatusCfg,
      [estado]
    );

    // Formatear fecha (fecha inválida muestra "Fecha inválida")
    const formattedDate = useMemo(() => {
      const dt = new Date(fechaConsulta);
      if (isNaN(dt.getTime())) return "Fecha inválida";
      return format(dt, "d MMM, yyyy", { locale: es });
    }, [fechaConsulta]);

    // Formatear hora (tomando string "HH:mm")
    const formattedTime = useMemo(() => {
      const [h, m] = horaConsulta.split(":").map(Number);
      const dt = new Date();
      dt.setHours(h, m, 0, 0);
      return format(dt, "HH:mm", { locale: es });
    }, [horaConsulta]);

    // Callback para despachar acciones con id y objeto completo
    const handleAction = useCallback(
      (action: ConfirmAction) => {
        onAction(action, id, appointment);
      },
      [onAction, id, appointment]
    );

    // Callback para enviar encuesta (si existe patientId)
    const handleSurvey = useCallback(() => {
      if (patientId) {
        // Pass patientId, nombre, apellidos, and telefono
        onStartSurvey(patientId, nombre, apellidos, telefono ?? "");
      }
    }, [patientId, nombre, apellidos, telefono, onStartSurvey]);

    // Callback para ver historial (si existe patientId)
    const handleHistory = useCallback(() => {
      if (patientId) {
        onViewHistory(patientId);
      }
    }, [patientId, onViewHistory]);

    return (
      <Card
        className={`group transition-all duration-150 hover:shadow-md border-l-4 ${statusCfg.borderClass} ${
          isPast ? "opacity-75" : "hover:-translate-y-0.5"
        } bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* Sección de Información */}
            <InfoSection
              nombre={nombre}
              apellidos={apellidos}
              telefono={telefono ?? "N/A"} // Provide fallback for telefono
              formattedDate={formattedDate}
              formattedTime={formattedTime}
              motivoConsulta={motivoConsulta}
              estado={estado as unknown as AppointmentStatusEnum} // Corregir el tipado con doble cast
            />

            {/* Menú de Acciones */}
            <ActionsMenu
              isPast={isPast}
              estado={estado}
              patientId={patientId}
              onAction={handleAction}
              onStartSurvey={handleSurvey}
              onViewHistory={handleHistory}
            />
          </div>
        </CardContent>
      </Card>
    );
  }
);
AppointmentCard.displayName = "AppointmentCard";

export default AppointmentCard;
