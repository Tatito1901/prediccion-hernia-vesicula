"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import type { DoctorData } from "@/app/dashboard/data-model"
import { sampleDoctors } from "@/app/pacientes/sample-data"
import { responsiveHeight } from "@/src/lib/responsive-utils"

interface DoctorStatsProps {
  doctors?: DoctorData[]
}

export function DoctorStats({ doctors }: DoctorStatsProps) {
  // Usar los doctors pasados como prop o los datos de muestra si no se proporcionan
  const doctorsData = doctors || sampleDoctors

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Desempeño de Médicos</CardTitle>
        <CardDescription>Tasa de conversión por médico</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={responsiveHeight("max-h-[300px]", "max-h-[350px]", "max-h-[400px]")}
          style={{ overflowY: "auto" }}
        >
          {doctorsData.map((doctor) => (
            <div key={doctor.id} className="flex items-center gap-4 mb-4">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={doctor.foto || "/placeholder.svg"} alt={doctor.nombre} />
                <AvatarFallback>{doctor.nombre.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium truncate">{doctor.nombre}</p>
                  <span className="text-sm text-muted-foreground">{(doctor.tasaConversion * 100).toFixed(0)}%</span>
                </div>
                <Progress value={doctor.tasaConversion * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{doctor.pacientesAtendidos} pacientes</span>
                  <span className="truncate ml-2">{doctor.especialidad}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
