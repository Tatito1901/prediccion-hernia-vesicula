"use client"

import React, { useMemo, Suspense } from "react";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SiteHeader } from "../../components/navigation/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { clinicMetrics, getPendingFollowUps, samplePatients } from "../pacientes/sample-data"; // Asegúrate que estas rutas sean correctas

// Carga diferida para los componentes principales del dashboard
const DashboardMetrics = React.lazy(() => 
  import("../../components/dashboard/dashboard-metrics")
);
const PatientAnalytics = React.lazy(() => 
  import("../../components/dashboard/patient-analytics")
);

// Componente de carga para Suspense
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    {/* Puedes personalizar este spinner o usar uno de tu librería de UI */}
  </div>
);

export default function Page() {
  // Memoizar el resultado de getPendingFollowUps si es una operación costosa
  // o si los datos de los que depende no cambian en cada render.
  const pendingFollowUps = useMemo(() => getPendingFollowUps(), []); 
  // Si getPendingFollowUps depende de algún valor que pueda cambiar, añádelo al array de dependencias.
  // Por ejemplo, si dependiera de 'samplePatients': useMemo(() => getPendingFollowUps(samplePatients), [samplePatients])

  return (
    <SidebarProvider>
      {/* AppSidebar probablemente maneja su propia responsividad y estado */}
      <AppSidebar variant="inset" />
      <SidebarInset>
        {/* SiteHeader también debería ser un componente responsivo */}
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          {/* El contenedor principal para el contenido del dashboard */}
          {/* Usamos @container/main para consultas de contenedor en los hijos */}
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6 lg:p-8">
            {/* Sección de métricas y analíticas */}
            <div className="flex flex-col gap-4 md:gap-6">
              {/* Suspense para la carga diferida de DashboardMetrics */}
              <Suspense fallback={<LoadingSpinner />}>
                <DashboardMetrics metrics={clinicMetrics} />
              </Suspense>
              
              {/* PatientAnalytics también se carga de forma diferida */}
              {/* El padding se maneja aquí en lugar de dentro de un div adicional para simplificar */}
              <Suspense fallback={<LoadingSpinner />}>
                <PatientAnalytics /> 
              </Suspense>

              {/* Grid responsivo para contenido adicional, si es necesario */}
              {/* Este grid estaba vacío, lo dejo como ejemplo si necesitas añadir más elementos */}
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2">
                {/* Ejemplo de contenido en el grid:
                <div className="bg-card p-4 rounded-lg shadow">Contenido 1</div>
                <div className="bg-card p-4 rounded-lg shadow">Contenido 2</div>
                */}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}