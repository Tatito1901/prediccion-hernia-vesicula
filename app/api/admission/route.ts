// app/api/admission/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { DiagnosisEnum } from '@/lib/types';

// Esquema de validación para los datos de entrada
const admissionSchema = z.object({
  nombre: z.string().trim().min(2),
  apellidos: z.string().trim().min(2),
  telefono: z.string().trim().min(10),
  edad: z.number().int().positive().nullable(),
  email: z.string().email().optional(),
  diagnostico_principal: z.nativeEnum(DiagnosisEnum),
  comentarios_registro: z.string().optional(),
  fecha_hora_cita: z.string().datetime(),
  motivo_cita: z.string(),
  doctor_asignado_id: z.string().uuid().optional(),
  creado_por_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const validation = admissionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Datos inválidos.', errors: validation.error.flatten() }, { status: 400 });
    }
    
    const data = validation.data;

    // Llamamos a la función RPC admit_new_patient para crear tanto el paciente como la cita en una transacción
    const { data: result, error } = await supabase.rpc('admit_new_patient', {
      p_nombre: data.nombre,
      p_apellidos: data.apellidos,
      p_telefono: data.telefono,
      p_edad: data.edad,
      p_email: data.email,
      p_diagnostico_principal: data.diagnostico_principal,
      p_comentarios_registro: data.comentarios_registro || '',
      p_fecha_hora_cita: data.fecha_hora_cita,
      p_motivo_cita: data.motivo_cita,
      p_creado_por_id: data.creado_por_id || null,
      p_doctor_asignado_id: data.doctor_asignado_id || null
    });

    if (error) {
      console.error('Error en RPC admit_new_patient:', error);
      return NextResponse.json({ message: 'Error al registrar al paciente.', error: error.message }, { status: 500 });
    }

    return NextResponse.json(result, { status: 201 });
    
  } catch (error: any) {
    console.error('Error en POST /api/admission:', error);
    return NextResponse.json({ message: 'Error inesperado en el servidor.', error: error.message }, { status: 500 });
  }
}
