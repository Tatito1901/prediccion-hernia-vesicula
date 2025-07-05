// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PatientOriginEnum } from '@/components/dashboard/dashboard-metrics';

// Helper para validar fechas ISO
function isValidISODate(dateString: string): boolean {
  if (!dateString) return false;
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    let query = supabase.from('patients').select(`
      fecha_registro,
      estado_paciente,
      fecha_primera_consulta,
      fecha_cirugia_programada,
      diagnostico_principal,
      origen_paciente
    `);

    if (startDate) {
      query = query.gte('fecha_registro', startDate);
    }
    if (endDate) {
      query = query.lte('fecha_registro', endDate);
    }

    const { data: patients, error } = await query;

    if (error) {
      console.error('Supabase error fetching patients for metrics:', error);
      throw error;
    }

    if (!patients) {
      return NextResponse.json({ message: 'No patient data found for the given period' }, { status: 404 });
    }

    // --- Lógica de Cálculo de Métricas (Movida desde el Frontend) ---
    const totalPacientes = patients.length;
    
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const pacientesNuevosMes = patients.filter(p => {
      if (!p.fecha_registro || !isValidISODate(p.fecha_registro)) return false;
      try {
        return new Date(p.fecha_registro) >= startOfMonth;
      } catch {
        return false;
      }
    }).length;

    const pacientesOperados = patients.filter(p => p.estado_paciente === 'OPERADO').length;
    const pacientesNoOperados = patients.filter(p => p.estado_paciente === 'NO OPERADO').length;
    const pacientesSeguimiento = patients.filter(p => p.estado_paciente === 'EN SEGUIMIENTO').length;
    
    const totalDecididos = pacientesOperados + pacientesNoOperados;
    const tasaConversion = totalDecididos > 0 
      ? parseFloat(((pacientesOperados / totalDecididos) * 100).toFixed(2)) 
      : 0;

    let totalDiasDecision = 0;
    let conteoDecision = 0;
    
    patients.forEach(p => {
      if ((p.estado_paciente === 'OPERADO' || p.estado_paciente === 'NO OPERADO') && 
          p.fecha_primera_consulta && 
          p.fecha_cirugia_programada &&
          isValidISODate(p.fecha_primera_consulta) &&
          isValidISODate(p.fecha_cirugia_programada)) {
        try {
          const fechaConsulta = new Date(p.fecha_primera_consulta);
          const fechaDecision = new Date(p.fecha_cirugia_programada);
          const dias = Math.ceil((fechaDecision.getTime() - fechaConsulta.getTime()) / (1000 * 3600 * 24));
          
          if (dias >= 0 && dias < 365) {
            totalDiasDecision += dias;
            conteoDecision++;
          }
        } catch (e) {
          console.error(`Error calculando días de decisión para paciente:`, e);
        }
      }
    });
    
    const tiempoPromedioDecision = conteoDecision > 0 
      ? Math.round(totalDiasDecision / conteoDecision) 
      : 0;

    const origenCount = new Map<string, number>();
    patients.forEach(p => {
      if (p.origen_paciente?.trim()) {
        const origen = p.origen_paciente.trim() as PatientOriginEnum;
        origenCount.set(origen, (origenCount.get(origen) || 0) + 1);
      }
    });

    const fuentePrincipalPacientes = (Array.from(origenCount.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] as PatientOriginEnum) || PatientOriginEnum.OTHER;

    const diagnosticosCount = new Map<string, number>();
    patients.forEach(p => {
      if (p.diagnostico_principal?.trim()) {
        const diag = p.diagnostico_principal.trim();
        diagnosticosCount.set(diag, (diagnosticosCount.get(diag) || 0) + 1);
      }
    });

    const diagnosticosMasComunes = Array.from(diagnosticosCount.entries())
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const metrics = {
      totalPacientes,
      pacientesNuevosMes,
      pacientesOperados,
      pacientesNoOperados,
      pacientesSeguimiento,
      tasaConversion,
      tiempoPromedioDecision,
      fuentePrincipalPacientes,
      diagnosticosMasComunes,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(metrics, { 
      headers: { 'Cache-Control': 'max-age=600, s-maxage=3600, stale-while-revalidate=21600' }
    });

  } catch (error: any) {
    console.error('Error in metrics API route:', error);
    return NextResponse.json({ 
      message: 'Error al obtener las métricas',
      error: error.message 
    }, { status: 500 });
  }
}
