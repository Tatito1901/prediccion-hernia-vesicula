"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PatientData } from "@/app/dashboard/data-model"

interface ConversionAnalyticsProps {
  patients: PatientData[]
  followUps: any[]
}

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

export function ConversionAnalytics({ patients, followUps }: ConversionAnalyticsProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [timeFrame, setTimeFrame] = useState<string>("month")

  // Get conversion overview data
  const getConversionOverviewData = () => {
    // This would normally come from real data analysis
    return {
      totalPatients: 250,
      consultedPatients: 180,
      scheduledSurgery: 75,
      conversionRate: 41.67, // (75/180) * 100
      changeFromPrevious: 8.2, // Percentage change from previous period
    }
  }

  // Get conversion funnel data
  const getConversionFunnelData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Consultas", value: 180 },
      { name: "Interesados", value: 120 },
      { name: "Evaluación", value: 95 },
      { name: "Programados", value: 75 },
      { name: "Completados", value: 68 },
    ]
  }

  // Get conversion by doctor data
  const getConversionByDoctorData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Dr. García", tasa: 48 },
      { name: "Dra. Rodríguez", tasa: 52 },
      { name: "Dr. López", tasa: 38 },
      { name: "Dra. Martínez", tasa: 45 },
    ]
  }

  // Get conversion trend data
  const getConversionTrendData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Ene", tasa: 35 },
      { name: "Feb", tasa: 38 },
      { name: "Mar", tasa: 36 },
      { name: "Abr", tasa: 40 },
      { name: "May", tasa: 42 },
      { name: "Jun", tasa: 45 },
      { name: "Jul", tasa: 43 },
      { name: "Ago", tasa: 48 },
      { name: "Sep", tasa: 50 },
      { name: "Oct", tasa: 52 },
      { name: "Nov", tasa: 55 },
      { name: "Dic", tasa: 58 },
    ]
  }

  // Get conversion by diagnosis data
  const getConversionByDiagnosisData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Cataratas", value: 40 },
      { name: "Glaucoma", value: 25 },
      { name: "LASIK", value: 20 },
      { name: "Retina", value: 10 },
      { name: "Otros", value: 5 },
    ]
  }

  // Get bottlenecks data
  const getBottlenecksData = () => {
    // This would normally be calculated from real data
    return [
      { name: "Costo", value: 35 },
      { name: "Miedo", value: 25 },
      { name: "Tiempo de recuperación", value: 20 },
      { name: "Busca segunda opinión", value: 15 },
      { name: "Otros", value: 5 },
    ]
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Análisis de Conversión</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="trends">Tendencias</TabsTrigger>
            <TabsTrigger value="bottlenecks">Cuellos de Botella</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="font-medium text-lg">Resumen de Conversión</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Total Pacientes</div>
                  <div className="text-2xl font-bold mt-1">{getConversionOverviewData().totalPatients}</div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Pacientes Consultados</div>
                  <div className="text-2xl font-bold mt-1">{getConversionOverviewData().consultedPatients}</div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Cirugías Programadas</div>
                  <div className="text-2xl font-bold mt-1">{getConversionOverviewData().scheduledSurgery}</div>
                </Card>

                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Tasa de Conversión</div>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold mt-1">
                      {getConversionOverviewData().conversionRate.toFixed(1)}%
                    </div>
                    <div
                      className={cn(
                        "flex items-center ml-2 text-sm",
                        getConversionOverviewData().changeFromPrevious > 0 ? "text-green-600" : "text-red-600",
                      )}
                    >
                      {getConversionOverviewData().changeFromPrevious > 0 ? (
                        <ArrowUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(getConversionOverviewData().changeFromPrevious).toFixed(1)}%
                    </div>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Conversion Funnel */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Embudo de Conversión</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getConversionFunnelData()}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" fill="#0088FE" name="Pacientes" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Conversion by Doctor */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Conversión por Doctor</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getConversionByDoctorData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                {/* Conversion by Diagnosis */}
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Conversión por Diagnóstico</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getConversionByDiagnosisData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getConversionByDiagnosisData().map((entry, index) => (
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
                      <h5 className="font-medium text-sm">Mejor Rendimiento</h5>
                      <p className="mt-1">
                        La Dra. Rodríguez tiene la mayor tasa de conversión (52%), seguida por el Dr. García (48%).
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Diagnóstico con Mayor Conversión</h5>
                      <p className="mt-1">Los pacientes con cataratas tienen la mayor tasa de conversión (40%).</p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Tendencia</h5>
                      <p className="mt-1">La tasa de conversión ha aumentado un 8.2% respecto al período anterior.</p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Oportunidad de Mejora</h5>
                      <p className="mt-1">
                        El mayor cuello de botella es el costo (35%). Considerar opciones de financiamiento.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="font-medium text-lg">Tendencias de Conversión</h3>
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

              <Card className="p-4">
                <h4 className="font-medium mb-4">Tendencia de Conversión en el Tiempo</h4>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={getConversionTrendData()} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis unit="%" />
                      <Tooltip formatter={(value) => [`${value}%`, "Tasa de Conversión"]} />
                      <Legend />
                      <Line type="monotone" dataKey="tasa" stroke="#0088FE" name="Tasa de Conversión (%)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Análisis de Tendencia</h4>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Tendencia General</h5>
                      <p className="mt-1">
                        La tasa de conversión ha mostrado una tendencia al alza constante durante el último año,
                        aumentando de 35% a 58%.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Estacionalidad</h5>
                      <p className="mt-1">
                        Se observa un aumento en las conversiones durante los meses de septiembre a diciembre,
                        posiblemente debido a que los pacientes utilizan sus beneficios de seguro antes de fin de año.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Impacto de Campañas</h5>
                      <p className="mt-1">
                        El aumento en agosto coincide con la campaña de descuentos de verano, lo que sugiere que las
                        promociones tienen un impacto positivo en la conversión.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-4">Recomendaciones</h4>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Campañas Estacionales</h5>
                      <p className="mt-1">
                        Implementar campañas específicas durante los meses de menor conversión (enero-marzo) para
                        mantener un flujo constante de pacientes.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Seguimiento Personalizado</h5>
                      <p className="mt-1">
                        Aumentar la frecuencia de seguimiento durante los períodos de alta conversión para maximizar
                        resultados.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Capacitación de Personal</h5>
                      <p className="mt-1">
                        Compartir las mejores prácticas de los doctores con mayor tasa de conversión con el resto del
                        equipo.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Bottlenecks Tab */}
          <TabsContent value="bottlenecks">
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <h3 className="font-medium text-lg">Cuellos de Botella en la Conversión</h3>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-4">Razones de No Conversión</h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getBottlenecksData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {getBottlenecksData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4">
                  <h4 className="font-medium mb-4">Estrategias para Superar Objeciones</h4>
                  <div className="space-y-4">
                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Costo (35%)</h5>
                      <p className="mt-1">
                        Implementar opciones de financiamiento y planes de pago. Destacar el valor a largo plazo y el
                        costo-beneficio del procedimiento.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Miedo (25%)</h5>
                      <p className="mt-1">
                        Proporcionar testimonios de pacientes, videos educativos y explicaciones detalladas del
                        procedimiento. Ofrecer sesiones de consulta con pacientes que ya han pasado por la cirugía.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Tiempo de recuperación (20%)</h5>
                      <p className="mt-1">
                        Explicar claramente las expectativas de recuperación y proporcionar planes detallados de cuidado
                        postoperatorio. Destacar los avances en técnicas que reducen el tiempo de recuperación.
                      </p>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Segunda opinión (15%)</h5>
                      <p className="mt-1">
                        Proporcionar información completa y transparente. Ofrecer consultas con diferentes especialistas
                        dentro de la clínica. Seguimiento proactivo después de la consulta inicial.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h4 className="font-medium mb-4">Plan de Acción para Mejorar la Conversión</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Corto Plazo (1-3 meses)</h5>
                      <ul className="mt-1 space-y-2 text-sm">
                        <li>• Implementar opciones de financiamiento</li>
                        <li>• Crear materiales educativos sobre procedimientos</li>
                        <li>• Capacitar al personal en manejo de objeciones</li>
                        <li>• Mejorar el proceso de seguimiento post-consulta</li>
                      </ul>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Mediano Plazo (3-6 meses)</h5>
                      <ul className="mt-1 space-y-2 text-sm">
                        <li>• Desarrollar programa de testimonios de pacientes</li>
                        <li>• Implementar sesiones informativas grupales</li>
                        <li>• Crear paquetes de cirugía con beneficios adicionales</li>
                        <li>• Optimizar el proceso de programación de cirugías</li>
                      </ul>
                    </div>

                    <div className="p-3 border rounded-md">
                      <h5 className="font-medium text-sm">Largo Plazo (6-12 meses)</h5>
                      <ul className="mt-1 space-y-2 text-sm">
                        <li>• Desarrollar programa de fidelización de pacientes</li>
                        <li>• Implementar sistema de referidos con incentivos</li>
                        <li>• Crear centro de excelencia por especialidad</li>
                        <li>• Establecer alianzas con aseguradoras</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
