"use client"

import React, { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useTheme } from "next-themes"

// Define the types for the component
export interface DiagnosisData {
  tipo: string
  cantidad: number
  porcentaje?: number
}

interface DiagnosisChartProps {
  data: DiagnosisData[]
  title?: string
  description?: string
  className?: string
}

export function DiagnosisChart({
  data,
  title = "Distribución de Diagnósticos",
  description = "Desglose por tipo de diagnóstico",
  className = "",
}: DiagnosisChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  // Colors for the chart segments with theme support - Expanded color palette
  const COLORS = useMemo(() => {
    // Define colores específicos para categorías comunes
    const colorMap: Record<string, string> = {
      // Hernias - Tonos azules
      "Hernia Inguinal": isDark ? "#60a5fa" : "#3b82f6",
      "Hernia Umbilical": isDark ? "#93c5fd" : "#60a5fa",
      "Hernia Incisional": isDark ? "#bfdbfe" : "#93c5fd",
      "Hernia Hiatal": isDark ? "#dbeafe" : "#bfdbfe",
      "Hernia Inguinal Recidivante": isDark ? "#3b82f6" : "#2563eb",
      
      // Vesícula - Tonos verdes
      "Vesícula": isDark ? "#34d399" : "#10b981",
      "Colelitiasis": isDark ? "#6ee7b7" : "#34d399",
      "Vesícula (Colecistitis Crónica)": isDark ? "#a7f3d0" : "#6ee7b7",
      
      // Otros diagnósticos específicos
      "Apendicitis": isDark ? "#f87171" : "#ef4444",
      "Quiste Sebáceo Infectado": isDark ? "#fbbf24" : "#f59e0b",
      "Lipoma Grande": isDark ? "#c084fc" : "#a855f7",
      "Eventración Abdominal": isDark ? "#fb923c" : "#f97316",
      "Otros diagnósticos": isDark ? "#d1d5db" : "#9ca3af",
      
      // Categoría default
      "Otro": isDark ? "#9ca3af" : "#6b7280"
    }
    
    // Colores de respaldo para tipos no definidos específicamente
    const backupColors = [
      isDark ? "#60a5fa" : "#0088FE", // Blue
      isDark ? "#34d399" : "#00C49F", // Green
      isDark ? "#fbbf24" : "#FFBB28", // Yellow
      isDark ? "#f87171" : "#FF8042", // Orange
      isDark ? "#c084fc" : "#8884d8", // Purple
      isDark ? "#4ade80" : "#82ca9d", // Light green
    ]
    
    return { colorMap, backupColors }
  }, [isDark])

  // Add percentage calculation and sort the data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return []

    const total = data.reduce((sum, item) => sum + item.cantidad, 0)
    
    // Procesar datos con porcentajes
    const processed = data.map((item) => ({
      ...item,
      porcentaje: item.porcentaje ?? Math.round((item.cantidad / total) * 100),
    }))
    
    // Agrupar por categorías principales (si hay muchos diagnósticos)
    if (processed.length > 6) {
      // Mantener los 5 principales y agrupar el resto como "Otros"
      const mainDiagnoses = processed.slice(0, 5)
      const otherDiagnoses = processed.slice(5)
      
      if (otherDiagnoses.length > 0) {
        const otherSum = otherDiagnoses.reduce((sum, item) => sum + item.cantidad, 0)
        const otherPercentage = Math.round((otherSum / total) * 100)
        
        return [...mainDiagnoses, {
          tipo: "Otros diagnósticos",
          cantidad: otherSum,
          porcentaje: otherPercentage
        }]
      }
    }
    
    return processed
  }, [data])

  // Custom tooltip to display the diagnosis information
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div
          className={`${
            isDark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
          } p-3 border rounded shadow-sm text-sm`}
        >
          <p className="font-medium">{data.tipo}</p>
          <p>Casos: {data.cantidad}</p>
          {data.porcentaje !== undefined && <p>Porcentaje: {data.porcentaje}%</p>}
        </div>
      )
    }
    return null
  }

  // Don't render if no data
  if (!processedData.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[220px]">
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={processedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="cantidad"
                nameKey="tipo"
                label={({ tipo, porcentaje }) => {
                  // Acortar etiquetas muy largas
                  const displayName = tipo.length > 12 ? `${tipo.substring(0, 10)}...` : tipo
                  return `${displayName}: ${porcentaje}%`
                }}
                paddingAngle={2}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {processedData.map((entry, index) => {
                  // Usar el color específico de la categoría si existe, si no usar el color de respaldo
                  const specificColor = COLORS.colorMap[entry.tipo]
                  const fillColor = specificColor || COLORS.backupColors[index % COLORS.backupColors.length]
                  
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={fillColor}
                      stroke={isDark ? "#1f2937" : "#ffffff"}
                      strokeWidth={1}
                    />
                  )
                })}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  paddingLeft: "10px",
                  fontSize: "12px",
                  lineHeight: "18px"
                }}
                formatter={(value) => {
                  // Si el valor es muy largo, acortarlo
                  const displayValue = value.length > 18 
                    ? `${value.substring(0, 16)}...` 
                    : value
                  
                  // Buscar el porcentaje correspondiente
                  const item = processedData.find(d => d.tipo === value)
                  const percentage = item ? ` (${item.porcentaje}%)` : ""
                  
                  return (
                    <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {displayValue}{percentage}
                    </span>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
