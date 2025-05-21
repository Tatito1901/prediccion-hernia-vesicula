"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClipboardListIcon } from "lucide-react"

interface SurveyCompletionModalProps {
  isOpen: boolean
  patient: any
  onClose: () => void
  onStartSurvey: (patient: any) => void
}

export function SurveyCompletionModal({ isOpen, patient, onClose, onStartSurvey }: SurveyCompletionModalProps) {
  if (!patient) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Encuesta no completada</DialogTitle>
          <DialogDescription>
            El paciente {patient.nombre} {patient.apellidos} no ha completado la encuesta necesaria para generar el
            análisis.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Para poder ver el análisis detallado, es necesario que el paciente complete la encuesta. Puede compartir la
            encuesta con el paciente o completarla ahora mismo.
          </p>
          <div className="flex items-center justify-center p-4 bg-muted/50 rounded-md">
            <ClipboardListIcon className="h-12 w-12 text-primary/70" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onStartSurvey(patient)}>Completar encuesta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
