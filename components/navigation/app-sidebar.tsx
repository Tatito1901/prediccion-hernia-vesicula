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
  Activity,
  Stethoscope,
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
  tagline: "Centro de Excelencia Médica"
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
/* Componente del Header Elegante                                              */
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
    <div className="space-y-6">
      {/* Logo y nombre principal */}
      <Link 
        href="/dashboard" 
        onClick={onNavigate} 
        className={cn(
          "flex items-center gap-4 px-2 py-2 group",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-primary/20 focus-visible:ring-offset-2",
          "transition-colors duration-200"
        )}
        title={CLINIC_INFO.fullName}
        aria-label={`Ir al dashboard de ${CLINIC_INFO.fullName}`}
      >
        {/* Icono principal elegante */}
        <div className={cn(
          "flex-shrink-0 w-11 h-11 rounded-2xl",
          "bg-gradient-to-br from-primary/90 to-primary",
          "flex items-center justify-center",
          "shadow-sm border border-primary/10",
          "relative"
        )}>
          <HeartPulseIcon className="h-5 w-5 text-white" />
        </div>

        {/* Texto elegante y minimalista */}
        <div className={cn(
          "flex flex-col min-w-0 transition-all duration-300",
          isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
        )}>
          <div className="flex flex-col space-y-0.5">
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50 leading-none">
              {isMobile ? "Clínica de Hernia" : CLINIC_INFO.fullName}
            </span>
            {isMobile && (
              <span className="text-[13px] font-medium text-primary/80 leading-none">
                y Vesícula
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1">
              {isMobile ? "Centro Especializado" : CLINIC_INFO.tagline}
            </span>
          </div>
        </div>
      </Link>

      {/* Separador minimalista */}
      {(!isCollapsed || isMobile) && (
        <div className="mx-2">
          <div className="h-[1px] bg-slate-200/60 dark:bg-slate-700/60" />
        </div>
      )}
    </div>
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
      {/* Overlay elegante para mobile */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Botón hamburguesa elegante */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "md:hidden fixed top-6 left-6 z-50",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
          "border-slate-200/60 dark:border-slate-700/60",
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-primary/20",
          isMobileOpen && "bg-white dark:bg-slate-900"
        )}
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isMobileOpen}
        aria-controls="sidebar"
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
        id="sidebar"
        role="navigation"
        aria-label="Navegación principal"
        className={cn(
          "transition-all duration-300 ease-out z-50",
          "border-r border-slate-200/50 dark:border-slate-700/50",
          "bg-white/98 dark:bg-slate-900/98 backdrop-blur-sm",
          isMobile
            ? cn(
                "fixed left-0 top-0 h-full shadow-xl",
                isMobileOpen 
                  ? "translate-x-0" 
                  : "-translate-x-full"
              )
            : cn(
                "relative shadow-sm",
                isCollapsed ? "w-20" : "w-72"
              )
        )}
        {...sidebarProps}
      >
        {/* Header elegante */}
        <SidebarHeader className={cn(
          "px-6 py-8 border-b border-slate-200/30 dark:border-slate-700/30",
          isCollapsed && !isMobile && "px-4 py-6"
        )}>
          <ClinicHeader 
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            onNavigate={handleNavigate}
          />
        </SidebarHeader>

        {/* Contenido elegante */}
        <SidebarContent className="px-4 py-6 flex-1 overflow-y-auto scrollbar-thin">
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

        {/* Footer elegante */}
        <SidebarFooter className={cn(
          "px-4 py-6 border-t border-slate-200/30 dark:border-slate-700/30",
          "space-y-4"
        )}>
          {/* Control de tema elegante */}
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl",
            "bg-slate-50/50 dark:bg-slate-800/30",
            "border border-slate-200/40 dark:border-slate-700/40",
            isCollapsed && !isMobile ? "justify-center p-2" : "justify-between"
          )}>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Apariencia
                </span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-lg",
                "hover:bg-slate-200/50 dark:hover:bg-slate-700/50",
                "focus-visible:ring-2 focus-visible:ring-primary/20"
              )}
              onClick={toggleTheme}
              aria-label="Cambiar tema"
            >
              {mounted && (
                <div className="relative w-4 h-4">
                  <Sun className={cn(
                    "h-4 w-4 absolute transition-all duration-200 text-amber-500",
                    theme === "dark" 
                      ? "rotate-0 scale-100 opacity-100" 
                      : "rotate-90 scale-0 opacity-0"
                  )} />
                  <Moon className={cn(
                    "h-4 w-4 absolute transition-all duration-200 text-slate-600",
                    theme === "dark" 
                      ? "rotate-90 scale-0 opacity-0" 
                      : "rotate-0 scale-100 opacity-100"
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

          {/* Botón colapsar elegante (solo desktop) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full transition-all duration-200",
                "text-slate-600 dark:text-slate-400",
                "hover:text-slate-900 dark:hover:text-slate-100",
                "hover:bg-slate-100/50 dark:hover:bg-slate-800/50",
                "focus-visible:ring-2 focus-visible:ring-primary/20",
                isCollapsed 
                  ? "justify-center px-2" 
                  : "justify-start px-3"
              )}
              onClick={toggleCollapsedDesktop}
              aria-label={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
              aria-expanded={!isCollapsed}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-200",
                isCollapsed && "rotate-180"
              )} />
              {!isCollapsed && (
                <span className="ml-2 text-sm">
                  Contraer
                </span>
              )}
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  )
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Estilos CSS personalizados (agregar a tu archivo CSS global)                 */
/* ──────────────────────────────────────────────────────────────────────────── */

/* 
  Agregar estos colores a tu tailwind.config.js:

  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      }
    }
  }

  Y agregar esta utilidad para scrollbar:

  @layer utilities {
    .scrollbar-thin {
      scrollbar-width: thin;
    }
    .scrollbar-thumb-slate-300 {
      scrollbar-color: rgb(203 213 225) transparent;
    }
    .dark .scrollbar-thumb-slate-600 {
      scrollbar-color: rgb(71 85 105) transparent;
    }
  }
*/