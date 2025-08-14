// components/dashboard/dashboard-consolidated.tsx - VERSIÓN MEJORADA Y REFINADA
'use client';

import React, { useMemo, useState, useCallback, memo } from 'react';
import { useClinic } from '@/contexts/clinic-data-provider';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Calendar, Users, Clock, CheckCircle, TrendingUp, Activity,
  Stethoscope, UserCheck, CalendarDays, Target, Heart, 
  FileText, AlertCircle, ArrowUp, ArrowDown,
  RefreshCw, Minus, UserPlus, ClipboardCheck,
  Shield, Award, CircleDot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  isLoading?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

const MetricCard = memo<MetricCardProps>(({
  title, value, change, icon: Icon, trend = 'neutral',
  description, isLoading, priority = 'medium'
}) => {
  const styles = useMemo(() => {
    const trendColors = {
      up: 'text-teal-600 dark:text-teal-400',
      down: 'text-coral-600 dark:text-coral-400',
      neutral: 'text-slate-500 dark:text-slate-400'
    };
    const priorityStyles = {
      high: {
        container: 'bg-gradient-to-br from-coral-50 to-red-50 dark:from-coral-950/20 dark:to-red-950/20 border-coral-200 dark:border-coral-800/50',
        icon: 'bg-coral-100 dark:bg-coral-900/50 text-coral-700 dark:text-coral-300',
        value: 'text-coral-950 dark:text-coral-100'
      },
      medium: {
        container: 'bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border-teal-200 dark:border-teal-800/50',
        icon: 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300',
        value: 'text-teal-950 dark:text-teal-100'
      },
      low: {
        container: 'bg-gradient-to-br from-navy-50 to-slate-50 dark:from-navy-950/20 dark:to-slate-950/20 border-navy-200 dark:border-navy-800/50',
        icon: 'bg-navy-100 dark:bg-navy-900/50 text-navy-700 dark:text-navy-300',
        value: 'text-navy-950 dark:text-navy-100'
      }
    };
    return { trendColor: trendColors[trend], ...priorityStyles[priority] };
  }, [trend, priority]);

  const TrendIcon = useMemo(() => ({ up: ArrowUp, down: ArrowDown, neutral: Minus }[trend]), [trend]);

  // Skeleton loader para una mejor experiencia de usuario durante la carga
  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border bg-white dark:bg-gray-900 p-6" role="status" aria-busy="true">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-teal-100 dark:bg-teal-900/30 rounded w-1/2"></div>
          <div className="h-8 bg-teal-100 dark:bg-teal-900/30 rounded w-3/4"></div>
          <div className="h-3 bg-teal-100 dark:bg-teal-900/30 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative overflow-hidden rounded-2xl border-2 p-4 sm:p-6 transition-all duration-200 ease-out hover:shadow-lg hover:scale-[1.01] hover:-translate-y-0.5 ${styles.container} backdrop-blur-sm`}
      role="article"
      aria-label={`${title}: ${value}`}
    >
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-white/[0.02] blur-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={`inline-flex p-3 rounded-xl ${styles.icon} shadow-md shadow-black/5 dark:shadow-black/20`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg bg-white/50 dark:bg-black/20 backdrop-blur-sm ${styles.trendColor}`}>
              <TrendIcon className="h-3 w-3" aria-hidden="true" />
              <span className="text-xs font-semibold">{change > 0 ? '+' : ''}{change}%</span>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</h3>
          <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${styles.value}`}>{value}</p>
          {description && <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{description}</p>}
        </div>
      </div>
    </div>
  );
});
MetricCard.displayName = 'MetricCard';


// ==================== COMPONENTE DE ESTADÍSTICA SECUNDARIA ====================
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'teal' | 'coral' | 'navy' | 'green';
}

const StatCard = memo<StatCardProps>(({ label, value, icon: Icon, color = 'teal' }) => {
  const colorClass = useMemo(() => ({
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/30',
    coral: 'text-coral-600 dark:text-coral-400 bg-coral-100 dark:bg-coral-900/30',
    navy: 'text-navy-600 dark:text-navy-400 bg-navy-100 dark:bg-navy-900/30',
    green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30'
  }[color]), [color]);

  return (
    <div className="relative bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        <div className={`p-2 sm:p-3 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
});
StatCard.displayName = 'StatCard';


// ==================== COMPONENTE LISTA DE PACIENTES ====================
interface Patient {
  id: string;
  nombreCompleto?: string;
  estado_paciente?: string;
}

const PatientsList = memo<{ patients: Patient[]; limit?: number }>(({ patients, limit = 5 }) => {
  // Memoización de la lista de pacientes a mostrar para evitar recalcular
  const displayPatients = useMemo(() => patients.slice(0, limit), [patients, limit]);
  
  if (patients.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gradient-to-br from-teal-50/30 to-transparent dark:from-teal-900/10 rounded-xl">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50 text-teal-500" />
        <p>No hay pacientes registrados</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label="Lista de pacientes recientes">
      {displayPatients.map((patient) => (
        <PatientListItem key={patient.id} patient={patient} />
      ))}
    </div>
  );
});
PatientsList.displayName = 'PatientsList';

// Sub-componente para la lista de pacientes, para optimizar renders individuales
const PatientListItem = memo<{ patient: Patient }>(({ patient }) => {
  const { nombreCompleto = 'Paciente', estado_paciente = 'desconocido', id } = patient;
  const initials = nombreCompleto.charAt(0).toUpperCase();
  const patientId = id.slice(0, 8);
  const estado = estado_paciente.replace(/_/g, ' ');

  const estadoColor = useMemo(() => {
    switch (estado_paciente) {
      case 'operado': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'activo': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
      case 'en_seguimiento': return 'bg-coral-100 text-coral-700 dark:bg-coral-900/30 dark:text-coral-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  }, [estado_paciente]);

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent hover:from-teal-100/70 dark:hover:from-teal-900/20 rounded-xl transition-all duration-200 border border-transparent hover:border-teal-200 dark:hover:border-teal-800" role="listitem">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm sm:text-base">{nombreCompleto}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {patientId}</p>
        </div>
      </div>
      <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${estadoColor}`}>
        {estado}
      </span>
    </div>
  );
});
PatientListItem.displayName = 'PatientListItem';


// ==================== HOOK DE MÉTRICAS CON LÓGICA REFINADA ====================
// **MEJORA CLAVE**: Se unificaron los bucles para procesar citas y pacientes en una sola pasada,
// reduciendo drásticamente la carga computacional en grandes conjuntos de datos.
const useOptimizedMetrics = (appointments: any[], patients: any[], period: '7d' | '30d' | '90d') => {
  return useMemo(() => {
    const defaultMetrics = {
      primary: { todayConsultations: 0, totalPatients: patients?.length || 0, pendingAppointments: 0, occupancyRate: 0 },
      clinical: { newAdmissions: 0, completedConsultations: 0, activeTreatments: 0, operatedPatients: 0 },
      chartData: [],
      periodComparison: { changePercent: 0 }
    };

    if (!appointments?.length || !patients?.length) return defaultMetrics;

    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const periodStart = new Date(now);
    periodStart.setDate(now.getDate() - periodDays);
    const periodStartISO = periodStart.toISOString().split('T')[0];
    
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(periodStart.getDate() - periodDays);
    const previousPeriodStartISO = previousPeriodStart.toISOString().split('T')[0];
    
    const todayString = now.toISOString().split('T')[0];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    // Inicialización de contadores
    let todayConsultations = 0, pendingAppointments = 0, periodCompleted = 0;
    let currentPeriodTotal = 0, previousPeriodTotal = 0;
    const monthlyData = new Map<string, { consultas: number; operados: number }>();

    // Pre-poblar los últimos 6 meses para la gráfica
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      monthlyData.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, { consultas: 0, operados: 0 });
    }

    // *** BUCLE ÚNICO PARA CITAS ***
    for (const apt of appointments) {
      if (!apt.fecha_hora_cita) continue;

      const aptDateStr = apt.fecha_hora_cita.split('T')[0];
      if (aptDateStr.startsWith(todayString)) todayConsultations++;
      if (apt.estado_cita === 'PROGRAMADA') pendingAppointments++;

      if (aptDateStr >= periodStartISO) {
        currentPeriodTotal++;
        if (apt.estado_cita === 'COMPLETADA') periodCompleted++;
      } else if (aptDateStr >= previousPeriodStartISO) {
        previousPeriodTotal++;
      }

      const aptDate = new Date(aptDateStr);
      if (aptDate >= sixMonthsAgo) {
        const monthKey = `${aptDate.getFullYear()}-${String(aptDate.getMonth() + 1).padStart(2, '0')}`;
        const monthEntry = monthlyData.get(monthKey);
        if (monthEntry) {
          if (apt.estado_cita === 'COMPLETADA') monthEntry.consultas++;
          const tipoCitaLower = apt.tipo_cita?.toLowerCase() || '';
          if (tipoCitaLower.includes('cirug') || tipoCitaLower.includes('opera')) {
            monthEntry.operados++;
          }
        }
      }
    }

    // *** BUCLE ÚNICO PARA PACIENTES ***
    let newAdmissions = 0, activeTreatments = 0, operatedPatients = 0;
    for (const patient of patients) {
      if (patient.fecha_registro && patient.fecha_registro >= periodStartISO) newAdmissions++;
      const estado = patient.estado_paciente;
      if (estado === 'activo' || estado === 'en_seguimiento') activeTreatments++;
      if (estado === 'operado') operatedPatients++;
    }

    const occupancyRate = currentPeriodTotal > 0 ? Math.round((periodCompleted / currentPeriodTotal) * 100) : 0;
    const changePercent = previousPeriodTotal > 0 ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100) : 0;

    const chartData = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month: new Date(month + '-02').toLocaleDateString('es', { month: 'short', year: '2-digit' }),
      consultas: data.consultas,
      operados: data.operados,
    }));

    return {
      primary: { todayConsultations, totalPatients: patients.length, pendingAppointments, occupancyRate },
      clinical: { newAdmissions, completedConsultations: periodCompleted, activeTreatments, operatedPatients },
      chartData,
      periodComparison: { changePercent }
    };
  }, [appointments, patients, period]);
};


// ==================== TOOLTIP PERSONALIZADO PARA GRÁFICA ====================
const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-gray-900 p-3 rounded-xl shadow-lg border border-teal-200 dark:border-teal-800 text-xs sm:text-sm">
        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={`item-${entry.name}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600 dark:text-gray-400">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
});
CustomTooltip.displayName = 'CustomTooltip';


// ==================== COMPONENTE PRINCIPAL DEL DASHBOARD ====================
export function DashboardConsolidated() {
  const { allAppointments, allPatients, isLoading, error, refetch } = useClinic();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  
  const metrics = useOptimizedMetrics(allAppointments, allPatients, period);

  const handleRefresh = useCallback(() => refetch?.(), [refetch]);

  const getTrend = useCallback((value: number): 'up' | 'down' | 'neutral' => {
    if (value > 5) return 'up';
    if (value < -5) return 'down';
    return 'neutral';
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-md w-full bg-white dark:bg-gray-900 border-coral-200 dark:border-coral-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-coral-500 dark:text-coral-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Error al Cargar Datos</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error.message || 'Ocurrió un error inesperado'}</p>
            <Button onClick={handleRefresh} variant="outline" className="hover:bg-teal-50 dark:hover:bg-teal-900/20 border-teal-300 dark:border-teal-700">
              <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 bg-gray-50 dark:bg-gray-950">
      {/* ====== Header ====== */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500 dark:from-teal-800 dark:via-teal-700 dark:to-cyan-700 p-4 sm:p-6 text-white shadow-lg">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-coral-400/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-white/90" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Panel de Control</h1>
            </div>
            <p className="text-xs sm:text-sm text-teal-100 dark:text-teal-200">Clínica Hernia y Vesícula - Dr. Luis Ángel Medina</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="inline-flex bg-white/10 backdrop-blur-md rounded-xl p-1 border border-white/20" role="group" aria-label="Selector de período">
              {(['7d', '30d', '90d'] as const).map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${period === p ? 'bg-white text-teal-600 shadow-md' : 'text-white hover:bg-white/10'}`} aria-pressed={period === p}>
                  {p.replace('d', ' días')}
                </button>
              ))}
            </div>
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading} className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-md h-9 w-full sm:w-auto" aria-label="Actualizar datos">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      {/* ====== Métricas Principales ====== */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Consultas del Día" value={metrics.primary.todayConsultations} icon={Stethoscope} priority="high" description="Pacientes programados hoy" isLoading={isLoading} />
        <MetricCard title="Base de Pacientes" value={metrics.primary.totalPatients.toLocaleString()} change={metrics.periodComparison.changePercent} trend={getTrend(metrics.periodComparison.changePercent)} icon={Users} priority="medium" description={`Crecimiento en ${period.replace('d', ' días')}`} isLoading={isLoading} />
        <MetricCard title="Eficiencia Operativa" value={`${metrics.primary.occupancyRate}%`} trend={metrics.primary.occupancyRate > 70 ? 'up' : 'down'} icon={Target} priority={metrics.primary.occupancyRate > 70 ? 'medium' : 'high'} description="Tasa de ocupación" isLoading={isLoading} />
        <MetricCard title="Cirugías Realizadas" value={metrics.clinical.operatedPatients} icon={Heart} priority="high" description={`Total de pacientes operados`} isLoading={isLoading} />
      </section>

      {/* ====== Gráfica y Estadísticas Secundarias ====== */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-3 bg-white dark:bg-gray-900 border-teal-100 dark:border-teal-900 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="border-b border-teal-100 dark:border-teal-900 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <CardTitle className="text-lg sm:text-xl text-gray-900 dark:text-gray-100">Análisis de Procedimientos</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Evolución de consultas y cirugías en los últimos 6 meses</CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div><span className="text-gray-600 dark:text-gray-400">Consultas</span></div>
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-coral-500"></div><span className="text-gray-600 dark:text-gray-400">Cirugías</span></div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center text-teal-400 dark:text-teal-600"><RefreshCw className="h-8 w-8 animate-spin" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={metrics.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/><stop offset="95%" stopColor="#14b8a6" stopOpacity={0.05}/></linearGradient>
                    <linearGradient id="colorOperados" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.4}/><stop offset="95%" stopColor="#f87171" stopOpacity={0.05}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:opacity-20" />
                  <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <YAxis stroke="#6b7280" fontSize={12} tick={{ fill: '#6b7280' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="consultas" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorConsultas)" name="Consultas" />
                  <Area type="monotone" dataKey="operados" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorOperados)" name="Cirugías" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <Card className="bg-white dark:bg-gray-900 border-teal-100 dark:border-teal-900 hover:shadow-md transition-shadow">
            <CardHeader className="p-3 sm:p-4 border-b border-teal-100 dark:border-teal-900">
              <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2"><Activity className="h-5 w-5 text-teal-500" />Indicadores Clínicos</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 grid grid-cols-2 gap-3 sm:gap-4">
              <StatCard label="Nuevos Ingresos" value={metrics.clinical.newAdmissions} icon={UserPlus} color="teal" />
              <StatCard label="Tratamientos Activos" value={metrics.clinical.activeTreatments} icon={Activity} color="green" />
              <StatCard label="Procedimientos Completados" value={metrics.clinical.completedConsultations} icon={ClipboardCheck} color="navy" />
              <StatCard label="Citas Pendientes" value={metrics.primary.pendingAppointments} icon={CalendarDays} color="coral" />
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-900 border-teal-100 dark:border-teal-900 hover:shadow-md transition-shadow">
            <CardHeader className="p-3 sm:p-4 border-b border-teal-100 dark:border-teal-900">
              <div className="flex justify-between items-center">
                <CardTitle className="text-base sm:text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2"><Users className="h-5 w-5 text-teal-500" />Pacientes Recientes</CardTitle>
                <span className="text-xs px-2 py-1 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium">{allPatients ? `${Math.min(5, allPatients.length)} de ${allPatients.length}` : '0'}</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {isLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-teal-50 dark:bg-teal-900/20 animate-pulse rounded-xl" />)}</div>
              ) : (
                <PatientsList patients={allPatients || []} limit={5} />
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ====== Footer ====== */}
      <footer className="mt-4 sm:mt-8 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 border border-teal-200 dark:border-teal-800">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <CircleDot className="h-4 w-4 text-teal-500 animate-pulse" />
            <span>Sistema Clínico en Línea • Datos actualizados</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
            <Award className="h-3 w-3 text-coral-500" />
            <span>Especialistas en Hernia y Vesícula</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
