"use client"

import { memo, Suspense } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

// Importación dinámica del componente de admisión de pacientes
const PatientAdmission = dynamic(
  () => import("@/components/patient-admision/patient-admission"),
  {
    loading: () => <AdmissionLoadingSkeleton />,
    ssr: false
  }
)

// Componente de carga para admisión
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

// Componente de encabezado responsivo para la página
const PageHeader = memo(() => {
  const isMobile = useMediaQuery("(max-width: 640px)")

  return (
    <div className="flex flex-col gap-2 mb-4 sm:mb-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        <h1 className={cn(
          "font-bold tracking-tight",
          isMobile ? "text-xl" : "text-2xl"
        )}>
          Admisión de Pacientes
        </h1>
      </div>
      {!isMobile && (
        <p className="text-sm text-muted-foreground">
          Gestión de citas médicas y admisión de pacientes
        </p>
      )}
    </div>
  )
})
PageHeader.displayName = "PageHeader"

// Página principal de admisión
export default function AdmisionPage() {
  const isMobile = useMediaQuery("(max-width: 640px)")
  
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-300 px-2 sm:px-0">
      <PageHeader />
      
      <Card className="border shadow-sm">
        <CardContent className={cn(
          "transition-opacity duration-300 ease-in-out",
          isMobile ? "p-3" : "p-4 lg:p-6"
        )}>
          <Suspense fallback={<AdmissionLoadingSkeleton />}>
            <div className="animate-in fade-in duration-500">
              <PatientAdmission />
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
