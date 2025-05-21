"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { PatientData } from "@/app/dashboard/data-model"
import { chartStyles } from "@/src/lib/chart-theme"

interface DiagnosisTypeDistributionProps {
  patients: PatientData[]
}

export function DiagnosisTypeDistribution({ patients }: DiagnosisTypeDistributionProps) {
  // Filtrar solo pacientes con hernias
  const herniaPatients = patients.filter((p) => p.diagnostico.includes("Hernia"))

  // Contar por tipo de hernia
  const herniaTypes = herniaPatients.reduce(
    (acc, patient) => {
      const type = patient.diagnostico
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  // Convertir a formato para gráfica
  const chartData = Object.entries(herniaTypes).map(([name, value]) => ({
    name,
    value,
  }))

  // Ordenar por cantidad (mayor a menor)
  chartData.sort((a, b) => b.value - a.value)

  // Colores específicos para tipos de hernia
  const COLORS = [
    "#4285F4", // Hernia Inguinal
    "#0F9D58", // Hernia Umbilical
    "#9C27B0", // Hernia Incisional
    "#DB4437", // Otros tipos
  ]

  // Calcular porcentajes
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Distribución de Tipos de Hernia</CardTitle>
        <CardDescription>Proporción de los diferentes tipos de hernia</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={chartStyles.pie.outerRadius}
                innerRadius={chartStyles.pie.innerRadius}
                paddingAngle={chartStyles.pie.paddingAngle}
                cornerRadius={chartStyles.pie.cornerRadius}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                animationDuration={chartStyles.animation.duration}
                animationEasing={chartStyles.animation.easing}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                    strokeOpacity={0.8}
                    style={{
                      filter: "drop-shadow(0px 2px 3px rgba(0, 0, 0, 0.1))",
                    }}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [
                  `${value} pacientes (${(((value as number) / total) * 100).toFixed(1)}%)`,
                  "Cantidad",
                ]}
                contentStyle={{
                  backgroundColor: chartStyles.tooltip.backgroundColor,
                  borderRadius: chartStyles.tooltip.borderRadius,
                  boxShadow: chartStyles.tooltip.boxShadow,
                  border: chartStyles.tooltip.border,
                  padding: chartStyles.tooltip.padding,
                }}
              />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                align="center"
                iconSize={chartStyles.legend.iconSize}
                formatter={(value) => (
                  <span style={{ fontSize: chartStyles.legend.fontSize, color: chartStyles.legend.color }}>
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
