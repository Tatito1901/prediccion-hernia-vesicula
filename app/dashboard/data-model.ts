// Define the data types for our application
export type PatientStatus = "Pendiente de consulta" | "Operado" | "No Operado" | "Seguimiento" | "Cancelado"

export type DiagnosisType = 
  | "Hernia Inguinal" 
  | "Hernia Umbilical" 
  | "Hernia Incisional" 
  | "Vesícula" 
  | "Apendicitis"
  | "Hernia Hiatal"
  | "Lipoma Grande"
  | "Hernia Inguinal Recidivante"
  | "Quiste Sebáceo Infectado"
  | "Eventración Abdominal"
  | "Vesícula (Colecistitis Crónica)"
  | "Otro"

export type InsuranceType = "IMSS" | "ISSSTE" | "Seguro Privado" | "Ninguno" | "Otro"

export type SymptomSeverity = "Leve" | "Moderada" | "Severa" | "Crítica"

export type PatientOrigin = 
  | "Google" 
  | "Facebook" 
  | "Instagram" 
  | "Recomendación" 
  | "Sitio Web" 
  | "Urgencias"
  | "Referido por Gastroenterólogo"
  | "Otro"

export type ImportantFactor =
  | "Seguridad"
  | "Experiencia"
  | "Proceso rápido"
  | "Atención personalizada"
  | "Comodidad de instalaciones"
  | "Recomendaciones positivas"
  | "Tecnología utilizada"
  | "Costos"
  | "Resultado estético"
  | "Necesidad real de cirugía"
  | "Alivio del dolor"
  | "Alivio inmediato"
  | "Alivio de síntomas a largo plazo"
  | "Experiencia del cirujano"
  | "Mínima cicatriz"
  | "Solución definitiva"
  | "Experiencia en recidivas"
  | "Evitar recurrencia"
  | "Mejorar calidad de vida"
  | "Evitar complicaciones"
  | "Eliminar el dolor"
  | "Evitar complicaciones futuras"

export type SurgeryTimeframe = 
  | "Urgente" 
  | "30 días" 
  | "60 días"
  | "90 días" 
  | "30-60 días"
  | "90-120 días"
  | "Sin prisa"

export type Symptom =
  | "Dolor en la zona abdominal"
  | "Bulto o hinchazón visible"
  | "Coloración amarillenta (ictericia)"
  | "Dificultad para moverme"
  | "Náuseas y/o vómitos"
  | "Dolor después de comer"
  | "Sensación de pesadez"
  | "Distensión abdominal"
  | "Dolor que aumenta con esfuerzos"
  | "Fiebre"
  | "Molestia al caminar"
  | "Indigestión"
  | "Molestia al realizar esfuerzos"
  | "Intolerancia a alimentos grasos"
  | "Ninguno (hallazgo incidental)"
  | "Fiebre reciente"
  | "Dolor ocasional"
  | "Dolor abdominal intenso"
  | "Náuseas"
  | "Vómitos ocasionales"
  | "Dolor abdominal severo"
  | "Pérdida de apetito"
  | "Acidez estomacal frecuente"
  | "Regurgitación"
  | "Dolor torácico no cardíaco"
  | "Masa palpable"
  | "Molestia al recostarse"
  | "Preocupación estética"
  | "Bulto en ingle"
  | "Dolor con esfuerzo"
  | "Bulto doloroso y rojo"
  | "Supuración ocasional"
  | "Fiebre leve"
  | "Abultamiento abdominal"
  | "Dolor leve"
  | "Limitación para esfuerzos"
  | "Dolor recurrente en hipocondrio derecho"
  | "Intolerancia a grasas"
  | "Dispepsia"

export type SurgeryConcern =
  | "Miedo al procedimiento"
  | "Tiempo de recuperación"
  | "Ausencia laboral"
  | "Falta de apoyo familiar"
  | "Dudas sobre necesidad real"
  | "Experiencias negativas previas"
  | "Información insuficiente"
  | "Costos"
  | "Complicaciones"
  | "Resultado estético"
  | "Cicatrices"
  | "Riesgo de recurrencia"
  | "Complicaciones postoperatorias"
  | "Efectos secundarios de la cirugía (disfagia)"
  | "Cicatriz"
  | "Dolor postoperatorio"
  | "Nueva recidiva"
  | "Dolor crónico"
  | "Infección persistente"
  | "Recuperación prolongada"
  | "Riesgos por edad"

export type FollowUpStatus = "Programado" | "Completado" | "Cancelado" | "Pendiente"

export interface PatientSurvey {
  nombre: string
  apellidos: string
  edad: number
  telefono: string
  email: string
  direccion?: string
  origen: PatientOrigin
  diagnosticoPrevio: boolean
  detallesDiagnostico?: string
  seguroMedico: InsuranceType
  sintomas: Symptom[]
  duracionSintomas: string // Ejemplo: "2 años", "6 meses"
  severidadCondicion: SymptomSeverity
  estudiosPrecios: boolean
  tratamientosPrevios: boolean
  intensidadDolor: number // 0-10
  afectacionDiaria: SymptomSeverity | "No tengo limitaciones"
  factoresImportantes: ImportantFactor[]
  preocupacionesCirugia: SurgeryConcern[]
  plazoDeseado: SurgeryTimeframe
  informacionAdicional?: string
  submittedAt?: string
}

export interface FollowUp {
  id: number
  patientId: number
  fecha: string
  tipo: "Llamada" | "Email" | "WhatsApp" | "Consulta" | "Otro"
  notas: string
  resultado: "Interesado" | "No interesado" | "Indeciso" | "No contactado" | "Decidido"
  proximoSeguimiento?: string
  estado: FollowUpStatus
  asignadoA: string
}

export interface PatientData {
  id: number
  nombre: string
  apellidos: string
  edad: number
  fechaConsulta: string
  fechaRegistro: string
  diagnostico: DiagnosisType
  estado: PatientStatus
  probabilidadCirugia: number // 0-1
  notaClinica?: string
  encuesta?: PatientSurvey
  recomendacionesSistema?: string[]
  seguimientos?: FollowUp[]
  ultimoContacto?: string
  proximoContacto?: string
  etiquetas?: string[]
  fechaCirugia?: string
  doctorAsignado?: string
}

export interface DoctorData {
  id: number
  nombre: string
  especialidad: string
  pacientesAtendidos: number
  tasaConversion: number // Porcentaje de pacientes que se operan
  foto?: string
}

export interface ClinicMetrics {
  totalPacientes: number
  pacientesNuevosMes: number
  pacientesOperados: number
  pacientesNoOperados: number
  pacientesSeguimiento: number
  tasaConversion: number
  tiempoPromedioDecision: number // días
  fuentePrincipalPacientes: PatientOrigin
  diagnosticosMasComunes: {
    tipo: DiagnosisType
    cantidad: number
  }[]
}
