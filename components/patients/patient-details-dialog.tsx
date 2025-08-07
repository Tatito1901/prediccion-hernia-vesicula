import React, { memo, useMemo } from "react"
import { 
  Drawer, 
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose 
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Patient, PatientStatusEnum } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useMediaQuery } from "@/hooks/use-breakpoint"

import { 
  User, 
  Phone, 
  Mail, 
  Clock, 
  X,
  FileText,
  CalendarDays,
  CheckCircle2,
  XCircle
} from "lucide-react"

interface PatientDetailsDialogProps {
  readonly isOpen: boolean
  readonly patient: Patient
  readonly onClose: () => void
}

interface AppointmentData {
  readonly id: number
  readonly fecha: string
  readonly hora: string
  readonly tipo: string
  readonly estado: 'completada' | 'pendiente' | 'cancelada'
  readonly medico: string
  readonly notas: string
}

type StatusVariantType = "default" | "secondary" | "destructive" | "outline"
type AppointmentVariantType = "default" | "secondary" | "destructive" | "outline"

// Configuraciones estáticas optimizadas
const STATUS_CONFIG = {
  [PatientStatusEnum.POTENCIAL]: {
    variant: "secondary" as StatusVariantType,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
  },
  [PatientStatusEnum.ACTIVO]: {
    variant: "default" as StatusVariantType,
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    variant: "secondary" as StatusVariantType,
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
  },
  [PatientStatusEnum.OPERADO]: {
    variant: "default" as StatusVariantType,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
  },
  [PatientStatusEnum.NO_OPERADO]: {
    variant: "destructive" as StatusVariantType,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  },
  [PatientStatusEnum.INACTIVO]: {
    variant: "outline" as StatusVariantType,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  },
  [PatientStatusEnum.ALTA_MEDICA]: {
    variant: "outline" as StatusVariantType,
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }
} as const

const APPOINTMENT_CONFIG = {
  completada: {
    icon: CheckCircle2,
    variant: "default" as AppointmentVariantType,
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
  },
  pendiente: {
    icon: Clock,
    variant: "secondary" as AppointmentVariantType,
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
  },
  cancelada: {
    icon: XCircle,
    variant: "destructive" as AppointmentVariantType,
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  }
} as const

// Componente InfoItem optimizado
const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) => (
  <div className="flex items-start gap-3 py-2">
    <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-500 dark:text-slate-400" />
    <div className="min-w-0 flex-1">
      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold break-words mt-0.5 text-slate-800 dark:text-slate-200">
        {value}
      </p>
    </div>
  </div>
)

// Componente AppointmentItem optimizado
const AppointmentItem = ({ appointment }: { appointment: AppointmentData }) => {
  const config = APPOINTMENT_CONFIG[appointment.estado]
  const Icon = config.icon
  
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 mt-1 p-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
              {appointment.tipo}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {format(new Date(appointment.fecha), "d MMM yyyy", { locale: es })} • {appointment.hora}
            </p>
          </div>
          <Badge 
            variant={config.variant} 
            className={cn("text-xs font-medium", config.className)}
          >
            {appointment.estado}
          </Badge>
        </div>
        
        <div className="mt-1">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Médico:</span> {appointment.medico}
          </p>
          {appointment.notas && (
            <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded mt-1">
              {appointment.notas}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente principal optimizado
const PatientDetailsDialog = memo<PatientDetailsDialogProps>(({ isOpen, patient, onClose }) => {
  const {
    nombre,
    apellidos,
    estado_paciente,
    diagnostico_principal,
    comentarios_registro,
    id,
    edad,
    telefono,
    email,
    fecha_registro
  } = patient

  // Valores memoizados
  const fullName = `${nombre} ${apellidos}`
  const status = estado_paciente ?? PatientStatusEnum.POTENCIAL
  const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[PatientStatusEnum.INACTIVO]
  
  // Breakpoints
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  
  // Formateo de fechas
  const formattedRegistrationDate = fecha_registro 
    ? format(new Date(fecha_registro), "d MMM yyyy", { locale: es })
    : null

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={onClose} 
      direction={isDesktop ? "right" : "bottom"}
    >
      <DrawerContent className={cn(
        "flex flex-col bg-white dark:bg-slate-950",
        isDesktop
          ? "h-full max-w-2xl ml-auto border-l border-slate-200 dark:border-slate-800"
          : "max-h-[90vh]"
      )}>
        {/* Header */}
        <DrawerHeader className="border-b border-slate-200 dark:border-slate-800 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {nombre ? nombre.charAt(0).toUpperCase() : 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                    {fullName}
                  </DrawerTitle>
                  <Badge 
                    variant={statusConfig.variant} 
                    className={cn("mt-1 text-xs font-medium", statusConfig.className)}
                  >
                    {status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1">
                  <span className="font-mono">ID: {id}</span>
                </div>
                {formattedRegistrationDate && (
                  <div className="flex items-center gap-1">
                    <span>Registrado: {formattedRegistrationDate}</span>
                  </div>
                )}
              </div>
            </div>
            
            <DrawerClose asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="flex-shrink-0 rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Contenido */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-2 bg-slate-50 dark:bg-slate-900">
            <TabsList className="grid w-full grid-cols-2 bg-white dark:bg-slate-800">
              <TabsTrigger value="info" className="text-sm py-1">
                Información
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm py-1">
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className={cn("flex-1", isDesktop ? "h-[calc(100vh-180px)]" : "max-h-[60vh]")}>
            <div className="p-4">
              <TabsContent value="info" className="space-y-4">
                {/* Sección Datos Personales */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-blue-500" />
                      Datos Personales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1">
                    <InfoItem 
                      icon={User} 
                      label="Edad" 
                      value={`${edad} años`}
                    />
                    
                    {telefono && (
                      <>
                        <Separator className="my-1" />
                        <InfoItem 
                          icon={Phone} 
                          label="Teléfono" 
                          value={telefono}
                        />
                      </>
                    )}
                    
                    {email && (
                      <>
                        <Separator className="my-1" />
                        <InfoItem 
                          icon={Mail} 
                          label="Email" 
                          value={email}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Sección Médica */}
                {/* Sección de Información Médica - Mejorada */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      Información Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Diagnóstico con indicador visual */}
                    {diagnostico_principal && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                          Diagnóstico Principal
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-medium">
                            {diagnostico_principal}
                          </p>
                          {diagnostico_principal.includes("HERNIA") && (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              <span className="mr-1">🔸</span> Hernia
                            </Badge>
                          )}
                          {diagnostico_principal.includes("VESICULA") && (
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                              <span className="mr-1">🟡</span> Vesícula
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Fecha de diagnóstico */}
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                        Fecha de diagnóstico
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">
                        {fecha_registro ? format(new Date(fecha_registro), "d MMMM yyyy", { locale: es }) : "No disponible"}
                      </p>
                    </div>
                    
                    <Separator className="my-2" />
                    
                    {/* Notas médicas */}
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                        Notas Médicas
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md border border-slate-100 dark:border-slate-700">
                        {comentarios_registro || "Sin notas médicas"}
                      </p>
                    </div>
                    
                    {/* Indicadores de riesgo */}
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-medium">
                        Indicadores
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {estado_paciente === PatientStatusEnum.EN_SEGUIMIENTO && (
                          <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Seguimiento
                          </Badge>
                        )}
                        {edad && edad > 60 && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Edad avanzada
                          </Badge>
                        )}
                        {diagnostico_principal?.includes("RECIDIVANTE") && (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Recidiva
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="pt-4">
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-purple-500" />
                      Historial de Citas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <AppointmentItem 
                        appointment={{
                          id: 1,
                          fecha: "2024-06-15",
                          hora: "10:30",
                          tipo: "Consulta inicial",
                          estado: "completada",
                          medico: "Dr. García",
                          notas: "Evaluación general, solicitud de estudios"
                        }}
                      />
                      <AppointmentItem 
                        appointment={{
                          id: 2,
                          fecha: "2024-06-22",
                          hora: "14:00",
                          tipo: "Seguimiento",
                          estado: "completada",
                          medico: "Dr. García",
                          notas: "Revisión de resultados de laboratorio"
                        }}
                      />
                      <AppointmentItem 
                        appointment={{
                          id: 3,
                          fecha: "2024-07-05",
                          hora: "09:15",
                          tipo: "Control",
                          estado: "pendiente",
                          medico: "Dr. García",
                          notas: "Control post-procedimiento"
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>

          {/* Footer */}
          <DrawerFooter className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
            <DrawerClose asChild>
              <Button 
                variant="outline" 
                className="font-medium"
                onClick={onClose}
              >
                Cerrar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
})

PatientDetailsDialog.displayName = "PatientDetailsDialog"

export default PatientDetailsDialog