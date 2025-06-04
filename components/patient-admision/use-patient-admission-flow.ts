import { useState, useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useAppContext } from '@/lib/context/app-context'
import type { AppointmentData, AppointmentStatus } from '@/app/dashboard/data-model'

// Tabs for appointment timing including form tab
export type AdmissionTab = 'newPatient' | 'today' | 'future' | 'past'

// State for filters
export interface AdmissionFilterState {
  searchTerm: string
  statusFilter: AppointmentStatus | 'all'
  sortField: string | null
}

// Agrupación de citas por fecha
export interface AppointmentLists {
  today: AppointmentData[]
  future: AppointmentData[]
  past: AppointmentData[]
}

// Hook para manejar flujo de admisión de pacientes
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

export function usePatientAdmissionFlow(): UsePatientAdmissionFlowReturn {
  const {
    appointments,
    isLoadingAppointments,
    errorAppointments,
    refetchAppointments,
  } = useAppContext()

  const [activeTabState, setActiveTabState] = useState<AdmissionTab>('today')
  const [filters, setFilters] = useState<AdmissionFilterState>({
    searchTerm: '',
    statusFilter: 'all',
    sortField: null,
  })

  // Clasificación de citas por fecha
  const classifiedAppointments = useMemo((): AppointmentLists => {
    const today: AppointmentData[] = []
    const future: AppointmentData[] = []
    const past: AppointmentData[] = []
    if (appointments) {
      const now = new Date()
      appointments.forEach(app => {
        const date = app.fechaConsulta instanceof Date
          ? app.fechaConsulta
          : new Date(app.fechaConsulta)
        if (date.toDateString() === now.toDateString()) {
          today.push(app)
        } else if (date > now) {
          future.push(app)
        } else {
          past.push(app)
        }
      })
    }
    return { today, future, past }
  }, [appointments])

  // Aplicar filtros de búsqueda y estado
  const filteredAppointments = useMemo((): AppointmentLists => {
    const applyFilter = (list: AppointmentData[]) => {
      let result = [...list]
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase()
        result = result.filter(app =>
          app.paciente.toLowerCase().includes(term) ||
          (app.telefono || '').toLowerCase().includes(term) ||
          (app.motivoConsulta || '').toString().toLowerCase().includes(term)
        )
      }
      if (filters.statusFilter !== 'all') {
        result = result.filter(app => app.estado === filters.statusFilter)
      }
      return result
    }
    return {
      today: applyFilter(classifiedAppointments.today),
      future: applyFilter(classifiedAppointments.future),
      past: applyFilter(classifiedAppointments.past),
    }
  }, [classifiedAppointments, filters])

  // Wrapper para compatibilidad con Tabs onValueChange
  const setActiveTab = (value: AdmissionTab) => setActiveTabState(value)

  return {
    appointments,
    isLoadingAppointments,
    errorAppointments,
    activeTab: activeTabState,
    setActiveTab,
    filters,
    setFilters,
    classifiedAppointments,
    filteredAppointments,
    refetchAppointments,
  }
}
