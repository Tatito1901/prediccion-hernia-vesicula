"use client";

import React from "react";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DashboardProvider } from "@/contexts/dashboard-context";

// Import components statically instead of using dynamic imports
import { DashboardMetrics } from "../../components/dashboard/dashboard-metrics";
import { PatientTrendsChart } from "../../components/dashboard/patients-chart";

export default function DashboardPage() {
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
