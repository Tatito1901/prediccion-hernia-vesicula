"use client"

import React, { useState, Suspense, useMemo } from 'react';
import { ClinicDataProvider, useClinic } from "@/contexts/clinic-data-provider";
import { useChartData, type AppointmentFilters } from "@/hooks/use-chart-data";
import { AppointmentStatistics } from "@/components/charts/appointment-statistics";
import { LoadingSpinner } from "@/components/charts/use-chart-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart } from "lucide-react";
import { AppointmentStatusEnum } from '@/lib/types';

// El estado inicial de los filtros.
const INITIAL_FILTERS: AppointmentFilters = {
  dateRange: 'month',
  patientId: undefined,
  doctorId: undefined,
  estado: 'todos',
  motiveFilter: "all",
  statusFilter: Object.values(AppointmentStatusEnum),
  timeRange: [0, 24],
  sortBy: "fecha_hora_cita",
  sortOrder: "desc",
};

// Componente Interno que consume el contexto
const EstadisticasContent = () => {
  // Obtenemos todos los datos y el estado de carga desde la ÚNICA fuente de verdad.
  const {
    allPatients,
    allAppointments,
    isLoading: isClinicLoading,
    error: clinicError,
    refetch,
  } = useClinic();

  const [filters, setFilters] = useState<AppointmentFilters>(INITIAL_FILTERS);

  // El enriquecimiento de citas se mantiene igual.
  const enrichedAppointments = useMemo(() => {
    if (!allAppointments || !allPatients) return [];
    const patientsMap = new Map(allPatients.map(p => [p.id, p]));
    return allAppointments.map(appointment => ({
      ...appointment,
      patients: patientsMap.get(appointment.patient_id) || null,
    }));
  }, [allAppointments, allPatients]);

  // useChartData ahora actúa como un selector que procesa los datos del contexto.
  const chartData = useChartData({
    patients: allPatients,
    appointments: enrichedAppointments,
    ...filters,
  });

  const isLoading = isClinicLoading || !chartData;

  if (clinicError) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-red-500">Error al cargar los datos de la clínica: {clinicError.message}</p>
        <button onClick={() => refetch()} className="ml-4 p-2 border rounded">Reintentar</button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Estadísticas</h2>
      </div>

      <Tabs defaultValue="citas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="citas">
            <FileBarChart className="mr-2 h-4 w-4" />
            Análisis de Citas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="citas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas de Citas</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingSpinner />}>
                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <AppointmentStatistics
                    chartData={chartData}
                    isLoading={isLoading}
                    error={clinicError}
                    onRefresh={refetch}
                    filters={filters}
                    setFilters={setFilters}
                  />
                )}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


// Componente exportado que envuelve todo en el proveedor de datos.
const EstadisticasPage = () => {
  return (
    <ClinicDataProvider>
      <EstadisticasContent />
    </ClinicDataProvider>
  );
};

export default EstadisticasPage;
