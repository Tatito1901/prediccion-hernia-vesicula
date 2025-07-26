// app/api/admission/counts/route.ts - API OPTIMIZADA PARA CONTADORES DE ADMISIÓN
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ==================== CONFIGURACIÓN ====================
const CACHE_CONFIG = {
  'Cache-Control': 'max-age=60, s-maxage=120, stale-while-revalidate=300',
};

// ==================== HELPERS ====================
const getTodayRange = () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  return {
    start: todayStart.toISOString(),
    end: todayEnd.toISOString(),
  };
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function GET() {
  try {
    const supabase = await createClient();
    const todayRange = getTodayRange();
    
    console.log('📊 [Admission Counts] Fetching appointment counts...');
    
    // OPTIMIZACIÓN: Usar una sola query con agregaciones en lugar de múltiples queries
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('fecha_hora_cita, estado_cita')
      .neq('estado_cita', 'CANCELADA'); // Excluir canceladas de los conteos principales
    
    if (error) {
      console.error('❌ [Admission Counts] Database error:', error);
      return NextResponse.json(
        { error: 'Error al consultar las citas' },
        { status: 500 }
      );
    }
    
    if (!appointments) {
      return NextResponse.json({
        today: 0,
        future: 0,
        past: 0,
        total: 0,
      });
    }
    
    // CLASIFICAR CITAS EN MEMORIA (más eficiente que múltiples queries)
    const now = new Date();
    const todayStart = new Date(todayRange.start);
    const todayEnd = new Date(todayRange.end);
    
    let todayCount = 0;
    let futureCount = 0;
    let pastCount = 0;
    
    appointments.forEach(appointment => {
      try {
        const appointmentDate = new Date(appointment.fecha_hora_cita);
        
        if (appointmentDate >= todayStart && appointmentDate < todayEnd) {
          todayCount++;
        } else if (appointmentDate >= todayEnd) {
          futureCount++;
        } else if (appointmentDate < todayStart) {
          pastCount++;
        }
      } catch (error) {
        console.warn('⚠️ [Admission Counts] Invalid date format:', appointment.fecha_hora_cita);
      }
    });
    
    const total = todayCount + futureCount + pastCount;
    
    // RESPUESTA ESTRUCTURADA
    const response = {
      today: todayCount,
      future: futureCount,
      past: pastCount,
      total,
      meta: {
        timestamp: new Date().toISOString(),
        dateRange: {
          todayStart: todayRange.start,
          todayEnd: todayRange.end,
        },
      },
    };
    
    console.log(`✅ [Admission Counts] Counts calculated:`, response);
    
    return NextResponse.json(response, {
      status: 200,
      headers: CACHE_CONFIG,
    });
    
  } catch (error: any) {
    console.error('💥 [Admission Counts] Unexpected error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}