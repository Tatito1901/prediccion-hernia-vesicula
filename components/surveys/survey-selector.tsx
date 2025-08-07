"use client"

import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useSurveyTemplates, useAssignSurvey } from '@/hooks/use-survey-templates';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, FileText, XCircle, Loader2 } from 'lucide-react';

// Type for the survey templates fetched from Supabase
interface SurveyTemplate {
  id: number;
  title: string;
  description: string | null;
}

// Props for the SurveySelector component
interface SurveySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  onSurveyAssigned: (assignmentId: string, surveyId: string) => void;
}

// Props for SurveyTemplateCard
interface SurveyTemplateCardProps {
  template: SurveyTemplate;
  isAssigning: boolean; // Is *any* survey being assigned?
  isCurrentlyAssigning: boolean; // Is *this specific* survey being assigned?
  onAssign: (template: SurveyTemplate) => void;
}

// ✅ OPTIMIZADO: SurveyTemplateCard usando componentes base consolidados
const SurveyTemplateCard = React.memo(({ template, isAssigning, isCurrentlyAssigning, onAssign }: SurveyTemplateCardProps) => {
  const handleClick = useCallback(() => {
    if (!isAssigning) {
      onAssign(template);
    }
  }, [isAssigning, onAssign, template]);

  return (
    <Card className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer" onClick={handleClick}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-base font-semibold">{template.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{template.description || 'Sin descripción.'}</p>
          </div>
          <Button
            size="sm"
            disabled={isAssigning}
            className="ml-4 w-32"
            aria-label={`Asignar encuesta ${template.title}`}
          >
          {isCurrentlyAssigning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Asignar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
});
SurveyTemplateCard.displayName = 'SurveyTemplateCard';

// Move skeleton config outside
const SKELETON_COUNT = 3;
const skeletonItems = Array.from({ length: SKELETON_COUNT });

const SurveySelector = React.memo(({
  isOpen,
  onClose,
  patientId,
  patientName,
  onSurveyAssigned
}: SurveySelectorProps) => {
  // 🎯 HOOK CENTRALIZADO - Elimina fetch redundante
  const { data: templates = [], isLoading, error } = useSurveyTemplates();
  const assignSurvey = useAssignSurvey();
  const [isAssigning, setIsAssigning] = useState<number | null>(null);

  const handleAssignSurvey = useCallback(async (template: SurveyTemplate) => {
    if (isAssigning !== null) return; // Prevent multiple assignments
    setIsAssigning(template.id);
    try {
      // 🎯 HOOK CENTRALIZADO - Lógica de asignación centralizada
      const result = await assignSurvey(patientId, template.id);
      
      toast.success(`Encuesta "${template.title}" asignada correctamente.`);
      onSurveyAssigned(result.assignmentId, String(template.id));
      onClose();
    } catch (err: any) {
      console.error('Error assigning survey:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsAssigning(null);
    }
  }, [isAssigning, patientId, assignSurvey, onSurveyAssigned, onClose]);

  const handleClose = useCallback(() => {
    if (isAssigning === null) {
      onClose();
    }
  }, [isAssigning, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-blue-600" />
            Asignar Encuesta
          </DialogTitle>
          <DialogDescription>
            Seleccione una encuesta para asignar a <strong>{patientName}</strong>.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="space-y-4">
              {skeletonItems.map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              {error && (
                <p className="text-red-500 text-center">{error.message}</p>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={handleClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <SurveyTemplateCard
                  key={template.id}
                  template={template}
                  isAssigning={isAssigning !== null}
                  isCurrentlyAssigning={isAssigning === template.id}
                  onAssign={handleAssignSurvey}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAssigning !== null}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

SurveySelector.displayName = 'SurveySelector';

export default SurveySelector;
