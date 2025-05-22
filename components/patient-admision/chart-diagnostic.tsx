'use client';

import React, { useMemo, useState } from "react";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppContext } from '@/lib/context/app-context';
import { DiagnosisChart } from '@/components/charts/diagnosis-chart';
import { DiagnosisTimelineChart } from '@/components/charts/diagnosis-timeline-chart';
import { Button } from '@/components/ui/button';
import { 
  PieChartIcon, 
  LineChart as LineChartIcon, 
  Activity, 
  Download, 
  Filter, 
  ArrowUpDown, 
  Calendar, 
  Clock,
  Hourglass,
  ArrowRight,
  CheckCircle,
  XCircle,
  LightbulbIcon,
  MessageCircle,
  CalendarCheck,
  Phone,
  Send
} from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart,
  Line, 
  Cell
} from 'recharts';
import type { PatientData, DiagnosisType as DataModelDiagnosisType } from '@/app/dashboard/data-model';
import { cn } from '@/lib/utils';

// === TIPOS SIMPLIFICADOS LOCALES ===
export type LocalDiagnosisCategory = 
  | 'Hernia Inguinal' 
  | 'Hernia Umbilical' 
  | 'Hernia Incisional'
  | 'Vesícula'
  | 'Colelitiasis'
  | 'Otro';

export type StatTab = 'distribucion' | 'tendencia' | 'eficiencia';

export interface DiagnosisData {
  tipo: LocalDiagnosisCategory; 
  cantidad: number;
  porcentaje?: number;
}

export interface ProcessMetrics {
  tiempoRegistroConsulta: number; // días
  tiempoConsultaCirugia: number; // días
  tasaOcupacion: number; // porcentaje
  tasaConversion: number; // porcentaje
  tasaNoAsistencia: number; // porcentaje
}

export interface DiagnosisMetrics {
  totalPacientes: number;
  totalHernias: number;
  totalVesicula: number;
  totalOtros: number;
  diagnosticosMasComunes: DiagnosisData[];
  porcentajeHernias: number;
  porcentajeVesicula: number;
  porcentajeOtros: number;
  distribucionHernias: DiagnosisData[];
  ratioHerniaVesicula: number;
  proceso?: ProcessMetrics;
}

// === DATOS DE MUESTRA ===
const SAMPLE_PROCESS_METRICS: ProcessMetrics = {
  tiempoRegistroConsulta: 8,
  tiempoConsultaCirugia: 22,
  tasaOcupacion: 82,
  tasaConversion: 68,
  tasaNoAsistencia: 12
};

// Datos para el embudo (con sugerencias de mejora)
const FUNNEL_DATA = [
  { 
    name: 'Citas programadas', 
    value: 100, 
    color: '#3b82f6',
    oportunidad: 'Optimiza el proceso de agendamiento online y recordatorios',
    impacto: '+15% en citas efectivas'
  },
  { 
    name: 'Citas realizadas', 
    value: 88, 
    color: '#22c55e',
    oportunidad: 'Reduce las inasistencias con recordatorios SMS 24h antes',
    impacto: '+10% en asistencia a consultas'
  },
  { 
    name: 'Candidatos a cirugía', 
    value: 68, 
    color: '#eab308',
    oportunidad: 'Mejora información previa sobre opciones de tratamiento',
    impacto: '+8% en tasa de conversión'
  },
  { 
    name: 'Cirugías realizadas', 
    value: 58, 
    color: '#ec4899',
    oportunidad: 'Facilita el proceso administrativo pre-cirugía',
    impacto: '+12% en cirugías confirmadas'
  }
];

// Tendencia de tiempos de espera
const WAIT_TIME_TRENDS = [
  { mes: 'Ene', registroConsulta: 9.2, consultaCirugia: 23 },
  { mes: 'Feb', registroConsulta: 8.8, consultaCirugia: 22.5 },
  { mes: 'Mar', registroConsulta: 8.5, consultaCirugia: 22 },
  { mes: 'Abr', registroConsulta: 8.2, consultaCirugia: 21.5 },
  { mes: 'May', registroConsulta: 7.9, consultaCirugia: 21 },
  { mes: 'Jun', registroConsulta: 8.0, consultaCirugia: 22 }
];

// === COMPONENTE PRINCIPAL ===
// Componente para adaptar gráficos a diferentes tamaños de pantalla
const ResponsiveChartContainer = ({ children, className = "", height = 350 }: {
  children: React.ReactNode;
  className?: string;
  height?: number;
}) => {
  const { isMobile, isTablet } = useBreakpoint();
  
  // Ajustar altura según el dispositivo
  const chartHeight = isMobile ? 250 : isTablet ? 300 : height;
  
  return (
    <div className={`w-full ${className}`} style={{ height: chartHeight }}>
      {children}
    </div>
  );
};

export function ChartDiagnostic() {
  const { patients } = useAppContext()
  const { isMobile, isTablet } = useBreakpoint();
  const [statsTab, setStatsTab] = useState<StatTab>('distribucion');

  // Cálculo de métricas basado en datos reales de pacientes
  const metrics = useMemo<DiagnosisMetrics>(() => {
    const totalPacientes = patients.length;

    // Inicializar contadores para los tipos de diagnóstico locales
    const diagnosisCounts: Record<LocalDiagnosisCategory, number> = {
      'Hernia Inguinal': 0,
      'Hernia Umbilical': 0,
      'Hernia Incisional': 0,
      'Vesícula': 0,
      'Colelitiasis': 0,
      'Otro': 0,
    };

    // Mapear diagnósticos de PatientData (DataModelDiagnosisType) al tipo local (LocalDiagnosisCategory)
    patients.forEach((patient: PatientData) => {
      const diagnosisFromDataModel: DataModelDiagnosisType = patient.diagnostico;
      let mappedCategory: LocalDiagnosisCategory = 'Otro';

      switch (diagnosisFromDataModel) {
        case 'Hernia Inguinal':
          mappedCategory = 'Hernia Inguinal';
          break;
        case 'Hernia Umbilical':
          mappedCategory = 'Hernia Umbilical';
          break;
        case 'Hernia Incisional':
          mappedCategory = 'Hernia Incisional';
          break;
        case 'Vesícula': 
        case 'Vesícula (Colecistitis Crónica)':
          mappedCategory = 'Vesícula';
          break;
        case 'Colelitiasis':
          mappedCategory = 'Colelitiasis';
          break;
        default:
          mappedCategory = 'Otro'; 
          break;
      }
      
      diagnosisCounts[mappedCategory]++;
    });

    const calculatedDiagnosticosMasComunes: DiagnosisData[] = 
      (Object.keys(diagnosisCounts) as LocalDiagnosisCategory[])
        .map((category: LocalDiagnosisCategory) => ({ 
            tipo: category, 
            cantidad: diagnosisCounts[category] 
        }))
        .filter(item => item.cantidad > 0)
        .sort((a, b) => b.cantidad - a.cantidad);

    // Recalcular métricas sumarias
    const totalHernias = diagnosisCounts['Hernia Inguinal'] + diagnosisCounts['Hernia Umbilical'] + diagnosisCounts['Hernia Incisional'];
    const totalVesiculaGroup = diagnosisCounts['Vesícula'] + diagnosisCounts['Colelitiasis'];
    const totalOtrosCalculated = diagnosisCounts['Otro'];

    const porcentajeHernias = totalPacientes > 0 ? Math.round((totalHernias / totalPacientes) * 100) : 0;
    const porcentajeVesiculaGroup = totalPacientes > 0 ? Math.round((totalVesiculaGroup / totalPacientes) * 100) : 0;
    const porcentajeOtros = totalPacientes > 0 ? Math.round((totalOtrosCalculated / totalPacientes) * 100) : 0;

    const distribucionHerniasCalculated: DiagnosisData[] = [
      { tipo: 'Hernia Inguinal' as LocalDiagnosisCategory, cantidad: diagnosisCounts['Hernia Inguinal'] },
      { tipo: 'Hernia Umbilical' as LocalDiagnosisCategory, cantidad: diagnosisCounts['Hernia Umbilical'] },
      { tipo: 'Hernia Incisional' as LocalDiagnosisCategory, cantidad: diagnosisCounts['Hernia Incisional'] },
    ].filter(item => item.cantidad > 0).sort((a,b) => b.cantidad - a.cantidad);

    const ratioHerniaVesicula = totalVesiculaGroup > 0 ? parseFloat((totalHernias / totalVesiculaGroup).toFixed(1)) : 0;

    return {
      totalPacientes,
      totalHernias,
      totalVesicula: totalVesiculaGroup, 
      totalOtros: totalOtrosCalculated,
      diagnosticosMasComunes: calculatedDiagnosticosMasComunes,
      porcentajeHernias,
      porcentajeVesicula: porcentajeVesiculaGroup,
      porcentajeOtros,
      distribucionHernias: distribucionHerniasCalculated,
      ratioHerniaVesicula,
      proceso: SAMPLE_PROCESS_METRICS, 
    };
  }, [patients]);

  // Configuración adaptativa para gráficos
  const chartConfig = useMemo(() => {
    return {
      padding: isMobile ? { top: 10, right: 10, bottom: 30, left: 30 } : 
               isTablet ? { top: 15, right: 20, bottom: 40, left: 40 } : 
               { top: 20, right: 30, bottom: 50, left: 50 },
      fontSize: isMobile ? 11 : isTablet ? 12 : 14,
      legendPosition: isMobile ? "bottom" : "right"
    };
  }, [isMobile, isTablet]);

  // Componente para tarjeta de métrica simple
  const MetricCard = ({ title, value, subtitle, icon, color = "blue" }) => {
    const colorMap = {
      blue: "border-blue-500 bg-blue-50/40 dark:bg-blue-900/20",
      green: "border-green-500 bg-green-50/40 dark:bg-green-900/20",
      purple: "border-purple-500 bg-purple-50/40 dark:bg-purple-900/20",
      amber: "border-amber-500 bg-amber-50/40 dark:bg-amber-900/20"
    };
    
    return (
      <Card className={cn("border-l-4", colorMap[color])}>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-semibold mt-1">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            </div>
            <div className={cn(
              "p-2 rounded-full", 
              color === "blue" ? "bg-blue-100 text-blue-600" :
              color === "green" ? "bg-green-100 text-green-600" :
              color === "purple" ? "bg-purple-100 text-purple-600" :
              "bg-amber-100 text-amber-600"
            )}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente para el Embudo de Proceso con Sugerencias
  const ProcessFunnelChart = () => {
    // Estado para la sugerencia activa
    const [activeIdx, setActiveIdx] = useState<number | null>(null);
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Proceso de Pacientes</CardTitle>
          <CardDescription>
            Conversión desde cita agendada hasta cirugía realizada
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={FUNNEL_DATA}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                barGap={0}
                barCategoryGap={10}
                onMouseEnter={(data) => {
                  if (data && data.activeTooltipIndex !== undefined) {
                    setActiveIdx(data.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setActiveIdx(null)}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.5} />
                <XAxis 
                  type="number" 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 12 }} 
                  width={120} 
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Porcentaje']}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-card text-card-foreground p-3 border rounded-lg shadow-sm">
                          <p className="font-medium text-sm">{data.name}: {data.value}%</p>
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 text-xs text-blue-800">
                            <div className="flex items-start gap-1.5">
                              <LightbulbIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium mb-1">Oportunidad de mejora:</p>
                                <p>{data.oportunidad}</p>
                                <p className="mt-1 text-blue-600 font-medium">{data.impacto}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="value" 
                  background={{ fill: '#f3f4f6' }}
                  radius={[0, 4, 4, 0]}
                  animationDuration={600}
                >
                  {FUNNEL_DATA.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      fillOpacity={activeIdx === index ? 1 : 0.8}
                      stroke={activeIdx === index ? "#000" : "none"}
                      strokeWidth={activeIdx === index ? 1 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Sugerencias para mejorar */}
          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Acciones para optimizar el proceso</span>
              <span className="text-xs bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full">+15% potencial</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
                <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Encuestas previas</p>
                  <p className="text-muted-foreground">Enviar encuesta previa a cita para mejor preparación</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
                <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Recordatorios SMS</p>
                  <p className="text-muted-foreground">Recordatorios 24h antes y confirmación por WhatsApp</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
                <CalendarCheck className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Reprogramación sencilla</p>
                  <p className="text-muted-foreground">Facilitar proceso de cambio de cita 1-click</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-md">
                <Send className="h-4 w-4 text-purple-600 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium">Material educativo</p>
                  <p className="text-muted-foreground">Enviar info previa de procedimientos por email</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente para Tendencias de Tiempos de Espera
  const TimelineTrendsChart = () => {
    const lastMonth = WAIT_TIME_TRENDS[WAIT_TIME_TRENDS.length - 1];
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Tiempos de Espera</CardTitle>
          <CardDescription>
            Evolución de los tiempos entre fases del proceso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={WAIT_TIME_TRENDS}
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  label={{ 
                    value: 'Días', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 11, textAnchor: 'middle' } 
                  }}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'registroConsulta') 
                      return [`${value} días`, 'Registro a consulta'];
                    if (name === 'consultaCirugia') 
                      return [`${value} días`, 'Consulta a cirugía'];
                    return [value, name];
                  }}
                />
                <Line
                  name="registroConsulta"
                  type="monotone"
                  dataKey="registroConsulta"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
                <Line
                  name="consultaCirugia"
                  type="monotone"
                  dataKey="consultaCirugia"
                  stroke="#ec4899"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 border-t pt-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Metas de reducción de tiempos</span>
              <span className="text-xs bg-green-100 text-green-800 py-0.5 px-2 rounded-full">Mejora vs. mes anterior</span>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    Registro a consulta
                  </span>
                  <span className="font-medium">{lastMonth.registroConsulta} días</span>
                </div>
                <Progress value={70} className="h-2 bg-blue-100">
                  <div className="absolute -top-1 right-1/4 h-4 w-0.5 bg-green-600" />
                </Progress>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Actual: {lastMonth.registroConsulta}</span>
                  <span>Meta: 6 días</span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-pink-600" />
                    Consulta a cirugía
                  </span>
                  <span className="font-medium">{lastMonth.consultaCirugia} días</span>
                </div>
                <Progress value={60} className="h-2 bg-pink-100">
                  <div className="bg-pink-600 h-full w-full" />
                  <div className="absolute -top-1 right-1/2 h-4 w-0.5 bg-green-600" />
                </Progress>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Actual: {lastMonth.consultaCirugia}</span>
                  <span>Meta: 15 días</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Componente para métricas operativas
  const OperationalMetricsChart = () => {
    const process = metrics.proceso || SAMPLE_PROCESS_METRICS;
    
    return (
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-primary" />
              Eficiencia del Proceso
            </h3>
            <p className="text-sm text-muted-foreground">
              Análisis del flujo de pacientes y tiempos de espera
            </p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Último trimestre
            <ArrowUpDown className="h-4 w-4 ml-2" />
          </Button>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Tiempo a Consulta"
            value={`${process.tiempoRegistroConsulta} días`}
            subtitle="Desde registro hasta primera consulta"
            icon={<Clock className="h-5 w-5" />}
            color="blue"
          />
          <MetricCard
            title="Tiempo a Cirugía"
            value={`${process.tiempoConsultaCirugia} días`}
            subtitle="Desde consulta hasta procedimiento"
            icon={<Calendar className="h-5 w-5" />}
            color="purple"
          />
          <MetricCard
            title="Tasa de Conversión"
            value={`${process.tasaConversion}%`}
            subtitle="Consultas que resultan en cirugía"
            icon={<CheckCircle className="h-5 w-5" />}
            color="green"
          />
        </div>

        {/* Gráficos detallados */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ProcessFunnelChart />
          <TimelineTrendsChart />
        </div>
        
        {/* Indicadores de mejora */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Desafíos y Oportunidades</CardTitle>
            <CardDescription>Áreas con mayor potencial de mejora inmediata</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-md">
                <div className="bg-red-100 text-red-700 p-2 rounded-full">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Inasistencias ({process.tasaNoAsistencia}%)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Meta:</strong> Reducir al 5%
                  </p>
                  <p className="text-sm mt-1">Implemente recordatorios SMS automatizados 24h antes</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-muted/30 p-3 rounded-md">
                <div className="bg-amber-100 text-amber-700 p-2 rounded-full">
                  <ArrowRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-medium">Proceso inicial (8 días)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Meta:</strong> Agendar en 5 días
                  </p>
                  <p className="text-sm mt-1">Amplíe disponibilidad de horarios matutinos</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-md text-sm">
              <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                <LightbulbIcon className="h-4 w-4" />
                <span>Idea de mejora con mayor impacto</span>
              </div>
              <p>
                Implementando un sistema de triaje virtual previo a la consulta, puede reducir el tiempo de la primera consulta en un 25% y mejorar la preparación del paciente para la cirugía.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300">
      {/* Encabezado con botones de acción */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          Diagnósticos
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({metrics.totalPacientes} pacientes)
          </span>
        </h2>

        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>
        </div>
      </div>

      {/* Panel de estadísticas resumidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hernias</p>
                <p className="text-3xl font-bold mt-1">{metrics.totalHernias}</p>
                <p className="text-sm text-muted-foreground mt-1">{metrics.porcentajeHernias}% del total</p>
              </div>
              <div className="bg-blue-100 text-blue-700 h-12 w-12 rounded-full flex items-center justify-center">
                <PieChartIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vesícula</p>
                <p className="text-3xl font-bold mt-1">{metrics.totalVesicula}</p>
                <p className="text-sm text-muted-foreground mt-1">{metrics.porcentajeVesicula}% del total</p>
              </div>
              <div className="bg-green-100 text-green-700 h-12 w-12 rounded-full flex items-center justify-center">
                <PieChartIcon className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ratio H:V</p>
                <p className="text-3xl font-bold mt-1">{metrics.ratioHerniaVesicula.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground mt-1">Hernias por cada caso de vesícula</p>
              </div>
              <div className="bg-purple-100 text-purple-700 h-12 w-12 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de gráficas */}
      <Tabs value={statsTab} onValueChange={(value) => setStatsTab(value as StatTab)} className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="distribucion" className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Distribución</span>
            <span className="sm:hidden">Dist.</span>
          </TabsTrigger>
          <TabsTrigger value="tendencia" className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Tendencia</span>
            <span className="sm:hidden">Tend.</span>
          </TabsTrigger>
          <TabsTrigger value="eficiencia" className="flex items-center gap-2">
            <Hourglass className="h-4 w-4" />
            <span className="hidden sm:inline">Eficiencia</span>
            <span className="sm:hidden">Efic.</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 bg-card rounded-lg border">
          <TabsContent value="distribucion" className="p-4">
            <DiagnosisChart 
              data={metrics.diagnosticosMasComunes} 
              title="Distribución General de Diagnósticos" 
              description="Desglose de los diagnósticos más comunes registrados"
            />
          </TabsContent>
          <TabsContent value="tendencia" className="p-4">
            <DiagnosisTimelineChart patients={patients} />
          </TabsContent>
          <TabsContent value="eficiencia" className="p-4">
            <OperationalMetricsChart />
          </TabsContent>
        </div>
      </Tabs>
      
      {/* Información de último análisis */}
      <div className="text-xs text-muted-foreground text-right mt-2">
        Datos actualizados: {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}