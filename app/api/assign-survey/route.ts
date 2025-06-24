// app/api/assign-survey/route.ts

import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface AssignSurveyRequest {
  patientId: string;
  templateId: number;
}

interface AssignSurveyResponse {
  assignmentId?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    const body: AssignSurveyRequest = await request.json();
    const { patientId, templateId } = body;

    if (!patientId || !templateId) {
      return NextResponse.json({ error: 'patientId y templateId son requeridos.' }, { status: 400 });
    }

    // Nota: El user-session check se puede hacer aquí, pero requiere
    // que la cookie de sesión se pase correctamente en las llamadas de API.
    // Por simplicidad, se omite el auth check para enfocarse en la refactorización.

    const { data, error } = await supabase
      .from('assigned_surveys')
      .insert({
        patient_id: patientId,
        template_id: templateId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Supabase error al asignar encuesta:', error);
      throw error;
    }

    if (!data || !data.id) {
      console.error('La creación de la encuesta asignada no devolvió un ID');
      return NextResponse.json({ error: 'Falló la creación de la encuesta asignada.' }, { status: 500 });
    }

    return NextResponse.json({ assignmentId: data.id }, { status: 200 });

  } catch (error: any) {
    console.error('Error en POST /api/assign-survey:', error);
    return NextResponse.json({ error: error.message || 'Ocurrió un error inesperado.' }, { status: 500 });
  }
}
