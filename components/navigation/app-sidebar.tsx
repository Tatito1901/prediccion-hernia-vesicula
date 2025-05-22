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
  BrainIcon,
  TabletIcon,
  UserPlusIcon,
  MenuIcon,
  XIcon,
  ChevronRight,
  ChevronLeft,
  Sun,
  Moon,
  HospitalIcon,
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
    // { title: "Análisis IA", url: "/analisis-ia", icon: BrainIcon }, // Eliminado
    { title: "Cirugías", url: "/cirugias", icon: CalendarIcon },
    { title: "Admisión", url: "/admision", icon: UserPlusIcon },
  ],
  navSecondary: [
    { title: "Configuración", url: "#", icon: Settings2Icon },
    { title: "Ayuda", url: "/ayuda", icon: FileTextIcon },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onToggle?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function AppSidebar({
  onToggle,
  collapsed = false,
  onCollapsedChange,
  ...props
}: AppSidebarProps) {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setIsCollapsed(collapsed)
  }, [collapsed])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleCollapsedChange = useCallback(
    (value: boolean) => {
      setIsCollapsed(value)
      onCollapsedChange?.(value)
    },
    [onCollapsedChange],
  )

  useEffect(() => {
    const handleCloseSidebar = () => setIsMobileOpen(false)
    const el = sidebarRef.current
    el?.addEventListener("closeSidebar", handleCloseSidebar)

    const handleClickOutside = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node) && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)

    return () => {
      el?.removeEventListener("closeSidebar", handleCloseSidebar)
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
      {/* Botón móvil para abrir/cerrar sidebar */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={toggleSidebar}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
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
        data-sidebar-container
        {...props}
      >
        <SidebarHeader className="px-3 py-2">
          <Link
            href="/dashboard"
            onClick={closeSidebarOnMobile}
            className="flex items-center gap-2"
          >
            <HospitalIcon className="h-5 w-5 text-red-500" />
            {/* Nombre de clínica mejorado */}
            <span className="text-center">
              Clinica Hernia y Vesicula
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-2">
          {/* Botón de Nuevo Paciente eliminado */}

          <NavMain items={data.navMain} pathname={pathname} />
          <NavSecondary
            items={data.navSecondary}
            className="mt-auto"
            pathname={pathname}
          />
        </SidebarContent>

        <SidebarFooter className="px-2 py-2">
          <div className="flex flex-col space-y-2">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm text-muted-foreground">Tema</span>
                {mounted && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-8 w-8"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            )}
            {isCollapsed && !isMobile && mounted && (
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
            {/* NavUser sin avatar */}
            <NavUser user={data.user} />
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