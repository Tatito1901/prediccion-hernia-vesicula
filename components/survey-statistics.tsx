"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * Componente stub para estadísticas de encuestas
 * Este es un componente placeholder que será implementado completamente en el futuro
 */
export function SurveyStatistics() {
  return (
    <div className="grid gap-6">
      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general">Estadísticas Generales</TabsTrigger>
          <TabsTrigger value="demograficas">Datos Demográficos</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Total de Encuestas</CardTitle>
                <CardDescription>Encuestas completadas</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">157</p>
                <p className="text-xs text-muted-foreground mt-2">+12% desde el mes anterior</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Tasa de Respuesta</CardTitle>
                <CardDescription>Porcentaje de participación</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">68%</p>
                <p className="text-xs text-muted-foreground mt-2">+5% desde el mes anterior</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Satisfacción Media</CardTitle>
                <CardDescription>Escala 1-10</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">8.4</p>
                <p className="text-xs text-muted-foreground mt-2">+0.2 desde el mes anterior</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Implementación Pendiente</CardTitle>
                <CardDescription>
                  Este componente es un stub y estará completamente implementado en futuras versiones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center text-muted-foreground">
                  Visualizaciones y gráficos de estadísticas de encuestas en desarrollo
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="demograficas">
          <Card>
            <CardHeader>
              <CardTitle>Datos Demográficos</CardTitle>
              <CardDescription>Distribución por edad, género y región</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                Visualizaciones demográficas en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tendencias">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Tendencias</CardTitle>
              <CardDescription>Patrones y tendencias a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center text-muted-foreground">
                Visualizaciones de tendencias en desarrollo
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
