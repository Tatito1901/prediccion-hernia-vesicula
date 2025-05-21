import type { PatientSurvey } from "@/app/dashboard/data-model"

// Types for analysis
export interface SurveyAnalysisFilters {
  dateRange?: { from: Date; to: Date }
  ageRange?: [number, number]
  location?: string
  diagnosis?: string
  insuranceType?: string
  symptomSeverity?: string
  searchTerm?: string
  customFields?: Record<string, any>
}

export interface AggregationOptions {
  groupBy: string
  subGroupBy?: string
  timeFrame?: "day" | "week" | "month" | "quarter" | "year"
  includeEmpty?: boolean
  sortBy?: "count" | "value" | "alphabetical"
  sortDirection?: "asc" | "desc"
  limit?: number
}

export interface AnalysisResult {
  totalCount: number
  filteredCount: number
  aggregations: Record<string, any>
  timeSeries?: any[]
  topItems?: any[]
  correlations?: any[]
  metadata: {
    filters: SurveyAnalysisFilters
    options: AggregationOptions
    generatedAt: string
  }
}

// Main analysis function
export function analyzeSurveyData(
  surveys: PatientSurvey[],
  filters: SurveyAnalysisFilters = {},
  options: AggregationOptions = { groupBy: "origen" },
): AnalysisResult {
  // Apply filters
  const filteredSurveys = applySurveyFilters(surveys, filters)

  // Perform aggregation
  const aggregations = aggregateSurveyData(filteredSurveys, options)

  // Generate time series if needed
  const timeSeries = options.timeFrame ? generateTimeSeries(filteredSurveys, options) : undefined

  // Find top items
  const topItems = findTopItems(filteredSurveys, options)

  // Calculate correlations
  const correlations = calculateCorrelations(filteredSurveys)

  return {
    totalCount: surveys.length,
    filteredCount: filteredSurveys.length,
    aggregations,
    timeSeries,
    topItems,
    correlations,
    metadata: {
      filters,
      options,
      generatedAt: new Date().toISOString(),
    },
  }
}

// Filter surveys based on criteria
function applySurveyFilters(surveys: PatientSurvey[], filters: SurveyAnalysisFilters): PatientSurvey[] {
  return surveys.filter((survey) => {
    // Date range filter
    if (filters.dateRange) {
      const surveyDate = new Date(survey.submittedAt || "")
      if (surveyDate < filters.dateRange.from || surveyDate > filters.dateRange.to) {
        return false
      }
    }

    // Age range filter
    if (filters.ageRange && (survey.edad < filters.ageRange[0] || survey.edad > filters.ageRange[1])) {
      return false
    }

    // Location filter
    if (filters.location && survey.ubicacion !== filters.location) {
      return false
    }

    // Diagnosis filter
    if (filters.diagnosis && (!survey.diagnosticoPrevio || !survey.detallesDiagnostico?.includes(filters.diagnosis))) {
      return false
    }

    // Insurance type filter
    if (filters.insuranceType && survey.seguroMedico !== filters.insuranceType) {
      return false
    }

    // Symptom severity filter
    if (filters.symptomSeverity && survey.severidadCondicion !== filters.symptomSeverity) {
      return false
    }

    // Search term filter (searches across multiple fields)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const searchableText =
        `${survey.nombre} ${survey.apellidos} ${survey.detallesDiagnostico || ""} ${survey.comentarios || ""}`.toLowerCase()
      if (!searchableText.includes(searchLower)) {
        return false
      }
    }

    // Custom field filters
    if (filters.customFields) {
      for (const [key, value] of Object.entries(filters.customFields)) {
        if (survey[key as keyof PatientSurvey] !== value) {
          return false
        }
      }
    }

    return true
  })
}

// Aggregate survey data based on grouping options
function aggregateSurveyData(surveys: PatientSurvey[], options: AggregationOptions): Record<string, any> {
  const { groupBy, subGroupBy } = options

  // Initialize result object
  const result: Record<string, any> = {}

  // Group by primary field
  surveys.forEach((survey) => {
    const groupValue = survey[groupBy as keyof PatientSurvey]
    const groupKey = Array.isArray(groupValue) ? "multiple" : String(groupValue || "undefined")

    if (!result[groupKey]) {
      result[groupKey] = {
        count: 0,
        items: [],
        subGroups: {},
      }
    }

    result[groupKey].count++
    result[groupKey].items.push(survey)

    // Sub-grouping if specified
    if (subGroupBy) {
      const subGroupValue = survey[subGroupBy as keyof PatientSurvey]
      const subGroupKey = Array.isArray(subGroupValue) ? "multiple" : String(subGroupValue || "undefined")

      if (!result[groupKey].subGroups[subGroupKey]) {
        result[groupKey].subGroups[subGroupKey] = {
          count: 0,
          items: [],
        }
      }

      result[groupKey].subGroups[subGroupKey].count++
      result[groupKey].subGroups[subGroupKey].items.push(survey)
    }
  })

  // Format for visualization
  const formattedResult: Record<string, any> = {}

  Object.entries(result).forEach(([key, value]) => {
    formattedResult[key] = {
      count: value.count,
      percentage: (value.count / surveys.length) * 100,
      subGroups: {},
    }

    if (subGroupBy) {
      Object.entries(value.subGroups).forEach(([subKey, subValue]) => {
        formattedResult[key].subGroups[subKey] = {
          count: subValue.count,
          percentage: (subValue.count / value.count) * 100,
        }
      })
    }
  })

  return formattedResult
}

// Generate time series data
function generateTimeSeries(surveys: PatientSurvey[], options: AggregationOptions): any[] {
  const { timeFrame = "month", groupBy } = options

  // Sort surveys by date
  const sortedSurveys = [...surveys].sort((a, b) => {
    const dateA = new Date(a.submittedAt || "")
    const dateB = new Date(b.submittedAt || "")
    return dateA.getTime() - dateB.getTime()
  })

  // Group by time periods
  const timeGroups: Record<string, any> = {}

  sortedSurveys.forEach((survey) => {
    const date = new Date(survey.submittedAt || "")
    let timeKey: string

    switch (timeFrame) {
      case "day":
        timeKey = date.toISOString().split("T")[0]
        break
      case "week":
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        timeKey = weekStart.toISOString().split("T")[0]
        break
      case "month":
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        break
      case "quarter":
        const quarter = Math.floor(date.getMonth() / 3) + 1
        timeKey = `${date.getFullYear()}-Q${quarter}`
        break
      case "year":
        timeKey = `${date.getFullYear()}`
        break
      default:
        timeKey = date.toISOString().split("T")[0]
    }

    if (!timeGroups[timeKey]) {
      timeGroups[timeKey] = {
        period: timeKey,
        count: 0,
        groups: {},
      }
    }

    timeGroups[timeKey].count++

    // Group by specified field within time period
    if (groupBy) {
      const groupValue = survey[groupBy as keyof PatientSurvey]
      const groupKey = Array.isArray(groupValue) ? "multiple" : String(groupValue || "undefined")

      if (!timeGroups[timeKey].groups[groupKey]) {
        timeGroups[timeKey].groups[groupKey] = 0
      }

      timeGroups[timeKey].groups[groupKey]++
    }
  })

  // Convert to array and format for visualization
  return Object.values(timeGroups).map((group) => {
    const result: Record<string, any> = {
      period: group.period,
      total: group.count,
    }

    // Add group counts
    Object.entries(group.groups).forEach(([key, value]) => {
      result[key] = value
    })

    return result
  })
}

// Find top items based on criteria
function findTopItems(surveys: PatientSurvey[], options: AggregationOptions): any[] {
  const { groupBy, limit = 10, sortBy = "count", sortDirection = "desc" } = options

  // Group items
  const groups: Record<string, any> = {}

  surveys.forEach((survey) => {
    const value = survey[groupBy as keyof PatientSurvey]

    if (Array.isArray(value)) {
      // Handle array values (like symptoms)
      value.forEach((item) => {
        const itemKey = String(item || "undefined")

        if (!groups[itemKey]) {
          groups[itemKey] = {
            value: item,
            count: 0,
            items: [],
          }
        }

        groups[itemKey].count++
        groups[itemKey].items.push(survey)
      })
    } else {
      // Handle scalar values
      const itemKey = String(value || "undefined")

      if (!groups[itemKey]) {
        groups[itemKey] = {
          value,
          count: 0,
          items: [],
        }
      }

      groups[itemKey].count++
      groups[itemKey].items.push(survey)
    }
  })

  // Convert to array for sorting
  let items = Object.values(groups)

  // Sort items
  items.sort((a, b) => {
    if (sortBy === "count") {
      return sortDirection === "desc" ? b.count - a.count : a.count - b.count
    } else if (sortBy === "value") {
      const valueA = typeof a.value === "number" ? a.value : 0
      const valueB = typeof b.value === "number" ? b.value : 0
      return sortDirection === "desc" ? valueB - valueA : valueA - valueB
    } else {
      // alphabetical
      const strA = String(a.value || "")
      const strB = String(b.value || "")
      return sortDirection === "desc" ? strB.localeCompare(strA) : strA.localeCompare(strB)
    }
  })

  // Limit results
  items = items.slice(0, limit)

  // Format for visualization
  return items.map((item) => ({
    name: String(item.value || "N/A"),
    value: item.count,
    percentage: (item.count / surveys.length) * 100,
  }))
}

// Calculate correlations between different survey fields
function calculateCorrelations(surveys: PatientSurvey[]): any[] {
  if (surveys.length < 10) {
    return [] // Not enough data for meaningful correlations
  }

  // Define pairs of fields to check for correlations
  const correlationPairs = [
    { field1: "intensidadDolor", field2: "severidadCondicion", label: "Dolor vs Severidad" },
    { field1: "edad", field2: "intensidadDolor", label: "Edad vs Dolor" },
    { field1: "limitacionFuncional", field2: "plazoDeseado", label: "Limitación vs Urgencia" },
    { field1: "origen", field2: "seguroMedico", label: "Origen vs Seguro" },
    { field1: "diagnosticoPrevio", field2: "intensidadDolor", label: "Diagnóstico Previo vs Dolor" },
  ]

  return correlationPairs.map((pair) => {
    // Simple correlation calculation (this is a simplified approach)
    const result = {
      label: pair.label,
      field1: pair.field1,
      field2: pair.field2,
      strength: 0,
      direction: "neutral",
      details: [],
    }

    // For categorical data, we calculate frequency distributions
    if (typeof surveys[0][pair.field1 as keyof PatientSurvey] === "string") {
      const crossTab: Record<string, Record<string, number>> = {}

      surveys.forEach((survey) => {
        const value1 = String(survey[pair.field1 as keyof PatientSurvey] || "undefined")
        const value2 = String(survey[pair.field2 as keyof PatientSurvey] || "undefined")

        if (!crossTab[value1]) {
          crossTab[value1] = {}
        }

        if (!crossTab[value1][value2]) {
          crossTab[value1][value2] = 0
        }

        crossTab[value1][value2]++
      })

      result.details = Object.entries(crossTab).map(([key1, values]) => ({
        category1: key1,
        distributions: Object.entries(values).map(([key2, count]) => ({
          category2: key2,
          count,
          percentage: (count / surveys.length) * 100,
        })),
      }))
    }

    return result
  })
}

// Export data to CSV format
export function exportToCSV(surveys: PatientSurvey[], fields?: string[]): string {
  // Determine fields to export
  const exportFields = fields || [
    "nombre",
    "apellidos",
    "edad",
    "telefono",
    "email",
    "origen",
    "ubicacion",
    "diagnosticoPrevio",
    "detallesDiagnostico",
    "sintomas",
    "duracionSintomas",
    "severidadCondicion",
    "intensidadDolor",
    "limitacionFuncional",
    "seguroMedico",
    "factoresImportantes",
    "plazoDeseado",
    "submittedAt",
  ]

  // Create header row
  const header = exportFields.join(",")

  // Create data rows
  const rows = surveys.map((survey) => {
    return exportFields
      .map((field) => {
        const value = survey[field as keyof PatientSurvey]

        if (Array.isArray(value)) {
          // Join arrays with semicolons and wrap in quotes
          return `"${value.join(";")}"`
        } else if (typeof value === "string" && value.includes(",")) {
          // Wrap strings containing commas in quotes
          return `"${value}"`
        } else {
          return value === undefined || value === null ? "" : String(value)
        }
      })
      .join(",")
  })

  // Combine header and rows
  return [header, ...rows].join("\n")
}

// Generate a summary report of survey data
export function generateSummaryReport(surveys: PatientSurvey[]): string {
  if (surveys.length === 0) {
    return "No hay datos de encuestas disponibles para generar un informe."
  }

  // Calculate basic statistics
  const totalSurveys = surveys.length
  const averageAge = surveys.reduce((sum, survey) => sum + survey.edad, 0) / totalSurveys
  const averagePain = surveys.reduce((sum, survey) => sum + survey.intensidadDolor, 0) / totalSurveys

  // Count by severity
  const severityCounts: Record<string, number> = {}
  surveys.forEach((survey) => {
    const severity = survey.severidadCondicion || "No especificada"
    severityCounts[severity] = (severityCounts[severity] || 0) + 1
  })

  // Count by location
  const locationCounts: Record<string, number> = {}
  surveys.forEach((survey) => {
    const location = survey.ubicacion || "No especificada"
    locationCounts[location] = (locationCounts[location] || 0) + 1
  })

  // Count by insurance
  const insuranceCounts: Record<string, number> = {}
  surveys.forEach((survey) => {
    const insurance = survey.seguroMedico || "No especificado"
    insuranceCounts[insurance] = (insuranceCounts[insurance] || 0) + 1
  })

  // Format the report
  let report = "# Informe de Resumen de Encuestas\n\n"
  report += `Fecha de generación: ${new Date().toLocaleDateString()}\n\n`
  report += `## Estadísticas Generales\n\n`
  report += `- Total de encuestas: ${totalSurveys}\n`
  report += `- Edad promedio: ${averageAge.toFixed(1)} años\n`
  report += `- Nivel de dolor promedio: ${averagePain.toFixed(1)}/10\n\n`

  report += `## Distribución por Severidad\n\n`
  Object.entries(severityCounts).forEach(([severity, count]) => {
    const percentage = ((count / totalSurveys) * 100).toFixed(1)
    report += `- ${severity}: ${count} (${percentage}%)\n`
  })
  report += "\n"

  report += `## Distribución por Ubicación\n\n`
  Object.entries(locationCounts).forEach(([location, count]) => {
    const percentage = ((count / totalSurveys) * 100).toFixed(1)
    report += `- ${location}: ${count} (${percentage}%)\n`
  })
  report += "\n"

  report += `## Distribución por Seguro Médico\n\n`
  Object.entries(insuranceCounts).forEach(([insurance, count]) => {
    const percentage = ((count / totalSurveys) * 100).toFixed(1)
    report += `- ${insurance}: ${count} (${percentage}%)\n`
  })
  report += "\n"

  report += `## Conclusiones\n\n`
  report += `Este informe resume los datos de ${totalSurveys} encuestas. `

  // Add some basic insights
  const topSeverity = Object.entries(severityCounts).sort((a, b) => b[1] - a[1])[0]
  const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]

  report += `La mayoría de los pacientes reportan una severidad "${topSeverity[0]}" (${topSeverity[1]} pacientes) `
  report += `y provienen principalmente de "${topLocation[0]}" (${topLocation[1]} pacientes).`

  return report
}
