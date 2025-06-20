import React from "react";
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

// Configuración estática
const TABS_CONFIG = [
  { value: "newPatient" as const, label: "Nuevo Paciente", icon: UserRoundPlus, shortLabel: "Nuevo" },
  { value: "today" as const, label: "Citas de Hoy", icon: CalendarCheck, shortLabel: "Hoy" },
  { value: "future" as const, label: "Citas Futuras", icon: CalendarClock, shortLabel: "Futuras" },
  { value: "past" as const, label: "Historial", icon: History, shortLabel: "Pasadas" },
];

// Componente optimizado
export const MobileTabs: React.FC<MobileTabsProps> = ({
  activeTab,
  onTabChange,
  appointmentCounts,
  isLoading
}) => (
  <div className="grid grid-cols-4 gap-2 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4">
    {TABS_CONFIG.map((tab) => {
      const Icon = tab.icon;
      const count = tab.value === "newPatient" ? 0 : appointmentCounts[tab.value as keyof typeof appointmentCounts] || 0;
      const isActive = activeTab === tab.value;

      return (
        <div key={tab.value} className="relative">
          <Button
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs font-medium w-full",
              isActive
                ? "bg-white dark:bg-slate-900 shadow-sm"
                : "hover:bg-slate-200 dark:hover:bg-slate-700",
            )}
            onClick={() => onTabChange(tab.value)}
            aria-label={`${tab.label}${tab.value !== "newPatient" && count > 0 ? ` (${count} citas)` : ""}`}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate w-full">{tab.shortLabel}</span>
          </Button>

          {tab.value !== "newPatient" && count > 0 && !isLoading && (
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
    })}
  </div>
);