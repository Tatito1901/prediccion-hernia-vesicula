"use client"

import type * as React from "react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

interface NavSecondaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string
    url: string
    icon: React.ElementType
  }[]
  pathname?: string
  onMobileNavItemClick?: () => void
}

export function NavSecondary({ items, pathname, className, onMobileNavItemClick, ...props }: NavSecondaryProps) {
  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupLabel>Soporte</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url || pathname?.startsWith(`${item.url}/`)
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive}>
                  <Link href={item.url} onClick={onMobileNavItemClick}>
                    <item.icon className="h-4 w-4" />
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
