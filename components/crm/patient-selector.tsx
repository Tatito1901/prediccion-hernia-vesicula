"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SearchIcon, FilterIcon, UserIcon, CheckIcon } from "lucide-react"
import type { PatientData } from "@/app/dashboard/data-model"

interface PatientSelectorProps {
  patients: PatientData[]
  onSelectPatient: (patientId: number) => void
  selectedPatientId?: number | null
}

export function PatientSelector({ patients, onSelectPatient, selectedPatientId }: PatientSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [filteredPatients, setFilteredPatients] = useState<PatientData[]>(patients)

  // Filter patients based on search term and active tab
  useEffect(() => {
    let filtered = [...patients]

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (patient) =>
          `${patient.nombre} ${patient.apellidos}`.toLowerCase().includes(term) ||
          patient.diagnostico.toLowerCase().includes(term) ||
          patient.estado.toLowerCase().includes(term),
      )
    }

    // Apply tab filter
    if (activeTab === "pendientes") {
      filtered = filtered.filter((p) => p.estado === "Pendiente" || p.estado === "En Consulta")
    } else if (activeTab === "seguimiento") {
      filtered = filtered.filter((p) => p.estado === "Seguimiento")
    } else if (activeTab === "alta-probabilidad") {
      filtered = filtered.filter((p) => p.probabilidadCirugia >= 0.7)
    } else if (activeTab === "media-probabilidad") {
      filtered = filtered.filter((p) => p.probabilidadCirugia >= 0.4 && p.probabilidadCirugia < 0.7)
    } else if (activeTab === "baja-probabilidad") {
      filtered = filtered.filter((p) => p.probabilidadCirugia < 0.4)
    }

    // Sort by probability
    filtered.sort((a, b) => b.probabilidadCirugia - a.probabilidadCirugia)

    setFilteredPatients(filtered)
  }, [searchTerm, activeTab, patients])

  // Get status badge color
  const getStatusBadgeClass = (estado: string) => {
    switch (estado) {
      case "Operado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "No Operado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "En Consulta":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      case "Seguimiento":
        return "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  // Get probability badge color
  const getProbabilityBadgeClass = (probability: number) => {
    if (probability >= 0.7) {
      return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
    } else if (probability >= 0.4) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
    } else {
      return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
    }
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pacientes</CardTitle>
        <CardDescription>Seleccione un paciente para gestionar su seguimiento</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 border-b">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar pacientes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="px-4 pt-2">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
            <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          </TabsList>
          <TabsList className="grid grid-cols-3 mt-2">
            <TabsTrigger value="alta-probabilidad">Alta Prob.</TabsTrigger>
            <TabsTrigger value="media-probabilidad">Media Prob.</TabsTrigger>
            <TabsTrigger value="baja-probabilidad">Baja Prob.</TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[400px] px-4 py-2">
          {filteredPatients.length > 0 ? (
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-muted/50 ${
                    selectedPatientId === patient.id ? "bg-muted" : ""
                  }`}
                  onClick={() => onSelectPatient(patient.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {patient.nombre} {patient.apellidos}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patient.edad} años | {formatDate(patient.fechaConsulta)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className={getStatusBadgeClass(patient.estado)}>
                      {patient.estado}
                    </Badge>
                    <Badge variant="outline" className={getProbabilityBadgeClass(patient.probabilidadCirugia)}>
                      {(patient.probabilidadCirugia * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  {selectedPatientId === patient.id && (
                    <div className="absolute right-2 top-2">
                      <CheckIcon className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <FilterIcon className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">No se encontraron pacientes</h3>
              <p className="mt-2 text-sm text-muted-foreground">Intente con otros criterios de búsqueda o filtros</p>
              <Button variant="outline" className="mt-4" onClick={() => setSearchTerm("")}>
                Limpiar filtros
              </Button>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
