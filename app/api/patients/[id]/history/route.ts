// app/api/patients/[id]/history/route.ts
// ADAPTADA A TU ESQUEMA REAL - Para el botón "Ver Historial"

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { AppointmentStatusEnum } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const anon = await createClient();
    // Autenticación: asegura contexto de usuario y evita errores RLS no manejados
    const { data: { user } } = await anon.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    // Usa cliente admin (service role) para consultas sin restricciones de RLS
    const supabase = createAdminClient();
    const { id: patientId } = await params;
    const { searchParams } = new URL(request.url);
    
    // Parámetros de consulta
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeHistory = searchParams.get('includeHistory') === 'true';


    // 1. OBTENER DATOS DEL PACIENTE (solo columnas existentes en el esquema actual)
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
        created_at,
        fecha_ultima_consulta
      `)
      .eq('id', patientId)
      .single();

    const patientFound = !patientError && !!patient;
    if (!patientFound) {
    }
    // Construir safePatient temprano para usar en estadísticas y respuesta
    const safePatient = patientFound ? patient : {
      id: patientId,
      nombre: 'Paciente',
      apellidos: 'Sin registro',
      telefono: null as string | null,
      email: null as string | null,
      created_at: new Date().toISOString(),
      fecha_registro: null as string | null,
      estado_paciente: null as string | null,
      diagnostico_principal: null as string | null,
      edad: null as number | null,
      fecha_ultima_consulta: null as string | null,
    };

    // 2. OBTENER HISTORIAL DE CITAS (sin embeds)
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        fecha_hora_cita,
        motivos_consulta,
        estado_cita,
        es_primera_vez,
        notas_breves,
        created_at,
        doctor_id
      `)
      .eq('patient_id', patientId)
      .order('fecha_hora_cita', { ascending: false })
      .range(offset, offset + limit - 1);

    if (appointmentsError) {
      return NextResponse.json(
        { error: 'Error al obtener el historial de citas' }, 
        { status: 500 }
      );
    }

    // 2.1. OBTENER PERFILES DE DOCTORES REFERENCIADOS (única consulta con IN)
    let profilesMap: Record<string, { id: string; full_name?: string | null }> = {};
    if (appointments && appointments.length > 0) {
      const doctorIds = Array.from(new Set(appointments.map(a => a.doctor_id).filter(Boolean))) as string[];
      if (doctorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', doctorIds);
        if (profilesData) {
          profilesData.forEach(p => { profilesMap[p.id] = p; });
        }
      }
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
          field_changed,
          value_before,
          value_after,
          changed_at,
          changed_by,
          change_reason
        `)
        .in('appointment_id', appointmentIds)
        .order('changed_at', { ascending: false });

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
          completed_at
        )
      `)
      .eq('patient_id', patientId)
      .order('assigned_at', { ascending: false });

    // 5. CALCULAR ESTADÍSTICAS AVANZADAS
    // Usar el historial de cambios para contar reagendamientos reales
    const rescheduledCount = Array.isArray(appointmentHistory)
      ? appointmentHistory.filter(h => h.field_changed === 'fecha_hora_cita').length
      : (appointments?.filter(a => a.estado_cita === AppointmentStatusEnum.REAGENDADA).length || 0);

    const stats = {
      // Estadísticas básicas de citas
      total_appointments: appointments?.length || 0,
      completed_appointments: appointments?.filter(a => a.estado_cita === AppointmentStatusEnum.COMPLETADA).length || 0,
      cancelled_appointments: appointments?.filter(a => a.estado_cita === AppointmentStatusEnum.CANCELADA).length || 0,
      no_show_appointments: appointments?.filter(a => a.estado_cita === AppointmentStatusEnum.NO_ASISTIO).length || 0,
      rescheduled_appointments: rescheduledCount,
      
      // Fechas importantes
      first_appointment_date: appointments?.[appointments.length - 1]?.fecha_hora_cita || null,
      last_appointment_date: appointments?.[0]?.fecha_hora_cita || null,
      
      // Estadísticas de encuestas
      surveys_assigned: surveys?.length || 0,
      surveys_completed: surveys?.filter(s => s.completed_at).length || 0,
      average_rating: 0,
      
      // Estadísticas de seguimiento
      days_since_first_contact: safePatient.fecha_registro ? 
        Math.floor((new Date().getTime() - new Date(safePatient.fecha_registro).getTime()) / (1000 * 60 * 60 * 24)) : 0,
      has_pending_contact: false,
    };

    // 6. FORMATEAR CITAS CON INFORMACIÓN ENRIQUECIDA
    const formattedAppointments = appointments?.map(appointment => {
      // Buscar historial de cambios para esta cita
      const changes = appointmentHistory?.filter(h => h.appointment_id === appointment.id) || [];
      
      return {
        ...appointment,
        // Información del doctor
        doctor_name:
          (appointment.doctor_id && profilesMap[appointment.doctor_id]?.full_name) ||
          'Dr. No Asignado',
        
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
    // safePatient ya declarado arriba

    const response = {
      patient: {
        ...safePatient,
        // Campos calculados
        full_name: `${safePatient.nombre || ''} ${safePatient.apellidos || ''}`.trim() || 'Paciente',
        display_diagnosis: safePatient.diagnostico_principal || 'Sin diagnóstico específico',
        // Estado del paciente
        surgery_probability_percentage: null,
        has_scheduled_surgery: false,
        
        // Contacto
        days_since_last_contact: null,
        days_until_next_contact: null,
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


    return NextResponse.json(response);

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
      { status: 500 }
    );
  }
}

// ==================== FUNCIONES AUXILIARES ====================

function getStatusLabel(status: string): string {
  const statusLabels: Record<string, string> = {
    [AppointmentStatusEnum.PROGRAMADA]: 'Programada',
    [AppointmentStatusEnum.CONFIRMADA]: 'Confirmada',
    [AppointmentStatusEnum.PRESENTE]: 'Presente',
    [AppointmentStatusEnum.COMPLETADA]: 'Completada',
    [AppointmentStatusEnum.CANCELADA]: 'Cancelada',
    [AppointmentStatusEnum.NO_ASISTIO]: 'No asistió',
    [AppointmentStatusEnum.REAGENDADA]: 'Reagendada'
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