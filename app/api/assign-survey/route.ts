// app/api/appointments/[id]/survey/route.ts
// 🎯 RUTA CRÍTICA FALTANTE - Para el botón "Iniciar/Completar Encuesta" de patient card
// Complementa tu ruta existente /api/assign-survey

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Schema básico para validación de encuesta
interface SurveyCompletion {
  overall_rating: number; // 1-5
  service_quality?: number; // 1-5
  wait_time_satisfaction?: number; // 1-5
  doctor_communication?: number; // 1-5
  would_recommend: boolean;
  would_return: boolean;
  positive_feedback?: string;
  suggestions?: string;
  complaints?: string;
  wait_time_minutes?: number;
}

// POST - Completar encuesta existente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;
    const body = await request.json();

    console.log(`[API] Completando encuesta para cita: ${appointmentId}`);

    // 1. Validar que la cita existe y está en estado válido
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id,
        estado_cita,
        patient_id,
        fecha_hora_cita,
        patients (
          nombre,
          apellidos
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('[API] Cita no encontrada:', fetchError);
      return NextResponse.json(
        { error: 'Cita no encontrada' }, 
        { status: 404 }
      );
    }

    // 2. Validar que la cita está en estado apropiado para encuesta
    const validStatesForSurvey = ['PRESENTE', 'COMPLETADA'];
    if (!validStatesForSurvey.includes(appointment.estado_cita)) {
      return NextResponse.json(
        { 
          error: `No se puede completar encuesta para citas en estado: ${appointment.estado_cita}`,
          valid_states: validStatesForSurvey
        }, 
        { status: 400 }
      );
    }

    // 3. Buscar si ya existe una encuesta asignada (usando tu tabla existing assigned_surveys)
    const { data: existingSurvey, error: surveyCheckError } = await supabase
      .from('assigned_surveys')
      .select('id, status, completed_at')
      .eq('patient_id', appointment.patient_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let surveyId = null;

    // 4. Si no existe encuesta asignada, crear una nueva
    if (surveyCheckError || !existingSurvey) {
      // Crear nueva encuesta asignada (usando tu estructura existente)
      const { data: newSurvey, error: createError } = await supabase
        .from('assigned_surveys')
        .insert({
          patient_id: appointment.patient_id,
          template_id: 1, // Template ID por defecto, puedes hacerlo configurable
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[API] Error al crear encuesta:', createError);
        return NextResponse.json(
          { error: 'Error al crear la encuesta' }, 
          { status: 500 }
        );
      }

      surveyId = newSurvey.id;
    } else {
      // Actualizar encuesta existente
      const { error: updateError } = await supabase
        .from('assigned_surveys')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', existingSurvey.id);

      if (updateError) {
        console.error('[API] Error al actualizar encuesta:', updateError);
        return NextResponse.json(
          { error: 'Error al actualizar la encuesta' }, 
          { status: 500 }
        );
      }

      surveyId = existingSurvey.id;
    }

    // 5. Guardar respuestas detalladas de la encuesta (nueva tabla recomendada)
    // Nota: Podrías crear una tabla 'survey_responses' para datos detallados
    try {
      await supabase
        .from('survey_responses')
        .insert({
          assigned_survey_id: surveyId,
          appointment_id: appointmentId,
          patient_id: appointment.patient_id,
          overall_rating: body.overall_rating,
          service_quality: body.service_quality,
          wait_time_satisfaction: body.wait_time_satisfaction,
          doctor_communication: body.doctor_communication,
          would_recommend: body.would_recommend,
          would_return: body.would_return,
          positive_feedback: body.positive_feedback,
          suggestions: body.suggestions,
          complaints: body.complaints,
          wait_time_minutes: body.wait_time_minutes,
          completed_at: new Date().toISOString()
        });
    } catch (responseError) {
      // Si la tabla no existe, solo loggeamos pero no fallamos
      console.warn('[API] Tabla survey_responses no existe, solo se actualizó assigned_surveys');
    }

    // 6. Actualizar la cita para marcar que la encuesta fue completada
    await supabase
      .from('appointments')
      .update({ 
        notas_cita_seguimiento: `${appointment.notas_cita_seguimiento ? appointment.notas_cita_seguimiento + ' | ' : ''}Encuesta completada - Calificación: ${body.overall_rating}/5`
      })
      .eq('id', appointmentId);

    console.log(`[API] Encuesta completada exitosamente para cita ${appointmentId}`);

    return NextResponse.json({
      message: 'Encuesta completada exitosamente',
      survey_id: surveyId,
      patient_name: `${appointment.patients.nombre} ${appointment.patients.apellidos}`,
      rating: body.overall_rating
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API] Error en completar encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// PATCH - Iniciar encuesta (marcar como iniciada)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    console.log(`[API] Iniciando encuesta para cita: ${appointmentId}`);

    // 1. Verificar que la cita existe
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, estado_cita, patient_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' }, 
        { status: 404 }
      );
    }

    // 2. Validar estado de cita
    const validStates = ['PRESENTE', 'COMPLETADA'];
    if (!validStates.includes(appointment.estado_cita)) {
      return NextResponse.json(
        { error: 'La cita debe estar en estado PRESENTE o COMPLETADA para iniciar encuesta' }, 
        { status: 400 }
      );
    }

    // 3. Crear o buscar encuesta asignada (usando tu estructura existente)
    const { data: existingSurvey } = await supabase
      .from('assigned_surveys')
      .select('id, status')
      .eq('patient_id', appointment.patient_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let surveyId = null;

    if (!existingSurvey) {
      // Crear nueva encuesta asignada
      const { data: newSurvey, error: createError } = await supabase
        .from('assigned_surveys')
        .insert({
          patient_id: appointment.patient_id,
          template_id: 1, // Template por defecto
          status: 'in_progress'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[API] Error al crear encuesta:', createError);
        return NextResponse.json(
          { error: 'Error al iniciar la encuesta' }, 
          { status: 500 }
        );
      }

      surveyId = newSurvey.id;
    } else {
      surveyId = existingSurvey.id;
    }

    return NextResponse.json({
      message: 'Encuesta iniciada exitosamente',
      survey_id: surveyId,
      can_complete: true
    });

  } catch (error: any) {
    console.error('[API] Error en iniciar encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// GET - Obtener estado de encuesta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    console.log(`[API] Obteniendo estado de encuesta para cita: ${appointmentId}`);

    // 1. Obtener información de la cita
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        estado_cita,
        patient_id,
        fecha_hora_cita,
        patients (
          nombre,
          apellidos
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json(
        { error: 'Cita no encontrada' }, 
        { status: 404 }
      );
    }

    // 2. Buscar encuesta asignada (usando tu estructura existente)
    const { data: survey, error: surveyError } = await supabase
      .from('assigned_surveys')
      .select(`
        id,
        status,
        completed_at,
        created_at,
        template_id
      `)
      .eq('patient_id', appointment.patient_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 3. Determinar capacidades
    const validStatesForSurvey = ['PRESENTE', 'COMPLETADA'];
    const canStartSurvey = validStatesForSurvey.includes(appointment.estado_cita);
    const surveyExists = !!survey && !surveyError;
    const isCompleted = surveyExists && !!survey.completed_at;

    // 4. Construir respuesta
    return NextResponse.json({
      survey_exists: surveyExists,
      survey_started: surveyExists && survey.status !== 'pending',
      survey_completed: isCompleted,
      can_start_survey: canStartSurvey && !isCompleted,
      survey_id: survey?.id || null,
      completed_at: survey?.completed_at || null,
      appointment: {
        id: appointment.id,
        estado_cita: appointment.estado_cita,
        fecha_hora_cita: appointment.fecha_hora_cita,
        patient_name: `${appointment.patients.nombre} ${appointment.patients.apellidos}`
      }
    });

  } catch (error: any) {
    console.error('[API] Error en obtener estado de encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}