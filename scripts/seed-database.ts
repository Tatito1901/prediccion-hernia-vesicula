import { createAdminClient } from '../utils/supabase/admin'

async function seedDatabase() {
  const supabase = createAdminClient()
  
  console.log('🌱 Starting database seed...')
  
  try {
    // Create test patients using the RPC function
    const patients = [
      {
        nombre: 'Juan',
        apellidos: 'Pérez García',
        telefono: '5551234567',
        email: 'juan.perez@email.com',
        edad: 45,
        diagnostico_principal: 'HERNIA_UMBILICAL',
        comentarios_registro: 'Paciente referido por dolor abdominal',
        probabilidad_cirugia: 0.85,
        fecha_hora_cita: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        motivo_cita: 'Evaluación para cirugía de hernia'
      },
      {
        nombre: 'María',
        apellidos: 'López Hernández',
        telefono: '5552345678',
        email: 'maria.lopez@email.com',
        edad: 38,
        diagnostico_principal: 'COLECISTITIS',
        comentarios_registro: 'Dolor en hipocondrio derecho',
        probabilidad_cirugia: 0.75,
        fecha_hora_cita: new Date().toISOString(), // Today
        motivo_cita: 'Consulta por vesícula'
      },
      {
        nombre: 'Carlos',
        apellidos: 'Martínez Ruiz',
        telefono: '5553456789',
        email: 'carlos.martinez@email.com',
        edad: 52,
        diagnostico_principal: 'HERNIA_INGUINAL',
        comentarios_registro: 'Hernia inguinal bilateral',
        probabilidad_cirugia: 0.90,
        fecha_hora_cita: new Date(Date.now() + 172800000).toISOString(), // In 2 days
        motivo_cita: 'Evaluación preoperatoria'
      },
      {
        nombre: 'Ana',
        apellidos: 'González Silva',
        telefono: '5554567890',
        email: 'ana.gonzalez@email.com',
        edad: 41,
        diagnostico_principal: 'COLELITIASIS',
        comentarios_registro: 'Múltiples episodios de cólico biliar',
        probabilidad_cirugia: 0.80,
        fecha_hora_cita: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        motivo_cita: 'Seguimiento postoperatorio'
      },
      {
        nombre: 'Roberto',
        apellidos: 'Díaz Torres',
        telefono: '5555678901',
        email: 'roberto.diaz@email.com',
        edad: 49,
        diagnostico_principal: 'HERNIA_VENTRAL',
        comentarios_registro: 'Hernia ventral post-incisional',
        probabilidad_cirugia: 0.70,
        fecha_hora_cita: new Date().toISOString(), // Today
        motivo_cita: 'Primera consulta'
      }
    ]
    
    let createdCount = 0
    let errorCount = 0
    
    for (const patient of patients) {
      const { data, error } = await supabase.rpc('create_patient_and_appointment', {
        p_nombre: patient.nombre,
        p_apellidos: patient.apellidos,
        p_telefono: patient.telefono,
        p_email: patient.email,
        p_edad: patient.edad,
        p_diagnostico_principal: patient.diagnostico_principal,
        p_comentarios_registro: patient.comentarios_registro,
        p_probabilidad_cirugia: patient.probabilidad_cirugia,
        p_fecha_hora_cita: patient.fecha_hora_cita,
        p_motivo_cita: patient.motivo_cita
      })
      
      if (error) {
        console.error(`❌ Error creating patient ${patient.nombre}:`, error.message)
        errorCount++
      } else {
        console.log(`✅ Created patient: ${patient.nombre} ${patient.apellidos}`)
        createdCount++
      }
    }
    
    console.log(`\n📊 Seed complete: ${createdCount} patients created, ${errorCount} errors`)
    
    // Verify data was created
    const { count: patientCount } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
    
    const { count: appointmentCount } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n📈 Database status:`)
    console.log(`   - Total patients: ${patientCount}`)
    console.log(`   - Total appointments: ${appointmentCount}`)
    
  } catch (error) {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  }
}

// Run the seed
seedDatabase()
  .then(() => {
    console.log('\n✨ Database seeded successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
