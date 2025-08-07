"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BarChart, PieChart, TrendingUp } from "lucide-react"
import MedicalSurveyAnalysis from "@/components/surveys/medical-survey-analysis"
import { useClinic } from "@/contexts/clinic-data-provider"

interface SurveyAnalysisDashboardProps {
  title: string
  description: string
}

export function SurveyAnalysisDashboard({ title, description }: SurveyAnalysisDashboardProps) {
  const { enrichedPatients: allPatients, isLoading, error } = useClinic()
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cargando...</CardTitle>
                <div className="h-4 w-4 bg-gray-200 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-6 w-3/4 bg-gray-200 rounded mt-2" />
                <div className="h-4 w-full bg-gray-200 rounded mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Analizando datos de encuestas...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-500">
              Error al cargar los datos: {error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Encuestas</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allPatients?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pacientes registrados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allPatients?.filter(p => p.encuesta_completada).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Encuestas finalizadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allPatients?.filter(p => !p.encuesta_completada).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Encuestas sin completar
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Respuesta</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allPatients && allPatients.length > 0 
                ? `${Math.round((allPatients.filter(p => p.encuesta_completada).length / allPatients.length) * 100)}%` 
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Participación de pacientes
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <MedicalSurveyAnalysis 
            title="Análisis de Encuestas" 
            description="Visualización detallada de los datos recopilados en las encuestas" 
            patients={allPatients || []} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
