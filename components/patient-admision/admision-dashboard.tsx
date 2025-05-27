"use client"

import type React from "react"
import { useMemo } from "react"
import { format } from "date-fns"

interface Patient {
  id: string
  nombre: string
  apellido: string
  fechaNacimiento: string
  genero: string
  telefono: string
  direccion: string
  estado: string
}

interface Appointment {
  id: string
  pacienteId: string
  fechaConsulta: string
  horaConsulta: string
  motivoConsulta: string
  estado: string
}

interface AdmissionDashboardProps {
  patients: Patient[] | undefined
  appointments: Appointment[] | undefined
  isLoading: boolean
}

const AdmissionDashboard: React.FC<AdmissionDashboardProps> = ({ patients, appointments, isLoading }) => {
  const quickMetrics = useMemo(() => {
    const defaultMetrics = {
      todayAppointments: 0,
      pendingPatients: 0,
      completedToday: 0,
      totalPatients: 0,
      monthlyGrowth: 0,
      weeklyTrend: 0,
    }

    // Si estamos cargando o no hay datos, usar valores por defecto
    if (isLoading || !patients || !appointments || !Array.isArray(patients) || !Array.isArray(appointments)) {
      return defaultMetrics
    }

    try {
      // Validar que los datos existan y sean arrays
      if (!Array.isArray(patients) || !Array.isArray(appointments)) {
        console.warn("[AdmissionDashboard] patients o appointments no son arrays:", {
          patientsType: typeof patients,
          appointmentsType: typeof appointments,
        })
        return defaultMetrics
      }

      // Filtrar entradas nulas o indefinidas
      const validPatients = patients.filter((p) => p != null)
      const validAppointments = appointments.filter((a) => a != null)

      // Obtener la fecha actual
      const today = new Date()
      const todayStr = format(today, "yyyy-MM-dd")

      return {
        // Citas programadas para hoy
        todayAppointments: validAppointments.filter((app) => {
          try {
            // Intentar diferentes formatos de fecha
            const appDate =
              typeof app.fechaConsulta === "string"
                ? app.fechaConsulta.split("T")[0] // Formato ISO
                : format(new Date(app.fechaConsulta), "yyyy-MM-dd")

            return appDate === todayStr && app.estado === "pendiente"
          } catch (error) {
            console.error("[AdmissionDashboard] Error filtrando citas de hoy:", error, app)
            return false
          }
        }).length,

        // Pacientes pendientes de consulta
        pendingPatients: validPatients.filter((pat) => {
          try {
            return pat.estado === "Pendiente de consulta"
          } catch (error) {
            console.error("[AdmissionDashboard] Error filtrando pacientes pendientes:", error, pat)
            return false
          }
        }).length,

        // Citas completadas hoy
        completedToday: validAppointments.filter((app) => {
          try {
            const appDate =
              typeof app.fechaConsulta === "string"
                ? app.fechaConsulta.split("T")[0]
                : format(new Date(app.fechaConsulta), "yyyy-MM-dd")

            return appDate === todayStr && app.estado === "completada"
          } catch (error) {
            console.error("[AdmissionDashboard] Error filtrando citas completadas:", error, app)
            return false
          }
        }).length,

        // Total de pacientes
        totalPatients: validPatients.length,

        // Crecimiento mensual (simulado por ahora)
        monthlyGrowth: 12.5,

        // Tendencia semanal (simulado por ahora)
        weeklyTrend: 5.2,
      }
    } catch (error) {
      console.error("[AdmissionDashboard] Error calculando métricas rápidas:", error)
      return defaultMetrics
    }
  }, [isLoading, patients, appointments])

  return (
    <div>
      <h1>Panel de Admisión</h1>
      <div>
        <p>Citas de hoy: {quickMetrics.todayAppointments}</p>
        <p>Pacientes pendientes: {quickMetrics.pendingPatients}</p>
        <p>Citas completadas hoy: {quickMetrics.completedToday}</p>
        <p>Total de pacientes: {quickMetrics.totalPatients}</p>
        <p>Crecimiento mensual: {quickMetrics.monthlyGrowth}%</p>
        <p>Tendencia semanal: {quickMetrics.weeklyTrend}%</p>
      </div>
    </div>
  )
}

export default AdmissionDashboard
