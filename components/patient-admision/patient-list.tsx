import React from "react";
import { PatientData } from "@/app/dashboard/data-model";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Clock8 
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

interface PatientListProps {
  patients: PatientData[];
  onViewDetails?: (patientId: string) => void;
  onEditPatient?: (patientId: string) => void;
  onScheduleAppointment?: (patientId: string) => void;
  onMarkPresent?: (patientId: string) => void;
  onReschedule?: (patientId: string) => void;
  onCancel?: (patientId: string) => void;
}

const PatientList: React.FC<PatientListProps> = ({
  patients,
  onViewDetails,
  onEditPatient,
  onScheduleAppointment,
  onMarkPresent,
  onReschedule,
  onCancel,
}) => {
  // Si no hay pacientes, mostrar un mensaje
  if (!patients || patients.length === 0) {
    return (
      <Card className="border-dashed border-slate-300 bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
        <CardContent className="p-6 text-center text-slate-500 dark:text-slate-400">
          No hay pacientes para mostrar.
        </CardContent>
      </Card>
    );
  }

  // Función para obtener la clase de color según el estado del paciente
  const getStatusColor = (status: string | undefined): { bg: string, text: string, border: string, shadow: string } => {
    if (!status) return { bg: "", text: "", border: "", shadow: "" };
    
    const colorMap: Record<string, { bg: string, text: string, border: string, shadow: string }> = {
      "PENDIENTE DE CONSULTA": { 
        bg: "bg-amber-50", 
        text: "text-amber-800", 
        border: "border-amber-200",
        shadow: "shadow-amber-100/50"
      },
      "CONSULTADO": { 
        bg: "bg-blue-50", 
        text: "text-blue-800", 
        border: "border-blue-200",
        shadow: "shadow-blue-100/50"
      },
      "EN SEGUIMIENTO": { 
        bg: "bg-green-50", 
        text: "text-green-800", 
        border: "border-green-200",
        shadow: "shadow-green-100/50"
      },
      "OPERADO": { 
        bg: "bg-teal-50", 
        text: "text-teal-800", 
        border: "border-teal-200",
        shadow: "shadow-teal-100/50"
      },
      "NO OPERADO": { 
        bg: "bg-red-50", 
        text: "text-red-800", 
        border: "border-red-200",
        shadow: "shadow-red-100/50"
      },
      "INDECISO": { 
        bg: "bg-purple-50", 
        text: "text-purple-800", 
        border: "border-purple-200",
        shadow: "shadow-purple-100/50"
      }
    };
    
    return colorMap[status] || { bg: "", text: "", border: "", shadow: "" };
  };
  
  // Función para obtener el texto de estado formateado
  const getStatusText = (status: string | undefined) => {
    if (!status) return "";
    
    const textMap: Record<string, string> = {
      "PENDIENTE DE CONSULTA": "Pendiente",
      "CONSULTADO": "Consultado",
      "EN SEGUIMIENTO": "En seguimiento",
      "OPERADO": "Operado",
      "NO OPERADO": "No operado",
      "INDECISO": "Indeciso"
    };
    
    return textMap[status] || status;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
      {patients.map((patient) => {
        const statusColors = getStatusColor(patient.estado_paciente);
        const statusText = getStatusText(patient.estado_paciente);
        
        return (
          <Card 
            key={patient.id} 
            className={cn(
              "overflow-hidden border transition-all duration-200 hover:shadow-md cursor-pointer max-w-md",
              statusColors.border || "border-slate-200 dark:border-slate-800",
              statusColors.shadow || "hover:shadow-slate-200/50 dark:hover:shadow-slate-900/30"
            )}
            onClick={() => onViewDetails && onViewDetails(patient.id)}
          >
            <CardContent className="p-0 relative">
              {/* Encabezado de la tarjeta con el estado */}
              <div className={cn(
                "px-3 py-2 flex justify-between items-center border-b",
                statusColors.bg || "bg-white dark:bg-slate-950",
                statusColors.border || "border-slate-200 dark:border-slate-800",
                "relative overflow-hidden"
              )}>
                {/* Decorador lateral */}
                <div className={cn(
                  "absolute left-0 top-0 h-full w-1",
                  statusColors.text || "bg-slate-400"
                )}></div>
                <div className="flex items-center">
                  <User className={cn("h-4 w-4 mr-2", statusColors.text || "text-slate-400")} />
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                    {patient.nombre} {patient.apellidos}
                  </h3>
                </div>
                {patient.estado_paciente && (
                  <Badge 
                    className={cn(
                      "ml-2 font-medium",
                      statusColors.bg || "bg-slate-100",
                      statusColors.text || "text-slate-800",
                      "border",
                      statusColors.border || "border-slate-200",
                      "hover:" + (statusColors.bg || "bg-slate-100")
                    )}
                  >
                    {statusText}
                  </Badge>
                )}
              </div>
              
              {/* Contenido principal de la tarjeta */}
              <div className="p-3 space-y-2 relative">
                {/* Información de contacto */}
                <div className="flex flex-col space-y-1.5">
                  {patient.telefono && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">{patient.telefono}</span>
                    </div>
                  )}
                  
                  {patient.edad && (
                    <div className="flex items-center text-sm">
                      <User className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">{patient.edad} años</span>
                    </div>
                  )}
                  
                  {patient.fecha_primera_consulta && (
                    <div className="flex items-center text-sm">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-300">
                        Última consulta: {format(new Date(patient.fecha_primera_consulta), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Diagnóstico */}
                {patient.diagnostico_principal && (
                  <div className="flex items-start mt-3">
                    <Clipboard className="h-3.5 w-3.5 mr-2 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Diagnóstico:</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-xs font-medium",
                          statusColors.text || "text-slate-700 dark:text-slate-300",
                          statusColors.bg || "bg-slate-50 dark:bg-slate-900",
                          "border",
                          statusColors.border || "border-slate-200 dark:border-slate-800"
                        )}
                      >
                        {patient.diagnostico_principal}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Probabilidad de cirugía si está disponible */}
                {patient.probabilidad_cirugia !== undefined && (
                  <div className="flex items-start mt-3">
                    <AlertCircle className="h-3.5 w-3.5 mr-2 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Probabilidad de cirugía:</span>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full",
                            patient.probabilidad_cirugia > 75 ? "bg-green-500" : 
                            patient.probabilidad_cirugia > 50 ? "bg-blue-500" : 
                            patient.probabilidad_cirugia > 25 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${patient.probabilidad_cirugia}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-600 dark:text-slate-400 mt-1 block">
                        {patient.probabilidad_cirugia}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Menú de opciones en la parte derecha */}
              <div className="absolute top-1/2 right-2 -translate-y-1/2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        "p-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm hover:shadow-md",
                        "border", 
                        statusColors.border || "border-slate-200 dark:border-slate-700",
                        "hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 transition-all duration-200"
                      )}
                      onClick={(e) => e.stopPropagation()} // Evitar que se propague al onClick de la tarjeta
                    >
                      <MoreHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent 
                    align="end" 
                    className="w-48 bg-white dark:bg-slate-900 border dark:border-slate-800 p-1.5 shadow-lg rounded-md"
                    onClick={(e) => e.stopPropagation()} // Evitar que se propague al onClick de la tarjeta
                    sideOffset={5}
                  >
                    <DropdownMenuItem 
                      className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      onClick={() => onViewDetails && onViewDetails(patient.id)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                      Ver detalles
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                    
                    {onMarkPresent && (
                      <DropdownMenuItem 
                        className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkPresent(patient.id);
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                        Marcar presente
                      </DropdownMenuItem>
                    )}
                    
                    {onReschedule && (
                      <DropdownMenuItem 
                        className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReschedule(patient.id);
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5 mr-2" />
                        Reagendar
                      </DropdownMenuItem>
                    )}
                    
                    {onCancel && (
                      <DropdownMenuItem 
                        className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCancel(patient.id);
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-2" />
                        Cancelar
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuSeparator className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                    
                    {onEditPatient && (
                      <DropdownMenuItem 
                        className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditPatient(patient.id);
                        }}
                      >
                        <Edit className="h-3.5 w-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                        Editar paciente
                      </DropdownMenuItem>
                    )}
                    
                    {onScheduleAppointment && (
                      <DropdownMenuItem 
                        className="flex items-center cursor-pointer text-sm py-1.5 px-2 rounded-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleAppointment(patient.id);
                        }}
                      >
                        <CalendarClock className="h-3.5 w-3.5 mr-2 text-slate-600 dark:text-slate-400" />
                        Agendar cita
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PatientList;
