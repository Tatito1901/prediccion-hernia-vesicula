"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  CalendarIcon,
  CheckIcon,
  MailIcon,
  MessageSquareIcon,
  MoreVerticalIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { FollowUp, PatientData } from "@/app/dashboard/data-model"

interface FollowUpItemProps {
  followUp: FollowUp
  patient: PatientData
  onStatusChange: (id: number, status: "Completado" | "Cancelado" | "Programado") => void
  onEdit: (followUp: FollowUp) => void
}

export function FollowUpItem({ followUp, patient, onStatusChange, onEdit }: FollowUpItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Function to get the icon based on follow-up type
  const getFollowUpIcon = (tipo: string) => {
    switch (tipo) {
      case "Llamada":
        return <PhoneIcon className="h-4 w-4" />
      case "Email":
        return <MailIcon className="h-4 w-4" />
      case "WhatsApp":
        return <MessageSquareIcon className="h-4 w-4" />
      case "Consulta":
        return <UserIcon className="h-4 w-4" />
      default:
        return <CalendarIcon className="h-4 w-4" />
    }
  }

  // Function to get badge color class based on result
  const getResultBadgeClass = (resultado: string) => {
    switch (resultado) {
      case "Interesado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "No interesado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "Indeciso":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
    }
  }

  // Function to get status badge color
  const getStatusBadgeClass = (estado: string) => {
    switch (estado) {
      case "Completado":
        return "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
      case "Cancelado":
        return "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
      case "Programado":
        return "bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
    }
  }

  // Handle marking follow-up as complete
  const handleComplete = () => {
    onStatusChange(followUp.id, "Completado")
    toast.success("Seguimiento marcado como completado")
  }

  // Handle canceling follow-up
  const handleCancel = () => {
    onStatusChange(followUp.id, "Cancelado")
    toast.info("Seguimiento cancelado")
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Check if follow-up is due today
  const isToday = (dateString: string) => {
    const today = new Date()
    const followUpDate = new Date(dateString)
    return (
      followUpDate.getDate() === today.getDate() &&
      followUpDate.getMonth() === today.getMonth() &&
      followUpDate.getFullYear() === today.getFullYear()
    )
  }

  // Check if follow-up is overdue
  const isOverdue = (dateString: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const followUpDate = new Date(dateString)
    followUpDate.setHours(0, 0, 0, 0)
    return followUpDate < today
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200 hover:shadow-md",
        isToday(followUp.fecha) && "border-blue-300 dark:border-blue-800",
        isOverdue(followUp.fecha) && followUp.estado === "Programado" && "border-red-300 dark:border-red-800",
      )}
    >
      <div className="flex gap-4 p-4">
        <Avatar className="h-10 w-10 bg-primary/10">
          <AvatarFallback className="text-primary font-medium">
            {patient.nombre.charAt(0)}
            {patient.apellidos.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h4 className="font-medium">
                {patient.nombre} {patient.apellidos}
              </h4>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={getStatusBadgeClass(followUp.estado)}>
                  {followUp.estado}
                </Badge>
                {isToday(followUp.fecha) && (
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400">
                    Hoy
                  </Badge>
                )}
                {isOverdue(followUp.fecha) && followUp.estado === "Programado" && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400">
                    Atrasado
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1">
                      {getFollowUpIcon(followUp.tipo)}
                      <span className="hidden sm:inline">{followUp.tipo}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Tipo: {followUp.tipo}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVerticalIcon className="h-4 w-4" />
                    <span className="sr-only">Acciones</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onEdit(followUp)}>Editar seguimiento</DropdownMenuItem>
                  {followUp.estado === "Programado" && (
                    <>
                      <DropdownMenuItem onClick={handleComplete}>
                        <CheckIcon className="mr-2 h-4 w-4" />
                        Marcar como completado
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleCancel}>Cancelar seguimiento</DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                <span>{formatDate(followUp.fecha)}</span>
              </div>
              <Badge variant="outline" className={getResultBadgeClass(followUp.resultado)}>
                {followUp.resultado}
              </Badge>
              <span className="text-xs">Asignado a: {followUp.asignadoA}</span>
            </div>
          </div>

          <div className={cn("overflow-hidden transition-all duration-300", isExpanded ? "max-h-40" : "max-h-10")}>
            <p className="text-sm">{followUp.notas}</p>
          </div>

          {followUp.notas.length > 100 && (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? "Ver menos" : "Ver más"}
            </Button>
          )}

          {followUp.proximoSeguimiento && followUp.estado === "Programado" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              <span>Próximo seguimiento: {formatDate(followUp.proximoSeguimiento)}</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
