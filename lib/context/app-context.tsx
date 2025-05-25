"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { additionalPatients as samplePatients } from "@/app/pacientes/sample-data"
import { sampleDoctors, clinicMetrics } from "@/app/dashboard/mock-data"
import { getPendingFollowUps } from "@/app/pacientes/utils"
import type { PatientData, FollowUp, DoctorData, ClinicMetrics, AppointmentData } from "@/app/dashboard/data-model"

// Definir tipos para el contexto
type AppContextType = {
  patients: PatientData[]
  setPatients: React.Dispatch<React.SetStateAction<PatientData[]>>
  doctors: DoctorData[]
  metrics: ClinicMetrics
  pendingFollowUps: FollowUp[]
  pendingAppointments: AppointmentData[]
  setPendingAppointments: React.Dispatch<React.SetStateAction<AppointmentData[]>>
  todayAppointments: AppointmentData[]
  setTodayAppointments: React.Dispatch<React.SetStateAction<AppointmentData[]>>
  addPatient: (patient: Omit<PatientData, "id">) => number
  updatePatient: (id: number, patient: Partial<PatientData>) => void
  addFollowUp: (followUp: Omit<FollowUp, "id">) => void
  updateFollowUp: (id: number, followUp: Partial<FollowUp>) => void
  addAppointment: (appointment: Omit<AppointmentData, "id">) => void
  updateAppointment: (id: number, appointment: Partial<AppointmentData>) => void
  getPatientById: (id: number) => PatientData | undefined
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [patients, setPatients] = useState<PatientData[]>(samplePatients)
  const [pendingFollowUps, setPendingFollowUps] = useState<FollowUp[]>(getPendingFollowUps())
  const [pendingAppointments, setPendingAppointments] = useState<AppointmentData[]>([
    {
      id: 1,
      patientId: 2,
      paciente: "María González López",
      telefono: "5551234567",
      motivoConsulta: "Vesícula",
      fecha: "2024-05-20",
      hora: "10:00",
      doctor: "Dr. Martínez",
      estado: "pendiente",
    },
    {
      id: 2,
      patientId: undefined,
      paciente: "Carlos Ramírez Soto",
      telefono: "5559876543",
      motivoConsulta: "Hernia Inguinal",
      fecha: "2024-05-21",
      hora: "12:30",
      doctor: "Dr. Sánchez",
      estado: "pendiente",
    },
  ])
  const [todayAppointments, setTodayAppointments] = useState<AppointmentData[]>([])

  // Actualizar seguimientos pendientes cuando cambian los pacientes
  useEffect(() => {
    const updatedFollowUps: FollowUp[] = []
    patients.forEach((patient) => {
      if (patient.seguimientos) {
        patient.seguimientos.forEach((followUp) => {
          if (followUp.estado === "Programado") {
            updatedFollowUps.push({
              ...followUp,
              patientId: patient.id,
            })
          }
        })
      }
    })
    setPendingFollowUps(updatedFollowUps)
  }, [patients])

  // Asegurarnos de que addPatient devuelva el ID del paciente y maneje correctamente todos los campos
  const addPatient = (patient: Omit<PatientData, "id">) => {
    const newId = Math.max(...patients.map((p) => p.id), 0) + 1
    const newPatient = {
      id: newId,
      ...patient,
      // Asegurarnos de que estos campos siempre estén presentes
      estado: patient.estado || "Pendiente de consulta",
      probabilidadCirugia: patient.probabilidadCirugia || 0.5,
      notaClinica: patient.notaClinica || "",
      // La encuesta estará incompleta por defecto (undefined)
      encuesta: undefined,
      // Agregar timestamp de registro para poder ordenar por más reciente
      timestampRegistro: Date.now()
    }
    // Colocar el nuevo paciente al PRINCIPIO del array para que aparezca primero
    setPatients((prev) => [newPatient, ...prev])
    return newId
  }

  // Mejorar la función updatePatient para manejar mejor las actualizaciones
  const updatePatient = (id: number, patientUpdate: Partial<PatientData>) => {
    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === id
          ? {
              ...patient,
              ...patientUpdate,
              // Si se actualiza el estado, actualizar también la fecha de último contacto
              ultimoContacto: patientUpdate.estado ? new Date().toISOString().split("T")[0] : patient.ultimoContacto,
            }
          : patient,
      ),
    )
  }

  // Función para añadir un nuevo seguimiento
  const addFollowUp = (followUp: Omit<FollowUp, "id">) => {
    const patientId = followUp.patientId
    const patient = patients.find((p) => p.id === patientId)

    if (patient) {
      const newFollowUpId = patient.seguimientos ? Math.max(...patient.seguimientos.map((f) => f.id), 0) + 1 : 1

      const newFollowUp = {
        id: newFollowUpId,
        ...followUp,
      }

      // Actualizar el paciente con el nuevo seguimiento
      updatePatient(patientId, {
        seguimientos: [...(patient.seguimientos || []), newFollowUp],
        ultimoContacto: new Date().toISOString().split("T")[0],
        proximoContacto: followUp.proximoSeguimiento,
      })
    }
  }

  // Función para actualizar un seguimiento existente
  const updateFollowUp = (id: number, followUpUpdate: Partial<FollowUp>) => {
    setPatients((prev) =>
      prev.map((patient) => {
        if (patient.seguimientos) {
          const followUpIndex = patient.seguimientos.findIndex((f) => f.id === id)
          if (followUpIndex >= 0) {
            const updatedFollowUps = [...patient.seguimientos]
            updatedFollowUps[followUpIndex] = {
              ...updatedFollowUps[followUpIndex],
              ...followUpUpdate,
            }
            return {
              ...patient,
              seguimientos: updatedFollowUps,
              ultimoContacto:
                followUpUpdate.estado === "Completado"
                  ? new Date().toISOString().split("T")[0]
                  : patient.ultimoContacto,
            }
          }
        }
        return patient
      }),
    )
  }

  // Función para añadir una nueva cita
  const addAppointment = (appointment: Omit<AppointmentData, "id">) => {
    const newId = Math.max(...pendingAppointments.map((a) => a.id), 0) + 1
    const newAppointment = {
      id: newId,
      ...appointment,
    }
    setPendingAppointments((prev) => [...prev, newAppointment])

    // Si la cita es para hoy, añadirla también a las citas de hoy
    const today = new Date()
    if (appointment.fecha && typeof appointment.fecha === 'string') {
      const appointmentDate = new Date(appointment.fecha); 
      if (
        appointmentDate.getUTCDate() === today.getUTCDate() && 
        appointmentDate.getUTCMonth() === today.getUTCMonth() &&
        appointmentDate.getUTCFullYear() === today.getUTCFullYear()
      ) {
        setTodayAppointments((prev) => [...prev, newAppointment])
      }
    }

    return newId
  }

  // Función para actualizar una cita existente
  const updateAppointment = (id: number, appointmentUpdate: Partial<AppointmentData>) => {
    // Actualizar en pendingAppointments
    setPendingAppointments((prev) =>
      prev.map((appointment) => (appointment.id === id ? { ...appointment, ...appointmentUpdate } : appointment)),
    )

    // Actualizar en todayAppointments si existe
    setTodayAppointments((prev) => {
      const appointmentIndex = prev.findIndex((a) => a.id === id)
      if (appointmentIndex >= 0) {
        const updated = [...prev]
        updated[appointmentIndex] = { ...updated[appointmentIndex], ...appointmentUpdate }
        return updated
      }
      return prev
    })

    // Si el estado cambia a "presente", actualizar el paciente si existe o crear uno nuevo
    if (appointmentUpdate.estado === "presente") {
      const appointment = pendingAppointments.find((a) => a.id === id)
      if (appointment) {
        if (appointment.patientId) {
          // Si el paciente ya existe, actualizar su estado
          updatePatient(appointment.patientId, {
            estado: "Pendiente de consulta",
            ultimoContacto: new Date().toISOString().split("T")[0],
          })
        }
      }
    }

    // Si el estado cambia a "completada", actualizar el paciente si existe
    if (appointmentUpdate.estado === "completada") {
      const appointment = pendingAppointments.find((a) => a.id === id)
      if (appointment && appointment.patientId) {
        updatePatient(appointment.patientId, {
          estado: "Seguimiento",
          fechaConsulta: appointment.fecha,
          ultimoContacto: new Date().toISOString().split("T")[0],
        })
      }
    }
  }

  // Función para obtener un paciente por ID
  const getPatientById = (id: number) => {
    return patients.find((p) => p.id === id)
  }

  return (
    <AppContext.Provider
      value={{
        patients,
        setPatients,
        doctors: sampleDoctors,
        metrics: clinicMetrics,
        pendingFollowUps,
        pendingAppointments,
        setPendingAppointments,
        todayAppointments,
        setTodayAppointments,
        addPatient,
        updatePatient,
        addFollowUp,
        updateFollowUp,
        addAppointment,
        updateAppointment,
        getPatientById,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

// Hook personalizado para usar el contexto
export function useAppContext(): AppContextType {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider")
  }
  return context
}
