"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, SearchIcon, UsersIcon } from "lucide-react"

interface EmptyStateProps {
  type: "no-followups" | "no-results" | "no-patients"
  onAction?: () => void
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const content = {
    "no-followups": {
      icon: <CalendarIcon className="h-12 w-12 text-muted-foreground" />,
      title: "No hay seguimientos",
      description: "No se han registrado seguimientos para este paciente.",
      actionText: "Crear Seguimiento",
    },
    "no-results": {
      icon: <SearchIcon className="h-12 w-12 text-muted-foreground" />,
      title: "No se encontraron resultados",
      description: "Intente con otros criterios de búsqueda o filtros.",
      actionText: "Limpiar Filtros",
    },
    "no-patients": {
      icon: <UsersIcon className="h-12 w-12 text-muted-foreground" />,
      title: "No hay pacientes",
      description: "No se han registrado pacientes en el sistema.",
      actionText: "Registrar Paciente",
    },
  }

  const { icon, title, description, actionText } = content[type]

  return (
    <Card className="w-full border-dashed">
      <CardHeader className="flex flex-col items-center justify-center pt-6">
        {icon}
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
        <CardDescription className="text-center">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center pb-6">
        {onAction && <Button onClick={onAction}>{actionText}</Button>}
      </CardContent>
    </Card>
  )
}
