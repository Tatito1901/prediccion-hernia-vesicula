// app/survey/layout.tsx
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/components/theme/theme-provider"

export const metadata = {
  title: "Encuesta Pre-Consulta | Clínica de Hernia y Vesícula",
  description:
    "Complete esta encuesta para ayudarnos a brindarle la mejor atención posible.",
}

export default function SurveyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <div
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
        )}
      >
      {children}
      </div>
    </ThemeProvider>
  )
}
