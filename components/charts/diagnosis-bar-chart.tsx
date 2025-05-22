"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import type { ClinicMetrics } from "@/app/dashboard/data-model"
import { chartStyles } from "@/lib/chart-theme"

interface DiagnosisBarChartProps {
  metrics: Partial<ClinicMetrics> & {
    diagnosticosMasComunes: { tipo: string; cantidad: number }[]
  }
}

export function DiagnosisBarChart({ metrics }: DiagnosisBarChartProps) {
  const data = metrics.diagnosticosMasComunes.map((item) => ({
    name: item.tipo,
    cantidad: item.cantidad,
  }))

  // Colores específicos para tipos de diagnóstico
  const getBarColor = (name: string) => {
    if (name.includes("Hernia")) return "#4285F4" // Azul para hernias
    if (name === "Vesícula") return "#34A853" // Verde para vesícula
    return "#FBBC05" // Amarillo para otros
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Diagnósticos por Cantidad</CardTitle>
        <CardDescription>Distribución de diagnósticos en pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                formatter={(value) => [`${value} pacientes`, "Cantidad"]}
                contentStyle={{
                  backgroundColor: chartStyles.tooltip.backgroundColor,
                  borderRadius: chartStyles.tooltip.borderRadius,
                  boxShadow: chartStyles.tooltip.boxShadow,
                  border: chartStyles.tooltip.border,
                  padding: chartStyles.tooltip.padding,
                }}
              />
              <Legend />
              <Bar dataKey="cantidad" name="Pacientes" fill="#4285F4" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
