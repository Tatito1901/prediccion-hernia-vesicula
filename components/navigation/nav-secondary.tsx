import type * as React from "react"
import Link from "next/link"
import { useCallback, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

interface NavSecondaryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: {
    title: string
    url: string
    icon: React.ElementType
  }[]
  pathname?: string
  onNavigate?: () => void
}

export function NavSecondary({ items, pathname, className, onNavigate, ...props }: NavSecondaryProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const closeSidebarOnMobile = useCallback(() => {
    onNavigate?.()
  }, [onNavigate])

  if (items.length === 0) return null

  return (
    <SidebarGroup className={className} {...props}>
      <SidebarGroupLabel className={cn(
        "text-xs font-semibold tracking-wider uppercase",
        "text-slate-500 dark:text-slate-400",
        "mb-3 px-2 transition-colors duration-300",
        "hover:text-blue-600 dark:hover:text-blue-400"
      )}>
        Soporte y Herramientas
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="space-y-1">
          {items.map((item) => {
            const isActive = pathname === item.url || pathname?.startsWith(`${item.url}/`)
            const isHovered = hoveredItem === item.title
            
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  className={cn(
                    "relative group transition-all duration-300 ease-out",
                    "hover:scale-[1.02] active:scale-[0.98]",
                    "rounded-xl px-3 py-2.5 h-auto",
                    isActive && [
                      "bg-gradient-to-r from-blue-500/10 to-purple-500/10",
                      "dark:from-blue-400/20 dark:to-purple-400/20",
                      "border border-blue-200/30 dark:border-blue-700/30",
                      "shadow-md shadow-blue-500/10"
                    ],
                    !isActive && [
                      "hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-slate-100/60",
                      "dark:hover:from-slate-800/50 dark:hover:to-slate-700/30",
                      "hover:shadow-md hover:shadow-slate-200/50",
                      "dark:hover:shadow-slate-800/50"
                    ]
                  )}
                >
                  <Link 
                    href={item.url} 
                    onClick={closeSidebarOnMobile}
                    onMouseEnter={() => setHoveredItem(item.title)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex items-center gap-3 w-full"
                  >
                    <div className={cn(
                      "flex-shrink-0 w-5 h-5 transition-all duration-300",
                      isActive && "text-blue-600 dark:text-blue-400 scale-110",
                      !isActive && "text-slate-600 dark:text-slate-400",
                      !isActive && isHovered && "text-blue-600 dark:text-blue-400 scale-110"
                    )}>
                      <item.icon className="w-full h-full" />
                    </div>
                    
                    <span className={cn(
                      "font-medium text-sm transition-all duration-300",
                      isActive && "text-blue-700 dark:text-blue-300 font-semibold",
                      !isActive && "text-slate-700 dark:text-slate-300",
                      !isActive && isHovered && "text-blue-700 dark:text-blue-300"
                    )}>
                      {item.title}
                    </span>
                    
                    {isActive && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
                      </div>
                    )}
                  </Link>
                  
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-blue-500 to-purple-500" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
