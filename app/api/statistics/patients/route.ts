// app/api/statistics/patients/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PatientStatusEnum } from '@/lib/types';

export async function GET(request: Request) {
  const supabase = await createClient();

  try {
    // Consultar pacientes
    const { data: patients, error: patientsError, count } = await supabase
      .from('patients')
      .select('id, estado_paciente', { count: 'exact' });

    if (patientsError) {
      throw patientsError;
    }

    // Consultar encuestas completadas (usando la tabla assigned_surveys)
    const { data: surveys, error: surveysError } = await supabase
      .from('assigned_surveys')
      .select('patient_id, status')
      .eq('status', 'completed');
      
    if (surveysError) {
      throw surveysError;
    }
    
    // Crear un Set con los IDs de pacientes que han completado encuestas
    const patientsWithSurvey = new Set(
      surveys.map(survey => survey.patient_id)
    );

    const totalPatients = count || 0;
    let surveyCompletedCount = patientsWithSurvey.size;
    const statsByStatus = {
      [PatientStatusEnum.PENDIENTE_DE_CONSULTA]: 0,
      [PatientStatusEnum.OPERADO]: 0,
    };

    patients.forEach(patient => {
      // Verificar si el paciente ha completado una encuesta
      if (patientsWithSurvey.has(patient.id)) {
        // No necesitamos incrementar surveyCompletedCount aquí
        // ya que ya contamos esto arriba con patientsWithSurvey.size
      }

      if (patient.estado_paciente === PatientStatusEnum.PENDIENTE_DE_CONSULTA) {
        statsByStatus[PatientStatusEnum.PENDIENTE_DE_CONSULTA]++;
      }
      if (patient.estado_paciente === PatientStatusEnum.OPERADO) {
        statsByStatus[PatientStatusEnum.OPERADO]++;
      }
    });

    const surveyCompletionRate = totalPatients > 0 
        ? Math.round((surveyCompletedCount / totalPatients) * 100) 
        : 0;

    const finalStats = {
      total_patients: totalPatients,
      survey_completion_rate: surveyCompletionRate,
      pending_consults: statsByStatus[PatientStatusEnum.PENDIENTE_DE_CONSULTA],
      operated_patients: statsByStatus[PatientStatusEnum.OPERADO]
    };

    // Cache por 5 minutos
    return NextResponse.json(finalStats, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error: any) {
    console.error('Error en API de estadísticas de pacientes:', error);
    return NextResponse.json({ message: "Error al calcular estadísticas.", error: error.message }, { status: 500 });
  }
}
