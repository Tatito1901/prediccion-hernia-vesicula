"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts"
import { Download, Filter, RefreshCw, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"

// Datos de ejemplo para las estadísticas
const mockSurveyData = {
  totalSurveys: 128,
  averageAge: 42,
  averagePainLevel: 6.2,
  highProbabilitySurgery: 38,
  locationDistribution: [
    { name: "CDMX", value: 68 },
    { name: "Estado de México", value: 42 },
    { name: "Otros", value: 18 },
  ],
  ageDistribution: [
    { name: "18-30", value: 22 },
    { name: "31-45", value: 48 },
    { name: "46-60", value: 38 },
    { name: "61+", value: 20 },
  ],
  originDistribution: [
    { name: "Recomendación", value: 42 },
    { name: "Redes sociales", value: 36 },
    { name: "Búsqueda web", value: 28 },
    { name: "Seguro médico", value: 14 },
    { name: "Otros", value: 8 },
  ],
  insuranceDistribution: [
    { name: "IMSS", value: 38 },
    { name: "ISSSTE", value: 22 },
    { name: "Seguro privado", value: 48 },
    { name: "Sin seguro", value: 20 },
  ],
  symptomsDistribution: [
    { name: "Dolor", value: 98 },
    { name: "Inflamación", value: 76 },
    { name: "Limitación de movimiento", value: 64 },
    { name: "Debilidad", value: 42 },
    { name: "Inestabilidad", value: 38 },
  ],
  severityDistribution: [
    { name: "Leve", value: 28 },
    { name: "Moderada", value: 52 },
    { name: "Severa", value: 48 },
  ],
  limitationDistribution: [
    { name: "Mínima", value: 22 },
    { name: "Moderada", value: 46 },
    { name: "Significativa", value: 38 },
    { name: "Severa", value: 22 },
  ],
  previousDiagnosisDistribution: [
    { name: "Con diagnóstico previo", value: 72 },
    { name: "Sin diagnóstico previo", value: 56 },
  ],
  factorsDistribution: [
    { name: "Efectividad", value: 86 },
    { name: "Tiempo recuperación", value: 74 },
    { name: "Costo", value: 68 },
    { name: "Riesgos", value: 62 },
    { name: "Experiencia médico", value: 58 },
  ],
  surgeryProbabilityTrend: [
    { month: "Ene", alta: 8, media: 12, baja: 6 },
    { month: "Feb", alta: 10, media: 14, baja: 8 },
    { month: "Mar", alta: 12, media: 16, baja: 7 },
    { month: "Abr", alta: 14, media: 18, baja: 5 },
    { month: "May", alta: 16, media: 14, baja: 6 },
    { month: "Jun", alta: 18, media: 12, baja: 8 },
  ],
  priorityPatients: [
    {
      id: 1,
      nombre: "María García",
      edad: 58,
      diagnostico: "Osteoartritis avanzada",
      probabilidad: 92,
      fecha: "2023-05-15",
    },
    {
      id: 2,
      nombre: "Juan Pérez",
      edad: 64,
      diagnostico: "Hernia discal L4-L5",
      probabilidad: 88,
      fecha: "2023-05-16",
    },
    {
      id: 3,
      nombre: "Ana Rodríguez",
      edad: 42,
      diagnostico: "Ruptura de ligamento cruzado",
      probabilidad: 86,
      fecha: "2023-05-17",
    },
    {
      id: 4,
      nombre: "Carlos Sánchez",
      edad: 52,
      diagnostico: "Estenosis espinal",
      probabilidad: 84,
      fecha: "2023-05-18",
    },
    {
      id: 5,
      nombre: "Laura Martínez",
      edad: 38,
      diagnostico: "Lesión de menisco",
      probabilidad: 82,
      fecha: "2023-05-19",
    },
  ],
}

// Colores para los gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FF6B6B", "#6B66FF"]

export function SurveyStatistics() {
  const [activeTab, setActiveTab] = useState("resumen")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })
  const [probabilityFilter, setProbabilityFilter] = useState("all")
  const [diagnosisFilter, setDiagnosisFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [ageRange, setAgeRange] = useState([18, 80])

  // Función para exportar datos
  const exportData = () => {
    // Aquí iría la lógica para exportar los datos a CSV o Excel
    alert("Exportando datos...")
  }

  return (
    <div className="space-y-6">
      {/* Panel de métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Encuestas</CardDescription>
            <CardTitle className="text-3xl">{mockSurveyData.totalSurveys}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Edad Promedio</CardDescription>
            <CardTitle className="text-3xl">{mockSurveyData.averageAge} años</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nivel de Dolor Promedio</CardDescription>
            <CardTitle className="text-3xl">{mockSurveyData.averagePainLevel}/10</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alta Probabilidad Cirugía</CardDescription>
            <CardTitle className="text-3xl">
              {Math.round((mockSurveyData.highProbabilitySurgery / mockSurveyData.totalSurveys) * 100)}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">Desde</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Hasta</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="probability">Probabilidad de Cirugía</Label>
              <Select value={probabilityFilter} onValueChange={setProbabilityFilter}>
                <SelectTrigger id="probability">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta (>70%)</SelectItem>
                  <SelectItem value="medium">Media (30-70%)</SelectItem>
                  <SelectItem value="low">Baja (<30%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosis">Diagnóstico Previo</Label>
              <Select value={diagnosisFilter} onValueChange={setDiagnosisFilter}>
                <SelectTrigger id="diagnosis">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Con diagnóstico</SelectItem>
                  <SelectItem value="without">Sin diagnóstico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label>Rango de Edad: {ageRange[0]} - {ageRange[1]} años</Label>
            <Slider
              value={ageRange}
              min={18}
              max={100}
              step={1}
              onValueChange={setAgeRange}
              className="my-4"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setDateRange({ start: "", end: "" })
                setProbabilityFilter("all")
                setDiagnosisFilter("all")
                setSearchTerm("")
                setAgeRange([18, 80])
              }}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resetear
              </Button>
              <Button>
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pestañas de análisis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-4">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="demograficos">Demográficos</TabsTrigger>
          <TabsTrigger value="clinicos">Clínicos</TabsTrigger>
          <TabsTrigger value="preferencias">Preferencias</TabsTrigger>
        </TabsList>

        {/* Contenido de Resumen */}
        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Ubicación</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSurveyData.locationDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.locationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Probabilidad de Cirugía</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockSurveyData.surgeryProbabilityTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="alta" stroke="#FF8042" name="Alta probabilidad" />
                    <Line type="monotone" dataKey="media" stroke="#FFBB28" name="Media probabilidad" />
                    <Line type="monotone" dataKey="baja" stroke="#00C49F" name="Baja probabilidad" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between">
                <span>Pacientes con Alta Probabilidad de Cirugía (>70%)</span>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2">ID</th>
                      <th className="text-left py-3 px-2">Nombre</th>
                      <th className="text-left py-3 px-2">Edad</th>
                      <th className="text-left py-3 px-2">Diagnóstico</th>
                      <th className="text-left py-3 px-2">Probabilidad</th>
                      <th className="text-left py-3 px-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockSurveyData.priorityPatients.map((patient) => (
                      <tr key={patient.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2">{patient.id}</td>
                        <td className="py-3 px-2">{patient.nombre}</td>
                        <td className="py-3 px-2">{patient.edad}</td>
                        <td className="py-3 px-2">{patient.diagnostico}</td>
                        <td className="py-3 px-2">
                          <Badge variant={patient.probabilidad > 85 ? "destructive" : "default"}>
                            {patient.probabilidad}%
                          </Badge>
                        </td>
                        <td className="py-3 px-2">{patient.fecha}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contenido de Demográficos */}
        <TabsContent value="demograficos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Edad</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSurveyData.ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0088FE" name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>¿Cómo nos encontraron?</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSurveyData.originDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.originDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Seguro Médico</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSurveyData.insuranceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#00C49F" name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contenido de Clínicos */}
        <TabsContent value="clinicos" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Síntomas más Comunes</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSurveyData.symptomsDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884D8" name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Nivel de Dolor Reportado</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { nivel: "0-2", pacientes: 12 },
                      { nivel: "3-4", pacientes: 24 },
                      { nivel: "5-6", pacientes: 38 },
                      { nivel: "7-8", pacientes: 32 },
                      { nivel: "9-10", pacientes: 22 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nivel" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="pacientes" stroke="#FF8042" fill="#FF8042" name="Pacientes" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severidad de la Condición</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSurveyData.severityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Diagnóstico Previo</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockSurveyData.previousDiagnosisDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.previousDiagnosisDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contenido de Preferencias */}
        <TabsContent value="preferencias" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Factores Importantes para los Pacientes</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockSurveyData.factorsDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#FFBB28" name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Disponibilidad para Tratamiento</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Tiempo completo", value: 42 },
                        { name: "Parcial (mañanas)", value: 36 },
                        { name: "Parcial (tardes)", value: 28 },
                        { name: "Fines de semana", value: 22 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.locationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plazo Deseado para Iniciar Tratamiento</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Inmediato", value: 48 },
                      { name: "1-2 semanas", value: 36 },
                      { name: "1 mes", value: 24 },
                      { name: "2-3 meses", value: 12 },
                      { name: "Más de 3 meses", value: 8 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#82CA9D" name="Pacientes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Persona de Apoyo</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Esposo/a", value: 52 },
                        { name: "Hijo/a", value: 38 },
                        { name: "Padres", value: 22 },
                        { name: "Otros familiares", value: 12 },
                        { name: "Amigos", value: 4 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {mockSurveyData.locationDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} pacientes`, 'Cantidad']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
