"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts"
import { Button } from "@/components/ui/button"
import { Info, HelpCircle, BarChart2, TrendingUp, Activity } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import type { PatientData } from "@/app/dashboard/data-model"
import { chartStyles as baseChartStyles } from "@/lib/chart-theme"
import { cn } from "@/lib/utils"
import { useTheme } from 'next-themes';

// Diagnósticos principales que monitoreamos
const MAIN_DIAGNOSES = [
  "Hernia Inguinal",
  "Hernia Umbilical", 
  "Hernia Incisional",
  "Vesícula",
  "Colelitiasis",
  "Apendicitis",
  "Otro"
];

// Interfaz simplificada para configuración del gráfico
interface ChartConfig {
  viewType: 'line' | 'bar';
  timeFrame: 'monthly' | 'quarterly';
  showTrend: boolean;
}

interface DiagnosisTimelineChartProps {
  patients: PatientData[];
  className?: string;
}

export function DiagnosisTimelineChart({ patients, className }: DiagnosisTimelineChartProps) {
  const { theme, resolvedTheme } = useTheme(); // Get theme
  const currentTheme = resolvedTheme || theme;

  // Theme-aware colors from globals.css
  const foregroundColor = currentTheme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))';
  const mutedForegroundColor = currentTheme === 'dark' ? 'hsl(var(--muted-foreground))' : 'hsl(var(--muted-foreground))';
  const popoverBgColor = currentTheme === 'dark' ? 'hsl(var(--popover))' : 'hsl(var(--popover))';
  const popoverFgColor = currentTheme === 'dark' ? 'hsl(var(--popover-foreground))' : 'hsl(var(--popover-foreground))';
  const borderColor = currentTheme === 'dark' ? 'hsl(var(--border))' : 'hsl(var(--border))';
  const primaryColor = currentTheme === 'dark' ? 'hsl(var(--primary))' : 'hsl(var(--primary))';
  const secondaryColor = currentTheme === 'dark' ? 'hsl(var(--secondary))' : 'hsl(var(--secondary))';
  const accentColor = currentTheme === 'dark' ? 'hsl(var(--accent))' : 'hsl(var(--accent))';
  const destructiveColor = currentTheme === 'dark' ? 'hsl(var(--destructive))' : 'hsl(var(--destructive))';
  const infoColor = currentTheme === 'dark' ? 'hsl(var(--info))' : 'hsl(var(--info))'; // Assuming 'info' exists in globals.css
  const successColor = currentTheme === 'dark' ? 'hsl(var(--success))' : 'hsl(var(--success))'; // Assuming 'success' exists
  const warningColor = currentTheme === 'dark' ? 'hsl(var(--warning))' : 'hsl(var(--warning))'; // Assuming 'warning' exists

  const DIAGNOSIS_COLORS = useMemo(() => ({
    "Hernia Inguinal": primaryColor,
    "Hernia Umbilical": secondaryColor,
    "Hernia Incisional": accentColor,
    "Vesícula": warningColor, 
    "Colelitiasis": destructiveColor, 
    "Apendicitis": destructiveColor, // Could use a different shade or another specific color
    "Otro": mutedForegroundColor
  }), [currentTheme, primaryColor, secondaryColor, accentColor, warningColor, destructiveColor, mutedForegroundColor]);

  // Estado simplificado para la configuración
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    viewType: 'line',
    timeFrame: 'monthly',
    showTrend: false
  });
  
  // Estado para el modal de ayuda
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  
  // Procesar los datos para el gráfico con memoización para mejor rendimiento
  const { chartData, totalsByDiagnosis } = useMemo(() => {
    // Función para obtener trimestre
    const getQuarter = (date: Date) => {
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    };
    
    // Obtener período (mes o trimestre) según configuración
    const getPeriod = (date: Date) => {
      if (chartConfig.timeFrame === 'quarterly') {
        return getQuarter(date);
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }
    };
    
    // Inicializar contadores para totales por diagnóstico
    const diagnosisCounts: Record<string, number> = {};
    MAIN_DIAGNOSES.forEach(diag => { diagnosisCounts[diag] = 0; });
    
    // Agrupar pacientes por período
    const timelineData = patients.reduce((acc, patient) => {
      if (!patient.fechaConsulta || !patient.diagnostico) return acc;
      
      const date = new Date(patient.fechaConsulta);
      const period = getPeriod(date);
      
      // Asegurarse de que el diagnóstico está en nuestra lista principal
      // Si no, asignarlo a "Otro"
      const diagnosis = MAIN_DIAGNOSES.includes(patient.diagnostico) 
                      ? patient.diagnostico 
                      : "Otro";
      
      // Incrementar contador total por diagnóstico
      diagnosisCounts[diagnosis] = (diagnosisCounts[diagnosis] || 0) + 1;
      
      // Inicializar el período si no existe
      if (!acc[period]) {
        acc[period] = {
          period,
          periodLabel: formatPeriod(period, chartConfig.timeFrame),
          total: 0
        };
        
        // Inicializar contadores para cada diagnóstico
        MAIN_DIAGNOSES.forEach(diag => {
          acc[period][diag] = 0;
        });
      }
      
      // Incrementar contador del diagnóstico
      acc[period][diagnosis] = (acc[period][diagnosis] || 0) + 1;
      
      // Incrementar el total del período
      acc[period].total += 1;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Convertir a array y ordenar por fecha
    const sortedData = Object.values(timelineData).sort((a, b) => a.period.localeCompare(b.period));
    
    // Obtener diagnósticos ordenados por frecuencia para mostrar primero los más comunes
    const sortedDiagnoses = Object.entries(diagnosisCounts)
      .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
      .map(([diagnosis]) => diagnosis);
    
    return {
      chartData: sortedData,
      totalsByDiagnosis: diagnosisCounts,
      sortedDiagnoses
    };
  }, [patients, chartConfig.timeFrame]);
  
  // Formatear etiquetas de períodos
  function formatPeriod(period: string, timeFrame: 'monthly' | 'quarterly') {
    if (timeFrame === 'quarterly') {
      const [year, quarter] = period.split('-');
      return `${quarter} ${year.slice(2)}`;
    } else {
      const [year, monthNum] = period.split("-");
      const date = new Date(Number.parseInt(year), Number.parseInt(monthNum) - 1, 1);
      return date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" });
    }
  }
  
  // Calcular promedio móvil para línea de tendencia
  const calculateTrendData = (data: any[]) => {
    if (!data || data.length < 2) return [];
    
    const trendData = [...data].map((item, index, array) => {
      // Promedio de 3 períodos (o menos si estamos al principio)
      const startIdx = Math.max(0, index - 1);
      const endIdx = Math.min(array.length - 1, index + 1);
      const totalItems = endIdx - startIdx + 1;
      
      let sum = 0;
      for (let i = startIdx; i <= endIdx; i++) {
        sum += array[i].total;
      }
      
      return {
        ...item,
        trend: Math.round(sum / totalItems)
      };
    });
    
    return trendData;
  };
  
  // Obtener el valor máximo para escalar el gráfico correctamente
  const maxValue = useMemo(() => {
    if (!chartData || chartData.length === 0) return 10;
    return Math.max(...chartData.map(item => item.total)) * 1.2; // 20% de margen
  }, [chartData]);
  
  // Obtener los 3 diagnósticos más comunes
  const topDiagnoses = useMemo(() => {
    return Object.entries(totalsByDiagnosis || {})
      .sort(([, countA], [, countB]) => (countB as number) - (countA as number))
      .slice(0, 3)
      .map(([diagnosis, count]) => ({
        diagnosis,
        count,
        percentage: patients.length ? Math.round((count as number) / patients.length * 100) : 0
      }));
  }, [totalsByDiagnosis, patients.length]);
  
  // Componente de ayuda para modales
  const HelpContent = () => (
    <div className="space-y-4 mt-2">
      <div className="bg-muted/40 p-4 rounded-lg">
        <h4 className="font-medium text-primary mb-2">Cómo interpretar este gráfico</h4>
        <p>Este gráfico muestra la evolución temporal de diagnósticos en su clínica, permitiéndole visualizar tendencias y planificar recursos de manera más efectiva.</p>
      </div>
      
      <div className="space-y-2">
        <h4 className="font-medium">Consejos para su uso:</h4>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Vista de línea:</strong> Ideal para ver tendencias y evolución en el tiempo</li>
          <li><strong>Vista de barras:</strong> Mejor para comparar volúmenes de diferentes diagnósticos</li>
          <li><strong>Vista trimestral:</strong> Útil para planificación estratégica</li>
          <li><strong>Vista mensual:</strong> Para análisis más detallado</li>
          <li><strong>Línea de tendencia:</strong> Muestra el patrón general, filtrando fluctuaciones temporales</li>
        </ul>
      </div>
      
      <div className="bg-muted/40 p-4 rounded-lg">
        <h4 className="font-medium text-primary mb-2">Aplicaciones prácticas</h4>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Gestión de inventario:</strong> Anticipar necesidades de materiales según el aumento de ciertos diagnósticos</li>
          <li><strong>Planificación de personal:</strong> Prepararse para períodos de mayor demanda</li>
          <li><strong>Estrategia de la clínica:</strong> Identificar áreas de especialización o crecimiento</li>
          <li><strong>Campañas preventivas:</strong> Enfocar esfuerzos en condiciones con tendencia creciente</li>
        </ul>
      </div>
    </div>
  );

  const chartStyles = {
    ...baseChartStyles, // Spread base styles
    tooltip: {
      ...baseChartStyles.tooltip,
      backgroundColor: popoverBgColor,
      color: popoverFgColor,
      borderColor: borderColor,
    },
    legend: {
      ...baseChartStyles.legend,
      color: foregroundColor,
    },
    axis: {
      ...baseChartStyles.axis,
      tickColor: borderColor,
      lineColor: borderColor,
      labelColor: mutedForegroundColor,
    },
    grid: {
      ...baseChartStyles.grid,
      stroke: borderColor,
    }
  };

  // Renderizar el contenido del gráfico
  const renderChart = () => {
    const trendData = chartConfig.showTrend ? calculateTrendData(chartData) : chartData;
    
    if (chartConfig.viewType === 'line') {
      return (
        <LineChart
          data={trendData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray={chartStyles.grid.strokeDasharray} stroke={chartStyles.grid.stroke} vertical={chartStyles.grid.vertical} />
          <XAxis 
            dataKey="periodLabel" 
            tickLine={false} 
            axisLine={{ stroke: chartStyles.axis.lineColor }} 
            tick={{ fill: chartStyles.axis.labelColor, fontSize: chartStyles.axis.labelFontSize }} 
          />
          <YAxis 
            tickLine={false} 
            axisLine={{ stroke: chartStyles.axis.lineColor }} 
            tick={{ fill: chartStyles.axis.labelColor, fontSize: chartStyles.axis.labelFontSize }} 
            domain={[0, maxValue]}
          />
          <Tooltip
            contentStyle={chartStyles.tooltip}
            cursor={{ fill: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}
            formatter={(value, name) => [`${value} pacientes`, name === "trend" ? "Tendencia" : name]}
          />
          <Legend wrapperStyle={{ color: chartStyles.legend.color, fontSize: chartStyles.legend.fontSize, paddingTop: '10px' }} iconType="circle" iconSize={chartStyles.legend.iconSize} />
          
          {/* Renderizar líneas para cada diagnóstico */}
          {MAIN_DIAGNOSES.map(diagnosis => (
            <Line
              key={diagnosis}
              type="monotone"
              dataKey={diagnosis}
              stroke={DIAGNOSIS_COLORS[diagnosis as keyof typeof DIAGNOSIS_COLORS] || chartStyles.axis.labelColor}
              strokeWidth={chartStyles.line.strokeWidth}
              dot={{ r: chartStyles.line.dotSize, fill: DIAGNOSIS_COLORS[diagnosis as keyof typeof DIAGNOSIS_COLORS] || chartStyles.axis.labelColor }}
              activeDot={{ r: chartStyles.line.activeDotSize, stroke: DIAGNOSIS_COLORS[diagnosis as keyof typeof DIAGNOSIS_COLORS] || chartStyles.axis.labelColor }}
              animationDuration={chartStyles.animation.duration}
            />
          ))}
          
          {/* Línea de tendencia para el total de diagnósticos */}
          {chartConfig.showTrend && (
            <Line
              key="trend-line"
              type="monotone"
              dataKey="trend" // Use 'trend' from trendData
              name="Tendencia (Total)" // Name for the legend
              stroke={primaryColor} // Use a distinct color, e.g., primary or a specific trend color
              strokeWidth={chartStyles.line.strokeWidth + 1} // Slightly thicker or different style
              strokeDasharray="5 5" // Dashed line to differentiate
              dot={false} // No dots for trend line typically
              activeDot={false}
              animationDuration={chartStyles.animation.duration}
            />
          )}
        </LineChart>
      );
    } else {
      return (
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          maxBarSize={35}
        >
          <CartesianGrid strokeDasharray={chartStyles.grid.strokeDasharray} stroke={chartStyles.grid.stroke} vertical={chartStyles.grid.vertical} />
          <XAxis 
            dataKey="periodLabel" 
            tickLine={false} 
            axisLine={{ stroke: chartStyles.axis.lineColor }} 
            tick={{ fill: chartStyles.axis.labelColor, fontSize: chartStyles.axis.labelFontSize }} 
          />
          <YAxis 
            tickLine={false} 
            axisLine={{ stroke: chartStyles.axis.lineColor }} 
            tick={{ fill: chartStyles.axis.labelColor, fontSize: chartStyles.axis.labelFontSize }} 
            domain={[0, maxValue]}
          />
          <Tooltip
            contentStyle={chartStyles.tooltip}
            cursor={{ fill: currentTheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}}
            formatter={(value, name) => [`${value} pacientes`, name]}
          />
          <Legend wrapperStyle={{ color: chartStyles.legend.color, fontSize: chartStyles.legend.fontSize, paddingTop: '10px' }} iconType="circle" iconSize={chartStyles.legend.iconSize} />
          
          {/* Renderizar barras para cada diagnóstico */}
          {MAIN_DIAGNOSES.map(diagnosis => (
            <Bar
              key={diagnosis}
              dataKey={diagnosis}
              fill={DIAGNOSIS_COLORS[diagnosis as keyof typeof DIAGNOSIS_COLORS] || chartStyles.axis.labelColor}
              radius={[chartStyles.bar.radius, chartStyles.bar.radius, 0, 0]}
              animationDuration={chartStyles.animation.duration}
            />
          ))}
        </BarChart>
      );
    }
  };

  return (
    <Card className={cn("col-span-1 md:col-span-2", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Tendencia de Diagnósticos</CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 rounded-full"
                    onClick={() => setIsHelpOpen(true)}
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Más información sobre este gráfico</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex gap-1">
            <Button 
              variant={chartConfig.viewType === 'line' ? "default" : "outline"} 
              size="sm"
              className="h-8 text-xs"
              onClick={() => setChartConfig(prev => ({ ...prev, viewType: 'line' }))}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1" />
              Líneas
            </Button>
            
            <Button 
              variant={chartConfig.viewType === 'bar' ? "default" : "outline"} 
              size="sm"
              className="h-8 text-xs"
              onClick={() => setChartConfig(prev => ({ ...prev, viewType: 'bar' }))}
            >
              <BarChart2 className="h-3.5 w-3.5 mr-1" />
              Barras
            </Button>
            
            <Button 
              variant={chartConfig.timeFrame === 'quarterly' ? "default" : "outline"} 
              size="sm"
              className="h-8 text-xs ml-1"
              onClick={() => setChartConfig(prev => ({ ...prev, timeFrame: prev.timeFrame === 'monthly' ? 'quarterly' : 'monthly' }))}
            >
              {chartConfig.timeFrame === 'quarterly' ? 'Trimestral' : 'Mensual'}
            </Button>
            
            {chartConfig.viewType === 'line' && (
              <Button 
                variant={chartConfig.showTrend ? "default" : "outline"} 
                size="sm"
                className="h-8 text-xs ml-1"
                onClick={() => setChartConfig(prev => ({ ...prev, showTrend: !prev.showTrend }))}
              >
                Tendencia
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {chartConfig.timeFrame === 'quarterly' 
            ? 'Evolución trimestral del número de diagnósticos'
            : 'Distribución mensual de diagnósticos por categoría'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="px-2 sm:px-6">
        {/* Resumen de diagnósticos principales */}
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          {topDiagnoses.map(({ diagnosis, count, percentage }) => (
            <Badge 
              key={diagnosis} 
              variant="outline" 
              className="py-1.5 px-3 text-xs font-medium border-l-4"
              style={{ borderLeftColor: DIAGNOSIS_COLORS[diagnosis as keyof typeof DIAGNOSIS_COLORS] }}
            >
              {diagnosis}: {count} ({percentage}%)
            </Badge>
          ))}
        </div>
        
        {/* Gráfico principal */}
        <div className="h-[300px] sm:h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 px-6 text-xs text-muted-foreground flex-col sm:flex-row gap-2 justify-between">
        <div>
          Total: {patients.length} pacientes | Período: {chartData.length > 0 ? 
            `${chartData[0].periodLabel} - ${chartData[chartData.length - 1].periodLabel}` : 
            'No hay datos suficientes'}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 text-xs"
          onClick={() => setIsHelpOpen(true)}
        >
          <Info className="h-3.5 w-3.5 mr-1" />
          Cómo interpretar
        </Button>
      </CardFooter>
      
      {/* Modal de ayuda */}
      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Cómo usar el gráfico de tendencias
            </DialogTitle>
            <DialogDescription>
              Guía práctica para interpretar y aprovechar la información
            </DialogDescription>
          </DialogHeader>
          
          <HelpContent />
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Entendido</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}