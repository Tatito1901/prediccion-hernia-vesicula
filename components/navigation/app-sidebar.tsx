"use client"

import { useMemo, useCallback, useState, useEffect, useRef, PropsWithChildren } from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import { 
  LayoutDashboardIcon,
  UsersIcon,
  TabletIcon,
  UserPlusIcon,
  FileBarChart,
  MenuIcon,
  XIcon,
  ChevronLeft,
  Sun,
  Moon,
  User
} from "lucide-react"

import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-breakpoint"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import NavUser from "./nav-user"

/* ──────────────────────────────────────────────────────────────────────────── */
/* Static Data                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */
const USER = {
  name: "Dr. Luis Ángel Medina"
} as const

const CLINIC_INFO = {
  fullName: "Clínica de Hernia y Vesícula",
  tagline: "Centro de Excelencia Médica"
} as const

const NAV_MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Pacientes", url: "/pacientes", icon: UsersIcon },
  { title: "Encuesta Digital", url: "/encuesta", icon: TabletIcon },
  { title: "Admisión", url: "/admision", icon: UserPlusIcon },
  { title: "Estadísticas", url: "/estadisticas", icon: FileBarChart },
] as const

/* ──────────────────────────────────────────────────────────────────────────── */
/* Component Types                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */
interface AppSidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (value: boolean) => void
  onToggle?: () => void
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Clinic Header Component (Memoized)                                          */
/* ──────────────────────────────────────────────────────────────────────────── */
const ClinicHeader = ({ 
  isCollapsed, 
  isMobile, 
  onNavigate 
}: { 
  isCollapsed: boolean
  isMobile: boolean
  onNavigate: () => void 
}) => (
  <div className="space-y-6">
    <Link 
      href="/dashboard" 
      onClick={onNavigate} 
      className={cn(
        "flex items-center gap-4 px-2 py-2 group",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        "transition-colors duration-200"
      )}
      title={CLINIC_INFO.fullName}
      aria-label={`Ir al dashboard de ${CLINIC_INFO.fullName}`}
    >
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-2xl",
        "bg-gradient-to-br from-primary/90 to-primary",
        "flex items-center justify-center shadow-sm",
      )}>
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-primary rounded-full" />
        </div>
      </div>

      <div className={cn(
        "flex flex-col min-w-0 transition-all duration-300",
        isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
      )}>
        <div className="flex flex-col space-y-0.5">
          <span className="text-[15px] font-semibold tracking-tight text-foreground leading-none">
            {isMobile ? "Clínica de Hernia" : CLINIC_INFO.fullName}
          </span>
          {isMobile && (
            <span className="text-[13px] font-medium text-primary/80 leading-none">
              y Vesícula
            </span>
          )}
          <span className="text-[11px] font-medium text-muted-foreground leading-none mt-1">
            {isMobile ? "Centro Especializado" : CLINIC_INFO.tagline}
          </span>
        </div>
      </div>
    </Link>

    {(!isCollapsed || isMobile) && (
      <div className="mx-2">
        <div className="h-px bg-border" />
      </div>
    )}
  </div>
)

/* ──────────────────────────────────────────────────────────────────────────── */
/* Main Component (Optimized)                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */
export function AppSidebar({
  collapsed: collapsedProp,
  onCollapsedChange,
  onToggle,
}: PropsWithChildren<AppSidebarProps>) {
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // State management
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(collapsedProp ?? false)

  // Theme initialization
  useEffect(() => setMounted(true), [])

  // Sync with prop changes
  useEffect(() => {
    if (collapsedProp !== undefined && collapsedProp !== isCollapsed) {
      setIsCollapsed(collapsedProp)
    }
  }, [collapsedProp, isCollapsed])

  // Navigation handlers
  const handleNavigate = useCallback(() => {
    if (isMobile && isMobileOpen) {
      setIsMobileOpen(false)
      onToggle?.()
    }
  }, [isMobile, isMobileOpen, onToggle])

  // Toggle handlers
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

  // Mobile interactions
  useEffect(() => {
    if (!isMobile) return
    
    const handleClickOutside = (e: MouseEvent) => {
      if (isMobileOpen && sidebarRef.current && 
          !sidebarRef.current.contains(e.target as Node)) {
        setIsMobileOpen(false)
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        setIsMobileOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isMobile, isMobileOpen])

  // Memoized components
  const memoizedClinicHeader = useMemo(() => (
    <ClinicHeader 
      isCollapsed={isCollapsed}
      isMobile={isMobile}
      onNavigate={handleNavigate}
    />
  ), [isCollapsed, isMobile, handleNavigate])

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "md:hidden fixed top-4 left-4 z-50",
          "bg-background/95 backdrop-blur-sm border",
          "shadow-lg transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-primary/20"
        )}
        onClick={toggleMobile}
        aria-label={isMobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isMobileOpen}
      >
        <div className="relative w-5 h-5">
          <MenuIcon 
            className={cn(
              "absolute transition-all duration-200",
              isMobileOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100"
            )} 
          />
          <XIcon 
            className={cn(
              "absolute transition-all duration-200",
              isMobileOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0"
            )} 
          />
        </div>
      </Button>

      {/* Sidebar */}
      <Sidebar
        ref={sidebarRef}
        className={cn(
          "transition-all duration-300 ease-in-out z-50 border-r bg-background/95 backdrop-blur-sm",
          isMobile
            ? "fixed left-0 top-0 h-full shadow-xl md:hidden"
            : "relative shadow-sm",
          isMobile ? (isMobileOpen ? "translate-x-0" : "-translate-x-full") : "",
          isCollapsed && !isMobile ? "w-16" : "w-64"
        )}
      >
        <SidebarHeader className={cn(
          "px-4 py-6 border-b",
          isCollapsed && !isMobile && "px-3 py-4"
        )}>
          {memoizedClinicHeader}
        </SidebarHeader>

        <SidebarContent className="px-2 py-4 flex-1 overflow-y-auto scrollbar-thin">
          <NavMain
            items={[...NAV_MAIN]}
            pathname={pathname}
            onNavigate={handleNavigate}
            
          />
        </SidebarContent>

        <SidebarFooter className="px-2 py-4 border-t space-y-3">
          {/* Theme Toggle */}
          <div className={cn(
            "flex items-center gap-2 p-2 rounded-lg bg-muted border",
            isCollapsed && !isMobile ? "justify-center" : "justify-between"
          )}>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">Apariencia</span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-accent"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
            >
              {mounted && (
                <>
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4 text-foreground/80" />
                  ) : (
                    <Moon className="h-4 w-4 text-foreground/80" />
                  )}
                </>
              )}
            </Button>
          </div>

          {/* User Info */}
          <div className={cn(
            "p-2 rounded-lg bg-muted border flex items-center",
            isCollapsed && !isMobile ? "justify-center" : "gap-3"
          )}>
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <User className="h-4 w-4 text-foreground/80" />
            </div>
            {(!isCollapsed || isMobile) && (
              <p className="text-sm font-medium truncate flex-1 min-w-0">
                {USER.name}
              </p>
            )}
          </div>

          {/* Collapse Button (Desktop) */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full transition-all text-foreground/60 hover:text-foreground hover:bg-accent",
                isCollapsed ? "justify-center" : "justify-start pl-3"
              )}
              onClick={toggleCollapsedDesktop}
              aria-label={isCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            >
              <ChevronLeft className={cn(
                "h-4 w-4 transition-transform duration-200",
                isCollapsed && "rotate-180"
              )} />
              {!isCollapsed && (
                <span className="ml-2 text-sm">Contraer</span>
              )}
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  )
}