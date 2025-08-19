// components/dashboard/dashboard-enhanced.tsx
'use client';

import React, { useMemo, useState, useCallback, memo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, TooltipProps
} from 'recharts';
import { 
  Users, Stethoscope, Target, Heart, 
  Shield, RefreshCw, ArrowUp, ArrowDown, Minus, AlertCircle, LucideProps
} from 'lucide-react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { PatientStatus, PatientStatusEnum } from '@/lib/types';

// =================================================================================
// DEFINICIONES DE TIPOS (SIN CAMBIOS)
// =================================================================================
type Period = '7d' | '30d' | '90d';
type Trend = 'up' | 'down' | 'neutral';
interface Patient { id: string; fecha_registro: string; estado_paciente: PatientStatus; }
interface Appointment { id: string; fecha_hora_cita: string; estado_cita: 'COMPLETADA' | 'PROGRAMADA' | 'CANCELADA'; tipo_cita?: string; motivos_consulta?: string[]; }
interface ChartData { month: string; consultas: number; cirugias: number; }
interface Metrics {
  primary: { todayConsultations: number; totalPatients: number; occupancyRate: number; };
  clinical: { operatedPatients: number; };
  chartData: ChartData[];
  periodComparison: { changePercent: number; };
}

// =================================================================================
// HOOK DE DATOS SIMULADOS (SIN CAMBIOS FUNCIONALES)
// =================================================================================
const useMockClinic = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<{ allAppointments: Appointment[]; allPatients: Patient[] }>({ allAppointments: [], allPatients: [] });

  const generateMockData = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      const today = new Date();
      const mockPatients: Patient[] = Array.from({ length: 158 }, (_, i) => ({
        id: `p${i + 1}`,
        fecha_registro: new Date(today.getTime() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        estado_paciente: [
          PatientStatusEnum.ACTIVO,
          PatientStatusEnum.EN_SEGUIMIENTO,
          PatientStatusEnum.OPERADO,
        ][i % 3] as PatientStatus,
      }));
      const mockAppointments: Appointment[] = Array.from({ length: 500 }, (_, i) => ({
        id: `a${i + 1}`,
        fecha_hora_cita: new Date(today.getTime() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
        estado_cita: ['COMPLETADA', 'PROGRAMADA', 'CANCELADA'][i % 3] as Appointment['estado_cita'],
        tipo_cita: ['Consulta', 'Cirugía', 'Seguimiento'][i % 3],
      }));
      setData({ allAppointments: mockAppointments, allPatients: mockPatients });
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    generateMockData();
  }, [generateMockData]);

  return { allAppointments: data.allAppointments, allPatients: data.allPatients, isLoading, error: null, refetch: generateMockData };
};

// =================================================================================
// HOOK DE LÓGICA DE MÉTRICAS (SIN CAMBIOS FUNCIONALES, YA ESTABA OPTIMIZADO)
// =================================================================================
const useOptimizedMetrics = (appointments: Appointment[], patients: Patient[], period: Period): Metrics => {
  return useMemo(() => {
    const defaultMetrics: Metrics = {
      primary: { todayConsultations: 0, totalPatients: patients?.length || 0, occupancyRate: 0 },
      clinical: { operatedPatients: 0 },
      chartData: [],
      periodComparison: { changePercent: 0 }
    };
    if (!appointments?.length || !patients?.length) return defaultMetrics;

    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - periodDays);
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(periodStart.getDate() - periodDays);

    let todayConsultations = 0, currentPeriodTotal = 0, previousPeriodTotal = 0;
    const monthlyData = new Map<string, { consultas: number; cirugias: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i, 1);
      monthlyData.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, { consultas: 0, cirugias: 0 });
    }

    for (const apt of appointments) {
      const aptDate = new Date(apt.fecha_hora_cita);
      if (aptDate.toISOString().startsWith(now.toISOString().split('T')[0])) todayConsultations++;
      if (aptDate >= periodStart) currentPeriodTotal++;
      else if (aptDate >= previousPeriodStart) previousPeriodTotal++;
      
      const monthKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData.has(monthKey)) {
        if (apt.estado_cita === 'COMPLETADA') monthlyData.get(monthKey)!.consultas++;
        const isSurgery = Array.isArray((apt as any).motivos_consulta)
          && (apt as any).motivos_consulta.some((m: string) => typeof m === 'string' && m.toLowerCase().includes('ciru'));
        if (apt.estado_cita === 'COMPLETADA' && isSurgery) monthlyData.get(monthKey)!.cirugias++;
      }
    }

    const operatedPatients = patients.filter(p => p.estado_paciente === PatientStatusEnum.OPERADO).length;
    const changePercent = previousPeriodTotal > 0 ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100) : 0;
    const chartData: ChartData[] = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month: new Date(month + '-02').toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      consultas: data.consultas,
      cirugias: data.cirugias,
    }));

    return {
      primary: { todayConsultations, totalPatients: patients.length, occupancyRate: 78 }, // Valor de ejemplo
      clinical: { operatedPatients },
      chartData,
      periodComparison: { changePercent }
    };
  }, [appointments, patients, period]);
};

// =================================================================================
// COMPONENTES DE UI REUTILIZABLES Y MEJORADOS
// =================================================================================

// --- Tarjeta de Métrica ---
// Simplificada para usar variables CSS, mejorando rendimiento y mantenimiento.
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<LucideProps>;
  trend?: Trend;
  description?: string;
  isLoading: boolean;
}

const MetricCard = memo<MetricCardProps>(({ title, value, change, icon: Icon, trend = 'neutral', description, isLoading }) => {
  const TrendIcon = useMemo(() => ({ up: ArrowUp, down: ArrowDown, neutral: Minus }[trend]), [trend]);
  const trendColorClass = useMemo(() => ({
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  }[trend]), [trend]);

  if (isLoading) {
    return <div className="h-[148px] bg-card rounded-2xl animate-pulse" />;
  }

  return (
    <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1">
      <header className="flex items-start justify-between">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColorClass}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
        )}
      </header>
      <main className="mt-2">
        <div className="text-3xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
        {description && <p className="text-[11px] text-muted-foreground/80 mt-2">{description}</p>}
      </main>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

// --- Tooltip del Gráfico ---
// Mejorado con los nuevos colores del tema.
const CustomTooltip = memo<TooltipProps<number, string>>(({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border text-xs">
        <p className="font-bold text-foreground mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={`item-${entry.name}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

// =================================================================================
// COMPONENTES ESTRUCTURALES DEL DASHBOARD
// =================================================================================

// --- Encabezado del Dashboard ---
// Mejorado para una mejor responsividad y alineación en móviles.
const DashboardHeader = memo<{
  period: Period;
  setPeriod: (period: Period) => void;
  handleRefresh: () => void;
  isLoading: boolean;
}>(({ period, setPeriod, handleRefresh, isLoading }) => (
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <div>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-secondary/20 rounded-lg">
          <Shield className="h-6 w-6 text-secondary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Panel de Control</h1>
          <p className="text-sm text-muted-foreground">Resumen de Actividad Clínica</p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="inline-flex bg-primary/5 rounded-lg p-1" role="group">
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button 
            key={p} 
            onClick={() => setPeriod(p)} 
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200 ${period === p ? 'bg-card text-secondary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={period === p}
          >
            {p.replace('d', ' Días')}
          </button>
        ))}
      </div>
      <button onClick={handleRefresh} disabled={isLoading} aria-label="Actualizar datos" className="p-2.5 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 text-primary ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  </header>
));
DashboardHeader.displayName = 'DashboardHeader';

// --- Cuadrícula de Métricas ---
const MetricCardGrid = memo<{
    metrics: Metrics;
    isLoading: boolean;
    period: Period;
    getTrend: (value: number) => Trend;
}>(({ metrics, isLoading, period, getTrend }) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <MetricCard title="Consultas del Día" value={metrics.primary.todayConsultations} icon={Stethoscope} isLoading={isLoading} />
    <MetricCard title="Base de Pacientes" value={metrics.primary.totalPatients.toLocaleString()} change={metrics.periodComparison.changePercent} trend={getTrend(metrics.periodComparison.changePercent)} icon={Users} description={`Crecimiento en ${period.replace('d', ' días')}`} isLoading={isLoading} />
    <MetricCard title="Eficiencia Operativa" value={`${metrics.primary.occupancyRate}%`} trend={getTrend(metrics.primary.occupancyRate - 80)} icon={Target} description="Tasa de ocupación" isLoading={isLoading} />
    <MetricCard title="Total Cirugías" value={metrics.clinical.operatedPatients} icon={Heart} description="Total histórico" isLoading={isLoading} />
  </section>
));
MetricCardGrid.displayName = 'MetricCardGrid';

// --- Gráfico de Procedimientos ---
const ProcedureChart = memo<{
    data: ChartData[];
    isLoading: boolean;
}>(({ data, isLoading }) => (
  <div className="bg-card text-card-foreground p-5 rounded-2xl border border-border">
    <header>
      <h2 className="text-lg font-semibold text-primary">Análisis de Procedimientos</h2>
      <p className="text-sm text-muted-foreground">Evolución de consultas y cirugías (últimos 6 meses)</p>
    </header>
    <main className="mt-4 pl-2 pr-4">
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4}/><stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0}/></linearGradient>
              <linearGradient id="colorCirugias" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="consultas" stroke="hsl(var(--secondary))" strokeWidth={2} fill="url(#colorConsultas)" name="Consultas" />
            <Area type="monotone" dataKey="cirugias" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorCirugias)" name="Cirugías" />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </main>
  </div>
));
ProcedureChart.displayName = 'ProcedureChart';

// =================================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// =================================================================================
export default function DashboardEnhanced() {
  const { allAppointments, allPatients, isLoading, error, refetch } = useClinic();
  const [period, setPeriod] = useState<Period>('30d');
  
  const metrics = useOptimizedMetrics(allAppointments, allPatients, period);
  const handleRefresh = useCallback(() => refetch?.(), [refetch]);
  const getTrend = useCallback((value: number): Trend => {
    if (value > 2) return 'up';
    if (value < -2) return 'down';
    return 'neutral';
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-4">
        <div className="max-w-md w-full bg-card border border-destructive/50 p-8 rounded-2xl text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Error al Cargar Datos</h3>
            <p className="text-muted-foreground mb-6 text-sm">{error.message || 'Ocurrió un error inesperado.'}</p>
            <button onClick={handleRefresh} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-lg flex items-center justify-center mx-auto">
              <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
            </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background text-foreground font-sans p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader 
            period={period}
            setPeriod={setPeriod}
            handleRefresh={handleRefresh}
            isLoading={isLoading}
          />
          
          <section id="overview" data-section="overview" className="scroll-mt-20">
            <MetricCardGrid 
              metrics={metrics}
              isLoading={isLoading}
              period={period}
              getTrend={getTrend}
            />
          </section>

          <section id="activity" data-section="activity" className="scroll-mt-20">
            <ProcedureChart data={metrics.chartData} isLoading={isLoading} />
          </section>

          <footer className="mt-8 text-center text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Clínica Hernia y Vesícula - Dr. Luis Ángel Medina. Todos los derechos reservados.</p>
          </footer>
        </main>
      </div>
    </>
  );
}
