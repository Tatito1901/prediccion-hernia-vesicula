
import type React from "react"

import { AppSidebar } from "@/components/navigation/app-sidebar"
import { SiteHeader } from "@/components/navigation/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr]">
        <AppSidebar className="hidden border-r md:block" />
        <div className="flex flex-col">
          <SiteHeader />
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-3 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 max-w-7xl">
              <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
