import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Share2, ClipboardList, FileText, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TableSkeleton } from "@/components/tables/table-skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import type { PatientData } from "@/app/dashboard/data-model"

interface PatientTableProps {
  patients: PatientData[]
  loading?: boolean
  onSelectPatient: (patient: PatientData) => void
  onShareSurvey?: (patient: PatientData) => void
  onAnswerSurvey?: (patient: PatientData) => void
  onEditPatient?: (patient: PatientData) => void
}

export function PatientTable({
  patients,
  loading = false,
  onSelectPatient,
  onShareSurvey,
  onAnswerSurvey,
  onEditPatient,
}: PatientTableProps) {
  const router = useRouter()
  // Referencia a la fecha actual
  const currentDate = new Date();
  
  // Estado para controlar si se muestran o no las consultas futuras
  const [showFutureDates, setShowFutureDates] = useState(false);
  // Establecemos una configuración inicial de ordenamiento por timestamp de registro (más reciente primero)
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PatientData
    direction: "ascending" | "descending"
  }>({ key: "timestampRegistro", direction: "descending" })

  // Función para manejar el ordenamiento
  const handleSort = (key: keyof PatientData) => {
    let direction: "ascending" | "descending" = "ascending"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }

    setSortConfig({ key, direction })
  }

  // Filtrar pacientes para excluir fechas futuras si es necesario
  const filteredPatients = useMemo(() => {
    // Si se muestran fechas futuras, devolver todos los pacientes
    if (showFutureDates) return patients;
    
    // Si no, filtrar para excluir fechas futuras
    return patients.filter(patient => {
      // Si no hay fecha de consulta, incluirlo
      if (!patient.fechaConsulta) return true;
      
      // Convertir la fecha de consulta a objeto Date
      const consultDate = new Date(patient.fechaConsulta);
      
      // Eliminar la hora para comparar solo fechas
      consultDate.setHours(0, 0, 0, 0);
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);
      
      // Incluir solo fechas que sean hoy o anteriores
      return consultDate <= today;
    });
  }, [patients, showFutureDates, currentDate]);

  // Ordenar pacientes según la configuración actual
  const sortedPatients = [...filteredPatients].sort((a, b) => {
    const { key, direction } = sortConfig;

    const valA = a[key];
    const valB = b[key];

    const isAsc = direction === 'ascending';

    // Manejo consistente de null/undefined:
    // En orden ascendente, los no nulos van antes que los nulos.
    // En orden descendente, los nulos van antes que los no nulos.
    if (valA == null && valB != null) return isAsc ? 1 : -1; 
    if (valA != null && valB == null) return isAsc ? -1 : 1;
    if (valA == null && valB == null) return 0;
    
    // A este punto, valA y valB están garantizados de no ser null.

    // Comparaciones específicas por tipo de dato y campos de fecha
    if (key === 'fechaConsulta' || key === 'fechaRegistro' || key === 'ultimoContacto' || key === 'proximoContacto' || key === 'fechaCirugia') {
      // Si alguno de los valores es nulo/indefinido, manejo especial
      if (!valA) return isAsc ? 1 : -1;
      if (!valB) return isAsc ? -1 : 1;
      
      // Convertir las fechas a timestamps para comparación
      const dateA = new Date(valA as string).getTime();
      const dateB = new Date(valB as string).getTime();
      
      // Para fechas, revertimos la lógica normal de ordenamiento para que
      // por defecto la fecha más reciente aparezca primero (valor más alto primero)
      if (dateA < dateB) return isAsc ? 1 : -1; // Invertido intencionalmente
      if (dateA > dateB) return isAsc ? -1 : 1; // Invertido intencionalmente
      return 0;
    }

    if (key === 'encuesta') {
      const boolA = !!valA; // true si es un objeto PatientSurvey, false si es null
      const boolB = !!valB; // true si es un objeto PatientSurvey, false si es null
      if (boolA === boolB) return 0;
      // Para ascendente: false (Pendiente) antes de true (Completada)
      if (isAsc) {
        return boolA ? 1 : -1; 
      } else {
        // Para descendente: true (Completada) antes de false (Pendiente)
        return boolA ? -1 : 1;
      }
    }

    if (typeof valA === 'number' && typeof valB === 'number') { // Maneja 'edad'
      if (valA < valB) return isAsc ? -1 : 1;
      if (valA > valB) return isAsc ? 1 : -1;
      return 0;
    }
    
    // Por defecto, comparación de strings (insensible a mayúsculas/minúsculas)
    // Maneja 'nombre', 'diagnostico', 'estado'
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();

    if (strA < strB) return isAsc ? -1 : 1;
    if (strA > strB) return isAsc ? 1 : -1;
    return 0;
  })

  // Función para obtener el icono y el tooltip de ordenamiento
  const getSortIcon = (key: keyof PatientData) => {
    // Si no está ordenado por esta columna, mostrar un icono sutil
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-4 w-4 opacity-20" />
    }
    
    // Si es un campo de fecha, invertimos los iconos para mayor claridad
    const isDateField = ['fechaConsulta', 'fechaRegistro', 'ultimoContacto', 'proximoContacto', 'fechaCirugia', 'timestampRegistro'].includes(key);
    
    if (sortConfig.direction === "ascending") {
      // Para fechas: ascendente muestra lo más antiguo primero (fecha más baja primero)
      // Para otros: ascendente muestra A-Z o valores más bajos primero
      return (
        <div className="inline-flex items-center">
          <ChevronUp className="h-4 w-4 text-primary" />
          <span className="sr-only">{isDateField ? "Más antiguo primero" : "A-Z"}</span>
        </div>
      )
    } else {
      // Para fechas: descendente muestra lo más reciente primero (fecha más alta primero)
      // Para otros: descendente muestra Z-A o valores más altos primero
      return (
        <div className="inline-flex items-center">
          <ChevronDown className="h-4 w-4 text-primary" />
          <span className="sr-only">{isDateField ? "Más reciente primero" : "Z-A"}</span>
        </div>
      )
    }
  }

  // Mejorar la función para obtener el color de estado
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

  if (loading) {
    return <TableSkeleton rows={5} columns={6} />
  }

  return (
    <div className="rounded-md border">
      {/* Contador de pacientes para tablet */}
      <div className="lg:hidden border-b bg-muted/10 p-2 flex flex-col gap-1">
        <div className="text-center text-sm">
          <span className="font-medium">{sortedPatients.length}</span> pacientes en total
          {!showFutureDates && patients.length > sortedPatients.length && (
            <span className="text-xs text-muted-foreground">
              {" "}
              (excluidas {patients.length - sortedPatients.length} consultas futuras)
            </span>
          )}
        </div>
        <div className="flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs" 
            onClick={() => setShowFutureDates(!showFutureDates)}
          >
            {showFutureDates ? "Ocultar consultas futuras" : "Mostrar todas las consultas"}
          </Button>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => handleSort("nombre")}>
              <div className="flex items-center justify-between group">
                <span>Nombre</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("nombre")}</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hidden lg:table-cell" onClick={() => handleSort("fechaConsulta")}>
              <div className="flex items-center justify-between group">
                <span>Fecha Consulta</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("fechaConsulta")}</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hidden lg:table-cell" onClick={() => handleSort("edad")}>
              <div className="flex items-center justify-between group">
                <span>Edad</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("edad")}</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer hidden md:table-cell" onClick={() => handleSort("diagnostico")}>
              <div className="flex items-center justify-between group">
                <span>Diagnóstico</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("diagnostico")}</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("estado")}>
              <div className="flex items-center justify-between group">
                <span>Estado</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("estado")}</span>
              </div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("encuesta")}>
              <div className="flex items-center justify-between group">
                <span>Encuesta</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">{getSortIcon("encuesta")}</span>
              </div>
            </TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPatients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No se encontraron pacientes.
              </TableCell>
            </TableRow>
          ) : (
            sortedPatients.map((patient) => (
              <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={() => onSelectPatient(patient)}>
                  <div>
                    <div className="font-medium">{patient.nombre} {patient.apellidos}</div>
                    <div className="text-xs text-muted-foreground md:hidden">Diagn: {patient.diagnostico || "Sin diagnóstico"}</div>
                  </div>
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)} className="hidden lg:table-cell">
                  {patient.fechaConsulta ? new Date(patient.fechaConsulta).toLocaleDateString('es-ES') : "N/A"}
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)} className="hidden lg:table-cell">{patient.edad || "N/A"}</TableCell>
                <TableCell onClick={() => onSelectPatient(patient)} className="hidden md:table-cell">
                  {patient.diagnostico || "Sin diagnóstico"}
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>
                  <Badge className={getStatusColorClass(patient.estado)}>{patient.estado || "Pendiente"}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-flex cursor-pointer" onClick={() => {
                          if (patient.encuesta) {
                            // Si la encuesta está completada, ir a resultados
                            router.push(`/survey-results/${patient.id}`)
                          } else if (onAnswerSurvey) {
                            // Si no está completada, invocar función para responderla
                            onAnswerSurvey(patient)
                          }
                        }}>
                          {patient.encuesta ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Completada</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>Pendiente</span>
                            </Badge>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {patient.encuesta 
                          ? "Ver resultados de la encuesta" 
                          : "Completar encuesta pendiente"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Ver ficha completa
                      </DropdownMenuItem>
                      {patient.encuesta && (
                        <DropdownMenuItem onClick={() => router.push(`/survey-results/${patient.id}`)}>
                          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                          Ver resultados encuesta
                        </DropdownMenuItem>
                      )}
                      {onShareSurvey && (
                        <DropdownMenuItem onClick={() => onShareSurvey(patient)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Compartir encuesta
                        </DropdownMenuItem>
                      )}
                      {onAnswerSurvey && !patient.encuesta && (
                        <DropdownMenuItem onClick={() => onAnswerSurvey(patient)}>
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Responder encuesta
                        </DropdownMenuItem>
                      )}
                      {onEditPatient && (
                        <DropdownMenuItem onClick={() => onEditPatient(patient)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar paciente
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
