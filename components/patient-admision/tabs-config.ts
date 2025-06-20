// tabs-config.ts - Versión optimizada
import { UserRoundPlus, CalendarCheck, CalendarClock, History } from "lucide-react";

export type TabValue = "newPatient" | "today" | "future" | "past";

// Configuración estática como constante para evitar recreaciones
export const TABS_CONFIG = [
  { 
    value: "newPatient" as const, 
    label: "Nuevo Paciente", 
    icon: UserRoundPlus, 
    shortLabel: "Nuevo" 
  },
  { 
    value: "today" as const, 
    label: "Citas de Hoy", 
    icon: CalendarCheck, 
    shortLabel: "Hoy" 
  },
  { 
    value: "future" as const, 
    label: "Citas Futuras", 
    icon: CalendarClock, 
    shortLabel: "Futuras" 
  },
  { 
    value: "past" as const, 
    label: "Historial", 
    icon: History, 
    shortLabel: "Pasadas" 
  },
] as const;

// Type helper para extraer valores de tabs
export type TabConfig = typeof TABS_CONFIG[number];

// Map para búsqueda rápida O(1) de configuración por valor
export const TAB_CONFIG_MAP = new Map(
  TABS_CONFIG.map(tab => [tab.value, tab])
);

// Helper para obtener configuración de tab
export const getTabConfig = (value: TabValue): TabConfig | undefined => {
  return TAB_CONFIG_MAP.get(value);
};

// Helper para obtener el índice de un tab
export const getTabIndex = (value: TabValue): number => {
  return TABS_CONFIG.findIndex(tab => tab.value === value);
};

// Helper para validar si un valor es un tab válido
export const isValidTab = (value: string): value is TabValue => {
  return TAB_CONFIG_MAP.has(value as TabValue);
};