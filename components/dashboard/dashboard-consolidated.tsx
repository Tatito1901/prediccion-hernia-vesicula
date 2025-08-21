import React, { useState, useMemo, memo, useCallback, ComponentType, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts';
import { Stethoscope, Users, Target, Heart, Shield, RefreshCw, ArrowUp, ArrowDown, Minus, LucideProps, AlertCircle, Sun, Moon } from 'lucide-react';

// =================================================================================
// NOTA SOBRE LA ESTRUCTURA DEL ARCHIVO
// Para evitar errores como "Module not found", todas las interfaces, tipos y enums
// necesarios para este dashboard se definen directamente en este archivo.
// Esto hace que el componente sea autocontenido y fácil de integrar en cualquier
// proyecto sin preocuparse por las rutas de importación relativas o los alias.
// =================================================================================


// =================================================================================
// 1. DEFINICIONES DE TIPOS Y ENUMS
// =================================================================================

export enum PatientStatusEnum {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  OPERADO = 'OPERADO',
}

export interface Patient {
  id: string;
  estado_paciente: PatientStatusEnum;
}

export interface Appointment {
  id: string;
  fecha_hora_cita: string | Date;
  estado_cita: 'COMPLETADA' | 'PENDIENTE' | 'CANCELADA';
  motivos_consulta: string[];
}

export type Period = '7d' | '30d' | '90d';
export type Trend = 'up' | 'down' | 'neutral';
export type Theme = 'light' | 'dark';

export interface ChartData {
  month: string;
  consultas: number;
  cirugias: number;
}

export interface Metrics {
  primary: {
    todayConsultations: number;
    totalPatients: number;
    occupancyRate: number;
  };
  clinical: {
    operatedPatients: number;
  };
  chartData: ChartData[];
  periodComparison: {
    changePercent: number;
  };
}


// =================================================================================
// 2. HOOK DE LÓGICA: useOptimizedMetrics (Sin cambios, ya era muy eficiente)
// =================================================================================

const useOptimizedMetrics = (
  appointments: Appointment[] | undefined,
  patients: Patient[] | undefined,
  period: Period
): Metrics => {
  return useMemo(() => {
    const defaultMetrics: Metrics = {
      primary: { todayConsultations: 0, totalPatients: patients?.length ?? 0, occupancyRate: 0 },
      clinical: { operatedPatients: 0 },
      chartData: [],
      periodComparison: { changePercent: 0 },
    };

    if (!appointments?.length || !patients?.length) {
      return defaultMetrics;
    }

    const now = new Date();
    const todayStartTimestamp = new Date(now).setHours(0, 0, 0, 0);
    const periodDays = { '7d': 7, '30d': 30, '90d': 90 }[period];
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - periodDays);
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(periodStart.getDate() - periodDays);

    let todayConsultations = 0;
    let currentPeriodTotal = 0;
    let previousPeriodTotal = 0;

    const monthlyData = new Map<string, { consultas: number; cirugias: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(monthKey, { consultas: 0, cirugias: 0 });
    }

    for (const apt of appointments) {
      const aptDate = new Date(apt.fecha_hora_cita);
      const aptTimestamp = aptDate.getTime();

      if (aptTimestamp >= todayStartTimestamp) {
        todayConsultations++;
      }

      if (aptDate >= periodStart) {
        currentPeriodTotal++;
      } else if (aptDate >= previousPeriodStart) {
        previousPeriodTotal++;
      }

      const monthKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}`;
      const monthEntry = monthlyData.get(monthKey);

      if (monthEntry && apt.estado_cita === 'COMPLETADA') {
        monthEntry.consultas++;
        const isSurgery = apt.motivos_consulta.some(m => m.toLowerCase().includes('ciru'));
        if (isSurgery) {
          monthEntry.cirugias++;
        }
      }
    }

    const operatedPatients = patients.reduce((acc, p) => 
      p.estado_paciente === PatientStatusEnum.OPERADO ? acc + 1 : acc, 0);

    const changePercent = previousPeriodTotal > 0
      ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100)
      : (currentPeriodTotal > 0 ? 100 : 0);

    const chartData: ChartData[] = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month: new Date(`${month}-02T00:00:00`).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      consultas: data.consultas,
      cirugias: data.cirugias,
    }));

    return {
      primary: { todayConsultations, totalPatients: patients.length, occupancyRate: 78 },
      clinical: { operatedPatients },
      chartData,
      periodComparison: { changePercent }
    };
  }, [appointments, patients, period]);
};


// =================================================================================
// 3. COMPONENTES DE UI REUTILIZABLES Y MEJORADOS
// =================================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ComponentType<LucideProps>;
  trend?: Trend;
  description?: string;
  isLoading: boolean;
}

const MetricCard = memo<MetricCardProps>(({ title, value, change, icon: Icon, trend = 'neutral', description, isLoading }) => {
  const TrendIcon = useMemo(() => ({ up: ArrowUp, down: ArrowDown, neutral: Minus }[trend]), [trend]);
  const trendColorClass = useMemo(() => ({
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground'
  }[trend]), [trend]);

  if (isLoading) {
    return <div className="h-[148px] w-full bg-card rounded-2xl animate-pulse" />;
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
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-1 truncate">{title}</p>
        {description && <p className="text-[11px] text-muted-foreground/80 mt-2">{description}</p>}
      </main>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';

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
// 4. COMPONENTES ESTRUCTURALES DEL DASHBOARD
// =================================================================================

const DashboardHeader = memo<{
  period: Period;
  setPeriod: (period: Period) => void;
  handleRefresh: () => void;
  isLoading: boolean;
  theme: Theme;
  toggleTheme: () => void;
}>(({ period, setPeriod, handleRefresh, isLoading, theme, toggleTheme }) => (
  <header className="flex flex-wrap justify-between items-center gap-4">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-secondary/20 rounded-lg">
        <Shield className="h-6 w-6 text-secondary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-primary">Panel de Control</h1>
        <p className="text-sm text-muted-foreground">Resumen de Actividad Clínica</p>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="inline-flex bg-muted rounded-lg p-1" role="group">
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors duration-200 ${period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            aria-pressed={period === p}
          >
            {p.replace('d', ' Días')}
          </button>
        ))}
      </div>
      <button onClick={handleRefresh} disabled={isLoading} aria-label="Actualizar datos" className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? 'animate-spin' : ''}`} />
      </button>
      <button onClick={toggleTheme} aria-label="Cambiar tema" className="p-2.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
        <Sun className={`h-4 w-4 text-foreground transition-transform duration-500 scale-100 dark:scale-0`} />
        <Moon className={`absolute h-4 w-4 text-foreground transition-transform duration-500 scale-0 dark:scale-100`} />
      </button>
    </div>
  </header>
));
DashboardHeader.displayName = 'DashboardHeader';

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
// 5. HOOK DE DATOS SIMULADO
// =================================================================================

const useClinicData = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<{ allAppointments: Appointment[], allPatients: Patient[] }>({ allAppointments: [], allPatients: [] });

    const refetch = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setTimeout(() => {
            try {
                const mockAppointments: Appointment[] = [];
                const mockPatients: Patient[] = [];
                
                for (let i = 0; i < 250; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - Math.floor(Math.random() * 180));
                    mockAppointments.push({
                        id: `apt_${i}`,
                        fecha_hora_cita: date,
                        estado_cita: 'COMPLETADA',
                        motivos_consulta: Math.random() > 0.85 ? ['Revisión', 'Cirugía menor'] : ['Consulta general']
                    });
                }
                for (let i = 0; i < 80; i++) {
                    mockPatients.push({
                        id: `pat_${i}`,
                        estado_paciente: Math.random() > 0.6 ? PatientStatusEnum.OPERADO : PatientStatusEnum.ACTIVO
                    });
                }

                setData({ allAppointments: mockAppointments, allPatients: mockPatients });
            } catch (e) {
                setError(e instanceof Error ? e : new Error('Error al generar datos simulados'));
            } finally {
                setIsLoading(false);
            }
        }, 1200);
    }, []);

    useEffect(() => {
      refetch();
    }, [refetch]);

    return { ...data, isLoading, error, refetch };
};

// =================================================================================
// 6. COMPONENTE PRINCIPAL DEL DASHBOARD
// =================================================================================

const GlobalStyles = () => (
  <style>{`
    :root {
      --background: 0 0% 100%;
      --foreground: 222.2 84% 4.9%;
      --card: 0 0% 100%;
      --card-foreground: 222.2 84% 4.9%;
      --primary: 221.2 83.2% 53.3%;
      --primary-foreground: 210 40% 98%;
      --secondary: 210 40% 96.1%;
      --secondary-foreground: 215.4 16.3% 46.9%;
      --muted: 210 40% 96.1%;
      --muted-foreground: 215.4 16.3% 46.9%;
      --destructive: 0 84.2% 60.2%;
      --destructive-foreground: 210 40% 98%;
      --success: 142.1 76.2% 36.3%;
      --border: 214.3 31.8% 91.4%;
    }
    .dark {
      --background: 222.2 84% 4.9%;
      --foreground: 210 40% 98%;
      --card: 222.2 84% 4.9%;
      --card-foreground: 210 40% 98%;
      --primary: 217.2 91.2% 59.8%;
      --primary-foreground: 222.2 47.4% 11.2%;
      --secondary: 217.2 32.6% 17.5%;
      --secondary-foreground: 210 40% 98%;
      --muted: 217.2 32.6% 17.5%;
      --muted-foreground: 215 20.2% 65.1%;
      --destructive: 0 62.8% 30.6%;
      --destructive-foreground: 0 85.7% 97.3%;
      --success: 142.1 70.2% 46.3%;
      --border: 217.2 32.6% 17.5%;
    }
    body {
      background-color: hsl(var(--background));
      color: hsl(var(--foreground));
      transition: background-color 0.3s ease, color 0.3s ease;
    }
  `}</style>
);


export default function DashboardEnhanced() {
  const { allAppointments, allPatients, isLoading, error, refetch } = useClinicData();
  const [period, setPeriod] = useState<Period>('30d');
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);
  
  const metrics = useOptimizedMetrics(allAppointments, allPatients, period);

  const getTrend = useCallback((value: number): Trend => {
    if (value > 2) return 'up';
    if (value < -2) return 'down';
    return 'neutral';
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-destructive/10 text-destructive border border-destructive rounded-lg p-4">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold">Error al cargar los datos</h2>
        <p className="text-sm">{error.message}</p>
        <button onClick={refetch} className="mt-4 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="p-4 sm:p-6 md:p-8 min-h-screen font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader 
            period={period} 
            setPeriod={setPeriod} 
            handleRefresh={refetch} 
            isLoading={isLoading}
            theme={theme}
            toggleTheme={toggleTheme}
          />
          <main className="space-y-6">
            <MetricCardGrid metrics={metrics} isLoading={isLoading} period={period} getTrend={getTrend} />
            <ProcedureChart data={metrics.chartData} isLoading={isLoading} />
          </main>
        </div>
      </div>
    </>
  );
}
