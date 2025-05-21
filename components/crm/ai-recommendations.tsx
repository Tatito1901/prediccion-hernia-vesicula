"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BrainCircuitIcon, CopyIcon, MessageSquareIcon, SparklesIcon, ThumbsUpIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { PatientData } from "@/app/dashboard/data-model"

interface AiRecommendationsProps {
  patient?: PatientData
}

interface Recommendation {
  id: string
  text: string
  type: "follow_up" | "objection" | "script"
  tags: string[]
}

// Recomendaciones generales
const generalRecommendations: Recommendation[] = [
  {
    id: "g1",
    text: "Programar seguimientos en intervalos de 2 semanas para pacientes indecisos.",
    type: "follow_up",
    tags: ["Indeciso", "Seguimiento"],
  },
  {
    id: "g2",
    text: "Para pacientes preocupados por el costo, enfatizar el valor a largo plazo y opciones de financiamiento.",
    type: "objection",
    tags: ["Costo", "Financiamiento"],
  },
  {
    id: "g3",
    text: "Compartir testimonios de pacientes satisfechos con aquellos que expresan miedo al procedimiento.",
    type: "script",
    tags: ["Miedo", "Testimonios"],
  },
]

// Recomendaciones específicas para pacientes
const getPatientRecommendations = (patient?: PatientData): Recommendation[] => {
  if (!patient) return []

  const recommendations: Recommendation[] = []

  // Basado en la probabilidad de cirugía
  if (patient.probabilidadCirugia >= 0.7) {
    recommendations.push({
      id: "p1",
      text: `Alta probabilidad de cirugía (${(patient.probabilidadCirugia * 100).toFixed(
        0,
      )}%). Enfatizar experiencia del equipo médico y seguridad del procedimiento.`,
      type: "script",
      tags: ["Alta Probabilidad", "Seguridad"],
    })
  } else if (patient.probabilidadCirugia >= 0.4) {
    recommendations.push({
      id: "p2",
      text: `Probabilidad media de cirugía (${(patient.probabilidadCirugia * 100).toFixed(
        0,
      )}%). Enfocarse en resolver sus principales preocupaciones.`,
      type: "follow_up",
      tags: ["Probabilidad Media", "Preocupaciones"],
    })
  } else {
    recommendations.push({
      id: "p3",
      text: `Baja probabilidad de cirugía (${(patient.probabilidadCirugia * 100).toFixed(
        0,
      )}%). Explicar riesgos de no operarse a largo plazo.`,
      type: "script",
      tags: ["Baja Probabilidad", "Riesgos"],
    })
  }

  // Basado en el diagnóstico
  if (patient.diagnostico === "Hernia Inguinal") {
    recommendations.push({
      id: "p4",
      text: "Para pacientes con hernia inguinal, enfatizar que la condición tiende a empeorar con el tiempo y puede llevar a complicaciones si no se trata.",
      type: "script",
      tags: ["Hernia Inguinal", "Complicaciones"],
    })
  } else if (patient.diagnostico === "Vesícula") {
    recommendations.push({
      id: "p5",
      text: "Para pacientes con problemas de vesícula, mencionar que los episodios de dolor suelen aumentar en frecuencia e intensidad sin tratamiento.",
      type: "script",
      tags: ["Vesícula", "Dolor"],
    })
  }

  // Basado en preocupaciones del paciente
  if (patient.encuesta?.preocupacionesCirugia?.includes("Tiempo de recuperación")) {
    recommendations.push({
      id: "p6",
      text: "Este paciente está preocupado por el tiempo de recuperación. Enfatizar recuperación rápida y protocolo post-operatorio.",
      type: "objection",
      tags: ["Recuperación", "Tiempo"],
    })
  }

  if (patient.encuesta?.preocupacionesCirugia?.includes("Miedo al procedimiento")) {
    recommendations.push({
      id: "p7",
      text: "Este paciente tiene miedo al procedimiento. Compartir testimonios de pacientes satisfechos y explicar detalladamente el proceso para reducir ansiedad.",
      type: "objection",
      tags: ["Miedo", "Ansiedad"],
    })
  }

  return recommendations
}

export function AiRecommendations({ patient }: AiRecommendationsProps) {
  const [activeTab, setActiveTab] = useState("patient")
  const patientRecommendations = getPatientRecommendations(patient)

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Texto copiado al portapapeles")
  }

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "follow_up":
        return <MessageSquareIcon className="h-4 w-4" />
      case "objection":
        return <ThumbsUpIcon className="h-4 w-4" />
      case "script":
        return <SparklesIcon className="h-4 w-4" />
      default:
        return <SparklesIcon className="h-4 w-4" />
    }
  }

  const renderRecommendationList = (recommendations: Recommendation[]) => {
    if (recommendations.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <BrainCircuitIcon className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No hay recomendaciones disponibles</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecciona un paciente para ver recomendaciones personalizadas
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-md bg-primary/10 p-2">{getRecommendationIcon(rec.type)}</div>
                <div className="space-y-1">
                  <p>{rec.text}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {rec.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => handleCopyText(rec.text)}
              >
                <CopyIcon className="h-4 w-4" />
                <span className="sr-only">Copiar texto</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BrainCircuitIcon className="h-5 w-5" />
            Recomendaciones IA
          </CardTitle>
          <CardDescription>Sugerencias inteligentes para mejorar el seguimiento</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="patient" disabled={!patient}>
              {patient ? "Paciente Actual" : "Selecciona un Paciente"}
            </TabsTrigger>
            <TabsTrigger value="general">Generales</TabsTrigger>
          </TabsList>
          <TabsContent value="patient" className="mt-4 min-h-[300px]">
            {renderRecommendationList(patientRecommendations)}
          </TabsContent>
          <TabsContent value="general" className="mt-4 min-h-[300px]">
            {renderRecommendationList(generalRecommendations)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
