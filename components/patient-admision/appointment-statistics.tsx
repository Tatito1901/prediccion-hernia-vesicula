"use client"
import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isAfter, isBefore, parseISO, isValid, startOfDay, endOfDay, addDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileBarChart,Badge, RefreshCw, AlertCircle, Download } from "lucide-react";
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
} from "./appointment-charts";

/**
 * Tipos para exportación de datos
 */
interface ExportOptions {
  filename: string;
  data: any[];
}

/**
 * Exporta datos a CSV con manejo de errores mejorado
 */
const exportToCSV = ({ data, filename }: ExportOptions): void => {
  if (!data || !data.length) {
    console.warn("No hay datos para exportar");
    return;
  }
  
  try {
    // Convertir datos a formato CSV
    const headers = Object.keys(data[0]).join(",");
    const csvRows = data.map((row) =>
      Object.values(row)
        .map((value) => {
          if (value === null || value === undefined) return "";
          if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
          if (value instanceof Date) return `"${format(value, 'yyyy-MM-dd')}"`;
          return value;
        })
        .join(",")
    );
    const csvString = [headers, ...csvRows].join("\n");
    
    // Crear blob y descargar
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Liberar recursos
  } catch (error) {
    console.error("Error al exportar a CSV:", error);
    alert("Error al exportar datos. Por favor, inténtelo de nuevo.");
  }
};

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
    if (isLoading) {
      const timer = setInterval(() => {
        setProgress((oldProgress) => {
          const newProgress = Math.min(oldProgress + 10, 100);
          if (newProgress === 100) {
            clearInterval(timer);
            setTimeout(() => {
              setIsLoading(false);
              setIsFirstLoad(false);
            }, 500);
          }
          return newProgress;
        });
      }, 200);
      return () => clearInterval(timer);
    }
  }, [isLoading]);

  // Obtener motivos de consulta únicos para el filtro
  const uniqueMotives = useMemo(() => {
    const motives = new Set<string>();
    appointments.forEach((appointment) => {
      motives.add(appointment.motivoConsulta);
    });
    return Array.from(motives).sort();
  }, [appointments]);

  // Filtrar citas por todos los criterios - optimizado con useMemo
  const filteredAppointments = useMemo(() => {
    try {
      // Asegurar que appointments es un array antes de continuar
      if (!Array.isArray(appointments)) {
        console.warn("Appointments data is not an array or not yet available for filtering.");
        setDataError("Los datos de citas no están disponibles o tienen un formato incorrecto.");
        return [];
      }

      let tempAppointments = [...appointments];
      setDataError(null);
      return tempAppointments
        .filter(appointment => appointment != null) // 1. Filtrar appointments nulos o undefined
        .filter((appointment) => {
          // Filtro por rango de fechas mejorado
          if (filters.dateRange?.from || filters.dateRange?.to) {
            const appointmentDate = appointment.fechaConsulta ? new Date(appointment.fechaConsulta) : null;
            
            // Si la fecha no es válida, decidir cómo tratarla (aquí se excluye si hay filtro de fecha)
            if (!appointmentDate || !isValid(appointmentDate)) {
              return !(filters.dateRange?.from || filters.dateRange?.to);
            }
            
            // Si solo tenemos fecha de inicio
            if (filters.dateRange?.from && !filters.dateRange?.to) {
              return isAfter(appointmentDate, startOfDay(filters.dateRange.from)) ||
                     isSameDay(appointmentDate, filters.dateRange.from);
            }
            
            // Si solo tenemos fecha de fin
            if (!filters.dateRange?.from && filters.dateRange?.to) {
              return isBefore(appointmentDate, endOfDay(filters.dateRange.to)) ||
                     isSameDay(appointmentDate, filters.dateRange.to);
            }
            
            // Si tenemos ambas fechas
            if (filters.dateRange?.from && filters.dateRange?.to) {
              return (isAfter(appointmentDate, startOfDay(filters.dateRange.from)) || 
                     isSameDay(appointmentDate, filters.dateRange.from)) &&
                    (isBefore(appointmentDate, endOfDay(filters.dateRange.to)) ||
                     isSameDay(appointmentDate, filters.dateRange.to));
            }
          }
          
          return true;
        })
        .filter((appointment) => {
          // Filtro por motivo
          return filters.motiveFilter === "all" || (appointment.motivoConsulta || "") === filters.motiveFilter;
        })
        .filter((appointment) => {
          // Filtro por estado (asumiendo que appointment.estado es un string válido de AppointmentStatus)
          // Si appointment.estado pudiera ser undefined/null, se necesitaría manejo adicional aquí o en la fuente de datos.
          return filters.statusFilter.includes(appointment.estado);
        })
        .filter((appointment) => {
          // Filtro por hora mejorado
          const appointmentHour = appointment.horaConsulta ? hourToDecimal(appointment.horaConsulta) : -1; // Usar -1 o NaN para horas inválidas
          // Asegurar que filters.timeRange es un array válido antes de acceder a sus elementos
          if (Array.isArray(filters.timeRange) && filters.timeRange.length === 2) {
            return appointmentHour >= filters.timeRange[0] && appointmentHour <= filters.timeRange[1];
          }
          // Comportamiento por defecto si filters.timeRange no es válido (p.ej. no filtrar por hora)
          return true; 
        })
        .filter((appointment) => {
          // Filtro por término de búsqueda
          if (!filters.searchTerm) return true;
          
          const searchLower = filters.searchTerm.toLowerCase().trim();
          // Usar empty string como fallback para propiedades que podrían ser null/undefined
          return (appointment.nombre || "").toLowerCase().includes(searchLower) ||
                 (appointment.apellidos || "").toLowerCase().includes(searchLower) ||
                 (appointment.motivoConsulta || "").toLowerCase().includes(searchLower) ||
                 (appointment.notas || "").toLowerCase().includes(searchLower);
        })
        .sort((a, b) => {
          // Asegurar que a.fechaHora y b.fechaHora existen y son válidos
          const dateA = a.fechaHora ? parseISO(a.fechaHora) : null;
          const dateB = b.fechaHora ? parseISO(b.fechaHora) : null;
          if (dateA && dateB && isValid(dateA) && isValid(dateB)) {
            return dateA.getTime() - dateB.getTime();
          } else if (dateA && isValid(dateA)) {
            return -1; // a antes que b si b es inválido
          } else if (dateB && isValid(dateB)) {
            return 1;  // b antes que a si a es inválido
          } else {
            return 0; // ambos inválidos o nulos, mantener orden
          }
        })
        .sort((a, b) => {
          // Ordenar por nombre completo (nombre + apellidos), manejando undefined
          const valA_nombre = a.nombre || "";
          const valA_apellidos = a.apellidos || "";
          const valB_nombre = b.nombre || "";
          const valB_apellidos = b.apellidos || "";
          const fullNameA = `${valA_nombre} ${valA_apellidos}`.trim();
          const fullNameB = `${valB_nombre} ${valB_apellidos}`.trim();
          return fullNameA.localeCompare(fullNameB);
        })
        .sort((a, b) => {
          // Ordenar por motivo, manejando undefined
          const valA_motivo = a.motivoConsulta || "";
          const valB_motivo = b.motivoConsulta || "";
          return valA_motivo.localeCompare(valB_motivo);
        })
        .sort((a, b) => {
          // Ordenar por hora, manejando undefined
          const valA_hora = a.horaConsulta || "";
          const valB_hora = b.horaConsulta || "";
          return valA_hora.localeCompare(valB_hora);
        });
    } catch (error) {
      console.error("Error al filtrar citas:", error);
      setDataError("Error al procesar los datos. Por favor, actualice la página.");
      return [];
    }
  }, [appointments, filters, setDataError]);

  // Calcular estadísticas generales de manera eficiente
  const generalStats = useMemo((): GeneralStats => {
    const total = filteredAppointments.length;
    if (total === 0) return { 
      total: 0, 
      attendance: 0, 
      cancellation: 0, 
      pending: 0, 
      present: 0,
      completed: 0,
      cancelled: 0,
      pendingCount: 0,
      presentCount: 0
    };
    
    // Contador optimizado
    const counts = filteredAppointments.reduce((acc, appointment) => {
      // Asegurarse que appointment y appointment.estado existen antes de usarlos como llave
      if (appointment && appointment.estado) {
        acc[appointment.estado] = (acc[appointment.estado] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const completed = counts.completada || 0;
    const cancelled = counts.cancelada || 0;
    const pending = counts.pendiente || 0;
    const present = counts.presente || 0;
    
    // Calcular porcentajes de manera segura
    const calcPercentage = (value: number): number => {
      return total > 0 ? (value / total) * 100 : 0;
    };
    
    return {
      total,
      attendance: calcPercentage(completed + present),
      cancellation: calcPercentage(cancelled),
      pending: calcPercentage(pending),
      present: calcPercentage(present),
      completed,
      cancelled,
      pendingCount: pending,
      presentCount: present,
      period: filters.dateRange ? 
        `${filters.dateRange.from ? format(filters.dateRange.from, 'dd/MM/yyyy') : 'Inicio'} - ${filters.dateRange.to ? format(filters.dateRange.to, 'dd/MM/yyyy') : 'Actual'}` : 
        'Todos los datos'
    };
  }, [filteredAppointments, filters.dateRange]);

  // Datos para el gráfico circular de estados
  const statusChartData = useMemo((): StatusChartData[] => {
    return [
      { name: "Completadas", value: generalStats.completed, color: STATUS_COLORS.completada },
      { name: "Canceladas", value: generalStats.cancelled, color: STATUS_COLORS.cancelada },
      { name: "Pendientes", value: generalStats.pendingCount, color: STATUS_COLORS.pendiente },
      { name: "Presentes", value: generalStats.presentCount, color: STATUS_COLORS.presente },
      { name: "Reprogramadas", value: filteredAppointments.filter((a) => a.estado === "reprogramada").length, color: STATUS_COLORS.reprogramada },
      { name: "No Asistieron", value: filteredAppointments.filter((a) => a.estado === "no_asistio").length, color: STATUS_COLORS.no_asistio },
    ];
  }, [generalStats, filteredAppointments]);

  // Datos para el gráfico de barras de motivos de consulta
  const motiveChartData = useMemo((): MotiveChartData[] => {
    const motiveCount: Record<string, number> = {};
    filteredAppointments.forEach((appointment) => {
      const motive = appointment.motivoConsulta;
      motiveCount[motive] = (motiveCount[motive] || 0) + 1;
    });
    return Object.entries(motiveCount)
      .map(([motive, count]) => ({
        motive,
        count,
      }))
      .sort((a, b) => b.count - a.count); // Ordenar por cantidad descendente
  }, [filteredAppointments]);

  // Datos para el gráfico de línea de tendencias mejorado
  const trendChartData = useMemo((): TrendChartData[] => {
    const dateCount: Record<string, number> = {};
    const statusByDate: Record<string, Record<AppointmentStatus, number>> = {};
    
    // Inicializar el objeto para almacenar estados por fecha
    filteredAppointments.forEach((appointment) => {
      const dateStr = format(new Date(appointment.fechaConsulta), "yyyy-MM-dd");
      if (!statusByDate[dateStr]) {
        statusByDate[dateStr] = {
          completada: 0,
          cancelada: 0,
          pendiente: 0,
          presente: 0,
          reprogramada: 0,
          no_asistio: 0,
        };
      }
      statusByDate[dateStr][appointment.estado]++;
      dateCount[dateStr] = (dateCount[dateStr] || 0) + 1;
    });
    
    // Convertir a formato para el gráfico y rellenar fechas faltantes
    const result = Object.entries(dateCount)
      .map(([date, count]) => ({
        date,
        total: count,
        completada: statusByDate[date].completada,
        cancelada: statusByDate[date].cancelada,
        pendiente: statusByDate[date].pendiente,
        presente: statusByDate[date].presente,
        reprogramada: statusByDate[date].reprogramada,
        no_asistio: statusByDate[date].no_asistio,
        formattedDate: format(parseISO(date), "dd/MM")
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Rellenar fechas faltantes en el rango
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
            date: dateStr,
            total: 0,
            completada: 0,
            cancelada: 0,
            pendiente: 0,
            presente: 0,
            reprogramada: 0,
            no_asistio: 0,
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
    const weekdays: Record<number, { name: string; total: number; attended: number }> = {
      0: { name: "Domingo", total: 0, attended: 0 },
      1: { name: "Lunes", total: 0, attended: 0 },
      2: { name: "Martes", total: 0, attended: 0 },
      3: { name: "Miércoles", total: 0, attended: 0 },
      4: { name: "Jueves", total: 0, attended: 0 },
      5: { name: "Viernes", total: 0, attended: 0 },
      6: { name: "Sábado", total: 0, attended: 0 },
    };
    
    filteredAppointments.forEach((appointment) => {
      const date = new Date(appointment.fechaConsulta);
      const dayOfWeek = date.getDay();
      weekdays[dayOfWeek].total++;
      if (appointment.estado === "completada" || appointment.estado === "presente") {
        weekdays[dayOfWeek].attended++;
      }
    });
    
    return Object.values(weekdays).map((day) => ({
      ...day,
      rate: day.total > 0 ? (day.attended / day.total) * 100 : 0,
    }));
  }, [filteredAppointments]);

  // Datos para el gráfico de dispersión
  const scatterData = useMemo((): ScatterData => {
    const dataByHourDay: Record<AppointmentStatus, Record<string, ScatterPoint>> = {
      completada: {},
      cancelada: {},
      pendiente: {},
      presente: {},
      reprogramada: {},
      no_asistio: {},
    };
    
    filteredAppointments.forEach((app) => {
      const date = new Date(app.fechaConsulta);
      const hour = parseInt(app.horaConsulta.split(":")[0], 10);
      const key = `${date.getDay()}-${hour}`;
      
      if (!dataByHourDay[app.estado][key]) {
        dataByHourDay[app.estado][key] = {
          day: date.getDay(),
          hour,
          count: 0,
          dayName: WEEKDAYS[date.getDay()],
        };
      }
      dataByHourDay[app.estado][key].count++;
    });
    
    return {
      completada: Object.values(dataByHourDay.completada),
      cancelada: Object.values(dataByHourDay.cancelada),
      pendiente: Object.values(dataByHourDay.pendiente),
      presente: Object.values(dataByHourDay.presente),
      reprogramada: Object.values(dataByHourDay.reprogramada),
      no_asistio: Object.values(dataByHourDay.no_asistio),
    };
  }, [filteredAppointments]);

  // Handler para refrescar datos optimizado
  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    setProgress(0);
    // Aquí podrías añadir una llamada API para obtener nuevos datos
    setTimeout(() => {
      // Simulación de carga
      setAppointments([...mockAppointments]);
    }, 300);
  }, []);
  
  // Exportar datos actuales
  const handleExportData = useCallback(() => {
    const dataToExport = filteredAppointments.map(appointment => ({
      nombre: `${appointment.nombre} ${appointment.apellidos}`,
      motivo: appointment.motivoConsulta,
      fecha: format(new Date(appointment.fechaConsulta), 'dd/MM/yyyy'),
      hora: appointment.horaConsulta,
      estado: appointment.estado,
      notas: appointment.notas
    }));
    
    exportToCSV({
      filename: `estadisticas-citas-${format(new Date(), 'yyyy-MM-dd')}`,
      data: dataToExport
    });
  }, [filteredAppointments]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="animate-in fade-in duration-200">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
          <TabsList className="h-10 p-1">
            <TabsTrigger 
              value="general" 
              className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span>General</span>
              {activeTab === "general" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left"></span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="trends" 
              className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span>Tendencias</span>
              {activeTab === "trends" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left"></span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="weekday" 
              className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span>Día de Semana</span>
              {activeTab === "weekday" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left"></span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="correlation" 
              className="flex items-center gap-1 relative data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span>Correlación</span>
              {activeTab === "correlation" && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-primary rounded-full animate-in slide-in-from-left"></span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex flex-wrap gap-2">
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
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            
            <ChartConfigControl />
          </div>
        </div>
        
        <FilterControls uniqueMotives={uniqueMotives} className="bg-card" />
        
        {dataError && (
          <Alert variant="destructive" className="animate-in slide-in-from-top duration-300">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{dataError}</AlertDescription>
          </Alert>
        )}
        
        <div className="mt-6 relative min-h-[300px]">
          <TabsContent value="general" className="space-y-8 m-0">
            {isLoading ? (
              <div className="w-full py-8">
                <p className="text-sm text-muted-foreground mb-2 text-center">Cargando datos...</p>
                <Progress value={progress} className="h-2 mx-auto max-w-md" />
              </div>
            ) : (
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
            )}
          </TabsContent>
          
          <TabsContent value="trends" className="space-y-8 m-0">
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-xl">Tendencia de Citas</CardTitle>
                <CardDescription>Visualización de la tendencia de citas a lo largo del tiempo.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="w-full h-[300px] flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground mb-2">Cargando datos...</p>
                    <Progress value={progress} className="h-2 w-1/2" />
                  </div>
                ) : (
                  renderLineChart(trendChartData, isLoading)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="weekday" className="space-y-8 m-0">
            <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-xl">Asistencia por Día de la Semana</CardTitle>
                <CardDescription>Análisis de la asistencia a citas según el día de la semana.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="w-full h-[300px] flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground mb-2">Cargando datos...</p>
                    <Progress value={progress} className="h-2 w-1/2" />
                  </div>
                ) : (
                  renderWeekdayChart(weekdayChartData, isLoading)
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="correlation" className="space-y-8 m-0">
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
                    <p className="text-sm text-muted-foreground mb-2">Cargando datos...</p>
                    <Progress value={progress} className="h-2 w-1/2" />
                  </div>
                ) : (
                  renderScatterChart(scatterData, filters.timeRange, isLoading)
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default memo(AppointmentStatistics);