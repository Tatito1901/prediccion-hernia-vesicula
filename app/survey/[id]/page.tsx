import React from "react"
import { Suspense } from "react"
import PatientSurveyForm from "@/components/surveys/patient-survey-form"; // Sin llaves {}
import { LoadingSpinner } from "@/components/ui/loading-state"

export default function SurveyPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-center mb-6">
        Encuesta de Evaluación Médica
      </h1>
      <p className="text-center text-muted-foreground mb-8">
        Por favor complete la siguiente encuesta para ayudarnos a entender mejor
        su condición médica.
      </p>
      <Suspense
        fallback={
          <div className="flex justify-center">
            <LoadingSpinner size={40} />
          </div>
        }
      >
        <PatientSurveyForm surveyId={params.id} standalone={true} />
      </Suspense>
    </div>
  )
}
