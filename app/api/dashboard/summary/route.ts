// app/api/dashboard/summary/route.ts - API PARA RESUMEN DEL DASHBOARD
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { AppointmentStatusEnum } from '@/lib/types';

// ==================== HANDLER PARA RESUMEN DEL DASHBOARD ====================
export async function GET() {
  try {
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient()
      : await createClient();
    
    // 🎯 OBTENER MÉTRICAS ESPECÍFICAS EN PARALELO
    const [
      todayAppointmentsResult,
      totalPatientsResult,
      pendingConsultsResult,
      completedSurveysResult,
      recentActivityResult
    ] = await Promise.all([
      // Citas de hoy
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .gte('fecha_hora_cita', new Date().toISOString().split('T')[0])
        .lt('fecha_hora_cita', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
      
      // Total de pacientes
      supabase
        .from('patients')
        .select('id', { count: 'exact', head: true }),
      
      // Consultas pendientes
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('estado_cita', AppointmentStatusEnum.PROGRAMADA),
      
      // Encuestas completadas
      supabase
        .from('surveys')
        .select('id', { count: 'exact', head: true })
        .not('completed_at', 'is', null),
      
      // Actividad reciente (últimos 7 días)
      supabase
        .from('patients')
        .select('created_at, appointments!left(estado_cita), surveys!left(completed_at)')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);
    
    // 📊 PROCESAR RESULTADOS
    const todayAppointments = todayAppointmentsResult.count || 0;
    const totalPatients = totalPatientsResult.count || 0;
    const pendingConsults = pendingConsultsResult.count || 0;
    const completedSurveys = completedSurveysResult.count || 0;
    
    // Calcular actividad reciente
    const recentPatients = recentActivityResult.data || [];
    const newPatients = recentPatients.length;
    
    const completedAppointments = recentPatients.reduce((count, patient) => {
      const completed = patient.appointments?.filter((apt: any) => apt.estado_cita === AppointmentStatusEnum.COMPLETADA).length || 0;
      return count + completed;
    }, 0);
    
    const pendingSurveys = recentPatients.reduce((count, patient) => {
      const pending = patient.surveys?.filter((survey: any) => !survey.completed_at).length || 0;
      return count + pending;
    }, 0);
    
    // 📦 RESPUESTA ESTRUCTURADA
    return NextResponse.json({
      todayAppointments,
      totalPatients,
      pendingConsults,
      completedSurveys,
      recentActivity: {
        newPatients,
        completedAppointments,
        pendingSurveys,
      },
    }, {
      headers: {
        'Cache-Control': 'max-age=60, s-maxage=180, stale-while-revalidate=300',
      },
    });
    
  } catch (error) {
    console.error('Dashboard Summary API Error:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
