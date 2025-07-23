import React, { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// ==================== SKELETON PATTERNS UNIFICADOS ====================

/**
 * Loading Spinner genérico con mensaje opcional
 */
export const LoadingSpinner = memo<{
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}>(({ message = "Cargando...", size = "md", className }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <Loader2 className={cn("animate-spin text-blue-600", sizeClasses[size])} />
      {message && <span className="ml-2 text-sm text-gray-600">{message}</span>}
    </div>
  );
});
LoadingSpinner.displayName = "LoadingSpinner";

/**
 * Skeleton para listas de citas/appointments
 */
export const AppointmentListSkeleton = memo<{
  count?: number;
  className?: string;
}>(({ count = 5, className }) => (
  <div className={cn("space-y-4", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    ))}
  </div>
));
AppointmentListSkeleton.displayName = "AppointmentListSkeleton";

/**
 * Skeleton para métricas/stats cards
 */
export const MetricsCardsSkeleton = memo<{
  count?: number;
  className?: string;
}>(({ count = 4, className }) => (
  <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    ))}
  </div>
));
MetricsCardsSkeleton.displayName = "MetricsCardsSkeleton";

/**
 * Skeleton para tablas de pacientes
 */
export const PatientTableSkeleton = memo<{
  rows?: number;
  className?: string;
}>(({ rows = 8, className }) => (
  <div className={cn("bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800", className)}>
    {/* Header */}
    <div className="p-6 border-b border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
    
    {/* Table rows */}
    <div className="divide-y divide-slate-200 dark:divide-slate-800">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  </div>
));
PatientTableSkeleton.displayName = "PatientTableSkeleton";

/**
 * Skeleton genérico para páginas completas
 */
export const PageSkeleton = memo<{
  showMetrics?: boolean;
  showTable?: boolean;
  showCharts?: boolean;
  className?: string;
}>(({ showMetrics = true, showTable = true, showCharts = false, className }) => (
  <div className={cn("space-y-6", className)}>
    {/* Page Header */}
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
    </div>

    {/* Metrics Cards */}
    {showMetrics && <MetricsCardsSkeleton />}

    {/* Charts Section */}
    {showCharts && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )}

    {/* Table Section */}
    {showTable && <PatientTableSkeleton />}
  </div>
));
PageSkeleton.displayName = "PageSkeleton";
