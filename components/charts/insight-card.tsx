import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DiagnosticInsight } from './types';

interface InsightCardProps {
  insight: DiagnosticInsight;
}

const icons = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  critical: <ShieldAlert className="h-4 w-4" />,
};

export const InsightCard: React.FC<InsightCardProps> = ({ insight }) => (
  <Alert>
    {icons[insight.level]}
    <AlertTitle>{insight.title}</AlertTitle>
    <AlertDescription>{insight.description}</AlertDescription>
  </Alert>
);
