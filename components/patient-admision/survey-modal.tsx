// survey-modal.tsx - Modal de encuesta de satisfacción para pacientes
import React, { memo, useState, useCallback, useMemo, useEffect } from "react";
import { useForm, Controller, Control, FieldErrors, UseFormWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSurveyTemplates } from '@/hooks/use-survey-templates';
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  MessageSquare,
  Stethoscope,
  UserCheck,
  Loader2,
  CheckCircle2,
  FileText,
  Smile,
  Meh,
  Frown,
} from "lucide-react";

// Importaciones de tipos
import { AppointmentWithPatient, SurveyData } from "./admision-types";
import { getPatientData } from "./admision-types";

// ==================== ESQUEMA DE VALIDACIÓN ====================

const surveyValidationSchema = z.object({
  overall_rating: z.number().min(1, "Calificación general es requerida.").max(5),
  service_quality: z.number().min(1).max(5).optional(),
  wait_time_satisfaction: z.number().min(1).max(5).optional(),
  doctor_communication: z.number().min(1).max(5).optional(),
  would_recommend: z.boolean().optional(),
  suggestions: z.string().max(500, "Máximo 500 caracteres.").optional(),
  surveyTemplateId: z.number(),
});

// ==================== PROPS Y TIPOS ====================

interface SurveyModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithPatient;
  onSubmit: (data: SurveyData) => void;
  isSubmitting?: boolean;
}

interface StepComponentProps {
  control: Control<SurveyData>;
  errors: FieldErrors<SurveyData>;
  watch: UseFormWatch<SurveyData>;
}

// ==================== PASOS DE LA ENCUESTA ====================

const surveySteps = [
  {
    title: "Calificación General",
    component: ({ control }: StepComponentProps) => (
      <Controller
        name="overall_rating"
        control={control}
        render={({ field }) => (
          <RatingStars
            label="¿Cómo calificaría su experiencia general?"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    ),
  },
  {
    title: "Detalles de la Experiencia",
    component: ({ control }: StepComponentProps) => (
      <div className="space-y-6">
        <Controller
          name="wait_time_satisfaction"
          control={control}
          render={({ field }) => (
            <SatisfactionScale
              label="Satisfacción con el tiempo de espera"
              value={field.value ?? 0}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          name="doctor_communication"
          control={control}
          render={({ field }) => (
            <SatisfactionScale
              label="Claridad y comunicación del médico"
              value={field.value ?? 0}
              onChange={field.onChange}
            />
          )}
        />
      </div>
    ),
  },
  {
    title: "Recomendación",
    component: ({ control }: StepComponentProps) => (
      <Controller
        name="would_recommend"
        control={control}
        render={({ field }) => (
          <YesNoQuestion
            label="¿Recomendaría nuestros servicios a otros?"
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    ),
  },
  {
    title: "Sugerencias",
    component: ({ control, errors }: StepComponentProps) => (
      <div className="space-y-2">
        <Label htmlFor="suggestions">¿Tiene alguna sugerencia para mejorar?</Label>
        <Controller
          name="suggestions"
          control={control}
          render={({ field }) => (
            <Textarea
              id="suggestions"
              placeholder="Sus comentarios son valiosos..."
              {...field}
            />
          )}
        />
        {errors.suggestions && <p className="text-sm text-red-500">{errors.suggestions.message}</p>}
      </div>
    ),
  },
];

// ==================== COMPONENTES INTERNOS ====================

const RatingStars = memo<{
  value: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
  label?: string;
  disabled?: boolean;
}>(({ value, onChange, size = "md", label, disabled = false }) => {
  const [hoverValue, setHoverValue] = useState(0);
  const sizeClasses = { sm: "h-6 w-6", md: "h-8 w-8", lg: "h-10 w-10" };
  const displayValue = hoverValue || value;

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !disabled && onChange(star)}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            disabled={disabled}
            className={cn(
              "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"
            )}
            aria-label={`Calificar ${star} de 5 estrellas`}
          >
            <Star
              className={cn(
                sizeClasses[size],
                star <= displayValue ? "fill-yellow-400 text-yellow-400" : "text-slate-300 dark:text-slate-600"
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
          {value > 0 ? `${value}/5` : ""}
        </span>
      </div>
    </div>
  );
});
RatingStars.displayName = "RatingStars";

const SatisfactionScale = memo<{
  value: number;
  onChange: (value: number) => void;
  label: string;
  leftLabel?: string;
  rightLabel?: string;
  disabled?: boolean;
}>(({ value, onChange, label, leftLabel = "Insatisfecho", rightLabel = "Muy satisfecho", disabled = false }) => {
  const getEmoji = (val: number) => {
    if (val <= 2) return <Frown className="h-5 w-5 text-red-500" />;
    if (val === 3) return <Meh className="h-5 w-5 text-yellow-500" />;
    return <Smile className="h-5 w-5 text-green-500" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
        {value > 0 && getEmoji(value)}
      </div>
      <div className="space-y-2">
        <Slider
          value={[value || 0]}
          onValueChange={([val]) => onChange(val)}
          min={1}
          max={5}
          step={1}
          disabled={disabled}
        />
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </div>
  );
});
SatisfactionScale.displayName = "SatisfactionScale";

const YesNoQuestion = memo<{
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}>(({ value, onChange, label, disabled = false }) => (
  <div className="space-y-3">
    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</Label>
    <RadioGroup
      value={value === undefined ? "" : value.toString()}
      onValueChange={(val) => onChange(val === "true")}
      disabled={disabled}
      className="flex gap-4"
    >
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="true" id={`${label}-yes`} />
        <Label htmlFor={`${label}-yes`} className="flex items-center gap-2 cursor-pointer">
          <ThumbsUp className="h-4 w-4 text-green-600" /> Sí
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <RadioGroupItem value="false" id={`${label}-no`} />
        <Label htmlFor={`${label}-no`} className="flex items-center gap-2 cursor-pointer">
          <ThumbsDown className="h-4 w-4 text-red-600" /> No
        </Label>
      </div>
    </RadioGroup>
  </div>
));
YesNoQuestion.displayName = "YesNoQuestion";

// ==================== COMPONENTE PRINCIPAL ====================

export const SurveyModal: React.FC<SurveyModalProps> = memo(({ isOpen, onClose, appointment, onSubmit, isSubmitting = false }) => {
  const { data: surveyTemplates, isLoading: isLoadingTemplates } = useSurveyTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<number | undefined>();

  useEffect(() => {
    if (surveyTemplates && surveyTemplates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(surveyTemplates[0].id);
    }
  }, [surveyTemplates, selectedTemplate]);

  const [currentStep, setCurrentStep] = useState(0);
  const patientData = getPatientData(appointment);

  const { control, handleSubmit, formState: { errors, isValid }, watch, setValue } = useForm<SurveyData>({
    resolver: zodResolver(surveyValidationSchema),
    mode: 'onChange',
    defaultValues: {
      overall_rating: 5,
      would_recommend: true,
      surveyTemplateId: selectedTemplate ?? 1,
    },
  });

  useEffect(() => {
    if (selectedTemplate) {
      setValue('surveyTemplateId', selectedTemplate);
    }
  }, [selectedTemplate, setValue]);

  const handleNext = () => setCurrentStep(prev => Math.min(prev + 1, surveySteps.length - 1));
  const handleBack = () => setCurrentStep(prev => Math.max(prev - 1, 0));

  const processSubmit = (data: SurveyData) => {
    onSubmit(data);
  };

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const progress = useMemo(() => (currentStep + 1) / surveySteps.length * 100, [currentStep]);

  const currentStepConfig = surveySteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => isSubmitting && e.preventDefault()}
      >
        <form onSubmit={handleSubmit(processSubmit)} className="flex flex-col overflow-hidden h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Encuesta de Satisfacción
            </DialogTitle>
            {patientData && (
              <DialogDescription>
                Para: {patientData.nombre} {patientData.apellidos}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="py-4 space-y-4 flex-grow overflow-y-auto pr-6 pl-1 mr-[-24px]">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Paso {currentStep + 1} de {surveySteps.length}: {currentStepConfig.title}</p>
            </div>
            <Progress value={progress} className="w-full" />
            <Separator className="my-4"/>

            <div className="min-h-[200px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                  transition={{ ease: 'easeInOut', duration: 0.3 }}
                  className="w-full"
                >
                  {currentStepConfig.component({ control, errors, watch })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <DialogFooter className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSubmitting}>
                Anterior
              </Button>
            )}
            <div className="flex-grow" />
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            {currentStep < surveySteps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Siguiente
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} 
                <span className="ml-2">Completar Encuesta</span>
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

SurveyModal.displayName = "SurveyModal";

export default SurveyModal;