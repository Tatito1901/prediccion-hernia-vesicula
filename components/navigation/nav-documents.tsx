import { FolderIcon, MoreHorizontalIcon, ShareIcon, type LucideIcon } from "lucide-react"
import { useState, useMemo } from "react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavDocuments({
  items,
}: {
  items: {
    name: string
    url: string
    icon: LucideIcon
  }[]
}) {
  const { isMobile } = useSidebar()
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  // Optimización con useMemo
  const itemsWithHover = useMemo(() => 
    items.map(item => ({
      ...item,
      isHovered: hoveredItem === item.name
    }))
  , [items, hoveredItem])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className={cn(
        "text-xs font-semibold tracking-wider uppercase",
        "text-slate-500 dark:text-slate-400",
        "mb-3 px-2 transition-colors duration-300",
        "hover:text-purple-600 dark:hover:text-purple-400"
      )}>
        Documentos Médicos
      </SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {itemsWithHover.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton 
              asChild
              className={cn(
                "group relative transition-all duration-300 ease-out",
                "hover:scale-[1.02] active:scale-[0.98]",
                "rounded-xl px-3 py-2.5 h-auto",
                "hover:bg-gradient-to-r hover:from-purple-50/80 hover:to-pink-50/60",
                "dark:hover:from-purple-950/30 dark:hover:to-pink-950/20",
                "hover:shadow-md hover:shadow-purple-200/50",
                "dark:hover:shadow-purple-800/30"
              )}
            >
              <a 
                href={item.url}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                className="flex items-center gap-3 w-full"
              >
                <div className={cn(
                  "flex-shrink-0 w-5 h-5 transition-all duration-300",
                  "text-slate-600 dark:text-slate-400",
                  item.isHovered && "text-purple-600 dark:text-purple-400 scale-110"
                )}>
                  <item.icon className="w-full h-full" />
                </div>
                <span className={cn(
                  "font-medium text-sm transition-all duration-300",
                  "text-slate-700 dark:text-slate-300",
                  item.isHovered && "text-purple-700 dark:text-purple-300"
                )}>
                  {item.name}
                </span>
              </a>
            </SidebarMenuButton>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction 
                  showOnHover 
                  className={cn(
                    "rounded-lg transition-all duration-300",
                    "data-[state=open]:bg-purple-100 dark:data-[state=open]:bg-purple-900/30",
                    "hover:bg-purple-50 dark:hover:bg-purple-900/20",
                    "hover:scale-110 active:scale-95"
                  )}
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                  <span className="sr-only">Más opciones</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className={cn(
                  "w-48 rounded-xl border-0 shadow-xl",
                  "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md",
                  "border border-slate-200/50 dark:border-slate-700/50",
                  "animate-in slide-in-from-right-2 duration-300"
                )}
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
                sideOffset={8}
              >
                <div className="p-2">
                  <DropdownMenuItem className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "transition-all duration-300 cursor-pointer",
                    "hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50",
                    "dark:hover:from-purple-950/30 dark:hover:to-blue-950/30"
                  )}>
                    <FolderIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-medium">Abrir</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg",
                    "transition-all duration-300 cursor-pointer",
                    "hover:bg-gradient-to-r hover:from-blue-50 hover:to-emerald-50",
                    "dark:hover:from-blue-950/30 dark:hover:to-emerald-950/30"
                  )}>
                    <ShareIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium">Compartir</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        
        <SidebarMenuItem>
          <SidebarMenuButton className={cn(
            "text-slate-500 dark:text-slate-400 transition-all duration-300",
            "hover:text-slate-700 dark:hover:text-slate-300",
            "hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100",
            "dark:hover:from-slate-800/50 dark:hover:to-slate-700/30",
            "rounded-xl px-3 py-2.5 h-auto"
          )}>
            <MoreHorizontalIcon className="text-slate-400 dark:text-slate-500 transition-colors duration-300" />
            <span>Ver más documentos</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}