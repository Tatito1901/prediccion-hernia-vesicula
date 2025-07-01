// app/api/statics/patients/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic'; // Don't cache this route

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const dateRange = searchParams.get('dateRange') || '30dias';
    const estado = searchParams.get('estado') || 'todos';
    
    // Calculate date range based on the dateRange parameter
    const today = new Date();
    const currentEndDate = today.toISOString().split('T')[0];
    let currentStartDate = '';

    switch (dateRange) {
      case '7dias': {
        const date = new Date(today);
        date.setDate(date.getDate() - 7);
        currentStartDate = date.toISOString().split('T')[0];
        break;
      }
      case '30dias': {
        const date = new Date(today);
        date.setDate(date.getDate() - 30);
        currentStartDate = date.toISOString().split('T')[0];
        break;
      }
      case '90dias': {
        const date = new Date(today);
        date.setDate(date.getDate() - 90);
        currentStartDate = date.toISOString().split('T')[0];
        break;
      }
      case 'ytd': {
        currentStartDate = `${today.getFullYear()}-01-01`;
        break;
      }
      case 'todos':
      default:
        currentStartDate = '';
        break;
    }

    // Execute query using Supabase client
    const supabase = await createClient();
    
    // Start building the query
    let query = supabase
      .from('pacientes')
      .select('id, nombre, apellidos, diagnostico_principal, fecha_registro, edad, estado_paciente');
    
    // Add date filter if specified
    if (currentStartDate) {
      query = query.gte('fecha_registro', currentStartDate)
                   .lte('fecha_registro', currentEndDate);
    }
    
    // Add estado filter if specified
    if (estado && estado !== 'todos') {
      query = query.eq('estado_paciente', estado);
    }
    
    // Execute the query
    const { data: patients, error } = await query;
    
    if (error) {
      throw new Error(`Database query error: ${error.message}`);
    }

    // Calculate metrics and insights
    const metrics = await calculateMetrics(patients);
    const timeline = generateTimeline(patients);
    const insights = generateInsights(patients, metrics);

    return NextResponse.json({
      metrics,
      timeline,
      insights
    });
    
  } catch (error) {
    console.error('Error in statistics API:', error);
    return NextResponse.json(
      { error: 'Error retrieving statistics data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate metrics
async function calculateMetrics(patients: any[]) {
  // Counters for different diagnoses
  let totalHernias = 0;
  let totalVesicula = 0;
  let totalApendicitis = 0;
  
  // Map to track diagnosis counts
  const diagnosisCounts = new Map<string, number>();
  const herniaTypes = new Map<string, number>();
  
  // Process each patient to gather statistics
  patients.forEach(patient => {
    if (patient.diagnostico_principal) {
      const lowerDiag = patient.diagnostico_principal.toLowerCase();
      
      // Count by diagnosis category
      if (lowerDiag.includes('hernia')) {
        totalHernias++;
        
        // Track specific hernia types
        if (lowerDiag.includes('inguinal')) {
          if (lowerDiag.includes('recidivante')) {
            const diagKey = 'Hernia Inguinal Recidivante';
            herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
          } else if (lowerDiag.includes('bilateral')) {
            const diagKey = 'Hernia Inguinal Bilateral';
            herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
          } else {
            const diagKey = 'Hernia Inguinal';
            herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
          }
        } else if (lowerDiag.includes('umbilical')) {
          const diagKey = 'Hernia Umbilical';
          herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
        } else if (lowerDiag.includes('incisional')) {
          const diagKey = 'Hernia Incisional';
          herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
        } else if (lowerDiag.includes('hiatal')) {
          const diagKey = 'Hernia Hiatal';
          herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
        } else if (lowerDiag.includes('eventracion')) {
          const diagKey = 'Eventración Abdominal';
          herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
        } else {
          const diagKey = 'Otra Hernia';
          herniaTypes.set(diagKey, (herniaTypes.get(diagKey) || 0) + 1);
        }
      }
      
      if (lowerDiag.includes('vesicula') || lowerDiag.includes('colelitiasis')) {
        totalVesicula++;
      }
      
      if (lowerDiag.includes('apendicitis')) {
        totalApendicitis++;
      }
      
      // Count all diagnosis types
      diagnosisCounts.set(patient.diagnostico_principal, (diagnosisCounts.get(patient.diagnostico_principal) || 0) + 1);
    }
  });
  
  const totalPacientes = patients.length;
  
  // Calculate percentages
  const porcentajeHernias = totalPacientes > 0 ? (totalHernias / totalPacientes) * 100 : 0;
  const porcentajeVesicula = totalPacientes > 0 ? (totalVesicula / totalPacientes) * 100 : 0;
  const porcentajeApendicitis = totalPacientes > 0 ? (totalApendicitis / totalPacientes) * 100 : 0;
  const ratioHerniaVesicula = totalVesicula > 0 ? totalHernias / totalVesicula : 0;
  
  // Create most common diagnoses chart data
  const diagnosticosMasComunes = Array.from(diagnosisCounts.entries())
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  // Create hernia distribution chart data
  const distribucionHernias = Array.from(herniaTypes.entries())
    .map(([tipo, cantidad]) => ({ tipo, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  
  // Calculate diagnostic diversity (Shannon Index simplified)
  const diversidadDiagnostica = diagnosisCounts.size > 0 ? 
    Math.log2(Math.max(1, diagnosisCounts.size)) : 0;
  
  // Determine risk level based on metrics
  const riesgoPromedio = determineRiskLevel(porcentajeHernias, porcentajeVesicula);
  
  // Calculate general trend (placeholder - would be calculated from historical data)
  const tendenciaGeneral = 0;
  
  return {
    totalPacientes,
    totalHernias,
    totalVesicula,
    totalApendicitis,
    diagnosticosMasComunes,
    distribucionHernias,
    porcentajeHernias,
    porcentajeVesicula,
    porcentajeApendicitis,
    ratioHerniaVesicula,
    diversidadDiagnostica,
    riesgoPromedio,
    tendenciaGeneral
  };
}

// Helper function to generate timeline data
function generateTimeline(patients: any[]) {
  const timelineData: { [key: string]: number } = {};
  
  // Group patients by date
  patients.forEach(patient => {
    if (patient.fecha_registro) {
      const date = new Date(patient.fecha_registro).toISOString().split('T')[0];
      timelineData[date] = (timelineData[date] || 0) + 1;
    }
  });
  
  // Convert to array format
  return Object.entries(timelineData)
    .map(([date, cantidad]) => ({
      date,
      cantidad,
      formattedDate: new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Helper function to generate insights
function generateInsights(patients: any[], metrics: any) {
  const insights = [];
  
  // Insight 1: Most common diagnosis
  if (metrics.diagnosticosMasComunes.length > 0) {
    const mostCommon = metrics.diagnosticosMasComunes[0];
    insights.push({
      title: "Diagnóstico más común",
      description: `${mostCommon.tipo} es el diagnóstico más frecuente con ${mostCommon.cantidad} casos.`,
      trend: "stable",
      action: "monitor"
    });
  }
  
  // Insight 2: Hernia to Vesicula ratio
  if (metrics.totalVesicula > 0) {
    insights.push({
      title: "Relación Hernias/Vesículas",
      description: `La relación de hernias a casos de vesícula es ${metrics.ratioHerniaVesicula.toFixed(1)}:1.`,
      trend: metrics.ratioHerniaVesicula > 1.5 ? "increasing" : "stable",
      action: "information"
    });
  }
  
  // Insight 3: Age distribution (if applicable)
  const ageGroups = {
    under18: 0,
    adults: 0,
    elderly: 0
  };
  
  patients.forEach(patient => {
    if (patient.edad) {
      if (patient.edad < 18) ageGroups.under18++;
      else if (patient.edad < 65) ageGroups.adults++;
      else ageGroups.elderly++;
    }
  });
  
  const dominantAgeGroup = Object.entries(ageGroups)
    .sort((a, b) => b[1] - a[1])[0];
    
  let ageGroupText = "adultos";
  if (dominantAgeGroup[0] === "under18") ageGroupText = "menores de 18";
  if (dominantAgeGroup[0] === "elderly") ageGroupText = "mayores de 65";
  
  insights.push({
    title: "Distribución por edad",
    description: `La mayoría de pacientes son ${ageGroupText}.`,
    trend: "stable",
    action: "information"
  });
  
  return insights;
}

// Helper function to determine risk level
function determineRiskLevel(herniaPercentage: number, vesiculaPercentage: number): 'baja' | 'media' | 'alta' {
  const combinedRisk = herniaPercentage + vesiculaPercentage;
  
  if (combinedRisk > 70) return 'alta';
  if (combinedRisk > 40) return 'media';
  return 'baja';
}
