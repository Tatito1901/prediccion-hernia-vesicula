import { memo } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { RecommendationCategory } from "@/lib/utils/survey-analyzer-helpers"

interface RecomendacionesTabProps {
  recommendationCategories: RecommendationCategory[]
}

export const RecomendacionesTab = memo(({ recommendationCategories }: RecomendacionesTabProps) => {
  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Plan de Acción Sugerido</h3>
      <div className="space-y-4">
        {recommendationCategories.map((category: RecommendationCategory) => (
          <Accordion key={category.id} type="single" collapsible className="w-full">
            <AccordionItem value={category.id} className="border rounded-lg shadow-sm">
              <AccordionTrigger className="px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50/80 rounded-t-lg">
                <div className="flex items-center">
                  <category.icon className="w-5 h-5 mr-3 text-blue-500" />
                  {category.title}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 border-t bg-white">
                <p className="text-gray-600 mb-3">{category.description}</p>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {category.recommendations.map((rec: string, index: number) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ))}
      </div>
    </div>
  )
})

RecomendacionesTab.displayName = 'RecomendacionesTab'
