"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-full text-center flex flex-col items-center justify-center gap-3",
        className
      )}
      aria-live="polite"
      role="status"
    >
      {icon && (
        <div className="rounded-full bg-slate-100 dark:bg-slate-800/50 p-4 w-16 h-16 flex items-center justify-center">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
          {description}
        </p>
      )}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

export default EmptyState
