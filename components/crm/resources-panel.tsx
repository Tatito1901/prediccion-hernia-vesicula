import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileIcon, FileTextIcon, LinkIcon, DownloadIcon, ExternalLinkIcon } from "lucide-react"

interface Resource {
  id: string
  title: string
  description: string
  type: "document" | "link" | "template"
  url: string
}

const salesResources: Resource[] = [
  {
    id: "1",
    title: "Guía de Objeciones",
    description: "Respuestas a objeciones comunes de pacientes",
    type: "document",
    url: "#",
  },
  {
    id: "2",
    title: "Calculadora de Costos",
    description: "Herramienta para estimar costos de procedimientos",
    type: "link",
    url: "#",
  },
  {
    id: "3",
    title: "Plantilla de Seguimiento",
    description: "Plantilla para llamadas de seguimiento",
    type: "template",
    url: "#",
  },
]

const medicalResources: Resource[] = [
  {
    id: "4",
    title: "Guía de Procedimientos",
    description: "Información detallada sobre procedimientos quirúrgicos",
    type: "document",
    url: "#",
  },
  {
    id: "5",
    title: "Estudios Clínicos",
    description: "Estudios recientes sobre tratamientos",
    type: "document",
    url: "#",
  },
]

const patientResources: Resource[] = [
  {
    id: "6",
    title: "Folleto Informativo",
    description: "Información para compartir con pacientes",
    type: "document",
    url: "#",
  },
  {
    id: "7",
    title: "Video Explicativo",
    description: "Video sobre el proceso quirúrgico",
    type: "link",
    url: "#",
  },
]

export function ResourcesPanel() {
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileTextIcon className="h-4 w-4" />
      case "link":
        return <LinkIcon className="h-4 w-4" />
      case "template":
        return <FileIcon className="h-4 w-4" />
      default:
        return <FileIcon className="h-4 w-4" />
    }
  }

  const renderResourceList = (resources: Resource[]) => {
    return (
      <div className="space-y-3">
        {resources.map((resource) => (
          <div key={resource.id} className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50">
            <div className="mt-0.5 rounded-md bg-primary/10 p-2">{getResourceIcon(resource.type)}</div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{resource.title}</h4>
                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                  <a href={resource.url} target="_blank" rel="noopener noreferrer">
                    {resource.type === "document" ? (
                      <DownloadIcon className="h-4 w-4" />
                    ) : (
                      <ExternalLinkIcon className="h-4 w-4" />
                    )}
                  </a>
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{resource.description}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recursos</CardTitle>
        <CardDescription>Documentos y herramientas útiles para el seguimiento</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sales">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="medical">Médicos</TabsTrigger>
            <TabsTrigger value="patient">Pacientes</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="mt-4">
            {renderResourceList(salesResources)}
          </TabsContent>
          <TabsContent value="medical" className="mt-4">
            {renderResourceList(medicalResources)}
          </TabsContent>
          <TabsContent value="patient" className="mt-4">
            {renderResourceList(patientResources)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
