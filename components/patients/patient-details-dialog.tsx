import React, { memo, useMemo, useCallback } from "react"
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
import { format, differenceInYears, parseISO, isValid } from "date-fns"
import { es } from "date-fns/locale"
import { useMediaQuery } from "@/hooks/use-breakpoint"
import { dbDiagnosisToDisplay, DIAGNOSIS_DB_VALUES, type DbDiagnosis } from "@/lib/validation/enums"
import EmptyState from "@/components/ui/empty-state"

import { 
  User, 
  Phone, 
  Mail, 
  X,
  FileText,
  CalendarDays,
  Activity,
  Heart,
  Stethoscope
} from "lucide-react"

interface PatientDetailsDialogProps {
  readonly isOpen: boolean
  readonly patient: Patient
  readonly onClose: () => void
}

type StatusVariantType = "default" | "secondary" | "destructive" | "outline"

// 🎨 Configuración de colores mejorada - basada en el logo de la clínica
const STATUS_CONFIG = {
  [PatientStatusEnum.POTENCIAL]: {
    variant: "secondary" as StatusVariantType,
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700"
  },
  [PatientStatusEnum.ACTIVO]: {
    variant: "default" as StatusVariantType,
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-700"
  },
  [PatientStatusEnum.EN_SEGUIMIENTO]: {
    variant: "secondary" as StatusVariantType,
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700"
  },
  [PatientStatusEnum.OPERADO]: {
    variant: "default" as StatusVariantType,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700"
  },
  [PatientStatusEnum.NO_OPERADO]: {
    variant: "destructive" as StatusVariantType,
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-700"
  },
  [PatientStatusEnum.INACTIVO]: {
    variant: "outline" as StatusVariantType,
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700"
  },
  [PatientStatusEnum.ALTA_MEDICA]: {
    variant: "outline" as StatusVariantType,
    className: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-700"
  }
} as const

// ✅ Cache para formateo de fechas
const dateCache = new Map<string, string>()

// ✅ InfoItem optimizado con diseño profesional
const InfoItem = memo(({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string | number
}) => (
  <div className="flex items-start gap-3 py-3 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
      <Icon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5 break-words">
        {value}
      </p>
    </div>
  </div>
))
InfoItem.displayName = "InfoItem"

// ✅ Helpers optimizados
const toDisplayDiagnosis = (diagnostic?: string | null): string => {
  if (!diagnostic) return "Sin diagnóstico"
  return (DIAGNOSIS_DB_VALUES as readonly string[]).includes(diagnostic)
    ? dbDiagnosisToDisplay(diagnostic as DbDiagnosis)
    : diagnostic
}

const normalizeKey = (s: string) =>
  s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

const formatCachedDate = (date: Date | string | null, formatStr: string): string | null => {
  if (!date) return null
  const key = `${date}_${formatStr}`
  if (dateCache.has(key)) return dateCache.get(key)!
  
  try {
    const result = format(new Date(date), formatStr, { locale: es })
    dateCache.set(key, result)
    return result
  } catch {
    return null
  }
}

// 🚀 Componente principal optimizado
const PatientDetailsDialog = memo<PatientDetailsDialogProps>(({ isOpen, patient, onClose }) => {
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  // ✅ Datos memoizados
  const patientData = useMemo(() => {
    const fullName = `${patient.nombre} ${patient.apellidos}`
    const status = patient.estado_paciente ?? PatientStatusEnum.POTENCIAL
    const statusConfig = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[PatientStatusEnum.INACTIVO]
    
    let computedAge: number | null = null
    if (patient.fecha_nacimiento) {
      try {
        const dob = parseISO(patient.fecha_nacimiento)
        if (isValid(dob)) {
          computedAge = differenceInYears(new Date(), dob)
        }
      } catch {}
    }
    
    const ageDisplay = typeof patient.edad === "number" && !isNaN(patient.edad)
      ? `${patient.edad} años`
      : computedAge !== null
        ? `${computedAge} años`
        : "No disponible"
    
    return {
      fullName,
      status,
      statusConfig,
      ageDisplay,
      computedAge,
      formattedRegistrationDate: formatCachedDate(patient.fecha_registro, "d MMM yyyy"),
      formattedDiagnosticDate: formatCachedDate(patient.fecha_registro, "d MMMM yyyy")
    }
  }, [patient])

  const handleClose = useCallback(() => onClose(), [onClose])

  return (
    <Drawer 
      open={isOpen} 
      onOpenChange={handleClose} 
      direction={isDesktop ? "right" : "bottom"}
    >
      <DrawerContent className={cn(
        "flex flex-col bg-white dark:bg-slate-950",
        isDesktop
          ? "h-full w-full max-w-xl ml-auto border-l"
          : "max-h-[92vh] rounded-t-2xl",
        "border-slate-200 dark:border-slate-800"
      )}>
        {/* Header mejorado con colores profesionales */}
        <DrawerHeader className="relative border-b border-slate-200 dark:border-slate-800 py-4 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-slate-800 dark:bg-slate-700 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {patient.nombre?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 truncate">
                    {patientData.fullName}
                  </DrawerTitle>
                  <Badge 
                    className={cn(
                      "mt-1 text-xs font-medium border",
                      patientData.statusConfig.className
                    )}
                  >
                    {patientData.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <div className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    ID: {patient.id.slice(0, 8)}
                  </span>
                </div>
                {patientData.formattedRegistrationDate && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800">
                    <CalendarDays className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400">
                      {patientData.formattedRegistrationDate}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <DrawerClose asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="flex-shrink-0 rounded-xl h-8 w-8 sm:h-9 sm:w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Tabs mejorados */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col">
          <div className="border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2 bg-white dark:bg-slate-950">
            <TabsList className="grid w-full max-w-sm mx-auto grid-cols-2 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger 
                value="info" 
                className="text-sm py-1.5 data-[state=active]:bg-white data-[state=active]:text-teal-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm"
              >
                Información
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="text-sm py-1.5 data-[state=active]:bg-white data-[state=active]:text-teal-600 dark:data-[state=active]:bg-slate-900 dark:data-[state=active]:text-teal-400 data-[state=active]:shadow-sm"
              >
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className={cn(
            "flex-1",
            isDesktop ? "h-[calc(100vh-200px)]" : "max-h-[60vh]"
          )}>
            <div className="p-4 sm:p-6 space-y-4">
              <TabsContent value="info" className="mt-0 space-y-4">
                {/* Datos Personales */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <User className="h-4 w-4" />
                      Datos Personales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1 bg-white dark:bg-slate-950">
                    <InfoItem 
                      icon={User} 
                      label="Edad" 
                      value={patientData.ageDisplay}
                    />
                    
                    {patient.telefono && (
                      <>
                        <Separator className="my-2 bg-slate-100 dark:bg-slate-800" />
                        <InfoItem 
                          icon={Phone} 
                          label="Teléfono" 
                          value={patient.telefono}
                        />
                      </>
                    )}
                    
                    {patient.email && (
                      <>
                        <Separator className="my-2 bg-slate-100 dark:bg-slate-800" />
                        <InfoItem 
                          icon={Mail} 
                          label="Email" 
                          value={patient.email}
                        />
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Información Médica */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                  <CardHeader className="pb-3 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <FileText className="h-4 w-4" />
                      Información Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3 bg-white dark:bg-slate-950">
                    {patient.diagnostico_principal && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                          Diagnóstico Principal
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {toDisplayDiagnosis(patient.diagnostico_principal)}
                          </p>
                          {normalizeKey(toDisplayDiagnosis(patient.diagnostico_principal)).includes("HERNIA") && (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700">
                              Hernia
                            </Badge>
                          )}
                          {normalizeKey(toDisplayDiagnosis(patient.diagnostico_principal)).includes("VESICULA") && (
                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700">
                              Vesícula
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {patientData.formattedDiagnosticDate && (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">
                          Fecha de diagnóstico
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {patientData.formattedDiagnosticDate}
                        </p>
                      </div>
                    )}
                    
                    <Separator className="my-3 bg-slate-100 dark:bg-slate-800" />
                    
                    {/* Indicadores */}
                    <div>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                        Indicadores
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {patient.estado_paciente === PatientStatusEnum.EN_SEGUIMIENTO && (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Activity className="h-3 w-3 mr-1" />
                            Seguimiento
                          </Badge>
                        )}
                        {((typeof patient.edad === 'number' && patient.edad > 60) || 
                          (patientData.computedAge !== null && patientData.computedAge > 60)) && (
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
                            Edad avanzada
                          </Badge>
                        )}
                        {patient.diagnostico_principal && 
                         normalizeKey(toDisplayDiagnosis(patient.diagnostico_principal)).includes("RECIDIVANTE") && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
                            Recidiva
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
                  <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      Historial de Citas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-8">
                    <EmptyState
                      title="Sin historial"
                      description="Aún no hay citas registradas para este paciente."
                      icon={<CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-600" />}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
          
        {/* Footer */}
        <DrawerFooter className="px-4 sm:px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <DrawerClose asChild>
            <Button 
              variant="outline" 
              className="font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={handleClose}
            >
              Cerrar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
})

PatientDetailsDialog.displayName = "PatientDetailsDialog"

export default PatientDetailsDialog