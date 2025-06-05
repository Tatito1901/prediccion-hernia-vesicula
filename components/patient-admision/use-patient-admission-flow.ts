import { useState, useMemo, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useAppContext } from '@/lib/context/app-context'
import type { AppointmentData, AppointmentStatus, AppointmentStatusEnum } from '@/app/dashboard/data-model'
import { startOfDay, isToday, isBefore, isAfter } from 'date-fns'

// Tipos para el flujo de admisión
export type AdmissionTab = 'newPatient' | 'today' | 'future' | 'past'

export interface AdmissionFilterState {
  searchTerm: string
  statusFilter: AppointmentStatus | 'all'
  sortField: string | null
}

export interface AppointmentLists {
  today: AppointmentData[]
  future: AppointmentData[]
  past: AppointmentData[]
}

export interface UsePatientAdmissionFlowReturn {
  appointments: AppointmentData[]
  isLoadingAppointments: boolean
  errorAppointments: string | null
  activeTab: AdmissionTab
  setActiveTab: (value: AdmissionTab) => void
  filters: AdmissionFilterState
  setFilters: Dispatch<SetStateAction<AdmissionFilterState>>
  classifiedAppointments: AppointmentLists
  filteredAppointments: AppointmentLists
  refetchAppointments: () => void
}

/**
 * Hook optimizado para manejar el flujo de admisión de pacientes
 * Incluye clasificación por fecha, filtrado y ordenamiento
 */
export function usePatientAdmissionFlow(): UsePatientAdmissionFlowReturn {
  const {
    appointments = [],
    isLoadingAppointments = false,
    errorAppointments = null,
    refetchAppointments,
  } = useAppContext()

  // Estados locales optimizados
  const [activeTab, setActiveTab] = useState<AdmissionTab>('today')
  const [filters, setFilters] = useState<AdmissionFilterState>({
    searchTerm: '',
    statusFilter: 'all',
    sortField: null,
  })

  // Clasificación optimizada de citas por fecha
  const classifiedAppointments = useMemo((): AppointmentLists => {
    const today: AppointmentData[] = []
    const future: AppointmentData[] = []
    const past: AppointmentData[] = []

    if (!appointments || appointments.length === 0) {
      return { today, future, past }
    }

    const now = new Date()
    const todayStart = startOfDay(now)

    appointments.forEach(appointment => {
      try {
        // Normalizar la fecha de la cita
        const appointmentDate = appointment.fechaConsulta instanceof Date
          ? appointment.fechaConsulta
          : new Date(appointment.fechaConsulta)

        // Verificar que la fecha sea válida
        if (isNaN(appointmentDate.getTime())) {
          console.warn(`Fecha inválida en cita ${appointment.id}:`, appointment.fechaConsulta)
          return
        }

        const appointmentStart = startOfDay(appointmentDate)

        // Clasificar por fecha
        if (appointmentStart.getTime() === todayStart.getTime()) {
          today.push(appointment)
        } else if (appointmentStart > todayStart) {
          future.push(appointment)
        } else {
          past.push(appointment)
        }
      } catch (error) {
        console.error(`Error procesando cita ${appointment.id}:`, error)
      }
    })

    // Ordenar cada categoría
    const sortByDateTime = (a: AppointmentData, b: AppointmentData) => {
      const dateA = a.fechaConsulta instanceof Date ? a.fechaConsulta : new Date(a.fechaConsulta)
      const dateB = b.fechaConsulta instanceof Date ? b.fechaConsulta : new Date(b.fechaConsulta)
      
      // Ordenar por fecha y luego por hora
      const dateDiff = dateA.getTime() - dateB.getTime()
      if (dateDiff !== 0) return dateDiff
      
      // Si las fechas son iguales, ordenar por hora
      const timeA = a.horaConsulta || '00:00'
      const timeB = b.horaConsulta || '00:00'
      return timeA.localeCompare(timeB)
    }

    return {
      today: today.sort(sortByDateTime),
      future: future.sort(sortByDateTime),
      past: past.sort((a, b) => sortByDateTime(b, a)) // Pasadas en orden descendente
    }
  }, [appointments])

  // Aplicación optimizada de filtros
  const filteredAppointments = useMemo((): AppointmentLists => {
    const applyFilters = (appointmentList: AppointmentData[]): AppointmentData[] => {
      let result = [...appointmentList]

      // Filtro por término de búsqueda
      if (filters.searchTerm.trim()) {
        const searchTerm = filters.searchTerm.toLowerCase().trim()
        result = result.filter(appointment => 
          appointment.paciente?.toLowerCase().includes(searchTerm) ||
          appointment.telefono?.toLowerCase().includes(searchTerm) ||
          appointment.motivoConsulta?.toString().toLowerCase().includes(searchTerm) ||
          appointment.doctor?.toLowerCase().includes(searchTerm) ||
          appointment.notas?.toLowerCase().includes(searchTerm)
        )
      }

      // Filtro por estado
      if (filters.statusFilter !== 'all') {
        result = result.filter(appointment => appointment.estado === filters.statusFilter)
      }

      return result
    }

    return {
      today: applyFilters(classifiedAppointments.today),
      future: applyFilters(classifiedAppointments.future),
      past: applyFilters(classifiedAppointments.past)
    }
  }, [classifiedAppointments, filters])

  // Función de refetch optimizada
  const handleRefetchAppointments = useCallback(() => {
    if (refetchAppointments) {
      refetchAppointments()
    }
  }, [refetchAppointments])

  return {
    appointments,
    isLoadingAppointments,
    errorAppointments,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    classifiedAppointments,
    filteredAppointments,
    refetchAppointments: handleRefetchAppointments,
  }
}