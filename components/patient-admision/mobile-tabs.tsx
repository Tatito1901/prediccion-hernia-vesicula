// mobile-tabs.tsx - Versión refactorizada con utilidades integradas
import React, { memo, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  UserRoundPlus, 
  CalendarCheck, 
  CalendarClock, 
  History 
} from "lucide-react";

// ==================== TIPOS CENTRALIZADOS ====================
export type TabValue = "newPatient" | "today" | "future" | "past";

export interface MobileTabsProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  appointmentCounts: Record<'today' | 'future' | 'past', number>;
  isLoading: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

<<<<<<< HEAD
=======
// ==================== CONFIGURACIÓN ESTÁTICA OPTIMIZADA ====================

// Configuración de tabs optimizada e inmutable
>>>>>>> feature/nombre-de-la-feature
const TABS_CONFIG = [
  { 
    value: "newPatient" as const, 
    label: "Nuevo Paciente", 
    icon: UserRoundPlus, 
    shortLabel: "Nuevo",
    color: "blue"
  },
  { 
    value: "today" as const, 
    label: "Citas de Hoy", 
    icon: CalendarCheck, 
    shortLabel: "Hoy",
    color: "green"
  },
  { 
    value: "future" as const, 
    label: "Citas Futuras", 
    icon: CalendarClock, 
    shortLabel: "Futuras",
    color: "purple"
  },
  { 
    value: "past" as const, 
    label: "Historial", 
    icon: History, 
    shortLabel: "Pasadas",
    color: "slate"
  },
] as const;

<<<<<<< HEAD
=======
// Map para búsqueda rápida O(1)
const TAB_CONFIG_MAP = new Map(
  TABS_CONFIG.map(tab => [tab.value, tab])
);

// ==================== UTILIDADES INTEGRADAS ====================

// Formatear conteo de citas
const formatCount = (count: number): string => {
  if (count > 999) return "999+";
  if (count > 99) return "99+";
  return count.toString();
};

// Obtener clase de color para badge basado en el tipo de tab
const getBadgeColorClass = (tabValue: TabValue, count: number): string => {
  if (count === 0) return "bg-slate-400 text-white";
  
  const colorMap: Record<TabValue, string> = {
    newPatient: "bg-blue-600 text-white",
    today: "bg-green-600 text-white",
    future: "bg-purple-600 text-white",
    past: "bg-slate-600 text-white"
  };
  
  return colorMap[tabValue] || "bg-blue-600 text-white";
};

// ==================== COMPONENTES INTERNOS OPTIMIZADOS ====================

// Componente de Tab individual altamente optimizado
>>>>>>> feature/nombre-de-la-feature
const TabButton = memo<{
  tab: typeof TABS_CONFIG[number];
  isActive: boolean;
  count: number;
  isLoading: boolean;
  variant: 'default' | 'compact';
  onClick: () => void;
}>(({ tab, isActive, count, isLoading, variant, onClick }) => {
  const Icon = tab.icon;
  const showBadge = tab.value !== "newPatient" && count > 0 && !isLoading;
  const formattedCount = formatCount(count);
  const badgeColorClass = getBadgeColorClass(tab.value, count);

  // Clases memoizadas para el botón
  const buttonClasses = useMemo(() => cn(
    "flex flex-col items-center justify-center gap-1 h-auto text-xs font-medium w-full transition-all duration-200 relative",
    variant === 'compact' ? "py-2 px-1" : "py-3 px-2",
    isActive
      ? "bg-white dark:bg-slate-900 shadow-sm scale-105 text-slate-900 dark:text-slate-100"
      : "hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-102 text-slate-600 dark:text-slate-400"
  ), [isActive, variant]);

  // Clases memoizadas para el icono
  const iconClasses = useMemo(() => cn(
    "flex-shrink-0 transition-colors duration-200",
    variant === 'compact' ? "h-4 w-4" : "h-5 w-5"
  ), [variant]);

  // Clases memoizadas para el texto
  const textClasses = useMemo(() => cn(
    "truncate w-full transition-colors duration-200",
    variant === 'compact' ? "text-[10px]" : "text-xs"
  ), [variant]);

  return (
    <div className="relative">
      <Button
        variant={isActive ? "secondary" : "ghost"}
        size="sm"
        className={buttonClasses}
        onClick={onClick}
        aria-label={`${tab.label}${showBadge ? ` (${count} citas)` : ""}`}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon className={iconClasses} />
        <span className={textClasses}>
          {tab.shortLabel}
        </span>
      </Button>

      {/* Badge de conteo */}
      {showBadge && (
        <Badge
          className={cn(
            "absolute -top-1 -right-1 min-w-[1rem] text-[9px] px-1 rounded-full border-2 border-white dark:border-slate-800 transition-all duration-200",
            variant === 'compact' ? "h-4 text-[8px]" : "h-5 text-[10px]",
            badgeColorClass,
            "animate-in fade-in-0 zoom-in-95"
          )}
          aria-hidden="true"
        >
          {formattedCount}
        </Badge>
      )}

      {/* Indicador de loading */}
      {isLoading && tab.value !== "newPatient" && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
          <div className="h-1 w-4 bg-blue-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
});

TabButton.displayName = "TabButton";

<<<<<<< HEAD
=======
// Contenedor de tabs optimizado
const TabsContainer = memo<{
  variant: 'default' | 'compact';
  className?: string;
  children: React.ReactNode;
}>(({ variant, className, children }) => (
  <div 
    className={cn(
      "grid grid-cols-4 p-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl border mb-4 transition-all duration-200",
      variant === 'compact' ? "gap-1" : "gap-2",
      "hover:shadow-sm",
      className
    )}
    role="tablist"
    aria-label="Navegación de citas"
  >
    {children}
  </div>
));

TabsContainer.displayName = "TabsContainer";

// ==================== COMPONENTE PRINCIPAL ====================

>>>>>>> feature/nombre-de-la-feature
export const MobileTabs = memo<MobileTabsProps>(({
  activeTab,
  onTabChange,
  appointmentCounts,
  isLoading,
  className,
  variant = 'default'
}) => {
<<<<<<< HEAD
=======
  // Handler memoizado para cambio de tab
>>>>>>> feature/nombre-de-la-feature
  const handleTabClick = useCallback((tabValue: TabValue) => {
    if (tabValue !== activeTab && !isLoading) {
      onTabChange(tabValue);
    }
  }, [activeTab, onTabChange, isLoading]);

  // Memoizar la configuración de cada tab con sus conteos
  const tabsWithCounts = useMemo(() => {
    return TABS_CONFIG.map((tab) => {
      const count = tab.value === "newPatient" 
        ? 0 
        : appointmentCounts[tab.value as keyof typeof appointmentCounts] || 0;

      return {
        ...tab,
        count,
        isActive: activeTab === tab.value
      };
    });
  }, [activeTab, appointmentCounts]);

  // Renderizado optimizado de tabs
  const renderTabs = useCallback(() => {
    return tabsWithCounts.map((tabData) => (
      <TabButton
        key={tabData.value}
        tab={tabData}
        isActive={tabData.isActive}
        count={tabData.count}
        isLoading={isLoading}
        variant={variant}
        onClick={() => handleTabClick(tabData.value)}
      />
    ));
  }, [tabsWithCounts, isLoading, variant, handleTabClick]);

  return (
    <TabsContainer variant={variant} className={className}>
      {renderTabs()}
    </TabsContainer>
  );
});

MobileTabs.displayName = "MobileTabs";

// ==================== EXPORTS ADICIONALES ====================

// Hook personalizado para validar tabs
export const useTabValidation = (currentTab: TabValue) => {
  return useMemo(() => {
    const isValidTab = TAB_CONFIG_MAP.has(currentTab);
    const tabConfig = TAB_CONFIG_MAP.get(currentTab);
    
    return {
      isValid: isValidTab,
      config: tabConfig,
      fallbackTab: "today" as TabValue
    };
  }, [currentTab]);
};

// Función helper para obtener el siguiente tab
export const getNextTab = (currentTab: TabValue): TabValue => {
  const currentIndex = TABS_CONFIG.findIndex(tab => tab.value === currentTab);
  const nextIndex = (currentIndex + 1) % TABS_CONFIG.length;
  return TABS_CONFIG[nextIndex].value;
};

// Función helper para obtener el tab anterior
export const getPreviousTab = (currentTab: TabValue): TabValue => {
  const currentIndex = TABS_CONFIG.findIndex(tab => tab.value === currentTab);
  const prevIndex = currentIndex === 0 ? TABS_CONFIG.length - 1 : currentIndex - 1;
  return TABS_CONFIG[prevIndex].value;
};