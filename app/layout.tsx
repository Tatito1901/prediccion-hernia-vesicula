import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import Script from 'next/script';
import { ThemeScriptInit } from '@/components/theme/theme-script';
import { Toaster } from "@/components/ui/sonner";
import { AppErrorBoundary } from "@/components/errors/error-boundary";

// Optimización de Google Fonts usando next/font para auto-hosting
const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter', // Permite usar como variable CSS
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif']
});

export const metadata: Metadata = {
  title: {
    template: '%s | Clínica de Hernias y Vesícula',
    default: 'Clínica de Hernias y Vesícula - Sistema de Gestión Médica'
  },
  description: "Sistema de gestión para clínica especializada en hernias y vesícula",
  generator: 'Dr. Fausto Mario Medina Molina',
  applicationName: 'Sistema Clínico',
  keywords: ['clínica', 'hernias', 'vesícula', 'gestión médica', 'salud'],
  authors: [{ name: 'Dr. Fausto Mario Medina Molina' }],
  creator: 'Dr. Fausto Mario Medina Molina',
  publisher: 'Clínica de Hernias y Vesícula',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Clínica de Hernias y Vesícula',
    description: 'Sistema de gestión para clínica especializada en hernias y vesícula',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    siteName: 'Clínica de Hernias y Vesícula',
    locale: 'es_ES',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clínica de Hernias y Vesícula',
    description: 'Sistema de gestión para clínica especializada en hernias y vesícula',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="es" 
      suppressHydrationWarning
      className={`${inter.variable} font-sans`}
    >
      <head>
        {/* Script para prevenir flash de tema (FOUT) */}
        <ThemeScriptInit />
        
        {/* Metadatos esenciales */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="theme-color" content="#3b82f6" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#2563eb" media="(prefers-color-scheme: dark)" />
        
        {/* PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Clínica Médica" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        
        {/* Prefetch de rutas protegidas deshabilitado para evitar redirecciones/errores antes de login */}
        
        {/* Preconnect para recursos externos */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Favicon e íconos */}
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} antialiased bg-background text-foreground min-h-screen`}>
        <Providers>
          <AppErrorBoundary boundaryName="RootBoundary">
            {children}
          </AppErrorBoundary>
          <Toaster />
        </Providers>
        
        {/* Scripts de terceros (solo en producción) */}
        {process.env.NODE_ENV === 'production' && (
          <>
            <Script
              src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', 'G-XXXXXXXXXX');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}