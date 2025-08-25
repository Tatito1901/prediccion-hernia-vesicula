"use client"

import React, { memo } from "react"
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import type { TooltipProps } from "recharts"
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent"
import { RefreshCw } from "lucide-react"

// Keep types local to avoid coupling with dashboard component
export type ChartDatum = {
  month: string
  consultas: number
  cirugias: number
}

export interface ProcedureChartProps {
  data: ChartDatum[]
  isLoading: boolean
}

const CustomTooltip = memo(({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 text-xs">
        <p className="font-bold text-gray-900 dark:text-gray-100 mb-2">{label}</p>
        {payload.map((entry: any) => (
          <div key={`item-${entry.name}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
})
CustomTooltip.displayName = "CustomTooltip"

function ProcedureChart({ data, isLoading }: ProcedureChartProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-4 sm:p-6 rounded-lg border border-gray-200 dark:border-gray-700">
      <header className="mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Análisis de Procedimientos</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Evolución de consultas y cirugías (últimos 6 meses)
        </p>
      </header>
      <div className="w-full">
        {isLoading ? (
          <div className="h-[200px] sm:h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={typeof window !== "undefined" && window.innerWidth < 640 ? 200 : 300}
          >
            <AreaChart
              data={data}
              margin={{
                top: 5,
                right: typeof window !== "undefined" && window.innerWidth < 640 ? 5 : 10,
                left: typeof window !== "undefined" && window.innerWidth < 640 ? -30 : -20,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient id="colorConsultas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorCirugias" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" className="dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                stroke="#9CA3AF"
                fontSize={typeof window !== "undefined" && window.innerWidth < 640 ? 10 : 12}
                tickLine={false}
                axisLine={false}
                className="dark:stroke-gray-400"
              />
              <YAxis
                stroke="#9CA3AF"
                fontSize={typeof window !== "undefined" && window.innerWidth < 640 ? 10 : 12}
                tickLine={false}
                axisLine={false}
                className="dark:stroke-gray-400"
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="consultas"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorConsultas)"
                name="Consultas"
              />
              <Area
                type="monotone"
                dataKey="cirugias"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#colorCirugias)"
                name="Cirugías"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

export default memo(ProcedureChart)
