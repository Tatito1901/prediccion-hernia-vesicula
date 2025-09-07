"use client"

import {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  PropsWithChildren,
  ComponentType,
  SVGProps,
} from "react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
  LayoutDashboardIcon,
  UsersIcon,
  TabletIcon,
  UserPlusIcon,
  FileBarChart,
  ChevronLeft,
  Sun,
  Moon,
  Hospital,
  LifeBuoy,
  Wrench,
  Settings,
  User,
} from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NavMain } from "./nav-main"
import { NavSecondary } from "./nav-secondary"
import { NavUser } from "./nav-user"

/* ──────────────────────────────────────────────────────────────────────────── */
/* Static Data                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */
const CLINIC_INFO = {
  fullName: "Clínica de Hernia y Vesícula",
  tagline: "Centro de Excelencia Médica",
} as const

const NAV_MAIN = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Pacientes", url: "/pacientes", icon: UsersIcon },
  { title: "Encuesta Digital", url: "/encuesta", icon: TabletIcon },
  { title: "Admisión", url: "/admision", icon: UserPlusIcon },
  { title: "Estadísticas", url: "/estadisticas", icon: FileBarChart },
] as const

const NAV_SECONDARY = [
  { title: "Soporte", url: "/soporte", icon: LifeBuoy },
  { title: "Herramientas", url: "/herramientas", icon: Wrench },
] as const

const NAV_USER = [
  { title: "Perfil", url: "/perfil", icon: User },
  { title: "Ajustes", url: "/ajustes", icon: Settings },
] as const

/* ──────────────────────────────────────────────────────────────────────────── */
/* Component Types                                                             */
/* ──────────────────────────────────────────────────────────────────────────── */
interface AppSidebarProps {
  collapsed?: boolean
  onCollapsedChange?: (value: boolean) => void
  onToggle?: () => void
}

interface ClinicHeaderProps {
  isCollapsed: boolean
  isMobile: boolean
  onNavigate: () => void
}

interface NavItem {
  title: string
  url: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

/* ──────────────────────────────────────────────────────────────────────────── */
/* Clinic Header Component                                                     */
/* ──────────────────────────────────────────────────────────────────────────── */
const ClinicHeader = ({ isCollapsed, isMobile, onNavigate }: ClinicHeaderProps) => (
  <div className="space-y-4 sm:space-y-6">
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-2 py-2 group touch-manipulation",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
        "transition-colors duration-200"
      )}
      title={CLINIC_INFO.fullName}
      aria-label={`Ir al dashboard de ${CLINIC_INFO.fullName}`}
    >
      <div
        className={cn(
          "flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl",
          "bg-gradient-to-br from-primary/90 to-primary",
          "flex items-center justify-center shadow-sm"
        )}
      >
        {/* Icono de hospital en lugar del logo anterior */}
        <Hospital className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div
        className={cn(
          "flex flex-col min-w-0 transition-all duration-300",
          isCollapsed && !isMobile && "opacity-0 w-0 overflow-hidden"
        )}
      >
        <div className="flex flex-col space-y-0.5">
          <span className="text-sm sm:text-[15px] font-semibold tracking-tight text-foreground leading-none">
            {isMobile ? "Clínica de Hernia" : CLINIC_INFO.fullName}
          </span>
          {isMobile && (
            <span className="text-xs sm:text-[13px] font-medium text-primary/80 leading-none">
              y Vesícula
            </span>
          )}
          <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground leading-none mt-1">
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
/* Main Component                                                              */
/* ──────────────────────────────────────────────────────────────────────────── */
export function AppSidebar({
  collapsed: collapsedProp,
  onCollapsedChange,
  onToggle,
}: PropsWithChildren<AppSidebarProps>) {
  const pathname = usePathname()
  const { state, isMobile, openMobile, setOpenMobile, toggleSidebar } = useSidebar()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // State management
  const isCollapsed = state === "collapsed"

  // Theme initialization
  useEffect(() => {
    setMounted(true)
  }, [])

  // Sync callback when collapsed state changes (desktop)
  useEffect(() => {
    onCollapsedChange?.(isCollapsed)
  }, [isCollapsed, onCollapsedChange])

  // Navigation handlers
  const handleNavigate = useCallback(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false)
      onToggle?.()
    }
  }, [isMobile, openMobile, setOpenMobile, onToggle])

  // Toggle handlers
  const toggleCollapsedDesktop = useCallback(() => {
    toggleSidebar()
  }, [toggleSidebar])

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark")
  }, [theme, setTheme])

  // Mobile interactions handled by Sheet via Sidebar primitives

  // Close mobile sidebar when route changes
  useEffect(() => {
    if (isMobile && openMobile) {
      setOpenMobile(false)
    }
  }, [pathname, isMobile, openMobile, setOpenMobile])

  // Convert readonly array to mutable array for NavMain component
  const navItems = useMemo(() => 
    NAV_MAIN.map(item => ({ ...item })), 
    []
  )

  // Secondary and User navigation items
  const navSecondaryItems = useMemo(() => 
    NAV_SECONDARY.map(item => ({ ...item })), 
    []
  )

  const navUserItems = useMemo(() => 
    NAV_USER.map(item => ({ ...item })), 
    []
  )

  return (
    <>
      {/* Mobile Toggle Button (uses SidebarTrigger) */}
      <SidebarTrigger
        className={cn(
          "md:hidden fixed top-4 left-4 z-50",
          "bg-background/95 backdrop-blur-sm border",
          "shadow-lg transition-all duration-200",
          "focus-visible:ring-2 focus-visible:ring-primary/20"
        )}
        aria-label={openMobile ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={openMobile}
      />

      {/* Sidebar */}
      <Sidebar
        ref={sidebarRef}
        collapsible="icon"
        className={cn(
          "border-r bg-background",
          "shadow-sm"
        )}
      >
        <SidebarHeader
          className={cn("px-4 py-6 border-b", isCollapsed && !isMobile && "px-3 py-4")}
        >
          <ClinicHeader
            isCollapsed={isCollapsed}
            isMobile={isMobile}
            onNavigate={handleNavigate}
          />
        </SidebarHeader>

        <SidebarContent className="px-2 py-4 flex-1 overflow-y-auto scrollbar-thin">
          <NavMain
            items={navItems}
            pathname={pathname}
            onNavigate={handleNavigate}
            collapsed={isCollapsed && !isMobile}
          />
          <NavSecondary
            items={navSecondaryItems}
            pathname={pathname}
            onNavigate={handleNavigate}
            className="mt-6"
          />
          <NavUser
            items={navUserItems}
            pathname={pathname}
            onNavigate={handleNavigate}
            className="mt-6"
          />
        </SidebarContent>

        <SidebarFooter className="px-2 py-4 border-t space-y-3">
          {/* Theme Toggle */}
          <div
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg bg-muted border",
              isCollapsed && !isMobile ? "justify-center" : "justify-between"
            )}
          >
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
              <ChevronLeft
                className={cn("h-4 w-4 transition-transform duration-200", isCollapsed && "rotate-180")}
              />
              {!isCollapsed && <span className="ml-2 text-sm">Contraer</span>}
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>
    </>
  )
}