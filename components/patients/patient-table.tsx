import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Edit, Share2, ClipboardList, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TableSkeleton } from "@/components/tables/table-skeleton"
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
  // Establecemos una configuración inicial de ordenamiento por nombre
  const [sortConfig, setSortConfig] = useState<{
    key: keyof PatientData
    direction: "ascending" | "descending"
  }>({ key: "nombre", direction: "ascending" })

  // Función para manejar el ordenamiento
  const handleSort = (key: keyof PatientData) => {
    let direction: "ascending" | "descending" = "ascending"

    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }

    setSortConfig({ key, direction })
  }

  // Ordenar pacientes según la configuración actual
  const sortedPatients = [...patients].sort((a, b) => {
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

    // Comparaciones específicas por tipo de dato
    if (key === 'fechaConsulta') {
      const dateA = new Date(valA as string).getTime();
      const dateB = new Date(valB as string).getTime();
      if (dateA < dateB) return isAsc ? -1 : 1;
      if (dateA > dateB) return isAsc ? 1 : -1;
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

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (key: keyof PatientData) => {
    if (sortConfig.key !== key) {
      return null
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    )
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="cursor-pointer" onClick={() => handleSort("nombre")}>
              <div className="flex items-center">Nombre {getSortIcon("nombre")}</div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("fechaConsulta")}>
              <div className="flex items-center">Fecha Consulta {getSortIcon("fechaConsulta")}</div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("edad")}>
              <div className="flex items-center">Edad {getSortIcon("edad")}</div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("diagnostico")}>
              <div className="flex items-center">Diagnóstico {getSortIcon("diagnostico")}</div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("estado")}>
              <div className="flex items-center">Estado {getSortIcon("estado")}</div>
            </TableHead>
            <TableHead className="cursor-pointer" onClick={() => handleSort("encuesta")}>
              <div className="flex items-center">Encuesta {getSortIcon("encuesta")}</div>
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
                  {patient.nombre} {patient.apellidos}
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>
                  {patient.fechaConsulta ? new Date(patient.fechaConsulta).toLocaleDateString('es-ES') : "N/A"}
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>{patient.edad || "N/A"}</TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>
                  {patient.diagnostico || "Sin diagnóstico"}
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>
                  <Badge className={getStatusColorClass(patient.estado)}>{patient.estado || "Pendiente"}</Badge>
                </TableCell>
                <TableCell onClick={() => onSelectPatient(patient)}>
                  {patient.encuesta ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                      Completada
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400">Pendiente</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Abrir menú</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onSelectPatient(patient)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Ver detalles/Resultados</span>
                      </DropdownMenuItem>

                      {onEditPatient && (
                        <DropdownMenuItem onClick={() => onEditPatient(patient)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>Editar Paciente</span>
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
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
