"use client"
import type React from "react"
// No hay cambios significativos en las importaciones aquí, ya que el layout es principalmente estructural.
// Los hooks useIsMobile y useIsTablet se asume que están correctamente implementados en "@/hooks/use-breakpoint"
import { useIsMobile, useIsTablet, useMediaQuery } from "@/hooks/use-breakpoint" 
import { cn } from "@/lib/utils"

import { AppSidebar } from "@/components/navigation/app-sidebar"
import { SiteHeader } from "@/components/navigation/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

// Comentario: DashboardLayout.tsx
// Este componente maneja la estructura general de la página del dashboard.
// Las optimizaciones de rendimiento aquí se centrarían más en la eficiencia de los componentes hijos
// y en asegurar que los hooks de responsividad no causen re-renderizados innecesarios.

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Se asume que useIsMobile y useIsTablet son hooks optimizados que devuelven booleanos.
  // Estos hooks son útiles para lógica condicional en JS basada en breakpoints.
  const isMobile = useIsMobile()
  const isTablet = useIsTablet()
  
  // useMediaQuery es una forma más genérica de reaccionar a los cambios de media query.
  // Es bueno para determinar comportamientos como el del SidebarProvider.
  const isToggleableLayout = useMediaQuery("(max-width: 1279px)");
  
  return (
    // SidebarProvider gestiona el estado y comportamiento del sidebar.
    // El cambio de 'behavior' basado en isToggleableLayout es una buena práctica.
    <SidebarProvider sidebarBehavior={isToggleableLayout ? "offcanvas" : "permanent"}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          {/* El uso de @container/main habilita las container queries para los hijos,
              lo cual es excelente para componentes que necesitan adaptarse a su propio tamaño
              en lugar del viewport. */}
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-2 sm:py-3 md:gap-6 md:py-4 lg:py-6">
              <div className="px-2 sm:px-3 md:px-4 lg:px-6">
                <div className={cn(
                  "bg-card rounded-lg shadow-sm border",
                  // Padding escalonado es una buena práctica para la responsividad.
                  "p-2 sm:p-3 md:p-4 lg:p-6", 
                  "transition-all duration-300", // Transiciones suaves mejoran la UX.
                  // overflow-auto es útil en móviles/tablets si el contenido excede el tamaño.
                  (isMobile || isTablet) && "overflow-auto" 
                )}>
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
