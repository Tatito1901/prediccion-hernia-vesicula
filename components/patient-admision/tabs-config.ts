// tabs-config.ts - Versión refactorizada y optimizada
import { UserRoundPlus, CalendarCheck, CalendarClock, History } from "lucide-react";

// ==================== TIPOS OPTIMIZADOS ====================

export type TabValue = "newPatient" | "today" | "future" | "past";

// Interfaz extendida para configuración de tabs
export interface TabConfig {
  readonly value: TabValue;
  readonly label: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly shortLabel: string;
  readonly color: string;
  readonly priority: number; // Para ordenamiento
  readonly hasCount: boolean; // Si muestra contador
  readonly description: string; // Para accesibilidad
}

// ==================== CONFIGURACIÓN PRINCIPAL ====================

// Configuración estática optimizada e inmutable
export const TABS_CONFIG: readonly TabConfig[] = [
  { 
    value: "newPatient" as const, 
    label: "Nuevo Paciente", 
    icon: UserRoundPlus, 
    shortLabel: "Nuevo",
    color: "blue",
    priority: 1,
    hasCount: false,
    description: "Registrar un nuevo paciente en el sistema"
  },
  { 
    value: "today" as const, 
    label: "Citas de Hoy", 
    icon: CalendarCheck, 
    shortLabel: "Hoy",
    color: "green", 
    priority: 2,
    hasCount: true,
    description: "Ver citas programadas para el día actual"
  },
  { 
    value: "future" as const, 
    label: "Citas Futuras", 
    icon: CalendarClock, 
    shortLabel: "Futuras",
    color: "purple",
    priority: 3,
    hasCount: true,
    description: "Ver citas programadas para fechas futuras"
  },
  { 
    value: "past" as const, 
    label: "Historial", 
    icon: History, 
    shortLabel: "Pasadas",
    color: "slate",
    priority: 4,
    hasCount: true,
    description: "Ver historial de citas anteriores"
  },
] as const;

// ==================== UTILIDADES OPTIMIZADAS ====================

// Map optimizado para búsqueda rápida O(1) de configuración por valor
export const TAB_CONFIG_MAP = new Map<TabValue, TabConfig>(
  TABS_CONFIG.map(tab => [tab.value, tab])
);

// Set para validación rápida de tabs válidos
export const VALID_TABS = new Set<TabValue>(
  TABS_CONFIG.map(tab => tab.value)
);

// Array de tabs que muestran contadores
export const TABS_WITH_COUNTS = TABS_CONFIG.filter(tab => tab.hasCount);

// Array de valores de tabs (para iteración)
export const TAB_VALUES = TABS_CONFIG.map(tab => tab.value);

// ==================== FUNCIONES HELPER OPTIMIZADAS ====================

/**
 * Obtiene la configuración de un tab por su valor
 * @param value - Valor del tab
 * @returns Configuración del tab o undefined si no existe
 */
export const getTabConfig = (value: TabValue): TabConfig | undefined => {
  return TAB_CONFIG_MAP.get(value);
};

/**
 * Obtiene la configuración de un tab con fallback
 * @param value - Valor del tab
 * @param fallback - Tab por defecto si no se encuentra
 * @returns Configuración del tab
 */
export const getTabConfigSafe = (value: TabValue, fallback: TabValue = "today"): TabConfig => {
  return TAB_CONFIG_MAP.get(value) || TAB_CONFIG_MAP.get(fallback)!;
};

/**
 * Obtiene el índice de un tab en la configuración
 * @param value - Valor del tab
 * @returns Índice del tab o -1 si no se encuentra
 */
export const getTabIndex = (value: TabValue): number => {
  return TABS_CONFIG.findIndex(tab => tab.value === value);
};

/**
 * Valida si un valor es un tab válido
 * @param value - Valor a validar
 * @returns true si es un tab válido
 */
export const isValidTab = (value: string): value is TabValue => {
  return VALID_TABS.has(value as TabValue);
};

/**
 * Obtiene el siguiente tab en la secuencia
 * @param currentTab - Tab actual
 * @returns Siguiente tab en la secuencia
 */
export const getNextTab = (currentTab: TabValue): TabValue => {
  const currentIndex = getTabIndex(currentTab);
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % TABS_CONFIG.length;
  return TABS_CONFIG[nextIndex].value;
};

/**
 * Obtiene el tab anterior en la secuencia
 * @param currentTab - Tab actual
 * @returns Tab anterior en la secuencia
 */
export const getPreviousTab = (currentTab: TabValue): TabValue => {
  const currentIndex = getTabIndex(currentTab);
  const prevIndex = currentIndex === -1 
    ? TABS_CONFIG.length - 1 
    : currentIndex === 0 
      ? TABS_CONFIG.length - 1 
      : currentIndex - 1;
  return TABS_CONFIG[prevIndex].value;
};

/**
 * Filtra tabs por criterios específicos
 * @param predicate - Función de filtrado
 * @returns Array de tabs filtrados
 */
export const filterTabs = (predicate: (tab: TabConfig) => boolean): readonly TabConfig[] => {
  return TABS_CONFIG.filter(predicate);
};

/**
 * Obtiene tabs que muestran contadores
 * @returns Array de tabs con contadores
 */
export const getTabsWithCounts = (): readonly TabConfig[] => {
  return TABS_WITH_COUNTS;
};

/**
 * Obtiene tabs ordenados por prioridad
 * @returns Array de tabs ordenados
 */
export const getTabsByPriority = (): readonly TabConfig[] => {
  return [...TABS_CONFIG].sort((a, b) => a.priority - b.priority);
};

/**
 * Busca tabs por label (insensible a mayúsculas)
 * @param searchTerm - Término de búsqueda
 * @returns Array de tabs que coinciden
 */
export const searchTabs = (searchTerm: string): readonly TabConfig[] => {
  const term = searchTerm.toLowerCase();
  return TABS_CONFIG.filter(tab => 
    tab.label.toLowerCase().includes(term) || 
    tab.shortLabel.toLowerCase().includes(term)
  );
};

// ==================== CONFIGURACIONES DE ESTILO ====================

/**
 * Obtiene las clases CSS para un tab basado en su estado
 * @param tabValue - Valor del tab
 * @param isActive - Si el tab está activo
 * @param variant - Variante de estilo
 * @returns Objeto con clases CSS
 */
export const getTabStyles = (
  tabValue: TabValue, 
  isActive: boolean, 
  variant: 'default' | 'compact' = 'default'
) => {
  const config = getTabConfig(tabValue);
  const baseColor = config?.color || 'blue';
  
  return {
    container: isActive 
      ? `bg-white dark:bg-slate-900 shadow-sm scale-105` 
      : `hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-102`,
    
    icon: variant === 'compact' ? 'h-4 w-4' : 'h-5 w-5',
    
    text: variant === 'compact' ? 'text-[10px]' : 'text-xs',
    
    badge: `bg-${baseColor}-600 text-white`,
    
    loading: `bg-${baseColor}-500`
  };
};

/**
 * Obtiene el color del badge para un tab
 * @param tabValue - Valor del tab
 * @param count - Conteo de elementos
 * @returns Clase CSS del color
 */
export const getBadgeColor = (tabValue: TabValue, count: number): string => {
  if (count === 0) return "bg-slate-400";
  
  const config = getTabConfig(tabValue);
  return `bg-${config?.color || 'blue'}-600`;
};

// ==================== CONSTANTES DE EXPORTACIÓN ====================

// Exportar valores comunes para facilitar su uso
export const DEFAULT_TAB: TabValue = "today";
export const TABS_COUNT = TABS_CONFIG.length;
export const TABS_WITH_COUNTS_COUNT = TABS_WITH_COUNTS.length;

// Exportar tipos para uso externo
export type { TabConfig };

// ==================== VALIDACIÓN EN TIEMPO DE COMPILACIÓN ====================

// Verificación de integridad de la configuración
const _verifyConfig = (): void => {
  // Verificar que todos los valores sean únicos
  const values = TABS_CONFIG.map(tab => tab.value);
  const uniqueValues = new Set(values);
  if (values.length !== uniqueValues.size) {
    throw new Error("Duplicate tab values found in TABS_CONFIG");
  }
  
  // Verificar que todas las prioridades sean únicas
  const priorities = TABS_CONFIG.map(tab => tab.priority);
  const uniquePriorities = new Set(priorities);
  if (priorities.length !== uniquePriorities.size) {
    throw new Error("Duplicate priorities found in TABS_CONFIG");
  }
};

// Ejecutar verificación en desarrollo
if (process.env.NODE_ENV === 'development') {
  _verifyConfig();
}