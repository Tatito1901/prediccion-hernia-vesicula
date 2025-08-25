"use client"
import type React from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";
import { useMediaQuery } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <ClinicDataProvider>
      <SidebarProvider 
        className={cn(
          "min-h-screen bg-background",
          isMobile && "flex-col"
        )}
      >
        <div className={cn(
          "border-r",
          isMobile && "fixed inset-y-0 z-50"
        )}>
          <AppSidebar />
        </div>
        <SidebarInset className="flex flex-col flex-1">
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 p-4 sm:p-6 lg:p-8 @container/main">
              {children}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  );
}