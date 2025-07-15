// app/api/metrics/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic'; // Asegura que la ruta se ejecute dinámicamente en cada petición

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Obtenemos los parámetros de fecha. Si no existen, serán null.
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Llamamos a la función de la base de datos (RPC) con los parámetros.
    // La función SQL que creamos está diseñada para manejar parámetros nulos sin problemas.
    const { data: metrics, error } = await supabase.rpc('get_patient_metrics', {
      start_date_text: startDate,
      end_date_text: endDate,
    });

    if (error) {
      console.error('Supabase RPC error fetching metrics:', error);
      throw error;
    }

    if (!metrics) {
      return NextResponse.json({ message: 'No se pudieron calcular las métricas.' }, { status: 404 });
    }

    // Devolvemos directamente el JSON calculado por la base de datos.
    // Añadimos las cabeceras de caché para un rendimiento óptimo en producción.
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600',
      },
    });

  } catch (error: any) {
    console.error('Error in metrics API route:', error);
    return NextResponse.json(
      {
        message: 'Error al obtener las métricas',
        error: error.message,
      },
      { status: 500 }
    );
  }
}