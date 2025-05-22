"use client"

import type React from "react"
import { useBreakpoint, useMediaQuery } from "@/hooks/use-breakpoint"
import { cn } from "@/lib/utils"

import { AppSidebar } from "@/components/navigation/app-sidebar"
import { SiteHeader } from "@/components/navigation/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isMobile, isTablet } = useBreakpoint()
  const isToggleableLayout = useMediaQuery("(max-width: 1279px)");
  
  return (
    <SidebarProvider sidebarBehavior={isToggleableLayout ? "offcanvas" : "permanent"}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-2 sm:py-3 md:gap-6 md:py-4 lg:py-6">
              <div className="px-2 sm:px-3 md:px-4 lg:px-6">
                <div className={cn(
                  "bg-card rounded-lg shadow-sm border",
                  "p-2 sm:p-3 md:p-4 lg:p-6", // Padding escalonado según dispositivo
                  "transition-all duration-300", // Transición suave entre tamaños
                  (isMobile || isTablet) && "overflow-auto"
                )}>
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
