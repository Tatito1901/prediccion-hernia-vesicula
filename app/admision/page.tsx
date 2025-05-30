"use client"

import { useState, useEffect, useMemo, useCallback, memo, Suspense } from "react"
import dynamic from "next/dynamic"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  PieChartIcon, 
  CalendarIcon, 
  FileBarChartIcon, 
  Activity
} from "lucide-react"
import { useAppContext } from "@/lib/context/app-context"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// ============ DYNAMIC IMPORTS CON NEXT.JS ============
const PatientAdmission = dynamic(
  () => import("@/components/patient-admision/patient-admission"),
  {
    loading: () => <AdmissionLoadingSkeleton />,
    ssr: false
  }
)

const AppointmentStatistics = dynamic(
  () => import("@/components/appointments/appointment-statistics").then(mod => ({ default: mod.AppointmentStatistics })),
  {
    loading: () => <StatisticsLoadingSkeleton />,
    ssr: false
  }
)

const ChartDiagnostic = dynamic(
  () => import("@/components/charts/chart-diagnostic"),
  {
    loading: () => <DiagnosticLoadingSkeleton />,
    ssr: false
  }
)

// ============ LOADING SKELETONS RESPONSIVOS ============

const AdmissionLoadingSkeleton = memo(() => (
  <div className="space-y-4 sm:space-y-6 animate-pulse">
    <div className="flex items-center gap-2 sm:gap-3">
      <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
      <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
    </div>
    
    <div className="space-y-3 sm:space-y-4">
      <Skeleton className="h-10 sm:h-12 w-full rounded-lg" />
      <div className="space-y-2 sm:space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
              <div className="space-y-1 sm:space-y-2">
                <Skeleton className="h-4 sm:h-5 w-24 sm:w-32" />
                <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
              </div>
              <Skeleton className="h-5 sm:h-6 w-16 sm:w-20 rounded-full" />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Skeleton className="h-8 sm:h-9 flex-1" />
              <Skeleton className="h-8 sm:h-9 flex-1" />
              <Skeleton className="h-8 sm:h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
))
AdmissionLoadingSkeleton.displayName = "AdmissionLoadingSkeleton"

const StatisticsLoadingSkeleton = memo(() => (
  <div className="space-y-4 sm:space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-6 w-6 sm:h-8 sm:w-8 rounded" />
            <div className="space-y-1 sm:space-y-2">
              <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
              <Skeleton className="h-4 sm:h-6 w-8 sm:w-12" />
            </div>
          </div>
        </Card>
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-3 sm:mb-4" />
        <Skeleton className="h-48 sm:h-64 w-full" />
      </Card>
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-3 sm:mb-4" />
        <Skeleton className="h-48 sm:h-64 w-full" />
      </Card>
    </div>
  </div>
))
StatisticsLoadingSkeleton.displayName = "StatisticsLoadingSkeleton"

const DiagnosticLoadingSkeleton = memo(() => (
  <div className="space-y-4 sm:space-y-6 animate-pulse">
    <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
      <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 rounded-full" />
      <Skeleton className="h-5 sm:h-6 w-32 sm:w-48" />
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <Card className="lg:col-span-2 p-4 sm:p-6">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-3 sm:mb-4" />
        <Skeleton className="h-64 sm:h-80 w-full" />
      </Card>
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-3 sm:mb-4" />
        <div className="space-y-3 sm:space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
              <Skeleton className="h-3 sm:h-4 w-8 sm:w-12" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  </div>
))
DiagnosticLoadingSkeleton.displayName = "DiagnosticLoadingSkeleton"

// ============ COMPONENTE DE TAB RESPONSIVO ============

interface TabTriggerProps {
  value: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  shortLabel: string
  count?: number
  isActive: boolean
  isMobile: boolean
  isTablet: boolean
}

const ResponsiveTabTrigger = memo<TabTriggerProps>(({ 
  value, 
  icon: Icon, 
  label, 
  shortLabel, 
  count, 
  isActive, 
  isMobile,
  isTablet
}) => (
  <TabsTrigger 
    value={value}
    className={cn(
      "relative group transition-all duration-200 ease-in-out",
      "rounded-t-lg rounded-b-none border-r border-l border-t",
      "data-[state=active]:border-b-0 data-[state=active]:bg-background data-[state=active]:shadow",
      "hover:bg-muted/50 data-[state=active]:hover:bg-background",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Espaciado responsivo
      isMobile ? "px-2 py-2" : isTablet ? "px-3 py-2" : "px-3 py-2.5",
      "whitespace-nowrap min-w-0"
    )}
  >
    <div className={cn(
      "flex items-center transition-colors duration-200",
      isMobile ? "gap-1" : "gap-2"
    )}>
      <Icon className={cn(
        "transition-colors duration-200 flex-shrink-0",
        isMobile ? "h-3 w-3" : "h-4 w-4",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />
      
      <span className={cn(
        "font-medium transition-colors duration-200 truncate",
        isMobile ? "text-xs" : "text-sm",
        isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {/* Mostrar texto adaptativo según dispositivo */}
        {isMobile ? shortLabel : isTablet ? shortLabel : label}
      </span>
      
      {count !== undefined && count > 0 && (
        <Badge 
          variant="secondary" 
          className={cn(
            "flex items-center justify-center font-medium",
            "transition-all duration-200 animate-in fade-in zoom-in-50",
            // Tamaño responsivo del badge
            isMobile ? "ml-0.5 px-1 min-w-4 h-4 text-xs" : "ml-1 px-1.5 min-w-5 h-5 text-xs",
            isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20"
          )}
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </div>
  </TabsTrigger>
))
ResponsiveTabTrigger.displayName = "ResponsiveTabTrigger"

// ============ HEADER RESPONSIVO ============

const ResponsivePageHeader = memo(() => {
  const [currentTime, setCurrentTime] = useState(new Date())
  const isMobile = useMediaQuery("(max-width: 640px)")

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-between sm:items-center mb-4 sm:mb-6">
      <div className="space-y-1">
        <h1 className={cn(
          "font-bold tracking-tight text-center sm:text-left",
          isMobile ? "text-xl" : "text-2xl"
        )}>
          Centro de Gestión Clínica
        </h1>
        {!isMobile && (
          <p className="text-sm text-muted-foreground">
            Panel de control integral para la gestión de pacientes y citas médicas
          </p>
        )}
      </div>
      
      <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-1 sm:gap-2">
          <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          <span className={cn(isMobile ? "text-xs" : "text-sm")}>
            {isMobile ? "Activo" : "Sistema Activo"}
          </span>
        </div>
        <div className={cn(
          "bg-muted px-2 py-1 rounded-md font-mono",
          isMobile ? "text-xs" : "text-xs"
        )}>
          {currentTime.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            ...(isMobile ? {} : { second: '2-digit' })
          })}
        </div>
      </div>
    </div>
  )
})
ResponsivePageHeader.displayName = "ResponsivePageHeader"

// ============ COMPONENTE PRINCIPAL ============

export default function AdmisionPage() {
  const [activeTab, setActiveTab] = useState("admision")
  const [isTabChanging, setIsTabChanging] = useState(false)
  const { pendingAppointments, todayAppointments } = useAppContext()
  
  // Detección responsiva de dispositivos
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(max-width: 1024px)")

  // Memoización de notificaciones optimizada
  const notificationCounts = useMemo(() => {
    const todayString = new Date().toDateString()
    
    return {
      admision: pendingAppointments?.filter(app => 
        app.estado === "pendiente" && 
        new Date(app.fecha).toDateString() === todayString
      ).length || 0,
      statistics: 0,
      diagnostic: 0
    }
  }, [pendingAppointments])

  // Manejo optimizado de cambio de tab
  const handleTabChange = useCallback((newTab: string) => {
    if (newTab === activeTab) return
    
    setIsTabChanging(true)
    setActiveTab(newTab)
    
    setTimeout(() => setIsTabChanging(false), 150)
  }, [activeTab])

  // Configuración de tabs responsiva
  const tabsConfig = useMemo(() => [
    {
      value: "admision",
      icon: CalendarIcon,
      label: "Admisión de Pacientes",
      shortLabel: "Admisión",
      count: notificationCounts.admision
    },
    {
      value: "statistics", 
      icon: FileBarChartIcon,
      label: "Estadísticas de Citas",
      shortLabel: "Estadísticas",
      count: notificationCounts.statistics
    },
    {
      value: "diagnostic",
      icon: PieChartIcon,
      label: "Análisis de Diagnósticos", 
      shortLabel: "Diagnósticos",
      count: notificationCounts.diagnostic
    }
  ], [notificationCounts])

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 px-2 sm:px-0">
      <ResponsivePageHeader />
      
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Tabs 
            value={activeTab} 
            onValueChange={handleTabChange}
            className="w-full"
          >
            {/* Navegación de tabs completamente responsiva */}
            <div className="bg-muted/30 border-b px-1 sm:px-3 py-1 sm:py-2 overflow-x-auto scrollbar-hide">
              <TabsList className={cn(
                "bg-background w-full min-w-max sm:min-w-0 justify-start rounded-none border-b border-b-transparent p-0",
                isMobile ? "h-9 gap-0.5" : "h-10 sm:h-11 gap-0.5 sm:gap-1"
              )}>
                {tabsConfig.map((tab) => (
                  <ResponsiveTabTrigger
                    key={tab.value}
                    value={tab.value}
                    icon={tab.icon}
                    label={tab.label}
                    shortLabel={tab.shortLabel}
                    count={tab.count}
                    isActive={activeTab === tab.value}
                    isMobile={isMobile}
                    isTablet={isTablet}
                  />
                ))}
              </TabsList>
            </div>

            {/* Contenido responsivo con padding adaptativo */}
            <div className={cn(
              "transition-all duration-300 ease-in-out",
              isMobile ? "p-3" : isTablet ? "p-4" : "p-6",
              isTabChanging && "opacity-50 scale-[0.98]"
            )}>
              <Suspense fallback={<AdmissionLoadingSkeleton />}>
                <TabsContent 
                  value="admision" 
                  className="mt-0 border-none p-0 data-[state=inactive]:hidden"
                >
                  {activeTab === "admision" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <PatientAdmission />
                    </div>
                  )}
                </TabsContent>
              </Suspense>
              
              <Suspense fallback={<StatisticsLoadingSkeleton />}>
                <TabsContent 
                  value="statistics" 
                  className="mt-0 border-none p-0 data-[state=inactive]:hidden"
                >
                  {activeTab === "statistics" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <AppointmentStatistics />
                    </div>
                  )}
                </TabsContent>
              </Suspense>
              
              <Suspense fallback={<DiagnosticLoadingSkeleton />}>
                <TabsContent 
                  value="diagnostic" 
                  className="mt-0 border-none p-0 data-[state=inactive]:hidden"
                >
                  {activeTab === "diagnostic" && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                      <ChartDiagnostic />
                    </div>
                  )}
                </TabsContent>
              </Suspense>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}