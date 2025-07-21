// components/dashboard/dashboard-reactive.tsx - DASHBOARD REACTIVO BACKEND-FIRST
'use client';

import React from 'react';
import { useDashboardSummary } from '@/contexts/clinic-data-provider-new';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Activity,
  RefreshCw 
} from 'lucide-react';
import { AppointmentsListReactive } from '@/components/appointments/appointments-list-reactive';
import { PatientsListReactive } from '@/components/patients/patients-list-reactive';

// ==================== COMPONENTE DASHBOARD REACTIVO ====================
export function DashboardReactive() {
  // 🎯 FETCH ESPECÍFICO - Solo métricas del dashboard
  const {
    data: summary,
    isLoading,
    error,
    refetch,
  } = useDashboardSummary();

  // 🎯 Renderizado de loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // 🎯 Renderizado de error
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Activity className="h-5 w-5" />
            Error al cargar el dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            {error.message || 'Ocurrió un error al cargar los datos del dashboard'}
          </p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🎯 MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Citas Hoy
                </p>
                <p className="text-3xl font-bold">
                  {summary?.todayAppointments || 0}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Pacientes
                </p>
                <p className="text-3xl font-bold">
                  {summary?.totalPatients || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Consultas Pendientes
                </p>
                <p className="text-3xl font-bold">
                  {summary?.pendingConsults || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Encuestas Completadas
                </p>
                <p className="text-3xl font-bold">
                  {summary?.completedSurveys || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 🎯 ACTIVIDAD RECIENTE */}
      {summary?.recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Actividad Reciente (Últimos 7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {summary.recentActivity.newPatients}
                </div>
                <div className="text-sm text-blue-600">
                  Nuevos Pacientes
                </div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {summary.recentActivity.completedAppointments}
                </div>
                <div className="text-sm text-green-600">
                  Citas Completadas
                </div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {summary.recentActivity.pendingSurveys}
                </div>
                <div className="text-sm text-orange-600">
                  Encuestas Pendientes
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🎯 COMPONENTES REACTIVOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Citas de hoy */}
        <AppointmentsListReactive
          initialDateFilter="today"
          initialPageSize={10}
          showFilters={false}
          showPagination={false}
        />
        
        {/* Pacientes recientes */}
        <PatientsListReactive
          initialPageSize={10}
          showFilters={false}
          showPagination={false}
          showStats={false}
        />
      </div>
    </div>
  );
}
