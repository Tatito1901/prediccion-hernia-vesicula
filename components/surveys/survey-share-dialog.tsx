"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from "qrcode.react"
import { Copy, Share2, Smartphone, Tablet, CheckCircle2, ExternalLink } from "lucide-react"
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
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(surveyLink)
      setCopied(true)
      toast.success("Enlace copiado al portapapeles")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Error al copiar el enlace")
    }
  }

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola ${patient.nombre}, complete esta encuesta para su próxima consulta en la Clínica de Hernia y Vesícula: ${surveyLink}`,
    )
    window.open(`https://wa.me/?text=${message}`, "_blank")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-semibold text-foreground">
            Compartir Encuesta
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            Envíe la encuesta a <span className="font-medium text-foreground">{patient?.nombre} {patient?.apellidos}</span> usando uno de estos métodos
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <Tabs defaultValue="qr" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50">
              <TabsTrigger value="qr" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Share2 className="h-4 w-4" />
                <span className="hidden sm:inline">Código QR</span>
                <span className="sm:hidden">QR</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2 data-[state=active]:bg-background">
                <Smartphone className="h-4 w-4" />
                <span className="hidden sm:inline">Enlace</span>
                <span className="sm:hidden">Link</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardContent className="flex flex-col items-center p-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border mb-6">
                    <QRCodeSVG 
                      value={surveyLink} 
                      size={180} 
                      level="M"
                      includeMargin={false}
                      className="block"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      Escanear con dispositivo móvil
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Apunte la cámara del teléfono hacia el código QR para acceder directamente a la encuesta
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="link" className="mt-0">
              <Card className="border-0 shadow-none">
                <CardContent className="p-6 space-y-6">
                  {/* Enlace copiable */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-foreground">
                      Enlace de la encuesta
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={surveyLink}
                          readOnly
                          className="w-full p-3 pr-10 text-xs bg-muted/50 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <ExternalLink className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      <Button 
                        size="sm" 
                        variant={copied ? "default" : "outline"} 
                        onClick={handleCopyLink}
                        className="px-4 min-w-[80px]"
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            <span className="text-xs">Copiar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3">
                      <Button 
                        onClick={handleShareWhatsApp} 
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-sm"
                        size="lg"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="mr-2"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Enviar por WhatsApp
                      </Button>

                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-muted" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">o</span>
                        </div>
                      </div>

                      <Button 
                        variant="secondary" 
                        onClick={onStartInternal} 
                        className="w-full border-dashed border-2 hover:bg-muted/50"
                        size="lg"
                      >
                        <Tablet className="mr-2 h-4 w-4" />
                        Completar encuesta en este dispositivo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}