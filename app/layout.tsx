import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "sonner"
import { AppProvider } from "@/lib/context/app-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Clínica de Hernias y Vesícula",
  description: "Sistema de gestión para clínica especializada en hernias y vesícula",
    generator: 'Dr. Fausto Mario Medina Molina'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
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