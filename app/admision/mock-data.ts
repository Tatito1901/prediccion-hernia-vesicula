import type { AppointmentData } from "@/src/lib/context/app-context";

// Función para generar fechas en el pasado o futuro (relativas al día actual de ejecución)
const getDate = (daysFromNow: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
};

// --- INICIO: Funciones y datos para generación aleatoria ---

// Listas de datos para generar pacientes aleatorios
const nombresBase = ["Juan", "Pedro", "Luis", "Ana", "Sofía", "Lucía", "Elena", "Diego", "Carlos", "Miguel", "Valeria", "Fernando", "Beatriz", "Ricardo", "Mónica"];
const apellidosBase = ["García", "Rodríguez", "Martínez", "Hernández", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores", "Rivera", "Gómez", "Díaz", "Vázquez"];
const motivosConsultaBase = ["Revisión General", "Dolor Agudo Cardiovascular", "Seguimiento Arritmia", "Consulta Hipertensión", "Resultados de Ecocardiograma", "Evaluación Preoperatoria", "Insuficiencia Cardíaca Crónica"];
const horasConsultaBase = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"];
const estadosBase = ["completada", "cancelada", "pendiente", "presente"] as AppointmentData['estado'][];

/**
 * Genera una fecha aleatoria dentro del rango Enero 2025 - Mayo 20, 2025.
 * @returns {Date} Una fecha aleatoria.
 */
const generarFechaAleatoriaEnRango2025 = (): Date => {
  const fechaInicio = new Date(2025, 0, 1).getTime(); // 1 de Enero de 2025 (mes es 0-indexado)
  const fechaFin = new Date(2025, 4, 20).getTime();   // 20 de Mayo de 2025
  const tiempoAleatorio = fechaInicio + Math.random() * (fechaFin - fechaInicio);
  const fechaGenerada = new Date(tiempoAleatorio);
  // Aseguramos que la hora no sea problemática para la lógica de estado
  fechaGenerada.setHours(Math.floor(Math.random() * 8) + 9, Math.random() < 0.5 ? 0 : 30, 0, 0); // Horas entre 9:00 y 16:30
  return fechaGenerada;
};

// Generar pacientes aleatorios
const generarPacientesAleatorios = (cantidad: number, idInicial: number): AppointmentData[] => {
  const pacientesGenerados: AppointmentData[] = [];
  let proximoId = idInicial;
  const hoyFijo = new Date(2025, 4, 20); // Asumimos hoy es 20 de Mayo de 2025 para la lógica de estado
  hoyFijo.setHours(0, 0, 0, 0);

  for (let i = 0; i < cantidad; i++) {
    const nombreAleatorio = nombresBase[Math.floor(Math.random() * nombresBase.length)];
    const apellido1Aleatorio = apellidosBase[Math.floor(Math.random() * apellidosBase.length)];
    const apellido2Aleatorio = apellidosBase[Math.floor(Math.random() * apellidosBase.length)];
    const fechaConsultaAleatoria = generarFechaAleatoriaEnRango2025();
    
    let estadoAleatorio = estadosBase[Math.floor(Math.random() * estadosBase.length)];

    // Ajustar estado basado en la fecha de consulta en relación al 20 de Mayo de 2025
    const fechaConsultaSinHora = new Date(fechaConsultaAleatoria);
    fechaConsultaSinHora.setHours(0, 0, 0, 0);

    if (fechaConsultaSinHora.getTime() < hoyFijo.getTime()) { // Fecha pasada
      if (estadoAleatorio === "pendiente" || estadoAleatorio === "presente") {
        estadoAleatorio = Math.random() < 0.85 ? "completada" : "cancelada"; // Más probable completada
      }
    } else if (fechaConsultaSinHora.getTime() === hoyFijo.getTime()) { // Hoy (20 de Mayo de 2025)
      // Permitir pendiente, presente, o incluso completada/cancelada si ya ocurrió en el día
      const r = Math.random();
      if (estadoAleatorio === "completada" && fechaConsultaAleatoria.getHours() > new Date().getHours()) { // Si es completada pero la hora es futura hoy
          estadoAleatorio = "pendiente"; // Cambiar a pendiente
      } else if (r < 0.35) estadoAleatorio = "pendiente";
      else if (r < 0.70) estadoAleatorio = "presente";
      // else, se mantiene el estado aleatorio (podría ser completada o cancelada si la hora ya pasó)
    }
    // No hay fechas futuras más allá del 20 de Mayo de 2025 en esta generación

    pacientesGenerados.push({
      id: proximoId,
      patientId: proximoId, // Simpleza para datos mock
      nombre: nombreAleatorio,
      apellidos: `${apellido1Aleatorio} ${apellido2Aleatorio}`,
      telefono: `555${String(Math.floor(Math.random() * 9000000) + 1000000)}`, // Teléfono aleatorio
      motivoConsulta: motivosConsultaBase[Math.floor(Math.random() * motivosConsultaBase.length)],
      fechaConsulta: fechaConsultaAleatoria,
      horaConsulta: horasConsultaBase[Math.floor(Math.random() * horasConsultaBase.length)],
      estado: estadoAleatorio,
      notas: `Notas para el paciente ${proximoId}. Consulta sobre ${motivosConsultaBase[Math.floor(Math.random() * motivosConsultaBase.length)]}. Estado: ${estadoAleatorio}.`,
    });
    proximoId++;
  }
  return pacientesGenerados;
};

// --- FIN: Funciones y datos para generación aleatoria ---

// Datos mock para las citas originales
const citasOriginales: AppointmentData[] = [
  // Citas completadas
  {
    id: 1,
    patientId: 1,
    nombre: "María",
    apellidos: "González López",
    telefono: "5551234567",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-10),
    horaConsulta: "10:00",
    estado: "completada",
    notas: "Paciente con dolor abdominal intenso. Se recomendó cirugía.",
  },
  {
    id: 2,
    patientId: 2,
    nombre: "Carlos",
    apellidos: "Ramírez Soto",
    telefono: "5559876543",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(-8),
    horaConsulta: "12:30",
    estado: "completada",
    notas: "Hernia de tamaño moderado. Candidato a cirugía.",
  },
  {
    id: 3,
    patientId: 3,
    nombre: "Ana",
    apellidos: "Martínez Ruiz",
    telefono: "5552345678",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(-7),
    horaConsulta: "09:15",
    estado: "completada",
    notas: "Hernia pequeña. Se programó cirugía para el próximo mes.",
  },
  {
    id: 4,
    patientId: 4,
    nombre: "Roberto",
    apellidos: "Díaz Flores",
    telefono: "5558765432",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-5),
    horaConsulta: "16:00",
    estado: "completada",
    notas: "Paciente con cólicos biliares recurrentes.",
  },
  {
    id: 5,
    patientId: 5,
    nombre: "Laura",
    apellidos: "Sánchez Vega",
    telefono: "5553456789",
    motivoConsulta: "Hernia Incisional",
    fechaConsulta: getDate(-3),
    horaConsulta: "11:30",
    estado: "completada",
    notas: "Hernia en cicatriz de cesárea. Se recomendó cirugía.",
  },

  // Citas canceladas
  {
    id: 6,
    patientId: 6,
    nombre: "Javier",
    apellidos: "López Torres",
    telefono: "5557654321",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(-9),
    horaConsulta: "14:00",
    estado: "cancelada",
    notas: "Paciente canceló por motivos personales.",
  },
  {
    id: 7,
    patientId: 7,
    nombre: "Sofía",
    apellidos: "García Mendoza",
    telefono: "5554567890",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-6),
    horaConsulta: "10:45",
    estado: "cancelada",
    notas: "Paciente reprogramará para la próxima semana.",
  },
  {
    id: 8,
    patientId: 8,
    nombre: "Miguel",
    apellidos: "Hernández Castro",
    telefono: "5556789012",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(-4),
    horaConsulta: "13:15",
    estado: "cancelada",
    notas: "Cancelada por el médico. Se reprogramará.",
  },

  // Citas pendientes
  {
    id: 9,
    patientId: 9,
    nombre: "Patricia",
    apellidos: "Flores Ramos",
    telefono: "5555678901",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(1),
    horaConsulta: "09:30",
    estado: "pendiente",
    notas: "Primera consulta.",
  },
  {
    id: 10,
    patientId: 10,
    nombre: "Daniel",
    apellidos: "Torres Medina",
    telefono: "5558901234",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(2),
    horaConsulta: "11:00",
    estado: "pendiente",
    notas: "Paciente con antecedentes de cólicos biliares.",
  },
  {
    id: 11,
    patientId: 11,
    nombre: "Gabriela",
    apellidos: "Ramírez Ortiz",
    telefono: "5550123456",
    motivoConsulta: "Hernia Incisional",
    fechaConsulta: getDate(3),
    horaConsulta: "15:30",
    estado: "pendiente",
    notas: "Hernia post-operatoria.",
  },
  {
    id: 12,
    patientId: 12,
    nombre: "Fernando",
    apellidos: "Gómez Vargas",
    telefono: "5559012345",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(4),
    horaConsulta: "12:00",
    estado: "pendiente",
    notas: "Paciente referido por médico general.",
  },
  {
    id: 13,
    patientId: 13,
    nombre: "Alejandra",
    apellidos: "Vázquez Luna",
    telefono: "5551234567",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(5),
    horaConsulta: "10:15",
    estado: "pendiente",
    notas: "Paciente con dolor abdominal crónico.",
  },

  // Citas con pacientes presentes
  {
    id: 14,
    patientId: 14,
    nombre: "Ricardo",
    apellidos: "Mendoza Soto",
    telefono: "5552345678",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(0), // Hoy
    horaConsulta: "09:00",
    estado: "presente",
    notas: "Paciente en sala de espera.",
  },
  {
    id: 15,
    patientId: 15,
    nombre: "Carmen",
    apellidos: "Ortiz Juárez",
    telefono: "5553456789",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(0), // Hoy
    horaConsulta: "10:30",
    estado: "presente",
    notas: "Paciente con estudios previos.",
  },

  // Más citas para tener una buena distribución por día de la semana
  {
    id: 16,
    patientId: 16,
    nombre: "José",
    apellidos: "Luna Pérez",
    telefono: "5554567890",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(-14), 
    horaConsulta: "11:45",
    estado: "completada",
    notas: "Paciente con hernia pequeña. Se programó cirugía.",
  },
  {
    id: 17,
    patientId: 17,
    nombre: "Mariana",
    apellidos: "Soto Mendoza",
    telefono: "5555678901",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(-13),
    horaConsulta: "14:30",
    estado: "completada",
    notas: "Hernia bilateral. Candidata a cirugía.",
  },
  {
    id: 18,
    patientId: 18,
    nombre: "Eduardo",
    apellidos: "Juárez Vega",
    telefono: "5556789012",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-12),
    horaConsulta: "16:15",
    estado: "cancelada",
    notas: "Paciente no pudo asistir por enfermedad.",
  },
  {
    id: 19,
    patientId: 19,
    nombre: "Verónica",
    apellidos: "Pérez Castro",
    telefono: "5557890123",
    motivoConsulta: "Hernia Incisional",
    fechaConsulta: getDate(-11),
    horaConsulta: "09:45",
    estado: "completada",
    notas: "Hernia recurrente. Se recomendó cirugía con malla.",
  },
  {
    id: 20,
    patientId: 20,
    nombre: "Héctor",
    apellidos: "Medina Flores",
    telefono: "5558901234",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(-7), 
    horaConsulta: "13:00",
    estado: "completada",
    notas: "Hernia de tamaño moderado. Se programó cirugía.",
  },

  // Citas adicionales para tener una buena distribución por motivo
  {
    id: 21,
    patientId: 21,
    nombre: "Adriana",
    apellidos: "Vargas Ramírez",
    telefono: "5559012345",
    motivoConsulta: "Otro",
    fechaConsulta: getDate(-15),
    horaConsulta: "10:00",
    estado: "completada",
    notas: "Consulta por dolor abdominal. Se descartó patología quirúrgica.",
  },
  {
    id: 22,
    patientId: 22,
    nombre: "Raúl",
    apellidos: "Castro Ortiz",
    telefono: "5550123456",
    motivoConsulta: "Otro",
    fechaConsulta: getDate(-2),
    horaConsulta: "15:00",
    estado: "completada",
    notas: "Segunda opinión para cirugía de colon.",
  },
  {
    id: 23,
    patientId: 23,
    nombre: "Silvia",
    apellidos: "Ramos Torres",
    telefono: "5551234567",
    motivoConsulta: "Otro",
    fechaConsulta: getDate(6),
    horaConsulta: "11:30",
    estado: "pendiente",
    notas: "Consulta por dolor en fosa ilíaca derecha.",
  },
  {
    id: 24,
    patientId: 24,
    nombre: "Arturo",
    apellidos: "Vega López",
    telefono: "5552345678",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(7),
    horaConsulta: "14:00",
    estado: "pendiente",
    notas: "Paciente con hernia bilateral.",
  },
  {
    id: 25,
    patientId: 25,
    nombre: "Lucía",
    apellidos: "Mendoza García",
    telefono: "5553456789",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(8),
    horaConsulta: "09:30",
    estado: "pendiente",
    notas: "Paciente con colelitiasis diagnosticada por ultrasonido.",
  },

  // Citas para completar la distribución por día de la semana
  {
    id: 26,
    patientId: 26,
    nombre: "Gustavo",
    apellidos: "Torres Sánchez",
    telefono: "5554567890",
    motivoConsulta: "Hernia Umbilical",
    fechaConsulta: getDate(-21), 
    horaConsulta: "12:15",
    estado: "completada",
    notas: "Hernia pequeña. Se recomendó vigilancia.",
  },
  {
    id: 27,
    patientId: 27,
    nombre: "Mónica",
    apellidos: "López Ramírez",
    telefono: "5555678901",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-20),
    horaConsulta: "16:30",
    estado: "cancelada",
    notas: "Paciente canceló y reprogramó.",
  },
  {
    id: 28,
    patientId: 28,
    nombre: "Sergio",
    apellidos: "García Flores",
    telefono: "5556789012",
    motivoConsulta: "Hernia Inguinal",
    fechaConsulta: getDate(-19),
    horaConsulta: "10:45",
    estado: "completada",
    notas: "Hernia de tamaño considerable. Se programó cirugía.",
  },
  {
    id: 29,
    patientId: 29,
    nombre: "Diana",
    apellidos: "Martínez Vega",
    telefono: "5557890123",
    motivoConsulta: "Hernia Incisional",
    fechaConsulta: getDate(-18),
    horaConsulta: "13:30",
    estado: "completada",
    notas: "Hernia en cicatriz de apendicectomía. Se programó cirugía.",
  },
  {
    id: 30,
    patientId: 30,
    nombre: "Pablo",
    apellidos: "Sánchez Ortiz",
    telefono: "5558901234",
    motivoConsulta: "Vesícula",
    fechaConsulta: getDate(-17),
    horaConsulta: "15:15",
    estado: "cancelada",
    notas: "Cancelada por el médico. Se reprogramó.",
  },
];

// Generar 20 nuevos pacientes aleatorios con IDs a partir de 31
const nuevosPacientesAleatorios = generarPacientesAleatorios(25, 31); // Generamos 25 nuevos pacientes

// Combinar citas originales con las nuevas citas generadas aleatoriamente
export const mockAppointments: AppointmentData[] = [
  ...citasOriginales,
  ...nuevosPacientesAleatorios,
];


// Función para obtener citas pendientes (futuras)
// Esta función ahora considerará el día actual real de ejecución para definir "futuras"
export const getPendingAppointments = (): AppointmentData[] => {
  const hoy = new Date();
  hoy.setHours(0,0,0,0); // Comparamos solo la fecha, no la hora
  return mockAppointments.filter(
    (appointment) => {
        const fechaCita = new Date(appointment.fechaConsulta);
        fechaCita.setHours(0,0,0,0);
        // Pendiente si la fecha es futura o si es hoy y el estado es 'pendiente'
        return fechaCita > hoy || (fechaCita.getTime() === hoy.getTime() && appointment.estado === "pendiente");
    }
  );
};

// Función para obtener citas de hoy
// Esta función usa el día actual real de ejecución
export const getTodayAppointments = (): AppointmentData[] => {
  const today = new Date();
  return mockAppointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.fechaConsulta);
    return (
      appointmentDate.getDate() === today.getDate() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getFullYear() === today.getFullYear()
    );
  });
};

// Función para obtener estadísticas generales
export const getAppointmentStats = () => {
  const total = mockAppointments.length;
  const completed = mockAppointments.filter((a) => a.estado === "completada").length;
  const cancelled = mockAppointments.filter((a) => a.estado === "cancelada").length;
  // Ajustamos cómo se cuentan las pendientes para ser consistentes con getPendingAppointments
  const pending = getPendingAppointments().length; 
  const present = mockAppointments.filter((a) => a.estado === "presente").length;

  // Evitar división por cero si no hay citas que puedan ser completadas o canceladas
  const relevantTotalForRates = total - pending - present; // O una lógica más adecuada a tu definición

  return {
    total,
    completed,
    cancelled,
    pending,
    present,
    // Las tasas de asistencia y cancelación podrían necesitar una definición más precisa
    // Por ejemplo, ¿se calculan sobre el total de citas programadas (excluyendo quizás las futuras pendientes)?
    attendanceRate: relevantTotalForRates > 0 ? (completed / relevantTotalForRates) * 100 : 0,
    cancellationRate: relevantTotalForRates > 0 ? (cancelled / relevantTotalForRates) * 100 : 0,
  };
};

// Ejemplo de uso para depuración:
// console.log("Nuevos pacientes generados:", nuevosPacientesAleatorios);
// console.log("Total de citas mock:", mockAppointments.length);
// console.log("Citas de Hoy:", getTodayAppointments());
// console.log("Citas Pendientes:", getPendingAppointments());
// console.log("Estadísticas:", getAppointmentStats());
