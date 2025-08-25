import type React from "react"
import DashboardLayout from "@/app/dashboard-layout"

export default function PacientesLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
