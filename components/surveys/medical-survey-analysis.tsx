"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Search,
  SortAsc,
  Calendar,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
} from "lucide-react"
import { gridLayouts, responsiveHeight } from "@/src/lib/responsive-utils"

// Datos de muestra para el dashboard
const sampleData = {
  totalEncuestas: 256,
  completadas: 230,
  incompletas: 26,
  tasaConversion: 0.68,
  diagnosticos: [
    { name: "Hernia Inguinal", value: 120 },
    { name: "Vesícula", value: 80 },
    { name: "Hernia Umbilical", value: 40 },
    { name: "Hernia Hiatal", value: 16 },
  ],
  preocupaciones: [
    { name: "Tiempo de recuperación", value: 150 },
    { name: "Costo", value: 120 },
    { name: "Miedo al procedimiento", value: 100 },
    { name: "Ausencia laboral", value: 80 },
  ],
  tendenciaMensual: [
    { mes: "Ene", encuestas: 18, conversiones: 10 },
    { mes: "Feb", encuestas: 22, conversiones: 12 },
    { mes: "Mar", encuestas: 30, conversiones: 18 },
    { mes: "Abr", encuestas: 25, conversiones: 15 },
    { mes: "May", encuestas: 35, conversiones: 22 },
    { mes: "Jun", encuestas: 40, conversiones: 28 },
  ],
  pacientesPrioritarios: [
    {
      id: 1,
      nombre: "Ana García",
      edad: 45,
      diagnostico: "Hernia Inguinal",
      probabilidad: 0.92,
      telefono: "555-1234",
      ultimoContacto: "2023-06-10",
    },
    {
      id: 2,
      nombre: "Carlos Pérez",
      edad: 52,
      diagnostico: "Vesícula",
      probabilidad: 0.88,
      telefono: "555-5678",
      ultimoContacto: "2023-06-12",
    },
    {
      id: 3,
      nombre: "María Rodríguez",
      edad: 38,
      diagnostico: "Hernia Umbilical",
      probabilidad: 0.85,
      telefono: "555-9012",
      ultimoContacto: "2023-06-15",
    },
    {
      id: 4,
      nombre: "José Martínez",
      edad: 61,
      diagnostico: "Hernia Hiatal",
      probabilidad: 0.82,
      telefono: "555-3456",
      ultimoContacto: "2023-06-18",
    },
    {
      id: 5,
      nombre: "Laura Sánchez",
      edad: 47,
      diagnostico: "Vesícula",
      probabilidad: 0.79,
      telefono: "555-7890",
      ultimoContacto: "2023-06-20",
    },
  ],
  comentariosRecientes: [
    {
      id: 1,
      paciente: "Roberto Díaz",
      comentario: "Excelente atención, muy profesionales y claros con la información.",
      sentimiento: "positivo",
      fecha: "2023-06-22",
    },
    {
      id: 2,
      paciente: "Sofía López",
      comentario: "Tengo dudas sobre el costo total del procedimiento y si mi seguro lo cubre.",
      sentimiento: "neutral",
      fecha: "2023-06-21",
    },
    {
      id: 3,
      paciente: "Miguel Torres",
      comentario: "Me preocupa el tiempo de recuperación ya que no puedo ausentarme mucho del trabajo.",
      sentimiento: "negativo",
      fecha: "2023-06-20",
    },
    {
      id: 4,
      paciente: "Carmen Vega",
      comentario: "La explicación del doctor fue muy clara y me ayudó a decidirme.",
      sentimiento: "positivo",
      fecha: "2023-06-19",
    },
  ],
}

// Colores para los gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export default function MedicalSurveyAnalysis() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [filtroFecha, setFiltroFecha] = useState("ultimo-mes")
  const [filtroDiagnostico, setFiltroDiagnostico] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")

  // Función para formatear porcentajes
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`

  // Función para formatear fechas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })
  }

  // Función para obtener clase de color según sentimiento
  const getSentimentClass = (sentimiento: string) => {
    switch (sentimiento) {
      case "positivo":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "negativo":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    }
  }

  return (
    <div className="space-y-6">
      {/* Encabezado con filtros */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Análisis de Encuestas Médicas</h2>
          <p className="text-muted-foreground">Visualización y análisis de datos de encuestas de pacientes</p>
        </div>
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-x-2 md:space-y-0">
          <Select value={filtroFecha} onValueChange={setFiltroFecha}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ultima-semana">Última semana</SelectItem>
              <SelectItem value="ultimo-mes">Último mes</SelectItem>
              <SelectItem value="ultimo-trimestre">Último trimestre</SelectItem>
              <SelectItem value="ultimo-año">Último año</SelectItem>
              <SelectItem value="todo">Todo el tiempo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroDiagnostico} onValueChange={setFiltroDiagnostico}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Diagnóstico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los diagnósticos</SelectItem>
              <SelectItem value="hernia-inguinal">Hernia Inguinal</SelectItem>
              <SelectItem value="vesicula">Vesícula</SelectItem>
              <SelectItem value="hernia-umbilical">Hernia Umbilical</SelectItem>
              <SelectItem value="hernia-hiatal">Hernia Hiatal</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            <span>Exportar</span>
          </Button>
        </div>
      </div>

      {/* Navegación principal */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-auto">
          <TabsList className="inline-flex w-full md:w-auto">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="pacientes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Pacientes Prioritarios</span>
            </TabsTrigger>
            <TabsTrigger value="tendencias" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Tendencias</span>
            </TabsTrigger>
            <TabsTrigger value="comentarios" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Comentarios</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard principal */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Tarjetas de métricas */}
          <div className={gridLayouts.dashboard}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Encuestas</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleData.totalEncuestas}</div>
                <p className="text-xs text-muted-foreground">
                  +{Math.round(sampleData.totalEncuestas * 0.12)} desde el mes pasado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(sampleData.tasaConversion)}</div>
                <p className="text-xs text-muted-foreground">+{formatPercent(0.05)} desde el mes pasado</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Encuestas Completadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleData.completadas}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(sampleData.completadas / sampleData.totalEncuestas)} del total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Encuestas Incompletas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleData.incompletas}</div>
                <p className="text-xs text-muted-foreground">
                  {formatPercent(sampleData.incompletas / sampleData.totalEncuestas)} del total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos principales */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Diagnóstico</CardTitle>
                <CardDescription>Encuestas agrupadas por diagnóstico médico</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sampleData.diagnosticos}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {sampleData.diagnosticos.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} encuestas`, "Cantidad"]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Principales Preocupaciones</CardTitle>
                <CardDescription>Preocupaciones más comunes de los pacientes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]", "h-[400px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sampleData.preocupaciones}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => [`${value} pacientes`, "Cantidad"]} />
                      <Bar dataKey="value" fill="#8884d8">
                        {sampleData.preocupaciones.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pacientes prioritarios (versión resumida) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pacientes Prioritarios</CardTitle>
                <CardDescription>Pacientes con alta probabilidad de conversión</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("pacientes")}>
                Ver todos
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleData.pacientesPrioritarios.slice(0, 3).map((paciente) => (
                  <div key={paciente.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{paciente.nombre}</div>
                      <div className="text-sm text-muted-foreground">
                        {paciente.edad} años | {paciente.diagnostico}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                        {formatPercent(paciente.probabilidad)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Último contacto: {formatDate(paciente.ultimoContacto)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacientes prioritarios (vista completa) */}
        <TabsContent value="pacientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacientes Prioritarios</CardTitle>
              <CardDescription>Pacientes con alta probabilidad de conversión a cirugía</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar pacientes..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="probabilidad">
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="probabilidad">Mayor probabilidad</SelectItem>
                      <SelectItem value="reciente">Contacto más reciente</SelectItem>
                      <SelectItem value="nombre">Nombre</SelectItem>
                      <SelectItem value="edad">Edad</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    <span className="hidden md:inline">Exportar</span>
                  </Button>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Paciente</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Diagnóstico</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Probabilidad</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Teléfono</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Último Contacto</th>
                        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleData.pacientesPrioritarios.map((paciente, index) => (
                        <tr key={paciente.id} className={index % 2 === 0 ? "bg-white" : "bg-muted/20"}>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="font-medium">{paciente.nombre}</div>
                            <div className="text-xs text-muted-foreground">{paciente.edad} años</div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{paciente.diagnostico}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                              {formatPercent(paciente.probabilidad)}
                            </Badge>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">{paciente.telefono}</td>
                          <td className="whitespace-nowrap px-4 py-3">{formatDate(paciente.ultimoContacto)}</td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <Button variant="outline" size="sm">
                              Contactar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tendencias */}
        <TabsContent value="tendencias" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendencias Mensuales</CardTitle>
              <CardDescription>Evolución de encuestas y conversiones a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={responsiveHeight("h-[300px]", "h-[400px]", "h-[500px]")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sampleData.tendenciaMensual} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="encuestas" fill="#8884d8" name="Total Encuestas" />
                    <Bar dataKey="conversiones" fill="#82ca9d" name="Conversiones" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tasa de Conversión Mensual</CardTitle>
                <CardDescription>Porcentaje de pacientes que deciden operarse</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={sampleData.tendenciaMensual.map((item) => ({
                        ...item,
                        tasa: ((item.conversiones / item.encuestas) * 100).toFixed(1),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, "Tasa de Conversión"]} />
                      <Bar dataKey="tasa" fill="#FFC107" name="Tasa de Conversión" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tiempo Promedio de Decisión</CardTitle>
                <CardDescription>Días desde la encuesta hasta la decisión de cirugía</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[300px]", "h-[350px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { mes: "Ene", dias: 15 },
                        { mes: "Feb", dias: 14 },
                        { mes: "Mar", dias: 12 },
                        { mes: "Abr", dias: 13 },
                        { mes: "May", dias: 10 },
                        { mes: "Jun", dias: 9 },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" />
                      <YAxis unit=" días" />
                      <Tooltip formatter={(value) => [`${value} días`, "Tiempo Promedio"]} />
                      <Bar dataKey="dias" fill="#FF8042" name="Días Promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comentarios */}
        <TabsContent value="comentarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comentarios de Pacientes</CardTitle>
              <CardDescription>Feedback y comentarios de los pacientes en las encuestas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 mb-4">
                <div className="relative w-full md:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Buscar comentarios..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue="reciente">
                    <SelectTrigger className="w-full md:w-[180px]">
                      <SortAsc className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Ordenar por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reciente">Más recientes</SelectItem>
                      <SelectItem value="positivo">Sentimiento positivo</SelectItem>
                      <SelectItem value="negativo">Sentimiento negativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className={responsiveHeight("h-[400px]", "h-[500px]", "h-[600px]")}>
                <div className="space-y-4 pr-4">
                  {sampleData.comentariosRecientes.map((comentario) => (
                    <div key={comentario.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{comentario.paciente}</div>
                          <div className="text-xs text-muted-foreground mb-2">{formatDate(comentario.fecha)}</div>
                        </div>
                        <Badge variant="outline" className={getSentimentClass(comentario.sentimiento)}>
                          {comentario.sentimiento.charAt(0).toUpperCase() + comentario.sentimiento.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm">{comentario.comentario}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Sentimiento</CardTitle>
                <CardDescription>Distribución de comentarios por sentimiento</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[200px]", "h-[250px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Positivo", value: 65 },
                          { name: "Neutral", value: 20 },
                          { name: "Negativo", value: 15 },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#00C49F" />
                        <Cell fill="#FFBB28" />
                        <Cell fill="#FF8042" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Temas Principales</CardTitle>
                <CardDescription>Temas más mencionados en los comentarios</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={responsiveHeight("h-[200px]", "h-[250px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { tema: "Atención médica", menciones: 45 },
                        { tema: "Tiempo de espera", menciones: 32 },
                        { tema: "Información recibida", menciones: 28 },
                        { tema: "Instalaciones", menciones: 20 },
                        { tema: "Costo", menciones: 18 },
                      ]}
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="tema" type="category" width={100} />
                      <Tooltip formatter={(value) => [`${value} menciones`, "Cantidad"]} />
                      <Bar dataKey="menciones" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
