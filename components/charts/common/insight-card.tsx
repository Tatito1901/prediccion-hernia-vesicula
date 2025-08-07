// ✅ ELIMINADO: InsightCard redundante - consolidado en StatsCard
// Este archivo ha sido eliminado para evitar duplicación de código
// Usar StatsCard desde '@/components/ui/stats-card' en su lugar

import { StatsCard } from '@/components/ui/stats-card';

// Re-exportamos StatsCard como InsightCard para compatibilidad
export const InsightCard = StatsCard;

// Tipo alias para compatibilidad
export interface InsightCardProps {
  title?: string;
  label: string;
  value: string | number;
  icon?: React.ComponentType<any> | React.ReactNode;
  color?: "blue" | "red" | "purple" | "emerald" | "amber" | "slate";
  trend?: string;
  isLoading?: boolean;
}
