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
        <div className="mx-auto w-full max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {children}
        </div>
      </div>
    </ThemeProvider>
  )
}
