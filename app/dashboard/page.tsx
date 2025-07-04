"use client";

import React, { Suspense, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useChartData } from "@/hooks/use-chart-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";

const DashboardMetrics = dynamic(
  () => import("../../components/dashboard/dashboard-metrics").then(mod => mod.DashboardMetrics),
  {
    ssr: true, 
    loading: () => <DashboardMetricsSkeleton />,
  }
);

const PatientAnalytics = dynamic(
  () => import("../../components/dashboard/patient-analytics").then(mod => mod.PatientAnalytics),
  {
    ssr: false, 
    loading: () => <PatientAnalyticsSkeleton />,
  }
);

const DashboardMetricsSkeleton: React.FC = () => {
    const responsiveGridClasses = "grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4";
    return (
        <div className="flex flex-col gap-4">
            <div className={responsiveGridClasses}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
};

const PatientAnalyticsSkeleton: React.FC = () => (
    <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-1/3 mb-2" />
        <Skeleton className="h-[350px] w-full" />
    </div>
);

const CardSkeleton: React.FC = () => (
    <div className="flex flex-col justify-between p-4 border rounded-lg h-36">
        <div className="flex justify-between items-start">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-6 w-6 rounded-md" />
        </div>
        <Skeleton className="h-7 w-1/2 mt-1" />
        <div className="mt-auto">
            <Skeleton className="h-4 w-1/2" />
        </div>
    </div>
);


export default function DashboardPage() {
  const {
    chartData,
    loading,
    error,
    refresh,
  } = useChartData({
    dateRange: 'ytd',
    refreshInterval: 0,
  });

  const clinicMetrics = useMemo(() => chartData?.clinicMetrics, [chartData]);

  const { ref: analyticsRef, inView: isAnalyticsVisible } = useInView({
    triggerOnce: true,
    rootMargin: '300px 0px',
  });

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="p-8 text-center bg-card border border-destructive/50 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-destructive">Error al Cargar los Datos</h2>
          <p className="text-muted-foreground mt-2">No pudimos obtener la información de la clínica.</p>
          <p className="text-xs text-muted-foreground mt-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
          >
            Intentar de Nuevo
          </button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-8 md:gap-12 max-w-7xl mx-auto">
            
            <section>
              <DashboardMetrics
                metrics={clinicMetrics}
                loading={loading}
              />
            </section>

            <section ref={analyticsRef} className="min-h-[400px]">
              {isAnalyticsVisible && <PatientAnalytics />}
            </section>

          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
