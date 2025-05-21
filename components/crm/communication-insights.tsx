"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { PhoneIcon, MailIcon, MessageSquareIcon, UserIcon } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

interface CommunicationInsightsProps {
  patients: PatientData[]
  followUps: any[]
  onCreateFollowUp: (patientId: number, type: string) => void
}

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function CommunicationInsights({ patients, followUps, onCreateFollowUp }: CommunicationInsightsProps) {
  const [activeTab, setActiveTab] = useState("effectiveness")
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [selectedCommunicationType, setSelectedCommunicationType] = useState<string>("all")
  const [timeFrame, setTimeFrame] = useState<string>("month")

  // Get communication effectiveness data
  const getCommunicationEffectivenessData = () => {
    // This would normally come from real data analysis
    return [
      { name: "Llamada", efectividad: 68, cantidad: 120 },
      { name: "Email", efectividad: 42, cantidad: 85 },
      { name: "WhatsApp", efectividad: 75, cantidad: 95 },
      { name: "Consulta", efectividad: 82, cantidad: 50 },
    ]
  }

  // Get communication frequency data
  const getCommunicationFrequencyData = () => {
    // This would normally be calculated from real data
    return [
      { name: "1 contacto", value: 30 },
      { name: "2 contactos", value: 25 },
      { name: "3 contactos", value: 20 },
      { name: "4 contactos", value: 15 },
      { name: "5+ contactos", value: 10 },
    ]
  }

  // Get conversion rate by communication type
  const getConversionRateData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Llamada", tasa: 35 },
      { name: "Email", tasa: 22 },
      { name: "WhatsApp", tasa: 40 },
      { name: "Consulta", tasa: 55 },
      { name: "Múltiples", tasa: 65 },
    ]
  }

  // Get patients without recent communication
  const getPatientsWithoutRecentCommunication = () => {
    // In a real app, this would filter patients who haven't been contacted recently
    // For now, we'll just return a subset of patients
    return patients
      .filter((patient) => !patient.fechaCirugia) // Only patients without scheduled surgery
      .slice(0, 5) // Just take the first 5 for demo purposes
  }

  // Get communication history for a patient
  const getPatientCommunicationHistory = (patientId: number) => {
    // In a real app, this would fetch the actual communication history
    // For now, we'll generate some mock data
    return [
      {
        id: 1,
        date: "2023-05-10",
        type: "Llamada",
        result: "No contactado",
        notes: "No contestó, se dejó mensaje de voz",
      },
      {
        id: 2,
        date: "2023-05-15",
        type: "Email",
        result: "Enviado",
        notes: "Se envió información sobre el procedimiento",
      },
      {
        id: 3,
        date: "2023-05-20",
        type: "Llamada",
        result: "Interesado",
        notes: "Paciente interesado pero quiere pensarlo más",
      },
      {
        id: 4,
        date: "2023-06-01",
        type: "WhatsApp",
        result: "Indeciso",
        notes: "Tiene dudas sobre el costo y recuperación",
      },
    ]
  }

  // Get icon for communication type
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "Llamada":
        return <PhoneIcon className="h-4 w-4" />
      case "Email":
        return <MailIcon className="h-4 w-4" />
      case "WhatsApp":
        return <MessageSquareIcon className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Análisis de Comunicación</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="effectiveness" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="effectiveness">Efectividad</TabsTrigger>
            <TabsTrigger value="patients">Pacientes</TabsTrigger>
            <TabsTrigger value="history">Historial</TabsTrigger>
          </TabsList>

          {/* Effectiveness Analysis */}
          <TabsContent value="effectiveness">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="font-medium text-lg">Efectividad de Comunicación</h3>
                <div className="flex gap-2">
                  <Select value={selectedCommunicationType} onValueChange={setSelectedCommunicationType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Tipo de comunicación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los tipos</SelectItem>
                      <SelectItem value="Llamada">Llamada</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={timeFrame} onValueChange={setTimeFrame}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Última semana</SelectItem>
                      <SelectItem value="month">Último mes</SelectItem>
                      <SelectItem value="quarter">Último trimestre</SelectItem>
                      <SelectItem value="year">Último año</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Effectiveness Bar Chart */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Tasa de Efectividad por Tipo</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getCommunicationEffectivenessData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, "Efectividad"]} />
                        <Legend />
                        <Bar dataKey="efectividad" fill="#0088FE" name="Efectividad (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Conversion Rate Chart */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Tasa de Conversión por Tipo</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getConversionRateData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis unit="%" />
                        <Tooltip formatter={(value) => [`${value}%`, "Tasa de Conversión"]} />
                        <Legend />
                        <Bar dataKey="tasa" fill="#00C49F" name="Tasa de Conversión (%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Communication Frequency Pie Chart */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Frecuencia de Contacto</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getCommunicationFrequencyData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getCommunicationFrequencyData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Key Insights */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Conclusiones Clave</h4>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Método Más Efectivo</h5>
                      <p className="mt-1">
                        Las consultas presenciales tienen la mayor tasa de conversión (55%), seguidas por WhatsApp
                        (40%).
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Frecuencia Óptima</h5>
                      <p className="mt-1">
                        Los pacientes que reciben 3 o más contactos tienen un 65% más de probabilidad de programar
                        cirugía.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Momento Ideal</h5>
                      <p className="mt-1">
                        El seguimiento dentro de los primeros 7 días después de la consulta aumenta la conversión en un
                        40%.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Combinación Recomendada</h5>
                      <p className="mt-1">
                        La secuencia más efectiva es: Llamada inicial → WhatsApp de seguimiento → Email con información.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Patients Without Recent Communication */}
          <TabsContent value="patients">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Pacientes sin Comunicación Reciente</h3>

              <div className="border rounded-md">
                {getPatientsWithoutRecentCommunication().length > 0 ? (
                  <div className="divide-y">
                    {getPatientsWithoutRecentCommunication().map((patient) => (
                      <div key={patient.id} className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <div className="font-medium">
                              {patient.nombre} {patient.apellidos}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {patient.edad} años | {patient.diagnostico}
                            </div>
                            <div className="text-sm mt-1">
                              Último contacto: <span className="font-medium">hace 30 días</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onCreateFollowUp(patient.id, "Llamada")
                                toast.success("Seguimiento por llamada programado")
                              }}
                            >
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              Llamar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onCreateFollowUp(patient.id, "Email")
                                toast.success("Seguimiento por email programado")
                              }}
                            >
                              <MailIcon className="h-4 w-4 mr-1" />
                              Email
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                onCreateFollowUp(patient.id, "WhatsApp")
                                toast.success("Seguimiento por WhatsApp programado")
                              }}
                            >
                              <MessageSquareIcon className="h-4 w-4 mr-1" />
                              WhatsApp
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay pacientes sin comunicación reciente
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Communication History */}
          <TabsContent value="history">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-lg mb-4">Seleccionar Paciente</h3>
                <div className="border rounded-md h-[500px] overflow-y-auto">
                  {patients.length > 0 ? (
                    <div className="divide-y">
                      {patients.map((patient) => (
                        <div
                          key={patient.id}
                          className={cn(
                            "p-3 cursor-pointer hover:bg-muted/50 transition-colors",
                            selectedPatientId === patient.id && "bg-muted",
                          )}
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">
                                {patient.nombre} {patient.apellidos}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {patient.edad} años | {patient.diagnostico}
                              </div>
                            </div>
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No hay pacientes disponibles</div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <h3 className="font-medium text-lg mb-4">Historial de Comunicación</h3>

                {selectedPatientId ? (
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md">
                      <div className="font-medium">
                        {patients.find((p) => p.id === selectedPatientId)?.nombre}{" "}
                        {patients.find((p) => p.id === selectedPatientId)?.apellidos}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patients.find((p) => p.id === selectedPatientId)?.edad} años |{" "}
                        {patients.find((p) => p.id === selectedPatientId)?.diagnostico}
                      </div>
                      <div className="text-sm mt-1">
                        Prob. Cirugía:{" "}
                        {((patients.find((p) => p.id === selectedPatientId)?.probabilidadCirugia || 0) * 100).toFixed(
                          0,
                        )}
                        %
                      </div>
                    </div>

                    <div className="border rounded-md">
                      {getPatientCommunicationHistory(selectedPatientId).length > 0 ? (
                        <div className="divide-y">
                          {getPatientCommunicationHistory(selectedPatientId).map((comm, index) => (
                            <div key={index} className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    {getCommunicationIcon(comm.type)}
                                    <span className="font-medium">{comm.type}</span>
                                    <span className="text-sm text-muted-foreground">{comm.date}</span>
                                  </div>
                                  <div className="mt-1 text-sm">
                                    Resultado:{" "}
                                    <span
                                      className={cn(
                                        comm.result === "Interesado" && "text-green-600",
                                        comm.result === "No interesado" && "text-red-600",
                                        comm.result === "Indeciso" && "text-amber-600",
                                        comm.result === "No contactado" && "text-gray-600",
                                      )}
                                    >
                                      {comm.result}
                                    </span>
                                  </div>
                                  <div className="mt-2 text-sm">{comm.notes}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No hay historial de comunicación para este paciente
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          onCreateFollowUp(selectedPatientId, "Llamada")
                          toast.success("Seguimiento por llamada programado")
                        }}
                      >
                        <PhoneIcon className="h-4 w-4 mr-1" />
                        Llamar
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          onCreateFollowUp(selectedPatientId, "Email")
                          toast.success("Seguimiento por email programado")
                        }}
                      >
                        <MailIcon className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => {
                          onCreateFollowUp(selectedPatientId, "WhatsApp")
                          toast.success("Seguimiento por WhatsApp programado")
                        }}
                      >
                        <MessageSquareIcon className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md h-full flex flex-col items-center justify-center">
                    <UserIcon className="h-12 w-12 mb-4 text-muted-foreground/50" />
                    <p>Seleccione un paciente para ver su historial</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
