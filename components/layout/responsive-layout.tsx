"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { useMediaQuery } from "@/src/hooks/use-media-query"
import { cn } from "@/src/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { Transition } from "@headlessui/react"

interface ResponsiveLayoutProps {
  children: ReactNode
  sidebar?: ReactNode
  header?: ReactNode
  footer?: ReactNode
  sidebarWidth?: string
  className?: string
  contentClassName?: string
  sidebarClassName?: string
  headerClassName?: string
  footerClassName?: string
  showMobileSidebarButton?: boolean
}

export function ResponsiveLayout({
  children,
  sidebar,
  header,
  footer,
  sidebarWidth = "280px",
  className,
  contentClassName,
  sidebarClassName,
  headerClassName,
  footerClassName,
  showMobileSidebarButton = true,
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 1024px)")
  const pathname = usePathname()

  // Cerrar sidebar automáticamente en móvil cuando cambia la ruta
  useEffect(() => {
    if (!isDesktop) {
      setSidebarOpen(false)
    }
  }, [pathname, isDesktop])

  // Exponer el estado y la función de toggle para que puedan ser usados por componentes hijos
  useEffect(() => {
    window.toggleSidebar = () => setSidebarOpen((prev) => !prev)
    window.closeSidebar = () => setSidebarOpen(false)

    return () => {
      delete window.toggleSidebar
      delete window.closeSidebar
    }
  }, [])

  // Manejar el toggle del sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev)
  }, [])

  // Manejar el cierre del sidebar
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  // Prevenir scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (sidebarOpen && !isDesktop) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }

    return () => {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen, isDesktop])

  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {header && (
        <header className={cn("sticky top-0 z-40 w-full border-b bg-background", headerClassName)}>
          <div className="flex h-16 items-center px-4 md:px-6">
            {showMobileSidebarButton && sidebar && !isDesktop && (
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 lg:hidden"
                onClick={toggleSidebar}
                aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
            {header}
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {sidebar && (
          <>
            {/* Sidebar para escritorio */}
            <aside
              className={cn(
                "hidden lg:flex lg:flex-col border-r bg-background transition-all duration-300",
                sidebarClassName,
              )}
              style={{ width: isDesktop ? sidebarWidth : "0" }}
            >
              {sidebar}
            </aside>

            {/* Sidebar para móvil con animación */}
            <Transition
              show={sidebarOpen}
              enter="transition-opacity duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="transition-opacity duration-300"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
              className="lg:hidden fixed inset-0 z-50"
            >
              <div className="absolute inset-0 bg-black/50" onClick={closeSidebar} />

              <Transition.Child
                enter="transition-transform duration-300 ease-out"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition-transform duration-300 ease-in"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
                className={cn(
                  "absolute inset-y-0 left-0 flex w-3/4 max-w-xs flex-col border-r bg-background",
                  sidebarClassName,
                )}
              >
                {sidebar}
              </Transition.Child>
            </Transition>
          </>
        )}

        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300",
            contentClassName,
            sidebarOpen && !isDesktop ? "blur-sm" : "",
          )}
        >
          {children}
        </main>
      </div>

      {footer && <footer className={cn("border-t bg-background", footerClassName)}>{footer}</footer>}
    </div>
  )
}
