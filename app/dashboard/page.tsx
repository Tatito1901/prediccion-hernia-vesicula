"use client"

import React, { useMemo, Suspense, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useChartData } from "@/hooks/use-chart-data";

// Carga diferida optimizada usando next/dynamic en lugar de React.lazy
const DashboardMetrics = dynamic(
  () => import("../../components/dashboard/dashboard-metrics"),
  { 
    ssr: true, // Renderizar en el servidor para mejorar LCP
    loading: () => <LoadingSpinner /> 
  }
);

// PatientAnalytics se cargará solo cuando esté visible en el viewport
const PatientAnalytics = dynamic(
  () => import("../../components/dashboard/patient-analytics"),
  { 
    ssr: false, // Carga en cliente para reducir tiempo de carga inicial
    loading: () => <LoadingSpinner /> 
  }
);

// Componente de carga para Suspense
const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
    {/* Puedes personalizar este spinner o usar uno de tu librería de UI */}
  </div>
);

export default function Page() {
  // Estado para controlar cuándo cargar PatientAnalytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  // Ref para el div contenedor de PatientAnalytics
  const analyticsRef = useRef<HTMLDivElement>(null);

  // Usar el hook useChartData para obtener métricas de la API
  const { chartData, loading, error, refresh } = useChartData({
    dateRange: 'ytd', // Usar datos de todo el año
    refreshInterval: 0, // No actualizar automáticamente
  });

  // Extraer clinicMetrics del hook
  const clinicMetrics = chartData.clinicMetrics;

  // Configurar Intersection Observer para PatientAnalytics
  useEffect(() => {
    if (!analyticsRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Cuando el componente está visible, cargarlo
          setShowAnalytics(true);
          // Una vez que decidimos mostrar el componente, no necesitamos seguir observando
          observer.disconnect();
        }
      },
      // Configuración para cargar cuando está a 200px de entrar en viewport
      { rootMargin: '200px' }
    );

    observer.observe(analyticsRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Función para actualizar datos manualmente
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <SidebarProvider>
      {/* AppSidebar probablemente maneja su propia responsividad y estado */}
      <AppSidebar variant="inset" />
      <SidebarInset>
        <div className="flex flex-1 flex-col">
          {/* El contenedor principal para el contenido del dashboard */}
          {/* Usamos @container/main para consultas de contenedor en los hijos */}
          <div className="@container/main flex flex-1 flex-col gap-2 p-4 md:p-6 lg:p-8">
            {/* Sección de métricas y analíticas */}
            <div className="flex flex-col gap-4 md:gap-6">
              {/* DashboardMetrics ya usa dynamic import con SSR */}
              <DashboardMetrics 
                metrics={clinicMetrics as any} /* Tipado temporal hasta actualizar las interfaces */
                loading={loading}
              />
              
              {/* PatientAnalytics usando Intersection Observer para carga diferida */}
              {/* El padding se maneja aquí en lugar de dentro de un div adicional para simplificar */}
              <div ref={analyticsRef} className="min-h-[200px]">
                {showAnalytics && <PatientAnalytics />}
              </div>

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