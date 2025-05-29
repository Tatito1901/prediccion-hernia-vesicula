"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, FileText, Share2, Edit, ClipboardList } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { PatientData } from "@/app/dashboard/data-model"

interface PatientCardViewProps {
  patients: PatientData[]
  loading?: boolean
  onSelectPatient: (patient: PatientData) => void
  onShareSurvey?: (patient: PatientData) => void
  onAnswerSurvey?: (patient: PatientData) => void
  onEditPatient?: (patient: PatientData) => void
}

export function PatientCardView({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}: PatientCardViewProps) {
  // Hook para manejar toques largos en móviles
  const [touchTimeout, setTouchTimeout] = useState<NodeJS.Timeout | null>(null);
  // Estado para mostrar el total de pacientes
  const [showTotal, setShowTotal] = useState(true);

  // Obtener el color de estado
  const getStatusColorClass = (status?: string) => {
    if (!status) return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400";
    
    switch (status) {
      case "OPERADO":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "NO OPERADO":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "PENDIENTE DE CONSULTA":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      case "EN SEGUIMIENTO":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
      case "INDECISO":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    }
  }

  // Función para manejar toques largos (simulando clic derecho en móviles)
  const handleTouchStart = (patient: any) => {
    // Iniciar el temporizador para detectar toque largo
    const timeout = setTimeout(() => {
      // Acción al detectar toque largo (mostrar menú contextual)
      onSelectPatient(patient);
    }, 500); // 500ms es un buen tiempo para un toque largo
    
    setTouchTimeout(timeout);
  };

  const handleTouchEnd = () => {
    // Cancelar el temporizador si el usuario levanta el dedo antes
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Contador de pacientes para móvil - Siempre visible */}
      <div className="text-center text-sm font-medium bg-muted/30 py-2 rounded-md border-border/50 border">
        <span>{patients.length}</span> pacientes encontrados
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron pacientes.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            // Estado de carga
            Array(6).fill(0).map((_, index) => (
              <Card key={`skeleton-${index}`} className="opacity-70">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-6 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                      <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Datos reales
            patients.map((patient) => (
              <Card 
                key={patient.id} 
                className="relative overflow-hidden shadow-sm hover:shadow transition-shadow" 
                onTouchStart={() => handleTouchStart(patient)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd} // Cancelar si el usuario desliza
            >
              <div 
                className="absolute right-2 top-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Abrir menú</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Ver detalles</span>
                    </DropdownMenuItem>

                    {onEditPatient && (
                      <DropdownMenuItem onClick={() => onEditPatient(patient)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                    )}

                    {!patient.encuesta && onShareSurvey && (
                      <DropdownMenuItem onClick={() => onShareSurvey(patient)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Compartir encuesta</span>
                      </DropdownMenuItem>
                    )}

                    {!patient.encuesta && onAnswerSurvey && (
                      <DropdownMenuItem onClick={() => onAnswerSurvey(patient)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        <span>Contestar encuesta</span>
                      </DropdownMenuItem>
                    )}

                    {patient.encuesta && (
                      <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Ver resultados</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <CardContent 
                className="pt-6 pb-2 cursor-pointer active:bg-muted/30 transition-colors" 
                onClick={() => onSelectPatient(patient)}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold truncate">
                      {patient.nombre} {patient.apellidos}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {patient.fecha_primera_consulta 
                        ? new Date(patient.fecha_primera_consulta).toLocaleDateString('es-ES') 
                        : "Sin fecha"} · {patient.edad || "-"} años
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge className={getStatusColorClass(patient.estado_paciente)}>
                      {patient.estado_paciente || "Pendiente"}
                    </Badge>
                    
                    <Badge className={patient.encuesta 
                      ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                    }>
                      {patient.encuesta ? "Encuesta completada" : "Encuesta pendiente"}
                    </Badge>
                  </div>
                  
                  <p className="text-sm line-clamp-2">
                    <span className="font-medium">Diagnóstico:</span> {patient.diagnostico_principal || "Sin diagnóstico"}
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="pt-2 pb-4 flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => onSelectPatient(patient)}
                >
                  <FileText className="mr-2 h-4 w-4" /> 
                  {patient.encuesta ? "Ver resultados" : "Ver detalles"}
                </Button>
                
                {/* Botones adicionales directamente en la tarjeta para mejor UX en móviles */}
                {!patient.encuesta && onAnswerSurvey && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => onAnswerSurvey(patient)}
                  >
                    <ClipboardList className="mr-2 h-4 w-4" /> 
                    Contestar encuesta
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
