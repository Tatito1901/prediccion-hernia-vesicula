"use client"

import { useState, useEffect } from "react"

export function useIsMobile() {
  // Inicializar con null para evitar hidratación incorrecta
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    // Función para verificar si es móvil
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Verificar inmediatamente
    checkIsMobile()

    // Configurar listener para cambios de tamaño
    window.addEventListener("resize", checkIsMobile)

    // Limpiar listener
    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  // Devolver false durante SSR para evitar parpadeos
  return isMobile === null ? false : isMobile
}
