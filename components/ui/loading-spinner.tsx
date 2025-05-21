import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: number | "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const getSize = () => {
    if (typeof size === "number") return size
    if (size === "sm") return 16
    if (size === "lg") return 32
    return 24 // md is default
  }

  return <Loader2 className={cn("animate-spin", className)} size={getSize()} />
}
