import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
// Importamos el CSS global después del CSS crítico para no bloquear el renderizado
import "./globals.css"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "sonner"
import { AppProvider } from "@/lib/context/app-context"
import Script from 'next/script'

// Optimización de Google Fonts usando next/font para auto-hosting
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',  // Mejora el rendimiento visual inicial
  preload: true,    // Asegura que se precarguen los archivos de font
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
})

export const metadata: Metadata = {
  title: "Clínica de Hernias y Vesícula",
  description: "Sistema de gestión para clínica especializada en hernias y vesícula",
    generator: 'Dr. Fausto Mario Medina Molina'
}

// Función para enviar métricas de Web Vitals
export function reportWebVitals(metric: any) {
  // En un entorno de producción, podrías enviar esto a un sistema de analytics
  // Aquí lo mostramos en la consola para monitoreo y depuración
  console.log(metric);
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Ya no se requieren preconexiones para Google Fonts al usar next/font */}
        
        
        {/* Precarga de recursos críticos */}
        <link rel="preload" href="/globals.css" as="style" />
        
        {/* Precargar módulos JS críticos para la experiencia inicial */}
        <link rel="modulepreload" href="/_next/static/chunks/main-app.js" />
        <link rel="modulepreload" href="/_next/static/chunks/app/layout.js" />
        <link rel="modulepreload" href="/_next/static/chunks/app/page.js" />
        <link rel="modulepreload" href="/_next/static/chunks/app/dashboard/page.js" />
        
        {/* Precarga de rutas comunes */}
        <link rel="prefetch" href="/dashboard" />
        <link rel="prefetch" href="/estadisticas" />
        
        {/* Metadatos */}
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AppProvider>
            {children}
            <Toaster position="top-right" />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}