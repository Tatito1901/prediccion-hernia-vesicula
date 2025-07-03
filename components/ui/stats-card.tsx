// components/ui/stats-card.tsx

import React from "react";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon?: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  color?: "blue" | "purple" | "amber" | "emerald" | "red" | "slate";
}

const colorClasses = {
  blue: "bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-100 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400",
  amber: "bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400",
  red: "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400",
  slate: "bg-slate-100 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400"
};

const gradientClasses = {
  blue: "from-blue-400 to-blue-600 dark:from-blue-500/70 dark:to-blue-700/70",
  purple: "from-purple-400 to-purple-600 dark:from-purple-500/70 dark:to-purple-700/70",
  amber: "from-amber-400 to-amber-600 dark:from-amber-500/70 dark:to-amber-700/70",
  emerald: "from-emerald-400 to-emerald-600 dark:from-emerald-500/70 dark:to-emerald-700/70",
  red: "from-red-400 to-red-600 dark:from-red-500/70 dark:to-red-700/70",
  slate: "from-slate-400 to-slate-600 dark:from-slate-500/70 dark:to-slate-700/70"
};

export function StatsCard({ icon, label, value, trend, color = "blue" }: StatsCardProps) {
  return (
    <Card className="relative overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900">
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className={cn(
            "h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
            colorClasses[color]
          )}>
            {icon}
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              <TrendingUp className={cn("h-3 w-3", trend < 0 && "transform rotate-180")} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-2 sm:mt-3">
          <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">{value}</p>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">{label}</p>
        </div>
      </div>
      <div className={cn("absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r", gradientClasses[color])} />
    </Card>
  );
}
