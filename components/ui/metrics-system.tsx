"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Minus, RefreshCw, AlertCircle } from "lucide-react";

export type Trend = "up" | "down" | "neutral";

export type MetricValue = {
  label: string;
  value: number | string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: Trend;
  trendValue?: string;
  color?: "default" | "success" | "warning" | "error" | "info";
};

export function createMetric(
  label: string,
  value: number | string,
  options: Partial<Omit<MetricValue, "label" | "value">> = {}
): MetricValue {
  return {
    label,
    value,
    description: options.description,
    icon: options.icon,
    trend: options.trend,
    trendValue: options.trendValue,
    color: options.color ?? "default",
  };
}

export function formatMetricValue(v: number | string): string {
  if (typeof v === "number") return new Intl.NumberFormat("es-MX").format(v);
  return v;
}

const trendColor: Record<Trend, string> = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-500 dark:text-slate-400",
};

const colorAccent: Record<NonNullable<MetricValue["color"]>, string> = {
  default: "text-slate-700 dark:text-slate-200",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
  error: "text-rose-600 dark:text-rose-400",
  info: "text-indigo-600 dark:text-indigo-400",
};

function MetricCard({ metric, variant = "detailed" }: { metric: MetricValue; variant?: "compact" | "detailed" }) {
  const Icon = metric.icon;
  const TrendIcon = metric.trend === "up" ? ArrowUp : metric.trend === "down" ? ArrowDown : Minus;
  return (
    <Card>
      <CardContent className={cn("p-4", variant === "detailed" && "sm:p-6")}>        
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{metric.label}</div>
            <div className={cn("text-xl font-bold", colorAccent[metric.color ?? "default"]) }>
              {formatMetricValue(metric.value)}
            </div>
            {metric.description && (
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{metric.description}</div>
            )}
            {metric.trend && (
              <div className={cn("flex items-center gap-1 text-xs", trendColor[metric.trend])}>
                <TrendIcon className="h-3.5 w-3.5" />
                {metric.trendValue && <span className="truncate">{metric.trendValue}</span>}
              </div>
            )}
          </div>
          {Icon && (
            <div className="flex-shrink-0 rounded-md p-2 bg-slate-100 dark:bg-slate-800">
              <Icon className={cn("h-5 w-5", colorAccent[metric.color ?? "default"]) } />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({
  metrics,
  isLoading,
  columns = 4,
  variant = "detailed",
}: {
  metrics: MetricValue[];
  isLoading?: boolean;
  columns?: 1 | 2 | 3 | 4;
  variant?: "compact" | "detailed";
}) {
  if (isLoading) {
    return (
      <div className={cn("grid gap-3", columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", columns === 3 && "grid-cols-1 sm:grid-cols-3", columns === 2 && "grid-cols-1 sm:grid-cols-2", columns === 1 && "grid-cols-1") }>
        {Array.from({ length: columns }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3", columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4", columns === 3 && "grid-cols-1 sm:grid-cols-3", columns === 2 && "grid-cols-1 sm:grid-cols-2", columns === 1 && "grid-cols-1") }>
      {metrics.map((m, idx) => (
        <MetricCard key={idx} metric={m} variant={variant} />
      ))}
    </div>
  );
}

export function ChartContainer({
  title,
  description,
  isLoading,
  error,
  onRefresh,
  footer,
  children,
}: {
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} aria-label="Recargar">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[300px] w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <div>{children}</div>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
