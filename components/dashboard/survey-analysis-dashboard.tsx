import React from "react";

interface SurveyAnalysisDashboardProps {
  title?: string;
  description?: string;
}

/**
 * Lightweight placeholder so the project builds.
 * Replace with full implementation when ready.
 */
export function SurveyAnalysisDashboard({ title = "Dashboard", description }: SurveyAnalysisDashboardProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {description && <p className="text-muted-foreground">{description}</p>}
      <p className="text-sm text-muted-foreground">(Componente en construcción)</p>
    </div>
  );
}
