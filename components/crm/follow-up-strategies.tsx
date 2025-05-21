"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CopyIcon, CheckIcon, ClockIcon, PhoneIcon, MailIcon, MessageSquareIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface Strategy {
  id: string
  title: string
  description: string
  steps: string[]
  tags: string[]
  type: "phone" | "email" | "whatsapp" | "mixed"
  timeframe: "immediate" | "short" | "medium" | "long"
}

const followUpStrategies: Strategy[] = [
  {
    id: "s1",
    title: "Seguimiento Post-Consulta",
    description: "Estrategia para pacientes recién consultados",
    steps: [
      "Llamar 24-48 horas después de la consulta para resolver dudas",
      "Enviar material informativo por correo electrónico",
      "Programar llamada de seguimiento en 7 días",
      "Ofrecer segunda opinión gratuita si hay dudas",
    ],
    tags: ["Recién consultado", "Alta prioridad"],
    type: "mixed",
    timeframe: "immediate",
  },
  {
    id: "s2",
    title: "Recuperación de Indecisos",
    description: "Para pacientes que han mostrado interés pero no se han decidido",
    steps: [
      "Llamar para identificar objeciones específicas",
      "Enviar testimonios de pacientes similares",
      "Ofrecer descuento por tiempo limitado",
      "Programar consulta de seguimiento gratuita",
    ],
    tags: ["Indeciso", "Media prioridad"],
    type: "phone",
    timeframe: "medium",
  },
  {
    id: "s3",
    title: "Seguimiento a Largo Plazo",
    description: "Para mantener contacto con pacientes que no están listos",
    steps: [
      "Enviar correo mensual con información educativa",
      "Llamar cada 3 meses para verificar estado",
      "Invitar a webinars o eventos educativos",
      "Ofrecer revisión anual gratuita",
    ],
    tags: ["Largo plazo", "Baja prioridad"],
    type: "email",
    timeframe: "long",
  },
  {
    id: "s4",
    title: "Seguimiento Urgente",
    description: "Para pacientes con condiciones que requieren atención inmediata",
    steps: [
      "Llamar inmediatamente para programar cita",
      "Enviar recordatorio por WhatsApp 24 horas antes",
      "Ofrecer opciones de transporte si es necesario",
      "Coordinar con seguro médico si aplica",
    ],
    tags: ["Urgente", "Alta prioridad"],
    type: "whatsapp",
    timeframe: "immediate",
  },
  {
    id: "s5",
    title: "Reactivación de Pacientes",
    description: "Para pacientes sin contacto por más de 3 meses",
    steps: [
      "Enviar correo preguntando por su estado actual",
      "Llamar para ofrecer evaluación gratuita",
      "Compartir nuevas opciones de tratamiento",
      "Ofrecer descuento por reactivación",
    ],
    tags: ["Reactivación", "Media prioridad"],
    type: "mixed",
    timeframe: "short",
  },
]

export function FollowUpStrategies() {
  const [activeTab, setActiveTab] = useState("all")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopySteps = (strategy: Strategy) => {
    const stepsText = strategy.steps.map((step, index) => `${index + 1}. ${step}`).join("\n")
    navigator.clipboard.writeText(stepsText)
    setCopiedId(strategy.id)
    toast.success("Pasos copiados al portapapeles")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "phone":
        return <PhoneIcon className="h-4 w-4" />
      case "email":
        return <MailIcon className="h-4 w-4" />
      case "whatsapp":
        return <MessageSquareIcon className="h-4 w-4" />
      case "mixed":
        return <MessageSquareIcon className="h-4 w-4" />
      default:
        return <MessageSquareIcon className="h-4 w-4" />
    }
  }

  const getTimeframeLabel = (timeframe: string) => {
    switch (timeframe) {
      case "immediate":
        return "Inmediato"
      case "short":
        return "Corto plazo"
      case "medium":
        return "Mediano plazo"
      case "long":
        return "Largo plazo"
      default:
        return timeframe
    }
  }

  const filteredStrategies = followUpStrategies.filter((strategy) => {
    if (activeTab === "all") return true
    if (activeTab === "immediate") return strategy.timeframe === "immediate"
    if (activeTab === "short") return strategy.timeframe === "short"
    if (activeTab === "medium") return strategy.timeframe === "medium"
    if (activeTab === "long") return strategy.timeframe === "long"
    return true
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Estrategias de Seguimiento
        </CardTitle>
        <CardDescription>Protocolos recomendados para diferentes tipos de pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="immediate">Inmediatas</TabsTrigger>
            <TabsTrigger value="short">Corto</TabsTrigger>
            <TabsTrigger value="medium">Medio</TabsTrigger>
            <TabsTrigger value="long">Largo</TabsTrigger>
          </TabsList>
          <div className="mt-4 space-y-4">
            {filteredStrategies.map((strategy) => (
              <div key={strategy.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{strategy.title}</h3>
                      <div className="flex items-center gap-1">
                        {getTypeIcon(strategy.type)}
                        <Badge variant="outline" className="ml-1">
                          {getTimeframeLabel(strategy.timeframe)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopySteps(strategy)}>
                    {copiedId === strategy.id ? (
                      <CheckIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <CopyIcon className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Pasos:</div>
                  <ol className="text-sm space-y-1 pl-5 list-decimal">
                    {strategy.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {strategy.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
