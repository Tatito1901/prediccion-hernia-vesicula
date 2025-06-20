"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, useInView } from "framer-motion"
import {
  User,
  ChevronDown,
  Award,
  GraduationCap,
  Briefcase,
  ThumbsUp,
  ClipboardCheck,
  Heart,
  Calendar,
  CheckCircle2,
  MapPin,
  Shield,
  FileText,
  Stethoscope,
  Clock,
  ChevronRight,
  Lock,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Doctor {
  id: string
  name: string
  title: string
  specialty: string
  bio: string
  longBio: string
  image: string
  credentials: string[]
  specialties: string[]
  education: string[]
  experience: number
  location?: string
  procedures?: string[]
  languages?: string[]
  publications?: string[]
}

// Datos actualizados de los especialistas
const doctors: Doctor[] = [
  {
    id: "luis-angel",
    name: "Luis Angel Medina Andrade",
    title: "Dr.",
    specialty: "Cirujano General y Especialista en Hernia y Vesícula",
    bio: "Cirujano especialista en hernias y vesícula biliar en la Ciudad de México, con más de 15 años de experiencia en técnicas mínimamente invasivas.",
    longBio:
      "El Dr. Luis Angel Medina Andrade es un cirujano especialista en el tratamiento de hernias y vesícula biliar, reconocido por su excelencia en la Ciudad de México. Con más de 15 años de experiencia, se ha especializado en técnicas quirúrgicas mínimamente invasivas que permiten una recuperación más rápida y menos dolorosa. Su enfoque personalizado garantiza que cada paciente reciba un tratamiento adaptado a sus necesidades específicas, utilizando los avances más recientes en cirugía laparoscópica y procedimientos ambulatorios.",
    image:
      '', // Was placeholder.svg
    credentials: [
      "Certificado por el Consejo Mexicano de Cirugía General",
      "Fellow del American College of Surgeons",
      "Miembro de la Asociación Mexicana de Cirugía Endoscópica",
      "Miembro de la Sociedad Mexicana de Cirugía General",
    ],
    specialties: [
      "Cirugía de hernia (inguinal, umbilical, ventral)",
      "Colecistectomía laparoscópica (vesícula)",
      "Cirugía laparoscópica avanzada",
      "Procedimientos mínimamente invasivos",
    ],
    education: [
      "Medicina - Universidad Nacional Autónoma de México",
      "Especialidad en Cirugía General - Hospital General de México",
      "Subespecialidad en Cirugía Laparoscópica - Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán",
    ],
    experience: 15,
    location: "Ciudad de México",
    procedures: [
      "Reparación de hernia inguinal",
      "Reparación de hernia umbilical",
      "Reparación de hernia ventral",
      "Colecistectomía laparoscópica",
      "Cirugía de pared abdominal",
    ],
    languages: ["Español", "Inglés"],

    publications: [
      "Avances en técnicas laparoscópicas para reparación de hernias complejas",
      "Resultados comparativos en colecistectomía laparoscópica vs. tradicional",
    ],
  },
  {
    id: "sahid-vargas",
    name: "Sahid Vargas",
    title: "Dr.",
    specialty: "Cirujano General y Bariatra",
    bio: "Experto en cirugía bariátrica y metabólica con enfoque en protocolos de recuperación acelerada. Especializado en procedimientos mínimamente invasivos.",
    longBio:
      "El Dr. Sahid Vargas es un destacado cirujano general y bariatra con amplia experiencia en procedimientos mínimamente invasivos. Se ha especializado en cirugía bariátrica y metabólica, implementando protocolos de recuperación acelerada que han beneficiado a cientos de pacientes. Su formación académica y constante actualización le permiten ofrecer las técnicas más avanzadas en el tratamiento quirúrgico de la obesidad y enfermedades metabólicas asociadas, así como en procedimientos de vesícula biliar y hernias.",
    image: '', // Was placeholder.svg
    credentials: [
      "Certificado por el Consejo Mexicano de Cirugía General",
      "Miembro de la International Federation for the Surgery of Obesity",
      "Certificación en protocolos ERAS (Enhanced Recovery After Surgery)",
      "Miembro de la Asociación Mexicana de Cirugía para la Obesidad",
    ],
    specialties: [
      "Cirugía bariátrica y metabólica",
      "Cirugía de vesícula biliar",
      "Reparación de hernias",
      "Protocolos de recuperación acelerada",
    ],
    education: [
      "Medicina - Universidad La Salle",
      "Especialidad en Cirugía General - Centro Médico Nacional Siglo XXI",
      "Alta Especialidad en Cirugía Bariátrica - Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán",
    ],
    experience: 12,
    location: "Ciudad de México",
    procedures: [
      "Bypass gástrico",
      "Manga gástrica",
      "Colecistectomía laparoscópica",
      "Reparación de hernias complejas",
    ],
    languages: ["Español", "Inglés", "Francés"],

    publications: [
      "Innovaciones en cirugía bariátrica: un enfoque multidisciplinario",
      "Manejo perioperatorio en pacientes con obesidad mórbida",
    ],
  },
]

export default function GraciasPage() {
  const router = useRouter()
  const [expandedDoctor, setExpandedDoctor] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const assignedDoctor = "luis-angel"
  const assignedDoctorData = doctors.find((d) => d.id === assignedDoctor)

  // Referencias para animaciones basadas en scroll
  const thankYouRef = useRef<HTMLDivElement>(null)
  const statusCardRef = useRef<HTMLDivElement>(null)
  const valuePropsRef = useRef<HTMLDivElement>(null)
  const doctorsRef = useRef<HTMLDivElement>(null)
  const privacyRef = useRef<HTMLDivElement>(null)

  const thankYouInView = useInView(thankYouRef, { once: true, amount: 0.3 })
  const statusCardInView = useInView(statusCardRef, { once: true, amount: 0.3 })
  const valuePropsInView = useInView(valuePropsRef, { once: true, amount: 0.3 })
  const doctorsInView = useInView(doctorsRef, { once: true, amount: 0.3 })
  const privacyInView = useInView(privacyRef, { once: true, amount: 0.3 })

  // Efectos de scroll para activar secciones
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight / 2

      const sections = [
        { id: "thank-you", ref: thankYouRef },
        { id: "status-card", ref: statusCardRef },
        { id: "value-props", ref: valuePropsRef },
        { id: "doctors", ref: doctorsRef },
        { id: "privacy", ref: privacyRef },
      ]

      for (const section of sections) {
        if (section.ref.current) {
          const { top, bottom } = section.ref.current.getBoundingClientRect()
          const sectionTop = top + window.scrollY
          const sectionBottom = bottom + window.scrollY

          if (scrollPosition >= sectionTop && scrollPosition <= sectionBottom) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  }

  const staggerChildren = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white bg-[url('/subtle-dark-pattern.svg')] bg-repeat">
      {/* Header elegante con acento */}
      <header className="relative">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
      </header>

      <div className="container max-w-4xl mx-auto px-4 py-8 sm:py-12 md:py-16 relative">
        {/* Decoración de fondo */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 opacity-70" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 opacity-70" />

        <motion.div initial="initial" animate="animate" variants={staggerChildren}>
          {/* Mensaje de agradecimiento mejorado */}
          <motion.div
            ref={thankYouRef}
            variants={fadeIn}
            className="text-center mb-16 sm:mb-20"
            animate={thankYouInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            id="thank-you"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={thankYouInView ? { scale: 1 } : { scale: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex mb-8"
            >
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-gradient-to-br from-green-900/30 to-emerald-900/30 flex items-center justify-center border border-green-800 shadow-lg">
                  <ThumbsUp className="h-14 w-14 text-green-400" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-green-900/20"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
                {/* Decoración adicional */}
                <motion.div
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-blue-900/30 flex items-center justify-center shadow-md"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={thankYouInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -45 }}
                  transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 -left-1 h-6 w-6 rounded-full bg-indigo-900/30 flex items-center justify-center shadow-md"
                  initial={{ scale: 0, rotate: 45 }}
                  animate={thankYouInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: 45 }}
                  transition={{ delay: 0.7, duration: 0.5, type: "spring" }}
                >
                  <Heart className="h-3 w-3 text-indigo-400" />
                </motion.div>
              </div>
            </motion.div>

            <h1 className="text-2xl sm:text-3xl md:text-5xl font-light text-white mb-4 sm:mb-6 tracking-tight">
              <span className="font-normal bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
                ¡Gracias por completar la encuesta!
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-slate-200 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
              Sus respuestas nos ayudarán a brindarle una mejor atención médica y personalizar su consulta según sus
              necesidades específicas.
            </p>

            {/* Decoración de línea elegante */}
            <div className="flex items-center justify-center mt-8 mb-2">
              <div className="h-px w-16 bg-slate-700"></div>
              <div className="mx-4 text-slate-500">
                <Shield className="h-5 w-5" />
              </div>
              <div className="h-px w-16 bg-slate-700"></div>
            </div>
          </motion.div>

          {/* Tarjeta de estado - Refinada */}
          <motion.div
            ref={statusCardRef}
            variants={fadeIn}
            animate={statusCardInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="mb-12 sm:mb-16"
            id="status-card"
          >
            <Card className="border-0 shadow-xl bg-slate-900/90 backdrop-blur-sm overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-green-500 to-emerald-500" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-normal flex items-center gap-2 text-white">
                    <ClipboardCheck className="h-5 w-5 text-emerald-400" />
                    Información de su consulta
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="font-normal bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40"
                  >
                    En preparación
                  </Badge>
                </div>
                <CardDescription className="text-slate-300">
                  Su información está siendo revisada por nuestro equipo médico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Doctor asignado - Mejorado */}
                <div className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-lg bg-gradient-to-br from-slate-800/50 to-blue-900/20 border border-slate-700 shadow-sm">
                  <div className="relative">
                    <Avatar className="h-24 w-24 border-2 border-blue-900 shadow-md">
                      <AvatarImage
                        src={assignedDoctorData?.image}
                        alt={assignedDoctorData?.name}
                      />
                      <AvatarFallback className="bg-blue-900 text-blue-300">
                        {assignedDoctorData?.name.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-blue-900/70 rounded-full p-1.5 border-2 border-slate-800 shadow-sm">
                      <Stethoscope className="h-4 w-4 text-blue-300" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-800">
                        Médico asignado
                      </Badge>
                    </div>
                    <p className="font-medium text-white text-xl">
                      {assignedDoctorData?.title} {assignedDoctorData?.name}
                    </p>
                    <p className="text-sm text-slate-300 mt-1">{assignedDoctorData?.specialty}</p>

                    <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                      <div className="flex items-center text-sm text-slate-300">
                        <MapPin className="h-3.5 w-3.5 mr-1 text-blue-400" />
                        {assignedDoctorData?.location}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Próximos pasos */}
                <div className="p-4 sm:p-6 rounded-lg bg-blue-950/20 border border-blue-900">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="mt-1 bg-slate-800 rounded-full p-2 shadow-sm">
                      <Clock className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-200 mb-2 text-lg">Próximos pasos</h3>
                      <p className="text-blue-200 leading-relaxed">
                        Personal de recepción le informará cuando sea su turno para pasar a consulta con el doctor. Si
                        necesita salir brevemente, por favor notifique a recepción.
                      </p>

                      {/* Lista de pasos */}
                      <div className="mt-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-900/50 text-blue-300 text-xs font-medium">
                            1
                          </div>
                          <p className="text-sm text-blue-200">Revisión de su historial médico</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-900/50 text-blue-300 text-xs font-medium">
                            2
                          </div>
                          <p className="text-sm text-blue-200">Evaluación inicial por el médico asignado</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-900/50 text-blue-300 text-xs font-medium">
                            3
                          </div>
                          <p className="text-sm text-blue-200">Diagnóstico y plan de tratamiento personalizado</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-slate-800/50 border-t border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between w-full">
                  <p className="text-sm text-slate-400">
                    <FileText className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                    Expediente en preparación
                  </p>
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                    <span>Más información</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Propuesta de valor - Mejorada */}
          <motion.div
            ref={valuePropsRef}
            variants={fadeIn}
            className="mb-16 sm:mb-20"
            animate={valuePropsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            id="value-props"
          >
            <div className="text-center mb-10">
              <h2 className="text-2xl font-light text-white mb-3">Nuestro Compromiso</h2>
              <p className="text-slate-200 max-w-2xl mx-auto">
                En la Clínica de Hernia y Vesícula nos comprometemos a brindarle la mejor atención médica con los más
                altos estándares de calidad.
              </p>
              <div className="flex items-center justify-center mt-4">
                <div className="h-px w-12 bg-slate-700"></div>
                <div className="mx-3 text-slate-500">
                  <Heart className="h-4 w-4" />
                </div>
                <div className="h-px w-12 bg-slate-700"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <ClipboardCheck className="h-7 w-7 text-blue-400" />,
                  title: "Evaluación Completa",
                  description:
                    "Sus respuestas nos permiten preparar una consulta personalizada y adaptada a sus necesidades específicas.",
                  color: "blue",
                  delay: 0.1,
                },
                {
                  icon: <Heart className="h-7 w-7 text-indigo-400" />,
                  title: "Atención Personalizada",
                  description:
                    "Adaptamos nuestro servicio a sus necesidades específicas para garantizar los mejores resultados posibles.",
                  color: "indigo",
                  delay: 0.2,
                },
                {
                  icon: <Award className="h-7 w-7 text-emerald-400" />,
                  title: "Excelencia Médica",
                  description:
                    "Nuestros especialistas certificados garantizan la mejor atención con técnicas de vanguardia.",
                  color: "emerald",
                  delay: 0.3,
                },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={cardVariants}
                  initial="hidden"
                  animate={valuePropsInView ? "visible" : "hidden"}
                  transition={{ delay: item.delay }}
                >
                  <Card className="border-0 shadow-lg bg-slate-900/80 backdrop-blur-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 h-full overflow-hidden">
                    <div className={`h-1 bg-${item.color}-500`} />
                    <CardContent className="p-8 flex flex-col items-center text-center">
                      <div
                        className={`h-16 w-16 rounded-full bg-${item.color}-900/20 flex items-center justify-center mb-5 shadow-sm border border-${item.color}-800`}
                      >
                        {item.icon}
                      </div>
                      <h3 className="font-medium text-white mb-3 text-lg">{item.title}</h3>
                      <p className="text-slate-200 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Sección de doctores - Mejorada con nueva información */}
          <motion.div
            ref={doctorsRef}
            variants={fadeIn}
            className="mb-16 sm:mb-20"
            animate={doctorsInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            id="doctors"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-center sm:justify-between gap-3 sm:gap-0 mb-8">
              <h2 className="text-xl sm:text-2xl font-light text-white flex items-center gap-2 text-center sm:text-left">
                <User className="h-6 w-6 text-blue-400" />
                Conozca a nuestros especialistas
              </h2>
              <Badge variant="outline" className="bg-blue-900/20 text-blue-300 border-blue-800">
                Equipo médico certificado
              </Badge>
            </div>

            <div className="grid gap-6 md:gap-8">
              {doctors.map((doctor, idx) => (
                <motion.div
                  key={doctor.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate={doctorsInView ? "visible" : "hidden"}
                  transition={{ delay: idx * 0.2 }}
                >
                  <Card
                    className={cn(
                      "border-0 shadow-lg transition-all duration-300 hover:shadow-xl",
                      "bg-slate-900/80 backdrop-blur-sm",
                      doctor.id === assignedDoctor && "ring-2 ring-blue-500",
                    )}
                  >
                    {doctor.id === assignedDoctor && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full shadow-md">
                        Su médico asignado
                      </div>
                    )}
                    <CardHeader
                      className="cursor-pointer"
                      onClick={() => setExpandedDoctor(expandedDoctor === doctor.id ? null : doctor.id)}
                    >
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                        <div className="relative">
                          <Avatar className="h-24 w-24 border border-slate-700 shadow-md">
                            <AvatarImage src={doctor.image} alt={doctor.name} />
                            <AvatarFallback className="bg-slate-800 text-slate-300">
                              {doctor.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-1.5 border border-slate-700 shadow-sm">
                            <Stethoscope className="h-4 w-4 text-blue-400" />
                          </div>
                        </div>
                        <div className="flex-1 w-full text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-0">
                            <div>
                              <CardTitle className="text-xl font-medium text-white">
                                {doctor.title} {doctor.name}
                              </CardTitle>
                              <CardDescription className="mt-1 text-base text-slate-200">
                                {doctor.specialty}
                              </CardDescription>

                              {/* Ubicación */}
                              <div className="flex items-center justify-center sm:justify-start mt-2">
                                {doctor.location && (
                                  <div className="flex items-center text-sm text-slate-200">
                                    <MapPin className="h-3.5 w-3.5 mr-1 text-blue-400" />
                                    {doctor.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            <motion.div
                              animate={{ rotate: expandedDoctor === doctor.id ? 180 : 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-slate-800 rounded-full p-1.5 shadow-sm"
                            >
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            </motion.div>
                          </div>
                          <p className="text-slate-200 mt-3 line-clamp-2">{doctor.bio}</p>

                          {/* Insignias de especialidad */}
                          <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                            {doctor.specialties.slice(0, 2).map((specialty, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="font-normal text-xs bg-slate-800 text-slate-200"
                              >
                                {specialty.split(" ")[0]}
                              </Badge>
                            ))}
                            {doctor.specialties.length > 2 && (
                              <Badge variant="outline" className="font-normal text-xs border-slate-700 text-slate-300">
                                +{doctor.specialties.length - 2} más
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <AnimatePresence>
                      {expandedDoctor === doctor.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <CardContent className="pt-0">
                            <Separator className="mb-6 bg-slate-700" />

                            {/* Biografía extendida */}
                            {doctor.longBio && (
                              <div className="mb-6 p-5 bg-slate-800/50 rounded-lg border border-slate-700">
                                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-blue-400" />
                                  Perfil profesional
                                </h3>
                                <p className="text-slate-200 leading-relaxed">{doctor.longBio}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                              {/* Experiencia */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-blue-400" />
                                  Experiencia
                                </h3>
                                <div className="p-4 bg-blue-900/10 rounded-lg border border-blue-900/30">
                                  <p className="text-3xl font-light text-white">
                                    {doctor.experience} <span className="text-lg">años</span>
                                  </p>
                                  <p className="text-sm text-slate-400 mt-1">de práctica profesional</p>
                                </div>

                                {/* Idiomas */}
                                {doctor.languages && doctor.languages.length > 0 && (
                                  <div className="pt-4">
                                    <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                                      <span className="inline-block h-1 w-1 rounded-full bg-blue-500"></span>
                                      IDIOMAS
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {doctor.languages.map((language, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="outline"
                                          className="font-normal border-slate-700 text-slate-300"
                                        >
                                          {language}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Educación */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                  <GraduationCap className="h-4 w-4 text-blue-400" />
                                  Formación
                                </h3>
                                <ul className="space-y-2.5">
                                  {doctor.education.map((edu, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <div className="h-5 w-5 rounded-full bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-400"></div>
                                      </div>
                                      <span className="text-sm text-slate-300">{edu}</span>
                                    </li>
                                  ))}
                                </ul>

                                {/* Publicaciones */}
                                {doctor.publications && doctor.publications.length > 0 && (
                                  <div className="pt-4">
                                    <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                                      <span className="inline-block h-1 w-1 rounded-full bg-indigo-500"></span>
                                      PUBLICACIONES
                                    </h4>
                                    <ul className="space-y-2">
                                      {doctor.publications.map((pub, idx) => (
                                        <li
                                          key={idx}
                                          className="text-sm text-slate-300 pl-3 border-l-2 border-indigo-800"
                                        >
                                          {pub}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>

                              {/* Certificaciones */}
                              <div className="space-y-3">
                                <h3 className="text-sm font-medium text-white flex items-center gap-2">
                                  <Award className="h-4 w-4 text-blue-400" />
                                  Certificaciones
                                </h3>
                                <ul className="space-y-2.5">
                                  {doctor.credentials.map((credential, index) => (
                                    <li key={index} className="flex items-start gap-2">
                                      <div className="h-5 w-5 rounded-full bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                      </div>
                                      <span className="text-sm text-slate-300">{credential}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Especialidades */}
                            <div className="mt-6 pt-6 border-t border-slate-800">
                              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-400" />
                                Áreas de especialización
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {doctor.specialties.map((specialty, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="font-normal bg-slate-800 text-slate-200"
                                  >
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Procedimientos */}
                            {doctor.procedures && doctor.procedures.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-slate-800">
                                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                                  <Stethoscope className="h-4 w-4 text-blue-400" />
                                  Procedimientos
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {doctor.procedures.map((procedure, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-800/50 transition-colors"
                                    >
                                      <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                                      <span className="text-sm text-slate-300">{procedure}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Botón de acción */}
                            <div className="mt-6 pt-6 border-t border-slate-800 flex justify-center sm:justify-end">
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                                Solicitar consulta
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Componente de Protección de Datos */}
          <motion.div
            ref={privacyRef}
            variants={fadeIn}
            className="mb-16"
            animate={privacyInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            id="privacy"
          >
            <Card className="border-0 shadow-xl bg-blue-950/30 backdrop-blur-sm overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-slate-900/60 flex items-center justify-center border border-slate-700 shadow-md">
                    <Lock className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="text-center sm:text-left">
                    <CardTitle className="text-xl font-medium text-white mb-2">
                      Protección de sus datos personales
                    </CardTitle>
                    <CardDescription className="text-slate-300 max-w-2xl">
                      En la Clínica Especializada en Hernia y Vesícula, su privacidad es nuestra prioridad
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center sm:items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div className="h-10 w-10 rounded-full bg-blue-900/30 flex items-center justify-center border border-blue-800">
                      <Shield className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-center sm:text-left mb-1">Datos protegidos</h3>
                      <p className="text-slate-300 text-sm text-center sm:text-left">
                        Toda su información médica está protegida bajo estrictos protocolos de seguridad digital
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center sm:items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div className="h-10 w-10 rounded-full bg-indigo-900/30 flex items-center justify-center border border-indigo-800">
                      <EyeOff className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-center sm:text-left mb-1">Confidencialidad</h3>
                      <p className="text-slate-300 text-sm text-center sm:text-left">
                        No compartimos su información con terceros bajo ninguna circunstancia
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center sm:items-start gap-3 p-4 rounded-lg bg-slate-900/50 border border-slate-800">
                    <div className="h-10 w-10 rounded-full bg-violet-900/30 flex items-center justify-center border border-violet-800">
                      <CheckCircle className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-center sm:text-left mb-1">Cumplimiento legal</h3>
                      <p className="text-slate-300 text-sm text-center sm:text-left">
                        Cumplimos con las normativas de protección de datos sanitarios y privacidad
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-lg bg-blue-900/20 border border-blue-800">
                  <p className="text-slate-200 text-sm leading-relaxed">
                    Sus datos son utilizados exclusivamente para su atención médica y seguimiento de su tratamiento. 
                    Nuestro personal está capacitado en el manejo confidencial de la información sensible, y aplicamos 
                    estrictas medidas técnicas para prevenir accesos no autorizados. Tiene derecho a solicitar acceso, 
                    rectificación o eliminación de sus datos personales en cualquier momento.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pie de página elegante */}
          <footer className="text-center mt-12 pt-8 border-t border-slate-800">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm text-slate-400">
              © {new Date().getFullYear()} Clínica Especializada en Hernia y Vesícula. Todos los derechos reservados.
            </p>
            <p className="text-xs text-slate-500 mt-2">Tecnología médica de vanguardia al servicio de su salud</p>
          </footer>
        </motion.div>
      </div>
    </div>
  )
}
