// app/api/patients/[id]/history/route.ts
// 🎯 ADAPTADA A TU ESQUEMA REAL - Para el botón "Ver Historial"

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parámetros de consulta
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeHistory = searchParams.get('includeHistory') === 'true';

    console.log(`[API] 📊 Obteniendo historial del paciente: ${patientId}`);

    // 1. OBTENER DATOS DEL PACIENTE (usando tu esquema exacto)
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select(`
        id,
        nombre,
        apellidos,
        edad,
        telefono,
        email,
        fecha_registro,
        estado_paciente,
        diagnostico_principal,
        diagnostico_principal_detalle,
        doctor_asignado_id,
        fecha_primera_consulta,
        comentarios_registro,
        origen_paciente,
        probabilidad_cirugia,
        ultimo_contacto,
        proximo_contacto,
        etiquetas,
        fecha_cirugia_programada,
        created_at,
        profiles:doctor_asignado_id (
          id,
          full_name,
          username
        )
      `)
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      console.error('[API] ❌ Paciente no encontrado:', patientError);
      return NextResponse.json(
        { error: 'Paciente no encontrado' }, 
        { status: 404 }
      );
    }

    // 2. OBTENER HISTORIAL DE CITAS (usando tu esquema exacto)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora_cita,
        motivo_cita,
        estado_cita,
        es_primera_vez,
        notas_breves,
        created_at,
        doctor_id,
        profiles:doctor_id (
          id,
          full_name,
          username
        )
      `)
      .eq('patient_id', patientId)
      .order('fecha_hora_cita', { ascending: false })
      .range(offset, offset + limit - 1);

    if (appointmentsError) {
      console.error('[API] ❌ Error al obtener citas:', appointmentsError);
      return NextResponse.json(
        { error: 'Error al obtener el historial de citas' }, 
        { status: 500 }
      );
    }

    // 3. OBTENER HISTORIAL DE CAMBIOS (usando tu tabla appointment_history)
    let appointmentHistory = null;
    if (includeHistory && appointments?.length > 0) {
      const appointmentIds = appointments.map(apt => apt.id);
      
      const { data: historyData, error: historyError } = await supabase
        .from('appointment_history')
        .select(`
          id,
          appointment_id,
          estado_cita_anterior,
          estado_cita_nuevo,
          fecha_cambio,
          fecha_cita_anterior,
          fecha_cita_nueva,
          notas,
          motivo_cambio,
          profiles:modificado_por_id (
            full_name,
            username
          )
        `)
        .in('appointment_id', appointmentIds)
        .order('fecha_cambio', { ascending: false });

      if (!historyError) {
        appointmentHistory = historyData;
      }
    }

    // 4. OBTENER ENCUESTAS (usando tu sistema de encuestas)
    const { data: surveys, error: surveysError } = await supabase
      .from('assigned_surveys')
      .select(`
        id,
        template_id,
        status,
        assigned_at,
        completed_at,
        survey_templates (
          id,
          title,
          description
        ),
        survey_responses (
          id,
          submitted_at,
          overall_rating,
          response_data,
          notes
        )
      `)
      .eq('patient_id', patientId)
      .order('assigned_at', { ascending: false });

    // 5. CALCULAR ESTADÍSTICAS AVANZADAS
    const stats = {
      // Estadísticas básicas de citas
      total_appointments: appointments?.length || 0,
      completed_appointments: appointments?.filter(a => a.estado_cita === 'COMPLETADA').length || 0,
      cancelled_appointments: appointments?.filter(a => a.estado_cita === 'CANCELADA').length || 0,
      no_show_appointments: appointments?.filter(a => a.estado_cita === 'NO_ASISTIO').length || 0,
      rescheduled_appointments: appointments?.filter(a => a.estado_cita === 'REAGENDADA').length || 0,
      
      // Fechas importantes
      first_appointment_date: appointments?.[appointments.length - 1]?.fecha_hora_cita || null,
      last_appointment_date: appointments?.[0]?.fecha_hora_cita || null,
      
      // Estadísticas de encuestas
      surveys_assigned: surveys?.length || 0,
      surveys_completed: surveys?.filter(s => s.completed_at).length || 0,
      average_rating: surveys && surveys.length > 0 ? surveys.reduce((acc, s) => {
        const responses = s.survey_responses;
        if (responses && responses.length > 0 && responses[0]) {
          const rating = responses[0].overall_rating;
          return rating ? acc + rating : acc;
        }
        return acc;
      }, 0) / Math.max(1, surveys.filter(s => s.survey_responses?.length > 0).length || 1) : 0,
      
      // Estadísticas de seguimiento
      days_since_first_contact: patient.fecha_registro ? 
        Math.floor((new Date().getTime() - new Date(patient.fecha_registro).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      has_pending_contact: patient.proximo_contacto && new Date(patient.proximo_contacto) > new Date(),
    };

    // 6. FORMATEAR CITAS CON INFORMACIÓN ENRIQUECIDA
    const formattedAppointments = appointments?.map(appointment => {
      // Buscar historial de cambios para esta cita
      const changes = appointmentHistory?.filter(h => h.appointment_id === appointment.id) || [];
      
      return {
        ...appointment,
        // Información del doctor
        doctor_name: appointment.profiles?.[0]?.full_name || appointment.profiles?.[0]?.username || 'Dr. No Asignado',
        
        // Estado y etiquetas
        status_label: getStatusLabel(appointment.estado_cita),
        is_recent: isRecentAppointment(appointment.fecha_hora_cita),
        
        // Historial de cambios (si se solicitó)
        change_history: includeHistory ? changes : undefined,
        total_changes: changes.length,
        
        // Información contextual
        duration_since_appointment: getDurationSinceAppointment(appointment.fecha_hora_cita),
        appointment_type: appointment.es_primera_vez ? 'Primera consulta' : 'Consulta de seguimiento'
      };
    });

    // 7. CONSTRUIR RESPUESTA COMPLETA
    const response = {
      patient: {
        ...patient,
        // Campos calculados
        full_name: `${patient.nombre} ${patient.apellidos}`.trim(),
        display_diagnosis: patient.diagnostico_principal || 'Sin diagnóstico específico',
        doctor_name: patient.profiles?.[0]?.full_name || patient.profiles?.[0]?.username || 'No asignado',
        
        // Estado del paciente
        surgery_probability_percentage: patient.probabilidad_cirugia ? Math.round(patient.probabilidad_cirugia * 100) : null,
        has_scheduled_surgery: !!patient.fecha_cirugia_programada,
        
        // Contacto
        days_since_last_contact: patient.ultimo_contacto ? 
          Math.floor((new Date().getTime() - new Date(patient.ultimo_contacto).getTime()) / (1000 * 60 * 60 * 24)) : null,
        days_until_next_contact: patient.proximo_contacto ? 
          Math.ceil((new Date(patient.proximo_contacto).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
      },
      
      appointments: formattedAppointments,
      statistics: stats,
      surveys: surveys || [],
      
      pagination: {
        limit,
        offset,
        total: appointments?.length || 0,
        has_more: appointments?.length === limit
      },
      
      // Metadatos adicionales
      meta: {
        generated_at: new Date().toISOString(),
        includes_history: includeHistory,
        total_history_records: appointmentHistory?.length || 0
      }
    };

    console.log(`[API] ✅ Historial obtenido: ${appointments?.length || 0} citas, ${surveys?.length || 0} encuestas para paciente ${patientId}`);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[API] ❌ Error en obtención de historial:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}

// ==================== FUNCIONES AUXILIARES ====================

function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    'PROGRAMADA': 'Programada',
    'CONFIRMADA': 'Confirmada', 
    'PRESENTE': 'En consulta',
    'COMPLETADA': 'Completada',
    'CANCELADA': 'Cancelada',
    'NO_ASISTIO': 'No asistió',
    'REAGENDADA': 'Reagendada'
  };
  
  return statusLabels[status] || status;
}

function isRecentAppointment(appointmentDate: string): boolean {
  const appointment = new Date(appointmentDate);
  const now = new Date();
  const daysDifference = (now.getTime() - appointment.getTime()) / (1000 * 60 * 60 * 24);
  
  return Math.abs(daysDifference) <= 30; // Últimos o próximos 30 días
}

function getDurationSinceAppointment(appointmentDate: string): string {
  const appointment = new Date(appointmentDate);
  const now = new Date();
  const daysDifference = Math.floor((now.getTime() - appointment.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDifference > 0) {
    if (daysDifference === 1) return 'Hace 1 día';
    if (daysDifference < 30) return `Hace ${daysDifference} días`;
    if (daysDifference < 365) return `Hace ${Math.floor(daysDifference / 30)} meses`;
    return `Hace ${Math.floor(daysDifference / 365)} años`;
  } else if (daysDifference < 0) {
    const absDays = Math.abs(daysDifference);
    if (absDays === 1) return 'En 1 día';
    if (absDays < 30) return `En ${absDays} días`;
    return `En ${Math.floor(absDays / 30)} meses`;
  } else {
    return 'Hoy';
  }
}