"use client"

import { memo, Suspense } from "react"
import dynamic from "next/dynamic"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-breakpoint"
import { ClinicDataProvider } from "@/contexts/clinic-data-provider"

// ──────────────────────────────────────────────────────────
//  Componente de Admisión - Carga Diferida
// ──────────────────────────────────────────────────────────
const PatientAdmission = dynamic(
  () => import("@/components/patient-admision/patient-admission"),
  {
    loading: () => <AdmissionLoadingSkeleton />,
    ssr: false,
  }
)

// ──────────────────────────────────────────────────────────
//  Componentes de UI Reutilizables
// ──────────────────────────────────────────────────────────
const HeaderSkeleton = memo(function HeaderSkeleton() {
  const isMobile = useIsMobile()
  
  return (
    <div className="flex items-center gap-2 mb-4">
      <Skeleton className={cn(
        "rounded-full",
        isMobile ? "h-5 w-5" : "h-6 w-6"
      )} />
      <Skeleton className={cn(
        isMobile ? "h-6 w-32" : "h-6 w-48"
      )} />
    </div>
  )
})

const ContentSkeleton = memo(function ContentSkeleton() {
  const isMobile = useIsMobile()
  
  return (
    <div className="space-y-4">
      <Skeleton className={cn(
        "rounded-lg",
        isMobile ? "h-9" : "h-10"
      )} />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "rounded-lg",
            isMobile ? "h-20" : "h-24"
          )} 
        />
      ))}
    </div>
  )
})

// ──────────────────────────────────────────────────────────
//  Skeleton de Carga Principal
// ──────────────────────────────────────────────────────────
const AdmissionLoadingSkeleton = memo(function AdmissionLoadingSkeleton() {
  const isMobile = useIsMobile()
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-32" />
        </div>
        
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 flex-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})

// ──────────────────────────────────────────────────────────
//  Encabezado Responsivo
// ──────────────────────────────────────────────────────────
const PageHeader = memo(function PageHeader() {
  const isMobile = useIsMobile()

  return (
    <div className={cn(
      "flex flex-col gap-2",
      isMobile ? "mb-4" : "mb-6"
    )}>
      <div className="flex items-center gap-2 sm:gap-3">
        <CalendarIcon className={cn(
          "text-primary",
          isMobile ? "h-5 w-5" : "h-6 w-6"
        )} />
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

// ──────────────────────────────────────────────────────────
//  Contenido Principal con Estado de Carga
// ──────────────────────────────────────────────────────────
const AdmissionContent = memo(function AdmissionContent() {
  return (
    <div className="animate-in fade-in duration-300">
      <PatientAdmission />
    </div>
  )
})

// ──────────────────────────────────────────────────────────
//  Página Principal
// ──────────────────────────────────────────────────────────
export default function AdmisionPage() {
  const isMobile = useIsMobile()

  return (
    <ClinicDataProvider>
      <div className={cn(
        "animate-in fade-in duration-300",
        isMobile ? "px-2 space-y-4" : "px-0 space-y-6"
      )}>
        <PageHeader />

        <Card className="border shadow-sm">
          <CardContent className={cn(
            "transition-all duration-300 ease-in-out",
            isMobile ? "p-3" : "p-4 lg:p-6"
          )}>
            <Suspense fallback={<AdmissionLoadingSkeleton />}>
              <AdmissionContent />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </ClinicDataProvider>
  )
}