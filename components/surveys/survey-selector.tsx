"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { LoaderCircle, ClipboardList, AlertCircle } from "lucide-react"
import { SurveyType, useSurveyStore } from "@/lib/stores/survey-store"
import { toast } from "sonner"

interface SurveySelectorProps {
  isOpen: boolean
  patientId: string
  appointmentId: string
  patientName: string
  onClose: () => void
  onAssigned: (assignmentId: string, surveyId: string) => void
}

export function SurveySelector({
  isOpen,
  patientId,
  appointmentId,
  patientName,
  onClose,
  onAssigned,
}: SurveySelectorProps) {
  const [selectedSurveyId, setSelectedSurveyId] = useState("")
  const [isAssigning, setIsAssigning] = useState(false)
  
  const { surveys, assignSurveyToPatient } = useSurveyStore()
  
  // Agrupar encuestas por tipo
  const surveysByType = surveys.reduce((acc, survey) => {
    const type = survey.type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(survey)
    return acc
  }, {} as Record<string, typeof surveys>)
  
  const handleAssignSurvey = async () => {
    if (!selectedSurveyId) {
      toast.error("Por favor, seleccione una encuesta")
      return
    }
    
    setIsAssigning(true)
    
    try {
      const assignment = await assignSurveyToPatient(patientId, appointmentId, selectedSurveyId)
      toast.success("Encuesta asignada correctamente")
      onAssigned(assignment.id, selectedSurveyId)
    } catch (error) {
      console.error("Error al asignar encuesta:", error)
      toast.error("Error al asignar la encuesta")
    } finally {
      setIsAssigning(false)
      onClose()
    }
  }

  const getSurveyTypeLabel = (type: string): string => {
    switch (type) {
      case SurveyType.HERNIA:
        return "Hernia"
      case SurveyType.VESICULA:
        return "Vesícula"
      case SurveyType.GENERAL:
        return "General"
      default:
        return type
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Encuesta</DialogTitle>
          <DialogDescription>
            Seleccione la encuesta adecuada para {patientName}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <label htmlFor="survey-select" className="text-sm font-medium">
              Tipo de Encuesta
            </label>
            <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
              <SelectTrigger id="survey-select" className="w-full">
                <SelectValue placeholder="Seleccionar encuesta" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(surveysByType).map(([type, typeSurveys]) => (
                  <div key={type} className="p-1">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">
                      {getSurveyTypeLabel(type)}
                    </div>
                    {typeSurveys.map(survey => (
                      <SelectItem key={survey.id} value={survey.id}>
                        {survey.title}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedSurveyId && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-3 text-sm">
              <div className="flex items-start gap-2">
                <ClipboardList className="h-5 w-5 text-slate-500 dark:text-slate-400 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {surveys.find(s => s.id === selectedSurveyId)?.title}
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                    {surveys.find(s => s.id === selectedSurveyId)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-md p-3 text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div className="text-amber-800 dark:text-amber-400">
                Una vez seleccionada y asignada la encuesta, podrá compartirla con el paciente.
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancelar
          </Button>
          <Button onClick={handleAssignSurvey} disabled={!selectedSurveyId || isAssigning}>
            {isAssigning ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Asignando...
              </>
            ) : (
              'Asignar y Continuar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
