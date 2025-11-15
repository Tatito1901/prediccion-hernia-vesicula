import { memo } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

interface ProbabilidadTabProps {
  surgeryProbability: number
}

export const ProbabilidadTab = memo(({ surgeryProbability }: ProbabilidadTabProps) => {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="flex flex-col items-center justify-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Probabilidad de Cirugía</h3>
          <div style={{ width: 200, height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Probabilidad', value: surgeryProbability },
                    { name: 'Resto', value: 1 - surgeryProbability }
                  ]}
                  dataKey="value"
                  innerRadius="70%"
                  outerRadius="100%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={0}
                  cornerRadius={10}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#e5e7eb" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="text-5xl font-bold text-blue-600 mt-[-120px]">
            {(surgeryProbability * 100).toFixed(0)}%
          </p>
          <p className="text-gray-500 mt-[80px]">Basado en el modelo predictivo</p>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Factores Influyentes</h3>
          <div className="space-y-3">
            <div className="flex items-center">
              <ThumbsUp className="w-5 h-5 text-green-500 mr-3" />
              <span className="text-gray-700">Severidad de síntomas</span>
            </div>
            <div className="flex items-center">
              <ThumbsUp className="w-5 h-5 text-green-500 mr-3" />
              <span className="text-gray-700">Impacto en calidad de vida</span>
            </div>
            <div className="flex items-center">
              <ThumbsDown className="w-5 h-5 text-red-500 mr-3" />
              <span className="text-gray-700">Preocupaciones sobre recuperación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

ProbabilidadTab.displayName = 'ProbabilidadTab'
