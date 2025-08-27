// app/api/assign-survey/route.ts
// Asigna una encuesta (template) a un paciente.
// Soporta: POST únicamente. Las operaciones ligadas a una cita (iniciar, completar, estado)
// quedaron deprecadas y fueron removidas para evitar drift con los flujos actuales.

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

import { z } from 'zod';

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
export async function POST(request: NextRequest) {
  // Asignar encuesta a un paciente por template
  // Body esperado: { patientId: string, templateId: number }
  try {
    const supabase = await createClient();

    const AssignSchema = z.object({
      patientId: z.string().min(1, 'patientId es requerido'),
      templateId: z.number().int().positive('templateId debe ser un entero positivo'),
    });

    const json = await request.json().catch(() => ({}));
    const parsed = AssignSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload inválido', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { patientId, templateId } = parsed.data;

    // Verificar que el paciente existe
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 });
    }

    // Buscar si ya existe una asignación reciente para este paciente y template
    const { data: existing, error: existingError } = await supabase
      .from('assigned_surveys')
      .select('id, status')
      .eq('patient_id', patientId)
      .eq('template_id', templateId)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .single();

    if (!existingError && existing) {
      return NextResponse.json(
        { assignmentId: existing.id, surveyId: templateId },
        { status: 200 }
      );
    }

    // Crear nueva asignación
    const { data: inserted, error: insertError } = await supabase
      .from('assigned_surveys')
      .insert({
        patient_id: patientId,
        template_id: templateId,
        status: 'assigned',
      })
      .select('id')
      .single();

    if (insertError || !inserted) {
      console.error('[API] Error al asignar encuesta:', insertError);
      return NextResponse.json(
        { error: 'No se pudo asignar la encuesta' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { assignmentId: inserted.id, surveyId: templateId },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error en asignar encuesta:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}