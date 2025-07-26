import type React from "react";
import QueryProvider from '@/components/providers/query-provider';
import type { Metadata } from "next"
import { Inter } from "next/font/google"
// Importamos el CSS global después del CSS crítico para no bloquear el renderizado
import "./globals.css"
import { Providers } from "@/components/providers"
import Script from 'next/script'
import { ThemeScriptInit } from '@/components/theme/theme-script'

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

// Función para enviar métricas de Web Vitals (removida del export para compatibilidad con Next.js Layout)
// En un entorno de producción, podrías enviar esto a un sistema de analytics
// function reportWebVitals(metric: any) {
//   console.log(metric);
// }

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Script para prevenir flash de tema (FOUT) */}
        <ThemeScriptInit />
        
        {/* Ya no se requieren preconexiones para Google Fonts al usar next/font */}
        
        {/* Next.js maneja automáticamente la precarga de chunks JS críticos,
           no necesitamos precargarlos manualmente */}
        
        {/* Precarga de rutas comunes */}
        <link rel="prefetch" href="/dashboard" />
        <link rel="prefetch" href="/estadisticas" />
        
        {/* Metadatos */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#171717" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
      </head>
      <body className={inter.className}>
        <Providers>
          <QueryProvider>{children}</QueryProvider>
        </Providers>
      </body>
    </html>
  )
}