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
    admision: pendingAppointments?.filter(app => app.estado === "pendiente" && new Date(app.fecha).toDateString() === new Date().toDateString()).length || 0,
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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 px-2 sm:px-0">
      {/* Header mejorado para móviles */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-center sm:text-left">
          Centro de Gestión Clínica
        </h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          className="gap-1.5 w-full sm:w-auto"
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">
            {isLoading ? 'Actualizando...' : 'Actualizar datos'}
          </span>
          <span className="xs:hidden">
            {isLoading ? 'Actualizando...' : 'Actualizar'}
          </span>
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
            {/* Tabs container mejorado */}
            <div className="bg-muted/30 border-b px-1 sm:px-3 py-1 sm:py-2 overflow-x-auto">
              <TabsList className="h-10 sm:h-11 bg-background w-full min-w-max sm:min-w-0 justify-start gap-0.5 sm:gap-1 rounded-none border-b border-b-transparent p-0">
                <TabsTrigger 
                  value="admision" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow px-2 sm:px-3 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">Admisión de Pacientes</span>
                      <span className="sm:hidden">Admisión</span>
                    </span>
                    {notificationCounts.admision > 0 && (
                      <Badge variant="destructive" className="ml-0.5 sm:ml-1 px-1 min-w-4 sm:min-w-5 h-4 sm:h-5 flex items-center justify-center text-xs">
                        {notificationCounts.admision}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="statistics" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow px-2 sm:px-3 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <FileBarChartIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">Estadísticas de Citas</span>
                      <span className="sm:hidden">Estadísticas</span>
                    </span>
                  </div>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="diagnostic" 
                  className="relative rounded-t-lg rounded-b-none border-r border-l border-t data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow px-2 sm:px-3 whitespace-nowrap"
                >
                  <div className="flex items-center gap-1 sm:gap-2">
                    <PieChartIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="text-xs sm:text-sm">
                      <span className="hidden sm:inline">Análisis de Diagnósticos</span>
                      <span className="sm:hidden">Diagnósticos</span>
                    </span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content con padding responsivo */}
            <div className="p-3 sm:p-6">
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