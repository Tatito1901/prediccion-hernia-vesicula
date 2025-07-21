"use client";

import React from "react";
import { AppSidebar } from "../../components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";

// Import components statically instead of using dynamic imports
import DashboardMetrics from "../../components/dashboard/dashboard-metrics";

export default function DashboardPage() {
  return (
      <ClinicDataProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
              <div className="flex flex-col gap-6 md:gap-8 max-w-7xl mx-auto">
                <section>
                  <DashboardMetrics />
                </section>

                <section>
                  {/* Gráficos y análisis detallados sin duplicar métricas */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Distribución de Pacientes</h3>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Gráfico de distribución por estado</p>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow">
                      <h3 className="text-lg font-semibold mb-4">Tendencias Temporales</h3>
                      <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Gráfico de evolución temporal</p>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </ClinicDataProvider>
  );
}
