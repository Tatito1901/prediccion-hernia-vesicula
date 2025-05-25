"use client"
import React, { useState, useMemo, useEffect, useCallback, memo, lazy, Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isAfter, isBefore, parseISO, isValid, startOfDay, endOfDay, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileBarChart, Badge, RefreshCw, AlertCircle, Download, Info } from "lucide-react"; // Added Info icon
import { mockAppointments } from "@/app/admision/mock-data";

// Importar los módulos personalizados
import useAppointmentFilters, { 
  type Appointment, 
  type AppointmentStatus,
  hourToDecimal
} from "./appointment-filter";

import useChartConfig, { 
  StatCard,
  type GeneralStats,
  type StatusChartData,
  type MotiveChartData,
  type TrendChartData,
  type WeekdayChartData,
  type ScatterPoint,
  type ScatterData,
  STATUS_COLORS,
  WEEKDAYS
} from "./use-chart-config";

// REMOVED: exportToCSV function and ExportOptions interface

// Tarjetas de estadísticas memoizadas para optimizar renderizado
const StatCards = memo<{ generalStats: GeneralStats, animationEnabled: boolean }>(
  ({ generalStats, animationEnabled }) => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "0ms" }}>
        <StatCard
          title="Total de Citas"
          value={generalStats.total}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Número total de citas en el rango seleccionado"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "100ms" }}>
        <StatCard
          title="Tasa de Asistencia"
          value={`${generalStats.attendance.toFixed(1)}%`}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Porcentaje de citas completadas o presentes"
          color="bg-green-50 dark:bg-green-950/20"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "200ms" }}>
        <StatCard
          title="Tasa de Cancelación"
          value={`${generalStats.cancellation.toFixed(1)}%`}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Porcentaje de citas canceladas"
          color="bg-red-50 dark:bg-red-950/20"
          animated={animationEnabled}
        />
      </div>
      <div className={animationEnabled ? "animate-in fade-in" : ""} style={{ animationDelay: "300ms" }}>
        <StatCard
          title="Citas Pendientes"
          value={generalStats.pendingCount}
          icon={<FileBarChart className="h-4 w-4" />}
          description="Número de citas aún pendientes"
          color="bg-amber-50 dark:bg-amber-950/20"
          animated={animationEnabled}
        />
      </div>
    </div>
  )
);
StatCards.displayName = "StatCards";


// --- Components for Lazy Loading Tab Content ---

// Props for tab content components
interface TabContentProps {
  generalStats: GeneralStats;
  statusChartData: StatusChartData[];
  motiveChartData: MotiveChartData[];
  trendChartData: TrendChartData[];
  weekdayChartData: WeekdayChartData[];
  scatterData: ScatterData;
  timeRange: [number, number];
  isLoading: boolean;
  renderPieChart: (data: StatusChartData[], stats: GeneralStats, loading: boolean) => JSX.Element;
  renderBarChart: (data: MotiveChartData[], loading: boolean) => JSX.Element;
  renderLineChart: (data: TrendChartData[], loading: boolean) => JSX.Element;
  renderWeekdayChart: (data: WeekdayChartData[], loading: boolean) => JSX.Element;
  renderScatterChart: (data: ScatterData, range: [number, number], loading: boolean) => JSX.Element;
  progress: number;
  isFirstLoad: boolean;
}

const GeneralTabContentComponent: React.FC<Pick<TabContentProps, 'generalStats' | 'statusChartData' | 'motiveChartData' | 'renderPieChart' | 'renderBarChart' | 'isLoading' | 'progress' | 'isFirstLoad'>> = ({
  generalStats, statusChartData, motiveChartData, renderPieChart, renderBarChart, isLoading, progress, isFirstLoad
}) => (
  <>
    <StatCards generalStats={generalStats} animationEnabled={isFirstLoad} />
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-muted/20">
        <CardTitle className="text-xl flex items-center">
          <span className="mr-2">Distribución de Estados</span>
          {generalStats.period && (
            <Badge variant="outline" className="text-xs font-normal ml-2">
              {generalStats.period}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Visualización de la proporción de cada estado de cita.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {renderPieChart(statusChartData, generalStats, isLoading)}
      </CardContent>
    </Card>
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="bg-muted/20">
        <CardTitle className="text-xl">Motivos de Consulta</CardTitle>
        <CardDescription>Distribución de los diferentes motivos de consulta.</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {renderBarChart(motiveChartData, isLoading)}
      </CardContent>
    </Card>
  </>
);

const TrendsTabContentComponent: React.FC<Pick<TabContentProps, 'trendChartData' | 'renderLineChart' | 'isLoading' | 'progress'>> = ({
  trendChartData, renderLineChart, isLoading, progress
}) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Tendencia de Citas</CardTitle>
      <CardDescription>Visualización de la tendencia de citas a lo largo del tiempo.</CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de tendencias...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderLineChart(trendChartData, isLoading)
      )}
    </CardContent>
  </Card>
);

const WeekdayTabContentComponent: React.FC<Pick<TabContentProps, 'weekdayChartData' | 'renderWeekdayChart' | 'isLoading' | 'progress'>> = ({
  weekdayChartData, renderWeekdayChart, isLoading, progress
}) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Asistencia por Día de la Semana</CardTitle>
      <CardDescription>Análisis de la asistencia a citas según el día de la semana.</CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de asistencia...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderWeekdayChart(weekdayChartData, isLoading)
      )}
    </CardContent>
  </Card>
);

const CorrelationTabContentComponent: React.FC<Pick<TabContentProps, 'scatterData' | 'timeRange' | 'renderScatterChart' | 'isLoading' | 'progress'>> = ({
  scatterData, timeRange, renderScatterChart, isLoading, progress
}) => (
  <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
    <CardHeader className="bg-muted/20">
      <CardTitle className="text-xl">Correlación Hora vs Día</CardTitle>
      <CardDescription>
        Análisis de la correlación entre la hora del día y el día de la semana para las citas.
      </CardDescription>
    </CardHeader>
    <CardContent className="p-6">
      {isLoading ? (
        <div className="w-full h-[350px] flex flex-col items-center justify-center">
          <p className="text-sm text-muted-foreground mb-2">Cargando datos de correlación...</p>
          <Progress value={progress} className="h-2 w-1/2" />
        </div>
      ) : (
        renderScatterChart(scatterData, timeRange, isLoading)
      )}
    </CardContent>
  </Card>
);

// Lazy load tab content components
// This syntax is for same-file components. For separate files, use: lazy(() => import('./GeneralTabContent'));
const LazyGeneralTabContent = lazy(() => Promise.resolve({ default: GeneralTabContentComponent }));
const LazyTrendsTabContent = lazy(() => Promise.resolve({ default: TrendsTabContentComponent }));
const LazyWeekdayTabContent = lazy(() => Promise.resolve({ default: WeekdayTabContentComponent }));
const LazyCorrelationTabContent = lazy(() => Promise.resolve({ default: CorrelationTabContentComponent }));

// Fallback for Suspense
const TabLoadingFallback = () => (
  <div className="w-full py-8 flex flex-col items-center justify-center min-h-[300px]">
    <RefreshCw className="h-6 w-6 animate-spin text-primary mb-3" />
    <p className="text-sm text-muted-foreground">Cargando contenido de la pestaña...</p>
  </div>
);


/**
 * Componente Principal de Estadísticas de Citas mejorado
 */
export function AppointmentStatistics() {
  // Estados para los datos
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [dataError, setDataError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [exportMessage, setExportMessage] = useState<string | null>(null); // For export status

  // Importar funcionalidades de filtros y gráficos desde los módulos
  const { 
    filters, 
    updateFilter, 
    resetFilters, 
    FilterControls,
    isMobile
  } = useAppointmentFilters();

  const {
    chartConfig,
    ChartConfigControl,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart
  } = useChartConfig();

  // Asegurarse de que el componente solo se renderice en el cliente
  useEffect(() => {
    setMounted(true);
  }, []);

  // Simular carga de datos con progreso
  useEffect(() => {
    if (isLoading && mounted) { // Ensure mounted before starting
      setProgress(0); // Reset progress on new load
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          const newProgress = Math.min(oldProgress + 10, 100);
          if (newProgress === 100) {
            clearInterval(timer);
            setTimeout(() => {
              setIsLoading(false);
              if (isFirstLoad) setIsFirstLoad(false); // Set first load to false after initial loading
            }, 300); // Shorter delay after progress hits 100
          }
          return newProgress;
        });
      }, 150); // Slightly faster progress update
      return () => clearInterval(timer);
    }
  }, [isLoading, mounted, isFirstLoad]);

  // Obtener motivos de consulta únicos para el filtro
  const uniqueMotives = useMemo(() => {
    const motives = new Set<string>();
    appointments.forEach((appointment) => {
      if (appointment && appointment.motivoConsulta) { // Check for null appointment or motive
        motives.add(appointment.motivoConsulta);
      }
    });
    return Array.from(motives).sort();
  }, [appointments]);

  // Filtrar citas por todos los criterios - optimizado con useMemo
  const filteredAppointments = useMemo(() => {
    try {
      if (!Array.isArray(appointments)) {
        console.warn("Appointments data is not an array or not yet available for filtering.");
        setDataError("Los datos de citas no están disponibles o tienen un formato incorrecto.");
        return [];
      }

      let tempAppointments = [...appointments];
      setDataError(null); // Clear previous errors

      return tempAppointments
        .filter(appointment => appointment != null) 
        .filter((appointment) => {
          const datePart = format(appointment.fechaConsulta, 'yyyy-MM-dd');
          const timePart = appointment.horaConsulta;
          // Ensure timePart is a valid time string like HH:mm
          if (!/^\d{2}:\d{2}$/.test(timePart)) {
            console.warn(`Hora inválida para la cita ID ${appointment.id}: ${timePart}`);
            return false; // Skip if time is invalid
          }
          const fechaHoraString = `${datePart}T${timePart}:00`; 
          const appointmentDate = parseISO(fechaHoraString);

          if (!isValid(appointmentDate)) {
            console.warn(`Fecha inválida para la cita ID ${appointment.id}: ${fechaHoraString}`);
            return false;
          }

          if (filters.dateRange?.from || filters.dateRange?.to) {
            if (filters.dateRange.from && !filters.dateRange.to) {
              return isAfter(appointmentDate, startOfDay(filters.dateRange.from)) || isSameDay(appointmentDate, filters.dateRange.from);
            }
            if (!filters.dateRange.from && filters.dateRange.to) {
              return isBefore(appointmentDate, endOfDay(filters.dateRange.to)) || isSameDay(appointmentDate, filters.dateRange.to);
            }
            if (filters.dateRange.from && filters.dateRange.to) {
              return (isAfter(appointmentDate, startOfDay(filters.dateRange.from)) || isSameDay(appointmentDate, filters.dateRange.from)) &&
                     (isBefore(appointmentDate, endOfDay(filters.dateRange.to)) || isSameDay(appointmentDate, filters.dateRange.to));
            }
          }
          return true;
        })
        .filter(appointment => filters.motiveFilter === "all" || (appointment.motivoConsulta || "") === filters.motiveFilter)
        .filter(appointment => filters.statusFilter.includes(appointment.estado))
        .filter(appointment => {
          const appointmentHour = appointment.horaConsulta ? hourToDecimal(appointment.horaConsulta) : -1;
          if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
            return appointmentHour >= filters.timeRange[0] && appointmentHour <= filters.timeRange[1];
          }
          return true; 
        })
        .filter(appointment => {
          if (!filters.searchTerm) return true;
          const searchLower = filters.searchTerm.toLowerCase().trim();
          return (appointment.nombre || "").toLowerCase().includes(searchLower) ||
                 (appointment.apellidos || "").toLowerCase().includes(searchLower) ||
                 (appointment.motivoConsulta || "").toLowerCase().includes(searchLower) ||
                 (appointment.notas || "").toLowerCase().includes(searchLower);
        })
        // MODIFIED: Combined sort for performance and clarity
        .sort((a, b) => {
          // 1. Sort by horaConsulta (lexicographical string compare)
          const horaCompare = (a.horaConsulta || "25:00").localeCompare(b.horaConsulta || "25:00"); // Fallback for robust comparison
          if (horaCompare !== 0) return horaCompare;

          // 2. Sort by motivoConsulta
          const motiveCompare = (a.motivoConsulta || "").localeCompare(b.motivoConsulta || "");
          if (motiveCompare !== 0) return motiveCompare;

          // 3. Sort by nombre + apellidos
          const valA_nombre = a.nombre || "";
          const valA_apellidos = a.apellidos || "";
          const valB_nombre = b.nombre || "";
          const valB_apellidos = b.apellidos || "";
          const fullNameA = `${valA_nombre} ${valA_apellidos}`.trim();
          const fullNameB = `${valB_nombre} ${valB_apellidos}`.trim();
          const nameCompare = fullNameA.localeCompare(fullNameB);
          if (nameCompare !== 0) return nameCompare;

          // 4. Sort by full fechaHora (parsed date object)
          const datePartA = format(a.fechaConsulta, 'yyyy-MM-dd');
          const timePartA = a.horaConsulta;
          const datePartB = format(b.fechaConsulta, 'yyyy-MM-dd');
          const timePartB = b.horaConsulta;

          // Ensure time parts are valid before parsing
          const validTimeA = /^\d{2}:\d{2}$/.test(timePartA);
          const validTimeB = /^\d{2}:\d{2}$/.test(timePartB);

          const dateA = validTimeA ? parseISO(`${datePartA}T${timePartA}:00`) : null;
          const dateB = validTimeB ? parseISO(`${datePartB}T${timePartB}:00`) : null;
          
          if (dateA && dateB && isValid(dateA) && isValid(dateB)) {
            return dateA.getTime() - dateB.getTime();
          } else if (dateA && isValid(dateA)) {
            return -1; 
          } else if (dateB && isValid(dateB)) {
            return 1;  
          }
          return 0;
        });
    } catch (error) {
      console.error("Error al filtrar citas:", error);
      setDataError("Error al procesar los datos. Por favor, actualice la página o verifique los filtros.");
      return [];
    }
  }, [appointments, filters, setDataError]); // Added setDataError to dependencies

  // Calcular estadísticas generales de manera eficiente
  const generalStats = useMemo((): GeneralStats => {
    const total = filteredAppointments.length;
    if (total === 0) return { 
      total: 0, attendance: 0, cancellation: 0, pending: 0, present: 0,
      completed: 0, cancelled: 0, pendingCount: 0, presentCount: 0,
      period: filters.dateRange ? 
        `${filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : 'Inicio'} - ${filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : 'Actual'}` : 
        'Todos los datos'
    };
    
    const counts = filteredAppointments.reduce((acc, appointment) => {
      if (appointment && appointment.estado) {
        acc[appointment.estado] = (acc[appointment.estado] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const completed = counts.completada || 0;
    const cancelled = counts.cancelada || 0;
    const pending = counts.pendiente || 0;
    const present = counts.presente || 0;
    
    const calcPercentage = (value: number): number => total > 0 ? (value / total) * 100 : 0;
    
    return {
      total,
      attendance: calcPercentage(completed + present),
      cancellation: calcPercentage(cancelled),
      pending: calcPercentage(pending),
      present: calcPercentage(present),
      completed, cancelled, pendingCount: pending, presentCount: present,
      period: filters.dateRange ? 
        `${filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : 'Inicio'} - ${filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : 'Actual'}` : 
        'Todos los datos'
    };
  }, [filteredAppointments, filters.dateRange]);

  // Datos para el gráfico circular de estados
  const statusChartData = useMemo((): StatusChartData[] => [
    { name: "Completadas", value: generalStats.completed, color: STATUS_COLORS.completada },
    { name: "Canceladas", value: generalStats.cancelled, color: STATUS_COLORS.cancelada },
    { name: "Pendientes", value: generalStats.pendingCount, color: STATUS_COLORS.pendiente },
    { name: "Presentes", value: generalStats.presentCount, color: STATUS_COLORS.presente },
    { name: "Reprogramadas", value: filteredAppointments.filter((a) => a.estado === "reprogramada").length, color: STATUS_COLORS.reprogramada },
    { name: "No Asistieron", value: filteredAppointments.filter((a) => a.estado === "no_asistio").length, color: STATUS_COLORS.no_asistio },
  ], [generalStats, filteredAppointments]);

  // Datos para el gráfico de barras de motivos de consulta
  const motiveChartData = useMemo((): MotiveChartData[] => {
    const motiveCount: Record<string, number> = {};
    filteredAppointments.forEach((appointment) => {
      const motive = appointment.motivoConsulta || "Desconocido"; // Fallback for undefined motive
      motiveCount[motive] = (motiveCount[motive] || 0) + 1;
    });
    return Object.entries(motiveCount)
      .map(([motive, count]) => ({ motive, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAppointments]);

  // Datos para el gráfico de línea de tendencias mejorado
  const trendChartData = useMemo((): TrendChartData[] => {
    const statusByDate: Record<string, Record<AppointmentStatus | 'total', number>> = {};
    
    filteredAppointments.forEach((appointment) => {
      const dateStr = format(new Date(appointment.fechaConsulta), "yyyy-MM-dd");
      if (!statusByDate[dateStr]) {
        statusByDate[dateStr] = {
          total: 0, completada: 0, cancelada: 0, pendiente: 0, 
          presente: 0, reprogramada: 0, no_asistio: 0,
        };
      }
      statusByDate[dateStr].total++;
      statusByDate[dateStr][appointment.estado]++;
    });
    
    const result = Object.entries(statusByDate)
      .map(([date, counts]) => ({
        date,
        total: counts.total,
        completada: counts.completada,
        cancelada: counts.cancelada,
        pendiente: counts.pendiente,
        presente: counts.presente,
        reprogramada: counts.reprogramada,
        no_asistio: counts.no_asistio,
        formattedDate: format(parseISO(date), "dd/MM")
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    if (result.length > 0 && filters.dateRange?.from && filters.dateRange?.to) {
      const filledDates: TrendChartData[] = [];
      let currentDate = startOfDay(filters.dateRange.from);
      const endDate = endOfDay(filters.dateRange.to);
      
      while (isBefore(currentDate, endDate) || isSameDay(currentDate, endDate)) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        const existingData = result.find(item => item.date === dateStr);
        
        if (existingData) {
          filledDates.push(existingData);
        } else {
          filledDates.push({
            date: dateStr, total: 0, completada: 0, cancelada: 0, pendiente: 0, 
            presente: 0, reprogramada: 0, no_asistio: 0,
            formattedDate: format(currentDate, "dd/MM")
          });
        }
        currentDate = addDays(currentDate, 1);
      }
      return filledDates;
    }
    return result;
  }, [filteredAppointments, filters.dateRange]);

  // Datos para el gráfico de asistencia por día de la semana
  const weekdayChartData = useMemo((): WeekdayChartData[] => {
    const weekdaysInit: Record<number, { name: string; total: number; attended: number }> = {
      0: { name: "Domingo", total: 0, attended: 0 }, 1: { name: "Lunes", total: 0, attended: 0 },
      2: { name: "Martes", total: 0, attended: 0 }, 3: { name: "Miércoles", total: 0, attended: 0 },
      4: { name: "Jueves", total: 0, attended: 0 }, 5: { name: "Viernes", total: 0, attended: 0 },
      6: { name: "Sábado", total: 0, attended: 0 },
    };
    
    filteredAppointments.forEach((appointment) => {
      const date = new Date(appointment.fechaConsulta);
      const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
      if (weekdaysInit[dayOfWeek]) { // Ensure dayOfWeek is a valid key
        weekdaysInit[dayOfWeek].total++;
        if (appointment.estado === "completada" || appointment.estado === "presente") {
          weekdaysInit[dayOfWeek].attended++;
        }
      }
    });
    
    return Object.values(weekdaysInit).map(day => ({
      ...day, rate: day.total > 0 ? (day.attended / day.total) * 100 : 0,
    }));
  }, [filteredAppointments]);

  // Datos para el gráfico de dispersión
  const scatterData = useMemo((): ScatterData => {
    const dataByHourDay: Record<AppointmentStatus, Record<string, ScatterPoint>> = {
      completada: {}, cancelada: {}, pendiente: {}, presente: {}, reprogramada: {}, no_asistio: {},
    };
    
    filteredAppointments.forEach((app) => {
      const date = new Date(app.fechaConsulta);
      // Ensure horaConsulta is valid before splitting
      const hourString = app.horaConsulta || "00:00";
      const hour = parseInt(hourString.split(":")[0], 10);
      const dayOfWeek = date.getDay();
      const key = `${dayOfWeek}-${hour}`;
      
      if (!dataByHourDay[app.estado][key]) {
        dataByHourDay[app.estado][key] = {
          day: dayOfWeek, hour, count: 0, dayName: WEEKDAYS[dayOfWeek],
        };
      }
      dataByHourDay[app.estado][key].count++;
    });
    
    return {
      completada: Object.values(dataByHourDay.completada), cancelada: Object.values(dataByHourDay.cancelada),
      pendiente: Object.values(dataByHourDay.pendiente), presente: Object.values(dataByHourDay.presente),
      reprogramada: Object.values(dataByHourDay.reprogramada), no_asistio: Object.values(dataByHourDay.no_asistio),
    };
  }, [filteredAppointments]);

  // Handler para refrescar datos optimizado
  const handleRefresh = useCallback(() => {
    if (isLoading) return; // Prevent multiple refreshes
    setIsLoading(true);
    // setProgress(0); // isLoading effect will handle progress
    // Aquí podrías añadir una llamada API para obtener nuevos datos
    setTimeout(() => {
      // Simulación de carga
      // Create a new array from mockAppointments to ensure change detection
      setAppointments([...mockAppointments.map(a => ({...a, id: `${a.id}-${Date.now()}`}))]); 
    }, 300);
  }, [isLoading]); // Added isLoading to dependency
  
  // MODIFIED: Exportar datos actuales (sin CSV)
  const handleExportData = useCallback(() => {
    if (filteredAppointments.length === 0) {
      setExportMessage("No hay datos filtrados para exportar.");
      setTimeout(() => setExportMessage(null), 3000);
      return;
    }

    const dataToExport = filteredAppointments.map(appointment => ({
      nombre_completo: `${appointment.nombre || ""} ${appointment.apellidos || ""}`.trim(),
      motivo_consulta: appointment.motivoConsulta,
      fecha: appointment.fechaConsulta ? format(new Date(appointment.fechaConsulta), 'dd/MM/yyyy') : 'N/A',
      hora: appointment.horaConsulta,
      estado: appointment.estado,
      notas: appointment.notas
    }));
    
    console.log("Datos preparados para exportar:", dataToExport);
    setExportMessage("Datos preparados y listados en la consola. Puede implementar aquí su lógica de exportación personalizada (ej. enviar a API, copiar al portapapeles).");
    // Clear message after some time
    setTimeout(() => setExportMessage(null), 7000);

  }, [filteredAppointments]);

  if (!mounted) {
    return ( // Basic loading state before mount
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Props for tab content, passed to Suspense wrapped components
  const tabContentProps: Omit<TabContentProps, 'isLoading' | 'progress'> = {
    generalStats,
    statusChartData,
    motiveChartData,
    trendChartData,
    weekdayChartData,
    scatterData,
    timeRange: filters.timeRange,
    renderPieChart,
    renderBarChart,
    renderLineChart,
    renderWeekdayChart,
    renderScatterChart,
    isFirstLoad
  };

  return (
    <div className={`animate-in fade-in duration-300 ${isFirstLoad ? 'opacity-0' : 'opacity-100'}`}>
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <TabsList className="h-10 p-1">
            {["general", "trends", "weekday", "correlation"].map((tabValue) => (
              <TabsTrigger 
                key={tabValue}
                value={tabValue} 
                className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground capitalize"
              >
                <span>{tabValue === 'weekday' ? 'Día Semana' : tabValue}</span>
                {activeTab === tabValue && (
                  <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left-1/2"></span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              className="h-9 transition-all hover:bg-muted"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Actualizando...' : 'Actualizar'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportData}
              className="h-9 transition-all hover:bg-muted"
              disabled={isLoading || filteredAppointments.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> {/* Kept Download icon, but behavior changed */}
              Exportar Datos {/* MODIFIED: Button text */}
            </Button>
            
            <ChartConfigControl />
          </div>
        </div>
        
        <FilterControls uniqueMotives={uniqueMotives} className="bg-card p-4 rounded-lg shadow" /> {/* Added some styling */}
        
        {exportMessage && (
          <Alert variant="default" className="my-4 animate-in fade-in bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-700">
             <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-700 dark:text-blue-300">Información de Exportación</AlertTitle>
            <AlertDescription className="text-blue-600 dark:text-blue-400">{exportMessage}</AlertDescription>
          </Alert>
        )}

        {dataError && (
          <Alert variant="destructive" className="my-4 animate-in slide-in-from-top duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error en los Datos</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 relative min-h-[350px]"> {/* Increased min-height for Suspense fallback */}
          <Suspense fallback={<TabLoadingFallback />}>
            <TabsContent value="general" className="space-y-8 m-0">
              {isLoading && activeTab === "general" ? ( // Show main loader only if this tab is active and loading
                <div className="w-full py-8">
                  <p className="text-sm text-muted-foreground mb-2 text-center">Cargando datos generales...</p>
                  <Progress value={progress} className="h-2 mx-auto max-w-md" />
                </div>
              ) : (
                <LazyGeneralTabContent 
                  {...tabContentProps} 
                  isLoading={isLoading} 
                  progress={progress}
                />
              )}
            </TabsContent>
            
            <TabsContent value="trends" className="space-y-8 m-0">
               <LazyTrendsTabContent 
                  {...tabContentProps} 
                  isLoading={isLoading} 
                  progress={progress}
               />
            </TabsContent>
            
            <TabsContent value="weekday" className="space-y-8 m-0">
              <LazyWeekdayTabContent 
                {...tabContentProps} 
                isLoading={isLoading} 
                progress={progress}
              />
            </TabsContent>
            
            <TabsContent value="correlation" className="space-y-8 m-0">
              <LazyCorrelationTabContent 
                {...tabContentProps} 
                isLoading={isLoading} 
                progress={progress}
              />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}

export default memo(AppointmentStatistics);
