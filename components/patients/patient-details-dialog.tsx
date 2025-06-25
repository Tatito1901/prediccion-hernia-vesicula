"use client"

import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerDescription, 
  DrawerFooter, 
  DrawerClose 
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AppointmentHistory } from "@/components/patient-admision/appointment-history";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Patient, PatientStatusEnum } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@/hooks/use-breakpoint";

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
  X
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
    <Drawer open={isOpen} onOpenChange={onClose} direction={drawerDirection}>
      <DrawerContent className={contentClasses}>
        <DrawerHeader className="relative border-b dark:border-slate-700 bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-blue-950">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-blue-100 dark:border-blue-800">
              <CircleUser className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </Avatar>
            <div>
              <DrawerTitle className="text-xl font-semibold text-slate-800 dark:text-slate-100">{fullName}</DrawerTitle>
              <DrawerDescription>
                ID: #{id}
              </DrawerDescription>
              <div className="flex items-center mt-1">
                <Badge className={cn("rounded-full font-medium", getStatusClasses(estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA))}>
                  {estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA}
                </Badge>
              </div>
            </div>
          </div>
          {/* Botón de cierre */}
        <DrawerClose asChild>
          <Button size="icon" variant="ghost" className="absolute top-2 right-2">
            <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <span className="sr-only">Cerrar</span>
          </Button>
        </DrawerClose>
      </DrawerHeader>

        <Tabs defaultValue="info" className="w-full">
          <div className="px-4 py-2 border-b dark:border-slate-700">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="text-blue-800 dark:text-blue-300">Ficha del Paciente</TabsTrigger>
              <TabsTrigger value="history" className="text-blue-800 dark:text-blue-300">Historial de Citas</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className={cn("flex-1 px-4", isDesktop ? "h-[calc(100vh-220px)]" : "h-[50vh] md:h-[60vh]")}> 
            <TabsContent value="info" className="pt-4 pb-6 space-y-6">
              {/* Información prioritaria del paciente */}
              <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-md overflow-hidden">
                <div className="bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-800 py-3 px-4">
                  <h3 className="font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <User size={16} />
                    Información Principal
                  </h3>
                </div>
                
                <div className="p-4">
                  {/* Nombre completo - destacado */}
                  <div className="pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-base font-medium text-slate-900 dark:text-slate-50">{fullName}</span>
                    </div>
                  </div>
                  
                  {/* Información de contacto - grupo visual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 mb-4">
                    {edad !== undefined && (
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md">
                          <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Edad</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{edad} años</p>
                        </div>
                      </div>
                    )}
                    
                    {telefono && (
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md">
                          <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Teléfono</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{telefono}</p>
                        </div>
                      </div>
                    )}
                    
                    {email && (
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md">
                          <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Email</p>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{email}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Fecha de registro */}
                    <div className="flex items-center gap-2">
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-1.5 rounded-md">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Fecha de registro</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {format(new Date(fecha_registro), "dd MMM yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Estado del paciente - destacado */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">Estado del paciente</p>
                    <div className="flex items-center">
                      <Badge className={cn("text-sm px-3 py-1 rounded-md", getStatusClasses(estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA))}>
                        {estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Información clínica */}
              {(diagnostico_principal || comentarios_registro) && (
                <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-md overflow-hidden">
                  <div className="bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-800 py-3 px-4">
                    <h3 className="font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300">
                      <Stethoscope size={16} />
                      Información Médica
                    </h3>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    {diagnostico_principal && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5" />
                          Diagnóstico principal
                        </p>
                        <p className="text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md text-slate-800 dark:text-slate-100">
                          {diagnostico_principal}
                        </p>
                      </div>
                    )}
                    
                    {comentarios_registro && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Notas clínicas
                        </p>
                        <p className="text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md text-slate-800 dark:text-slate-100 whitespace-pre-wrap">
                          {comentarios_registro}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="py-4">
              <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 rounded-md overflow-hidden">
                <div className="bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-800 py-3 px-4">
                  <h3 className="font-medium flex items-center gap-2 text-blue-800 dark:text-blue-300">
                    <Calendar size={16} />
                    Historial de Citas
                  </h3>
                </div>
                <div className="p-4">
                  <AppointmentHistory 
                    patientId={id}
                    showStats={!isMobile}
                    maxItems={isMobile ? 5 : undefined}
                  />
                </div>
              </div>
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
  );
}
