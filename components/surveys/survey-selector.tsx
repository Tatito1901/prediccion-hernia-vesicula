"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

const SurveySelector = ({ 
  isOpen, 
  onClose, 
  patientId, 
  patientName, 
  onSurveyAssigned 
}: SurveySelectorProps) => {
  const supabase = createClientComponentClient();
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState<number | null>(null); // Store the ID of the survey being assigned
  const [error, setError] = useState<string | null>(null);

  // Fetch survey templates from Supabase
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('survey_templates')
        .select('id, title, description')
        .order('id', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching survey templates:', err);
      setError('No se pudieron cargar las encuestas. Intente de nuevo.');
      toast.error('Error al cargar las plantillas de encuesta.');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  // Handle survey selection and assignment
  const handleAssignSurvey = async (template: SurveyTemplate) => {
    setIsAssigning(template.id);
    try {
      const response = await fetch('/api/assign-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, templateId: template.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error desconocido al asignar la encuesta.');
      }

      toast.success(`Encuesta "${template.title}" asignada correctamente.`);
      onSurveyAssigned(result.assignmentId, String(template.id));
      onClose(); // Close the dialog on success

    } catch (err: any) {
      console.error('Error assigning survey:', err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsAssigning(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
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
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <XCircle className="h-12 w-12 text-red-500 mb-4" />
              <p className="font-semibold text-red-700 dark:text-red-300">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchTemplates} className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 cursor-pointer"
                  onClick={() => !isAssigning && handleAssignSurvey(template)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">{template.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{template.description || 'Sin descripción.'}</p>
                    </div>
                    <Button 
                      size="sm" 
                      disabled={isAssigning !== null}
                      className="ml-4 w-32"
                    >
                      {isAssigning === template.id ? (
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
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SurveySelector;
