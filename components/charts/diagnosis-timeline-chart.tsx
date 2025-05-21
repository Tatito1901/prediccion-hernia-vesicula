"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { PatientData } from "@/app/dashboard/data-model"
import { chartStyles } from "@/src/lib/chart-theme"

interface DiagnosisTimelineChartProps {
  patients: PatientData[]
}

export function DiagnosisTimelineChart({ patients }: DiagnosisTimelineChartProps) {
  // Agrupar pacientes por mes y diagnóstico
  const timelineData = patients.reduce(
    (acc, patient) => {
      const date = new Date(patient.fechaConsulta)
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!acc[month]) {
        acc[month] = {
          month,
          "Hernia Inguinal": 0,
          "Hernia Umbilical": 0,
          "Hernia Incisional": 0,
          Vesícula: 0,
          Otro: 0,
        }
      }

      acc[month][patient.diagnostico] += 1

      return acc
    },
    {} as Record<string, any>,
  )

  // Convertir a array y ordenar por fecha
  const chartData = Object.values(timelineData).sort((a, b) => a.month.localeCompare(b.month))

  // Formatear etiquetas de meses
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(monthNum) - 1, 1)
    return date.toLocaleDateString("es-MX", { month: "short", year: "2-digit" })
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Tendencia de Diagnósticos</CardTitle>
        <CardDescription>Evolución mensual de diagnósticos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [`${value} pacientes`, name]}
                labelFormatter={(label) => formatMonth(label)}
                contentStyle={{
                  backgroundColor: chartStyles.tooltip.backgroundColor,
                  borderRadius: chartStyles.tooltip.borderRadius,
                  boxShadow: chartStyles.tooltip.boxShadow,
                  border: chartStyles.tooltip.border,
                  padding: chartStyles.tooltip.padding,
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Hernia Inguinal"
                stroke="#4285F4"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Hernia Umbilical"
                stroke="#0F9D58"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Hernia Incisional"
                stroke="#9C27B0"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Vesícula"
                stroke="#F4B400"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Otro"
                stroke="#DB4437"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
