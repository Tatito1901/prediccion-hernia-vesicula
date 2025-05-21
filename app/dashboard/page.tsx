import { AppSidebar } from "../../components/navigation/app-sidebar";
import { PatientAnalytics } from "../../components/dashboard/patient-analytics";
import { SiteHeader } from "../../components/navigation/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DashboardMetrics } from "../../components/dashboard/dashboard-metrics";
import { DiagnosisChart } from "../../components/charts/diagnosis-chart";
import { PendingFollowUps } from "../../components/medical/pending-followups";
import { clinicMetrics, getPendingFollowUps, samplePatients } from "../pacientes/sample-data"

export default function Page() {
  const pendingFollowUps = getPendingFollowUps()

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <DashboardMetrics metrics={clinicMetrics} />
              <div className="px-4 lg:px-6">
                <PatientAnalytics />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2">
                <DiagnosisChart metrics={clinicMetrics} />
                <PendingFollowUps followUps={pendingFollowUps} patients={samplePatients} />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
