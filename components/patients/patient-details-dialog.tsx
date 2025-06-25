"use client"

import { 
  Drawer, 
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentHistory } from "@/components/patient-admision/appointment-history";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Patient, PatientStatusEnum } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@/hooks/use-breakpoint";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Iconos para mejorar la visualización
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Clock, 
  Stethoscope, 
  FileText, 
  CircleUser,
  X,
  Info,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  MapPin
} from "lucide-react";

interface PatientDetailsDialogProps {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
}

export default function PatientDetailsDialog({ isOpen, patient, onClose }: PatientDetailsDialogProps) {
  const {
    nombre,
    apellidos,
    edad,
    telefono,
    email,
    fecha_registro,
    estado_paciente,
    diagnostico_principal,
    comentarios_registro,
    id,
  } = patient;

  const fullName = `${nombre} ${apellidos}`;

  // Hook for responsive drawer direction
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 639px)");
  const drawerDirection = isDesktop ? "right" : "bottom";

  // Estilos del contenedor según dirección
  const contentClasses = cn(
    "flex flex-col bg-background shadow-lg",
    isDesktop
      ? "h-full max-w-lg md:max-w-xl ml-auto"
      : "max-h-[90vh] rounded-t-lg"
  );

  // Calcular la clase de estado para el badge
  const getStatusClasses = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'activo':
        return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
      case 'pendiente':
      case 'pendiente de consulta':
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300";
      case 'inactivo':
        return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <TooltipProvider>
      <Drawer open={isOpen} onOpenChange={onClose} direction={drawerDirection}>
        <DrawerContent className={contentClasses}>
          <DrawerHeader className="relative border-b dark:border-slate-700 bg-gradient-to-r from-blue-100 via-blue-50 to-white dark:from-blue-950 dark:via-slate-800 dark:to-slate-900 pb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-blue-200 dark:border-blue-800 shadow-md">
                  <CircleUser className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </Avatar>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={cn(
                      "absolute -bottom-2 -right-2 rounded-full font-medium px-3 py-1 shadow-sm border cursor-help", 
                      getStatusClasses(estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA)
                    )}>
                      {estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Estado actual del paciente en el sistema.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <div className="flex-1">
                <DrawerTitle className="text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {fullName}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={16} className="text-blue-500 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>ID Paciente: #{id}</p>
                    </TooltipContent>
                  </Tooltip>
                </DrawerTitle>
                
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {fecha_registro && (
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <CalendarDays size={12} className="mr-1" />
                      {format(new Date(fecha_registro), "'Registrado el' d MMM yyyy", { locale: es })}
                    </div>
                  )}
                  
                  {diagnostico_principal && (
                    <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                      <AlertCircle size={12} className="mr-1" />
                      {diagnostico_principal}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DrawerClose asChild>
              <Button size="icon" variant="ghost" className="absolute top-2 right-2">
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                <span className="sr-only">Cerrar</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>

        <Tabs defaultValue="info" className="w-full">
          <div className="px-6 py-2 border-b dark:border-slate-700">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="text-blue-800 dark:text-blue-300">Ficha del Paciente</TabsTrigger>
              <TabsTrigger value="history" className="text-blue-800 dark:text-blue-300">Historial de Citas</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className={cn("flex-1 px-4", isDesktop ? "h-[calc(100vh-220px)]" : "h-[50vh] md:h-[60vh]")}> 
            <TabsContent value="info" className="pt-4 pb-6 space-y-6">
              {/* Sección de Información de Contacto y Demográfica */}
              <Card className="shadow-sm border-blue-200 dark:border-blue-700">
                <CardHeader className="bg-blue-50 dark:bg-blue-900/20 py-3 px-4 flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                    <User size={16} />
                    Datos Personales y Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                      <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Edad</p>
                      <p className="text-base font-medium text-slate-800 dark:text-slate-100">{edad} años</p>
                    </div>
                  </div>
                  {telefono && (
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                        <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Teléfono</p>
                        <p className="text-base font-medium text-slate-800 dark:text-slate-100">{telefono}</p>
                      </div>
                    </div>
                  )}
                  {email && (
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                        <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                        <p className="text-base font-medium text-slate-800 dark:text-slate-100">{email}</p>
                      </div>
                    </div>
                  )}
                  {fecha_registro && (
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Fecha de Registro</p>
                        <p className="text-base font-medium text-slate-800 dark:text-slate-100">
                          {format(new Date(fecha_registro), "dd MMMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sección de Información Médica */}
              {(diagnostico_principal || comentarios_registro) && (
                <Card className="shadow-sm border-emerald-200 dark:border-emerald-700">
                  <CardHeader className="bg-emerald-50 dark:bg-emerald-900/20 py-3 px-4 flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
                      <Stethoscope size={16} />
                      Información Médica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {diagnostico_principal && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <Stethoscope className="h-4 w-4" />
                          Diagnóstico Principal
                        </p>
                        <Badge variant="outline" className="text-base px-3 py-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-600">
                          {diagnostico_principal}
                        </Badge>
                      </div>
                    )}
                    {comentarios_registro && (
                      <div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          Notas Clínicas
                        </p>
                        <CardDescription className="text-base bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md whitespace-pre-wrap leading-relaxed">
                          {comentarios_registro}
                        </CardDescription>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="py-4">
              <Card className="shadow-sm border-purple-200 dark:border-purple-700">
                <CardHeader className="bg-purple-50 dark:bg-purple-900/20 py-3 px-4 flex-row items-center justify-between">
                  <CardTitle className="text-base font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                    <Calendar size={16} />
                    Historial de Citas
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <AppointmentHistory 
                    patientId={id}
                    showStats={!isMobile}
                    maxItems={isMobile ? 5 : undefined}
                  />
                </CardContent>
                <CardFooter className="flex justify-center py-3">
                  <Button variant="ghost" className="text-sm text-purple-600 dark:text-purple-300">
                    Ver historial completo
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </ScrollArea>

          <DrawerFooter className="border-t dark:border-slate-700 pt-2 mt-0">
            <DrawerClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DrawerClose>
          </DrawerFooter>
        </Tabs>
      </DrawerContent>
    </Drawer>
    </TooltipProvider>
  );
}
