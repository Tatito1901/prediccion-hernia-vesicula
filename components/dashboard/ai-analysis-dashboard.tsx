"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import type { ClinicMetrics } from "@/app/dashboard/data-model"
import { responsiveHeight } from "@/lib/responsive-utils"

interface AiAnalysisDashboardProps {
  metrics: ClinicMetrics
}

export function AiAnalysisDashboard({ metrics }: AiAnalysisDashboardProps) {
  // Datos para el gráfico de factores de conversión
  const conversionFactorsData = [
    { name: "Diagnóstico Previo", value: 85 },
    { name: "Seguro Médico", value: 72 },
    { name: "Intensidad Dolor > 7", value: 68 },
    { name: "Síntomas > 6 meses", value: 65 },
    { name: "Severidad Alta", value: 62 },
  ]

  // Datos para el gráfico de preocupaciones
  const preocupacionesData = [
    { name: "Tiempo Recuperación", value: 40 },
    { name: "Miedo", value: 30 },
    { name: "Ausencia Laboral", value: 20 },
    { name: "Dudas sobre necesidad", value: 10 },
  ]

  // Datos para el gráfico de origen de pacientes
  const origenPacientesData = [
    { name: "Google", value: 40 },
    { name: "Facebook", value: 25 },
    { name: "Recomendación", value: 20 },
    { name: "Instagram", value: 10 },
    { name: "Sitio Web", value: 5 },
  ]

  // Colores para los gráficos
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Análisis de Inteligencia Artificial</CardTitle>
        <CardDescription>Insights y predicciones basadas en el análisis de datos de pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="factores">
          <div className="overflow-x-auto pb-2">
            <TabsList className="w-full md:w-auto inline-flex">
              <TabsTrigger value="factores">Factores de Conversión</TabsTrigger>
              <TabsTrigger value="preocupaciones">Preocupaciones</TabsTrigger>
              <TabsTrigger value="origen">Origen de Pacientes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="factores">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Factores que Aumentan la Probabilidad de Cirugía</h3>
                <div className={responsiveHeight("h-[250px]", "h-[300px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={conversionFactorsData}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip formatter={(value) => [`${value}%`, "Impacto"]} />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                        {conversionFactorsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Recomendaciones del Sistema</h3>
                  <ul className="space-y-2">
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Enfatizar la experiencia del cirujano y seguridad del procedimiento</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Ofrecer opciones de financiamiento para pacientes preocupados por costos</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Compartir testimonios de pacientes satisfechos para reducir miedo</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Enfatizar recuperación rápida para pacientes preocupados por ausencia laboral</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Métricas de Predicción</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Precisión del Modelo</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Sensibilidad</span>
                        <span className="text-sm font-medium">82%</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Especificidad</span>
                        <span className="text-sm font-medium">88%</span>
                      </div>
                      <Progress value={88} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preocupaciones">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Principales Preocupaciones de los Pacientes</h3>
                <div className={responsiveHeight("h-[250px]", "h-[300px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={preocupacionesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {preocupacionesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Estrategias para Abordar Preocupaciones</h3>
                  <ul className="space-y-2">
                    <li className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                      >
                        Recuperación
                      </Badge>
                      <span>Enfatizar protocolos de recuperación rápida</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
                      >
                        Miedo
                      </Badge>
                      <span>Compartir testimonios y explicar procedimiento detalladamente</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400"
                      >
                        Ausencia
                      </Badge>
                      <span>Informar sobre tiempos reales de reincorporación laboral</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
                      >
                        Dudas
                      </Badge>
                      <span>Proporcionar información detallada sobre beneficios de la cirugía</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Análisis de Sentimientos</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Confianza en el Médico</span>
                        <span className="text-sm font-medium">Alta</span>
                      </div>
                      <Progress value={85} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Ansiedad por Procedimiento</span>
                        <span className="text-sm font-medium">Media</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Preocupación por Recuperación</span>
                        <span className="text-sm font-medium">Alta</span>
                      </div>
                      <Progress value={80} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="origen">
            <div className="space-y-4">
              <div className="rounded-md border p-4">
                <h3 className="text-sm font-medium mb-4">Origen de Pacientes</h3>
                <div className={responsiveHeight("h-[250px]", "h-[300px]")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={origenPacientesData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {origenPacientesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, "Porcentaje"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Tasa de Conversión por Origen</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Google</span>
                        <span className="text-sm font-medium">65%</span>
                      </div>
                      <Progress value={65} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Facebook</span>
                        <span className="text-sm font-medium">58%</span>
                      </div>
                      <Progress value={58} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Recomendación</span>
                        <span className="text-sm font-medium">82%</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Instagram</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Sitio Web</span>
                        <span className="text-sm font-medium">60%</span>
                      </div>
                      <Progress value={60} className="h-2" />
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <h3 className="text-sm font-medium mb-2">Recomendaciones de Marketing</h3>
                  <ul className="space-y-2">
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Aumentar inversión en Google Ads (mayor ROI)</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Implementar programa de referidos (mayor tasa de conversión)</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Optimizar contenido en Instagram para mejorar conversión</span>
                    </li>
                    <li className="text-sm flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>Mejorar SEO del sitio web para atraer tráfico de mayor calidad</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
