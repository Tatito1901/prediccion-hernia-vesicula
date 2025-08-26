const API_URL = 'http://localhost:3000/api';

async function addMoreAppointments() {
  console.log('📅 Adding more appointments to existing patients...\n');

  // IDs de pacientes existentes obtenidos de la última ejecución
  const appointments = [
    {
      patient_id: '76720d14-a961-421f-867c-19023778bef8', // Juan
      fecha_hora_cita: new Date(Date.now() + 86400000).toISOString(), // Mañana
      motivos_consulta: ['HERNIA_UMBILICAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: false
    },
    {
      patient_id: '69b7cd97-4f99-4604-b4dc-0477c8121954', // Carlos  
      fecha_hora_cita: new Date(Date.now() + 172800000).toISOString(), // En 2 días
      motivos_consulta: ['HERNIA_INGUINAL'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: false
    },
    {
      patient_id: 'd9c98d07-4118-4eea-99d5-b4ae773b6eaf', // Ana
      fecha_hora_cita: new Date(Date.now() + 259200000).toISOString(), // En 3 días
      motivos_consulta: ['OTRO_DIAGNOSTICO'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: false
    },
    {
      patient_id: 'e47b0150-e059-411d-89b4-f13e3c4fdda7', // Luis
      fecha_hora_cita: new Date(Date.now() + 345600000).toISOString(), // En 4 días
      motivos_consulta: ['OTRO_DIAGNOSTICO'],
      estado_cita: 'PROGRAMADA',
      es_primera_vez: true
    }
  ];

  let created = 0;
  let errors = 0;

  for (const appointment of appointments) {
    try {
      const response = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment)
      });

      const responseText = await response.text();
      
      if (response.ok) {
        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = responseText;
        }
        console.log(`✅ Appointment created for patient ${appointment.patient_id}`);
        console.log(`   Response: ${JSON.stringify(data).substring(0, 100)}`);
        created++;
      } else {
        console.log(`❌ Failed to create appointment (${response.status}): ${responseText}`);
        errors++;
      }
    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Results: ${created} appointments created, ${errors} errors`);

  // Verify total appointments with different date filters
  try {
    // Check all appointments
    const allResponse = await fetch(`${API_URL}/appointments?dateFilter=all`);
    const allData = await allResponse.json();
    
    // Check appointments for next 30 days
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const rangeResponse = await fetch(`${API_URL}/appointments?startDate=${new Date().toISOString()}&endDate=${futureDate}`);
    const rangeData = await rangeResponse.json();
    
    console.log(`\n📈 Appointments with dateFilter=all: ${allData.pagination?.totalCount || 0}`);
    console.log(`📈 Appointments in next 30 days: ${rangeData.pagination?.totalCount || 0}`);
    
    // Show all appointment dates
    if (rangeData.data && rangeData.data.length > 0) {
      console.log('\n📅 Appointment dates:');
      rangeData.data.forEach(apt => {
        const date = new Date(apt.fecha_hora_cita);
        console.log(`  - ${apt.patients?.nombre || 'Unknown'}: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
      });
    }
  } catch (err) {
    console.log(`❌ Error verifying: ${err.message}`);
  }
}

addMoreAppointments().catch(console.error);
