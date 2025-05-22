"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRightIcon, CalendarIcon, PhoneIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

interface SurgeryDecisionPipelineProps {
  patients: PatientData[]
  onMovePatient: (patientId: number, newStage: string) => void
  onScheduleFollowUp: (patientId: number) => void
}

// Define the stages of the surgery decision pipeline
const PIPELINE_STAGES = [
  {
    id: "initial",
    name: "Consulta Inicial",
    description: "Pacientes que han tenido su primera consulta",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400",
  },
  {
    id: "considering",
    name: "Considerando Opciones",
    description: "Pacientes evaluando opciones de tratamiento",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-800/20 dark:text-purple-400",
  },
  {
    id: "decision_pending",
    name: "Decisión Pendiente",
    description: "Pacientes cerca de tomar una decisión",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400",
  },
  {
    id: "ready_to_schedule",
    name: "Listo para Programar",
    description: "Pacientes listos para programar cirugía",
    color: "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400",
  },
]

export function SurgeryDecisionPipeline({ patients, onMovePatient, onScheduleFollowUp }: SurgeryDecisionPipelineProps) {
  const [activeTab, setActiveTab] = useState<string>("all")
  const [draggedPatient, setDraggedPatient] = useState<number | null>(null)

  // Determine patient stage based on probability
  const getPatientStage = (patient: PatientData): string => {
    const probability = patient.probabilidadCirugia || 0

    if (probability >= 0.8) return "ready_to_schedule"
    if (probability >= 0.6) return "decision_pending"
    if (probability >= 0.3) return "considering"
    return "initial"
  }

  // Filter patients by stage
  const getPatientsByStage = (stage: string): PatientData[] => {
    return patients
      .filter((patient) => !patient.fechaCirugia) // Exclude patients with scheduled surgery
      .filter((patient) => getPatientStage(patient) === stage)
  }

  // Handle drag start
  const handleDragStart = (patientId: number) => {
    setDraggedPatient(patientId)
  }

  // Handle drag over
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()
    if (draggedPatient !== null) {
      onMovePatient(draggedPatient, targetStage)
      toast.success("Paciente movido exitosamente")
      setDraggedPatient(null)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Pipeline de Decisión Quirúrgica</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-center">
            <TabsTrigger value="all" className="w-full md:w-40">
              Todos los Pacientes
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage.id}
                className="flex flex-col"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium">{stage.name}</h3>
                    <p className="text-xs text-muted-foreground">{stage.description}</p>
                  </div>
                  <Badge variant="outline" className={cn("ml-2", stage.color)}>
                    {getPatientsByStage(stage.id).length}
                  </Badge>
                </div>

                <div className="border rounded-md h-[400px] overflow-y-auto">
                  {getPatientsByStage(stage.id).length > 0 ? (
                    <div className="divide-y">
                      {getPatientsByStage(stage.id).map((patient) => (
                        <div
                          key={patient.id}
                          className="p-3 cursor-move hover:bg-muted/50 transition-colors"
                          draggable
                          onDragStart={() => handleDragStart(patient.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium">
                                {patient.nombre} {patient.apellidos}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {patient.edad} años | {patient.diagnostico}
                              </div>
                              <div className="text-sm mt-1">
                                Prob. Cirugía: {(patient.probabilidadCirugia * 100).toFixed(0)}%
                              </div>
                            </div>
                            <UserIcon className="h-5 w-5 text-muted-foreground" />
                          </div>

                          <div className="flex gap-2 mt-2">
                            {stage.id === "ready_to_schedule" && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => {
                                  setActiveTab("scheduler")
                                  toast.success("Redirigiendo al programador de cirugías")
                                }}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1" />
                                Programar Cirugía
                              </Button>
                            )}
                            {stage.id !== "ready_to_schedule" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => onScheduleFollowUp(patient.id)}
                                >
                                  <PhoneIcon className="h-3 w-3 mr-1" />
                                  Seguimiento
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => {
                                    const nextStageIndex = PIPELINE_STAGES.findIndex((s) => s.id === stage.id) + 1
                                    if (nextStageIndex < PIPELINE_STAGES.length) {
                                      onMovePatient(patient.id, PIPELINE_STAGES[nextStageIndex].id)
                                      toast.success(`Paciente movido a ${PIPELINE_STAGES[nextStageIndex].name}`)
                                    }
                                  }}
                                >
                                  <ArrowRightIcon className="h-3 w-3 mr-1" />
                                  Avanzar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">No hay pacientes en esta etapa</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
