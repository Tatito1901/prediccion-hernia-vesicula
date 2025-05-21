import { Loader2 } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface LoadingSpinnerProps {
  size?: number | string
  className?: string
}

export function LoadingSpinner({ size = 24, className }: LoadingSpinnerProps) {
  return <Loader2 className={cn("animate-spin text-blue-600 dark:text-blue-400", className)} size={size} />
}

export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <LoadingSpinner size={40} />
      <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p>
    </div>
  )
}
