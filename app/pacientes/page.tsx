import { AppSidebar } from "@/components/navigation/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { PatientManagement } from "@/components/patients/patient-management"
import { ClinicDataProvider } from "@/contexts/clinic-data-provider"

export default function PatientsPage() {
  return (
    <ClinicDataProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <PatientManagement />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ClinicDataProvider>
  )
}
