// app/api/patients/stats/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Cache muy agresivo para estadísticas - estos datos cambian lentamente
const cacheConfig = {
  // 20 minutos browser cache, 1 hora CDN, 6 horas stale-while-revalidate
  'Cache-Control': 'max-age=1200, s-maxage=3600, stale-while-revalidate=21600',
};

export async function GET(request: Request) {
  const supabase = await createClient();
  
  try {
    // OPTIMIZACIÓN CRÍTICA: Usar vista materializada para estadísticas instantáneas
    let { data: stats, error } = await supabase
      .from('patient_stats_mv')
      .select('*')
      .single();

    // Fallback: Si la vista materializada no existe, calcular en tiempo real
    if (error || !stats) {
      console.log('Vista materializada no disponible, calculando stats en tiempo real...');
      
      // Estadísticas básicas usando conteos simples
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true });

      const { count: pendingConsults } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('estado_paciente', 'PENDIENTE DE CONSULTA');

      const { count: operatedPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('estado_paciente', 'OPERADO');

      // Calcular tasa de encuestas completadas (simplificada)
      const { count: completedSurveys } = await supabase
        .from('survey_responses')
        .select('*', { count: 'exact', head: true })
        .not('submitted_at', 'is', null);

      const surveyRate = totalPatients && completedSurveys 
        ? Math.round((completedSurveys / totalPatients) * 100 * 100) / 100 
        : 0;

      stats = {
        total_patients: totalPatients || 0,
        pending_consults: pendingConsults || 0,
        operated_patients: operatedPatients || 0,
        surgery_rate: totalPatients ? Math.round((operatedPatients || 0) * 100 / totalPatients * 100) / 100 : 0,
        survey_completion_rate: surveyRate
      };
    }

    return NextResponse.json(stats, { headers: cacheConfig });
    
  } catch (error: any) {
    console.error('Error fetching patient stats:', error);
    
    // En caso de error, devolver estadísticas por defecto para no romper la UI
    return NextResponse.json({
      total_patients: 0,
      pending_consults: 0,
      operated_patients: 0,
      surgery_rate: 0,
      survey_completion_rate: 0
    }, { 
      status: 200, // 200 en lugar de 500 para no romper la UI
      headers: {
        'Cache-Control': 'max-age=30, s-maxage=60', // Cache más corto para errores
      }
    });
  }
}

// Endpoint para refrescar las estadísticas manualmente (solo admin)
export async function POST(request: Request) {
  const supabase = await createClient();
  
  try {
    // Verificar permisos de admin aquí si es necesario
    
    // Refrescar la vista materializada
    const { error } = await supabase.rpc('refresh_patient_stats');
    
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ 
      message: 'Estadísticas actualizadas correctamente' 
    });
    
  } catch (error: any) {
    console.error('Error refreshing patient stats:', error);
    return NextResponse.json({ 
      message: 'Error al actualizar estadísticas', 
      error: error.message 
    }, { status: 500 });
  }
}