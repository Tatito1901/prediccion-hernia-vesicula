"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  CalendarIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PlusCircleIcon,
  Settings2Icon,
  UsersIcon,
  PhoneIcon,
  HeartPulseIcon,
  BrainIcon,
  TabletIcon,
  UserPlusIcon,
  MenuIcon,
  XIcon,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
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
    avatar: "/caring-doctor.png",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Pacientes",
      url: "/pacientes",
      icon: UsersIcon,
    },
    {
      title: "CRM Seguimiento",
      url: "/crm",
      icon: PhoneIcon,
    },
    {
      title: "Encuesta Digital",
      url: "/encuesta",
      icon: TabletIcon,
    },
    {
      title: "Análisis IA",
      url: "/analisis-ia",
      icon: BrainIcon,
    },
    {
      title: "Cirugías",
      url: "/cirugias",
      icon: CalendarIcon,
    },
    {
      title: "Admisión",
      url: "/admision",
      icon: UserPlusIcon,
    },
  ],
  navSecondary: [
    {
      title: "Configuración",
      url: "#",
      icon: Settings2Icon,
    },
    {
      title: "Ayuda",
      url: "#",
      icon: FileTextIcon,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onToggle?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function AppSidebar({ onToggle, collapsed = false, onCollapsedChange, ...props }: AppSidebarProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { theme, setTheme } = useTheme()

  // Sincronizar estado de colapso con props
  useEffect(() => {
    setIsCollapsed(collapsed)
  }, [collapsed])

  // Notificar cambios en el estado de colapso
  const handleCollapsedChange = useCallback(
    (value: boolean) => {
      setIsCollapsed(value)
      if (onCollapsedChange) {
        onCollapsedChange(value)
      }
    },
    [onCollapsedChange],
  )

  // Add event listener for the custom closeSidebar event
  useEffect(() => {
    const handleCloseSidebar = () => {
      setIsMobileOpen(false)
    }

    const sidebarElement = sidebarRef.current
    if (sidebarElement) {
      sidebarElement.addEventListener("closeSidebar", handleCloseSidebar)
    }

    // Close sidebar when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      if (sidebarElement) {
        sidebarElement.removeEventListener("closeSidebar", handleCloseSidebar)
      }
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isMobileOpen])

  // Function to close sidebar on mobile
  const closeSidebarOnMobile = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }, [isMobile])

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsMobileOpen(!isMobileOpen)
    if (onToggle) {
      onToggle()
    }
  }, [isMobileOpen, onToggle])

  // Toggle theme
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  return (
    <>
      {/* Mobile toggle button */}
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
        collapsible={isMobile ? "offcanvas" : "expandable"}
        collapsed={isCollapsed && !isMobile ? true : undefined}
        open={isMobileOpen}
        className={cn(
          "transition-all duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        data-sidebar-container
        {...props}
      >
        <SidebarHeader className="px-3 py-2">
          <Link href="/dashboard" onClick={closeSidebarOnMobile} className="flex items-center gap-2">
            <HeartPulseIcon className="h-5 w-5 text-red-500" />
            <span className="text-base font-semibold">Clínica de Hernia y Vesícula</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="px-2">
          <div className="mb-2">
            <Link
              href="/admision"
              onClick={closeSidebarOnMobile}
              className="flex items-center gap-2 w-full bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/90"
            >
              <PlusCircleIcon className="h-4 w-4" />
              <span>Nuevo Paciente</span>
            </Link>
          </div>
          <NavMain items={data.navMain} pathname={pathname} />
          <NavSecondary items={data.navSecondary} className="mt-auto" pathname={pathname} />
        </SidebarContent>
        <SidebarFooter className="px-2 py-2">
          <div className="flex flex-col space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm text-muted-foreground">Tema</span>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            )}
            {isCollapsed && !isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="h-8 w-8 mx-auto"
                aria-label="Cambiar tema"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <NavUser user={data.user} collapsed={isCollapsed && !isMobile ? true : undefined} />
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleCollapsedChange(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
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
