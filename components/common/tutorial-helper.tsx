"use client"

import { useState } from "react"
import { Check, ChevronLeft, ChevronRight, X, Info, BookOpen, Users, BarChart3, FileText, Settings, ShieldCheck } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose, // Importado para cierre programático si es necesario o para el botón X
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card" // Card no se usa en TutorialHelper pero sí en TutorialCard
import { Separator } from "@/components/ui/separator" // Para mejor estructura visual

// Tipo para los pasos del tutorial (sin imágenes)
interface TutorialStep {
  title: string
  description: string // Esta descripción debe ser muy clara y guiar al usuario
  icon?: React.ElementType // Opcional: un icono para el paso actual
}

// Definición del tipo para las secciones, igual que en tu AyudaPage
export type HelpSectionId = 
  | "general" 
  | "pacientes" 
  | "cirugias" 
  | "crm" 
  | "encuesta" 
  | "admision" 
  | "analisis";


// Colección de tutoriales para diferentes secciones de la aplicación (sin imágenes)
// Las descripciones deben ser más detalladas para compensar la ausencia de imágenes.
const tutorials: Record<HelpSectionId, TutorialStep[]> = {
  general: [
    {
      icon: Info,
      title: "Bienvenido a la Plataforma de Gestión Clínica",
      description: "Este tutorial interactivo te guiará a través de las funciones esenciales de nuestra plataforma. Utiliza los botones 'Siguiente' y 'Anterior' para navegar por los pasos. El objetivo es que te familiarices rápidamente con las herramientas que optimizarán la gestión de tu 'Clínica del Corazón'.",
    },
    {
      icon: BookOpen,
      title: "Navegación Principal: Menú Lateral",
      description: "A la izquierda de tu pantalla, encontrarás el menú lateral. Este menú es tu principal herramienta de navegación y te da acceso directo a todas las secciones clave: Dashboard (Resumen), Pacientes, CRM (Gestión de Relaciones), Encuestas, Análisis IA, Cirugías y Admisión.",
    },
    {
      icon: BarChart3,
      title: "Panel de Control (Dashboard)",
      description: "El Dashboard es tu punto de partida. Aquí verás un resumen de las actividades recientes, estadísticas importantes (como citas del día, pacientes nuevos), y notificaciones relevantes. Está diseñado para ofrecerte una visión general y rápida del estado de la clínica.",
    },
    {
      icon: Users,
      title: "Acceso a Gestión de Pacientes",
      description: "Desde el menú lateral, selecciona 'Pacientes'. Esta sección te permite buscar, visualizar, añadir nuevos pacientes y editar la información existente. También podrás acceder al historial clínico detallado de cada uno.",
    },
    {
      icon: Settings,
      title: "Explorando el Seguimiento CRM",
      description: "El módulo 'CRM' (Customer Relationship Management) te ayuda a gestionar la comunicación y el seguimiento de tus pacientes. Podrás registrar interacciones, programar recordatorios y visualizar el ciclo de vida completo del paciente en la clínica.",
    }
  ],
  pacientes: [
    {
      icon: UserPlus,
      title: "Registrar un Nuevo Paciente",
      description: "Para añadir un paciente, ve a la sección 'Pacientes' y busca el botón 'Añadir Paciente'. Completa el formulario con los datos personales (nombre, contacto), y no olvides la información médica relevante como antecedentes. Los campos marcados con (*) son obligatorios.",
    },
    {
      icon: FileText,
      title: "Consultar el Historial Clínico",
      description: "Dentro del perfil de un paciente, encontrarás pestañas o secciones para su historial clínico. Aquí podrás revisar consultas previas, diagnósticos registrados, tratamientos aplicados, resultados de estudios y la evolución general del paciente.",
    }
  ],
  cirugias: [
    {
      icon: CalendarCheck,
      title: "Programar una Nueva Cirugía",
      description: "En la sección 'Cirugías', utiliza la opción 'Programar Cirugía'. Deberás seleccionar al paciente, la fecha y hora deseadas, el tipo de procedimiento quirúrgico, y asignar al equipo médico (cirujano, anestesiólogo, etc.).",
    },
    {
      icon: ShieldCheck,
      title: "Registrar Seguimiento Post-Operatorio",
      description: "Después de una cirugía, es crucial registrar la evolución del paciente. En la ficha de la cirugía o del paciente, encontrarás opciones para añadir notas de seguimiento post-operatorio, programar citas de revisión y documentar cualquier complicación o recomendación específica.",
    }
  ],
  crm: [
    {
      icon: Network,
      title: "Panel de Control del CRM",
      description: "Accede al 'CRM' desde el menú lateral. El panel principal te ofrecerá una vista general de seguimientos pendientes, tareas programadas y la actividad reciente de comunicación con los pacientes. Identifica rápidamente qué pacientes requieren atención prioritaria.",
    },
    {
      title: "Registrar una Interacción (Contacto)",
      description: "Cuando te comuniques con un paciente (llamada, email, WhatsApp), regístralo en el CRM. Selecciona el paciente, el tipo de contacto, añade notas detalladas sobre la conversación y, si aplica, el resultado o los próximos pasos acordados.",
    },
    {
      title: "Programar Seguimientos y Recordatorios",
      description: "Utiliza el CRM para programar futuros seguimientos. Puedes establecer recordatorios para el personal sobre cuándo contactar a un paciente, o incluso configurar recordatorios para el propio paciente sobre sus citas o indicaciones médicas.",
    },
    {
      title: "Entender el Ciclo de Vida del Paciente",
      description: "El CRM te permite visualizar en qué etapa se encuentra cada paciente (ej: Prospecto, Activo, Post-tratamiento, Inactivo). Esto ayuda a personalizar la comunicación y las acciones de seguimiento según su contexto actual.",
    }
  ],
  encuesta: [
    {
      icon: ClipboardList,
      title: "Panel de Encuestas Digitales",
      description: "La sección 'Encuestas' te permite gestionar todas las encuestas de la clínica. Aquí podrás ver encuestas activas, borradores, plantillas y los resultados generales. Para crear una nueva, busca la opción 'Crear Encuesta' o 'Nueva Plantilla'.",
    },
    {
      title: "Diseñar una Nueva Encuesta",
      description: "Al crear una encuesta, define un título claro. Luego, añade preguntas utilizando los diferentes tipos disponibles: opción múltiple, respuesta abierta, escala de valoración (Likert), etc. Asegúrate de que las preguntas sean claras y concisas.",
    },
    {
      title: "Utilizar Plantillas de Encuestas",
      description: "Para agilizar el proceso, explora la biblioteca de plantillas. Puede haber plantillas predefinidas para satisfacción, evaluación pre-consulta, o seguimiento post-tratamiento. Puedes usarlas tal cual o personalizarlas.",
    },
    {
      title: "Enviar Encuestas a Pacientes",
      description: "Una vez que tu encuesta esté lista, podrás enviarla a los pacientes. Generalmente, esto se hace seleccionando al paciente (o grupo de pacientes) y eligiendo el método de envío (ej: email, enlace directo). Algunas encuestas pueden activarse automáticamente en ciertos puntos del flujo del paciente.",
    },
    {
      title: "Analizar Resultados de Encuestas",
      description: "Cuando los pacientes completen las encuestas, podrás ver los resultados en la misma sección. Busca opciones de 'Ver Resultados' o 'Análisis'. Los datos suelen presentarse en gráficos y tablas para facilitar su interpretación.",
    }
  ],
  admision: [
    {
      icon: UserPlus,
      title: "Panel Principal de Admisión",
      description: "La sección 'Admisión' centraliza el proceso de ingreso de pacientes. El panel principal te mostrará pacientes en espera, admisiones recientes y tareas pendientes relacionadas con el proceso de admisión.",
    },
    {
      title: "Registrar un Nuevo Ingreso/Admisión",
      description: "Para iniciar una nueva admisión, selecciona la opción correspondiente (ej: 'Nueva Admisión'). Deberás buscar si el paciente ya existe en el sistema o registrarlo como nuevo. Completa los datos de la admisión: motivo, tipo de ingreso, médico referente, etc.",
    },
    {
      title: "Verificación de Datos y Seguro Médico",
      description: "Una parte crucial de la admisión es verificar los datos del paciente y la información de su seguro médico. Asegúrate de que la información de la póliza sea correcta y, si es necesario, gestiona las pre-autorizaciones con la aseguradora.",
    },
    {
      title: "Gestión de Documentos de Admisión",
      description: "Durante la admisión, se pueden requerir diversos documentos (consentimientos informados, identificación). La plataforma puede permitirte adjuntar versiones digitales de estos documentos al perfil del paciente o marcar su recepción.",
    }
  ],
  analisis: [
    {
      icon: BrainCircuit,
      title: "Introducción al Análisis con IA",
      description: "La sección 'Análisis IA' utiliza algoritmos inteligentes para procesar grandes volúmenes de datos clínicos. El objetivo es ayudarte a identificar patrones, predecir posibles riesgos o sugerir recomendaciones personalizadas, siempre como un apoyo a tu criterio médico.",
    },
    {
      title: "Interpretación de Resultados de IA",
      description: "Los resultados del análisis de IA se presentarán de forma visual (gráficos, dashboards) y con explicaciones textuales. Es importante entender qué datos se usaron para el análisis y cuál es el nivel de confianza de las predicciones o recomendaciones.",
    },
    {
      title: "Aplicación Práctica del Análisis IA",
      description: "Utiliza los insights generados por la IA para complementar tu toma de decisiones clínicas, optimizar planes de tratamiento, o identificar pacientes que podrían beneficiarse de intervenciones preventivas. Recuerda que la IA es una herramienta de soporte.",
    }
  ]
}

interface TutorialHelperProps {
  section?: HelpSectionId 
  isOpen: boolean
  onClose: () => void
}

/**
 * TutorialHelper es un componente de diálogo modal que guía al usuario
 * a través de una serie de pasos para una sección específica de la aplicación.
 * Ha sido rediseñado para no depender de imágenes, enfocándose en texto claro.
 */
export function TutorialHelper({ 
  section = "general", 
  isOpen,
  onClose
}: TutorialHelperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Determina los pasos del tutorial a mostrar. Si la sección no es válida, usa 'general'.
  const steps = tutorials[section] || tutorials.general;
  const currentStep = steps[currentStepIndex];
  
  // Navega al siguiente paso del tutorial.
  // Si es el último paso, cierra el tutorial.
  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleClose(); // Cierra al finalizar el último paso
    }
  };
  
  // Navega al paso anterior del tutorial.
  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  // Cierra el diálogo del tutorial y reinicia el índice del paso.
  const handleClose = () => {
    setCurrentStepIndex(0); // Reinicia al primer paso para la próxima vez
    onClose(); // Llama a la función onClose proporcionada por el componente padre
  };
  
  // Si no hay pasos definidos para la sección (aunque ya hay un fallback), no renderizar nada o un mensaje.
  if (!currentStep) {
    return null; 
  }

  const StepIcon = currentStep.icon; // Obtiene el componente de icono del paso actual

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start text-left">
            {StepIcon && (
              <span className="mr-4 mt-1 text-primary flex-shrink-0">
                <StepIcon size={28} strokeWidth={1.5} />
              </span>
            )}
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                {currentStep.title}
              </DialogTitle>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 max-h-[60vh] overflow-y-auto">
            <DialogDescription className="text-md leading-relaxed text-gray-600 dark:text-gray-300 whitespace-pre-line">
              {currentStep.description}
            </DialogDescription>
        </div>
        
        <Separator className="dark:bg-gray-700"/>

        <DialogFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between w-full">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStepIndex(index)}
                aria-label={`Ir al paso ${index + 1}`}
                className={`w-3 h-3 rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50
                  ${index === currentStepIndex ? 'bg-primary scale-125' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'}`}
              />
            ))}
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
            >
              <X className="mr-1.5 h-4 w-4" />
              Cerrar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousStep}
              disabled={currentStepIndex === 0}
              className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <ChevronLeft className="mr-1.5 h-4 w-4" />
              Anterior
            </Button>
            
            <Button
              onClick={goToNextStep}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white min-w-[100px]"
            >
              {currentStepIndex < steps.length - 1 ? (
                <>
                  Siguiente
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                </>
              ) : (
                <>
                  Finalizar
                  <Check className="ml-1.5 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
        <div className="px-6 pb-3 pt-1 bg-gray-50 dark:bg-gray-800/50 text-center sm:text-right">
           <p className="text-xs text-muted-foreground">
            Paso {currentStepIndex + 1} de {steps.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// El componente TutorialCard se mantiene como lo tenías,
// ya que la solicitud se centró en TutorialHelper.
// Puedes adaptarlo de manera similar si es necesario.
export function TutorialCard({ 
  title, 
  description, 
  section, 
  onClick 
}: { 
  title: string, 
  description: string, 
  section: HelpSectionId, 
  onClick: (section: HelpSectionId) => void 
}) {
  return (
    <Card 
      className="p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 ease-in-out dark:bg-gray-800 dark:hover:shadow-primary/20"
      onClick={() => onClick(section)}
      role="button" // Mejor accesibilidad
      tabIndex={0} // Permite focus con teclado
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(section); }} // Permite activación con teclado
    >
      <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-white">{title}</h3>
      <p className="text-muted-foreground text-sm mb-4">{description}</p>
      <Button variant="secondary" size="sm" className="w-full sm:w-auto dark:bg-primary/20 dark:text-primary dark:hover:bg-primary/30">
        Ver tutorial
      </Button>
    </Card>
  )
}
