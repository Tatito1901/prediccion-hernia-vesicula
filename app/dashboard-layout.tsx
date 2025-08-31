"use client"
import type React from "react";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ClinicDataProvider } from "@/contexts/clinic-data-provider";
import { useIsMobile } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const isMobile = useIsMobile();

  return (
    <ClinicDataProvider>
      <SidebarProvider 
        className={cn(
          "min-h-screen bg-background",
          isMobile && "flex-col"
        )}
      >
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <main className="flex-1 flex flex-col overflow-y-auto">
            <div className="flex-1 @container/main">
              <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  );
}