"use client";

import React from "react";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";

// Import components statically instead of using dynamic imports
import { DashboardConsolidated } from "../../components/dashboard/dashboard-consolidated";
import { DashboardContainer } from "../../components/charts/dashboard/dashboard-container";
import TemporalTrendsChart from "../../components/charts/temporal-trends-chart";

function DashboardContent() {
  return (
    <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
        <section>
          <DashboardConsolidated />
        </section>

        <section>
          {/* Gráficos y análisis detallados consumiendo datos agregados del backend */}
          <DashboardContainer />
        </section>

        <section>
          {/* Mantenemos el chart temporal existente */}
          <div className="grid grid-cols-1">
            <TemporalTrendsChart />
          </div>
        </section>

      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
      <ClinicDataProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <DashboardContent />
          </SidebarInset>
        </SidebarProvider>
      </ClinicDataProvider>
  );
}
