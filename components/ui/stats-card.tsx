"use client";

import React from "react";
import clsx from "clsx";

export type StatsCardColor = "blue" | "red" | "purple" | "emerald" | "amber" | "slate";

export interface StatsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  label?: string; // keep optional for flexibility with historical usages
  value: string | number;
  icon?: React.ComponentType<any> | React.ReactNode;
  color?: StatsCardColor;
  trend?: string; // e.g. "+12% vs. last week"
  isLoading?: boolean;
}

const colorMap: Record<StatsCardColor, { bg: string; text: string; ring: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-300", ring: "ring-blue-200 dark:ring-blue-900" },
  red: { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-600 dark:text-red-300", ring: "ring-red-200 dark:ring-red-900" },
  purple: { bg: "bg-purple-50 dark:bg-purple-950/30", text: "text-purple-600 dark:text-purple-300", ring: "ring-purple-200 dark:ring-purple-900" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-300", ring: "ring-emerald-200 dark:ring-emerald-900" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-300", ring: "ring-amber-200 dark:ring-amber-900" },
  slate: { bg: "bg-slate-50 dark:bg-slate-900/40", text: "text-slate-600 dark:text-slate-300", ring: "ring-slate-200 dark:ring-slate-800" },
};

function renderIcon(icon?: React.ComponentType<any> | React.ReactNode, className?: string) {
  if (!icon) return null;
  if (typeof icon === "function") {
    const C = icon as React.ComponentType<any>;
    return <C className={className} aria-hidden="true" />;
  }
  return <span className={className}>{icon}</span>;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  label,
  value,
  icon,
  color = "slate",
  trend,
  isLoading = false,
  className,
  ...rest
}) => {
  const palette = colorMap[color] || colorMap.slate;

  return (
    <div
      className={clsx(
        "rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5",
        "transition-colors",
        className
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          {title && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate" title={title}>
              {title}
            </p>
          )}
          {label && !title && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate" title={label}>
              {label}
            </p>
          )}
          <div className="flex items-center gap-2">
            {isLoading ? (
              <div className="h-7 w-24 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : (
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {value}
              </p>
            )}
            {trend && (
              <span className="text-xs text-slate-500 dark:text-slate-400">{trend}</span>
            )}
          </div>
        </div>
        <div className={clsx("p-2 rounded-lg", palette.bg, palette.ring)}>
          {renderIcon(icon, clsx("w-5 h-5", palette.text))}
        </div>
      </div>
    </div>
  );
};

StatsCard.displayName = "StatsCard";

export default StatsCard;
