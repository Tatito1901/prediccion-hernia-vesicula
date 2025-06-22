"use client"

import type { ComponentPropsWithoutRef, PropsWithChildren } from "react"
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
import { useEffect, useRef, useState, useCallback } from "react"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useIsMobile } from "@/hooks/use-breakpoint"      // ⬅️ hook existente
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

/* ──────────────────────────────────────────────────────────────────────────── */
/* Datos estáticos fuera del componente                                        */
/* ──────────────────────────────────────────────────────────────────────────── */
const USER = {
  name:  "Dr. Luis Ángel Medina",
  email: "medina@clinica.com",
  avatar: "",
} as const

const NAV_MAIN = [
  { title: "Dashboard",       url: "/dashboard",   icon: LayoutDashboardIcon },
  { title: "Pacientes",       url: "/pacientes",   icon: UsersIcon },
  { title: "Encuesta Digital",url: "/encuesta",    icon: TabletIcon },
  { title: "Admisión",        url: "/admision",    icon: UserPlusIcon },
  { title: "Estadísticas",    url: "/estadisticas",icon: FileBarChart },
] as const

const NAV_SECONDARY = [] as const

/* ──────────────────────────────────────────────────────────────────────────── */
/* Tipos                                                                       */
/* ──────────────────────────────────────────────────────────────────────────── */
interface AppSidebarProps
  extends Omit<ComponentPropsWithoutRef<typeof Sidebar>, "collapsible"> {
  /** Control opcional del estado colapsado en desktop */
  collapsed?: boolean
  /** Notificación de cambio de colapso en desktop */
  onCollapsedChange?: (value: boolean) => void
  /** Notificación cada vez que se abre/cierra en mobile */
  onToggle?: () => void
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Componente                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */
export function AppSidebar({
  collapsed: collapsedProp,
  onCollapsedChange,
  onToggle,
  ...sidebarProps
}: PropsWithChildren<AppSidebarProps>) {
  const pathname  = usePathname()
  const isMobile  = useIsMobile()

  /* --- Estado interno ----------------------------------------------------- */
  const [isMobileOpen, setIsMobileOpen]     = useState(false)
  const [isCollapsed,  setIsCollapsed]      = useState(collapsedProp ?? false)
  const { theme, setTheme }                 = useTheme()
  const [mounted, setMounted]               = useState(false)
  
  // After mounting, we can render the theme-dependent UI
  useEffect(() => {
    setMounted(true)
  }, [])

  /* Mantener sincronía con prop controlada */
  useEffect(() => {
    if (collapsedProp !== undefined && collapsedProp !== isCollapsed) {
      setIsCollapsed(collapsedProp)
    }
  }, [collapsedProp, isCollapsed])

  /* Cerrar automáticamente al navegar en mobile */
  const handleNavigate = useCallback(() => {
    if (isMobile) setIsMobileOpen(false)
  }, [isMobile])

  const toggleMobile = () => {
    setIsMobileOpen((open) => !open)
    onToggle?.()
  }

  const toggleCollapsedDesktop = () => {
    const next = !isCollapsed
    setIsCollapsed(next)
    onCollapsedChange?.(next)
  }

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark")

  /* Cierre tocando fuera en mobile */
  const sidebarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMobileOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setIsMobileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMobileOpen])

  /* --- Render ------------------------------------------------------------- */
  return (
    <>
      {/* Botón hamburguesa (solo mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {isMobileOpen ? <XIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
      </Button>

      <Sidebar
        ref={sidebarRef}
        collapsible={isMobile ? "offcanvas" : "icon"}
        className={cn(
          "transition-transform duration-300 will-change-transform",
          isMobile
            ? isMobileOpen ? "translate-x-0" : "-translate-x-full"
            : "translate-x-0",
        )}
        {...sidebarProps}
      >
        {/* Header */}
        <SidebarHeader className="px-3 py-2">
          <Link href="/dashboard" onClick={handleNavigate} className="flex items-center gap-2">
            <HeartPulseIcon className="h-5 w-5 text-red-500" />
            <span className="text-base font-semibold">
              Clínica de Hernia y Vesícula
            </span>
          </Link>
        </SidebarHeader>

        {/* Contenido */}
        <SidebarContent className="px-2">
          <NavMain
            items={[...NAV_MAIN]}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
          <NavSecondary
            items={[...NAV_SECONDARY]}
            pathname={pathname}
            onNavigate={handleNavigate}
            className="mt-auto"
          />
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="px-2 py-2">
          <div className="flex flex-col space-y-2">
            {/* Tema */}
            {isCollapsed && !isMobile ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 mx-auto"
                onClick={toggleTheme}
              >
                {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
              </Button>
            ) : (
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="text-sm text-muted-foreground">Tema</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleTheme}
                >
                  {mounted && (theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />)}
                </Button>
              </div>
            )}

            {/* Usuario */}
            <NavUser
              user={USER}
              collapsed={isCollapsed && !isMobile}
            />

            {/* Colapsar (solo desktop) */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={toggleCollapsedDesktop}
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
