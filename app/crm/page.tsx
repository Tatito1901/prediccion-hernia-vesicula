"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "../../components/navigation/app-sidebar"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { samplePatients, getPendingFollowUps } from "../pacientes/sample-data"
import { CrmFollowup } from "../../components/medical/crm-followup"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SurgeryDecisionPipeline } from "../../components/crm/surgery-decision-pipeline"
import { FollowUpScheduler } from "../../components/crm/follow-up-scheduler"
import { CommunicationInsights } from "../../components/crm/communication-insights"
import SurgeryScheduler from "../../components/crm/surgery-scheduler"
import { ConversionAnalytics } from "../../components/crm/conversion-analytics"

export default function CrmPage() {
  const searchParams = useSearchParams()

  // Get follow-ups and patients data
  const followUps = getPendingFollowUps()
  const patients = samplePatients

  // Get patientId and view from URL
  const patientIdParam = searchParams.get("patientId")
  const viewParam = searchParams.get("view")

  // Set initial states based on URL parameters
  const [activeTab, setActiveTab] = useState(viewParam === "followups" ? "followups" : "followups")
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null)
  const [initialMainView, setInitialMainView] = useState<"dashboard" | "patients" | "followups" | "resources">(
    "dashboard",
  )

  // Effect to handle URL parameters
  useEffect(() => {
    if (patientIdParam) {
      const patientIdNum = Number.parseInt(patientIdParam, 10)
      if (!isNaN(patientIdNum)) {
        setSelectedPatientId(patientIdNum)

        // Set the main view based on the view parameter
        if (viewParam === "followups") {
          setInitialMainView("followups")
          setActiveTab("followups")
        } else if (viewParam === "patients") {
          setInitialMainView("patients")
          setActiveTab("followups")
        }
      }
    }
  }, [patientIdParam, viewParam])

  // Handlers for various actions
  const handleMovePatient = (patientId: number, newStage: any) => {
    console.log(`Mover paciente ${patientId} a etapa ${newStage}`)
    // Aquí implementarías la lógica real para mover al paciente
  }

  const handleScheduleFollowUp = (patientId: number, date?: Date, type?: string, template?: string) => {
    console.log(`Programar seguimiento para paciente ${patientId}`)
    // Aquí implementarías la lógica real para programar seguimiento
  }

  const handleCompleteFollowUp = (followUpId: number) => {
    console.log(`Completar seguimiento ${followUpId}`)
    // Aquí implementarías la lógica real para completar seguimiento
  }

  const handleCreateFollowUp = (patientId: number, type: string) => {
    console.log(`Crear seguimiento tipo ${type} para paciente ${patientId}`)
    // Aquí implementarías la lógica real para crear seguimiento
  }

  const handleScheduleSurgery = (patientId: number, date: Date, doctor: string, notes: string) => {
    console.log(`Programar cirugía para paciente ${patientId}`)
    // Aquí implementarías la lógica real para programar cirugía
  }

  const handleSendPreOpInstructions = (patientId: number) => {
    console.log(`Enviar instrucciones preoperatorias a paciente ${patientId}`)
    // Aquí implementarías la lógica real para enviar instrucciones
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-4">
                    <TabsTrigger value="followups">Seguimientos</TabsTrigger>
                    <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                    <TabsTrigger value="scheduler">Programador</TabsTrigger>
                    <TabsTrigger value="insights">Comunicación</TabsTrigger>
                    <TabsTrigger value="analytics">Análisis</TabsTrigger>
                  </TabsList>

                  <TabsContent value="followups" className="space-y-4">
                    <CrmFollowup
                      followUps={followUps}
                      patients={patients}
                      initialSelectedPatientId={selectedPatientId}
                      initialMainView={initialMainView}
                    />
                  </TabsContent>

                  <TabsContent value="pipeline" className="space-y-4">
                    <SurgeryDecisionPipeline
                      patients={patients}
                      onMovePatient={handleMovePatient}
                      onScheduleFollowUp={(patientId) => handleScheduleFollowUp(patientId)}
                    />
                  </TabsContent>

                  <TabsContent value="scheduler" className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <FollowUpScheduler
                        patients={patients}
                        pendingFollowUps={followUps}
                        onScheduleFollowUp={handleScheduleFollowUp}
                        onCompleteFollowUp={handleCompleteFollowUp}
                      />

                      <SurgeryScheduler
                        patients={patients}
                        onScheduleSurgery={handleScheduleSurgery}
                        onSendPreOpInstructions={handleSendPreOpInstructions}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-4">
                    <CommunicationInsights
                      patients={patients}
                      followUps={followUps}
                      onCreateFollowUp={handleCreateFollowUp}
                    />
                  </TabsContent>

                  <TabsContent value="analytics" className="space-y-4">
                    <ConversionAnalytics patients={patients} followUps={followUps} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
