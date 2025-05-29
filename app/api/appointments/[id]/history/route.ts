// app/api/appointments/[id]/history/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Endpoint to get history of an appointment
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appointmentId } = await params;
    const supabase = await createClient();
    
    // Get appointment history ordered by date
    const { data, error } = await supabase
      .from('appointment_history')
      .select(`
        id,
        appointment_id,
        estado_cita_anterior,
        estado_cita_nuevo,
        fecha_cambio,
        fecha_cita_anterior,
        fecha_cita_nueva,
        modificado_por_id,
        notas,
        motivo_cambio,
        created_at,
        profiles:modificado_por_id (id, full_name, role)
      `)
      .eq('appointment_id', appointmentId)
      .order('fecha_cambio', { ascending: false });

    if (error) {
      console.error('Error fetching appointment history:', error);
      return NextResponse.json({ message: 'Error al obtener historial', error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Unexpected error GET /api/appointments/[id]/history:', err);
    return NextResponse.json({ message: 'Error inesperado', error: err.message }, { status: 500 });
  }
}
