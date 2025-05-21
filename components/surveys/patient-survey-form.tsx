"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button" // Asumiendo que son componentes ShadCN UI
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Save, Loader2 as LoadingSpinner } from "lucide-react" 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/src/lib/utils" // Asumiendo que esta utilidad existe

// Mock useAppContext si no está disponible
const useAppContext = () => ({
  updatePatient: (patientId: number, data: any) => {
    console.log("Mock updatePatient called with:", patientId, data);
    return Promise.resolve();
  }
});

// Hook para detectar dispositivos móviles
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

// Definición del tipo para los síntomas
export type Symptom = string

// Interfaz FormData actualizada
interface FormData {
  // Paso 1: Datos Personales y Antecedentes
  nombre: string
  apellidos: string
  edad: number
  telefono: string
  email?: string
  comoNosConocio:
    | "pagina_web_google"
    | "redes_sociales"
    | "recomendacion_medico"
    | "recomendacion_familiar_amigo"
    | "seguro_medico"
    | "otro"
  otroComoNosConocio?: string
  motivoVisita: "diagnostico" | "opciones_tratamiento" | "segunda_opinion" | "programar_cirugia" | "valoracion_general"
  diagnosticoPrevio: boolean
  diagnosticoPrincipalPrevio?: string
  detallesAdicionalesDiagnosticoPrevio?: string

  // Paso 2: Síntomas y Salud General
  seguroMedico: "imss" | "issste" | "privado" | "ninguno" | "otro_seguro"
  otroSeguroMedico?: string
  // Cambio: de múltiple selección a selección única
  aseguradoraSeleccionada?: string
  otraAseguradora?: string
  descripcionSintomaPrincipal: string
  sintomasAdicionales?: Symptom[]
  desdeCuandoSintomaPrincipal: "menos_2_semanas" | "2_4_semanas" | "1_6_meses" | "mas_6_meses"
  severidadSintomasActuales: "leve" | "moderada" | "severa"
  intensidadDolorActual: number // Escala 0-10
  afectacionActividadesDiarias: "ninguna" | "un_poco" | "moderadamente" | "mucho"
  condicionesMedicasCronicas?: string[]
  otraCondicionMedicaRelevante?: string
  estudiosMedicosProblemaActual: "si" | "no" | "no_seguro"

  // Paso 3: Preferencias
  aspectosMasImportantes: string[] // Array de strings para los 2 más importantes

  // Paso 4: Preocupaciones
  preocupacionCostoTotal: number // Escala 1-5
  preocupacionManejoDolor: number // Escala 1-5
  preocupacionRiesgosComplicaciones: number // Escala 1-5
  preocupacionAnestesia: number // Escala 1-5
  preocupacionTiempoRecuperacion: number // Escala 1-5
  preocupacionFaltarTrabajo: number // Escala 1-5
  preocupacionNoApoyoCasa: number // Escala 1-5
  preocupacionNoSeguroMejorOpcion: number // Escala 1-5
  mayorPreocupacionCirugia?: string

  // Paso 5: Expectativas
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

// Esquema de validación Zod actualizado
const surveySchema = z
  .object({
    // Paso 1
    nombre: z.string().min(2, { message: "El nombre es requerido." }),
    apellidos: z.string().min(2, { message: "Los apellidos son requeridos." }),
    edad: z.coerce.number().min(1, { message: "La edad es requerida." }).max(120, { message: "Ingrese una edad válida." }),
    telefono: z.string().min(10, { message: "Ingrese un número de teléfono válido de 10 dígitos." }).max(15, { message: "El teléfono es demasiado largo." }),
    email: z.string().email({ message: "Ingrese un correo electrónico válido." }).optional().or(z.literal("")),
    comoNosConocio: z.enum(
      ["pagina_web_google", "redes_sociales", "recomendacion_medico", "recomendacion_familiar_amigo", "seguro_medico", "otro"],
      { required_error: "¿Cómo se enteró de nuestra clínica? es requerido." }
    ),
    otroComoNosConocio: z.string().optional(),
    motivoVisita: z.enum(
      ["diagnostico", "opciones_tratamiento", "segunda_opinion", "programar_cirugia", "valoracion_general"],
      { required_error: "El motivo principal de su visita es requerido." }
    ),
    diagnosticoPrevio: z.boolean(),
    diagnosticoPrincipalPrevio: z.string().optional(),
    detallesAdicionalesDiagnosticoPrevio: z.string().optional(),

    // Paso 2
    seguroMedico: z.enum(["imss", "issste", "privado", "ninguno", "otro_seguro"], {
      required_error: "Seleccione una opción de seguro médico.",
    }),
    otroSeguroMedico: z.string().optional(),
    // Cambio: Ahora es selección única en lugar de multiple
    aseguradoraSeleccionada: z.string().optional(),
    otraAseguradora: z.string().optional(),
    descripcionSintomaPrincipal: z.string().min(5, { message: "Describa su síntoma principal (mínimo 5 caracteres)." }),
    sintomasAdicionales: z.array(z.string()).optional(),
    desdeCuandoSintomaPrincipal: z.enum(["menos_2_semanas", "2_4_semanas", "1_6_meses", "mas_6_meses"], {
      required_error: "¿Desde cuándo tiene su síntoma principal? es requerido.",
    }),
    severidadSintomasActuales: z.enum(["leve", "moderada", "severa"], {
      required_error: "La severidad de sus síntomas es requerida.",
    }),
    intensidadDolorActual: z.coerce.number().min(0, "La intensidad debe ser entre 0 y 10.").max(10, "La intensidad debe ser entre 0 y 10."),
    afectacionActividadesDiarias: z.enum(["ninguna", "un_poco", "moderadamente", "mucho"], {
      required_error: "La afectación de actividades diarias es requerida.",
    }),
    condicionesMedicasCronicas: z.array(z.string()).optional(),
    otraCondicionMedicaRelevante: z.string().optional(),
    estudiosMedicosProblemaActual: z.enum(["si", "no", "no_seguro"], {
      required_error: "Indique si se ha realizado estudios médicos.",
    }),

    // Paso 3
    aspectosMasImportantes: z.array(z.string())
        .min(2, { message: "Por favor, seleccione dos aspectos." })
        .max(2, { message: "Por favor, seleccione solo dos aspectos." }),

    // Paso 4
    preocupacionCostoTotal: z.coerce.number().min(1).max(5),
    preocupacionManejoDolor: z.coerce.number().min(1).max(5),
    preocupacionRiesgosComplicaciones: z.coerce.number().min(1).max(5),
    preocupacionAnestesia: z.coerce.number().min(1).max(5),
    preocupacionTiempoRecuperacion: z.coerce.number().min(1).max(5),
    preocupacionFaltarTrabajo: z.coerce.number().min(1).max(5),
    preocupacionNoApoyoCasa: z.coerce.number().min(1).max(5),
    preocupacionNoSeguroMejorOpcion: z.coerce.number().min(1).max(5),
    mayorPreocupacionCirugia: z.string().optional(),

    // Paso 5
    plazoResolucionIdeal: z.enum(["urgente", "proximo_mes", "2_3_meses", "sin_prisa"], {
      required_error: "El plazo ideal de resolución es requerido.",
    }),
    tiempoTomaDecision: z.enum(["misma_consulta_dias", "dias", "semanas_familia", "depende_complejidad"], {
      required_error: "El tiempo para tomar una decisión es requerido.",
    }),
    expectativaPrincipalTratamiento: z.enum(
      ["eliminar_dolor_sintomas", "volver_actividades_normales", "prevenir_problemas_futuros", "recuperacion_rapida_minimas_molestias"],
      { required_error: "Su principal expectativa es requerida." }
    ),
    informacionAdicionalImportante: z.string().optional(),
    mayorBeneficioEsperado: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.comoNosConocio === "otro" && (!data.otroComoNosConocio || data.otroComoNosConocio.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique cómo nos conoció.",
        path: ["otroComoNosConocio"],
      })
    }
    if (data.diagnosticoPrevio && (!data.diagnosticoPrincipalPrevio || data.diagnosticoPrincipalPrevio.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su diagnóstico principal previo.",
        path: ["diagnosticoPrincipalPrevio"],
      })
    }
    if (data.seguroMedico === "otro_seguro" && (!data.otroSeguroMedico || data.otroSeguroMedico.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique su otro seguro médico.",
        path: ["otroSeguroMedico"],
      })
    }
    // Validación actualizada para aseguradora única
    if (data.seguroMedico === "privado" && !data.aseguradoraSeleccionada) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, seleccione una aseguradora.",
        path: ["aseguradoraSeleccionada"],
      })
    }
    if (data.seguroMedico === "privado" && data.aseguradoraSeleccionada === "otra" && (!data.otraAseguradora || data.otraAseguradora.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Por favor, especifique la otra aseguradora.",
        path: ["otraAseguradora"],
      })
    }
  })

type SurveyFormValues = z.infer<typeof surveySchema>

interface PatientSurveyFormProps {
  patientId?: number
  surveyId: string
  onComplete?: (data: SurveyFormValues) => void
  onSubmitSuccess?: (data: SurveyFormValues) => void
  standalone?: boolean
  initialData?: Partial<SurveyFormValues>
}

// Opciones para los campos de selección múltiple y radio
const opcionesComoNosConocio = [
  { value: "pagina_web_google", label: "Página web / Búsqueda en Google" },
  { value: "redes_sociales", label: "Redes Sociales (Facebook, Instagram, etc.)" },
  { value: "recomendacion_medico", label: "Recomendación de otro médico" },
  { value: "recomendacion_familiar_amigo", label: "Recomendación de un familiar o amigo" },
  { value: "seguro_medico", label: "A través de mi seguro médico" },
  { value: "otro", label: "Otro" },
]

const opcionesMotivoVisita = [
  { value: "diagnostico", label: "Necesito un diagnóstico claro para mis síntomas." },
  { value: "opciones_tratamiento", label: "Quiero conocer mis opciones de tratamiento (incluyendo cirugía)." },
  { value: "segunda_opinion", label: "Busco una segunda opinión sobre un diagnóstico o tratamiento." },
  { value: "programar_cirugia", label: "Ya he decidido operarme y vengo a programar la cirugía." },
  { value: "valoracion_general", label: "Deseo una valoración médica general de mi condición." },
]

const opcionesSeguroMedico = [
  { value: "imss", label: "IMSS" },
  { value: "issste", label: "ISSSTE" },
  { value: "privado", label: "Seguro de Gastos Médicos Mayores (Privado)" },
  { value: "ninguno", label: "No cuento con seguro" },
  { value: "otro_seguro", label: "Otro" },
]

const opcionesAseguradoras = [
  { id: "gnp", label: "GNP" },
  { id: "axa", label: "AXA" },
  { id: "bupa", label: "BUPA" },
  { id: "mapfre", label: "MAPFRE" },
  { id: "qualitas", label: "Qualitas" },
  { id: "atlas", label: "Atlas" },
  { id: "metlife", label: "MetLife" },
  { id: "otra", label: "Otra (especificar)" },
]

const listaSintomasAdicionales: Symptom[] = [
  "Dolor que aumenta con esfuerzos (toser, cargar peso)",
  "Dolor que lo despierta por la noche",
  "Náuseas o Vómitos",
  "Falta de apetito o pérdida de peso reciente",
  "Fiebre",
  "Coloración amarilla en piel u ojos (ictericia)",
  "Dificultad para moverse o realizar actividades",
  "Acidez, reflujo o indigestión frecuente",
  "Dolor después de comer (especialmente alimentos grasosos)",
  "Hinchazón o distensión abdominal",
]

const opcionesDesdeCuandoSintoma = [
  { value: "menos_2_semanas", label: "Menos de 2 semanas" },
  { value: "2_4_semanas", label: "Entre 2 y 4 semanas" },
  { value: "1_6_meses", label: "Entre 1 y 6 meses" },
  { value: "mas_6_meses", label: "Más de 6 meses" },
]

const opcionesSeveridadSintomas = [
  { value: "leve", label: "Leve (Molestias ocasionales, no me limitan mucho)" },
  { value: "moderada", label: "Moderada (Molestias frecuentes, limitan algunas actividades)" },
  { value: "severa", label: "Severa (Molestias constantes/intensas, limitan significativamente)" },
]

const opcionesAfectacionActividades = [
  { value: "ninguna", label: "No, realizo mis actividades sin problemas." },
  { value: "un_poco", label: "Un poco, algunas actividades me cuestan más." },
  { value: "moderadamente", label: "Moderadamente, he tenido que evitar/modificar actividades." },
  { value: "mucho", label: "Mucho, me impiden realizar varias actividades importantes." },
]

const listaCondicionesMedicasCronicas = [
  "Presión alta (Hipertensión)",
  "Diabetes (Azúcar alta en la sangre)",
  "Obesidad o Sobrepeso importante",
  "Problemas del corazón (infartos, arritmias, etc.)",
  "Problemas pulmonares (Asma, EPOC, bronquitis crónica)",
  "Enfermedades de la tiroides",
]

const opcionesEstudiosMedicos = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no_seguro", label: "No estoy seguro/a" },
]

const opcionesAspectosImportantes = [
  { id: "seguridad", label: "La seguridad del procedimiento y mínimos riesgos" },
  { id: "experiencia_cirujano", label: "La experiencia y habilidad del cirujano" },
  { id: "costo_accesible", label: "Un costo que sea accesible para mí" },
  { id: "proceso_rapido", label: "Que el proceso de atención sea rápido y eficiente" },
  { id: "atencion_personalizada", label: "Recibir una atención médica cercana, clara y personalizada" },
  { id: "calidad_instalaciones", label: "La calidad y comodidad de las instalaciones" },
]

const factoresPreocupacion = [
  { name: "preocupacionCostoTotal", label: "El costo total del procedimiento" },
  { name: "preocupacionManejoDolor", label: "El manejo del dolor (durante y después)" },
  { name: "preocupacionRiesgosComplicaciones", label: "Los posibles riesgos o complicaciones" },
  { name: "preocupacionAnestesia", label: "La anestesia y sus efectos" },
  { name: "preocupacionTiempoRecuperacion", label: "El tiempo que tardaré en recuperarme" },
  { name: "preocupacionFaltarTrabajo", label: "La necesidad de faltar al trabajo" },
  { name: "preocupacionNoApoyoCasa", label: "No contar con apoyo en casa para la recuperación" },
  { name: "preocupacionNoSeguroMejorOpcion", label: "No estar seguro/a si la cirugía es la mejor opción" },
] as const

const opcionesPlazoResolucion = [
  { value: "urgente", label: "Lo antes posible, siento que es urgente." },
  { value: "proximo_mes", label: "En el próximo mes, si es posible." },
  { value: "2_3_meses", label: "En los próximos 2 o 3 meses." },
  { value: "sin_prisa", label: "No tengo una prisa particular, cuando sea más conveniente." },
]

const opcionesTiempoDecision = [
  { value: "misma_consulta_dias", label: "Podría decidir en la misma consulta o en los siguientes días." },
  { value: "dias", label: "Necesitaría algunos días para pensarlo y analizarlo." },
  { value: "semanas_familia", label: "Probablemente necesite algunas semanas y consultar con mi familia/pareja." },
  { value: "depende_complejidad", label: "Dependerá mucho de la complejidad y las opciones que me presente el doctor." },
]

const opcionesExpectativaPrincipalTratamiento = [
  { value: "eliminar_dolor_sintomas", label: "Eliminar por completo el dolor y los síntomas que tengo." },
  { value: "volver_actividades_normales", label: "Poder volver a realizar todas mis actividades diarias sin limitaciones." },
  { value: "prevenir_problemas_futuros", label: "Prevenir problemas de salud más graves en el futuro relacionados con mi condición." },
  { value: "recuperacion_rapida_minimas_molestias", label: "Tener una recuperación rápida, con mínimas molestias y sin complicaciones." },
]

// Definición de los pasos de la encuesta
const pasos = [
  { id: 1, titulo: "Datos Personales", descripcion: "Información básica y antecedentes", icono: "👤" },
  { id: 2, titulo: "Síntomas y Salud", descripcion: "Detalles sobre su condición actual", icono: "🩺" },
  { id: 3, titulo: "Preferencias", descripcion: "Sus prioridades para el tratamiento", icono: "⭐" },
  { id: 4, titulo: "Preocupaciones", descripcion: "Dudas sobre el procedimiento", icono: "❓" },
  { id: 5, titulo: "Expectativas", descripcion: "Lo que espera del tratamiento", icono: "🎯" },
]

export default function PatientSurveyForm({
  patientId,
  surveyId,
  onComplete,
  onSubmitSuccess,
  initialData,
}: PatientSurveyFormProps) {
  const router = useRouter()
  const { updatePatient } = useAppContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [surveyDataMeta, setSurveyDataMeta] = useState<{ id: string; title: string; description: string } | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = pasos.length
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const isMobile = useIsMobile()

  // Valores iniciales por defecto
  const defaultValues: SurveyFormValues = {
    // Paso 1
    nombre: "",
    apellidos: "",
    edad: 30,
    telefono: "",
    email: "",
    comoNosConocio: "pagina_web_google",
    otroComoNosConocio: "",
    motivoVisita: "diagnostico",
    diagnosticoPrevio: false,
    diagnosticoPrincipalPrevio: "",
    detallesAdicionalesDiagnosticoPrevio: "",

    // Paso 2
    seguroMedico: "ninguno",
    otroSeguroMedico: "",
    aseguradoraSeleccionada: "", // Ahora es una cadena simple en lugar de un array
    otraAseguradora: "",
    descripcionSintomaPrincipal: "",
    sintomasAdicionales: [],
    desdeCuandoSintomaPrincipal: "menos_2_semanas",
    severidadSintomasActuales: "leve",
    intensidadDolorActual: 0,
    afectacionActividadesDiarias: "ninguna",
    condicionesMedicasCronicas: [],
    otraCondicionMedicaRelevante: "",
    estudiosMedicosProblemaActual: "no_seguro",

    // Paso 3
    aspectosMasImportantes: [],

    // Paso 4
    preocupacionCostoTotal: 1,
    preocupacionManejoDolor: 1,
    preocupacionRiesgosComplicaciones: 1,
    preocupacionAnestesia: 1,
    preocupacionTiempoRecuperacion: 1,
    preocupacionFaltarTrabajo: 1,
    preocupacionNoApoyoCasa: 1,
    preocupacionNoSeguroMejorOpcion: 1,
    mayorPreocupacionCirugia: "",

    // Paso 5
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

  // Simular carga de metadatos de la encuesta
  useEffect(() => {
    const timer = setTimeout(() => {
      setSurveyDataMeta({
        id: surveyId,
        title: "Evaluación Inicial de Paciente",
        description: "Por favor complete esta encuesta para ayudarnos a entender mejor su condición médica.",
      })
      setIsLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [surveyId])

  // Cargar datos guardados del localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(`survey_${surveyId}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        form.reset(parsedData.formData)
        setLastSaved(new Date(parsedData._timestamp || Date.now()))
        setCurrentStep(parsedData.currentStep || 1)
      } catch (error) {
        console.error("Error al cargar datos guardados:", error)
        localStorage.removeItem(`survey_${surveyId}`)
      }
    }
  }, [surveyId, form])

  // Guardar progreso
  const saveProgress = useCallback(() => {
    if (!form.formState.isDirty && currentStep === (JSON.parse(localStorage.getItem(`survey_${surveyId}`) || '{}').currentStep)) return

    setIsSaving(true)
    const formData = form.getValues()
    const dataToSave = {
      formData,
      currentStep,
      _timestamp: Date.now(),
    }
    localStorage.setItem(`survey_${surveyId}`, JSON.stringify(dataToSave))
    
    setTimeout(() => {
      setIsSaving(false)
      setLastSaved(new Date())
      form.reset({}, { keepValues: true }) // Reset dirty state after saving
    }, 500)
  }, [form, currentStep, surveyId])

  // Guardar automáticamente cada 30 segundos si hay cambios
  useEffect(() => {
    const interval = setInterval(() => {
      if (form.formState.isDirty) {
        saveProgress()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [form.formState.isDirty, saveProgress])

  // Función para obtener los campos a validar según el paso actual
  const getFieldsToValidate = (step: number): (keyof SurveyFormValues)[] => {
    switch (step) {
      case 1:
        const fields: (keyof SurveyFormValues)[] = [
          "nombre", "apellidos", "edad", "telefono", 
          "comoNosConocio", "motivoVisita", "diagnosticoPrevio"
        ]
        
        if (form.getValues("comoNosConocio") === "otro") 
          fields.push("otroComoNosConocio")
          
        if (form.getValues("diagnosticoPrevio")) 
          fields.push("diagnosticoPrincipalPrevio")
          
        return fields
        
      case 2:
        const symptomFields: (keyof SurveyFormValues)[] = [
          "seguroMedico", "descripcionSintomaPrincipal",
          "desdeCuandoSintomaPrincipal", "severidadSintomasActuales",
          "intensidadDolorActual", "afectacionActividadesDiarias",
          "estudiosMedicosProblemaActual",
        ]
        
        if (form.getValues("seguroMedico") === "otro_seguro") 
          symptomFields.push("otroSeguroMedico")
          
        if (form.getValues("seguroMedico") === "privado") {
          symptomFields.push("aseguradoraSeleccionada")
          if (form.getValues("aseguradoraSeleccionada") === "otra") 
            symptomFields.push("otraAseguradora")
        }
        
        return symptomFields
        
      case 3:
        return ["aspectosMasImportantes"]
        
      case 4:
        return [
          "preocupacionCostoTotal", "preocupacionManejoDolor",
          "preocupacionRiesgosComplicaciones", "preocupacionAnestesia",
          "preocupacionTiempoRecuperacion", "preocupacionFaltarTrabajo",
          "preocupacionNoApoyoCasa", "preocupacionNoSeguroMejorOpcion",
        ]
        
      case 5:
        return [
          "plazoResolucionIdeal", "tiempoTomaDecision", 
          "expectativaPrincipalTratamiento"
        ]
        
      default:
        return []
    }
  }

  const nextStep = async () => {
    const fieldsToValidate = getFieldsToValidate(currentStep)
    const result = await form.trigger(fieldsToValidate)

    if (result) {
      saveProgress()
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps + 1))
      window.scrollTo({ top: 0, behavior: "smooth" })
    } else {
      // Encontrar el primer campo con error y scrollear hasta él
      const errors = form.formState.errors
      const firstErrorField = fieldsToValidate.find(field => errors[field])
      if (firstErrorField) {
        const element = document.getElementsByName(firstErrorField)[0]
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }

  const prevStep = () => {
    saveProgress()
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onSubmit = async (data: SurveyFormValues) => {
    setIsSubmitting(true)
    setSubmitError(null)
    console.log("Datos de la encuesta a enviar:", data)

    try {
      // Simular llamada a API
      await new Promise((resolve) => setTimeout(resolve, 1500))
      
      console.log("Encuesta enviada con éxito")

      if (patientId && updatePatient) {
        await updatePatient(patientId, {
          encuesta: data,
          estado: "Pendiente de consulta",
        })
      }

      localStorage.removeItem(`survey_${surveyId}`)

      if (onComplete) onComplete(data)
      if (onSubmitSuccess) {
        onSubmitSuccess(data)
      } else {
        router.push(`/survey/gracias?id=${surveyId || "test"}`)
      }
    } catch (error) {
      console.error("Error al enviar la encuesta:", error)
      setSubmitError("Hubo un error al enviar el formulario. Por favor intente nuevamente más tarde.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="h-10 w-10 animate-spin text-primary" />
      </div>
    )
  }

  // Renderizado de pasos de formulario  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Datos Personales y Antecedentes
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.3 }} 
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nombre" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre(s) <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Sus nombre(s)" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="apellidos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Apellidos <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Sus apellidos" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="edad" render={({ field }) => (
                <FormItem>
                  <FormLabel>Edad <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input type="number" placeholder="Su edad" {...field} onChange={e => field.onChange(parseInt(e.target.value,10) || 0)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="telefono" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono Celular <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input type="tel" placeholder="Su número de celular" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico (Opcional)</FormLabel>
                <FormControl><Input type="email" placeholder="Su correo electrónico" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="comoNosConocio" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cómo se enteró de nuestra clínica? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesComoNosConocio.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            {form.watch("comoNosConocio") === "otro" && (
              <FormField control={form.control} name="otroComoNosConocio" render={({ field }) => (
                <FormItem>
                  <FormLabel>Por favor, especifique cómo nos conoció: <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Especifique otro medio" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            <FormField control={form.control} name="motivoVisita" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cuál es el principal motivo de su visita hoy? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesMotivoVisita.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="diagnosticoPrevio" render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>¿Ya cuenta con un diagnóstico médico previo relacionado con el motivo de esta consulta?</FormLabel>
                </div>
              </FormItem>
            )} />
            {form.watch("diagnosticoPrevio") && (
              <>
                <FormField control={form.control} name="diagnosticoPrincipalPrevio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Cuál es su diagnóstico principal previo? <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="Ej: Hernia inguinal, Apendicitis" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="detallesAdicionalesDiagnosticoPrevio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>(Opcional) ¿Algún otro detalle relevante sobre ese diagnóstico?</FormLabel>
                    <FormControl><Textarea placeholder="Ej: Quién lo diagnosticó, fecha aproximada, tratamientos previos..." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
          </motion.div>
        )
      case 2: // Síntomas y Salud General
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.3 }} 
            className="space-y-6"
          >
            <FormField control={form.control} name="seguroMedico" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cuenta con seguro médico? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesSeguroMedico.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            {form.watch("seguroMedico") === "otro_seguro" && (
              <FormField control={form.control} name="otroSeguroMedico" render={({ field }) => (
                <FormItem>
                  <FormLabel>Por favor, especifique su otro seguro médico: <span className="text-red-500">*</span></FormLabel>
                  <FormControl><Input placeholder="Nombre del seguro" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            
            {form.watch("seguroMedico") === "privado" && (
              <>
                {/* Control de aseguradora mejorado con Select */}
                <FormField
                  control={form.control}
                  name="aseguradoraSeleccionada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seleccione su aseguradora: <span className="text-red-500">*</span></FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
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
                        Seleccione la aseguradora con la que cuenta actualmente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {form.watch("aseguradoraSeleccionada") === "otra" && (
                  <FormField control={form.control} name="otraAseguradora" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Especifique otra aseguradora: <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input placeholder="Nombre de la otra aseguradora" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}
              </>
            )}
            
            <FormField control={form.control} name="descripcionSintomaPrincipal" render={({ field }) => (
                <FormItem>
                    <FormLabel>Describa brevemente su síntoma o molestia principal: <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Textarea placeholder="Ej: Dolor en el abdomen, tengo una bolita en la ingle..." {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            
            <FormField control={form.control} name="sintomasAdicionales" render={() => (
                <FormItem>
                    <FormLabel>Además de su molestia principal, ¿presenta alguno de estos otros síntomas?</FormLabel>
                    <FormDescription>Marque los que apliquen.</FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
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
                                    const currentValues = field.value || [];
                                    return checked
                                    ? field.onChange([...currentValues, sintoma])
                                    : field.onChange(currentValues.filter((value) => value !== sintoma));
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">{sintoma}</FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
            
            <FormField control={form.control} name="desdeCuandoSintomaPrincipal" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Desde cuándo tiene su síntoma principal de forma más notable? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesDesdeCuandoSintoma.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="severidadSintomasActuales" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cómo describiría la severidad general de sus síntomas actuales? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesSeveridadSintomas.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal text-sm">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="intensidadDolorActual" render={({ field }) => (
              <FormItem>
                <FormLabel>En una escala del 0 al 10 (0 = sin dolor, 10 = peor dolor imaginable), ¿qué tan intenso es su dolor o molestia principal en este momento? <span className="text-red-500">*</span> <span className="font-bold text-primary">{field.value}</span></FormLabel>
                <FormControl>
                  <Input type="range" min="0" max="10" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                </FormControl>
                 <div className="flex justify-between text-xs text-muted-foreground"><span>0 (Sin dolor)</span><span>5 (Moderado)</span><span>10 (Peor imaginable)</span></div>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="afectacionActividadesDiarias" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cómo estos síntomas afectan su capacidad para realizar sus actividades diarias? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesAfectacionActividades.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal text-sm">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="condicionesMedicasCronicas" render={() => (
                <FormItem>
                    <FormLabel>¿Padece alguna de estas condiciones médicas de forma crónica?</FormLabel>
                    <FormDescription>Marque todas las que apliquen.</FormDescription>
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
                                    const currentValues = field.value || [];
                                    return checked
                                    ? field.onChange([...currentValues, condicion])
                                    : field.onChange(currentValues.filter((value) => value !== condicion));
                                }}
                                />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">{condicion}</FormLabel>
                            </FormItem>
                        )}
                        />
                    ))}
                    </div>
                    <FormMessage />
                </FormItem>
            )} />
            
            <FormField control={form.control} name="otraCondicionMedicaRelevante" render={({ field }) => (
              <FormItem>
                <FormLabel>Otra condición médica relevante (Opcional)</FormLabel>
                <FormControl><Input placeholder="Especifique si tiene otra condición no listada" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            
            <FormField control={form.control} name="estudiosMedicosProblemaActual" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Se ha realizado estudios médicos para investigar su problema actual? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesEstudiosMedicos.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </motion.div>
        )
      case 3: // Preferencias
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.3 }} 
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="aspectosMasImportantes"
              render={() => (
                <FormItem>
                  <FormLabel className="text-base">Al pensar en un tratamiento o cirugía, seleccione los DOS aspectos que considera MÁS IMPORTANTES: <span className="text-red-500">*</span></FormLabel>
                  <FormDescription>Esto nos ayudará a entender sus prioridades.</FormDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 mt-2">
                    {opcionesAspectosImportantes.map((opcion) => (
                      <FormField
                        key={opcion.id}
                        control={form.control}
                        name="aspectosMasImportantes"
                        render={({ field }) => {
                          const isChecked = field.value?.includes(opcion.id);
                          const isDisabled = !isChecked && field.value?.length >= 2;
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={isChecked}
                                  disabled={isDisabled}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      if (currentValues.length < 2) {
                                        field.onChange([...currentValues, opcion.id]);
                                      }
                                    } else {
                                      field.onChange(currentValues.filter((value) => value !== opcion.id));
                                    }
                                  }}
                                />
                              </FormControl>
                              <FormLabel className={cn("font-normal text-sm", isDisabled && "text-muted-foreground")}>{opcion.label}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>
        )
      case 4: // Preocupaciones
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.3 }} 
            className="space-y-6"
          >
            <div>
              <FormLabel className="text-base font-medium">Si se planteara una cirugía como opción, ¿qué tanto le preocuparían los siguientes aspectos? <span className="text-red-500">*</span></FormLabel>
              <FormDescription className="mb-4">Califique del 1 (No me preocupa) al 5 (Me preocupa mucho)</FormDescription>
              {factoresPreocupacion.map((factor) => (
                <FormField key={factor.name} control={form.control} name={factor.name} render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel className="font-normal flex justify-between items-center">
                        {factor.label}
                        <span className="font-bold text-primary text-sm">{field.value}</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="range" min="1" max="5" step="1" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground px-1"><span>No me preocupa</span><span>Algo</span><span>Mucho</span></div>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="mayorPreocupacionCirugia" render={({ field }) => (
                <FormItem className="mt-6">
                  <FormLabel>De los anteriores, ¿cuál es su MAYOR preocupación o duda? (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Escriba su mayor preocupación o duda si la tiene..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </motion.div>
        )
      case 5: // Expectativas
        return (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }} 
            transition={{ duration: 0.3 }} 
            className="space-y-6"
          >
            <FormField control={form.control} name="plazoResolucionIdeal" render={({ field }) => (
              <FormItem>
                <FormLabel>¿En qué plazo le gustaría idealmente tener resuelto su problema de salud? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesPlazoResolucion.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tiempoTomaDecision" render={({ field }) => (
              <FormItem>
                <FormLabel>Después de su consulta y una vez que tenga la información necesaria, ¿aproximadamente cuánto tiempo considera que necesitará para tomar una decisión sobre su tratamiento? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesTiempoDecision.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="expectativaPrincipalTratamiento" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cuál es el resultado MÁS importante que espera obtener con el tratamiento? <span className="text-red-500">*</span></FormLabel>
                <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-col space-y-1">
                    {opcionesExpectativaPrincipalTratamiento.map((op) => (
                      <FormItem key={op.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl><RadioGroupItem value={op.value} /></FormControl>
                        <FormLabel className="font-normal">{op.label}</FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="informacionAdicionalImportante" render={({ field }) => (
              <FormItem>
                <FormLabel>¿Hay algo más que le gustaría compartir o que considera importante que sepamos sobre su situación, sus expectativas o cualquier otra inquietud? (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Sus pensamientos, inquietudes o información adicional aquí..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="mayorBeneficioEsperado" render={({ field }) => (
              <FormItem>
                <FormLabel>En sus propias palabras, ¿cómo describiría el mayor beneficio que busca al tratar su condición actual con nosotros? (Opcional)</FormLabel>
                <FormControl><Textarea placeholder="Describa el beneficio más importante para usted..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </motion.div>
        )
      default:
        return null
    }
  }

  // Renderizado de la revisión final
  const renderReviewStep = () => {
    const values = form.getValues();
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        transition={{ duration: 0.5 }} 
        className="space-y-6"
      >
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="text-xl font-semibold mb-6 flex items-center text-primary">
            <CheckCircle2 className="mr-2 h-6 w-6" />
            Revisión de su Información
          </h3>
          <div className="space-y-5">
            {/* Paso 1 Review */}
            <div>
              <h4 className="font-medium text-md text-muted-foreground mb-2 border-b pb-1">Datos Personales y Antecedentes</h4>
              <p><strong>Nombre:</strong> {values.nombre} {values.apellidos}</p>
              <p><strong>Edad:</strong> {values.edad} años</p>
              <p><strong>Teléfono:</strong> {values.telefono}</p>
              {values.email && <p><strong>Email:</strong> {values.email}</p>}
              <p><strong>Cómo nos conoció:</strong> {opcionesComoNosConocio.find(o => o.value === values.comoNosConocio)?.label}
                {values.comoNosConocio === "otro" && ` (${values.otroComoNosConocio || "No especificado"})`}
              </p>
              <p><strong>Motivo de visita:</strong> {opcionesMotivoVisita.find(o => o.value === values.motivoVisita)?.label}</p>
              <p><strong>Diagnóstico previo:</strong> {values.diagnosticoPrevio ? `Sí (${values.diagnosticoPrincipalPrevio || "No especificado"})` : "No"}</p>
            </div>

            {/* Paso 2 Review */}
            <div>
              <h4 className="font-medium text-md text-muted-foreground mb-2 border-b pb-1">Síntomas y Salud General</h4>
              <p><strong>Seguro médico:</strong> {opcionesSeguroMedico.find(o => o.value === values.seguroMedico)?.label}
                {values.seguroMedico === "otro_seguro" && ` (${values.otroSeguroMedico || "No especificado"})`}
              </p>
              {values.seguroMedico === "privado" && (
                <p><strong>Aseguradora:</strong> {opcionesAseguradoras.find(o => o.id === values.aseguradoraSeleccionada)?.label || "No seleccionada"}
                  {values.aseguradoraSeleccionada === "otra" && ` (${values.otraAseguradora || "No especificada"})`}
                </p>
              )}
              <p><strong>Síntoma principal:</strong> {values.descripcionSintomaPrincipal}</p>
              {values.sintomasAdicionales && values.sintomasAdicionales.length > 0 && <p><strong>Síntomas adicionales:</strong> {values.sintomasAdicionales.join(', ')}</p>}
              <p><strong>Desde cuándo síntoma:</strong> {opcionesDesdeCuandoSintoma.find(o => o.value === values.desdeCuandoSintomaPrincipal)?.label}</p>
              <p><strong>Severidad:</strong> {opcionesSeveridadSintomas.find(o => o.value === values.severidadSintomasActuales)?.label}</p>
              <p><strong>Intensidad del dolor (0-10):</strong> {values.intensidadDolorActual}</p>
              <p><strong>Afectación actividades:</strong> {opcionesAfectacionActividades.find(o => o.value === values.afectacionActividadesDiarias)?.label}</p>
              {values.condicionesMedicasCronicas && values.condicionesMedicasCronicas.length > 0 && <p><strong>Condiciones crónicas:</strong> {values.condicionesMedicasCronicas.join(', ')}</p>}
              {values.otraCondicionMedicaRelevante && <p><strong>Otra condición relevante:</strong> {values.otraCondicionMedicaRelevante}</p>}
               <p><strong>Estudios médicos previos:</strong> {opcionesEstudiosMedicos.find(o => o.value === values.estudiosMedicosProblemaActual)?.label}</p>
            </div>

            {/* Paso 3 Review */}
            <div>
              <h4 className="font-medium text-md text-muted-foreground mb-2 border-b pb-1">Preferencias</h4>
              <p><strong>Aspectos más importantes (2):</strong> {values.aspectosMasImportantes?.map(id => opcionesAspectosImportantes.find(o => o.id === id)?.label).join('; ') || "No seleccionados"}</p>
            </div>

            {/* Paso 4 Review */}
            <div>
              <h4 className="font-medium text-md text-muted-foreground mb-2 border-b pb-1">Preocupaciones</h4>
              {/* Display individual preocupacion ratings or a summary */}
              <p><strong>Mayor preocupación sobre cirugía:</strong> {values.mayorPreocupacionCirugia || "Ninguna especificada"}</p>
            </div>
            
            {/* Paso 5 Review */}
            <div>
              <h4 className="font-medium text-md text-muted-foreground mb-2 border-b pb-1">Expectativas</h4>
              <p><strong>Plazo ideal de resolución:</strong> {opcionesPlazoResolucion.find(o => o.value === values.plazoResolucionIdeal)?.label}</p>
              <p><strong>Tiempo para tomar decisión:</strong> {opcionesTiempoDecision.find(o => o.value === values.tiempoTomaDecision)?.label}</p>
              <p><strong>Principal expectativa del tratamiento:</strong> {opcionesExpectativaPrincipalTratamiento.find(o => o.value === values.expectativaPrincipalTratamiento)?.label}</p>
              {values.informacionAdicionalImportante && <p><strong>Información adicional importante:</strong> {values.informacionAdicionalImportante}</p>}
              {values.mayorBeneficioEsperado && <p><strong>Mayor beneficio esperado:</strong> {values.mayorBeneficioEsperado}</p>}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-sm mt-6">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-muted-foreground">Al enviar este formulario, acepta que la información proporcionada sea utilizada para fines médicos y de acuerdo con nuestro aviso de privacidad.</p>
        </div>
        {submitError && <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md flex items-center"><AlertCircle className="w-4 h-4 mr-2"/> {submitError}</p>}
      </motion.div>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto shadow-xl border-0 my-8">
      <CardHeader className="border-b bg-slate-50 rounded-t-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-2xl font-bold text-slate-800">{surveyDataMeta?.title}</CardTitle>
            <CardDescription className="text-slate-600">{surveyDataMeta?.description}</CardDescription>
          </div>
          {lastSaved && (
            <div className="text-xs text-slate-500 flex items-center whitespace-nowrap">
              {isSaving ? (
                <span className="flex items-center"><LoadingSpinner size={12} className="mr-1 animate-spin" /> Guardando...</span>
              ) : (
                <span className="flex items-center"><Save className="h-3 w-3 mr-1" /> Guardado: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              )}
            </div>
          )}
        </div>

        {/* Indicador de progreso */}
        <div className="mt-6">
          {!isMobile ? (
            <div className="flex w-full items-start">
              {pasos.map((paso, index) => (
                <div key={paso.id} className={cn("flex-1 text-center relative group")}>
                  <div className="flex items-center justify-center">
                    {index > 0 && (
                        <div className={cn(
                            "flex-1 h-0.5 transition-colors duration-300",
                            currentStep > paso.id || currentStep === totalSteps + 1 ? "bg-primary" : "bg-slate-300"
                        )} />
                    )}
                    <div className={cn(
                        "w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-1 text-lg font-medium border-2 transition-all duration-300",
                        currentStep > paso.id || currentStep === totalSteps + 1 ? "bg-primary text-primary-foreground border-primary" :
                        currentStep === paso.id ? "bg-primary/20 text-primary border-primary scale-110" :
                        "bg-slate-200 text-slate-500 border-slate-300 group-hover:border-slate-400"
                      )}
                    >
                      {paso.icono}
                    </div>
                     {index < pasos.length -1 && (
                        <div className={cn(
                            "flex-1 h-0.5 transition-colors duration-300",
                            currentStep > paso.id +1 || currentStep === totalSteps + 1 ? "bg-primary" : "bg-slate-300"
                        )} />
                    )}
                  </div>
                  <div className={cn(
                      "text-xs font-medium transition-colors duration-300",
                       currentStep >= paso.id || currentStep === totalSteps + 1 ? "text-primary" : "text-slate-500 group-hover:text-slate-700"
                  )}>{paso.titulo}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full">
              <div className="text-sm font-medium text-slate-700">
                Paso {Math.min(currentStep, totalSteps)} de {totalSteps}: {pasos[Math.min(currentStep, totalSteps) - 1]?.titulo}
              </div>
              <div className="text-xs text-slate-500 mb-2">{pasos[Math.min(currentStep, totalSteps) - 1]?.descripcion}</div>
            </div>
          )}
          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
            <div
              className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${(Math.min(currentStep, totalSteps) / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-8 pb-8 px-6 md:px-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <AnimatePresence mode="wait">
              {currentStep <= totalSteps ? renderStepContent() : renderReviewStep()}
            </AnimatePresence>
          </form>
        </Form>
      </CardContent>

      <CardFooter className="flex justify-between border-t p-6 bg-slate-50 rounded-b-lg">
        <Button
          type="button"
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1 || isSubmitting}
          className="flex items-center"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>

        {currentStep <= totalSteps ? (
          <Button type="button" onClick={nextStep} disabled={isSubmitting || isSaving} className="flex items-center">
            Siguiente
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={form.handleSubmit(onSubmit)}
            disabled={isSubmitting || isSaving}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar Encuesta"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}