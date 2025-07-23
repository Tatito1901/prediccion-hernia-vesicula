import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface InsightCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const InsightCard: React.FC<InsightCardProps> = ({ title, value, icon, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-8 w-1/2" />
      </div>
    );
  }
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
};
