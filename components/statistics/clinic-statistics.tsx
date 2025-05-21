import { TrendingUpIcon, Users, UserCheck, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { gridLayouts } from "@/src/lib/responsive-utils"

interface StatisticsProps {
  statistics: {
    totalPatients: number
    operatedPatients: number
    pendingPatients: number
    inConsultation: number
    followUp: number
    conversionRate: number
  }
}

export function ClinicStatistics({ statistics }: StatisticsProps) {
  return (
    <div className={gridLayouts.dashboard}>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Tasa de Conversión</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {(statistics.conversionRate * 100).toFixed(1)}%
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
              <TrendingUpIcon className="size-3" />
              +5.2%
            </Badge>
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Mejora vs. mes anterior <TrendingUpIcon className="size-4" />
          </div>
          <div className="text-muted-foreground">Pacientes que deciden operarse</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Pacientes Totales</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {statistics.totalPatients}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Pacientes en el sistema</div>
          <div className="text-muted-foreground">Últimos 30 días</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>Pacientes Operados</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {statistics.operatedPatients}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <UserCheck className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Cirugías realizadas</div>
          <div className="text-muted-foreground">Últimos 30 días</div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader className="relative">
          <CardDescription>En Seguimiento</CardDescription>
          <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
            {statistics.followUp}
          </CardTitle>
          <div className="absolute right-4 top-4">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">Pacientes en seguimiento</div>
          <div className="text-muted-foreground">Potenciales conversiones</div>
        </CardFooter>
      </Card>
    </div>
  )
}
