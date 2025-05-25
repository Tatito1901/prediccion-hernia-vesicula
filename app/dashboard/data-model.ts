// Utility types para mayor robustez
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = number;
export type ISODateString = string;
export type TimeString = `${number}:${number}`;
export type PhoneString = string;
export type EmailString = string;

// Enums para mayor type safety
export enum PatientStatusEnum {
  PENDING_CONSULTATION = "Pendiente de consulta",
  OPERATED = "Operado", 
  NOT_OPERATED = "No Operado",
  FOLLOW_UP = "Seguimiento",
  CANCELLED = "Cancelado",
  IN_CONSULTATION = "En consulta"
}

export enum DiagnosisTypeEnum {
  INGUINAL_HERNIA = "Hernia Inguinal",
  UMBILICAL_HERNIA = "Hernia Umbilical",
  INCISIONAL_HERNIA = "Hernia Incisional",
  GALLBLADDER = "Vesícula",
  APPENDICITIS = "Apendicitis",
  HIATAL_HERNIA = "Hernia Hiatal",
  LARGE_LIPOMA = "Lipoma Grande",
  RECURRENT_INGUINAL_HERNIA = "Hernia Inguinal Recidivante",
  INFECTED_SEBACEOUS_CYST = "Quiste Sebáceo Infectado",
  ABDOMINAL_EVENTRATION = "Eventración Abdominal",
  CHRONIC_CHOLECYSTITIS = "Vesícula (Colecistitis Crónica)",
  OTHER = "Otro"
}

export enum InsuranceTypeEnum {
  IMSS = "IMSS",
  ISSSTE = "ISSSTE",
  PRIVATE = "Seguro Privado",
  NONE = "Ninguno",
  OTHER = "Otro"
}

export enum SymptomSeverityEnum {
  MILD = "Leve",
  MODERATE = "Moderada",
  SEVERE = "Severa",
  CRITICAL = "Crítica",
  NONE = "No tengo limitaciones"
}

export enum PatientOriginEnum {
  GOOGLE = "Google",
  FACEBOOK = "Facebook",
  INSTAGRAM = "Instagram",
  RECOMMENDATION = "Recomendación",
  WEBSITE = "Sitio Web",
  EMERGENCY = "Urgencias",
  GASTRO_REFERRAL = "Referido por Gastroenterólogo",
  OTHER = "Otro"
}

export enum SurgeryTimeframeEnum {
  URGENT = "Urgente",
  DAYS_30 = "30 días",
  DAYS_60 = "60 días",
  DAYS_90 = "90 días",
  DAYS_30_60 = "30-60 días",
  DAYS_90_120 = "90-120 días",
  NO_RUSH = "Sin prisa"
}

export enum FollowUpStatusEnum {
  SCHEDULED = "Programado",
  COMPLETED = "Completado",
  CANCELLED = "Cancelado",
  PENDING = "Pendiente"
}

export enum AppointmentStatusEnum {
  PENDING = "pendiente",
  COMPLETED = "completada",
  CANCELLED = "cancelada",
  PRESENT = "presente",
  REAGENDADA = "reagendada",
  NO_ASISTIO = "noAsistio"
}

// Type aliases for better readability
export type PatientStatus = `${PatientStatusEnum}`;
export type DiagnosisType = `${DiagnosisTypeEnum}`;
export type InsuranceType = `${InsuranceTypeEnum}`;
export type SymptomSeverity = `${SymptomSeverityEnum}`;
export type PatientOrigin = `${PatientOriginEnum}`;
export type SurgeryTimeframe = `${SurgeryTimeframeEnum}`;
export type FollowUpStatus = `${FollowUpStatusEnum}`;
export type AppointmentStatus = `${AppointmentStatusEnum}`;

// Constants for validation
export const PAIN_SCALE = {
  MIN: 0,
  MAX: 10
} as const;

export const PROBABILITY_SCALE = {
  MIN: 0,
  MAX: 1
} as const;

// Important factors with categorization
export const IMPORTANT_FACTORS = {
  SAFETY: "Seguridad",
  EXPERIENCE: "Experiencia",
  QUICK_PROCESS: "Proceso rápido",
  PERSONALIZED_CARE: "Atención personalizada",
  FACILITY_COMFORT: "Comodidad de instalaciones",
  POSITIVE_REVIEWS: "Recomendaciones positivas",
  TECHNOLOGY: "Tecnología utilizada",
  COSTS: "Costos",
  AESTHETIC_RESULT: "Resultado estético",
  SURGERY_NECESSITY: "Necesidad real de cirugía",
  PAIN_RELIEF: "Alivio del dolor",
  IMMEDIATE_RELIEF: "Alivio inmediato",
  LONG_TERM_RELIEF: "Alivio de síntomas a largo plazo",
  SURGEON_EXPERIENCE: "Experiencia del cirujano",
  MINIMAL_SCAR: "Mínima cicatriz",
  DEFINITIVE_SOLUTION: "Solución definitiva",
  RECURRENCE_EXPERIENCE: "Experiencia en recidivas",
  AVOID_RECURRENCE: "Evitar recurrencia",
  QUALITY_OF_LIFE: "Mejorar calidad de vida",
  AVOID_COMPLICATIONS: "Evitar complicaciones",
  ELIMINATE_PAIN: "Eliminar el dolor",
  PREVENT_FUTURE_COMPLICATIONS: "Evitar complicaciones futuras"
} as const;

export type ImportantFactor = typeof IMPORTANT_FACTORS[keyof typeof IMPORTANT_FACTORS];

// Symptoms organized by category
export const SYMPTOMS = {
  PAIN: [
    "Dolor en la zona abdominal",
    "Dolor después de comer",
    "Dolor que aumenta con esfuerzos",
    "Dolor ocasional",
    "Dolor abdominal intenso",
    "Dolor torácico no cardíaco",
    "Dolor con esfuerzo",
    "Dolor abdominal severo",
    "Dolor recurrente en hipocondrio derecho",
    "Dolor leve"
  ],
  PHYSICAL_SIGNS: [
    "Bulto o hinchazón visible",
    "Coloración amarillenta (ictericia)",
    "Distensión abdominal",
    "Masa palpable",
    "Bulto en ingle",
    "Bulto doloroso y rojo",
    "Abultamiento abdominal"
  ],
  DIGESTIVE: [
    "Náuseas y/o vómitos",
    "Sensación de pesadez",
    "Indigestión",
    "Intolerancia a alimentos grasos",
    "Náuseas",
    "Vómitos ocasionales",
    "Pérdida de apetito",
    "Acidez estomacal frecuente",
    "Regurgitación",
    "Intolerancia a grasas",
    "Dispepsia"
  ],
  MOBILITY: [
    "Dificultad para moverme",
    "Molestia al caminar",
    "Molestia al realizar esfuerzos",
    "Molestia al recostarse",
    "Limitación para esfuerzos"
  ],
  OTHER: [
    "Fiebre",
    "Ninguno (hallazgo incidental)",
    "Fiebre reciente",
    "Preocupación estética",
    "Supuración ocasional",
    "Fiebre leve"
  ]
} as const;

export type Symptom = typeof SYMPTOMS[keyof typeof SYMPTOMS][number];

// Surgery concerns organized by category
export const SURGERY_CONCERNS = {
  PROCEDURE: [
    "Miedo al procedimiento",
    "Dudas sobre necesidad real",
    "Información insuficiente"
  ],
  RECOVERY: [
    "Tiempo de recuperación",
    "Ausencia laboral",
    "Dolor postoperatorio",
    "Recuperación prolongada"
  ],
  SUPPORT: [
    "Falta de apoyo familiar",
    "Experiencias negativas previas"
  ],
  FINANCIAL: [
    "Costos"
  ],
  COMPLICATIONS: [
    "Complicaciones",
    "Riesgo de recurrencia",
    "Complicaciones postoperatorias",
    "Efectos secundarios de la cirugía (disfagia)",
    "Nueva recidiva",
    "Dolor crónico",
    "Infección persistente",
    "Riesgos por edad"
  ],
  AESTHETIC: [
    "Resultado estético",
    "Cicatrices",
    "Cicatriz"
  ]
} as const;

export type SurgeryConcern = typeof SURGERY_CONCERNS[keyof typeof SURGERY_CONCERNS][number];

// Interfaces with strict typing
export interface PatientSurvey {
  readonly id?: ID;
  nombre: string;
  apellidos: string;
  edad: number;
  telefono: PhoneString;
  email: EmailString;
  direccion?: string;
  origen: PatientOrigin;
  diagnosticoPrevio: boolean;
  detallesDiagnostico?: string;
  seguroMedico: InsuranceType;
  sintomas: ReadonlyArray<Symptom>;
  duracionSintomas: string;
  severidadCondicion: SymptomSeverity;
  estudiosPrecios: boolean;
  tratamientosPrevios: boolean;
  intensidadDolor: number;
  afectacionDiaria: SymptomSeverity;
  factoresImportantes: ReadonlyArray<ImportantFactor>;
  preocupacionesCirugia: ReadonlyArray<SurgeryConcern>;
  plazoDeseado: SurgeryTimeframe;
  informacionAdicional?: string;
  submittedAt?: ISODateString;
}

export interface FollowUp {
  readonly id: ID;
  readonly patientId: ID;
  fecha: ISODateString;
  tipo: "Llamada" | "Email" | "WhatsApp" | "Consulta" | "Otro";
  notas: string;
  resultado: "Interesado" | "No interesado" | "Indeciso" | "No contactado" | "Decidido";
  proximoSeguimiento?: ISODateString;
  estado: FollowUpStatus;
  asignadoA: string;
  readonly createdAt?: ISODateString;
  readonly updatedAt?: ISODateString;
}

export interface AppointmentData {
  readonly id: ID;
  patientId?: ID;
  fecha: ISODateString;
  hora: TimeString;
  paciente: string;
  telefono?: PhoneString;
  motivoConsulta?: string;
  doctor: string;
  estado: AppointmentStatus;
  notas?: string;
  readonly createdAt?: ISODateString;
  readonly updatedAt?: ISODateString;
}

export interface PatientData {
  readonly id: ID;
  nombre: string;
  apellidos: string;
  edad: number;
  fechaConsulta: ISODateString;
  fechaRegistro: ISODateString;
  diagnostico: DiagnosisType;
  estado: PatientStatus;
  probabilidadCirugia: number;
  telefono?: PhoneString;
  notaClinica?: string;
  encuesta?: PatientSurvey;
  recomendacionesSistema?: ReadonlyArray<string>;
  seguimientos?: ReadonlyArray<FollowUp>;
  citas?: ReadonlyArray<AppointmentData>;
  ultimoContacto?: ISODateString;
  proximoContacto?: ISODateString;
  etiquetas?: ReadonlyArray<string>;
  fechaCirugia?: ISODateString;
  doctorAsignado?: string;
  readonly timestampRegistro?: number;
  readonly createdAt?: ISODateString;
  readonly updatedAt?: ISODateString;
}

export interface DoctorData {
  readonly id: ID;
  nombre: string;
  especialidad: string;
  pacientesAtendidos: number;
  tasaConversion: number;
  foto?: string;
  readonly createdAt?: ISODateString;
  readonly updatedAt?: ISODateString;
}

export interface DiagnosticMetric {
  tipo: DiagnosisType;
  cantidad: number;
  porcentaje: number;
}

export interface ClinicMetrics {
  totalPacientes: number;
  pacientesNuevosMes: number;
  pacientesOperados: number;
  pacientesNoOperados: number;
  pacientesSeguimiento: number;
  tasaConversion: number;
  tiempoPromedioDecision: number;
  fuentePrincipalPacientes: PatientOrigin;
  diagnosticosMasComunes: ReadonlyArray<DiagnosticMetric>;
  readonly lastUpdated?: ISODateString;
}

// Type guards
export const isValidPainScale = (value: number): boolean => {
  return value >= PAIN_SCALE.MIN && value <= PAIN_SCALE.MAX;
};

export const isValidProbability = (value: number): boolean => {
  return value >= PROBABILITY_SCALE.MIN && value <= PROBABILITY_SCALE.MAX;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Utility functions for type conversion
export const toPatientStatus = (value: string): PatientStatus | null => {
  return (Object.values(PatientStatusEnum) as string[]).includes(value) 
    ? value as PatientStatus 
    : null;
};

export const toDiagnosisType = (value: string): DiagnosisType | null => {
  return (Object.values(DiagnosisTypeEnum) as string[]).includes(value) 
    ? value as DiagnosisType 
    : null;
};