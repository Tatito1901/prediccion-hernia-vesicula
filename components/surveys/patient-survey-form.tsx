"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation" // Import useRouter hook for navigation
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useIsMobile } from "@/hooks/use-breakpoint"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Loader2 as LoadingSpinner, // Changed from LoaderIcon for standard spinner
  User,
  Phone,
  FileQuestion,
  Stethoscope,
  Shield,
  Activity,
  Star,
  HelpCircle,
  Target,
  MapPin,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useUpdatePatient } from "@/hooks/use-appointments"
import { toast } from "sonner"

// Importar directamente del store de Zustand


// Ya no necesitamos esta implementación personalizada porque estamos usando el hook centralizado
// de @/hooks/use-breakpoint

// Definición del tipo para los síntomas
export type Symptom = string

// Datos de ubicación jerárquicos
const alcaldiasCDMX = [
  "Álvaro Obregón",
  "Azcapotzalco",
  "Benito Juárez",
  "Coyoacán",
  "Cuajimalpa de Morelos",
  "Cuauhtémoc",
  "Gustavo A. Madero",
  "Iztacalco",
  "Iztapalapa",
  "La Magdalena Contreras",
  "Miguel Hidalgo",
  "Milpa Alta",
  "Tláhuac",
  "Tlalpan",
  "Venustiano Carranza",
  "Xochimilco"
]

const municipiosEdoMex = [
  "Toluca",
  "Ecatepec de Morelos",
  "Nezahualcóyotl",
  "Naucalpan de Juárez",
  "Tlalnepantla de Baz",
  "Chimalhuacán",
  "Cuautitlán Izcalli",
  "Atizapán de Zaragoza",
  "Tultitlán",
  "Coacalco de Berriozábal",
  "Tecámac",
  "Los Reyes La Paz",
  "Ixtapaluca",
  "Chalco",
  "Valle de Chalco Solidaridad",
  "Nicolás Romero",
  "Huixquilucan",
  "Metepec",
  "Texcoco",
  "Otro municipio"
]

// Interfaz FormData actualizada con ubicación
interface FormData {
  // Paso 1: Datos Personales y Ubicación
  nombre: string
  apellidos: string
  edad: number
  telefono: string
  email?: string
  ubicacionOrigen: "cdmx" | "estado_mexico" | "otra_ciudad"
  alcaldiaCDMX?: string
  municipioEdoMex?: string
  otraCiudadMunicipio?: string
  otroMunicipioEdoMex?: string

  // Paso 2: Cómo nos conoció y motivo
  comoNosConocio:
    | "pagina_web_google"
    | "redes_sociales"
    | "recomendacion_medico"
    | "recomendacion_familiar_amigo"
    | "seguro_medico"
    | "otro"
  otroComoNosConocio?: string
  motivoVisita: "diagnostico" | "opciones_tratamiento" | "segunda_opinion" | "programar_cirugia" | "valoracion_general"

  // Paso 3: Antecedentes Médicos
  diagnosticoPrevio: boolean
  diagnosticoPrincipalPrevio?: string
  detallesAdicionalesDiagnosticoPrevio?: string
  condicionesMedicasCronicas?: string[]
  otraCondicionMedicaRelevante?: string
  estudiosMedicosProblemaActual: "si" | "no" | "no_seguro"

  // Paso 4: Cobertura Médica
  seguroMedico: "imss" | "issste" | "privado" | "ninguno" | "otro_seguro"
  otroSeguroMedico?: string
  aseguradoraSeleccionada?: string
  otraAseguradora?: string

  // Paso 5: Síntomas Principales
  descripcionSintomaPrincipal: string
  desdeCuandoSintomaPrincipal: "menos_2_semanas" | "2_4_semanas" | "1_6_meses" | "mas_6_meses"
  severidadSintomasActuales: "leve" | "moderada" | "severa"
  intensidadDolorActual: number

  // Paso 6: Síntomas Adicionales
  sintomasAdicionales?: Symptom[]
  afectacionActividadesDiarias: "ninguna" | "un_poco" | "moderadamente" | "mucho"

  // Paso 7: Preferencias de Tratamiento
  aspectosMasImportantes: string[]

  // Paso 8: Preocupaciones
  preocupacionesPrincipales: string[]
  mayorPreocupacionCirugia?: string

  // Paso 9: Expectativas
  plazoResolucionIdeal: "urgente" | "proximo_mes" | "2_3_meses" | "sin_prisa"
  tiempoTomaDecision: "misma_consulta_dias" | "dias" | "semanas_familia" | "depende_complejidad"
  expectativaPrincipalTratamiento:
    | "eliminar_dolor_sintomas"
    | "volver_actividades_normales"
    | "prevenir_problemas_futuros"
    | "recuperacion_rapida_minimas_molestias"
  informacionAdicionalImportante?: string
  mayorBeneficioEsperado?: string
}

// Esquema de validación Zod actualizado con ubicación
const surveySchema = z
  .object({
    // Paso 1 - Datos Personales y Ubicación
    nombre: z.string().min(2, { message: "Por favor, ingrese su nombre completo." }),
    apellidos: z.string().min(2, { message: "Por favor, ingrese sus apellidos completos." }),
    edad: z.coerce
      .number()
      .min(1, { message: "Por favor, ingrese su edad." })
      .max(120, { message: "Por favor, verifique que la edad sea correcta." }),
    telefono: z
      .string()
      .min(10, { message: "Por favor, ingrese un número telefónico válido de 10 dígitos." })
      .max(15, { message: "El número telefónico es demasiado largo." }),
    email: z.string().email({ message: "Por favor, ingrese un correo electrónico válido." }).optional().or(z.literal("")),

    ubicacionOrigen: z.enum(["cdmx", "estado_mexico", "otra_ciudad"], {
      required_error: "Por favor, seleccione desde dónde nos visita.",
    }),
    alcaldiaCDMX: z.string().optional(),
    municipioEdoMex: z.string().optional(),
    otraCiudadMunicipio: z.string().optional(),
    otroMunicipioEdoMex: z.string().optional(),

    // Paso 2 - Referencia y Motivo
    comoNosConocio: z.enum(
      [
        "pagina_web_google",
        "redes_sociales",
        "recomendacion_medico",
        "recomendacion_familiar_amigo",
        "seguro_medico",
        "otro",
      ],
      { required_error: "Por favor, indíquenos cómo conoció nuestra clínica." },
    ),
    otroComoNosConocio: z.string().optional(),
    motivoVisita: z.enum(
      ["diagnostico", "opciones_tratamiento", "segunda_opinion", "programar_cirugia", "valoracion_general"],
      { required_error: "Por favor, seleccione el motivo principal de su consulta." },
    ),

    // Paso 3 - Antecedentes Médicos
    diagnosticoPrevio: z.boolean(),
    diagnosticoPrincipalPrevio: z.string().optional(),
    detallesAdicionalesDiagnosticoPrevio: z.string().optional(),
    condicionesMedicasCronicas: z.array(z.string()).optional(),
    otraCondicionMedicaRelevante: z.string().optional(),
    estudiosMedicosProblemaActual: z.enum(["si", "no", "no_seguro"], {
      required_error: "Por favor, indique si ha realizado estudios médicos para su condición actual.",
    }),

    // Paso 4 - Cobertura Médica
    seguroMedico: z.enum(["imss", "issste", "privado", "ninguno", "otro_seguro"], {
      required_error: "Por favor, seleccione su tipo de cobertura médica.",
    }),
    otroSeguroMedico: z.string().optional(),
    aseguradoraSeleccionada: z.string().optional(),
    otraAseguradora: z.string().optional(),

    // Paso 5 - Síntomas Principales
    descripcionSintomaPrincipal: z
      .string()
      .min(10, { message: "Por favor, describa su síntoma principal con al menos 10 caracteres." }),
    desdeCuandoSintomaPrincipal: z.enum(["menos_2_semanas", "2_4_semanas", "1_6_meses", "mas_6_meses"], {
      required_error: "Por favor, indique hace cuánto tiempo presenta este síntoma.",
    }),
    severidadSintomasActuales: z.enum(["leve", "moderada", "severa"], {
      required_error: "Por favor, seleccione la intensidad de sus síntomas.",
    }),
    intensidadDolorActual: z.coerce
      .number()
      .min(0, "La intensidad debe estar entre 0 y 10.")
      .max(10, "La intensidad debe estar entre 0 y 10."),

    // Paso 6 - Síntomas Adicionales
    sintomasAdicionales: z.array(z.string()).optional(),
    afectacionActividadesDiarias: z.enum(["ninguna", "un_poco", "moderadamente", "mucho"], {
      required_error: "Por favor, indique cómo afectan los síntomas sus actividades diarias.",
    }),

    // Paso 7 - Preferencias
    aspectosMasImportantes: z
      .array(z.string())
      .min(2, { message: "Por favor, seleccione exactamente dos aspectos más importantes." })
      .max(2, { message: "Por favor, seleccione únicamente dos aspectos más importantes." }),

    // Paso 8 - Preocupaciones
    preocupacionesPrincipales: z
      .array(z.string())
      .min(1, { message: "Por favor, seleccione al menos una preocupación principal." })
      .max(3, { message: "Por favor, seleccione máximo tres preocupaciones principales." }),
    mayorPreocupacionCirugia: z.string().optional(),

    // Paso 9 - Expectativas
    plazoResolucionIdeal: z.enum(["urgente", "proximo_mes", "2_3_meses", "sin_prisa"], {
      required_error: "Por favor, indique en qué tiempo le gustaría resolver su condición.",
    }),
    tiempoTomaDecision: z.enum(["misma_consulta_dias", "dias", "semanas_familia", "depende_complejidad"], {
      required_error: "Por favor, indique cuánto tiempo necesita para tomar una decisión.",
    }),
    expectativaPrincipalTratamiento: z.enum(
      [
        "eliminar_dolor_sintomas",
        "volver_actividades_normales",
        "prevenir_problemas_futuros",
        "recuperacion_rapida_minimas_molestias",
      ],
      { required_error: "Por favor, indique qué espera lograr con el tratamiento." },
    ),
    informacionAdicionalImportante: z.string().optional(),
    mayorBeneficioEsperado: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validaciones condicionales existentes
    if (data.comoNosConocio === "otro" && (!data.otroComoNosConocio || data.otroComoNosConocio.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique cómo conoció nuestra clínica.",
        path: ["otroComoNosConocio"],
      })
    }

    if (data.diagnosticoPrevio && (!data.diagnosticoPrincipalPrevio || data.diagnosticoPrincipalPrevio.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su diagnóstico médico previo.",
        path: ["diagnosticoPrincipalPrevio"],
      })
    }

    if (data.seguroMedico === "otro_seguro" && (!data.otroSeguroMedico || data.otroSeguroMedico.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su tipo de cobertura médica.",
        path: ["otroSeguroMedico"],
      })
    }

    if (data.seguroMedico === "privado" && !data.aseguradoraSeleccionada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, seleccione su compañía aseguradora.",
        path: ["aseguradoraSeleccionada"],
      })
    }

    if (
      data.seguroMedico === "privado" &&
      data.aseguradoraSeleccionada === "otra" &&
      (!data.otraAseguradora || data.otraAseguradora.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique el nombre de su aseguradora.",
        path: ["otraAseguradora"],
      })
    }

    // Nuevas validaciones para ubicación
    if (data.ubicacionOrigen === "cdmx" && !data.alcaldiaCDMX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, seleccione su alcaldía en Ciudad de México.",
        path: ["alcaldiaCDMX"],
      })
    }

    if (data.ubicacionOrigen === "estado_mexico" && !data.municipioEdoMex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, seleccione su municipio en Estado de México.",
        path: ["municipioEdoMex"],
      })
    }

    if (
      data.ubicacionOrigen === "estado_mexico" &&
      data.municipioEdoMex === "Otro municipio" &&
      (!data.otroMunicipioEdoMex || data.otroMunicipioEdoMex.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su municipio.",
        path: ["otroMunicipioEdoMex"],
      })
    }

    if (
      data.ubicacionOrigen === "otra_ciudad" &&
      (!data.otraCiudadMunicipio || data.otraCiudadMunicipio.trim() === "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su ciudad o municipio de origen.",
        path: ["otraCiudadMunicipio"],
      })
    }
  })

type SurveyFormValues = z.infer<typeof surveySchema>

interface PatientSurveyFormProps {
  patientId?: number
  surveyTemplateId: string
  assignedSurveyId: string
  onComplete?: (data: SurveyFormValues) => void
  onSubmitSuccess?: (data: SurveyFormValues) => void
  standalone?: boolean
  initialData?: Partial<SurveyFormValues>
}

// Opciones mejoradas para los campos de selección
const opcionesComoNosConocio = [
  { value: "pagina_web_google", label: "Búsqueda en Internet o sitio web de la clínica" },
  { value: "redes_sociales", label: "Redes sociales (Facebook, Instagram, etc.)" },
  { value: "recomendacion_medico", label: "Referencia de otro médico o profesional de la salud" },
  { value: "recomendacion_familiar_amigo", label: "Recomendación de familiar, amigo o conocido" },
  { value: "seguro_medico", label: "Directorio de mi seguro médico" },
  { value: "otro", label: "Otro medio" },
]

const opcionesMotivoVisita = [
  { value: "diagnostico", label: "Necesito un diagnóstico para mis síntomas actuales" },
  { value: "opciones_tratamiento", label: "Quiero conocer las opciones de tratamiento disponibles" },
  { value: "segunda_opinion", label: "Busco una segunda opinión médica" },
  { value: "programar_cirugia", label: "Quiero programar una cirugía ya indicada" },
  { value: "valoracion_general", label: "Evaluación médica integral de mi condición" },
]

const opcionesUbicacionOrigen = [
  { value: "cdmx", label: "Ciudad de México" },
  { value: "estado_mexico", label: "Estado de México" },
  { value: "otra_ciudad", label: "Otra ciudad" },
]

const opcionesSeguroMedico = [
  { value: "imss", label: "IMSS (Instituto Mexicano del Seguro Social)" },
  { value: "issste", label: "ISSSTE (Instituto de Seguridad y Servicios Sociales de los Trabajadores del Estado)" },
  { value: "privado", label: "Seguro de gastos médicos privado" },
  { value: "ninguno", label: "No tengo seguro médico" },
  { value: "otro_seguro", label: "Otro tipo de seguro médico" },
]

const opcionesAseguradoras = [
  { id: "gnp", label: "GNP Seguros" },
  { id: "axa", label: "AXA Seguros" },
  { id: "bupa", label: "BUPA México" },
  { id: "mapfre", label: "MAPFRE" },
  { id: "qualitas", label: "Qualitas Compañía de Seguros" },
  { id: "atlas", label: "Atlas Seguros" },
  { id: "metlife", label: "MetLife México" },
  { id: "otra", label: "Otra aseguradora" },
]

const listaSintomasAdicionales: Symptom[] = [
  "El dolor empeora al toser, estornudar o hacer esfuerzo físico",
  "El dolor me despierta por las noches",
  "Náuseas o ganas de vomitar",
  "Pérdida de apetito o peso sin hacer dieta",
  "Fiebre o escalofríos",
  "Color amarillo en los ojos o la piel",
  "Dificultad para moverme o hacer actividades normales",
  "Acidez estomacal o indigestión frecuente",
  "El dolor aumenta después de comer, especialmente alimentos grasosos",
  "Hinchazón o inflamación en el abdomen",
]

const opcionesDesdeCuandoSintoma = [
  { value: "menos_2_semanas", label: "Menos de 2 semanas" },
  { value: "2_4_semanas", label: "Entre 2 y 4 semanas" },
  { value: "1_6_meses", label: "Entre 1 y 6 meses" },
  { value: "mas_6_meses", label: "Más de 6 meses" },
]

const opcionesSeveridadSintomas = [
  { value: "leve", label: "Leve - Molestias ocasionales que no interfieren mucho con mis actividades" },
  { value: "moderada", label: "Moderada - Síntomas frecuentes que limitan algunas de mis actividades" },
  { value: "severa", label: "Severa - Síntomas intensos que dificultan significativamente mis actividades diarias" },
]

const opcionesAfectacionActividades = [
  { value: "ninguna", label: "No me afecta - Puedo hacer todas mis actividades normalmente" },
  { value: "un_poco", label: "Me afecta un poco - Algunas actividades me cuestan más trabajo" },
  { value: "moderadamente", label: "Me afecta moderadamente - He tenido que cambiar o evitar ciertas actividades" },
  { value: "mucho", label: "Me afecta mucho - Tengo grandes dificultades para hacer mis actividades esenciales" },
]

const listaCondicionesMedicasCronicas = [
  "Presión arterial alta (hipertensión)",
  "Diabetes",
  "Sobrepeso u obesidad",
  "Problemas del corazón (infarto previo, arritmias, insuficiencia cardíaca)",
  "Problemas respiratorios (asma, EPOC, bronquitis crónica)",
  "Problemas de la tiroides",
]

const opcionesEstudiosMedicos = [
  { value: "si", label: "Sí, me he hecho estudios" },
  { value: "no", label: "No, no me he hecho estudios" },
  { value: "no_seguro", label: "No estoy seguro(a)" },
]

const opcionesAspectosImportantes = [
  { id: "seguridad", label: "Que el procedimiento sea lo más seguro posible" },
  { id: "experiencia_cirujano", label: "Que el cirujano tenga mucha experiencia y reconocimiento" },
  { id: "costo_accesible", label: "Que el costo sea accesible para mi presupuesto" },
  { id: "proceso_rapido", label: "Que todo el proceso sea rápido y eficiente" },
  { id: "atencion_personalizada", label: "Recibir atención personalizada y comunicación clara" },
  { id: "calidad_instalaciones", label: "Que las instalaciones sean de alta calidad y cómodas" },
]

const factoresPreocupacion = [
  { id: "costoTotal", label: "El costo total del procedimiento y tratamiento" },
  { id: "manejoDolor", label: "Cuánto dolor tendré durante y después del procedimiento" },
  { id: "riesgosComplicaciones", label: "Los riesgos y posibles complicaciones" },
  { id: "anestesia", label: "La anestesia y sus efectos secundarios" },
  { id: "tiempoRecuperacion", label: "Cuánto tiempo necesitaré para recuperarme" },
  { id: "faltarTrabajo", label: "El tiempo que tendré que faltar al trabajo" },
  { id: "noApoyoCasa", label: "No tener suficiente apoyo en casa durante la recuperación" },
  { id: "noSeguroMejorOpcion", label: "No estar seguro(a) de que la cirugía sea la mejor opción" },
]

const opcionesPlazoResolucion = [
  { value: "urgente", label: "Lo más pronto posible, es urgente para mí" },
  { value: "proximo_mes", label: "En el próximo mes" },
  { value: "2_3_meses", label: "En los próximos 2-3 meses" },
  { value: "sin_prisa", label: "No tengo prisa, cuando sea más conveniente" },
]

const opcionesTiempoDecision = [
  { value: "misma_consulta_dias", label: "Podría decidir el mismo día de la consulta o en los siguientes días" },
  { value: "dias", label: "Necesitaría unos días para pensarlo bien" },
  { value: "semanas_familia", label: "Necesitaría varias semanas y consultarlo con mi familia" },
  { value: "depende_complejidad", label: "Dependería de qué tan complejo sea el tratamiento propuesto" },
]

const opcionesExpectativaPrincipalTratamiento = [
  { value: "eliminar_dolor_sintomas", label: "Eliminar completamente el dolor y los síntomas" },
  { value: "volver_actividades_normales", label: "Poder regresar a todas mis actividades normales" },
  { value: "prevenir_problemas_futuros", label: "Prevenir que mi condición empeore en el futuro" },
  { value: "recuperacion_rapida_minimas_molestias", label: "Tener una recuperación rápida con las mínimas molestias" },
]

// Definición optimizada de los pasos
const pasos = [
  {
    id: 1,
    titulo: "Datos Personales",
    descripcion: "Información personal y ubicación",
    icono: <User className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 2,
    titulo: "Referencia",
    descripcion: "Cómo nos conoció y motivo de consulta",
    icono: <Phone className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 3,
    titulo: "Historial Médico",
    descripcion: "Antecedentes médicos relevantes",
    icono: <FileQuestion className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 4,
    titulo: "Seguro Médico",
    descripcion: "Información sobre su cobertura médica",
    icono: <Shield className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 5,
    titulo: "Síntomas Principales",
    descripcion: "Detalles sobre su condición actual",
    icono: <Stethoscope className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 6,
    titulo: "Otros Síntomas",
    descripcion: "Síntomas adicionales y su impacto",
    icono: <Activity className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 7,
    titulo: "Preferencias",
    descripcion: "Lo que es más importante para usted",
    icono: <Star className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 8,
    titulo: "Preocupaciones",
    descripcion: "Sus inquietudes sobre el tratamiento",
    icono: <HelpCircle className="h-4 w-4 md:h-5 md:w-5" />,
  },
  {
    id: 9,
    titulo: "Expectativas",
    descripcion: "Qué espera lograr con el tratamiento",
    icono: <Target className="h-4 w-4 md:h-5 md:w-5" />,
  },
]

export default function PatientSurveyForm({
  patientId,
  surveyTemplateId, // Changed from surveyId
  assignedSurveyId, // Added
  onComplete,
  onSubmitSuccess,
  initialData,
}: PatientSurveyFormProps) {
  const router = useRouter() // Initialize the router
  const { mutate: updatePatient, isPending: isUpdating } = useUpdatePatient();
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [surveyDataMeta, setSurveyDataMeta] = useState<{ id: string; title: string; description: string } | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = pasos.length
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isMobile = useIsMobile()

  // Valores iniciales optimizados
  const defaultValues: SurveyFormValues = {
    // Paso 1
    nombre: "",
    apellidos: "",
    edad: 30,
    telefono: "",
    email: "",
    ubicacionOrigen: "cdmx",
    alcaldiaCDMX: "",
    municipioEdoMex: "",
    otraCiudadMunicipio: "",
    otroMunicipioEdoMex: "",

    // Paso 2
    comoNosConocio: "pagina_web_google",
    otroComoNosConocio: "",
    motivoVisita: "diagnostico",

    // Paso 3
    diagnosticoPrevio: false,
    diagnosticoPrincipalPrevio: "",
    detallesAdicionalesDiagnosticoPrevio: "",
    condicionesMedicasCronicas: [],
    otraCondicionMedicaRelevante: "",
    estudiosMedicosProblemaActual: "no_seguro",

    // Paso 4
    seguroMedico: "ninguno",
    otroSeguroMedico: "",
    aseguradoraSeleccionada: "",
    otraAseguradora: "",

    // Paso 5
    descripcionSintomaPrincipal: "",
    desdeCuandoSintomaPrincipal: "menos_2_semanas",
    severidadSintomasActuales: "leve",
    intensidadDolorActual: 0,

    // Paso 6
    sintomasAdicionales: [],
    afectacionActividadesDiarias: "ninguna",

    // Paso 7
    aspectosMasImportantes: [],

    // Paso 8
    preocupacionesPrincipales: [],
    mayorPreocupacionCirugia: "",

    // Paso 9
    plazoResolucionIdeal: "proximo_mes",
    tiempoTomaDecision: "dias",
    expectativaPrincipalTratamiento: "eliminar_dolor_sintomas",
    informacionAdicionalImportante: "",
    mayorBeneficioEsperado: "",
  }

  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveySchema),
    defaultValues: { ...defaultValues, ...initialData },
    mode: "onChange",
  })

  // Simular carga de metadatos
  useEffect(() => {
    const timer = setTimeout(() => {
      setSurveyDataMeta({
        id: surveyTemplateId,
        title: "Cuestionario Médico Pre-Consulta",
        description:
          "Este cuestionario nos ayuda a conocer mejor su situación médica para brindarle la mejor atención posible. Toda su información es completamente confidencial y segura.",
      })
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [surveyTemplateId])

  // Auto-guardar progreso optimizado
  const saveProgress = useCallback(() => {
    // Check if form is dirty or current step has changed since last save
    const savedProgressRaw = localStorage.getItem(`survey_${surveyTemplateId}`)
    const savedStep = savedProgressRaw ? JSON.parse(savedProgressRaw).currentStep : -1;

    if (!form.formState.isDirty && currentStep === savedStep) {
        // console.log("No changes to save or step hasn't changed.");
        return;
    }

    setIsSaving(true)
    const formData = form.getValues()
    const dataToSave = {
      formData,
      currentStep,
      _timestamp: Date.now(),
    }

    try {
      localStorage.setItem(`survey_${surveyTemplateId}`, JSON.stringify(dataToSave))
      setTimeout(() => {
        setIsSaving(false)
        setLastSaved(new Date())
        form.reset({}, { keepValues: true }) // Resets dirty state but keeps values
      }, 300)
    } catch (error) {
      console.error("Error saving progress:", error)
      setIsSaving(false)
    }
  }, [form, currentStep, surveyTemplateId])


  // Cargar datos guardados
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(`survey_${surveyTemplateId}`)
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        form.reset(parsedData.formData)
        setLastSaved(new Date(parsedData._timestamp || Date.now()))
        setCurrentStep(parsedData.currentStep || 1)
      }
    } catch (error) {
      console.error("Error loading saved data:", error)
      localStorage.removeItem(`survey_${surveyTemplateId}`)
    }
  }, [surveyTemplateId, form])

  // Auto-guardar cada 30 segundos si hay cambios
  useEffect(() => {
    const interval = setInterval(() => {
      if (form.formState.isDirty) {
        saveProgress()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [form.formState.isDirty, saveProgress])


  // Obtener campos a validar por paso
  const getFieldsToValidate = (step: number): (keyof SurveyFormValues)[] => {
    switch (step) {
      case 1:
        const fields: (keyof SurveyFormValues)[] = ["nombre", "apellidos", "edad", "telefono", "ubicacionOrigen"]
        const ubicacion = form.getValues("ubicacionOrigen")

        if (ubicacion === "cdmx") fields.push("alcaldiaCDMX")
        if (ubicacion === "estado_mexico") {
          fields.push("municipioEdoMex")
          if (form.getValues("municipioEdoMex") === "Otro municipio") {
            fields.push("otroMunicipioEdoMex")
          }
        }
        if (ubicacion === "otra_ciudad") fields.push("otraCiudadMunicipio")

        return fields

      case 2:
        const fields2: (keyof SurveyFormValues)[] = ["comoNosConocio", "motivoVisita"]
        if (form.getValues("comoNosConocio") === "otro") fields2.push("otroComoNosConocio")
        return fields2

      case 3:
        const fields3: (keyof SurveyFormValues)[] = ["diagnosticoPrevio", "estudiosMedicosProblemaActual"]
        if (form.getValues("diagnosticoPrevio")) fields3.push("diagnosticoPrincipalPrevio")
        return fields3

      case 4:
        const fields4: (keyof SurveyFormValues)[] = ["seguroMedico"]
        if (form.getValues("seguroMedico") === "otro_seguro") fields4.push("otroSeguroMedico")
        if (form.getValues("seguroMedico") === "privado") {
          fields4.push("aseguradoraSeleccionada")
          if (form.getValues("aseguradoraSeleccionada") === "otra") fields4.push("otraAseguradora")
        }
        return fields4

      case 5:
        return ["descripcionSintomaPrincipal", "desdeCuandoSintomaPrincipal", "severidadSintomasActuales", "intensidadDolorActual"]

      case 6:
        return ["afectacionActividadesDiarias"] // sintomasAdicionales is optional array, usually not validated for emptiness unless specified

      case 7:
        return ["aspectosMasImportantes"]

      case 8:
        return ["preocupacionesPrincipales"] // mayorPreocupacionCirugia is optional

      case 9:
        return ["plazoResolucionIdeal", "tiempoTomaDecision", "expectativaPrincipalTratamiento"] // informacionAdicionalImportante and mayorBeneficioEsperado are optional

      default:
        return []
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsToValidate(currentStep)
    const result = await form.trigger(fieldsToValidate)

    if (result) {
      saveProgress() // Save progress before moving to next step
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps + 1)) // totalSteps + 1 is the review step
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      // If validation fails, find the first error and scroll to it
      const errors = form.formState.errors
      const firstErrorField = fieldsToValidate.find((field) => errors[field])
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0]
        element?.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  const prevStep = () => {
    saveProgress() // Save progress when going back too
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

    const onSubmit = async (data: SurveyFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)

    // Guardar los datos de la encuesta (simulado)
    // Aquí iría la lógica para guardar los datos de la encuesta en la base de datos,
    // probablemente usando el `assignedSurveyId`.
    console.log("Guardando datos de la encuesta para assignedSurveyId:", assignedSurveyId, data);

    // Una vez que la encuesta se guarda, actualizamos el estado del paciente.
    if (patientId) {
      updatePatient(
        {
          id: String(patientId),
          updatedData: { encuesta: true, estado: "Pendiente de consulta" },
        },
        {
          onSuccess: () => {
            toast.success("Encuesta enviada y estado del paciente actualizado.")
            localStorage.removeItem(`survey_${surveyTemplateId}`)
            setLastSaved(null)
            if (onSubmitSuccess) onSubmitSuccess(data)
            if (onComplete) onComplete(data)
            router.push('/survey/gracias')
          },
          onError: (error) => {
            console.error("Error al actualizar el paciente:", error)
            setSubmitError("No se pudo actualizar el estado del paciente. Por favor, intente de nuevo.")
            toast.error("Error al actualizar el paciente", {
              description: error.message,
            })
          },
          onSettled: () => {
            setIsSubmitting(false)
          },
        },
      )
    } else {
      // Si no hay patientId, solo se completa el formulario (modo standalone)
      toast.info("Encuesta completada (modo standalone).")
      localStorage.removeItem(`survey_${surveyTemplateId}`)
      if (onSubmitSuccess) onSubmitSuccess(data)
      if (onComplete) onComplete(data)
      router.push('/survey/gracias')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-8 w-8 md:h-10 md:w-10 animate-spin text-primary" />
      </div>
    )
  }

  // Renderizado de contenido por paso
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Datos Personales y Ubicación
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <User className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Información Personal
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Por favor, compártanos sus datos personales básicos y desde dónde nos visita.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="nombre"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Cuál es su nombre? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Escriba su nombre completo" {...field} className="text-sm md:text-base" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apellidos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Cuáles son sus apellidos? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Escriba sus apellidos completos" {...field} className="text-sm md:text-base" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="edad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Qué edad tiene? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Escriba su edad"
                        {...field}
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || 0)}
                        className="text-sm md:text-base"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefono"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Cuál es su número de teléfono? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Escriba su número telefónico" {...field} className="text-sm md:text-base" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>¿Cuál es su correo electrónico? (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Escriba su dirección de correo electrónico" {...field} className="text-sm md:text-base" />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Separator />

            {/* Sección de Ubicación */}
            <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-green-800 dark:text-green-300 flex items-center mb-2">
                <MapPin className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Ubicación de Origen
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                Esta información nos ayuda a entender mejor nuestros pacientes y mejorar nuestros servicios.
              </p>
            </div>

            <FormField
              control={form.control}
              name="ubicacionOrigen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    ¿Desde dónde nos visita? <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      {opcionesUbicacionOrigen.map((op) => (
                        <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={op.value} />
                          </FormControl>
                          <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Alcaldías de CDMX */}
            {form.watch("ubicacionOrigen") === "cdmx" && (
              <FormField
                control={form.control}
                name="alcaldiaCDMX"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿En qué alcaldía de Ciudad de México vive? <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                      <FormControl>
                        <SelectTrigger className="text-sm md:text-base">
                          <SelectValue placeholder="Seleccione su alcaldía" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {alcaldiasCDMX.map((alcaldia) => (
                          <SelectItem key={alcaldia} value={alcaldia}>
                            {alcaldia}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            {/* Municipios del Estado de México */}
            {form.watch("ubicacionOrigen") === "estado_mexico" && (
              <>
                <FormField
                  control={form.control}
                  name="municipioEdoMex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        ¿En qué municipio del Estado de México vive? <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                        <FormControl>
                          <SelectTrigger className="text-sm md:text-base">
                            <SelectValue placeholder="Seleccione su municipio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {municipiosEdoMex.map((municipio) => (
                            <SelectItem key={municipio} value={municipio}>
                              {municipio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {form.watch("municipioEdoMex") === "Otro municipio" && (
                  <FormField
                    control={form.control}
                    name="otroMunicipioEdoMex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ¿Cuál es su municipio? <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Escriba el nombre de su municipio" {...field} className="text-sm md:text-base" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            {/* Otra ciudad*/}
            {form.watch("ubicacionOrigen") === "otra_ciudad" && (
              <FormField
                control={form.control}
                name="otraCiudadMunicipio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ¿Cuál es su ciudad o municipio de origen? <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Escriba su ciudad o municipio de origen" {...field} className="text-sm md:text-base" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </motion.div>
        )
      case 2: // Referencia y Motivo
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Phone className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Cómo Llegó a Nosotros
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Nos gustaría saber cómo conoció nuestra clínica y qué lo motivó a buscar atención médica con nosotros.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Referencia</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="comoNosConocio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        ¿Cómo conoció nuestra clínica? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesComoNosConocio.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {form.watch("comoNosConocio") === "otro" && (
                  <FormField
                    control={form.control}
                    name="otroComoNosConocio"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>
                          Por favor, díganos cómo nos conoció: <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Escriba cómo conoció nuestra clínica" {...field} className="text-sm md:text-base" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Motivo de Consulta</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="motivoVisita"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        ¿Cuál es el motivo principal de su consulta? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesMotivoVisita.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      case 3: // Historial Médico
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <FileQuestion className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Su Historial Médico
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Conocer su historial médico nos ayuda a brindarle una atención más segura y personalizada.
              </p>
            </div>

            <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
              <AccordionItem value="item-1" className="border-blue-100 dark:border-slate-700">
                <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                  Diagnósticos Médicos Previos
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <FormField
                    control={form.control}
                    name="diagnosticoPrevio"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 md:p-4 shadow-sm">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm md:text-base">
                            ¿Algún médico ya le ha dado un diagnóstico relacionado con el problema por el que nos consulta hoy?
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("diagnosticoPrevio") && (
                    <div className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="diagnosticoPrincipalPrevio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              ¿Cuál fue el diagnóstico que le dieron? <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="Ejemplo: Cálculos en la vesícula, hernia inguinal, etc." {...field} className="text-sm md:text-base" />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="detallesAdicionalesDiagnosticoPrevio"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>¿Quiere agregar más detalles sobre este diagnóstico? (Opcional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Puede incluir: qué médico se lo dio, cuándo fue, qué tratamientos ha probado, etc."
                                {...field}
                                className="text-sm md:text-base"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-blue-100 dark:border-slate-700">
                <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                  Otras Condiciones Médicas
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <FormField
                    control={form.control}
                    name="condicionesMedicasCronicas"
                    render={() => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">¿Tiene alguna de estas condiciones médicas?</FormLabel>
                        <FormDescription>Marque todas las que correspondan a su situación.</FormDescription>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                          {listaCondicionesMedicasCronicas.map((condicion) => (
                            <FormField
                              key={condicion}
                              control={form.control}
                              name="condicionesMedicasCronicas"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(condicion)}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || []
                                        return checked
                                          ? field.onChange([...currentValues, condicion])
                                          : field.onChange(currentValues.filter((value) => value !== condicion))
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal text-sm">{condicion}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="otraCondicionMedicaRelevante"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>¿Tiene alguna otra condición médica importante que no hayamos mencionado? (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Escriba cualquier otra condición médica relevante"
                            {...field}
                            className="text-sm md:text-base"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-blue-100 dark:border-slate-700">
                <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                  Estudios Médicos Realizados
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <FormField
                    control={form.control}
                    name="estudiosMedicosProblemaActual"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">
                          ¿Se ha hecho estudios médicos (análisis de sangre, radiografías, ultrasonidos, etc.) para evaluar el problema por el que nos consulta? <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            {opcionesEstudiosMedicos.map((op) => (
                              <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value={op.value} />
                                </FormControl>
                                <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        )
      case 4: // Seguro Médico
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Shield className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Su Seguro Médico
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Esta información nos ayuda a coordinar mejor su atención y los aspectos administrativos.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Tipo de Cobertura Médica</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="seguroMedico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Qué tipo de seguro médico tiene? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesSeguroMedico.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {form.watch("seguroMedico") === "otro_seguro" && (
                  <FormField
                    control={form.control}
                    name="otroSeguroMedico"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>
                          ¿Cuál es su tipo de seguro médico? <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Escriba el nombre de su seguro médico" {...field} className="text-sm md:text-base" />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {form.watch("seguroMedico") === "privado" && (
              <Card className="border-blue-100 dark:border-slate-700 shadow-sm mt-4">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                  <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">
                    Información de su Aseguradora
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <FormField
                    control={form.control}
                    name="aseguradoraSeleccionada"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm md:text-base">
                          ¿Cuál es su compañía aseguradora? <span className="text-red-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} defaultValue="">
                          <FormControl>
                            <SelectTrigger className="text-sm md:text-base">
                              <SelectValue placeholder="Seleccione su aseguradora" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {opcionesAseguradoras.map((opcion) => (
                              <SelectItem key={opcion.id} value={opcion.id}>
                                {opcion.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Seleccione la compañía con la que tiene su seguro médico privado
                        </FormDescription>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {form.watch("aseguradoraSeleccionada") === "otra" && (
                    <FormField
                      control={form.control}
                      name="otraAseguradora"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>
                            ¿Cuál es el nombre de su aseguradora? <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="Escriba el nombre de su compañía aseguradora" {...field} className="text-sm md:text-base" />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </motion.div>
        )
      case 5: // Síntomas Principales
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Stethoscope className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Sus Síntomas Principales
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Cuéntenos en detalle sobre los síntomas que lo han motivado a buscar atención médica.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">
                  Descripción de su Síntoma Principal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="descripcionSintomaPrincipal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Cuál es el síntoma o molestia principal que lo trae a consulta? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa con sus propias palabras qué es lo que más le molesta o preocupa. Por ejemplo: dolor en el abdomen, hinchazón, dificultad para digerir, etc."
                          className="min-h-[80px] text-sm md:text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Detalles del Síntoma</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <FormField
                  control={form.control}
                  name="desdeCuandoSintomaPrincipal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Desde hace cuánto tiempo tiene este síntoma principal? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesDesdeCuandoSintoma.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                <FormField
                  control={form.control}
                  name="severidadSintomasActuales"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Qué tan intensos son sus síntomas en general? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesSeveridadSintomas.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                <FormField
                  control={form.control}
                  name="intensidadDolorActual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        En una escala del 0 al 10, donde 0 significa "sin dolor" y 10 significa "el peor dolor imaginable", ¿qué número representa mejor su dolor o molestia en este momento? <span className="text-red-500">*</span>{" "}
                        <span className="font-bold text-lg text-primary">({field.value})</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(Number.parseInt(e.target.value, 10) || 0)}
                          className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </FormControl>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>0 (Sin dolor)</span>
                        <span>5 (Moderado)</span>
                        <span>10 (Insoportable)</span>
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      case 6: // Otros Síntomas
        return (
          <motion.div
            key="step6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Activity className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Otros Síntomas e Impacto en su Vida
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Información sobre otros síntomas que pueda tener y cómo afectan su día a día.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Síntomas Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="sintomasAdicionales"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">¿Ha notado alguno de estos otros síntomas?</FormLabel>
                      <FormDescription>Marque todos los que haya experimentado recientemente.</FormDescription>
                      <div className="grid grid-cols-1 gap-3 mt-2">
                        {listaSintomasAdicionales.map((sintoma) => (
                          <FormField
                            key={sintoma}
                            control={form.control}
                            name="sintomasAdicionales"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(sintoma)}
                                    onCheckedChange={(checked) => {
                                      const currentValues = field.value || []
                                      return checked
                                        ? field.onChange([...currentValues, sintoma])
                                        : field.onChange(currentValues.filter((value) => value !== sintoma))
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal text-sm leading-relaxed">{sintoma}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">
                  Impacto en sus Actividades Diarias
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="afectacionActividadesDiarias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Cómo afectan sus síntomas a sus actividades diarias (trabajo, hogar, ejercicio, etc.)? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesAfectacionActividades.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      case 7: // Preferencias
        return (
          <motion.div
            key="step7"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Star className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Lo Que es Más Importante para Usted
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Sus prioridades nos ayudan a personalizar su atención médica según lo que más le importa.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Sus Dos Prioridades Principales</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="aspectosMasImportantes"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        Al elegir un tratamiento o cirugía, ¿cuáles son los DOS aspectos más importantes para usted? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormDescription>
                        Esto nos ayuda a adaptar nuestra atención a lo que más valora. Seleccione exactamente 2 opciones.
                      </FormDescription>
                      <div className="grid grid-cols-1 gap-3 mt-2">
                        {opcionesAspectosImportantes.map((opcion) => (
                          <FormField
                            key={opcion.id}
                            control={form.control}
                            name="aspectosMasImportantes"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(opcion.id)
                              const isDisabled = !isChecked && field.value?.length >= 2
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || []
                                        if (checked) {
                                          if (currentValues.length < 2) {
                                            field.onChange([...currentValues, opcion.id])
                                          }
                                        } else {
                                          field.onChange(currentValues.filter((value) => value !== opcion.id))
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel
                                    className={cn("font-normal text-sm leading-relaxed", isDisabled && "text-muted-foreground")}
                                  >
                                    {opcion.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        Seleccionados: {form.watch("aspectosMasImportantes")?.length || 0} de 2
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      case 8: // Preocupaciones
        return (
          <motion.div
            key="step8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <HelpCircle className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Sus Preocupaciones sobre el Tratamiento
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Es normal tener preocupaciones. Conocerlas nos ayuda a abordarlas mejor durante su consulta.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">
                  Sus Principales Preocupaciones
                </CardTitle>
                <CardDescription>
                  Si se considera un procedimiento quirúrgico, ¿cuáles son sus principales preocupaciones? Seleccione hasta 3 opciones. <span className="text-red-500">*</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <FormField
                  control={form.control}
                  name="preocupacionesPrincipales"
                  render={() => (
                    <FormItem>
                      <div className="grid grid-cols-1 gap-3">
                        {factoresPreocupacion.map((factor) => (
                          <FormField
                            key={factor.id}
                            control={form.control}
                            name="preocupacionesPrincipales"
                            render={({ field }) => {
                              const isChecked = field.value?.includes(factor.id)
                              const isDisabled = !isChecked && field.value?.length >= 3
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 p-3 border rounded-md bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                                  <FormControl>
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={isDisabled}
                                      onCheckedChange={(checked) => {
                                        const currentValues = field.value || []
                                        if (checked) {
                                          if (currentValues.length < 3) {
                                            field.onChange([...currentValues, factor.id])
                                          }
                                        } else {
                                          field.onChange(currentValues.filter((value) => value !== factor.id))
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel
                                    className={cn(
                                      "font-normal text-sm leading-relaxed",
                                      isDisabled && "text-muted-foreground",
                                    )}
                                  >
                                    {factor.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                        Seleccionadas: {form.watch("preocupacionesPrincipales")?.length || 0} de 3 máximo
                      </div>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mayorPreocupacionCirugia"
                  render={({ field }) => (
                    <FormItem className="mt-6">
                      <FormLabel className="text-sm md:text-base">
                        ¿Hay alguna otra preocupación específica que le gustaría comentar? (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Comparta cualquier otra inquietud que tenga sobre el tratamiento o procedimiento..."
                          {...field}
                          className="text-sm md:text-base"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      case 9: // Expectativas
        return (
          <motion.div
            key="step9"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 md:space-y-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700/60 p-3 md:p-4 rounded-lg">
              <h3 className="text-base md:text-lg font-medium text-blue-800 dark:text-blue-300 flex items-center mb-2">
                <Target className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                Sus Expectativas y Tiempos
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Conocer sus expectativas y tiempos preferidos nos ayuda a planificar mejor su atención.
              </p>
            </div>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Tiempos y Decisiones</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <FormField
                  control={form.control}
                  name="plazoResolucionIdeal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿En qué tiempo le gustaría resolver su problema de salud? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesPlazoResolucion.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                <FormField
                  control={form.control}
                  name="tiempoTomaDecision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        Después de su consulta, ¿cuánto tiempo necesitaría para tomar una decisión sobre su tratamiento? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesTiempoDecision.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-blue-100 dark:border-slate-700 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950 pb-3">
                <CardTitle className="text-sm md:text-base font-medium text-blue-800 dark:text-blue-300">Lo Que Espera Lograr</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <FormField
                  control={form.control}
                  name="expectativaPrincipalTratamiento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Cuál es el principal resultado que espera obtener con el tratamiento? <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex flex-col space-y-2"
                        >
                          {opcionesExpectativaPrincipalTratamiento.map((op) => (
                            <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={op.value} />
                              </FormControl>
                              <FormLabel className="font-normal text-sm md:text-base">{op.label}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <Separator className="my-4" />

                <FormField
                  control={form.control}
                  name="informacionAdicionalImportante"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        ¿Hay algo más que considera importante que sepamos? (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Comparta cualquier información adicional sobre su situación, expectativas o inquietudes..."
                          {...field}
                          className="text-sm md:text-base"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mayorBeneficioEsperado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base">
                        En sus propias palabras, ¿cuál sería el mayor beneficio que espera obtener al tratar su condición? (Opcional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describa cómo le gustaría que mejore su vida después del tratamiento..."
                          {...field}
                          className="text-sm md:text-base"
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </motion.div>
        )
      default:
        return null
    }
  }

  // Renderizado de la revisión final
  const renderReviewStep = () => {
    const values = form.getValues()

    const getUbicacionDisplay = () => {
      if (values.ubicacionOrigen === "cdmx") {
        return `Ciudad de México - ${values.alcaldiaCDMX || "No especificada"}`
      }
      if (values.ubicacionOrigen === "estado_mexico") {
        const municipio = values.municipioEdoMex === "Otro municipio"
          ? values.otroMunicipioEdoMex || "No especificado"
          : values.municipioEdoMex || "No especificado"
        return `Estado de México - ${municipio}`
      }
      if (values.ubicacionOrigen === "otra_ciudad") {
        return values.otraCiudadMunicipio || "No especificada"
      }
      return "No especificada"
    }

    return (
      <motion.div
        key="reviewStep"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="space-y-4 md:space-y-6"
      >
        <div className="bg-green-50 dark:bg-green-900/50 border border-green-200 dark:border-green-700/60 p-3 md:p-4 rounded-lg">
          <h3 className="text-base md:text-lg font-medium text-green-800 dark:text-green-300 flex items-center mb-2">
            <CheckCircle2 className="mr-2 h-4 w-4 md:h-5 md:w-5" />
            ¡Casi Terminamos!
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400">
            Por favor, revise su información antes de enviar el cuestionario.
          </p>
        </div>

        <div className="rounded-lg border dark:border-slate-700 bg-card p-3 md:p-6 shadow-sm text-sm md:text-base">
          <Accordion type="multiple" className="w-full" defaultValue={["item-1"]}>
            <AccordionItem value="item-1" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Datos Personales y Ubicación
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p><strong>Nombre:</strong> {values.nombre} {values.apellidos}</p>
                  <p><strong>Edad:</strong> {values.edad} años</p>
                  <p><strong>Teléfono:</strong> {values.telefono}</p>
                  {values.email && <p><strong>Email:</strong> {values.email}</p>}
                  <p><strong>Ubicación:</strong> {getUbicacionDisplay()}</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Referencia y Motivo de Consulta
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Cómo nos conoció:</strong>{" "}
                    {opcionesComoNosConocio.find((o) => o.value === values.comoNosConocio)?.label}
                    {values.comoNosConocio === "otro" && ` (${values.otroComoNosConocio || "No especificado"})`}
                  </p>
                  <p>
                    <strong>Motivo de consulta:</strong>{" "}
                    {opcionesMotivoVisita.find((o) => o.value === values.motivoVisita)?.label}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Historial Médico
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Diagnóstico previo:</strong>{" "}
                    {values.diagnosticoPrevio ? `Sí (${values.diagnosticoPrincipalPrevio || "No especificado"})` : "No"}
                  </p>
                  {values.condicionesMedicasCronicas && values.condicionesMedicasCronicas.length > 0 && (
                    <p><strong>Condiciones médicas:</strong> {values.condicionesMedicasCronicas.join(", ")}</p>
                  )}
                  {values.otraCondicionMedicaRelevante && (
                    <p><strong>Otra condición relevante:</strong> {values.otraCondicionMedicaRelevante}</p>
                  )}
                  <p>
                    <strong>Estudios médicos realizados:</strong>{" "}
                    {opcionesEstudiosMedicos.find((o) => o.value === values.estudiosMedicosProblemaActual)?.label}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Seguro Médico
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Tipo de seguro:</strong>{" "}
                    {opcionesSeguroMedico.find((o) => o.value === values.seguroMedico)?.label}
                    {values.seguroMedico === "otro_seguro" && ` (${values.otroSeguroMedico || "No especificado"})`}
                  </p>
                  {values.seguroMedico === "privado" && (
                    <p>
                      <strong>Aseguradora:</strong>{" "}
                      {opcionesAseguradoras.find((o) => o.id === values.aseguradoraSeleccionada)?.label || "No seleccionada"}
                      {values.aseguradoraSeleccionada === "otra" && ` (${values.otraAseguradora || "No especificada"})`}
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Síntomas y Su Impacto
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p><strong>Síntoma principal:</strong> {values.descripcionSintomaPrincipal}</p>
                  <p>
                    <strong>Tiempo con el síntoma:</strong>{" "}
                    {opcionesDesdeCuandoSintoma.find((o) => o.value === values.desdeCuandoSintomaPrincipal)?.label}
                  </p>
                  <p>
                    <strong>Intensidad general:</strong>{" "}
                    {opcionesSeveridadSintomas.find((o) => o.value === values.severidadSintomasActuales)?.label}
                  </p>
                  <p><strong>Intensidad del dolor (0-10):</strong> {values.intensidadDolorActual}</p>
                  {values.sintomasAdicionales && values.sintomasAdicionales.length > 0 && (
                    <p><strong>Otros síntomas:</strong> {values.sintomasAdicionales.join(", ")}</p>
                  )}
                  <p>
                    <strong>Impacto en actividades diarias:</strong>{" "}
                    {opcionesAfectacionActividades.find((o) => o.value === values.afectacionActividadesDiarias)?.label}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6" className="border-blue-100 dark:border-slate-700">
              <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                Preferencias y Expectativas
              </AccordionTrigger>
              <AccordionContent className="pb-4 pt-2">
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>Aspectos más importantes:</strong>{" "}
                    {values.aspectosMasImportantes
                      ?.map((id) => opcionesAspectosImportantes.find((o) => o.id === id)?.label)
                      .filter(Boolean)
                      .join("; ") || "No seleccionados"}
                  </p>
                  <p>
                    <strong>Tiempo deseado para resolver el problema:</strong>{" "}
                    {opcionesPlazoResolucion.find((o) => o.value === values.plazoResolucionIdeal)?.label}
                  </p>
                  <p>
                    <strong>Tiempo para tomar una decisión:</strong>{" "}
                    {opcionesTiempoDecision.find((o) => o.value === values.tiempoTomaDecision)?.label}
                  </p>
                  <p>
                    <strong>Principal resultado esperado:</strong>{" "}
                    {opcionesExpectativaPrincipalTratamiento.find((o) => o.value === values.expectativaPrincipalTratamiento)?.label}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {values.preocupacionesPrincipales && values.preocupacionesPrincipales.length > 0 && (
              <AccordionItem value="item-7" className="border-blue-100 dark:border-slate-700">
                <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                  Preocupaciones sobre el Tratamiento
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>Principales preocupaciones:</strong>{" "}
                      {values.preocupacionesPrincipales
                        .map(id => factoresPreocupacion.find(f => f.id === id)?.label)
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {values.mayorPreocupacionCirugia && (
                      <p><strong>Preocupación adicional:</strong> {values.mayorPreocupacionCirugia}</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {(values.informacionAdicionalImportante || values.mayorBeneficioEsperado) && (
              <AccordionItem value="item-8" className="border-blue-100 dark:border-slate-700">
                <AccordionTrigger className="text-blue-800 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-400 py-3 text-sm md:text-base">
                  Información Adicional
                </AccordionTrigger>
                <AccordionContent className="pb-4 pt-2">
                  <div className="space-y-2 text-sm">
                    {values.informacionAdicionalImportante && (
                      <p><strong>Información adicional:</strong> {values.informacionAdicionalImportante}</p>
                    )}
                    {values.mayorBeneficioEsperado && (
                      <p><strong>Beneficio principal esperado:</strong> {values.mayorBeneficioEsperado}</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        <div className="flex items-center space-x-2 text-sm mt-6">
          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <p className="text-muted-foreground">
            Al enviar este cuestionario, acepta que la información proporcionada sea utilizada para fines médicos de acuerdo con nuestro aviso de privacidad.
          </p>
        </div>

        {submitError && (
          <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700/60 p-3 md:p-4 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" /> {submitError}
            </p>
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-xl border-0 my-4 md:my-8 bg-card dark:bg-slate-900">
      <CardHeader className="border-b dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-t-lg p-3 md:p-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1 truncate">
              {surveyDataMeta?.title}
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 text-sm md:text-base">
              {surveyDataMeta?.description}
            </CardDescription>
          </div>
          {lastSaved && (
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center whitespace-nowrap">
              {isSaving ? (
                <span className="flex items-center">
                  <LoadingSpinner className="mr-1 h-3 w-3 animate-spin" /> Guardando...
                </span>
              ) : (
                <span className="flex items-center">
                  <Save className="h-3 w-3 mr-1" /> Guardado:{" "}
                  {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Indicador de progreso optimizado */}
        <div className="mt-4 md:mt-6">
          {!isMobile ? (
            <div className="hidden md:flex w-full items-start">
              {pasos.map((paso, index) => (
                <div key={paso.id} className={cn("flex-1 text-center relative group")}>
                  <div className="flex items-center justify-center">
                    {index > 0 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors duration-300",
                          currentStep > paso.id || currentStep === totalSteps + 1
                            ? "bg-blue-600 dark:bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-600",
                        )}
                      />
                    )}
                    <div
                      className={cn(
                        "w-8 h-8 md:w-10 md:h-10 mx-auto rounded-full flex items-center justify-center mb-1 text-lg font-medium border-2 transition-all duration-300",
                        currentStep > paso.id || currentStep === totalSteps + 1
                          ? "bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500"
                          : currentStep === paso.id
                            ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500 scale-110"
                            : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600",
                      )}
                    >
                      {paso.icono}
                    </div>
                    {index < pasos.length - 1 && (
                      <div
                        className={cn(
                          "flex-1 h-0.5 transition-colors duration-300",
                          currentStep > paso.id + 1 || currentStep === totalSteps + 1 // Corrected logic for line after current step
                            ? "bg-blue-600 dark:bg-blue-500"
                            : "bg-slate-300 dark:bg-slate-600",
                        )}
                      />
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-xs font-medium transition-colors duration-300 mt-1",
                      currentStep >= paso.id || currentStep === totalSteps + 1
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {paso.titulo}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-lg font-medium border-2 flex-shrink-0",
                    "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-500",
                  )}
                >
                  {pasos[Math.min(currentStep, totalSteps) - 1]?.icono}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-300 truncate">
                    Paso {Math.min(currentStep, totalSteps +1 > totalSteps ? totalSteps : currentStep )} de {totalSteps}:{" "}
                    {currentStep <= totalSteps ? pasos[currentStep -1]?.titulo : "Revisión"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">
                  {currentStep <= totalSteps ? pasos[currentStep -1]?.descripcion : "Revise sus respuestas"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 md:h-2.5 mt-2">
            <div
              className="bg-blue-600 dark:bg-blue-500 h-1.5 md:h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(Math.min(currentStep, totalSteps +1) / (totalSteps +1)) * 100}%` }} // totalSteps + 1 to include review step in progress
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 md:pt-8 pb-4 md:pb-8 px-3 md:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
            <AnimatePresence mode="wait">
              {currentStep <= totalSteps ? renderStepContent() : renderReviewStep()}
            </AnimatePresence>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-between border-t dark:border-slate-700 p-3 md:p-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-950 rounded-b-lg">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1 || isSubmitting}
          className="flex items-center text-sm px-3 py-2 md:px-4"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>

        {currentStep <= totalSteps ? (
          <Button
            type="button"
            onClick={nextStep} // Changed to not use form.handleSubmit here for step-by-step validation
            disabled={isSubmitting || isSaving}
            className="flex items-center bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm px-3 py-2 md:px-4"
          >
            {currentStep === totalSteps ? "Revisar Respuestas" : "Siguiente"}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button" // Changed to button, onSubmit is handled by the form tag's onSubmit
            onClick={form.handleSubmit(onSubmit)} // Trigger final submission
            disabled={isSubmitting || isSaving}
            className="flex items-center bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white text-sm px-3 py-2 md:px-4"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Cuestionario"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
