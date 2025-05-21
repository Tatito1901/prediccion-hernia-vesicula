"use client"

import { useState, type ReactNode } from "react"
import { 
  HelpCircle, 
  Info, 
  Lightbulb, 
  LayoutDashboard, 
  Users, 
  Network, 
  CalendarCheck, 
  UserPlus, 
  ClipboardList, 
  BrainCircuit,
  Search, // Icono para futura búsqueda
  ChevronRight // Para los botones de las tarjetas
} from "lucide-react"

import { Separator } from "@/components/ui/separator"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
// Asegúrate de que la ruta a TutorialHelper sea correcta.
// Si TutorialCard es un componente separado y no puede tomar un `icon` prop,
// puedes considerar crear un nuevo componente o adaptar el existente.
import { TutorialHelper } from "@/components/common/tutorial-helper" 

// Definición del tipo para las secciones de ayuda para mayor claridad y consistencia
export type HelpSectionId = 
  | "general" 
  | "pacientes" 
  | "cirugias" 
  | "crm" 
  | "encuesta" 
  | "admision" 
  | "analisis";

// Interfaz para las props de las tarjetas de tutorial personalizadas
interface CustomTutorialCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  section: HelpSectionId;
  onClick: (section: HelpSectionId) => void;
  actionText?: string;
}

/**
 * CustomTutorialCard es un componente de tarjeta diseñado para mostrar
 * un tutorial o una guía de ayuda. Incluye un icono, título, descripción
 * y un botón de acción para iniciar el tutorial.
 */
const CustomTutorialCard = ({ 
  icon, 
  title, 
  description, 
  section, 
  onClick, 
  actionText = "Ver Tutorial" 
}: CustomTutorialCardProps) => (
  <div className="bg-card p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col h-full">
    <div className="flex items-start gap-4 mb-4">
      <span className="text-primary flex-shrink-0 mt-1">{icon}</span>
      <div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
    </div>
    <div className="mt-auto pt-4">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => onClick(section)} 
        className="w-full group bg-primary/5 hover:bg-primary/10 border-primary/30 text-primary hover:text-primary/90 dark:bg-primary/10 dark:hover:bg-primary/20 dark:border-primary/40 dark:text-primary"
      >
        {actionText}
        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  </div>
);

/**
 * AyudaPage es el componente principal para el Centro de Ayuda de la aplicación.
 * Proporciona acceso a tutoriales y preguntas frecuentes para guiar a los usuarios.
 */
export default function AyudaPage() {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState<HelpSectionId>("general");
  // const [searchTerm, setSearchTerm] = useState(""); // Para futura funcionalidad de búsqueda

  /**
   * Abre el modal/drawer del TutorialHelper con la sección especificada.
   * @param section - El identificador de la sección de ayuda a mostrar.
   */
  const handleOpenTutorial = (section: HelpSectionId) => {
    setCurrentSection(section);
    setIsTutorialOpen(true);
  };

  // Definición de las tarjetas para las guías esenciales
  const tutorialSections: CustomTutorialCardProps[] = [
    {
      icon: <LayoutDashboard className="h-7 w-7" />,
      title: "Primeros Pasos",
      description: "Navega la plataforma, conoce el dashboard y las funciones esenciales para empezar.",
      section: "general",
      onClick: handleOpenTutorial,
    },
    {
      icon: <Users className="h-7 w-7" />,
      title: "Gestión de Pacientes",
      description: "Aprende a registrar, consultar historiales, actualizar datos y gestionar citas de pacientes.",
      section: "pacientes",
      onClick: handleOpenTutorial,
    },
    {
      icon: <Network className="h-7 w-7" />,
      title: "Seguimiento CRM",
      description: "Domina el ciclo de vida del paciente: desde el contacto inicial hasta la conversión y fidelización.",
      section: "crm",
      onClick: handleOpenTutorial,
    },
    {
      icon: <CalendarCheck className="h-7 w-7" />,
      title: "Programación de Cirugías",
      description: "Organiza procedimientos quirúrgicos, asigna recursos y gestiona el seguimiento post-operatorio.",
      section: "cirugias",
      onClick: handleOpenTutorial,
    },
    {
      icon: <UserPlus className="h-7 w-7" />,
      title: "Admisión de Pacientes",
      description: "Maneja eficientemente el proceso de admisión, desde el registro inicial hasta la asignación de recursos.",
      section: "admision",
      onClick: handleOpenTutorial,
    },
  ];

  // Definición de las tarjetas para las funcionalidades avanzadas
  const advancedTutorialSections: CustomTutorialCardProps[] = [
     {
      icon: <ClipboardList className="h-7 w-7" />,
      title: "Encuestas Digitales",
      description: "Crea, personaliza, envía y analiza encuestas para mejorar la atención y recolectar datos valiosos.",
      section: "encuesta",
      onClick: handleOpenTutorial,
    },
    {
      icon: <BrainCircuit className="h-7 w-7" />,
      title: "Análisis con IA",
      description: "Interpreta datos clínicos complejos y obtén recomendaciones asistidas por Inteligencia Artificial.",
      section: "analisis",
      onClick: handleOpenTutorial,
    },
  ];

  // Contenido para la sección de Preguntas Frecuentes
  const faqs = [
    {
      question: "¿Cómo puedo restablecer mi contraseña?",
      answer: "En la página de inicio de sesión, encontrarás un enlace con el texto '¿Olvidaste tu contraseña?'. Haz clic en él y sigue las instrucciones que se te enviarán por correo electrónico para crear una nueva contraseña de forma segura.",
      value: "faq-1",
    },
    {
      question: "¿Es posible exportar datos de pacientes?",
      answer: "Sí. Dirígete a la sección 'Gestión de Pacientes' desde el menú lateral. En la parte superior derecha de la tabla de pacientes, verás un botón con la etiqueta 'Exportar'. Al hacer clic, podrás elegir el formato (generalmente CSV o PDF) y descargar los datos seleccionados.",
      value: "faq-2",
    },
    {
      question: "¿Cómo puedo obtener soporte técnico si tengo un problema?",
      answer: "Si necesitas asistencia técnica, puedes contactarnos enviando un correo electrónico a soporte@clinicadelcorazon.com.mx o llamando a nuestro número de soporte (55) 1234-5678. Nuestro equipo estará encantado de ayudarte a resolver cualquier inconveniente.",
      value: "faq-3",
    },
    {
      question: "¿Cómo añado un nuevo paciente al sistema?",
      answer: "Para añadir un nuevo paciente, navega a la sección 'Gestión de Pacientes' en el menú lateral. Luego, busca y haz clic en el botón '+ Añadir Paciente' (usualmente ubicado en la parte superior derecha de la pantalla). Completa el formulario con la información requerida y haz clic en 'Guardar'.",
      value: "faq-4",
    },
    {
      question: "¿Dónde puedo ver las citas programadas para hoy?",
      answer: "Puedes ver las citas del día dirigiéndote al 'Dashboard' principal, donde usualmente hay un widget de 'Citas de Hoy', o en la sección de 'Admisión', que a menudo incluye un calendario o listado de citas programadas.",
      value: "faq-5",
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
      {/* Encabezado Principal */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Centro de Ayuda
        </h1>
        <p className="mt-3 text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto">
          Bienvenido al Centro de Ayuda de la Clínica del Corazón. Aquí encontrarás tutoriales detallados, guías prácticas y respuestas a tus preguntas para que puedas aprovechar al máximo nuestra plataforma de gestión médica.
        </p>
      </div>
      
      {/* Sección de Búsqueda (Futura mejora) - Descomentar para implementar */}
      {/*
      <div className="mb-12 max-w-2xl mx-auto">
        <div className="relative">
          <input 
            type="search"
            // value={searchTerm}
            // onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar en ayuda (ej: 'crear paciente', 'contraseña', 'ver estadísticas')"
            className="w-full p-4 pl-12 text-md border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-800 dark:placeholder-gray-400 dark:text-white shadow-sm"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          </div>
        </div>
      </div>
      */}
      
      {/* Sección de Guías Esenciales */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <Info className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">Guías Esenciales</h2>
        </div>
        <p className="text-muted-foreground mb-8 text-md">
          Comienza aquí para aprender los fundamentos de la plataforma. Estos tutoriales te guiarán paso a paso por las funciones clave que usarás a diario para una gestión eficiente de la clínica.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {tutorialSections.map((card) => (
            <CustomTutorialCard key={card.section} {...card} />
          ))}
        </div>
      </section>
      
      <Separator className="my-16 border-gray-300 dark:border-gray-700" />

      {/* Sección de Funcionalidades Avanzadas */}
      <section className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">Funcionalidades Avanzadas</h2>
        </div>
         <p className="text-muted-foreground mb-8 text-md">
          Explora herramientas especializadas y módulos de análisis para optimizar aún más la gestión de tu clínica, mejorar la toma de decisiones y potenciar la atención al paciente.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
          {advancedTutorialSections.map((card) => (
            <CustomTutorialCard key={card.section} {...card} />
          ))}
        </div>
      </section>

      <Separator className="my-16 border-gray-300 dark:border-gray-700" />
      
      {/* Sección de Preguntas Frecuentes */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <HelpCircle className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">Preguntas Frecuentes (FAQ)</h2>
        </div>
        <p className="text-muted-foreground mb-8 text-md">
          Encuentra respuestas rápidas a las dudas más comunes sobre el uso de la plataforma, configuración y solución de problemas menores.
        </p>
        
        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq) => (
            <AccordionItem 
              key={faq.value} 
              value={faq.value} 
              className="border border-gray-200 dark:border-gray-700 rounded-xl shadow-md bg-card transition-shadow hover:shadow-lg"
            >
              <AccordionTrigger className="px-6 py-5 text-left font-medium text-lg hover:no-underline text-gray-700 dark:text-gray-200 group">
                {faq.question}
                <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500 transition-transform duration-200 group-data-[state=open]:rotate-90 ml-auto" />
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-5 pt-0 text-muted-foreground text-md leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      
      {/* Modal/Drawer para el TutorialHelper */}
      {/* El componente TutorialHelper debería ser un modal o un drawer (panel lateral) 
        que se muestra cuando isTutorialOpen es true. Su contenido interno
        cambiará según el valor de `currentSection`.
        Asegúrate de que TutorialHelper esté diseñado para recibir `section`, `isOpen` y `onClose`
        y que pueda renderizar contenido Markdown o HTML formateado para los tutoriales.
      */}
      {isTutorialOpen && (
         <TutorialHelper 
          section={currentSection} 
          isOpen={isTutorialOpen} 
          onClose={() => setIsTutorialOpen(false)} 
        />
      )}

      {/* Pie de página opcional para contacto de soporte adicional */}
      <footer className="mt-20 border-t border-gray-200 dark:border-gray-700 pt-10 text-center">
        <p className="text-muted-foreground">
          ¿No encontraste lo que buscabas? 
          <a href="mailto:soporte@clinicadelcorazon.com.mx" className="text-primary hover:underline ml-1">
            Contacta a nuestro equipo de soporte
          </a>.
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Clínica del Corazón &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
