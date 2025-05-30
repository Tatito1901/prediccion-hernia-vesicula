"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface SurveyShareDialogProps {
  isOpen: boolean
  patient: any
  surveyLink: string
  onStartInternal: () => void
  onClose: () => void
}

export function SurveyShareDialog({ isOpen, patient, surveyLink, onStartInternal, onClose }: SurveyShareDialogProps) {
  // Versión simplificada sin QRCodeSVG ni otras dependencias complejas
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartir encuesta con {patient?.nombre || 'Paciente'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <p className="text-sm text-slate-500">
            Enlace de la encuesta: {surveyLink}
          </p>
          <div className="flex justify-between">
            <Button onClick={onClose}>Cerrar</Button>
            <Button onClick={onStartInternal}>Iniciar internamente</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
