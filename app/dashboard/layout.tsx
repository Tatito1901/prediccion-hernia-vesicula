import type React from "react"
import DashboardLayout from "@/app/dashboard-layout"

import { createClient } from "@/utils/supabase/server"

export default async function DashboardSectionLayout({ children }: { children: React.ReactNode }) {
  let userName: string | undefined = undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single()
      const fullName = (profileData as { full_name?: string | null } | null)?.full_name ?? null
      if (fullName && typeof fullName === "string" && fullName.trim().length > 0) {
        userName = fullName.split(" ")[0]
      } else {
        userName = user.email || undefined
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("[dashboard/layout] Supabase SSR user fetch failed:", err)
    }
  }

  return <DashboardLayout userName={userName}>{children}</DashboardLayout>
}
