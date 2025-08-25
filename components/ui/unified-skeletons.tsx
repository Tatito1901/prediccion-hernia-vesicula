import * as React from "react";

export type LoadingSpinnerSize = "sm" | "md" | "lg";

export interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: LoadingSpinnerSize;
}

const sizeMap: Record<LoadingSpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
};

export function LoadingSpinner({ size = "md", className = "", ...props }: LoadingSpinnerProps) {
  const sizeClasses = sizeMap[size] || sizeMap.md;
  return (
    <div className={`inline-flex items-center justify-center ${className}`} {...props}>
      <span
        className={`animate-spin rounded-full border-current border-t-transparent ${sizeClasses}`}
        aria-label="Cargando"
        role="status"
      />
    </div>
  );
}
