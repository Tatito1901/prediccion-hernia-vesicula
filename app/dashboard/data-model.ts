// app/dashboard/data-model.ts
import * as z from "zod";

// --- Tipos Utilitarios Base ---
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type ID = string; // Para UUIDs de Supabase
export type ISODateTimeString = string; // Formato YYYY-MM-DDTHH:mm:ss.sssZ
export type DateString = string; // Formato YYYY-MM-DD
export type TimeString = `${number}:${number}`; // Formato HH:MM
export type PhoneString = string;
export type EmailString = string;

// --- ENUMS Alineados con los de Supabase (los valores string deben coincidir) ---
export enum PatientStatusEnum {
  PENDIENTE_DE_CONSULTA = "PENDIENTE DE CONSULTA",
  CONSULTADO = "CONSULTADO",
  EN_SEGUIMIENTO = "EN SEGUIMIENTO",
  OPERADO = "OPERADO",
  NO_OPERADO = "NO OPERADO",
  INDECISO = "INDECISO",
}
export type PatientStatus = `${PatientStatusEnum}`;

export enum DiagnosisEnum {
  // Diagnósticos de hernias (organizados alfabéticamente)
  EVENTRACION_ABDOMINAL = "EVENTRACION ABDOMINAL",
  HERNIA_HIATAL = "HERNIA HIATAL",
  HERNIA_INGUINAL = "HERNIA INGUINAL",
  HERNIA_INGUINAL_BILATERAL = "HERNIA INGUINAL BILATERAL",
  HERNIA_INGUINAL_RECIDIVANTE = "HERNIA INGUINAL RECIDIVANTE",
  HERNIA_INCISIONAL = "HERNIA INCISIONAL",
  HERNIA_SPIGEL = "HERNIA DE SPIGEL",
  HERNIA_UMBILICAL = "HERNIA UMBILICAL",
  HERNIA_VENTRAL = "HERNIA VENTRAL",
  
  // Diagnósticos de vesícula (organizados alfabéticamente)
  COLANGITIS = "COLANGITIS", // Infección de conductos biliares
  COLECISTITIS = "COLECISTITIS / COLECISTITIS CRONICA", // Inflamación de la vesícula
  COLEDOCOLITIASIS = "COLEDOCOLITIASIS", // Cálculos en el colédoco
  COLELITIASIS = "COLELITIASIS", // Cálculos en la vesícula
  
  // Otros diagnósticos (organizados alfabéticamente)
  APENDICITIS = "APENDICITIS",
  LIPOMA_GRANDE = "LIPOMA GRANDE",
  QUISTE_SEBACEO_INFECTADO = "QUISTE SEBACEO INFECTADO",
  
  // Misceláneos
  OTRO = "OTRO"
}
export type DiagnosisType = `${DiagnosisEnum}`;

export enum AppointmentStatusEnum {
  PROGRAMADA = "PROGRAMADA",
  CONFIRMADA = "CONFIRMADA",
  CANCELADA = "CANCELADA",
  COMPLETADA = "COMPLETADA",
  NO_ASISTIO = "NO ASISTIO",
  PRESENTE = "PRESENTE",
  REAGENDADA = "REAGENDADA"
}
export type AppointmentStatus = `${AppointmentStatusEnum}`;

// --- ENUMS Específicos de la Encuesta (como los tenías) ---
export enum InsuranceTypeEnum {
  IMSS = "IMSS",
  ISSSTE = "ISSSTE",
  PRIVATE = "Seguro Privado", // "privado" en tu form
  NONE = "Ninguno", // "ninguno" en tu form
  OTHER = "Otro Seguro" // "otro_seguro" en tu form
}
export type InsuranceType = `${InsuranceTypeEnum}`;

export enum SymptomSeverityEnum {
  LEVE = "Leve", // "leve" en tu form
  MODERADA = "Moderada", // "moderada" en tu form
  SEVERA = "Severa", // "severa" en tu form
  CRITICA = "Crítica", // No presente en tu form, pero es un estado válido
  NINGUNA = "No tengo limitaciones", // "ninguna" en tu form
  UN_POCO = "Un poco", // Para afectacionActividadesDiarias
  MODERADAMENTE = "Moderadamente", // Para afectacionActividadesDiarias
  MUCHO = "Mucho" // Para afectacionActividadesDiarias
}
export type SymptomSeverity = `${SymptomSeverityEnum}`;

export enum PatientOriginEnum {
  GOOGLE = "Google", // "pagina_web_google" en tu form
  FACEBOOK = "Facebook", // "redes_sociales" podría incluir esto
  INSTAGRAM = "Instagram", // "redes_sociales" podría incluir esto
  RECOMENDACION_MEDICO = "Recomendación de Médico", // "recomendacion_medico" en tu form
  RECOMENDACION_FAMILIAR_AMIGO = "Recomendación Familiar/Amigo", // "recomendacion_familiar_amigo" en tu form
  SEGURO_MEDICO = "Seguro Médico", // "seguro_medico" en tu form
  WEBSITE = "Sitio Web", // "pagina_web_google" podría incluir esto
  EMERGENCY = "Urgencias", // No presente en tu form
  GASTRO_REFERRAL = "Referido por Gastroenterólogo", // No presente en tu form
  OTRO = "Otro" // "otro" en tu form
}
export type PatientOrigin = `${PatientOriginEnum}`;

export enum SurgeryTimeframeEnum {
  URGENTE = "Urgente", // "urgente" en tu form
  PROXIMO_MES = "Próximo mes", // "proximo_mes" en tu form
  DOS_TRES_MESES = "2-3 meses", // "2_3_meses" en tu form
  SIN_PRISA = "Sin prisa", // "sin_prisa" en tu form
  // Los siguientes no estaban en tu form, pero son válidos para SurgeryTimeframe
  DAYS_30 = "30 días",
  DAYS_60 = "60 días",
  DAYS_90 = "90 días",
  DAYS_30_60 = "30-60 días",
  DAYS_90_120 = "90-120 días"
}
export type SurgeryTimeframe = `${SurgeryTimeframeEnum}`;

export enum FollowUpStatusEnum {
  PROGRAMADO = "Programado",
  COMPLETADO = "Completado",
  CANCELADO = "Cancelado",
  PENDIENTE = "Pendiente" // Usado en tu CRM
}
export type FollowUpStatus = `${FollowUpStatusEnum}`;

// Helper para Zod enums (adaptado de implementaciones existentes)
const zodEnumFromArray = <T extends string>(arr: readonly T[]): z.ZodEnum<[T, ...T[]]> => {
  if (arr.length === 0) {
    throw new Error("Cannot create Zod enum from empty array");
  }
  const nonEmptyArray = arr as [T, ...T[]];
  if (nonEmptyArray.length === 0) { 
      throw new Error("Zod enum must have at least one value.");
  }
  return z.enum(nonEmptyArray);
};

// === ZOD VALIDATION SCHEMAS ===

// Esquema base para los campos del paciente
export const basePatientSchema = z.object({
  nombre: z.string()
    .min(2, "Nombre: Mínimo 2 caracteres.")
    .max(50, "Nombre: Máximo 50 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/, "Nombre: Solo letras, espacios, apóstrofes o guiones."),
  apellidos: z.string()
    .min(2, "Apellidos: Mínimo 2 caracteres.")
    .max(100, "Apellidos: Máximo 100 caracteres.")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/, "Apellidos: Solo letras, espacios, apóstrofes o guiones."),
  edad: z.coerce.number().min(0, "Edad: No puede ser negativa.").max(120, "Edad: Valor irreal.").optional(),
  telefono: z.string()
    .min(7, "Teléfono: Mínimo 7 dígitos.")
    .max(20, "Teléfono: Máximo 20 caracteres.")
    .regex(/^[\d\s+()-ext.EXT#*]+$/, "Teléfono: Formato inválido."),
  email: z.string().email("Email: Formato inválido.").optional().or(z.literal("")),
  notas_paciente: z.string().max(500, "Notas del paciente: Máximo 500 caracteres.").optional(),
  diagnostico_principal: zodEnumFromArray(Object.values(DiagnosisEnum)).optional(),
  estado_paciente: zodEnumFromArray(Object.values(PatientStatusEnum)).optional(),
});

// Esquema para los campos específicos de la cita
export const appointmentSpecificSchema = z.object({
  motivo_cita: zodEnumFromArray(Object.values(DiagnosisEnum)),
  fecha_hora_cita: z.date({ required_error: "Fecha y hora son requeridas." })
    .refine(date => date instanceof Date && !isNaN(date.getTime()), "Fecha inválida.")
    .refine(date => date >= new Date(new Date().setHours(0,0,0,0) - 86400000), "La fecha no puede ser anterior a ayer.") // Permite hoy y futuro
    .refine(date => { const day = date.getDay(); return day !== 0 && day !== 6; }, "No se permiten citas en sábado o domingo."),
  es_primera_vez: z.boolean().default(true),
  notas_cita: z.string().max(500, "Notas de la cita: Máximo 500 caracteres.").optional(),
  patient_id: z.string().uuid("ID de paciente inválido.").optional(), 
});

// Función para generar el esquema Zod dinámicamente
export const getCombinedPatientAppointmentSchema = (mode: 'registerOnly' | 'registerAndSchedule' | 'scheduleOnly' | 'editPatient') => {
  if (mode === 'registerAndSchedule') {
    return basePatientSchema.merge(appointmentSpecificSchema.omit({ patient_id: true })); 
  }
  if (mode === 'scheduleOnly') {
    return appointmentSpecificSchema.extend({
      patient_id: z.string().uuid("ID de paciente es requerido para agendar cita."), 
    });
  }
  if (mode === 'editPatient') {
    // Para editar paciente, se podría requerir el ID del paciente existente
    return basePatientSchema.extend({
        id: z.string().uuid("ID de paciente es requerido para editar."), 
    });
  }
  // mode === 'registerOnly'
  return basePatientSchema;
};

// Tipos inferidos para uso en formularios
export type BasePatientFormValues = z.infer<typeof basePatientSchema>;
export type AppointmentSpecificFormValues = z.infer<typeof appointmentSpecificSchema>;
// Para el formulario unificado, el tipo dependerá del modo y se puede inferir así:
// type UnifiedValues = z.infer<ReturnType<typeof getCombinedPatientAppointmentSchema>>;

// --- Constantes (como las tenías) ---
export const PAIN_SCALE = { MIN: 0, MAX: 10 } as const;
export const PROBABILITY_SCALE = { MIN: 0, MAX: 1 } as const;

export const IMPORTANT_FACTORS = {
  SAFETY: "Seguridad del procedimiento",
  EXPERIENCE: "Experiencia del cirujano",
  QUICK_PROCESS: "Proceso rápido",
  PERSONALIZED_CARE: "Atención personalizada",
  FACILITY_COMFORT: "Comodidad de instalaciones",
  POSITIVE_REVIEWS: "Recomendaciones positivas",
  TECHNOLOGY: "Tecnología utilizada",
  COSTS: "Que el costo sea accesible para mi presupuesto", // Ajustado a tu form
  AESTHETIC_RESULT: "Resultado estético", // No en tu form actual
  SURGERY_NECESSITY: "Dudas sobre necesidad real", // De preocupaciones
  PAIN_RELIEF: "Alivio del dolor", // Implícito
  // ... (otros de tu lista original si son relevantes para la encuesta)
} as const;
export type ImportantFactor = typeof IMPORTANT_FACTORS[keyof typeof IMPORTANT_FACTORS];

export const SYMPTOMS = {
  PAIN: [
    "Dolor en la zona abdominal", "Dolor después de comer", "Dolor que aumenta con esfuerzos",
    "Dolor ocasional", "Dolor abdominal intenso", "Dolor torácico no cardíaco",
    "Dolor con esfuerzo", "Dolor abdominal severo", "Dolor recurrente en hipocondrio derecho",
    "Dolor leve"
  ],
  PHYSICAL_SIGNS: [
    "Bulto o hinchazón visible", "Coloración amarillenta (ictericia)", "Distensión abdominal",
    "Masa palpable", "Bulto en ingle", "Bulto doloroso y rojo", "Abultamiento abdominal"
  ],
  DIGESTIVE: [
    "Náuseas y/o vómitos", "Sensación de pesadez", "Indigestión",
    "Intolerancia a alimentos grasos", "Náuseas", "Vómitos ocasionales",
    "Pérdida de apetito", "Acidez estomacal frecuente", "Regurgitación",
    "Intolerancia a grasas", "Dispepsia"
  ],
  MOBILITY: [
    "Dificultad para moverme", "Molestia al caminar", "Molestia al realizar esfuerzos",
    "Molestia al recostarse", "Limitación para esfuerzos"
  ],
  OTHER: [
    "Fiebre", "Ninguno (hallazgo incidental)", "Fiebre reciente",
    "Preocupación estética", "Supuración ocasional", "Fiebre leve"
  ],
  // Añadidos de tu patient-survey-form
  SURVEY_SPECIFIC: [
    "El dolor empeora al toser, estornudar o hacer esfuerzo físico",
    "El dolor me despierta por las noches",
    "Pérdida de apetito o peso sin hacer dieta",
  ]
} as const;
// Combina todos los síntomas en un solo tipo
export type Symptom = 
  | typeof SYMPTOMS.PAIN[number]
  | typeof SYMPTOMS.PHYSICAL_SIGNS[number]
  | typeof SYMPTOMS.DIGESTIVE[number]
  | typeof SYMPTOMS.MOBILITY[number]
  | typeof SYMPTOMS.OTHER[number]
  | typeof SYMPTOMS.SURVEY_SPECIFIC[number];


export const SURGERY_CONCERNS = {
  PROCEDURE: ["Miedo al procedimiento", "Dudas sobre necesidad real", "Información insuficiente", "La anestesia y sus efectos secundarios"],
  RECOVERY: ["Tiempo de recuperación", "Ausencia laboral", "Dolor postoperatorio", "Recuperación prolongada"],
  SUPPORT: ["Falta de apoyo familiar", "Experiencias negativas previas"],
  FINANCIAL: ["El costo total del procedimiento y tratamiento"], // Ajustado a tu form
  COMPLICATIONS: ["Los riesgos y posibles complicaciones", "Riesgo de recurrencia", "Complicaciones postoperatorias", "Efectos secundarios de la cirugía (disfagia)", "Nueva recidiva", "Dolor crónico", "Infección persistente", "Riesgos por edad"],
  AESTHETIC: ["Resultado estético", "Cicatrices", "Cicatriz"]
} as const;
export type SurgeryConcern = typeof SURGERY_CONCERNS[keyof typeof SURGERY_CONCERNS][number];

// --- Interfaces Principales Alineadas con Supabase ---

export interface ProfileData {
  readonly id: ID; // uuid
  username?: Optional<string>;
  full_name?: Optional<string>;
  role?: Optional<string>;
  created_at?: Optional<ISODateTimeString>;
  updated_at?: Optional<ISODateTimeString>;
}

export interface PatientData {
  readonly id: ID; // uuid
  created_at?: Optional<ISODateTimeString>;
  updated_at?: Optional<ISODateTimeString>;
  creado_por_id?: Optional<ID>; // FK a profiles.id
  nombre: string;
  apellidos: string;
  edad?: Optional<number>; // int4
  fecha_nacimiento?: Optional<DateString>; // date
  estado?: Optional<PatientStatus>; // Added to align with app-context usage
  telefono?: Optional<PhoneString>; // varchar
  email?: Optional<EmailString>; // varchar
  fecha_registro: DateString; // date, NOT NULL
  estado_paciente: PatientStatus; // patient_status_enum
  diagnostico_principal?: Optional<DiagnosisType>; // diagnosis_enum
  diagnostico_principal_detalle?: Optional<string>; // text
  doctor_asignado_id?: Optional<ID>; // FK a profiles.id
  fecha_primera_consulta?: Optional<DateString>; // date, NULLABLE
  notas_paciente?: Optional<string>; // Replaced comentarios_registro
  origen_paciente?: Optional<PatientOrigin>; // text (o ENUM si lo creas)
  probabilidad_cirugia?: Optional<number>; // numeric(3,2)
  ultimo_contacto?: Optional<DateString>; // date
  proximo_contacto?: Optional<DateString>; // date
  etiquetas?: Optional<string[]>; // _text (text[])
  fecha_cirugia_programada?: Optional<DateString>; // date
  id_legacy?: Optional<number>; // int4

  // Relaciones que se pueden poblar con JOINs
  profiles?: Optional<Partial<ProfileData>>; // Datos del doctor_asignado
  creador?: Optional<Partial<ProfileData>>; // Datos del creador_por_id
  encuesta?: Optional<PatientSurveyData>; // La encuesta más relevante para este paciente
}

// Interfaz para los datos de la encuesta, alineada con patient-survey-form.tsx
export interface PatientSurveyData {
  readonly id?: Optional<ID>; // uuid, generado por la BD
  patient_id?: Optional<ID>; // FK a patients.id, se asigna al guardar
  submitted_at?: Optional<ISODateTimeString>; // Timestamp de envío

  // Paso 1: Datos Personales y Ubicación (como en tu form)
  nombre: string;
  apellidos: string;
  edad: number;
  telefono: PhoneString;
  email?: Optional<EmailString>;
  ubicacionOrigen: "cdmx" | "estado_mexico" | "otra_ciudad";
  alcaldiaCDMX?: Optional<string>;
  municipioEdoMex?: Optional<string>;
  otraCiudadMunicipio?: Optional<string>;
  otroMunicipioEdoMex?: Optional<string>;

  // Paso 2: Cómo nos conoció y motivo (como en tu form)
  comoNosConocio: "pagina_web_google" | "redes_sociales" | "recomendacion_medico" | "recomendacion_familiar_amigo" | "seguro_medico" | "otro";
  otroComoNosConocio?: Optional<string>;
  motivoVisita: "diagnostico" | "opciones_tratamiento" | "segunda_opinion" | "programar_cirugia" | "valoracion_general";

  // Paso 3: Antecedentes Médicos (como en tu form)
  diagnosticoPrevio: boolean;
  diagnosticoPrincipalPrevio?: Optional<string>;
  detallesAdicionalesDiagnosticoPrevio?: Optional<string>;
  condicionesMedicasCronicas?: Optional<string[]>; // Array de strings
  otraCondicionMedicaRelevante?: Optional<string>;
  estudiosMedicosProblemaActual: "si" | "no" | "no_seguro";

  // Paso 4: Cobertura Médica (como en tu form)
  seguroMedico: "imss" | "issste" | "privado" | "ninguno" | "otro_seguro";
  otroSeguroMedico?: Optional<string>;
  aseguradoraSeleccionada?: Optional<string>; // e.g., "gnp", "axa", "otra"
  otraAseguradora?: Optional<string>;

  // Paso 5: Síntomas Principales (como en tu form)
  descripcionSintomaPrincipal: string;
  desdeCuandoSintomaPrincipal: "menos_2_semanas" | "2_4_semanas" | "1_6_meses" | "mas_6_meses";
  severidadSintomasActuales: "leve" | "moderada" | "severa";
  intensidadDolorActual: number; // 0-10

  // Paso 6: Síntomas Adicionales (como en tu form)
  sintomasAdicionales?: Optional<Symptom[]>; // Array de Symptom
  afectacionActividadesDiarias: "ninguna" | "un_poco" | "moderadamente" | "mucho";

  // Paso 7: Preferencias de Tratamiento (como en tu form)
  aspectosMasImportantes: string[]; // Array de strings (2 seleccionados)

  // Paso 8: Preocupaciones (como en tu form)
  preocupacionesPrincipales: string[]; // Array de strings (hasta 3 seleccionados)
  mayorPreocupacionCirugia?: Optional<string>;

  // Paso 9: Expectativas (como en tu form)
  plazoResolucionIdeal: "urgente" | "proximo_mes" | "2_3_meses" | "sin_prisa";
  tiempoTomaDecision: "misma_consulta_dias" | "dias" | "semanas_familia" | "depende_complejidad";
  expectativaPrincipalTratamiento: "eliminar_dolor_sintomas" | "volver_actividades_normales" | "prevenir_problemas_futuros" | "recuperacion_rapida_minimas_molestias";
  informacionAdicionalImportante?: Optional<string>;
  mayorBeneficioEsperado?: Optional<string>;

  // Campos calculados por la API de encuesta
  priority_score_calculated?: Optional<number>;
  surgery_probability_calculated?: Optional<number>;
  recommendations_system?: Optional<string[]>;
}


// Interfaz para los datos de la API de appointments
export interface AppointmentDataAPI {
  readonly id: ID; // uuid
  patient_id: ID; // FK a patients.id, NOT NULL
  doctor_id?: Optional<ID>; // FK a profiles.id
  created_at?: Optional<ISODateTimeString>;
  updated_at?: Optional<ISODateTimeString>;
  fecha_hora_cita: ISODateTimeString; // TIMESTAMPTZ de la BD
  motivo_cita?: Optional<string>;
  estado_cita: AppointmentStatus; // appointment_status_enum
  es_primera_vez: boolean;
  notas_cita?: Optional<string>; // Renamed from notas_cita_seguimiento
  survey_id_relacionada?: Optional<ID>; // FK a surveys.id

  // Campos de JOINs
  patients?: Optional<Pick<PatientData, "id" | "nombre" | "apellidos" | "telefono">>;
  profiles?: Optional<Pick<ProfileData, "id" | "full_name">>;
}

// Interfaz AppointmentData para el frontend (usada en AppContext y componentes)
export interface AppointmentData {
  readonly id: ID;
  patientId?: ID; 
  fechaConsulta: Date; // Objeto Date para UI
  horaConsulta: TimeString; // HH:mm para UI
  paciente: string; // Nombre completo, derivado
  telefono?: Optional<PhoneString>; // Derivado
  motivoConsulta?: Optional<DiagnosisType | string>; // Puede ser DiagnosisType o texto libre si es "OTRO"
  doctor: string; // Nombre del doctor, derivado
  estado: AppointmentStatus;
  notas?: Optional<string>; // Mapea a notas_cita_seguimiento
  es_primera_vez?: Optional<boolean>; // Para UI
  // Campos de la API para referencia interna si es necesario
  raw_fecha_hora_cita?: ISODateTimeString;
  raw_patient_id?: ID;
  raw_doctor_id?: Optional<ID>;
  raw_survey_id_relacionada?: Optional<ID>;
  created_at?: Optional<ISODateTimeString>;
  updated_at?: Optional<ISODateTimeString>;
}


// Interfaz para la tabla 'follow_ups'
export interface FollowUpData {
  readonly id: ID; // uuid
  patient_id: ID; // FK a patients.id
  user_id_assigned?: Optional<ID>; // FK a profiles.id (quién realiza el seguimiento)
  created_at?: Optional<ISODateTimeString>;
  updated_at?: Optional<ISODateTimeString>;
  fecha_seguimiento: DateString; // date
  tipo_seguimiento: "Llamada" | "Email" | "WhatsApp" | "Consulta" | "Otro";
  notas_seguimiento: string;
  resultado_seguimiento?: Optional<"Interesado" | "No interesado" | "Indeciso" | "No contactado" | "Decidido">;
  proximo_seguimiento_fecha?: Optional<DateString>; // date
  estado_seguimiento: FollowUpStatus;
}

// Interfaz para la tabla 'surgeries'
export interface SurgeryData {
    readonly id: ID; // uuid
    patient_id: ID; // FK a patients.id
    appointment_id?: Optional<ID>; // FK a appointments.id (cita que originó la cirugía)
    doctor_id?: Optional<ID>; // FK a profiles.id (cirujano principal)
    created_at?: Optional<ISODateTimeString>;
    updated_at?: Optional<ISODateTimeString>;
    fecha_cirugia: DateString; // date
    tipo_cirugia?: Optional<string>; // Podría ser un ENUM si los tipos son fijos
    diagnostico_preoperatorio?: Optional<string>;
    diagnostico_postoperatorio?: Optional<string>;
    protocolo_quirurgico?: Optional<string>; // Descripción o enlace a un documento
    complicaciones?: Optional<string>;
    estado_cirugia: "Programada" | "Realizada" | "Cancelada" | "Pospuesta"; // Podría ser un ENUM
    notas_cirugia?: Optional<string>;
}


export interface DoctorData {
  readonly id: ID;
  nombre: string; // Mapea a profiles.full_name
  especialidad: string;
  pacientesAtendidos?: Optional<number>;
  tasaConversion?: Optional<number>;
  foto?: Optional<string>; // Mapea a profiles.avatar_url
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
  tasaConversion: number; // 0.0 a 1.0
  tiempoPromedioDecision: number; // en días
  fuentePrincipalPacientes: PatientOrigin;
  diagnosticosMasComunes: ReadonlyArray<DiagnosticMetric>;
  readonly lastUpdated?: ISODateTimeString;
}

// Type guards
export const isValidPainScale = (value: number): boolean => value >= PAIN_SCALE.MIN && value <= PAIN_SCALE.MAX;
export const isValidProbability = (value: number): boolean => value >= PROBABILITY_SCALE.MIN && value <= PROBABILITY_SCALE.MAX;

export const isValidPhoneNumber = (phone?: Optional<PhoneString>): boolean => {
  if (!phone) return true; // Si es opcional y no se provee, es válido para el type guard
  const phoneRegex = /^[0-9\s\-+()]*$/;
  const digitsOnly = phone.replace(/\D/g, '');
  return phoneRegex.test(phone) && digitsOnly.length >= 7 && digitsOnly.length <= 15;
};

export const isValidEmail = (email?: Optional<EmailString>): boolean => {
  if (!email) return true; // Si es opcional y está vacío, es válido
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Funciones de conversión de tipo
export const toPatientStatusType = (value: string): PatientStatus | null => {
  return Object.values(PatientStatusEnum).includes(value as PatientStatusEnum) 
    ? value as PatientStatus 
    : null;
};

export const toDiagnosisTypeType = (value: string): DiagnosisType | null => {
  return Object.values(DiagnosisEnum).includes(value as DiagnosisEnum) 
    ? value as DiagnosisType 
    : null;
};

export const toAppointmentStatusType = (value: string): AppointmentStatus | null => {
  return Object.values(AppointmentStatusEnum).includes(value as AppointmentStatusEnum)
    ? value as AppointmentStatus
    : null;
};
