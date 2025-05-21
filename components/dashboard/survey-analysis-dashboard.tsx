"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function SurveyAnalysisDashboard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is a placeholder for the survey analysis dashboard.</p>
      </CardContent>
    </Card>
  )
}
