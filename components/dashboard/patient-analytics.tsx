"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { responsiveHeight } from "@/lib/responsive-utils"

const data = [
  { name: "Ene", pacientes: 12, operados: 8 },
  { name: "Feb", pacientes: 19, operados: 12 },
  { name: "Mar", pacientes: 15, operados: 10 },
  { name: "Abr", pacientes: 22, operados: 15 },
  { name: "May", pacientes: 28, operados: 20 },
  { name: "Jun", pacientes: 25, operados: 18 },
]

export function PatientAnalytics() {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de Pacientes</CardTitle>
          <CardDescription>Pacientes nuevos vs. operados por mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={responsiveHeight("h-[250px]", "h-[300px]", "h-[350px]")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                <XAxis dataKey="name" stroke="#9E9E9E" />
                <YAxis stroke="#9E9E9E" />
                <Tooltip />
                <Area type="monotone" dataKey="pacientes" stroke="#9E9E9E" fill="#E0E0E0" />
                <Area type="monotone" dataKey="operados" stroke="#FFC107" fill="#FFF8E1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
