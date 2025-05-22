"use client"

import { Separator } from "@/components/ui/separator"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Menu } from "lucide-react"

interface SiteHeaderProps {
  title?: string
}

export function SiteHeader({ title = "Dashboard de Predicción Quirúrgica" }: SiteHeaderProps) {
  const { toggleSidebar, isMobile, openMobile, setOpenMobile } = useSidebar()

  const handleMobileMenuToggle = () => {
    if (isMobile) {
      setOpenMobile(!openMobile)
    }
    // Optionally, if toggleSidebar from context is smart enough to handle both mobile and desktop:
    // toggleSidebar(); 
  }

  return (
    <header className="flex h-14 shrink-0 items-center border-b bg-background px-4 md:px-6 sticky top-0 z-30">
      <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={handleMobileMenuToggle}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
      <SidebarTrigger className="-ml-1 hidden md:flex" /> 
      <Separator orientation="vertical" className="mx-2 hidden h-6 md:flex" />
      <div className="flex w-full items-center gap-1 lg:gap-2">
        <h1 className="text-base font-medium text-foreground whitespace-nowrap overflow-hidden text-ellipsis">{title}</h1>
      </div>
    </header>
  )
}
