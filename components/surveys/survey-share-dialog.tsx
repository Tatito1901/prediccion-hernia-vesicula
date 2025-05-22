"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Share2, Smartphone, Tablet } from "lucide-react"
import { toast } from "sonner"

interface SurveyShareDialogProps {
  isOpen: boolean
  patient: any
  surveyLink: string
  onStartInternal: () => void
  onClose: () => void
}

export function SurveyShareDialog({ isOpen, patient, surveyLink, onStartInternal, onClose }: SurveyShareDialogProps) {
  const [activeTab, setActiveTab] = useState("qr")

  const handleCopyLink = () => {
    navigator.clipboard.writeText(surveyLink)
    toast.success("Enlace copiado al portapapeles")
  }

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola ${patient.nombre}, complete esta encuesta para su próxima consulta en la Clínica de Hernia y Vesícula: ${surveyLink}`,
    )
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir Encuesta</DialogTitle>
          <DialogDescription>
            Comparta la encuesta con {patient?.nombre} {patient?.apellidos} usando alguno de estos métodos.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="qr" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="qr">
              <div className="flex items-center">
                <Share2 className="mr-2 h-4 w-4" />
                Código QR
              </div>
            </TabsTrigger>
            <TabsTrigger value="link">
              <div className="flex items-center">
                <Smartphone className="mr-2 h-4 w-4" />
                Enlace
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="qr" className="flex flex-col items-center justify-center p-4">
            <div className="bg-card text-card-foreground p-4 rounded-lg mb-4">
              <QRCodeSVG value={surveyLink} size={200} />
            </div>
            <p className="text-sm text-center text-muted-foreground mb-4">
              Escanee este código QR con la cámara del dispositivo para acceder a la encuesta.
            </p>
          </TabsContent>

          <TabsContent value="link" className="p-4">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={surveyLink}
                  readOnly
                  className="flex-1 p-2 border rounded-md text-sm bg-muted"
                />
                <Button size="sm" variant="outline" onClick={handleCopyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-col space-y-2">
                <Button onClick={handleShareWhatsApp} className="w-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-2"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Compartir por WhatsApp
                </Button>
                <Button variant="secondary" onClick={onStartInternal} className="w-full">
                  <Tablet className="mr-2 h-4 w-4" />
                  Comenzar encuesta yo mismo
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
