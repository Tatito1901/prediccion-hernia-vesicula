// Este archivo asegura que Recharts se configure correctamente
// y proporciona funciones de utilidad para las gráficas

// Función para verificar si estamos en el cliente
export const isClient = typeof window !== "undefined"

// Función para verificar si Recharts está disponible
export function isRechartsAvailable() {
  if (!isClient) return false

  try {
    // Intentar acceder a una propiedad de Recharts
    const recharts = require("recharts")
    return !!recharts.ResponsiveContainer
  } catch (error) {
    console.error("Error al verificar Recharts:", error)
    return false
  }
}

// Función para obtener colores de gráficas consistentes
export function getChartColors(theme: "light" | "dark" = "light") {
  return {
    primary: theme === "light" ? "#3b82f6" : "#60a5fa",
    secondary: theme === "light" ? "#10b981" : "#34d399",
    danger: theme === "light" ? "#ef4444" : "#f87171",
    warning: theme === "light" ? "#f59e0b" : "#fbbf24",
    info: theme === "light" ? "#6366f1" : "#818cf8",
    background: theme === "light" ? "#ffffff" : "#1f2937",
    text: theme === "light" ? "#1f2937" : "#f9fafb",
    grid: theme === "light" ? "#e5e7eb" : "#374151",
  }
}

// Función para crear datos de prueba
export function generateTestData(points = 5) {
  return Array.from({ length: points }, (_, i) => ({
    name: `Punto ${i + 1}`,
    value: Math.floor(Math.random() * 1000),
  }))
}
