"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { PatientData } from "@/app/dashboard/data-model"
import { chartStyles } from "@/src/lib/chart-theme"

interface DiagnosisSeverityChartProps {
  patients: PatientData[]
}

export function DiagnosisSeverityChart({ patients }: DiagnosisSeverityChartProps) {
  // Agrupar pacientes por diagnóstico y severidad
  const severityData = patients.reduce(
    (acc, patient) => {
      if (!patient.encuesta) return acc

      const diagnosis = patient.diagnostico
      const severity = patient.encuesta.severidadCondicion || "No especificada"

      if (!acc[diagnosis]) {
        acc[diagnosis] = {
          name: diagnosis,
          Leve: 0,
          Moderada: 0,
          Severa: 0,
          "No especificada": 0,
          total: 0,
        }
      }

      acc[diagnosis][severity] += 1
      acc[diagnosis].total += 1

      return acc
    },
    {} as Record<string, any>,
  )

  // Convertir a array y ordenar por total
  const chartData = Object.values(severityData).sort((a, b) => b.total - a.total)

  // Colores para severidades
  const severityColors = {
    Leve: "#4CAF50",
    Moderada: "#FFC107",
    Severa: "#F44336",
    "No especificada": "#9E9E9E",
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Severidad por Diagnóstico</CardTitle>
        <CardDescription>Distribución de severidad de síntomas por diagnóstico</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={120} />
              <Tooltip
                formatter={(value, name) => [`${value} pacientes`, name]}
                contentStyle={{
                  backgroundColor: chartStyles.tooltip.backgroundColor,
                  borderRadius: chartStyles.tooltip.borderRadius,
                  boxShadow: chartStyles.tooltip.boxShadow,
                  border: chartStyles.tooltip.border,
                  padding: chartStyles.tooltip.padding,
                }}
              />
              <Legend />
              <Bar dataKey="Leve" name="Leve" stackId="a" fill={severityColors.Leve} />
              <Bar dataKey="Moderada" name="Moderada" stackId="a" fill={severityColors.Moderada} />
              <Bar dataKey="Severa" name="Severa" stackId="a" fill={severityColors.Severa} />
              <Bar
                dataKey="No especificada"
                name="No especificada"
                stackId="a"
                fill={severityColors["No especificada"]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
