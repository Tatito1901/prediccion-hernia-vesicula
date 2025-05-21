"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

// Definir tipos para el contexto
interface Patient {
  id: number
  nombre: string
  apellidos: string
  edad: number
  telefono: string
  email?: string
  estado?: string
  encuesta?: any
  probabilidadCirugia?: number
  [key: string]: any
}

interface AppContextType {
  patients: Patient[]
  addPatient: (patient: Omit<Patient, "id">) => number
  updatePatient: (id: number, data: Partial<Patient>) => void
  getPatientById: (id: number) => Patient | undefined
}

// Crear el contexto
const AppContext = createContext<AppContextType | undefined>(undefined)

// Hook personalizado para usar el contexto
export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    return {
      patients: [],
      addPatient: () => 0,
      updatePatient: () => {},
      getPatientById: () => undefined,
    }
  }
  return context
}

// Proveedor del contexto
export function AppContextProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([])

  // Añadir un nuevo paciente
  const addPatient = (patient: Omit<Patient, "id">) => {
    const id = patients.length > 0 ? Math.max(...patients.map((p) => p.id)) + 1 : 1
    const newPatient = { ...patient, id }
    setPatients([...patients, newPatient])
    return id
  }

  // Actualizar un paciente existente
  const updatePatient = (id: number, data: Partial<Patient>) => {
    setPatients(patients.map((p) => (p.id === id ? { ...p, ...data } : p)))
  }

  // Obtener un paciente por ID
  const getPatientById = (id: number) => {
    return patients.find((p) => p.id === id)
  }

  return (
    <AppContext.Provider value={{ patients, addPatient, updatePatient, getPatientById }}>
      {children}
    </AppContext.Provider>
  )
}
