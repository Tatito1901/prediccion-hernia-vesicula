"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import type { PatientData } from "@/app/dashboard/data-model"
import { useTheme } from "next-themes"

interface DiagnosisTypeDistributionProps {
  patients: PatientData[]
  className?: string
}

export function DiagnosisTypeDistribution({ patients, className = "" }: DiagnosisTypeDistributionProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Filtrar solo pacientes con hernias
  const herniaPatients = useMemo(() => 
    patients.filter((p) => p.diagnostico.includes("Hernia")), 
    [patients]
  )

  // Contar por tipo de hernia con memoización
  const chartData = useMemo(() => {
    const herniaTypes = herniaPatients.reduce(
      (acc, patient) => {
        const type = patient.diagnostico
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    // Convertir a formato para gráfica y ordenar
    return Object.entries(herniaTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [herniaPatients])

  // Colores específicos para tipos de hernia con adaptación a tema oscuro
  const COLORS = useMemo(() => [
    isDark ? "#5090F0" : "#4285F4", // Hernia Inguinal
    isDark ? "#25B070" : "#0F9D58", // Hernia Umbilical
    isDark ? "#B44DC8" : "#9C27B0", // Hernia Incisional
    isDark ? "#E05D50" : "#DB4437", // Otros tipos
  ], [isDark])

  // Calcular porcentajes
  const total = useMemo(() => 
    chartData.reduce((sum, item) => sum + item.value, 0), 
    [chartData]
  )

  // Configuración de estilos para el gráfico
  const chartStyles = {
    pie: {
      outerRadius: 110,
      innerRadius: 60,
      paddingAngle: 2,
      cornerRadius: 4,
    },
    animation: {
      duration: 800,
      easing: "ease", // Using a valid AnimationTiming value
    },
    tooltip: {
      backgroundColor: isDark ? "#1f2937" : "#ffffff",
      borderRadius: "6px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
      padding: "8px 12px",
    },
    legend: {
      fontSize: 12,
      iconSize: 10,
      color: isDark ? "#e5e7eb" : "#374151",
    },
  }

  // Renderizado condicional para datos vacíos
  if (chartData.length === 0) {
    return (
      <Card className={`col-span-1 md:col-span-2 ${className}`}>
        <CardHeader>
          <CardTitle>Distribución de Tipos de Hernia</CardTitle>
          <CardDescription>Proporción de los diferentes tipos de hernia</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[350px]">
          <p className="text-muted-foreground">No hay datos disponibles sobre hernias</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`col-span-1 md:col-span-2 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-primary"></span>
          Distribución de Tipos de Hernia
        </CardTitle>
        <CardDescription>
          Proporción de los diferentes tipos de hernia ({total} pacientes)
        </CardDescription>
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
                    stroke={isDark ? "#1f2937" : "#ffffff"}
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
                contentStyle={chartStyles.tooltip}
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
