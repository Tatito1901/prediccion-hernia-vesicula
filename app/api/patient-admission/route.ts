import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { z } from 'zod';
import { AdmissionPayload, AdmissionDBResponse, AppointmentWithPatient } from '@/components/patient-admission/types';

// ==================== ESQUEMA DE VALIDACIÓN ====================
const PatientAdmissionSchema = z.object({
  // Datos básicos del paciente
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50),
  apellidos: z.string().trim().min(2, 'Los apellidos deben tener al menos 2 caracteres').max(50),
  telefono: z.string().trim().min(10, 'El teléfono debe tener al menos 10 dígitos').max(20),
  
  // Datos opcionales
  edad: z.number().int().min(0).max(120).nullable().optional(),
  email: z.string().email().optional().or(z.literal('')),
  
  // Datos médicos
  diagnostico_principal: z.string().min(1, 'El diagnóstico principal es requerido').max(100),
  probabilidad_cirugia: z.number().min(0).max(100).nullable().optional(),
  comentarios_registro: z.string().max(1000).optional(),
  
  // Datos de la cita
  fecha_hora_cita: z.string().datetime('Fecha y hora de cita inválida'),
  motivo_cita: z.string().min(1, 'El motivo de la cita es requerido').max(200),
  es_primera_vez: z.boolean().default(true),
});

// ==================== UTILIDADES ====================
const validateBusinessRules = async (supabase: any, data: any) => {
  // 1. Validar horario de atención
  const appointmentDate = new Date(data.fecha_hora_cita);
  const hour = appointmentDate.getHours();
  const dayOfWeek = appointmentDate.getDay();
  
  // Domingo = 0, Lunes = 1, etc.
  if (dayOfWeek === 0) {
    return { isValid: false, message: 'No se pueden agendar citas los domingos' };
  }
  
  // Horario: 9 AM - 2 PM (9:00 - 14:00)
  if (hour < 9 || hour >= 14) {
    return { isValid: false, message: 'Horario fuera del horario de atención (9:00 AM - 2:00 PM)' };
  }
  
  // 2. Validar tiempo mínimo de anticipación (2 horas)
  const now = new Date();
  const hoursUntilAppointment = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilAppointment < 2) {
    return { isValid: false, message: 'La cita debe programarse con al menos 2 horas de anticipación' };
  }
  
  if (hoursUntilAppointment / 24 > 60) {
    return { isValid: false, message: 'No se pueden programar citas con más de 60 días de anticipación' };
  }
  
  // 3. Validar teléfono único
  if (data.telefono) {
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id, nombre, apellidos')
      .eq('telefono', data.telefono)
      .single();
    
    if (existingPatient) {
      return {
        isValid: false,
        message: `Ya existe un paciente registrado con este teléfono: ${existingPatient.nombre} ${existingPatient.apellidos}`
      };
    }
  }
  
  return { isValid: true, message: 'Validación exitosa' };
};

const checkAppointmentAvailability = async (supabase: any, dateTime: string) => {
  const { data: conflictingAppointments, error } = await supabase
    .from('appointments')
    .select(`
      id,
      estado_cita,
      patients (nombre, apellidos)
    `)
    .eq('fecha_hora_cita', dateTime)
    .in('estado_cita', ['PROGRAMADA', 'CONFIRMADA', 'PRESENTE']);

  if (error) {
    console.error('[API] Error checking availability:', error);
    return { available: false, error: 'Error al verificar disponibilidad' };
  }

  const isAvailable = !conflictingAppointments || conflictingAppointments.length === 0;
  
  return {
    available: isAvailable,
    conflictingAppointment: conflictingAppointments?.[0] || null,
  };
};

const createPatientAndAppointment = async (supabase: any, data: any, userId?: string) => {
  // 1. Crear paciente
  const patientData = {
    nombre: data.nombre,
    apellidos: data.apellidos,
    edad: data.edad || null,
    telefono: data.telefono || null,
    email: data.email || null,
    fecha_registro: new Date().toISOString().split('T')[0],
    estado_paciente: 'PENDIENTE DE CONSULTA',
    fecha_primera_consulta: new Date(data.fecha_hora_cita).toISOString().split('T')[0],
    diagnostico_principal: data.diagnostico_principal,
    probabilidad_cirugia: data.probabilidad_cirugia ? data.probabilidad_cirugia / 100 : null, // Convertir a decimal
    comentarios_registro: data.comentarios_registro || null,
    origen_paciente: 'CONSULTA_DIRECTA',
    creado_por_id: userId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: newPatient, error: patientError } = await supabase
    .from('patients')
    .insert(patientData)
    .select()
    .single();

  if (patientError) {
    console.error('[API] Error creando paciente:', patientError);
    throw new Error('Error al crear paciente: ' + patientError.message);
  }

  // 2. Crear cita
  const appointmentData = {
    patient_id: newPatient.id,
    doctor_id: null,
    fecha_hora_cita: data.fecha_hora_cita,
    motivo_cita: data.motivo_cita,
    estado_cita: 'PROGRAMADA',
    es_primera_vez: data.es_primera_vez,
    notas_cita_seguimiento: null,
    created_at: new Date().toISOString()
  };

  const { data: newAppointment, error: appointmentError } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();

  if (appointmentError) {
    console.error('[API] Error creando cita:', appointmentError);
    throw new Error('Error al crear cita: ' + appointmentError.message);
  }

  return {
    patient_id: newPatient.id,
    appointment_id: newAppointment.id,
    patient: newPatient,
    appointment: newAppointment
  };
};

// ==================== ENDPOINT PRINCIPAL ====================
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    console.log('[API] Iniciando proceso de admisión de paciente');

    // 1. Validación con Zod
    const validatedData = PatientAdmissionSchema.parse(body);
    
    // 2. Validaciones de negocio
    const businessValidation = await validateBusinessRules(supabase, validatedData);
    if (!businessValidation.isValid) {
      return NextResponse.json(
        { error: businessValidation.message }, 
        { status: 400 }
      );
    }

    // 3. Verificar disponibilidad del horario
    const availability = await checkAppointmentAvailability(
      supabase, 
      validatedData.fecha_hora_cita
    );
    
    if (!availability.available) {
      return NextResponse.json(
        { 
          error: 'El horario seleccionado no está disponible',
          conflicting_appointment: availability.conflictingAppointment,
        }, 
        { status: 409 }
      );
    }

    // 4. Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // 5. Crear paciente y cita en transacción
    const result = await createPatientAndAppointment(supabase, validatedData, userId);

    // 6. Construir respuesta
    const response: AppointmentWithPatient = {
      id: result.appointment_id,
      patient_id: result.patient_id,
      fecha_hora_cita: validatedData.fecha_hora_cita,
      motivo_cita: validatedData.motivo_cita,
      estado_cita: 'PROGRAMADA',
      es_primera_vez: validatedData.es_primera_vez,
      patients: {
        id: result.patient_id,
        nombre: validatedData.nombre,
        apellidos: validatedData.apellidos,
        telefono: validatedData.telefono,
        email: validatedData.email || undefined,
        edad: validatedData.edad || undefined,
        diagnostico_principal: validatedData.diagnostico_principal,
        estado_paciente: 'PENDIENTE DE CONSULTA',
        probabilidad_cirugia: validatedData.probabilidad_cirugia || null,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    };

    console.log('[API] ✅ Paciente y cita creados exitosamente');
    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error('[API] ❌ Error en el endpoint de admisión:', error);
    
    // Manejo específico de errores de validación
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        received: err.input
      }));
      
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        validation_errors: errorMessages
      }, { status: 400 });
    }
    
    // Error genérico del servidor
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Contacte al administrador'
      }, 
      { status: 500 }
    );
  }
}