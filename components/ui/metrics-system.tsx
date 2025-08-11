// components/ui/metrics-system.tsx - SISTEMA DE MÉTRICAS GENÉRICO Y REUTILIZABLE
"use client";

import React, { memo, ReactNode } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, TrendingDown, Minus, RefreshCw, 
  Info, AlertCircle, LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";

// ==================== TIPOS GENÉRICOS ====================
export interface MetricValue {
  value: string | number;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: LucideIcon;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  description?: string;
}

export interface MetricCardProps {
  metric: MetricValue;
  isLoading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  badge?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
}

export interface MetricsGridProps {
  metrics: MetricValue[];
  isLoading?: boolean;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'detailed';
  onRefresh?: () => void;
  title?: string;
  description?: string;
}

export interface ChartContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: Error | null;
  onRefresh?: () => void;
  className?: string;
  badge?: ReactNode;
  footer?: ReactNode;
}

// ==================== COMPONENTES GENÉRICOS ====================

/**
 * Componente genérico para mostrar una métrica individual
 */
export const MetricCard = memo<MetricCardProps>(({
  metric,
  isLoading = false,
  className,
  size = 'md',
  variant = 'default',
  badge,
  footer,
  onClick
}) => {
  const { value, label, trend, trendValue, icon: Icon, color = 'default', description } = metric;

  if (isLoading) {
    return (
      <Card className={cn("cursor-default", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl font-extrabold"
  };

  const colorClasses = {
    default: "",
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    error: "text-rose-600 dark:text-rose-400",
    info: "text-sky-600 dark:text-sky-400"
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-500';

  return (
    <Card 
      className={cn(
        "cursor-default transition-all duration-300 hover:shadow-lg border-0 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800",
        onClick && "cursor-pointer hover:shadow-xl hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className={cn(
        "pb-3",
        variant === 'compact' && "pb-2"
      )}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide",
            variant === 'compact' && "text-xs"
          )}>
            {label}
          </CardTitle>
          {Icon && (
            <div className={cn(
              "p-2 rounded-lg bg-white/60 dark:bg-slate-800/60 shadow-sm",
              size === 'lg' && "p-3"
            )}>
              <Icon className={cn(
                "h-5 w-5",
                size === 'lg' && "h-6 w-6",
                colorClasses[color] || "text-slate-500"
              )} />
            </div>
          )}
        </div>
        {badge && <div className="mt-1">{badge}</div>}
      </CardHeader>
      
      <CardContent className={cn(variant === 'compact' && "pt-0")}>
        <div className={cn(
          "font-bold tracking-tight",
          sizeClasses[size],
          colorClasses[color] || "text-slate-900 dark:text-slate-100"
        )}>
          {value}
        </div>
        
        {(trend || trendValue) && (
          <div className="flex items-center mt-1 text-xs">
            <TrendIcon className={cn("h-3 w-3 mr-1", trendColor)} />
            <span className={trendColor}>
              {trendValue || `${trend === 'up' ? '+' : trend === 'down' ? '-' : ''}0%`}
            </span>
          </div>
        )}
        
        {description && variant === 'detailed' && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            {description}
          </p>
        )}
      </CardContent>
      
      {footer && (
        <CardFooter className="pt-0">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
});

MetricCard.displayName = "MetricCard";

/**
 * Grid genérico para mostrar múltiples métricas
 */
export const MetricsGrid = memo<MetricsGridProps>(({
  metrics,
  isLoading = false,
  className,
  columns = 4,
  size = 'md',
  variant = 'default',
  onRefresh,
  title,
  description
}) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={cn("space-y-6", className)}>
      {(title || onRefresh) && (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {title && <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>}
            {description && <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>}
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          )}
        </div>
      )}
      
      <div className={cn(
        "grid gap-6",
        gridClasses[columns]
      )}>
        {metrics.map((metric, index) => (
          <MetricCard
            key={`${metric.label}-${index}`}
            metric={metric}
            isLoading={isLoading}
            size={size}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
});

MetricsGrid.displayName = "MetricsGrid";

/**
 * Contenedor genérico para gráficos y visualizaciones
 */
export const ChartContainer = memo<ChartContainerProps>(({
  title,
  description,
  children,
  isLoading = false,
  error = null,
  onRefresh,
  className,
  badge,
  footer
}) => {
  if (error) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div>
            <h3 className="font-semibold text-red-600">Error al cargar datos</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error.message || "No se pudieron cargar los datos"}
            </p>
          </div>
          {onRefresh && (
            <Button variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {badge}
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : (
          children
        )}
      </CardContent>
      
      {footer && (
        <CardFooter>
          {footer}
        </CardFooter>
      )}
    </Card>
  );
});

ChartContainer.displayName = "ChartContainer";

// ==================== UTILIDADES ====================

/**
 * Función helper para crear métricas rápidamente
 */
export const createMetric = (
  label: string,
  value: string | number,
  options?: Partial<Omit<MetricValue, 'label' | 'value'>>
): MetricValue => ({
  label,
  value,
  ...options
});

/**
 * Función helper para formatear números
 */
export const formatMetricValue = (
  value: number,
  type: 'number' | 'percentage' | 'currency' = 'number'
): string => {
  switch (type) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
      }).format(value);
    default:
      return value.toLocaleString('es-MX');
  }
};
