// mobile-tabs.tsx – Lógica simplificada
import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  UserRoundPlus,
  CalendarCheck,
  CalendarClock,
  History,
} from "lucide-react";

export type TabValue = "newPatient" | "today" | "future" | "past";

export interface MobileTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: Record<"today" | "future" | "past", number>;
  isLoading: boolean;
  className?: string;
  variant?: "default" | "compact";
}

const TABS_CONFIG = [
  {
    value: "newPatient" as const,
    label: "Nuevo Paciente",
    icon: UserRoundPlus,
    shortLabel: "Nuevo",
    color: "blue",
  },
  {
    value: "today" as const,
    label: "Citas de Hoy",
    icon: CalendarCheck,
    shortLabel: "Hoy",
    color: "green",
  },
  {
    value: "future" as const,
    label: "Citas Futuras",
    icon: CalendarClock,
    shortLabel: "Futuras",
    color: "purple",
  },
  {
    value: "past" as const,
    label: "Historial",
    icon: History,
    shortLabel: "Pasadas",
    color: "slate",
  },
] as const;

const formatCount = (count: number) => (count > 99 ? "99+" : String(count));
const getBadgeColorClass = (value: TabValue, count: number) =>
  value === "today" && count > 5
    ? "bg-red-500 text-white"
    : "bg-gray-200 text-gray-800";

export const MobileTabs = memo<MobileTabsProps>(
  ({
    activeTab,
    onTabChange,
    appointmentCounts,
    isLoading,
    className,
    variant = "default",
  }) => {
    return (
      <div className={cn("flex", className)}>
        {TABS_CONFIG.map((tab) => {
          const { value, shortLabel: label, icon: Icon, color } = tab;
          const isActive = activeTab === value;
          const count =
            value === "newPatient" ? 0 : appointmentCounts[value] || 0;
          const showBadge = value !== "newPatient" && count > 0 && !isLoading;

          return (
            <div key={value} className="relative flex-1">
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                onClick={() =>
                  !isLoading && value !== activeTab && onTabChange(value)
                }
                aria-label={`${tab.label}${
                  showBadge ? ` (${count} citas)` : ""
                }`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 w-full text-xs font-medium transition-all",
                  variant === "compact" ? "py-2" : "py-3",
                  isActive
                    ? "bg-white dark:bg-slate-900 scale-105 shadow-sm"
                    : "hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-102"
                )}
              >
                <Icon
                  className={cn(
                    variant === "compact" ? "h-4 w-4" : "h-5 w-5"
                  )}
                />
                <span
                  className={cn(
                    "truncate",
                    variant === "compact" ? "text-[10px]" : "text-xs"
                  )}
                >
                  {label}
                </span>
              </Button>

              {showBadge && (
                <Badge
                  className={cn(
                    "absolute -top-1 -right-1 min-w-[1rem] text-[10px] px-1 rounded-full border-2 border-white dark:border-slate-800",
                    variant === "compact" ? "h-4 text-[8px]" : "h-5",
                    getBadgeColorClass(value, count)
                  )}
                  aria-hidden="true"
                >
                  {formatCount(count)}
                </Badge>
              )}

              {isLoading && value !== "newPatient" && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                  <div className="h-1 w-4 bg-blue-500 rounded-full animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

MobileTabs.displayName = "MobileTabs";

export const getNextTab = (current: TabValue): TabValue => {
  const idx = TABS_CONFIG.findIndex((t) => t.value === current);
  return TABS_CONFIG[(idx + 1) % TABS_CONFIG.length].value;
};

export const getPreviousTab = (current: TabValue): TabValue => {
  const idx = TABS_CONFIG.findIndex((t) => t.value === current);
  return TABS_CONFIG[idx === 0 ? TABS_CONFIG.length - 1 : idx - 1].value;
};
