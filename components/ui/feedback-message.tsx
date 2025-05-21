"use client"

import type React from "react"

import { AlertCircle, CheckCircle, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { X } from "lucide-react"
import { useState, useEffect } from "react"

interface FeedbackMessageProps {
  type: "success" | "error" | "info" | "warning"
  title?: string
  message: string
  className?: string
  icon?: React.ReactNode
  dismissible?: boolean
  autoClose?: boolean
  autoCloseTime?: number
  onClose?: () => void
}

export function FeedbackMessage({
  type,
  title,
  message,
  className,
  icon,
  dismissible = true,
  autoClose = false,
  autoCloseTime = 5000,
  onClose,
}: FeedbackMessageProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, autoCloseTime)

      return () => clearTimeout(timer)
    }
  }, [autoClose, autoCloseTime, onClose])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  const getIcon = () => {
    if (icon) return icon

    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getContainerClass = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900"
      case "error":
        return "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900"
      case "warning":
        return "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-900"
      case "info":
      default:
        return "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-900"
    }
  }

  return (
    <div className={cn("rounded-md border p-4 animate-fadeIn", getContainerClass(), className)}>
      <div className="flex items-start">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="ml-3 flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          <div className={cn("text-sm", title ? "mt-1" : "")}>{message}</div>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose}>
              <span className="sr-only">Cerrar</span>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
