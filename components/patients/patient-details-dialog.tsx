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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Patient, PatientStatusEnum } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useMediaQuery } from "@/hooks/use-breakpoint";

// Importaciones directas - eliminamos dynamic loading innecesario para iconos pequeños
import { 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  Clock, 
  X,
  FileText,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  XCircle
} from "lucide-react";

interface PatientDetailsDialogProps {
  isOpen: boolean;
  patient: Patient;
  onClose: () => void;
}

// Configuraciones estáticas fuera del componente - objetos planos para mejor rendimiento
const STATUS_VARIANTS = {
  'activo': "default",
  'pendiente': "secondary",
  'pendiente de consulta': "secondary",
  'inactivo': "destructive",
} as const;

const APPOINTMENT_ICONS = {
  'completada': CheckCircle2,
  'pendiente': Clock,
  'cancelada': XCircle,
} as const;

const APPOINTMENT_VARIANTS = {
  'completada': "default",
  'pendiente': "secondary", 
  'cancelada': "destructive",
} as const;

// Datos mock movidos fuera del componente para evitar recreación
const MOCK_APPOINTMENT_HISTORY = [
  {
    id: 1,
    fecha: "2024-06-15",
    hora: "10:30",
    tipo: "Consulta inicial",
    estado: "completada",
    medico: "Dr. García",
    notas: "Evaluación general, solicitud de estudios"
  },
  {
    id: 2,
    fecha: "2024-06-22",
    hora: "14:00",
    tipo: "Seguimiento",
    estado: "completada",
    medico: "Dr. García",
    notas: "Revisión de resultados de laboratorio"
  },
  {
    id: 3,
    fecha: "2024-07-05",
    hora: "09:15",
    tipo: "Control",
    estado: "pendiente",
    medico: "Dr. García",
    notas: "Control post-procedimiento"
  },
  {
    id: 4,
    fecha: "2024-06-01",
    hora: "11:00",
    tipo: "Consulta",
    estado: "cancelada",
    medico: "Dr. López",
    notas: "Paciente no se presentó"
  }
];

// Funciones utilitarias optimizadas
const getStatusVariant = (status: string) => {
  if (!status) return "outline";
  return STATUS_VARIANTS[status.toLowerCase() as keyof typeof STATUS_VARIANTS] || "outline";
};

const getAppointmentIcon = (estado: string) => {
  return APPOINTMENT_ICONS[estado.toLowerCase() as keyof typeof APPOINTMENT_ICONS] || AlertCircle;
};

const getAppointmentBadgeVariant = (estado: string) => {
  return APPOINTMENT_VARIANTS[estado.toLowerCase() as keyof typeof APPOINTMENT_VARIANTS] || "outline";
};

// Componente InfoItem simplificado - sin memoización innecesaria
const InfoItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="flex items-start gap-3 py-3">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  </div>
);

// Componente AppointmentItem simplificado
const AppointmentItem = ({ appointment }: { appointment: any }) => {
  const Icon = getAppointmentIcon(appointment.estado);
  
  return (
    <div className="flex items-start gap-3 py-4">
      <div className="flex-shrink-0 mt-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="text-sm font-medium text-foreground">
              {appointment.tipo}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(appointment.fecha), "d MMM yyyy", { locale: es })} • {appointment.hora}
            </p>
          </div>
          <Badge variant={getAppointmentBadgeVariant(appointment.estado)} className="text-xs">
            {appointment.estado}
          </Badge>
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Médico:</span> {appointment.medico}
          </p>
          {appointment.notas && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">Notas:</span> {appointment.notas}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Componente principal optimizado - eliminamos memoización excesiva
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
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useMediaQuery("(max-width: 639px)");
  const drawerDirection = isDesktop ? "right" : "bottom";

  const contentClasses = cn(
    "flex flex-col bg-background",
    isDesktop
      ? "h-full max-w-lg ml-auto border-l"
      : "max-h-[90vh] rounded-t-lg"
  );

  // Ordenamiento simple - calculado solo una vez
  const sortedAppointmentHistory = MOCK_APPOINTMENT_HISTORY
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, isMobile ? 5 : undefined);

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction={drawerDirection}>
      <DrawerContent className={contentClasses}>
        {/* Header */}
        <DrawerHeader className="border-b py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <DrawerTitle className="text-lg font-semibold text-foreground truncate">
                  {fullName}
                </DrawerTitle>
                <Badge variant={getStatusVariant(estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA)}>
                  {estado_paciente ?? PatientStatusEnum.PENDIENTE_DE_CONSULTA}
                </Badge>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>ID: #{id}</span>
                {fecha_registro && (
                  <span>
                    Registrado: {format(new Date(fecha_registro), "d MMM yyyy", { locale: es })}
                  </span>
                )}
              </div>
            </div>
            
            <DrawerClose asChild>
              <Button size="icon" variant="ghost" className="flex-shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {/* Tabs */}
        <Tabs defaultValue="info" className="flex-1 flex flex-col">
          <div className="border-b px-6 py-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info" className="text-sm">
                Información
              </TabsTrigger>
              <TabsTrigger value="history" className="text-sm">
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className={cn("flex-1", isDesktop ? "h-[calc(100vh-180px)]" : "h-[50vh]")}>
            <div className="p-6">
              <TabsContent value="info" className="mt-0 space-y-6">
                {/* Información Personal */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Datos Personales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      <InfoItem 
                        icon={Calendar} 
                        label="Edad" 
                        value={`${edad} años`} 
                      />
                      
                      {telefono && (
                        <>
                          <Separator />
                          <InfoItem 
                            icon={Phone} 
                            label="Teléfono" 
                            value={telefono} 
                          />
                        </>
                      )}
                      
                      {email && (
                        <>
                          <Separator />
                          <InfoItem 
                            icon={Mail} 
                            label="Email" 
                            value={email} 
                          />
                        </>
                      )}
                      
                      {fecha_registro && (
                        <>
                          <Separator />
                          <InfoItem 
                            icon={Clock} 
                            label="Fecha de Registro" 
                            value={format(new Date(fecha_registro), "dd MMMM yyyy", { locale: es })} 
                          />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Información Médica */}
                {(diagnostico_principal || comentarios_registro) && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Información Médica
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {diagnostico_principal && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Diagnóstico Principal</p>
                            <Badge variant="outline" className="font-normal">
                              {diagnostico_principal}
                            </Badge>
                          </div>
                        )}
                        
                        {comentarios_registro && (
                          <>
                            {diagnostico_principal && <Separator />}
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">Notas</p>
                              <div className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
                                {comentarios_registro}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Historial de Citas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-1">
                      {MOCK_APPOINTMENT_HISTORY.length > 0 ? (
                        sortedAppointmentHistory.map((appointment, index) => (
                          <div key={appointment.id}>
                            <AppointmentItem appointment={appointment} />
                            {index < sortedAppointmentHistory.length - 1 && <Separator />}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <CalendarDays className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No hay citas registradas
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {MOCK_APPOINTMENT_HISTORY.length > 0 && (
                      <div className="mt-6 pt-4 border-t text-center">
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                          Ver historial completo ({MOCK_APPOINTMENT_HISTORY.length} citas)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>

          {/* Footer */}
          <DrawerFooter className="border-t py-4">
            </DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cerrar
              </Button>
            </DrawerClose>
          
        </Tabs>
      </DrawerContent>
    </Drawer>
  );
}