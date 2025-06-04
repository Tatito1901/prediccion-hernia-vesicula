import { AppSidebar } from "../../components/navigation/app-sidebar"
import { SiteHeader } from "../../components/navigation/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// import { AiAnalysisDashboard } from "../../components/dashboard/ai-analysis-dashboard"

export default function AnalisisIaPage() {
  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <SiteHeader title="Análisis de Inteligencia Artificial" />
        <div className="flex-1 flex flex-col px-3 py-4 sm:px-4 sm:py-6 overflow-auto min-h-0">
          <div className="@container/main flex flex-1 flex-col gap-2 min-h-0">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 min-h-0 flex-1">
              <div className="px-1 sm:px-4 lg:px-6 flex-1 min-h-0">
                {/* <AiAnalysisDashboard  /> */}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
