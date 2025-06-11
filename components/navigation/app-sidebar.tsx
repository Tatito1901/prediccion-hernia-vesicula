"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import {
  CalendarIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  Settings2Icon,
  UsersIcon,
  PhoneIcon,
  HeartPulseIcon,
  TabletIcon,
  UserPlusIcon,
  MenuIcon,
  XIcon,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  FileBarChart,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

const data = {
  user: {
    name: "Dr. Luis Ángel Medina",
    email: "medina@clinica.com",
  },
  navMain: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
    { title: "Pacientes", url: "/pacientes", icon: UsersIcon },
    { title: "CRM Seguimiento", url: "/crm", icon: PhoneIcon },
    { title: "Encuesta Digital", url: "/encuesta", icon: TabletIcon },
    { title: "Cirugías", url: "/cirugias", icon: CalendarIcon },
    { title: "Admisión", url: "/admision", icon: UserPlusIcon },
    { title: "Estadísticas", url: "/estadisticas", icon: FileBarChart },
  ],
  navSecondary: [
    { title: "Configuración", url: "#", icon: Settings2Icon },
    { title: "Ayuda", url: "#", icon: FileTextIcon },
  ],
}

export function AppSidebar({ onToggle, collapsed = false, onCollapsedChange, ...props }: any) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => setIsCollapsed(collapsed), [collapsed])

  const handleCollapsedChange = useCallback(
    (value: boolean) => {
      setIsCollapsed(value)
      onCollapsedChange?.(value)
    },
    [onCollapsedChange],
  )

  useEffect(() => {
    const handleCloseSidebar = () => setIsMobileOpen(false)
    const sidebarEl = sidebarRef.current
    sidebarEl?.addEventListener("closeSidebar", handleCloseSidebar)

    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      sidebarEl?.removeEventListener("closeSidebar", handleCloseSidebar)
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMobileOpen])

  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) setIsMobileOpen(false)
  }, [isMobile])

  const toggleSidebar = useCallback(() => {
    setIsMobileOpen(!isMobileOpen)
    onToggle?.()
  }, [isMobileOpen, onToggle])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={toggleSidebar}
        aria-label={isMobileOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isMobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </Button>

      <Sidebar
        ref={sidebarRef}
        collapsible={isMobile ? "offcanvas" : "icon"}
        className={cn(
          "transition-all duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        {...props}
      >
        <SidebarHeader className="px-3 py-2">
          <Link href="/dashboard" onClick={closeSidebarOnMobile} className="flex items-center gap-2">
            <HeartPulseIcon className="h-5 w-5 text-red-500" />
            <span className="text-base font-semibold">Clínica de Hernia y Vesícula</span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {/* Botón "Nuevo Paciente" eliminado */}
          <NavMain items={data.navMain} pathname={pathname} />
          <NavSecondary items={data.navSecondary} className="mt-auto" pathname={pathname} />
        </SidebarContent>

        <SidebarFooter className="px-2 py-2">
          <div className="flex flex-col space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm text-muted-foreground">Tema</span>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                  {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
                </Button>
              </div>
            )}
            {isCollapsed && !isMobile && (
              <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 mx-auto">
                {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
              </Button>
            )}
            <NavUser user={{...data.user, avatar: "/placeholder.svg"}} collapsed={isCollapsed && !isMobile} />
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleCollapsedChange(!isCollapsed)}
              >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    <span>Colapsar</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  )
}
