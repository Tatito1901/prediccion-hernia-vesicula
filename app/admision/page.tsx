"use client"

import { useState, useEffect } from "react"
import { PatientAdmission } from "@/components/patient-admision/patient-admission"
import { AppointmentStatistics } from "@/components/patient-admision/appointment-statistics"
import { ChartDiagnostic } from "@/components/patient-admision/chart-diagnostic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PieChartIcon, CalendarIcon, FileBarChartIcon, PanelTopIcon, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAppContext } from "@/lib/context/app-context"

export default function AdmisionPage() {
  const [activeTab, setActiveTab] = useState("admision")
  const { pendingAppointments, todayAppointments } = useAppContext()
  const [isLoading, setIsLoading] = useState(false)

  // Contador para notificaciones
  const notificationCounts = {
    admision: pendingAppointments?.filter(app => app.estado === "pendiente" && new Date(app.fechaConsulta).toDateString() === new Date().toDateString()).length || 0,
    statistics: 0,
    diagnostic: 0
  }

  // Función para refrescar datos
  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Centro de Gestión Clínica</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="gap-1.5"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Actualizando...' : 'Actualizar datos'}
        </Button>
      </div>

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Tabs 
            defaultValue="admision" 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <div className="bg-muted/30 border-b px-3 py-2">
              <TabsList className="h-11 bg-background w-full justify-start gap-1 rounded-none border-b border-b-transparent p-0">
                <TabsTrigger 
                  value="admision" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow"
                >
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Admisión de Pacientes</span>
                    {notificationCounts.admision > 0 && (
                      <Badge variant="destructive" className="ml-1 px-1 min-w-5 h-5 flex items-center justify-center">
                        {notificationCounts.admision}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="statistics" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow"
                >
                  <div className="flex items-center gap-2">
                    <FileBarChartIcon className="h-4 w-4" />
                    <span>Estadísticas de Citas</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger 
                  value="diagnostic" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow"
                >
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    <span>Análisis de Diagnósticos</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              <TabsContent value="admision" className="mt-0 border-none p-0">
                <PatientAdmission />
              </TabsContent>
              
              <TabsContent value="statistics" className="mt-0 border-none p-0">
                <AppointmentStatistics />
              </TabsContent>
              
              <TabsContent value="diagnostic" className="mt-0 border-none p-0">
                <ChartDiagnostic />
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}