import React, { useState, useMemo, memo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Stethoscope, Users, Target, Heart, Shield, RefreshCw, ArrowUp, ArrowDown, Minus, AlertCircle } from 'lucide-react';

// Tipos y enums centralizados desde la base de datos
import { PatientStatusEnum, AppointmentStatusEnum } from '@/lib/types';
import type { PatientStatus, AppointmentStatus } from '@/lib/types';

// Interfaces y tipos

export interface Patient {
  id: string;
  estado_paciente: PatientStatus;
}

export interface Appointment {
  id: string;
  fecha_hora_cita: string | Date;
  estado_cita: AppointmentStatus;
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

// Hook de lógica optimizado
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

      if (monthEntry && apt.estado_cita === AppointmentStatusEnum.COMPLETADA) {
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

// Hook para manejar el tema
const useTheme = () => {
  const [theme, setTheme] = useState<Theme>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return newTheme;
    });
  }, []);

  useEffect(() => {
    // Verificar preferencia del sistema
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Verificar tema guardado en localStorage
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    
    // Determinar tema inicial
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    
    // Aplicar tema al DOM
    const root = window.document.documentElement;
    root.classList.remove(initialTheme === 'light' ? 'dark' : 'light');
    root.classList.add(initialTheme);
  }, []);

  useEffect(() => {
    // Aplicar cambios de tema al DOM
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
  }, [theme]);

  return { theme, toggleTheme };
};

// Componente MetricCard optimizado con React.memo y comparador personalizado
const MetricCard = memo(({ title, value, change, icon: Icon, trend = 'neutral', description, isLoading }: {
  title: string;
  value: number | string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: keyof typeof TREND_COLORS;
  description?: string;
  isLoading?: boolean;
}) => {
  // Memoización de componentes costosos
  const TrendIcon = useMemo(() => TREND_ICONS[trend], [trend]);
  const trendColor = useMemo(() => TREND_COLORS[trend], [trend]);

  // Loader optimizado memoizado
  const LoadingComponent = useMemo(() => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
        </div>
        <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded" />
      </div>
    </div>
  ), []);

  if (isLoading) {
    return LoadingComponent;
  }

  // Memoización de contenido de cambio
  const changeContent = useMemo(() => {
    if (change === 0) return null;
    
    return (
      <div className={`flex items-center text-sm ${trendColor}`}>
        <TrendIcon className="w-4 h-4 mr-1" />
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  }, [change, trendColor, TrendIcon]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
            {changeContent}
          </div>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <Icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Comparador optimizado - evita re-renders cuando valores son funcionalmente iguales
  return (
    prevProps.title === nextProps.title &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.trend === nextProps.trend &&
    prevProps.description === nextProps.description &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.icon === nextProps.icon // También comparar función icon
  );
});

const CustomTooltip = memo<TooltipProps<number, string>>(({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry) => (
          <div key={`item-${entry.name}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';

// Componentes estructurales
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
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Panel de Control</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Resumen de Actividad Clínica</p>
      </div>
    </div>
    <div className="flex items-center gap-2 w-full sm:w-auto">
      <div className="inline-flex bg-slate-100 dark:bg-gray-800 rounded-lg p-1" role="group">
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              period === p 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                : 'text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-pressed={period === p}
          >
            {p.replace('d', ' Días')}
          </button>
        ))}
      </div>
      <button 
        onClick={handleRefresh} 
        disabled={isLoading} 
        aria-label="Actualizar datos" 
        className="p-2.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 text-slate-700 dark:text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
      <button 
        onClick={toggleTheme} 
        aria-label="Cambiar tema" 
        className="p-2.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors relative"
      >
        <Sun className={`h-4 w-4 text-slate-700 dark:text-gray-300 transition-transform duration-300 ${theme === 'light' ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`} />
        <Moon className={`absolute h-4 w-4 text-slate-700 dark:text-gray-300 transition-transform duration-300 ${theme === 'dark' ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}`} />
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
    <MetricCard 
      title="Consultas del Día" 
      value={metrics.primary.todayConsultations} 
      icon={Stethoscope} 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Base de Pacientes" 
      value={metrics.primary.totalPatients.toLocaleString()} 
      change={metrics.periodComparison.changePercent} 
      trend={getTrend(metrics.periodComparison.changePercent)} 
      icon={Users} 
      description={`Crecimiento en ${period.replace('d', ' días')}`} 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Eficiencia Operativa" 
      value={`${metrics.primary.occupancyRate}%`} 
      trend={getTrend(metrics.primary.occupancyRate - 80)} 
      icon={Target} 
      description="Tasa de ocupación" 
      isLoading={isLoading} 
    />
    <MetricCard 
      title="Total Cirugías" 
      value={metrics.clinical.operatedPatients} 
      icon={Heart} 
      description="Total histórico" 
      isLoading={isLoading} 
    />
  </section>
));
MetricCardGrid.displayName = 'MetricCardGrid';

const ProcedureChart = memo<{
    data: ChartData[];
    isLoading: boolean;
}>(({ data, isLoading }) => (
  <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-5 rounded-2xl border border-gray-200 dark:border-gray-700">
    <header>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Análisis de Procedimientos</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">Evolución de consultas y cirugías (últimos 6 meses)</p>
    </header>
    <main className="mt-4 pl-2 pr-4">
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorCirugias" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--chart-grid))" strokeDasharray="3 3" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="consultas" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2} 
              fill="url(#colorConsultas)" 
              name="Consultas" 
            />
            <Area 
              type="monotone" 
              dataKey="cirugias" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2} 
              fill="url(#colorCirugias)" 
              name="Cirugías" 
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </main>
  </div>
));
ProcedureChart.displayName = 'ProcedureChart';

// Hook de datos simulado
const useClinicData = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<{ 
      allAppointments: Appointment[], 
      allPatients: Patient[] 
    }>({ allAppointments: [], allPatients: [] });

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
                        estado_cita: AppointmentStatusEnum.COMPLETADA,
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

// Componente principal
export default function DashboardEnhanced() {
  const [period, setPeriod] = useState<Period>('30d');
  const { allAppointments, allPatients, isLoading, error, refetch } = useClinicData();
  const { theme, toggleTheme } = useTheme();
  
  const metrics = useOptimizedMetrics(allAppointments, allPatients, period);

  const getTrend = useCallback((value: number): Trend => {
    if (value > 2) return 'up';
    if (value < -2) return 'down';
    return 'neutral';
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-lg p-4">
        <AlertCircle className="h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold">Error al cargar los datos</h2>
        <p className="text-sm">{error.message}</p>
        <button 
          onClick={refetch} 
          className="mt-4 px-4 py-2 bg-rose-600 dark:bg-rose-700 text-white rounded-md hover:bg-rose-700 dark:hover:bg-rose-600 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans p-4 sm:p-6 md:p-8 bg-background text-foreground">
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
          <MetricCardGrid 
            metrics={metrics} 
            isLoading={isLoading} 
            period={period} 
            getTrend={getTrend} 
          />
          <ProcedureChart 
            data={metrics.chartData} 
            isLoading={isLoading} 
          />
        </main>
      </div>
    </div>
  );
}