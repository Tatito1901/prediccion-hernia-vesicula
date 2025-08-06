// components/ui/empty-state.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ title, description, icon, actionText, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("text-center py-16 px-6", className)}>
      <Card className="max-w-md mx-auto border-0 shadow-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900">
        <CardContent className="p-8 flex flex-col items-center justify-center">
          {icon && (
            <div className="relative mb-6">
              <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center shadow-lg">
                {icon}
              </div>
            </div>
          )}
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-3">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{description}</p>
          {actionText && onAction && (
            <Button onClick={onAction} variant="outline" className="mt-4">
              {actionText}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
