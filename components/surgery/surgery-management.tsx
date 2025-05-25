"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CalendarIcon, FileTextIcon, MoreHorizontalIcon, PlusIcon, UserIcon } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"
import { PatientDetails } from "@/components/patients/patient-details"

interface SurgeryManagementProps {
  patients: PatientData[]
}

export function SurgeryManagement({ patients }: SurgeryManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [isScheduling, setIsScheduling] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientData | null>(null)
  const [surgeryDate, setSurgeryDate] = useState("")
  const [surgeryDoctor, setSurgeryDoctor] = useState("")

  // Filtrar pacientes operados y pendientes de operación
  const operatedPatients = patients.filter((p) => p.estado === "Operado")
  const pendingPatients = patients.filter(
    (p) => p.estado === "Pendiente" || p.estado === "En Consulta" || p.estado === "Seguimiento",
  )

  // Filtrar por término de búsqueda
  const filteredOperatedPatients = operatedPatients.filter(
    (patient) =>
      `${patient.nombre} ${patient.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredPendingPatients = pendingPatients.filter(
    (patient) =>
      `${patient.nombre} ${patient.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.diagnostico.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Función para programar cirugía
  const scheduleSurgery = () => {
    if (!selectedPatient || !surgeryDate || !surgeryDoctor) {
      toast.error("Por favor complete todos los campos")
      return
    }

    // Aquí se enviarían los datos al backend
    console.log("Programar cirugía:", {
      patientId: selectedPatient.id,
      surgeryDate,
      surgeryDoctor,
    })

    // Simular éxito
    toast.success("Cirugía programada correctamente")
    setIsScheduling(false)
    setSurgeryDate("")
    setSurgeryDoctor("")
    setSelectedPatient(null)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Gestión de Cirugías</CardTitle>
            <CardDescription>Administre las cirugías programadas y realizadas</CardDescription>
          </div>
          <Dialog open={isScheduling} onOpenChange={setIsScheduling}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                Programar Cirugía
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Programar Nueva Cirugía</DialogTitle>
                <DialogDescription>Complete la información para programar la cirugía.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex flex-col gap-2">
                  <label htmlFor="patient" className="text-sm font-medium">
                    Paciente*
                  </label>
                  <Select
                    onValueChange={(value) => {
                      const patient = pendingPatients.find((p) => p.id.toString() === value)
                      setSelectedPatient(patient || null)
                    }}
                  >
                    <SelectTrigger id="patient">
                      <SelectValue placeholder="Seleccione un paciente" />
                    </SelectTrigger>
                    <SelectContent>
                      {pendingPatients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.nombre} {patient.apellidos} - {patient.diagnostico}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="surgeryDate" className="text-sm font-medium">
                    Fecha de Cirugía*
                  </label>
                  <Input
                    id="surgeryDate"
                    type="date"
                    value={surgeryDate}
                    onChange={(e) => setSurgeryDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="surgeryDoctor" className="text-sm font-medium">
                    Doctor*
                  </label>
                  <Select onValueChange={setSurgeryDoctor}>
                    <SelectTrigger id="surgeryDoctor">
                      <SelectValue placeholder="Seleccione un doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr. Luis Ángel Medina">Dr. Luis Ángel Medina</SelectItem>
                      <SelectItem value="Dra. Ana Gutiérrez">Dra. Ana Gutiérrez</SelectItem>
                      <SelectItem value="Dr. Ricardo Fuentes">Dr. Ricardo Fuentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsScheduling(false)}>
                  Cancelar
                </Button>
                <Button onClick={scheduleSurgery}>Programar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="programadas">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="programadas">Programadas</TabsTrigger>
              <TabsTrigger value="realizadas">Realizadas</TabsTrigger>
            </TabsList>
            <Input
              placeholder="Buscar pacientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <TabsContent value="programadas">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Fecha Programada</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPendingPatients.length > 0 ? (
                    filteredPendingPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>{patient.id}</TableCell>
                        <TableCell className="font-medium">
                          {patient.nombre} {patient.apellidos}
                        </TableCell>
                        <TableCell>{patient.edad}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{patient.diagnostico}</Badge>
                        </TableCell>
                        <TableCell>
                          {patient.fechaCirugia
                            ? new Date(patient.fechaCirugia).toLocaleDateString("es-MX")
                            : "No programada"}
                        </TableCell>
                        <TableCell>{patient.doctorAsignado || "No asignado"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`px-1.5 ${
                              patient.estado === "Pendiente"
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
                                : patient.estado === "En Consulta"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
                                  : "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
                            }`}
                          >
                            {patient.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <PatientDetails
                                patient={patient}
                                trigger={<DropdownMenuItem>Ver detalles</DropdownMenuItem>}
                              />
                              <DropdownMenuItem>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                <span>Programar cirugía</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                <span>Historial médico</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No se encontraron resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="realizadas">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Diagnóstico</TableHead>
                    <TableHead>Fecha Cirugía</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperatedPatients.length > 0 ? (
                    filteredOperatedPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell>{patient.id}</TableCell>
                        <TableCell className="font-medium">
                          {patient.nombre} {patient.apellidos}
                        </TableCell>
                        <TableCell>{patient.edad}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{patient.diagnostico}</Badge>
                        </TableCell>
                        <TableCell>
                          {patient.fechaCirugia
                            ? new Date(patient.fechaCirugia).toLocaleDateString("es-MX")
                            : "No registrada"}
                        </TableCell>
                        <TableCell>{patient.doctorAsignado || "No asignado"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menú</span>
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <PatientDetails
                                patient={patient}
                                trigger={<DropdownMenuItem>Ver detalles</DropdownMenuItem>}
                              />
                              <DropdownMenuItem>
                                <FileTextIcon className="mr-2 h-4 w-4" />
                                <span>Historial médico</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserIcon className="mr-2 h-4 w-4" />
                                <span>Programar seguimiento</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron resultados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
