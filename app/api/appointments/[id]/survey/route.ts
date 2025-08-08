// app/api/appointments/[id]/survey/route.ts
// 🎯 ADAPTADA A TU SISTEMA DE ENCUESTAS COMPLETO - survey_templates + questions + assigned_surveys + survey_responses

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// POST - Completar encuesta con respuestas detalladas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;
    const body = await request.json();

    console.log(`[API] 📝 Completando encuesta para cita: ${appointmentId}`);

    // 1. VALIDAR QUE LA CITA EXISTE Y ES VÁLIDA PARA ENCUESTA
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
      console.error('[API] ❌ Cita no encontrada:', fetchError);
      return NextResponse.json(
        { error: 'Cita no encontrada' }, 
        { status: 404 }
      );
    }

    // 2. VALIDAR ESTADO DE CITA PARA ENCUESTA
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

    // 3. BUSCAR O CREAR ENCUESTA ASIGNADA (usando tu sistema)
    let assignedSurvey = null;
    
    // Buscar encuesta existente
    const { data: existingSurvey, error: surveyCheckError } = await supabase
      .from('assigned_surveys')
      .select(`
        id,
        status,
        template_id,
        completed_at,
        survey_templates (
          id,
          title,
          description
        )
      `)
      .eq('patient_id', appointment.patient_id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSurvey && !surveyCheckError) {
      assignedSurvey = existingSurvey;
    } else {
      // Crear nueva encuesta asignada con template por defecto
      const { data: defaultTemplate } = await supabase
        .from('survey_templates')
        .select('id')
        .limit(1)
        .single();

      if (!defaultTemplate) {
        return NextResponse.json(
          { error: 'No hay plantillas de encuesta disponibles' }, 
          { status: 500 }
        );
      }

      const { data: newSurvey, error: createError } = await supabase
        .from('assigned_surveys')
        .insert({
          patient_id: appointment.patient_id,
          template_id: defaultTemplate.id,
          status: 'in_progress'
        })
        .select(`
          id,
          status,
          template_id,
          survey_templates (
            id,
            title,
            description
          )
        `)
        .single();

      if (createError) {
        console.error('[API] ❌ Error al crear encuesta:', createError);
        return NextResponse.json(
          { error: 'Error al crear la encuesta' }, 
          { status: 500 }
        );
      }

      assignedSurvey = newSurvey;
    }

    // 4. VALIDACIÓN DE DATOS DE ENTRADA
    const {
      overall_rating,
      responses = {}, // Respuestas específicas por pregunta
      notes,
      would_recommend,
      // Campos adicionales que puedan venir
      service_quality,
      wait_time_satisfaction,
      doctor_communication,
      wait_time_minutes
    } = body;

    // Validar calificación general
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return NextResponse.json(
        { error: 'overall_rating debe ser un número entre 1 y 5' }, 
        { status: 400 }
      );
    }

    // 5. PREPARAR DATOS DE RESPUESTA EN FORMATO JSON FLEXIBLE
    const responseData = {
      // Respuestas específicas por pregunta (si las hay)
      question_responses: responses,
      
      // Datos agregados para análisis rápido
      ratings: {
        overall: overall_rating,
        service_quality: service_quality || null,
        wait_time_satisfaction: wait_time_satisfaction || null,
        doctor_communication: doctor_communication || null
      },
      
      // Datos adicionales
      feedback: {
        would_recommend: would_recommend || null,
        notes: notes || null,
        wait_time_minutes: wait_time_minutes || null
      },
      
      // Metadatos
      appointment_id: appointmentId,
      completed_at: new Date().toISOString(),
      survey_version: '1.0'
    };

    // 6. GUARDAR RESPUESTA EN survey_responses (usando tu esquema)
    const { data: surveyResponse, error: responseError } = await supabase
      .from('survey_responses')
      .insert({
        assigned_survey_id: assignedSurvey.id,
        patient_id: appointment.patient_id,
        overall_rating: overall_rating, // Campo específico para análisis rápido
        response_data: responseData, // Datos completos en JSON
        notes: notes || null,
        would_recommend: would_recommend || null,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (responseError) {
      console.error('[API] ❌ Error al guardar respuesta:', responseError);
      return NextResponse.json(
        { error: 'Error al guardar la respuesta de la encuesta' }, 
        { status: 500 }
      );
    }

    // 7. ACTUALIZAR ESTADO DE ENCUESTA ASIGNADA
    await supabase
      .from('assigned_surveys')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', assignedSurvey.id);

    // 8. AGREGAR NOTA A LA CITA (opcional)
    const currentNotes = (appointment as any).notas_cita_seguimiento || '';
    const surveyNote = `${currentNotes ? currentNotes + ' | ' : ''}Encuesta completada - Calificación: ${overall_rating}/5${would_recommend ? ' - Recomendaría: Sí' : ''}`;
    
    await supabase
      .from('appointments')
      .update({ 
        notas_cita_seguimiento: surveyNote
      })
      .eq('id', appointmentId);

    console.log(`[API] ✅ Encuesta completada exitosamente para cita ${appointmentId}`);

    // 9. RESPUESTA EXITOSA
    return NextResponse.json({
      message: 'Encuesta completada exitosamente',
      survey: {
        id: surveyResponse.id,
        assigned_survey_id: assignedSurvey.id,
        template_title: (assignedSurvey.survey_templates as any)?.[0]?.title || 'Encuesta de Satisfacción',
        overall_rating: overall_rating,
        would_recommend: would_recommend
      },
      patient_name: `${appointment.patients[0]?.nombre} ${appointment.patients[0]?.apellidos}`,
      appointment_id: appointmentId
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API] ❌ Error en completar encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message }, 
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

    console.log(`[API] 🚀 Iniciando encuesta para cita: ${appointmentId}`);

    // 1. VERIFICAR QUE LA CITA EXISTE
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

    // 2. VALIDAR ESTADO DE CITA
    const validStates = ['PRESENTE', 'COMPLETADA'];
    if (!validStates.includes(appointment.estado_cita)) {
      return NextResponse.json(
        { error: 'La cita debe estar en estado PRESENTE o COMPLETADA para iniciar encuesta' }, 
        { status: 400 }
      );
    }

    // 3. BUSCAR O CREAR ENCUESTA ASIGNADA
    let assignedSurvey = null;
    
    const { data: existingSurvey } = await supabase
      .from('assigned_surveys')
      .select(`
        id,
        status,
        template_id,
        survey_templates (
          title,
          description
        )
      `)
      .eq('patient_id', appointment.patient_id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (existingSurvey) {
      assignedSurvey = existingSurvey;
    } else {
      // Crear nueva encuesta con template por defecto
      const { data: defaultTemplate } = await supabase
        .from('survey_templates')
        .select('id, title, description')
        .limit(1)
        .single();

      if (!defaultTemplate) {
        return NextResponse.json(
          { error: 'No hay plantillas de encuesta disponibles' }, 
          { status: 500 }
        );
      }

      const { data: newSurvey, error: createError } = await supabase
        .from('assigned_surveys')
        .insert({
          patient_id: appointment.patient_id,
          template_id: defaultTemplate.id,
          status: 'in_progress'
        })
        .select(`
          id,
          status,
          template_id,
          survey_templates (
            title,
            description
          )
        `)
        .single();

      if (createError) {
        console.error('[API] ❌ Error al crear encuesta:', createError);
        return NextResponse.json(
          { error: 'Error al iniciar la encuesta' }, 
          { status: 500 }
        );
      }

      assignedSurvey = newSurvey;
    }

    // 4. OBTENER PREGUNTAS DE LA PLANTILLA (para el frontend)
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('template_id', assignedSurvey.template_id)
      .order('order', { ascending: true });

    if (questionsError) {
      console.warn('[API] ⚠️ No se pudieron obtener preguntas:', questionsError);
    }

    return NextResponse.json({
      message: 'Encuesta iniciada exitosamente',
      survey: {
        id: assignedSurvey.id,
        template_id: assignedSurvey.template_id,
        title: (assignedSurvey.survey_templates as any)?.[0]?.title || 'Encuesta de Satisfacción',
        description: (assignedSurvey.survey_templates as any)?.[0]?.description || 'Por favor comparta su experiencia',
        status: assignedSurvey.status
      },
      questions: questions || [],
      can_complete: true,
      appointment_id: appointmentId
    });

  } catch (error: any) {
    console.error('[API] ❌ Error en iniciar encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// GET - Obtener estado de encuesta y preguntas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: appointmentId } = await params;

    console.log(`[API] 📋 Obteniendo estado de encuesta para cita: ${appointmentId}`);

    // 1. OBTENER INFORMACIÓN DE LA CITA
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

    // 2. BUSCAR ENCUESTA ASIGNADA Y RESPUESTAS
    const { data: assignedSurvey, error: surveyError } = await supabase
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
          notes,
          would_recommend
        )
      `)
      .eq('patient_id', appointment.patient_id)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    // 3. OBTENER PREGUNTAS DE LA PLANTILLA (si existe encuesta)
    let questions = [];
    if (assignedSurvey && !surveyError) {
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('template_id', assignedSurvey.template_id)
        .order('order', { ascending: true });

      if (!questionsError) {
        questions = questionsData || [];
      }
    }

    // 4. DETERMINAR CAPACIDADES Y ESTADO
    const validStatesForSurvey = ['PRESENTE', 'COMPLETADA'];
    const canStartSurvey = validStatesForSurvey.includes(appointment.estado_cita);
    const surveyExists = !!assignedSurvey && !surveyError;
    const hasResponses = surveyExists && assignedSurvey.survey_responses && assignedSurvey.survey_responses.length > 0;
    const isCompleted = hasResponses && !!assignedSurvey.completed_at;

    // 5. CONSTRUIR RESPUESTA COMPLETA
    return NextResponse.json({
      // Estado de la encuesta
      survey_exists: surveyExists,
      survey_started: surveyExists && assignedSurvey.status !== 'assigned',
      survey_completed: isCompleted,
      can_start_survey: canStartSurvey && !isCompleted,
      
      // Datos de la encuesta
      survey: surveyExists ? {
        id: assignedSurvey.id,
        template_id: assignedSurvey.template_id,
        title: (assignedSurvey.survey_templates as any)?.[0]?.title || 'Encuesta de Satisfacción',
        description: (assignedSurvey.survey_templates as any)?.[0]?.description || '',
        status: assignedSurvey.status,
        assigned_at: assignedSurvey.assigned_at,
        completed_at: assignedSurvey.completed_at
      } : null,
      
      // Preguntas de la plantilla
      questions: questions,
      
      // Respuestas existentes (si las hay)
      responses: hasResponses ? assignedSurvey.survey_responses[0] : null,
      
      // Información de la cita
      appointment: {
        id: appointment.id,
        estado_cita: appointment.estado_cita,
        fecha_hora_cita: appointment.fecha_hora_cita,
        patient_name: `${appointment.patients[0]?.nombre} ${appointment.patients[0]?.apellidos}`
      }
    });

  } catch (error: any) {
    console.error('[API] ❌ Error en obtener estado de encuesta:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}