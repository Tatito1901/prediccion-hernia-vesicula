"use client"

import React, { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { 
  CheckCircle2, 
  Clock, 
  Shield, 
  User, 
  FileText, 
  ArrowRight, 
  Phone,
  Stethoscope,
  Bell
} from "lucide-react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Doctor {
  id: string
  name: string
  specialty: string
  shortBio: string
  longBio: string
  image: string
  credentials: string[]
  specialties: string[]
}

// Datos de los doctores
const doctors: Doctor[] = [
  {
    id: "luis-angel",
    name: "Dr. Luis Angel Medina Andrade",
    specialty: "Cirujano General y Laparoscopista",
    shortBio: "Especialista en cirugía de hernia, vesícula y procedimientos laparoscópicos con más de 15 años de experiencia.",
    longBio: "El Dr. Luis Angel Medina Andrade se graduó con honores de la Facultad de Medicina de la UNAM y completó su especialidad en Cirugía General en el Hospital General de México. Cuenta con subespecialidad en Cirugía Laparoscópica Avanzada por el Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán. Ha realizado más de 5,000 procedimientos quirúrgicos exitosos y es pionero en técnicas mínimamente invasivas para el tratamiento de hernias complejas.",
    image: "/doctors/dr-luis-angel.jpg",
    credentials: [
      "Certificado por el Consejo Mexicano de Cirugía General",
      "Miembro de la Asociación Mexicana de Cirugía General",
      "Miembro de la Asociación Mexicana de Cirugía Endoscópica",
      "Fellow del American College of Surgeons"
    ],
    specialties: [
      "Cirugía de hernia (inguinal, umbilical, ventral)",
      "Colecistectomía laparoscópica",
      "Cirugía laparoscópica avanzada",
      "Cirugía mínimamente invasiva"
    ]
  },
  {
    id: "sahid-vargas",
    name: "Dr. Sahid Vargas",
    specialty: "Cirujano General y Bariatra",
    shortBio: "Experto en cirugía de vesícula, hernia y procedimientos bariátricos con enfoque en recuperación rápida.",
    longBio: "El Dr. Sahid Vargas es egresado de la Universidad La Salle con especialidad en Cirugía General por el Centro Médico Nacional Siglo XXI. Cuenta con alta especialidad en Cirugía Bariátrica y Metabólica por el Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán. Se ha especializado en protocolos de recuperación acelerada después de cirugía (ERAS) y ha implementado técnicas innovadoras que han permitido reducir significativamente el tiempo de recuperación de sus pacientes.",
    image: "/doctors/dr-sahid-vargas.jpg",
    credentials: [
      "Certificado por el Consejo Mexicano de Cirugía General",
      "Miembro de la Asociación Mexicana de Cirugía para la Obesidad",
      "Miembro de la International Federation for the Surgery of Obesity",
      "Certificación en protocolos ERAS (Enhanced Recovery After Surgery)"
    ],
    specialties: [
      "Cirugía bariátrica y metabólica",
      "Colecistectomía laparoscópica (vesícula)",
      "Reparación de hernias complejas",
      "Protocolos de recuperación acelerada"
    ]
  }
]

export default function GraciasPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const surveyId = searchParams?.get("surveyId") || "unknown"
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  
  // El Dr. Luis Angel Medina Andrade siempre será el asignado
  const assignedDoctor = "luis-angel"

  // Solicitar permisos de notificaciones
  const requestNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          setNotificationsEnabled(true)
          // Sería bueno guardar esta preferencia en localStorage
        }
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-slate-800 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white">
      <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Encabezado y confirmación */}
          <Card className="border-0 shadow-xl mb-10 bg-white dark:bg-slate-800 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
            
            <CardHeader className="pb-4 pt-8">
              <motion.div 
                className="flex justify-center mb-6"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 20,
                  delay: 0.2 
                }}
              >
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center shadow-md dark:from-green-900 dark:to-emerald-900">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>
              <CardTitle className="text-center text-3xl sm:text-4xl text-slate-800 dark:text-white font-bold tracking-tight">
                ¡Gracias por completar su evaluación!
              </CardTitle>
              <CardDescription className="text-center text-base sm:text-lg pt-2 text-slate-600 dark:text-slate-300">
                Su información está siendo revisada por nuestro equipo médico
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8 px-4 sm:px-8">
              {/* Status del paciente con animación */}
              <motion.div 
                className="relative p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900 shadow-inner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-slate-800 px-4 py-1 rounded-full border border-blue-100 dark:border-blue-900">
                  <span className="text-blue-700 dark:text-blue-400 font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-1.5 text-blue-500 dark:text-blue-400" />
                    Estado de su consulta
                  </span>
                </div>
                
                <div className="mt-2 text-center">
                  <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-3 mt-1">
                    Su información ha sido recibida correctamente
                  </h3>
                  
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Stethoscope className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-slate-600 dark:text-slate-300">
                      Asignado al {doctors.find(d => d.id === assignedDoctor)?.name}
                    </span>
                  </div>
                  
                  <div className="p-4 mb-4 border border-blue-100 dark:border-blue-900 rounded-lg bg-white dark:bg-slate-800/60">
                    <p className="text-slate-700 dark:text-slate-300">
                      En breve nuestro personal de recepción le informará cuando será su turno para pasar a consulta con el Dr.
                    </p>
                  </div>
                  
                  <div className="flex justify-center space-x-3 mt-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            onClick={requestNotifications} 
                            variant={notificationsEnabled ? "outline" : "default"}
                            className={`text-xs px-3 py-1 h-8 ${notificationsEnabled ? "border-green-200 text-green-700 dark:border-green-800 dark:text-green-400" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                            size="sm"
                          >
                            <Bell className="h-3.5 w-3.5 mr-1.5" />
                            {notificationsEnabled ? "Notificaciones activadas" : "Recibir notificación"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Le notificaremos cuando sea su turno</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs px-3 py-1 h-8 border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400"
                          >
                            <Phone className="h-3.5 w-3.5 mr-1.5" />
                            <Link href="tel:+525512345678">
                              Contactar recepción
                            </Link>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Llame si necesita salir brevemente</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </motion.div>
              
              {/* Información relevante */}
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.6
                    }
                  }
                }}
                initial="hidden"
                animate="show"
              >
                <motion.div 
                  className="flex flex-col items-center p-4 bg-white dark:bg-slate-800/80 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white text-base">Información Protegida</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-2">
                    Todos sus datos médicos están protegidos bajo estrictos protocolos de confidencialidad
                  </p>
                </motion.div>
                
                <motion.div 
                  className="flex flex-col items-center p-4 bg-white dark:bg-slate-800/80 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/60 flex items-center justify-center mb-3">
                    <Stethoscope className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white text-base">Atención Personalizada</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-2">
                    El médico analizará su caso para ofrecerle el mejor tratamiento a su condición específica
                  </p>
                </motion.div>
                
                <motion.div 
                  className="flex flex-col items-center p-4 bg-white dark:bg-slate-800/80 rounded-xl shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-shadow"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center mb-3">
                    <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-white text-base">Próximos Pasos</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-2">
                    Personal de recepción le llamará cuando sea su turno para pasar a consulta con el doctor
                  </p>
                </motion.div>
              </motion.div>
              
              {/* Mensaje importante */}
              <motion.div 
                className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 p-5 rounded-xl border border-blue-100 dark:border-blue-900 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <h3 className="font-medium text-blue-800 dark:text-blue-300 flex items-center text-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Información importante
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mt-2">
                  Mientras espera, siéntase libre de explorar información sobre nuestros especialistas. Si necesita salir brevemente, por favor notifique a recepción para no perder su turno.
                </p>
              </motion.div>
            </CardContent>
          </Card>

          {/* Sección de Nuestros Especialistas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 flex items-center">
              <User className="mr-2 h-6 w-6 text-blue-600 dark:text-blue-400" />
              Nuestros Especialistas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {doctors.map((doctor) => (
                <Card 
                  key={doctor.id} 
                  className={`overflow-hidden hover:shadow-xl transition-all duration-300 ${
                    doctor.id === assignedDoctor ? 'ring-2 ring-blue-500 dark:ring-blue-400' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-20 w-20 rounded-xl border-2 border-blue-100 dark:border-blue-800 shadow-md">
                        <AvatarImage src={doctor.image} alt={doctor.name} />
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300">
                          {doctor.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{doctor.name}</h3>
                        <Badge className="mt-1 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-800">
                          {doctor.specialty}
                        </Badge>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{doctor.shortBio}</p>
                      </div>
                    </div>
                    
                    <Accordion type="single" collapsible className="mt-4">
                      <AccordionItem value="bio" className="border-b-0">
                        <AccordionTrigger className="text-blue-600 dark:text-blue-400 py-2 hover:no-underline">
                          <span className="text-sm font-medium">Ver perfil completo</span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="space-y-4">
                            <p className="text-slate-700 dark:text-slate-300">{doctor.longBio}</p>
                            
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Especialización:</h4>
                              <ul className="space-y-2">
                                {doctor.specialties.map((specialty, index) => (
                                  <li key={index} className="flex items-center">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{specialty}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-white mb-2">Credenciales:</h4>
                              <ul className="space-y-2">
                                {doctor.credentials.map((credential, index) => (
                                  <li key={index} className="flex items-start">
                                    <div className="mt-1 mr-2 h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></div>
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{credential}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                    
                    {doctor.id === assignedDoctor && (
                      <div className="mt-4 pt-4 border-t border-dashed border-blue-100 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center">
                            <Clock className="h-4 w-4 mr-1.5" />
                            Su médico asignado
                          </span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                            Preparando su consulta
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </motion.div>

          {/* Botón para volver al inicio */}
          <motion.div 
            className="flex justify-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <Button 
              variant="outline" 
              onClick={() => router.push('/')}
              className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              Volver a la página principal
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
          
          <Separator className="my-8" />
          
          <footer className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>¿Tiene alguna pregunta? Comuníquese con recepción o al <Link href="tel:+525512345678" className="text-blue-600 dark:text-blue-400 hover:underline">55 1234 5678</Link></p>
            <p className="mt-1">ID de encuesta: {surveyId}</p>
          </footer>
        </motion.div>
      </div>
    </div>
  )
}