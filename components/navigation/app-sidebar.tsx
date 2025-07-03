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

import { useIsMobile } from "@/hooks/use-breakpoint"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

/* ──────────────────────────────────────────────────────────────────────────── */
/* Datos estáticos                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */
const USER = {
  name: "Dr. Luis Ángel Medina",
  email: "medina@clinica.com",
  avatar: "",
} as const

const CLINIC_INFO = {
  fullName: "Clínica de Hernia y Vesícula",
  shortName: "CHV",
  abbreviation: "C.H.V",
} as const

const NAV_MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Pacientes", url: "/pacientes", icon: UsersIcon },
  { title: "Encuesta Digital", url: "/encuesta", icon: TabletIcon },
  { title: "Admisión", url: "/admision", icon: UserPlusIcon },
  { title: "Estadísticas", url: "/estadisticas", icon: FileBarChart },
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
/* Componente del Header Adaptativo                                           */
/* ──────────────────────────────────────────────────────────────────────────── */
const ClinicHeader = ({ 
  isCollapsed, 
  isMobile, 
  onNavigate 
}: { 
  isCollapsed: boolean
  isMobile: boolean
  onNavigate: () => void 
}) => {
  return (
    <Link 
      href="/dashboard" 
      onClick={onNavigate} 
      className={cn(
        "flex items-center gap-3 px-2 py-3 rounded-lg transition-all duration-200",
        "hover:bg-accent/50 group relative overflow-hidden"
      )}
      title={CLINIC_INFO.fullName}
    >
      {/* Icono principal */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600",
        "flex items-center justify-center shadow-sm transition-transform duration-200",
        "group-hover:scale-105"
      )}>
        <HeartPulseIcon className="h-4 w-4 text-white" />
      </div>

      {/* Texto adaptativo */}
      <div className={cn(
        "flex flex-col transition-all duration-200 min-w-0",
        isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
      )}>
        {isMobile ? (
          // En móvil: Nombre completo en dos líneas si es necesario
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground">
              Clínica de Hernia
            </span>
            <span className="text-xs font-medium text-muted-foreground leading-tight">
              y Vesícula
            </span>
          </div>
        ) : (
          // En desktop expandido: Nombre completo
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground truncate">
              {CLINIC_INFO.fullName}
            </span>
            <span className="text-xs text-muted-foreground leading-tight">
              Centro Especializado
            </span>
          </div>
        )}
      </div>

      {/* Indicador de hover */}
      <div className={cn(
        "absolute right-2 opacity-0 transition-opacity duration-200",
        "group-hover:opacity-50",
        isCollapsed && !isMobile && "hidden"
      )}>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
    </Link>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Componente Principal                                                        */
/* ──────────────────────────────────────────────────────────────────────────── */
export function AppSidebar({
  collapsed: collapsedProp,
  onCollapsedChange,
  onToggle,
  ...sidebarProps
}: PropsWithChildren<AppSidebarProps>) {
  const pathname = usePathname()
  const isMobile = useIsMobile()

  /* --- Estado interno ----------------------------------------------------- */
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsedProp ?? false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Montaje del tema
  useEffect(() => {
    setMounted(true)
  }, [])

  /* Sincronización con prop controlada */
  useEffect(() => {
    if (collapsedProp !== undefined && collapsedProp !== isCollapsed) {
      setIsCollapsed(collapsedProp)
    }
  }, [collapsedProp, isCollapsed])

  /* Navegación en mobile */
  const handleNavigate = useCallback(() => {
    if (isMobile && isMobileOpen) {
      setIsMobileOpen(false)
      onToggle?.()
    }
  }, [isMobile, isMobileOpen, onToggle])

  /* Toggles */
  const toggleMobile = useCallback(() => {
    setIsMobileOpen(prev => {
      const newState = !prev
      onToggle?.()
      return newState
    })
  }, [onToggle])

  const toggleCollapsedDesktop = useCallback(() => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    onCollapsedChange?.(nextState)
  }, [isCollapsed, onCollapsedChange])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  /* Click fuera en mobile */
  const sidebarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!isMobile) return

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
  }, [isMobileOpen, isMobile])

  /* Cerrar con Escape en mobile */
  useEffect(() => {
    if (!isMobile || !isMobileOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isMobile, isMobileOpen])

  /* ──────────────────────────────────────────────────────────────────────── */
  /* Render                                                                   */
  /* ──────────────────────────────────────────────────────────────────────── */
  return (
    <>
      {/* Overlay para mobile */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botón hamburguesa (solo mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm",
          "border shadow-sm hover:bg-accent transition-all duration-200",
          isMobileOpen && "bg-background"
        )}
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isMobileOpen}
      >
        <div className="relative w-5 h-5">
          <MenuIcon 
            className={cn(
              "h-5 w-5 absolute transition-all duration-200",
              isMobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
            )} 
          />
          <XIcon 
            className={cn(
              "h-5 w-5 absolute transition-all duration-200",
              isMobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
            )} 
          />
        </div>
      </Button>

      <Sidebar
        ref={sidebarRef}
        collapsible={isMobile ? "offcanvas" : "icon"}
        className={cn(
          "transition-all duration-300 ease-in-out will-change-transform z-50",
          "border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          isMobile
            ? cn(
                "fixed left-0 top-0 h-full",
                isMobileOpen ? "translate-x-0" : "-translate-x-full"
              )
            : cn(
                "relative",
                isCollapsed ? "w-16" : "w-64"
              )
        )}
        {...sidebarProps}
      >
        {/* Header */}
        <SidebarHeader className={cn(
          "px-3 py-4 border-b bg-background/50",
          isCollapsed && !isMobile && "px-2"
        )}>
          <ClinicHeader 
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            onNavigate={handleNavigate}
          />
        </SidebarHeader>

        {/* Contenido */}
        <SidebarContent className="px-2 py-2 flex-1 overflow-y-auto">
          <NavMain
            items={[...NAV_MAIN]}
            pathname={pathname}
            onNavigate={handleNavigate}
          />
          
          {NAV_SECONDARY.length > 0 && (
            <div className="mt-8">
              <NavSecondary
                items={[...NAV_SECONDARY]}
                pathname={pathname}
                onNavigate={handleNavigate}
              />
            </div>
          )}
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className={cn(
          "px-2 py-3 border-t bg-background/50",
          "space-y-2"
        )}>
          {/* Control de tema */}
          <div className={cn(
            "flex items-center",
            isCollapsed && !isMobile ? "justify-center" : "justify-between px-2"
          )}>
            {!isCollapsed || isMobile ? (
              <span className="text-sm font-medium text-muted-foreground">
                Tema
              </span>
            ) : null}
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={toggleTheme}
              aria-label="Cambiar tema"
            >
              {mounted && (
                <div className="relative w-4 h-4">
                  <Sun className={cn(
                    "h-4 w-4 absolute transition-all duration-200",
                    theme === "dark" ? "rotate-0 scale-100" : "rotate-90 scale-0"
                  )} />
                  <Moon className={cn(
                    "h-4 w-4 absolute transition-all duration-200",
                    theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
                  )} />
                </div>
              )}
            </Button>
          </div>

          {/* Usuario */}
          <NavUser
            user={USER}
            collapsed={isCollapsed && !isMobile}
          />

          {/* Botón colapsar (solo desktop) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full transition-all duration-200",
                isCollapsed 
                  ? "justify-center px-2" 
                  : "justify-start px-2"
              )}
              onClick={toggleCollapsedDesktop}
              aria-label={isCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-200",
                isCollapsed && "rotate-180"
              )} />
              {!isCollapsed && (
                <span className="ml-2 text-sm">Colapsar</span>
              )}
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  )
}