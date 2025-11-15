import { memo } from "react"
import { Separator } from "@/components/ui/separator"

interface RiesgosTabProps {
  benefitRiskRatio: number
}

export const RiesgosTab = memo(({ benefitRiskRatio }: RiesgosTabProps) => {
  return (
    <div className="p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">Balanza: Beneficios vs. Riesgos</h3>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-green-600">Beneficios Potenciales</span>
            <span className="font-semibold text-red-600">Riesgos Potenciales</span>
          </div>
          <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
              style={{ width: `${Math.min(100, (benefitRiskRatio / (benefitRiskRatio + 1)) * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-2">
            <span>Alivio del dolor, mejora de movilidad</span>
            <span>Complicaciones, recuperación</span>
          </div>
        </div>
      </div>
      <Separator className="my-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-lg text-green-700 mb-2">Principales Beneficios</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Reducción significativa y duradera del dolor.</li>
            <li>Retorno a actividades diarias sin limitaciones.</li>
            <li>Prevención de complicaciones a largo plazo.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-lg text-red-700 mb-2">Principales Riesgos</h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>Riesgos inherentes a cualquier procedimiento quirúrgico.</li>
            <li>Posibilidad de recurrencia de la hernia.</li>
            <li>Tiempo de recuperación y rehabilitación.</li>
          </ul>
        </div>
      </div>
    </div>
  )
})

RiesgosTab.displayName = 'RiesgosTab'
