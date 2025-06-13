
import type * as React from "react"
import Link from "next/link"
import { useCallback } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavMainProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string
    url: string
    icon: React.ElementType
  }[]
  pathname?: string
  onNavigate?: () => void
}

export function NavMain({ items, pathname, className, onNavigate, ...props }: NavMainProps) {
  // Function to close sidebar on mobile after navigation
  const closeSidebarOnMobile = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // Find the closest sidebar element and access its onOpenChange
      const sidebarElement = document.querySelector("[data-sidebar-container]")
      if (sidebarElement) {
        // Dispatch a custom event that will be handled in the AppSidebar component
        const event = new CustomEvent("closeSidebar")
        sidebarElement.dispatchEvent(event)
      }
    }
  }, [])

  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupLabel>Navegación</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname?.startsWith(`${item.url}/`)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.url} onClick={closeSidebarOnMobile}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
