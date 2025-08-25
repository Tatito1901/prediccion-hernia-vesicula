import React, { useMemo, type ComponentProps, type ElementType } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { 
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

interface NavMainProps extends ComponentProps<typeof SidebarGroup> {
  items: {
    title: string
    url: string
    icon: ElementType
  }[]
  pathname?: string
  onNavigate?: () => void
  collapsed?: boolean
  isLoading?: boolean
}

export function NavMain({ 
  items, 
  pathname, 
  onNavigate, 
  collapsed = false,
  isLoading = false,
  ...props 
}: NavMainProps) {
  const memoizedItems = useMemo(() => {
    return items.map((item) => {
      const isActive = pathname === item.url || pathname?.startsWith(`${item.url}/`)
      const Icon = item.icon
      
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton 
            asChild 
            isActive={isActive}
            className="group"
          >
            <Link 
              href={item.url} 
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className="flex items-center gap-3 w-full"
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
                "bg-secondary group-hover:bg-primary/10 transition-colors",
                isActive && "bg-primary/10 text-primary"
              )}>
                <Icon className={cn(
                  "h-4 w-4 transition-transform",
                  !collapsed && "group-hover:scale-110"
                )} />
              </div>
              
              {!collapsed && (
                <span className="font-medium text-sm truncate transition-opacity">
                  {item.title}
                </span>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      )
    })
  }, [items, pathname, onNavigate, collapsed])

  const loadingItems = useMemo(() => (
    Array(4).fill(0).map((_, i) => (
      <SidebarMenuItem key={i}>
        <SidebarMenuButton className="flex items-center gap-3 w-full">
          <Skeleton className="w-8 h-8 rounded-lg" />
          {!collapsed && (
            <Skeleton className="h-4 flex-1 rounded-md" />
          )}
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))
  ), [collapsed])

  return (
    <SidebarGroup {...props}>
      {!collapsed && (
        <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground tracking-wider">
          Navegación
        </SidebarGroupLabel>
      )}
      
      <SidebarGroupContent className="mt-1">
        <SidebarMenu>
          {isLoading ? loadingItems : memoizedItems}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}