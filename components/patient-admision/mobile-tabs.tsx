// mobile-tabs.tsx - Versión optimizada para rendimiento
import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  UserRoundPlus, 
  CalendarCheck, 
  CalendarClock, 
  History 
} from "lucide-react";

// Tipos
export type TabValue = "newPatient" | "today" | "future" | "past";

export interface MobileTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: Record<'today' | 'future' | 'past', number>;
  isLoading: boolean;
}

// Configuración estática fuera del componente
const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Citas de Hoy", icon: CalendarCheck, shortLabel: "Hoy" },
  { value: "future" as const, label: "Citas Futuras", icon: CalendarClock, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Pasadas" },
] as const;

// Componente de Tab individual memoizado
const TabButton = memo<{
  tab: typeof TABS_CONFIG[number];
  isActive: boolean;
  count: number;
  isLoading: boolean;
  onClick: () => void;
}>(({ tab, isActive, count, isLoading, onClick }) => {
  const Icon = tab.icon;
  const showBadge = tab.value !== "newPatient" && count > 0 && !isLoading;

  return (
    <div className="relative">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={cn(
          "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full",
          isActive
            ? "bg-white dark:bg-slate-900 shadow-sm"
            : "hover:bg-slate-200 dark:hover:bg-slate-700",
        )}
        onClick={onClick}
        aria-label={`${tab.label}${showBadge ? ` (${count} citas)` : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className="h-5 w-5" />
        <span className="truncate w-full">{tab.shortLabel}</span>
      </Button>

      {showBadge && (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-5 min-w-[1.25rem] text-[10px] px-1 rounded-full bg-blue-600 text-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </Badge>
      )}
    </div>
  );
});

TabButton.displayName = "TabButton";

// Componente principal optimizado
export const MobileTabs = memo<MobileTabsProps>(({
  activeTab,
  onTabChange,
  appointmentCounts,
  isLoading
}) => {
  // Handler memoizado para evitar recreación de funciones
  const handleTabClick = useCallback((tabValue: TabValue) => {
    if (tabValue !== activeTab) {
      onTabChange(tabValue);
    }
  }, [activeTab, onTabChange]);

  return (
    <div 
      className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4"
      role="tablist"
      aria-label="Navegación de citas"
    >
      {TABS_CONFIG.map((tab) => {
        const count = tab.value === "newPatient" 
          ? 0 
          : appointmentCounts[tab.value as keyof typeof appointmentCounts] || 0;

        return (
          <TabButton
            key={tab.value}
            tab={tab}
            isActive={activeTab === tab.value}
            count={count}
            isLoading={isLoading}
            onClick={() => handleTabClick(tab.value)}
          />
        );
      })}
    </div>
  );
});

MobileTabs.displayName = "MobileTabs";