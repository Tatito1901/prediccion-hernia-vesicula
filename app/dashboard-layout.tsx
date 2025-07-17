"use client"
import type React from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
// Importamos el nuevo proveedor
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";
import { useIsMobile, useIsTablet, useMediaQuery } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isToggleableLayout = useMediaQuery("(max-width: 1279px)");

  return (
    // Envolvemos todo con nuestro nuevo proveedor de datos
    <ClinicDataProvider>
      <SidebarProvider sidebarBehavior={isToggleableLayout ? "offcanvas" : "permanent"}>
        <AppSidebar />
        <SidebarInset>
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="@container/main flex-1 p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  );
}
