"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
import type { FollowUp, PatientData } from "@/app/dashboard/data-model"

interface FollowUpStatsProps {
  followUps: FollowUp[]
  patients: PatientData[]
}

export function FollowUpStats({ followUps, patients }: FollowUpStatsProps) {
  // Calculate statistics
  const totalFollowUps = followUps.length
  const completedFollowUps = followUps.filter((f) => f.estado === "Completado").length
  const pendingFollowUps = followUps.filter((f) => f.estado === "Programado").length
  const canceledFollowUps = followUps.filter((f) => f.estado === "Cancelado").length

  const completionRate = totalFollowUps > 0 ? (completedFollowUps / totalFollowUps) * 100 : 0

  // Group follow-ups by type
  const followUpsByType = followUps.reduce(
    (acc, followUp) => {
      acc[followUp.tipo] = (acc[followUp.tipo] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const typeData = Object.entries(followUpsByType).map(([name, value]) => ({ name, value }))

  // Group follow-ups by result
  const followUpsByResult = followUps.reduce(
    (acc, followUp) => {
      acc[followUp.resultado] = (acc[followUp.resultado] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const resultData = Object.entries(followUpsByResult).map(([name, value]) => ({ name, value }))

  // Group follow-ups by assignee
  const followUpsByAssignee = followUps.reduce(
    (acc, followUp) => {
      acc[followUp.asignadoA] = (acc[followUp.asignadoA] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const assigneeData = Object.entries(followUpsByAssignee)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Calculate follow-ups by day of week
  const followUpsByDayOfWeek = followUps.reduce(
    (acc, followUp) => {
      const date = new Date(followUp.fecha)
      const dayOfWeek = date.toLocaleDateString("es-MX", { weekday: "short" })
      acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Order days of week correctly
  const daysOrder = ["lun.", "mar.", "mié.", "jue.", "vie.", "sáb.", "dom."]
  const dayOfWeekData = daysOrder.map((day) => ({
    name: day,
    value: followUpsByDayOfWeek[day] || 0,
  }))

  // Colors for charts
  const COLORS = ["#FFC107", "#E0E0E0", "#9E9E9E", "#616161", "#424242", "#212121"]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estadísticas de Seguimiento</CardTitle>
        <CardDescription>Análisis de actividades de seguimiento</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <span className="text-sm text-muted-foreground">Total Seguimientos</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{totalFollowUps}</span>
              <Badge variant="outline">100%</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <span className="text-sm text-muted-foreground">Completados</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{completedFollowUps}</span>
              <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                {totalFollowUps > 0 ? ((completedFollowUps / totalFollowUps) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <span className="text-sm text-muted-foreground">Pendientes</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{pendingFollowUps}</span>
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
              >
                {totalFollowUps > 0 ? ((pendingFollowUps / totalFollowUps) * 100).toFixed(0) : 0}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tasa de Completados</span>
            <span className="text-sm text-muted-foreground">{completionRate.toFixed(0)}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>

        <Tabs defaultValue="tipo">
          <TabsList className="mb-4">
            <TabsTrigger value="tipo">Por Tipo</TabsTrigger>
            <TabsTrigger value="resultado">Por Resultado</TabsTrigger>
            <TabsTrigger value="asignado">Por Responsable</TabsTrigger>
            <TabsTrigger value="dia">Por Día</TabsTrigger>
          </TabsList>

          <TabsContent value="tipo">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} seguimientos`, "Cantidad"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="resultado">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {resultData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} seguimientos`, "Cantidad"]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="asignado">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip formatter={(value) => [`${value} seguimientos`, "Cantidad"]} />
                  <Bar dataKey="value" fill="#FFC107" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="dia">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value} seguimientos`, "Cantidad"]} />
                  <Bar dataKey="value" fill="#9E9E9E" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
