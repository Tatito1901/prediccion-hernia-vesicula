import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ChartWrapperProps {
  title: string;
  isLoading?: boolean;
  children: React.ReactNode;
}

export const ChartWrapper: React.FC<ChartWrapperProps> = ({ title, isLoading = false, children }) => {
  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card text-card-foreground">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {isLoading ? (
        <Skeleton className="h-[350px] w-full" />
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
};
