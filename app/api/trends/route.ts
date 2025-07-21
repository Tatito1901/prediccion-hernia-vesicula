// app/api/trends/route.ts - API PARA CÁLCULO DE TENDENCIAS HISTÓRICAS REALES
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ==================== TIPOS DE DATOS ====================
interface TrendMetric {
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  percentageChange: number;
}

interface TrendsResponse {
  totalPatients: TrendMetric;
  newPatients: TrendMetric;
  operatedPatients: TrendMetric;
  nonOperatedPatients: TrendMetric;
  followUpPatients: TrendMetric;
  conversionRate: TrendMetric;
  averageTime: TrendMetric;
  period: string;
  calculatedAt: string;
}

// ==================== FUNCIONES HELPER ====================
function calculateTrend(current: number, previous: number): TrendMetric {
  if (previous === 0) {
    return {
      current,
      previous,
      trend: current > 0 ? 'up' : 'neutral',
      trendValue: current > 0 ? '+100%' : '0%',
      percentageChange: current > 0 ? 100 : 0
    };
  }

  const percentageChange = ((current - previous) / previous) * 100;
  const trend = percentageChange > 5 ? 'up' : percentageChange < -5 ? 'down' : 'neutral';
  const trendValue = `${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;

  return {
    current,
    previous,
    trend,
    trendValue,
    percentageChange
  };
}

function getDateRanges(period: string = 'month') {
  const now = new Date();
  let currentStart: Date, currentEnd: Date, previousStart: Date, previousEnd: Date;

  switch (period) {
    case 'week':
      // Semana actual vs semana anterior
      currentEnd = new Date(now);
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart);
      previousStart = new Date(currentStart.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    
    case 'quarter':
      // Trimestre actual vs trimestre anterior
      const currentQuarter = Math.floor(now.getMonth() / 3);
      currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1);
      currentEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0);
      previousStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
      previousEnd = new Date(now.getFullYear(), currentQuarter * 3, 0);
      break;
    
    case 'month':
    default:
      // Mes actual vs mes anterior
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd }
  };
}

// ==================== HANDLER PRINCIPAL ====================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const supabase = await createClient();
    const { current, previous } = getDateRanges(period);

    // 🎯 CONSULTAS PARALELAS PARA MÉTRICAS ACTUALES Y ANTERIORES
    const [
      currentPatientsResult,
      previousPatientsResult,
      currentNewPatientsResult,
      previousNewPatientsResult,
      currentOperatedResult,
      previousOperatedResult,
      currentNonOperatedResult,
      previousNonOperatedResult,
      currentFollowUpResult,
      previousFollowUpResult,
      currentAppointmentsResult,
      previousAppointmentsResult
    ] = await Promise.all([
      // Total pacientes período actual
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .lte('created_at', current.end.toISOString()),

      // Total pacientes período anterior
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .lte('created_at', previous.end.toISOString()),

      // Nuevos pacientes período actual
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', current.start.toISOString())
        .lte('created_at', current.end.toISOString()),

      // Nuevos pacientes período anterior
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', previous.start.toISOString())
        .lte('created_at', previous.end.toISOString()),

      // Pacientes operados período actual
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'operado')
        .lte('created_at', current.end.toISOString()),

      // Pacientes operados período anterior
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'operado')
        .lte('created_at', previous.end.toISOString()),

      // Pacientes no operados período actual
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'no_operado')
        .lte('created_at', current.end.toISOString()),

      // Pacientes no operados período anterior
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'no_operado')
        .lte('created_at', previous.end.toISOString()),

      // Pacientes en seguimiento período actual
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'en_seguimiento')
        .lte('created_at', current.end.toISOString()),

      // Pacientes en seguimiento período anterior
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .eq('estado_paciente', 'en_seguimiento')
        .lte('created_at', previous.end.toISOString()),

      // Citas período actual (para tiempo promedio)
      supabase
        .from('appointments')
        .select('fecha_hora_cita, created_at')
        .gte('fecha_hora_cita', current.start.toISOString())
        .lte('fecha_hora_cita', current.end.toISOString())
        .eq('estado_cita', 'completada'),

      // Citas período anterior (para tiempo promedio)
      supabase
        .from('appointments')
        .select('fecha_hora_cita, created_at')
        .gte('fecha_hora_cita', previous.start.toISOString())
        .lte('fecha_hora_cita', previous.end.toISOString())
        .eq('estado_cita', 'completada')
    ]);

    // 📊 EXTRAER CONTEOS
    const currentPatients = currentPatientsResult.count || 0;
    const previousPatients = previousPatientsResult.count || 0;
    const currentNewPatients = currentNewPatientsResult.count || 0;
    const previousNewPatients = previousNewPatientsResult.count || 0;
    const currentOperated = currentOperatedResult.count || 0;
    const previousOperated = previousOperatedResult.count || 0;
    const currentNonOperated = currentNonOperatedResult.count || 0;
    const previousNonOperated = previousNonOperatedResult.count || 0;
    const currentFollowUp = currentFollowUpResult.count || 0;
    const previousFollowUp = previousFollowUpResult.count || 0;

    // 📊 CALCULAR MÉTRICAS DERIVADAS
    const currentConversionRate = currentPatients > 0 ? (currentOperated / currentPatients) * 100 : 0;
    const previousConversionRate = previousPatients > 0 ? (previousOperated / previousPatients) * 100 : 0;

    // Calcular tiempo promedio de citas
    const calculateAverageTime = (appointments: any[]) => {
      if (!appointments || appointments.length === 0) return 0;
      
      const times = appointments.map(apt => {
        const created = new Date(apt.created_at);
        const scheduled = new Date(apt.fecha_hora_cita);
        return Math.abs(scheduled.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // días
      });
      
      return times.reduce((sum, time) => sum + time, 0) / times.length;
    };

    const currentAverageTime = calculateAverageTime(currentAppointmentsResult.data || []);
    const previousAverageTime = calculateAverageTime(previousAppointmentsResult.data || []);

    // 🎯 CONSTRUIR RESPUESTA CON TENDENCIAS REALES
    const response: TrendsResponse = {
      totalPatients: calculateTrend(currentPatients, previousPatients),
      newPatients: calculateTrend(currentNewPatients, previousNewPatients),
      operatedPatients: calculateTrend(currentOperated, previousOperated),
      nonOperatedPatients: calculateTrend(currentNonOperated, previousNonOperated),
      followUpPatients: calculateTrend(currentFollowUp, previousFollowUp),
      conversionRate: calculateTrend(currentConversionRate, previousConversionRate),
      averageTime: calculateTrend(currentAverageTime, previousAverageTime),
      period,
      calculatedAt: new Date().toISOString()
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'max-age=300, s-maxage=600, stale-while-revalidate=1800', // 5min cache
      },
    });

  } catch (error) {
    console.error('Trends API Error:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor al calcular tendencias' },
      { status: 500 }
    );
  }
}
