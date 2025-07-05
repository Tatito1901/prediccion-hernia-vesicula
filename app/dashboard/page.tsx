"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useInView } from "react-intersection-observer";
import { DashboardProvider } from "@/contexts/dashboard-context";

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

const PatientTrendsChart = dynamic(
  () => import("../../components/dashboard/patients-chart").then(mod => mod.PatientTrendsChart),
  {
    ssr: false, 
    loading: () => <Skeleton className="h-[400px] w-full" />,
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
  const [analyticsRef, isAnalyticsVisible] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });
  
  // All error handling is now done inside components via the context

  return (
    <DashboardProvider>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-8 md:gap-12 max-w-7xl mx-auto">
              
              <section>
                <DashboardMetrics />
              </section>



              <section>
                <PatientTrendsChart />
              </section>

            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </DashboardProvider>
  );
}
