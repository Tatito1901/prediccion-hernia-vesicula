"use client"

// Mejorar el componente PatientCardMobile con mejor tipado y rendimiento

import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { QrCodeIcon, ClipboardListIcon, UserIcon, ExternalLinkIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { DiagnosisType, PatientData } from "@/app/dashboard/data-model"

interface PatientCardMobileProps {
  patient: PatientData
  getStatusColorClass?: (status: string) => string
  onShare?: (patient: PatientData) => void
  onAnswer?: (patient: PatientData) => void
  onEdit?: (patient: PatientData) => void
  onSelectPatient?: (patient: PatientData) => void
  className?: string
}

export const PatientCardMobile = memo(
  ({
    patient,
    getStatusColorClass,
    onShare,
    onAnswer,
    onEdit,
    onSelectPatient,
    className = "",
  }: PatientCardMobileProps) => {
    // Función para manejar clic en la tarjeta
    const handleCardClick = () => {
      if (onSelectPatient) {
        console.log("Card clicked, selecting patient:", patient.id)
        onSelectPatient(patient)
      }
    }

    return (
      <Card
        className={`mb-4 overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors ${className}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium text-base">
                {patient.nombre} {patient.apellidos}
              </h3>
              <p className="text-sm text-muted-foreground">
                ID: {patient.id} | {patient.edad} años
              </p>
            </div>
            <Badge
              variant="outline"
              className={`px-1.5 ${getStatusColorClass ? getStatusColorClass(patient.estado) : ""}`}
            >
              {patient.estado}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">Diagnóstico:</span>
              <div>
                <Badge variant="outline">{patient.diagnostico}</Badge>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha:</span>
              <div>{new Date(patient.fechaConsulta).toLocaleDateString("es-MX")}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Prob. Cirugía:</span>
              <div>
                {patient.encuesta ? (
                  <Badge
                    variant="outline"
                    className={`px-1.5 ${
                      patient.probabilidadCirugia >= 0.7
                        ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                        : patient.probabilidadCirugia >= 0.4
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400"
                          : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                    }`}
                  >
                    {(patient.probabilidadCirugia * 100).toFixed(0)}%
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="px-1.5 bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400"
                  >
                    N/A
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Encuesta:</span>
              <div>
                <Badge
                  variant="outline"
                  className={`px-1.5 ${
                    patient.encuesta
                      ? "bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400"
                  }`}
                >
                  {patient.encuesta ? "Contestada" : "Pendiente"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="default"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelectPatient && onSelectPatient(patient)
              }}
              className="flex-1 transition-all hover:shadow-md"
            >
              <ExternalLinkIcon className="mr-1 h-3.5 w-3.5" />
              Ver Análisis
            </Button>

            {!patient.encuesta && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onShare && onShare(patient)
                  }}
                  className="flex-1 transition-all hover:bg-muted"
                >
                  <QrCodeIcon className="mr-1 h-3.5 w-3.5" />
                  Compartir
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onAnswer && onAnswer(patient)
                  }}
                  className="flex-1 transition-all hover:shadow-sm"
                >
                  <ClipboardListIcon className="mr-1 h-3.5 w-3.5" />
                  Contestar
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onEdit && onEdit(patient)
              }}
              className="flex-1 transition-all hover:bg-muted"
            >
              <UserIcon className="mr-1 h-3.5 w-3.5" />
              Editar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  },
)

PatientCardMobile.displayName = "PatientCardMobile"
