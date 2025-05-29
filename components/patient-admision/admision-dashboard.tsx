"use client"

import type React from "react"
import { useMemo, memo } from "react"
import { format, isValid, parseISO } from "date-fns"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Tipos mejorados con validación estricta
interface Patient {
  readonly id: string
  readonly nombre: string
  readonly apellido: string
  readonly fechaNacimiento: string
  readonly genero: "M" | "F" | "Otro"
  readonly telefono: string
  readonly direccion: string
  readonly estado: "Activo" | "Inactivo" | "Pendiente de consulta"
}

interface Appointment {
  readonly id: string
  readonly pacienteId: string
  readonly fechaConsulta: string // ISO 8601 format
  readonly horaConsulta: string // HH:mm format
  readonly motivoConsulta: string
  readonly estado: "pendiente" | "completada" | "cancelada"
}

interface AdmissionDashboardProps {
  readonly patients?: readonly Patient[]
  readonly appointments?: readonly Appointment[]
  readonly isLoading: boolean
}

interface QuickMetrics {
  readonly todayAppointments: number
  readonly pendingPatients: number
  readonly completedToday: number
  readonly totalPatients: number
  readonly monthlyGrowth: number
  readonly weeklyTrend: number
}

// Componente de métrica individual memoizado
const MetricCard = memo<{
  title: string
  value: number | string
  suffix?: string
  loading?: boolean
}>(({ title, value, suffix = "", loading = false }) => {
  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </div>
    )
  }

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-all hover:shadow-md">
      <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}{suffix}
      </p>
    </div>
  )
})
MetricCard.displayName = "MetricCard"

// Función auxiliar para parsear fechas con validación
const safeParseDate = (dateStr: string): Date | null => {
  try {
    const date = parseISO(dateStr)
    return isValid(date) ? date : null
  } catch {
    return null
  }
}

// Función auxiliar para comparar fechas del mismo día
const isSameDay = (date1: Date, date2: Date): boolean => {
  return format(date1, "yyyy-MM-dd") === format(date2, "yyyy-MM-dd")
}

const AdmissionDashboard: React.FC<AdmissionDashboardProps> = memo(({ 
  patients = [], 
  appointments = [], 
  isLoading 
}) => {
  // Cálculo optimizado de métricas con memoización profunda
  const quickMetrics = useMemo<QuickMetrics>(() => {
    const defaultMetrics: QuickMetrics = {
      todayAppointments: 0,
      pendingPatients: 0,
      completedToday: 0,
      totalPatients: 0,
      monthlyGrowth: 0,
      weeklyTrend: 0,
    }

    // Validación temprana
    if (!Array.isArray(patients) || !Array.isArray(appointments)) {
      console.warn("[AdmissionDashboard] Datos inválidos recibidos")
      return defaultMetrics
    }

    try {
      const today = new Date()
      const todayStr = format(today, "yyyy-MM-dd")

      // Procesamiento eficiente con un solo paso
      const metrics = appointments.reduce((acc, appointment) => {
        if (!appointment?.fechaConsulta || !appointment?.estado) return acc

        const appointmentDate = safeParseDate(appointment.fechaConsulta)
        if (!appointmentDate) return acc

        const appointmentDateStr = format(appointmentDate, "yyyy-MM-dd")
        const isToday = appointmentDateStr === todayStr

        if (isToday) {
          if (appointment.estado === "pendiente") {
            acc.todayAppointments++
          } else if (appointment.estado === "completada") {
            acc.completedToday++
          }
        }

        return acc
      }, { ...defaultMetrics })

      // Calcular pacientes pendientes
      metrics.pendingPatients = patients.filter(
        patient => patient?.estado === "Pendiente de consulta"
      ).length

      metrics.totalPatients = patients.length
      metrics.monthlyGrowth = 12.5 // Simulado
      metrics.weeklyTrend = 5.2 // Simulado

      return metrics
    } catch (error) {
      console.error("[AdmissionDashboard] Error calculando métricas:", error)
      return defaultMetrics
    }
  }, [patients, appointments])

  // Renderizado con loading states mejorados
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <MetricCard key={i} title="" value={0} loading />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Validación de datos
  if (!patients.length && !appointments.length) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No hay datos disponibles para mostrar en el panel de admisión.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl lg:text-2xl font-bold">
          Panel de Admisión
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <MetricCard 
            title="Citas de hoy" 
            value={quickMetrics.todayAppointments} 
          />
          <MetricCard 
            title="Pacientes pendientes" 
            value={quickMetrics.pendingPatients} 
          />
          <MetricCard 
            title="Completadas hoy" 
            value={quickMetrics.completedToday} 
          />
          <MetricCard 
            title="Total pacientes" 
            value={quickMetrics.totalPatients} 
          />
          <MetricCard 
            title="Crecimiento mensual" 
            value={quickMetrics.monthlyGrowth} 
            suffix="%" 
          />
          <MetricCard 
            title="Tendencia semanal" 
            value={quickMetrics.weeklyTrend} 
            suffix="%" 
          />
        </div>
      </CardContent>
    </Card>
  )
})

AdmissionDashboard.displayName = "AdmissionDashboard"

export default AdmissionDashboard