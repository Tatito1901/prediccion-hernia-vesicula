"use client"
import type React from "react"
import { useRouter } from "next/navigation"
import { addDays, format } from "date-fns"
import { es } from "date-fns/locale"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog" // Asegúrate que esta ruta es correcta
import { Button } from "@/components/ui/button" // Asegúrate que esta ruta es correcta
import { PhoneIcon, CalendarIcon, User2Icon, Stethoscope, ClipboardList } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model" // Asegúrate que esta ruta es correcta
import { useAppContext } from "@/lib/context/app-context" // Asegúrate que esta ruta es correcta
import { Badge } from "@/components/ui/badge" // Asegúrate que esta ruta es correcta
// import { useIsMobile } from "@/hooks/use-is-mobile" // Importado pero no usado directamente en el JSX. Considera remover si no es necesario para lógica condicional compleja.

interface PatientDetailsProps {
  patient: PatientData
  trigger: React.ReactNode
}

export function PatientDetails({ patient, trigger }: PatientDetailsProps) {
  const router = useRouter()
  const { addFollowUp, updatePatient } = useAppContext()
  // const isMobile = useIsMobile() // Variable declarada pero no usada en el JSX.
                                  // Tailwind CSS maneja la mayoría de los casos responsivos.
                                  // Úsalo si necesitas lógica JS específica para móvil (ej. renderizar componentes completamente diferentes).

  // Función para obtener color del estado
  const getStatusColorClass = (status: string) => {
    switch (status) {
      case "Operado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "No Operado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "Pendiente de consulta":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      case "Seguimiento":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
      case "Cancelado":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    }
  }

  // Formatear fecha si existe
  const formatFecha = (fechaStr?: string) => {
    if (!fechaStr) return "No disponible"
    try {
      const fecha = new Date(fechaStr)
      // Valida que la fecha sea correcta antes de formatear
      if (isNaN(fecha.getTime())) {
        return fechaStr; // Devuelve el string original si no es una fecha válida
      }
      return format(fecha, "PPP", { locale: es })
    } catch (error) {
      // En caso de error en el parseo o formato, devuelve el string original.
      console.error("Error formatting date:", error);
      return fechaStr 
    }
  }

  const handleAgendarSeguimientoDesdeFicha = (paciente: PatientData) => {
    // 1. Crear un seguimiento básico inicial
    const nuevoSeguimiento = {
      patientId: paciente.id,
      fecha: new Date().toISOString(),
      tipo: "Llamada",
      notas: `Seguimiento iniciado desde ficha del paciente - ${paciente.nombre} ${paciente.apellidos} no ha agendado consulta/cirugía.`,
      resultado: "Indeciso",
      estado: "Programado",
      asignadoA: "Dr. Luis Ángel Medina", // Considera hacerlo dinámico o configurable
      proximoSeguimiento: addDays(new Date(), 7).toISOString(),
    }

    addFollowUp(nuevoSeguimiento)

    // 2. Actualizar el estado del paciente si es necesario
    if (paciente.estado !== "Seguimiento") {
        updatePatient(paciente.id, { estado: "Seguimiento" })
    }

    // 3. Navegar al CRM y seleccionar al paciente
    router.push(`/crm?patientId=${paciente.id}&view=followups`)

    toast.success(`Seguimiento para ${paciente.nombre} agendado. Redirigiendo al CRM.`)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      {/* DialogContent:
        - `sm:max-w-[500px]`: En pantallas pequeñas (`sm` y mayores, típicamente >=640px), el ancho máximo es 500px.
                               En pantallas más pequeñas, se expandirá para usar más del ancho disponible (comportamiento usual de modales).
        - `max-h-[calc(100vh-2rem)]`: La altura máxima es el 100% de la altura del viewport menos 2rem (32px),
                                      dejando un pequeño margen vertical. Esto es bueno para evitar que el diálogo sea demasiado alto.
        - `overflow-y-auto`: Si el contenido excede la altura máxima, aparecerá un scroll vertical.
        - `p-4 sm:p-6`: Añade un padding base de 4 (16px) y lo aumenta a 6 (24px) en pantallas `sm` y mayores.
                       Esto ayuda a que el contenido no esté pegado a los bordes en móviles.
                       Los componentes de shadcn/ui suelen tener su propio padding, esto es un ejemplo si necesitaras ajustarlo.
                       Si el padding por defecto de DialogContent es adecuado, puedes omitir p-4 sm:p-6.
      */}
      <DialogContent className="p-4 sm:p-6 sm:max-w-[500px] max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          {/* DialogTitle:
            - `text-lg sm:text-xl`: Tamaño de fuente base `lg` (1.125rem), y `xl` (1.25rem) en pantallas `sm` y mayores.
          */}
          <DialogTitle className="text-lg sm:text-xl">{patient.nombre} {patient.apellidos}</DialogTitle>
          <DialogDescription>
            {/* Badges:
              - `flex flex-wrap gap-2`: Permite que los badges se envuelvan a la siguiente línea si no caben en una sola.
                                        `gap-2` añade espacio entre ellos.
            */}
            <div className="flex flex-wrap gap-2 mt-1">
              <Badge className={getStatusColorClass(patient.estado)}>
                {patient.estado || "Pendiente"}
              </Badge>
              
              <Badge className={patient.encuesta 
                ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
              }>
                {patient.encuesta ? "Encuesta completada" : "Encuesta pendiente"}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        {/* Contenido Principal del Dialogo:
          - `grid gap-4 py-4`: Un grid con espaciado entre elementos. `py-4` añade padding vertical.
        */}
        <div className="grid gap-4 py-4">
          {/* Información básica en tarjetas:
            - `grid-cols-1 sm:grid-cols-2`: En móviles (por defecto) es una sola columna.
                                           En pantallas `sm` y mayores, cambia a dos columnas.
            - `gap-3`: Espacio entre las tarjetas.
          */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Cada tarjeta:
              - `flex flex-col p-3 rounded-lg border ...`: Estructura y estilos de la tarjeta.
                                                           El padding `p-3` es consistente.
            */}
            <div className="flex flex-col p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <User2Icon className="h-4 w-4" />
                <span className="text-xs">Datos personales</span>
              </div>
              <p className="font-medium">{patient.edad} años</p>
              {patient.telefono && <p className="text-sm">{patient.telefono}</p>}
            </div>
            
            <div className="flex flex-col p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-xs">Fecha de consulta</span>
              </div>
              <p className="font-medium">{formatFecha(patient.fechaConsulta)}</p>
            </div>
          </div>
          
          {/* Diagnóstico */}
          <div className="flex flex-col p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground">
              <Stethoscope className="h-4 w-4" />
              <span className="text-xs">Diagnóstico</span>
            </div>
            <p className="font-medium">{patient.diagnostico || "Sin diagnóstico"}</p>
          </div>
          
          {/* Nota clínica si existe */}
          {patient.notaClinica && (
            <div className="flex flex-col p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs">Nota clínica</span>
              </div>
              {/* `whitespace-pre-wrap`: Mantiene los saltos de línea y espacios de la nota clínica,
                                        y permite que el texto se ajuste (wrap). */}
              <p className="text-sm whitespace-pre-wrap">{patient.notaClinica}</p>
            </div>
          )}
        </div>

        {/* Botón de Agendar Seguimiento:
          - `w-full`: El botón ocupa todo el ancho disponible, lo cual es bueno para la usabilidad en móviles.
          - `h-10 sm:h-11`: Altura base de 10 (2.5rem), y 11 (2.75rem) en pantallas `sm` y mayores.
        */}
        {patient && patient.estado !== "Operado" && !patient.fechaCirugia && (
          <div className="mt-2">
            <Button
              onClick={() => handleAgendarSeguimientoDesdeFicha(patient)}
              className="w-full h-10 sm:h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <PhoneIcon className="mr-2 h-4 w-4" />
              Agendar Seguimiento
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
