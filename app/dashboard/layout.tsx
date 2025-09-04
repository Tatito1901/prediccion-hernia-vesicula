import type React from "react"
import DashboardLayout from "@/app/dashboard-layout"

import { createClient } from "@/utils/supabase/server"

export default async function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userName: string | undefined = undefined
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()
    const fullName = (profileData as any)?.full_name as string | null
    if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
      userName = fullName.split(" ")[0]
    } else {
      userName = user.email || undefined
    }
  }

  return <DashboardLayout userName={userName}>{children}</DashboardLayout>
}
