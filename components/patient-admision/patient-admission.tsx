"use client"

import { useState, useMemo, useCallback, useEffect, memo, FC } from "react"
import {
  Search, 
  CalendarIcon, 
  FileText, 
  CheckCircle, 
  XCircle, 
  UserPlus,
  Filter,
  ArrowUpDown,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NewPatientForm } from "./new-patient-form"
import { toast } from "sonner"
import { useAppContext } from "@/lib/context/app-context"
import { Badge } from "@/components/ui/badge"
import { SurveyShareDialog } from "@/components/surveys/survey-share-dialog"
import { generateSurveyId } from "@/lib/form-utils"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format, isToday as dateIsToday, isBefore, isAfter, startOfDay, addDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import type { DiagnosisType } from "@/app/dashboard/data-model";

// Tipos para el componente
export type AppointmentStatus = 'pendiente' | 'presente' | 'completada' | 'cancelada' | 'noAsistio' | 'reagendada';
export type PatientStatus = 'Pendiente de consulta' | 'Operado' | 'No Operado' | 'Seguimiento' | 'Cancelado' | 'No Asistió';
export type ConfirmAction = 'checkIn' | 'cancel' | 'complete' | 'noShow' | 'reschedule' | null;
export type SortField = 'nombre' | 'fecha' | 'hora' | 'motivo' | null;
export type SortDirection = 'asc' | 'desc';

export interface Appointment {
  id: number;
  nombre: string;
  apellidos: string;
  telefono: string;
  fechaConsulta: string | Date;
  horaConsulta: string;
  motivoConsulta: string;
  estado: AppointmentStatus;
  patientId?: number;
}

export interface Patient {
  id: number;
  nombre: string;
  apellidos: string;
  edad?: number;
  telefono?: string;
  fechaConsulta?: string;
  fechaRegistro: string;
  diagnostico?: DiagnosisType;
  estado?: PatientStatus;
  probabilidadCirugia?: number;
  ultimoContacto?: string;
  encuesta?: boolean;
}

export interface SurveyDialogState {
  isOpen: boolean;
  patientId: number;
  patientName: string;
  patientLastName: string;
  patientPhone: string;
  surveyId: string;
  surveyLink: string;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  action: ConfirmAction;
  appointmentId: number | null;
  appointmentData?: Appointment | null;
}

export interface StatusColors {
  [key: string]: string;
}

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  sortField: SortField;
  sortDirection: SortDirection;
}

// Función segura para comprobación del entorno
const isClient = typeof window !== 'undefined';

// Custom hook para detectar dispositivos móviles de forma segura en SSR
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        setIsMobile(window.innerWidth < breakpoint);
      };
      
      // Comprobar al inicio
      checkMobile();
      
      // Escuchar cambios de tamaño
      window.addEventListener('resize', checkMobile);
      
      // Limpiar al desmontar
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, [breakpoint]);
  
  return isMobile;
}

// Componente para seleccionar nueva fecha y hora
const RescheduleDatePicker: FC<{
  date: Date | null;
  time: string | null;
  onDateChange: (date: Date | null) => void;
  onTimeChange: (time: string) => void;
}> = memo(({ date, time, onTimeChange, onDateChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Nueva fecha</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={onDateChange}
              initialFocus
              disabled={(day) => isBefore(day, startOfDay(new Date()))}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Nueva hora</label>
        <Select value={time || ""} onValueChange={onTimeChange}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar hora" />
          </SelectTrigger>
          <SelectContent>
            {/* Generar horas disponibles */}
            {["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", 
              "12:00", "12:30", "13:00", "15:00", "15:30", "16:00", "16:30", "17:00"].map((hora) => (
              <SelectItem key={hora} value={hora}>{hora}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
});

RescheduleDatePicker.displayName = 'RescheduleDatePicker';

// Componentes memoizados para mejor rendimiento
const AppointmentStatusBadge = memo(({ status }: { status: AppointmentStatus }) => {
  const getStatusColorClass = useCallback((appointmentStatus: string): string => {
    const statusColors: StatusColors = {
      'presente': "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400",
      'cancelada': "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400",
      'completada': "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400",
      'pendiente': "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400",
      'noShow': "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400",
      'noAsistio': "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400",
      'reagendada': "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
    };
    
    return statusColors[appointmentStatus] || "";
  }, []);

  const getStatusLabel = useCallback((appointmentStatus: string): string => {
    const statusLabels: Record<string, string> = {
      'presente': "Presente",
      'cancelada': "Cancelada",
      'completada': "Completada",
      'pendiente': "Pendiente",
      'noShow': "No asistió",
      'noAsistio': "No asistió",
      'reagendada': "Reagendada"
    };
    
    return statusLabels[appointmentStatus] || appointmentStatus;
  }, []);

  return (
    <Badge variant="outline" className={`${getStatusColorClass(status)} transition-all duration-300`}>
      {getStatusLabel(status)}
    </Badge>
  );
});

AppointmentStatusBadge.displayName = 'AppointmentStatusBadge';

// Componente de tarjeta de cita (móvil)
const AppointmentCard: FC<{
  appointment: Appointment;
  isPast?: boolean;
  onAction: (action: ConfirmAction, id: number, appointment: Appointment) => void;
  onStartSurvey: (appointment: Appointment) => void;
}> = memo(({ appointment, isPast = false, onAction, onStartSurvey }) => {
  // Funciones para formatear fecha
  const formatDate = useCallback((date: string | Date): string => {
    if (!date) return "";
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, "EEEE, d 'de' MMMM", { locale: es });
  }, []);

  const showNoShow = isPast && appointment.estado === 'pendiente';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden mb-4 border-l-4 hover:shadow-md transition-all duration-300" 
            style={{ 
              borderLeftColor: appointment.estado === 'presente' 
                ? 'var(--green-600)' 
                : appointment.estado === 'cancelada' 
                  ? 'var(--red-600)' 
                  : appointment.estado === 'completada'
                    ? 'var(--blue-600)'
                    : appointment.estado === 'noAsistio'
                      ? 'var(--amber-600)'
                      : appointment.estado === 'reagendada'
                        ? 'var(--purple-600)'
                        : 'var(--gray-400)'
            }}>
        <CardHeader className="p-4 pb-2 bg-muted/20">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-medium line-clamp-1">
                {appointment.nombre} {appointment.apellidos}
              </CardTitle>
              <CardDescription className="text-xs flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-primary/70"></span>
                {appointment.telefono}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <AppointmentStatusBadge status={showNoShow ? 'noShow' as AppointmentStatus : appointment.estado} />
              <span className="text-xs text-muted-foreground">{appointment.horaConsulta}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-3 space-y-2">
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{formatDate(appointment.fechaConsulta)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{appointment.motivoConsulta}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex flex-wrap justify-end gap-2">
          {appointment.estado === "pendiente" && !isPast && (
            <>
              <Button 
                size="sm" 
                className="transition-all hover:scale-105"
                onClick={() => onAction("checkIn", appointment.id, appointment)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Registrar
              </Button>
              
              {/* Botón Reagendar */}
              <Button 
                size="sm"
                variant="outline"
                className="transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => onAction("reschedule", appointment.id, appointment)}
              >
                <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
              </Button>
              
              {/* Botón No Asistió */}
              <Button 
                size="sm"
                variant="outline"
                className="transition-all hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={() => onAction("noShow", appointment.id, appointment)}
              >
                <XCircle className="h-4 w-4 mr-1" /> No Asistió
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                className="transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => onAction("cancel", appointment.id, appointment)}
              >
                <XCircle className="h-4 w-4 mr-1" /> Cancelar
              </Button>
            </>
          )}
          {appointment.estado === "presente" && (
            <>
              <Button 
                size="sm"
                className="transition-all hover:scale-105" 
                onClick={() => onStartSurvey(appointment)}
              >
                <FileText className="h-4 w-4 mr-1" /> Encuesta
              </Button>
              <Button 
                size="sm"
                className="transition-all hover:scale-105"
                onClick={() => onAction("complete", appointment.id, appointment)}
              >
                <CheckCircle className="h-4 w-4 mr-1" /> Completar
              </Button>
            </>
          )}
          {showNoShow && (
            <>
              <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400">
                No asistió
              </Badge>
              <Button 
                size="sm"
                variant="outline"
                className="transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20"
                onClick={() => onAction("reschedule", appointment.id, appointment)}
              >
                <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
});

AppointmentCard.displayName = 'AppointmentCard';

// Componente de tabla de citas (escritorio)
const AppointmentTable: FC<{
  appointments: Appointment[];
  isLoading: boolean;
  showPastStatus?: boolean;
  onAction: (action: ConfirmAction, id: number, appointment: Appointment) => void;
  onStartSurvey: (appointment: Appointment) => void;
  onSort: (field: SortField) => void;
  sortConfig: { field: SortField; direction: SortDirection };
}> = memo(({ 
  appointments, 
  isLoading, 
  showPastStatus = false, 
  onAction, 
  onStartSurvey,
  onSort,
  sortConfig
}) => {
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-[250px]" />
            <Skeleton className="h-12 w-[100px]" />
            <Skeleton className="h-12 w-[150px]" />
            <Skeleton className="h-12 w-[100px]" />
            <Skeleton className="h-12 w-[200px]" />
          </div>
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="p-8 text-center"
      >
        <div className="flex flex-col items-center justify-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-2 opacity-20" />
          <p className="text-muted-foreground">No hay citas para mostrar</p>
          <p className="text-sm text-muted-foreground/70">Prueba a cambiar los filtros o añadir nuevas citas</p>
        </div>
      </motion.div>
    );
  }

  // Función para renderizar encabezado ordenable
  const renderSortableHeader = (label: string, field: SortField) => {
    const isActive = sortConfig.field === field;
    
    return (
      <div 
        className="flex items-center gap-1 cursor-pointer group" 
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        <ArrowUpDown className={`h-3.5 w-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'} transition-all`} />
        {isActive && (
          <span className="ml-1 text-xs text-primary">
            ({sortConfig.direction === 'asc' ? '↑' : '↓'})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-2 text-left font-medium">
              {renderSortableHeader('Paciente', 'nombre')}
            </th>
            <th className="p-2 text-left font-medium">
              {renderSortableHeader('Motivo', 'motivo')}
            </th>
            <th className="p-2 text-left font-medium">
              {renderSortableHeader('Fecha', 'fecha')}
            </th>
            <th className="p-2 text-left font-medium">
              {renderSortableHeader('Hora', 'hora')}
            </th>
            <th className="p-2 text-left font-medium">Estado</th>
            <th className="p-2 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => {
            const showNoShow = showPastStatus && 
                               appointment.estado === 'pendiente' && 
                               isBefore(new Date(appointment.fechaConsulta), startOfDay(new Date())) && 
                               !dateIsToday(new Date(appointment.fechaConsulta));

            return (
              <motion.tr 
                key={appointment.id} 
                className="border-b hover:bg-muted/30 transition-colors"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <td className="p-2">
                  <div>
                    <div className="font-medium">
                      {appointment.nombre} {appointment.apellidos}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary/70"></span>
                      {appointment.telefono}
                    </div>
                  </div>
                </td>
                <td className="p-2">
                  <Badge variant="outline" className="bg-muted/50 hover:bg-muted transition-colors">
                    {appointment.motivoConsulta}
                  </Badge>
                </td>
                <td className="p-2">{format(new Date(appointment.fechaConsulta), "dd/MM/yyyy")}</td>
                <td className="p-2">{appointment.horaConsulta}</td>
                <td className="p-2">
                  <AppointmentStatusBadge status={showNoShow ? 'noShow' as AppointmentStatus : appointment.estado} />
                </td>
                <td className="p-2 text-right">
                  <div className="flex justify-end gap-2">
                    {appointment.estado === "pendiente" && !showNoShow && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <span>Acciones</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onAction("checkIn", appointment.id, appointment)}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Registrar llegada
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction("noShow", appointment.id, appointment)}>
                            <XCircle className="h-4 w-4 mr-2" /> No asistió
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onAction("reschedule", appointment.id, appointment)}>
                            <CalendarIcon className="h-4 w-4 mr-2" /> Reagendar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600" 
                            onClick={() => onAction("cancel", appointment.id, appointment)}
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Cancelar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    {appointment.estado === "presente" && (
                      <>
                        <Button 
                          size="sm" 
                          className="transition-all hover:scale-105"
                          onClick={() => onStartSurvey(appointment)}
                        >
                          <FileText className="h-4 w-4 mr-1" /> Encuesta
                        </Button>
                        <Button 
                          size="sm"
                          className="transition-all hover:scale-105"
                          onClick={() => onAction("complete", appointment.id, appointment)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Completar
                        </Button>
                      </>
                    )}
                    {showNoShow && (
                      <>
                        <Badge
                          variant="outline"
                          className="bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400"
                        >
                          No asistió
                        </Badge>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20"
                          onClick={() => onAction("reschedule", appointment.id, appointment)}
                        >
                          <CalendarIcon className="h-4 w-4 mr-1" /> Reagendar
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

AppointmentTable.displayName = 'AppointmentTable';

// Filtros avanzados en componente separado
const FilterControls: FC<{
  filters: FilterState;
  onUpdateFilters: (newFilters: Partial<FilterState>) => void;
  onClearFilters: () => void;
}> = memo(({ filters, onUpdateFilters, onClearFilters }) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
      <div className="relative w-full sm:w-[260px]">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar nombre, teléfono, motivo..."
          className="pl-8"
          value={filters.searchTerm}
          onChange={(e) => onUpdateFilters({ searchTerm: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
        <Select 
          value={filters.statusFilter} 
          onValueChange={(value) => onUpdateFilters({ statusFilter: value })}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="presente">Presente</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="noAsistio">No asistió</SelectItem>
            <SelectItem value="reagendada">Reagendada</SelectItem>
          </SelectContent>
        </Select>
      
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtros avanzados</SheetTitle>
              <SheetDescription>
                Configura filtros adicionales para tus citas
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              {/* Aquí irían controles avanzados como rango de fechas, filtro por tipo de consulta, etc. */}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={onClearFilters}>
                  Limpiar filtros
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
});

FilterControls.displayName = 'FilterControls';

// Componente principal optimizado
export function PatientAdmission() {
  // Estados
  const [activeTab, setActiveTab] = useState<string>("today");
  const [filterState, setFilterState] = useState<FilterState>({
    searchTerm: "",
    statusFilter: "all",
    dateRange: { from: null, to: null },
    sortField: null,
    sortDirection: "asc"
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({ 
    isOpen: false, 
    action: null, 
    appointmentId: null,
    appointmentData: null
  });
  const [surveyDialogState, setSurveyDialogState] = useState<SurveyDialogState>({
    isOpen: false,
    patientId: 0,
    patientName: "",
    patientLastName: "",
    patientPhone: "",
    surveyId: "",
    surveyLink: "",
  });
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);

  // Media Query para detectar dispositivos móviles de forma segura con SSR
  const isMobile = useIsMobile(768);

  // Context y router
  const {
    pendingAppointments,
    todayAppointments,
    updateAppointment,
    patients,
    setPatients,
    addPatient,
    updatePatient,
    addAppointment
  } = useAppContext();
  const router = useRouter();

  // Inicialización y carga de datos mejorada
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  useEffect(() => {
    // Verificar si tenemos datos reales primero
    if (pendingAppointments && pendingAppointments.length > 0) {
      // Esperar un momento para asegurar que los componentes hijos estén listos
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialMount(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      // Si no hay datos aún, esperar un poco más
      const timer = setTimeout(() => {
        setIsLoading(false);
        setIsInitialMount(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [pendingAppointments]);

  // Funciones de utilidad para fechas (memoizadas)
  const dateUtils = useMemo(() => ({
    isToday: (date: Date): boolean => {
      return dateIsToday(date);
    },
    isPast: (date: Date): boolean => {
      const today = startOfDay(new Date());
      return isBefore(date, today);
    },
    isFuture: (date: Date): boolean => {
      const today = startOfDay(new Date());
      return isAfter(date, today);
    }
  }), []);

  // Clasificación de citas por fecha
  const classifiedAppointments = useMemo(() => {
    if (!pendingAppointments || !Array.isArray(pendingAppointments)) return { past: [], today: [], future: [] };
    
    const past: Appointment[] = [];
    const today: Appointment[] = [];
    const future: Appointment[] = [];

    pendingAppointments.forEach((appointment: Appointment) => {
      const appointmentDate = new Date(appointment.fechaConsulta);

      if (dateUtils.isToday(appointmentDate)) {
        today.push(appointment);
      } else if (dateUtils.isPast(appointmentDate)) {
        past.push(appointment);
      } else if (dateUtils.isFuture(appointmentDate)) {
        future.push(appointment);
      }
    });

    // Ordenar las citas
    past.sort((a, b) => new Date(b.fechaConsulta).getTime() - new Date(a.fechaConsulta).getTime());
    future.sort((a, b) => new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime());
    today.sort((a, b) => a.horaConsulta.localeCompare(b.horaConsulta));

    return {
      past,
      today,
      future
    };
  }, [pendingAppointments, dateUtils]);

  // Función para filtrar citas (memoizada)
  const getFilteredAppointments = useCallback((appointments: Appointment[]): Appointment[] => {
    if (!appointments || !Array.isArray(appointments)) return [];
    
    // Extrae términos de búsqueda y estado para evitar recálculos
    const { searchTerm, statusFilter, sortField, sortDirection } = filterState;
    const searchTermLower = searchTerm.toLowerCase();
    
    // Aplicar filtros
    let filtered = appointments.filter((appointment) => {
      const matchesSearch = searchTerm === "" ||
        `${appointment.nombre} ${appointment.apellidos}`.toLowerCase().includes(searchTermLower) ||
        appointment.motivoConsulta.toLowerCase().includes(searchTermLower) ||
        appointment.telefono.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || appointment.estado === statusFilter;

      return matchesSearch && matchesStatus;
    });
    
    // Aplicar ordenación si hay un campo seleccionado
    if (sortField) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch(sortField) {
          case 'nombre':
            comparison = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
            break;
          case 'fecha':
            comparison = new Date(a.fechaConsulta).getTime() - new Date(b.fechaConsulta).getTime();
            break;
          case 'hora':
            comparison = a.horaConsulta.localeCompare(b.horaConsulta);
            break;
          case 'motivo':
            comparison = a.motivoConsulta.localeCompare(b.motivoConsulta);
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    
    return filtered;
  }, [filterState]);

  // Aplicar filtros a cada categoría
  const filteredAppointments = useMemo(() => ({
    past: getFilteredAppointments(classifiedAppointments.past),
    today: getFilteredAppointments(classifiedAppointments.today),
    future: getFilteredAppointments(classifiedAppointments.future),
  }), [getFilteredAppointments, classifiedAppointments]);

  // Funciones para actualizar filtros
  const handleUpdateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilterState({
      searchTerm: "",
      statusFilter: "all",
      dateRange: { from: null, to: null },
      sortField: null,
      sortDirection: "asc"
    });
  }, []);

  const handleSort = useCallback((field: SortField) => {
    setFilterState(prev => {
      // Si hacemos clic en el mismo campo, alternamos la dirección
      if (prev.sortField === field) {
        return { 
          ...prev, 
          sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc' 
        };
      }
      // Si hacemos clic en un nuevo campo, lo establecemos con dirección ascendente
      return { 
        ...prev, 
        sortField: field, 
        sortDirection: 'asc' 
      };
    });
  }, []);

  // Funciones para manejar acciones en citas
  const handleCheckIn = useCallback((id: number, appointment: Appointment) => {
    updateAppointment(id, { estado: "presente" });

    // Actualizar o crear paciente
    if (appointment.patientId) {
      updatePatient(appointment.patientId, {
        estado: "Pendiente de consulta",
        ultimoContacto: new Date().toISOString().split("T")[0],
      });
      
      toast.success(`${appointment.nombre} registrado como presente`, {
        description: "El paciente ha sido movido a la lista de consulta",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      });
    } else {
      const newPatientId = addPatient({
        nombre: appointment.nombre,
        apellidos: appointment.apellidos,
        edad: 0,
        fechaConsulta: typeof appointment.fechaConsulta === 'string' 
          ? appointment.fechaConsulta 
          : appointment.fechaConsulta.toISOString().split("T")[0],
        fechaRegistro: new Date().toISOString().split("T")[0],
        diagnostico: appointment.motivoConsulta as DiagnosisType,
        estado: "Pendiente de consulta",
        probabilidadCirugia: 0.5,
        ultimoContacto: new Date().toISOString().split("T")[0],
        telefono: appointment.telefono
      });

      updateAppointment(id, { patientId: newPatientId });
      
      toast.success(`Nuevo paciente registrado: ${appointment.nombre}`, {
        description: "Se ha creado una ficha de paciente",
        icon: <UserPlus className="h-4 w-4 text-green-500" />,
      });
    }

    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
  }, [updateAppointment, updatePatient, addPatient]);

  const handleCancel = useCallback((id: number, appointment: Appointment) => {
    updateAppointment(id, { estado: "cancelada" });
    
    toast.info(`Cita cancelada: ${appointment.nombre}`, {
      description: format(new Date(appointment.fechaConsulta), "dd/MM/yyyy") + " - " + appointment.horaConsulta,
      icon: <XCircle className="h-4 w-4 text-red-500" />,
    });
    
    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
  }, [updateAppointment]);

  const handleNoShow = useCallback((id: number, appointment: Appointment) => {
    updateAppointment(id, { estado: "noAsistio" });
    
    if (appointment.patientId) {
      updatePatient(appointment.patientId, {
        estado: "No Asistió",
        ultimoContacto: new Date().toISOString().split("T")[0],
      });
    }
    
    toast.info(`Paciente no asistió: ${appointment.nombre}`, {
      description: format(new Date(appointment.fechaConsulta), "dd/MM/yyyy") + " - " + appointment.horaConsulta,
      icon: <XCircle className="h-4 w-4 text-amber-500" />,
    });
    
    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
  }, [updateAppointment, updatePatient]);

  const handleReschedule = useCallback((id: number, appointment: Appointment, newDate: Date, newTime: string) => {
    // Mantener referencia a la cita original
    const originalDate = new Date(appointment.fechaConsulta);
    
    // Actualizar la cita actual como reagendada
    updateAppointment(id, { estado: "reagendada" });
    
    // Crear una nueva cita con los mismos datos pero nueva fecha/hora
    const newAppointmentId = addAppointment({
      ...appointment,
      id: Math.floor(Math.random() * 10000) + 1000, // Generar nuevo ID
      fechaConsulta: newDate,
      horaConsulta: newTime,
      estado: "pendiente"
    });
    
    toast.success(`Cita reagendada: ${appointment.nombre}`, {
      description: `De: ${format(originalDate, "dd/MM/yyyy")} ${appointment.horaConsulta} a: ${format(newDate, "dd/MM/yyyy")} ${newTime}`,
      icon: <CalendarIcon className="h-4 w-4 text-blue-500" />,
    });
    
    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
    setRescheduleDate(null);
    setRescheduleTime(null);
    
    // Cambiar a la pestaña de próximas citas
    setActiveTab("future");
  }, [updateAppointment, addAppointment]);

  const handleComplete = useCallback((id: number, appointment: Appointment) => {
    updateAppointment(id, { estado: "completada" });

    if (appointment.patientId) {
      updatePatient(appointment.patientId, {
        estado: "Seguimiento",
        fechaConsulta: typeof appointment.fechaConsulta === 'string' 
          ? appointment.fechaConsulta 
          : appointment.fechaConsulta.toISOString().split("T")[0],
        ultimoContacto: new Date().toISOString().split("T")[0],
      });
    }

    toast.success(`Consulta completada: ${appointment.nombre}`, {
      description: "El paciente ha pasado a estado de seguimiento",
      icon: <CheckCircle className="h-4 w-4 text-blue-500" />,
    });
    
    setConfirmDialog({ isOpen: false, action: null, appointmentId: null, appointmentData: null });
  }, [updateAppointment, updatePatient]);

  // Funciones para diálogos
  const handleStartSurvey = useCallback((appointment: Appointment) => {
    const surveyId = generateSurveyId();
    const surveyLink = `${window.location.origin}/survey/${surveyId}?patientId=${appointment.patientId || 0}`;

    setSurveyDialogState({
      isOpen: true,
      patientId: appointment.patientId || 0,
      patientName: appointment.nombre,
      patientLastName: appointment.apellidos,
      patientPhone: appointment.telefono,
      surveyId,
      surveyLink,
    });
  }, []);

  const handleStartInternalSurvey = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }));
    
    toast.info(`Iniciando encuesta para ${surveyDialogState.patientName}`, {
      description: "Preparando formulario...",
    });
    
    router.push(`/survey/${surveyDialogState.surveyId}?patientId=${surveyDialogState.patientId}&mode=internal`);
  }, [router, surveyDialogState]);

  const handleCloseSurveyDialog = useCallback(() => {
    setSurveyDialogState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleNewPatientSuccess = useCallback(() => {
    setActiveTab("future");
    toast.success("Paciente añadido correctamente", {
      description: "El paciente ha sido agendado para una cita futura",
    });
  }, []);

  // Abrir diálogo de confirmación
  const openConfirmDialog = useCallback((action: ConfirmAction, id: number, appointment: Appointment) => {
    // Si es reagendar, establecer una fecha por defecto (7 días después)
    if (action === "reschedule") {
      const currentDate = new Date(appointment.fechaConsulta);
      // Si la cita es en el pasado, usar la fecha actual + 7 días, si no usar la fecha actual + 1 día
      const defaultDate = isBefore(currentDate, startOfDay(new Date())) 
        ? addDays(new Date(), 7) 
        : addDays(currentDate, 1);
        
      setRescheduleDate(defaultDate);
      setRescheduleTime(appointment.horaConsulta);
    }
    
    setConfirmDialog({ 
      isOpen: true, 
      action, 
      appointmentId: id,
      appointmentData: appointment
    });
  }, []);

  // Ejecutar acción confirmada
  const handleConfirmAction = useCallback(() => {
    if (!confirmDialog.action || confirmDialog.appointmentId === null || !confirmDialog.appointmentData) return;

    switch (confirmDialog.action) {
      case "checkIn":
        handleCheckIn(confirmDialog.appointmentId, confirmDialog.appointmentData);
        break;
      case "cancel":
        handleCancel(confirmDialog.appointmentId, confirmDialog.appointmentData);
        break;
      case "complete":
        handleComplete(confirmDialog.appointmentId, confirmDialog.appointmentData);
        break;
      case "noShow":
        handleNoShow(confirmDialog.appointmentId, confirmDialog.appointmentData);
        break;
      case "reschedule":
        if (rescheduleDate && rescheduleTime) {
          handleReschedule(confirmDialog.appointmentId, confirmDialog.appointmentData, rescheduleDate, rescheduleTime);
        } else {
          toast.error("Por favor selecciona una fecha y hora válidas");
        }
        break;
    }
  }, [confirmDialog, handleCheckIn, handleCancel, handleComplete, handleNoShow, handleReschedule, rescheduleDate, rescheduleTime]);

  // Renderizado condicional para dispositivos móviles y escritorio
  const renderAppointmentsContent = useCallback((appointments: Appointment[], showPastStatus = false) => {
    if (isMobile) {
      return (
        <AnimatePresence>
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              isPast={showPastStatus}
              onAction={openConfirmDialog}
              onStartSurvey={handleStartSurvey}
            />
          ))}
        </AnimatePresence>
      );
    }

    return (
      <AppointmentTable
        appointments={appointments}
        isLoading={isLoading}
        showPastStatus={showPastStatus}
        onAction={openConfirmDialog}
        onStartSurvey={handleStartSurvey}
        onSort={handleSort}
        sortConfig={{ field: filterState.sortField, direction: filterState.sortDirection }}
      />
    );
  }, [isLoading, openConfirmDialog, handleStartSurvey, handleSort, filterState.sortField, filterState.sortDirection, isMobile]);

  return (
    <>
      <Card className="w-full overflow-hidden shadow-sm hover:shadow-md transition-all">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center md:justify-between gap-4 bg-muted/20">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Admisión de Pacientes</span>
              {isLoading && (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
              )}
            </CardTitle>
            <CardDescription>Gestione el ingreso de pacientes y citas</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <NewPatientForm onSuccess={handleNewPatientSuccess} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="px-4 pt-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                  <TabsTrigger value="today" className="relative">
                    Hoy 
                    <Badge className="ml-1 bg-primary/90 hover:bg-primary">
                      {filteredAppointments.today.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="future" className="relative">
                    Próximas
                    <Badge className="ml-1 bg-primary/90 hover:bg-primary">
                      {filteredAppointments.future.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger value="past" className="relative">
                    Anteriores
                    <Badge className="ml-1 bg-primary/90 hover:bg-primary">
                      {filteredAppointments.past.length}
                    </Badge>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <FilterControls 
                filters={filterState}
                onUpdateFilters={handleUpdateFilters}
                onClearFilters={handleClearFilters}
              />
            </div>

            <div className="p-4 pt-0">
              <TabsContent value="today" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.today)}
              </TabsContent>

              <TabsContent value="future" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.future)}
              </TabsContent>

              <TabsContent value="past" className="m-0 py-2">
                {renderAppointmentsContent(filteredAppointments.past, true)}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* Diálogo para compartir encuesta */}
      <SurveyShareDialog
        isOpen={surveyDialogState.isOpen}
        patient={{
          id: surveyDialogState.patientId,
          nombre: surveyDialogState.patientName,
          apellidos: surveyDialogState.patientLastName,
          telefono: surveyDialogState.patientPhone,
        }}
        surveyLink={surveyDialogState.surveyLink}
        onStartInternal={handleStartInternalSurvey}
        onClose={handleCloseSurveyDialog}
      />

      {/* Diálogo de confirmación */}
      <AlertDialog
        open={confirmDialog.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDialog({ 
              isOpen: false, 
              action: null, 
              appointmentId: null,
              appointmentData: null
            });
            setRescheduleDate(null);
            setRescheduleTime(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === "checkIn" && "¿Registrar llegada del paciente?"}
              {confirmDialog.action === "cancel" && "¿Cancelar esta cita?"}
              {confirmDialog.action === "complete" && "¿Marcar consulta como completada?"}
              {confirmDialog.action === "noShow" && "¿Marcar como no asistió?"}
              {confirmDialog.action === "reschedule" && "Reagendar cita"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {confirmDialog.appointmentData && (
                  <div className="text-sm mt-1 p-2 bg-muted/30 rounded-md">
                    <div className="font-medium">{confirmDialog.appointmentData.nombre} {confirmDialog.appointmentData.apellidos}</div>
                    <div className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {format(new Date(confirmDialog.appointmentData.fechaConsulta), "dd/MM/yyyy")}
                      <Clock className="h-3 w-3 ml-1" />
                      {confirmDialog.appointmentData.horaConsulta}
                    </div>
                  </div>
                )}
                
                {confirmDialog.action !== "reschedule" ? (
                  <div className="mt-2">
                    {confirmDialog.action === "checkIn" &&
                      "El paciente aparecerá en el dashboard como pendiente de consulta."}
                    {confirmDialog.action === "cancel" && "Esta acción no se puede deshacer."}
                    {confirmDialog.action === "complete" && "El paciente pasará a estado de seguimiento."}
                    {confirmDialog.action === "noShow" && "Se marcará que el paciente no asistió a la cita."}
                  </div>
                ) : (
                  <div className="mt-4">
                    <RescheduleDatePicker
                      date={rescheduleDate}
                      time={rescheduleTime}
                      onDateChange={setRescheduleDate}
                      onTimeChange={setRescheduleTime}
                    />
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={confirmDialog.action === "reschedule" && (!rescheduleDate || !rescheduleTime)}
              className={`${
                confirmDialog.action === "checkIn" 
                  ? "bg-green-600 hover:bg-green-700" 
                  : confirmDialog.action === "cancel" 
                    ? "bg-red-600 hover:bg-red-700"
                    : confirmDialog.action === "noShow"
                      ? "bg-amber-600 hover:bg-amber-700"
                      : confirmDialog.action === "reschedule"
                        ? "bg-purple-600 hover:bg-purple-700"
                        : ""
              }`}
            >
              {confirmDialog.action === "checkIn" && "Registrar"}
              {confirmDialog.action === "cancel" && "Cancelar cita"}
              {confirmDialog.action === "complete" && "Completar"}
              {confirmDialog.action === "noShow" && "Marcar como no asistió"}
              {confirmDialog.action === "reschedule" && "Reagendar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}