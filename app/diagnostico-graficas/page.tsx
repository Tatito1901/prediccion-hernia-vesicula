import { ChartDiagnostic } from "@/components/chart-diagnostic"

export default function DiagnosticoGraficasPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold">Diagnóstico de Gráficas</h1>
      <p className="text-gray-600">Esta página muestra gráficas básicas para diagnosticar problemas de renderizado.</p>
      <ChartDiagnostic />
    </div>
  )
}
