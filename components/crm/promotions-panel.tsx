"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PercentIcon, CalendarIcon, CopyIcon, CheckIcon, TagIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface Promotion {
  id: string
  title: string
  description: string
  discountType: "percentage" | "fixed" | "free"
  discountValue: string
  validUntil: string
  conditions: string[]
  applicableTo: string[]
  code: string
  status: "active" | "upcoming" | "expired"
}

const promotions: Promotion[] = [
  {
    id: "p1",
    title: "Descuento Primera Cirugía",
    description: "15% de descuento para pacientes de primera cirugía",
    discountType: "percentage",
    discountValue: "15%",
    validUntil: "2023-12-31",
    conditions: ["Válido solo para pacientes nuevos", "No acumulable con otros descuentos"],
    applicableTo: ["Hernia Inguinal", "Hernia Umbilical", "Vesícula"],
    code: "PRIMERA15",
    status: "active",
  },
  {
    id: "p2",
    title: "Paquete Familiar",
    description: "20% de descuento para familiares directos",
    discountType: "percentage",
    discountValue: "20%",
    validUntil: "2023-12-31",
    conditions: ["Requiere comprobante de parentesco", "Máximo 3 familiares"],
    applicableTo: ["Todas las cirugías"],
    code: "FAMILIA20",
    status: "active",
  },
  {
    id: "p3",
    title: "Consulta Pre-Quirúrgica Gratuita",
    description: "Consulta de valoración sin costo",
    discountType: "free",
    discountValue: "100%",
    validUntil: "2023-10-31",
    conditions: ["Una consulta por paciente", "Sujeto a disponibilidad"],
    applicableTo: ["Todas las especialidades"],
    code: "CONSULTA0",
    status: "active",
  },
  {
    id: "p4",
    title: "Descuento Adulto Mayor",
    description: "25% de descuento para pacientes mayores de 60 años",
    discountType: "percentage",
    discountValue: "25%",
    validUntil: "2023-12-31",
    conditions: ["Requiere identificación oficial", "No acumulable con otros descuentos"],
    applicableTo: ["Todas las cirugías"],
    code: "SENIOR25",
    status: "active",
  },
  {
    id: "p5",
    title: "Promoción Navideña",
    description: "30% de descuento en cirugías programadas para enero",
    discountType: "percentage",
    discountValue: "30%",
    validUntil: "2023-12-25",
    conditions: ["Debe agendarse antes del 25 de diciembre", "Cirugía debe realizarse en enero"],
    applicableTo: ["Hernia Inguinal", "Hernia Umbilical", "Vesícula"],
    code: "NAVIDAD30",
    status: "upcoming",
  },
]

export function PromotionsPanel() {
  const [activeTab, setActiveTab] = useState("active")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    toast.success("Código copiado al portapapeles")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>
      case "upcoming":
        return <Badge className="bg-blue-100 text-blue-800">Próxima</Badge>
      case "expired":
        return <Badge className="bg-red-100 text-red-800">Expirada</Badge>
      default:
        return null
    }
  }

  const filteredPromotions = promotions.filter((promo) => {
    if (activeTab === "all") return true
    return promo.status === activeTab
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TagIcon className="h-5 w-5" />
          Promociones Disponibles
        </CardTitle>
        <CardDescription>Descuentos y ofertas para ofrecer a pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="upcoming">Próximas</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
          <div className="mt-4 space-y-4">
            {filteredPromotions.map((promotion) => (
              <div key={promotion.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{promotion.title}</h3>
                      {getStatusBadge(promotion.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{promotion.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <PercentIcon className="h-3 w-3" />
                      {promotion.discountValue}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 h-8"
                      onClick={() => handleCopyCode(promotion.code, promotion.id)}
                    >
                      {promotion.code}
                      {copiedId === promotion.id ? (
                        <CheckIcon className="h-3 w-3 text-green-500" />
                      ) : (
                        <CopyIcon className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="mt-3 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    <span>Válido hasta: {formatDate(promotion.validUntil)}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Condiciones:</div>
                  <ul className="text-sm space-y-1 pl-5 list-disc">
                    {promotion.conditions.map((condition, index) => (
                      <li key={index}>{condition}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-medium mb-1">Aplicable a:</div>
                  <div className="flex flex-wrap gap-1">
                    {promotion.applicableTo.map((item) => (
                      <Badge key={item} variant="secondary" className="text-xs">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}
