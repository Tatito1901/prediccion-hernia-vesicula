"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)

    // Establecer el valor inicial
    setMatches(mediaQuery.matches)

    // Definir callback para actualizar el estado
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Agregar listener
    mediaQuery.addEventListener("change", handleChange)

    // Limpiar listener
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [query])

  return matches
}
