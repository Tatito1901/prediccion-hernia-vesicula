#!/usr/bin/env node

const API_BASE = 'http://localhost:3000/api'

const patients = [
  {
    nombre: 'Juan',
    apellidos: 'Pérez García',
    telefono: '5551234567',
    email: 'juan.perez@email.com',
    edad: 45,
    fecha_nacimiento: '1979-03-15',
    genero: 'MASCULINO',
    diagnostico_principal: 'HERNIA_UMBILICAL',
    estado_paciente: 'activo',
    ciudad: 'Ciudad de México',
    comentarios_registro: 'Paciente referido por dolor abdominal',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() + 86400000).toISOString(),
      motivos_consulta: ['HERNIA_UMBILICAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }]
  },
  {
    nombre: 'María',
    apellidos: 'López Hernández',
    telefono: '5552345678',
    email: 'maria.lopez@email.com',
    edad: 38,
    fecha_nacimiento: '1986-07-22',
    genero: 'FEMENINO',
    diagnostico_principal: 'COLECISTITIS_AGUDA',
    estado_paciente: 'activo',
    ciudad: 'Estado de México',
    comentarios_registro: 'Dolor en hipocondrio derecho',
    appointments: [{
      fecha_hora_cita: new Date().toISOString(),
      motivos_consulta: ['COLECISTITIS_AGUDA'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }]
  },
  {
    nombre: 'Carlos',
    apellidos: 'Martínez Ruiz',
    telefono: '5553456789',
    email: 'carlos.martinez@email.com',
    edad: 52,
    fecha_nacimiento: '1972-01-10',
    genero: 'MASCULINO',
    diagnostico_principal: 'HERNIA_INGUINAL',
    estado_paciente: 'activo',
    ciudad: 'Ciudad de México',
    comentarios_registro: 'Hernia inguinal bilateral',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() + 172800000).toISOString(),
      motivos_consulta: ['HERNIA_INGUINAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: false
    }]
  },
  {
    nombre: 'Ana',
    apellidos: 'González Silva',
    telefono: '5554567890',
    email: 'ana.gonzalez@email.com',
    edad: 41,
    fecha_nacimiento: '1983-05-30',
    genero: 'FEMENINO',
    diagnostico_principal: 'COLELITIASIS',
    estado_paciente: 'operado',
    ciudad: 'Guadalajara',
    comentarios_registro: 'Múltiples episodios de cólico biliar',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() - 86400000).toISOString(),
      motivos_consulta: ['COLELITIASIS'],
      estado_cita: 'COMPLETADA',
      es_primera_vez: false
    }]
  },
  {
    nombre: 'Roberto',
    apellidos: 'Díaz Torres',
    telefono: '5555678901',
    email: 'roberto.diaz@email.com',
    edad: 49,
    fecha_nacimiento: '1975-11-18',
    genero: 'MASCULINO',
    diagnostico_principal: 'HERNIA_INCISIONAL',
    estado_paciente: 'potencial',
    ciudad: 'Monterrey',
    comentarios_registro: 'Hernia ventral post-incisional',
    appointments: [{
      fecha_hora_cita: new Date().toISOString(),
      motivos_consulta: ['HERNIA_INCISIONAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }]
  },
  {
    nombre: 'Patricia',
    apellidos: 'Ramírez Flores',
    telefono: '5556789012',
    email: 'patricia.ramirez@email.com',
    edad: 35,
    fecha_nacimiento: '1989-09-25',
    genero: 'FEMENINO',
    diagnostico_principal: 'OTRO_DIAGNOSTICO',
    estado_paciente: 'activo',
    ciudad: 'Puebla',
    comentarios_registro: 'Dolor en fosa ilíaca derecha',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() + 3600000).toISOString(),
      motivos_consulta: ['OTRO_DIAGNOSTICO'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }]
  },
  {
    nombre: 'Luis',
    apellidos: 'Hernández Gómez',
    telefono: '5557890123',
    email: 'luis.hernandez@email.com',
    edad: 60,
    fecha_nacimiento: '1964-02-14',
    genero: 'MASCULINO',
    diagnostico_principal: 'HERNIA_HIATAL',
    estado_paciente: 'activo',
    ciudad: 'Querétaro',
    comentarios_registro: 'Reflujo gastroesofágico severo',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() + 259200000).toISOString(),
      motivos_consulta: ['HERNIA_HIATAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }]
  },
  {
    nombre: 'Sofía',
    apellidos: 'Mendoza Cruz',
    telefono: '5558901234',
    email: 'sofia.mendoza@email.com',
    edad: 28,
    fecha_nacimiento: '1996-06-08',
    genero: 'FEMENINO',
    diagnostico_principal: 'COLECISTITIS_CRONICA',
    estado_paciente: 'activo',
    ciudad: 'León',
    comentarios_registro: 'Colelitiasis sintomática',
    appointments: [{
      fecha_hora_cita: new Date(Date.now() + 432000000).toISOString(),
      motivos_consulta: ['COLECISTITIS_CRONICA'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: false
    }]
  }
]

async function seedData() {
  console.log('🌱 Starting database seed via API...\n')
  
  let successCount = 0
  let errorCount = 0
  
  for (const patientData of patients) {
    try {
      // Extract appointments data
      const { appointments, ...patient } = patientData
      
      // Create patient
      console.log(`Creating patient: ${patient.nombre} ${patient.apellidos}...`)
      
      const patientResponse = await fetch(`${API_BASE}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      })
      
      if (!patientResponse.ok) {
        const error = await patientResponse.text()
        console.error(`  ❌ Failed to create patient: ${error}`)
        errorCount++
        continue
      }
      
      const { patient: createdPatient } = await patientResponse.json()
      console.log(`  ✅ Patient created with ID: ${createdPatient.id}`)
      
      // Create appointments for this patient
      for (const appointment of appointments) {
        const appointmentData = {
          ...appointment,
          patient_id: createdPatient.id
        }
        
        const appointmentResponse = await fetch(`${API_BASE}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData)
        })
        
        if (!appointmentResponse.ok) {
          const error = await appointmentResponse.text()
          console.error(`  ❌ Failed to create appointment: ${error}`)
        } else {
          const appointmentResult = await appointmentResponse.json()
          console.log(`  ✅ Appointment created for ${appointment.fecha_hora_cita.split('T')[0]}`)
        }
      }
      
      successCount++
      
    } catch (error) {
      console.error(`❌ Error processing ${patientData.nombre}:`, error.message)
      errorCount++
    }
  }
  
  console.log(`\n📊 Seed complete: ${successCount} patients created, ${errorCount} errors`)
  
  // Verify the data
  console.log('\n📈 Verifying data...')
  
  const patientsCheck = await fetch(`${API_BASE}/patients?debug=1`)
  const patientsData = await patientsCheck.json()
  
  const appointmentsCheck = await fetch(`${API_BASE}/appointments?dateFilter=all&debug=1`)
  const appointmentsData = await appointmentsCheck.json()
  
  console.log(`   Total patients in DB: ${patientsData.pagination?.totalCount || 0}`)
  console.log(`   Total appointments in DB: ${appointmentsData.pagination?.totalCount || 0}`)
  
  if (patientsData.data && patientsData.data.length > 0) {
    console.log('\n✨ Database seeded successfully! Data is now available.')
  } else {
    console.log('\n⚠️  Warning: Data was created but may not be visible. Check RLS policies.')
  }
}

// Run the seed
seedData().catch(console.error)
