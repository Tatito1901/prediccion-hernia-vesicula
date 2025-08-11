"use client";

import React from "react";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";

// Import components statically instead of using dynamic imports
import { DashboardConsolidated } from "../../components/dashboard/dashboard-consolidated";
// Removed detailed charts to improve responsivity and performance per user request

function DashboardContent() {
  return (
    <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
        <section>
          <DashboardConsolidated />
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
