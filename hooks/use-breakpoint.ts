"use client"

import { useState, useEffect, useMemo } from "react"

export type Breakpoint = "mobile" | "tablet" | "desktop" | "largeDesktop"

// Definimos los breakpoints siguiendo las convenciones de Tailwind
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
export const breakpointValues = {
  mobile: 639,    // hasta sm-1
  tablet: 1023,   // desde sm hasta lg-1
  desktop: 1535,  // desde lg hasta 2xl-1
  largeDesktop: 1536 // desde 2xl en adelante
}

// Queries de media específicas para cada breakpoint
export const breakpointQueries = {
  mobile: `(max-width: ${breakpointValues.mobile}px)`,
  tablet: `(min-width: ${breakpointValues.mobile + 1}px) and (max-width: ${breakpointValues.tablet}px)`,
  desktop: `(min-width: ${breakpointValues.tablet + 1}px) and (max-width: ${breakpointValues.desktop}px)`,
  largeDesktop: `(min-width: ${breakpointValues.largeDesktop}px)`,
  // Orientación
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
  // Específicos de interacción
  touchDevice: '(hover: none) and (pointer: coarse)',
  mouseDevice: '(hover: hover) and (pointer: fine)'
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    // Evitar errores en SSR
    if (typeof window === 'undefined') return

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

export function useBreakpoint() {
  const isMobile = useMediaQuery(breakpointQueries.mobile)
  const isTablet = useMediaQuery(breakpointQueries.tablet)
  const isDesktop = useMediaQuery(breakpointQueries.desktop)
  const isLargeDesktop = useMediaQuery(breakpointQueries.largeDesktop)
  const isPortrait = useMediaQuery(breakpointQueries.portrait)
  const isLandscape = useMediaQuery(breakpointQueries.landscape)
  const isTouchDevice = useMediaQuery(breakpointQueries.touchDevice)
  const isMouseDevice = useMediaQuery(breakpointQueries.mouseDevice)

  // Determinar el breakpoint actual
  const currentBreakpoint = useMemo<Breakpoint>(() => {
    if (isMobile) return "mobile"
    if (isTablet) return "tablet" 
    if (isDesktop) return "desktop"
    return "largeDesktop"
  }, [isMobile, isTablet, isDesktop, isLargeDesktop])

  return {
    // Breakpoints específicos
    isMobile,
    isTablet,
    isDesktop, 
    isLargeDesktop,
    // Orientación
    isPortrait,
    isLandscape,
    // Tipo de interacción
    isTouchDevice,
    isMouseDevice,
    // Ayudantes
    currentBreakpoint,
    // Para compatibilidad con código existente
    isMediumScreen: isTablet || isDesktop || isLargeDesktop,
    isLargeScreen: isDesktop || isLargeDesktop
  }
}

// Hooks específicos para compatibilidad con código existente
export function useIsMobile() {
  return useMediaQuery(breakpointQueries.mobile)
}

export function useIsTablet() {
  return useMediaQuery(breakpointQueries.tablet)
}

export function useIsDesktop() {
  return useMediaQuery(breakpointQueries.desktop)
}

export function useIsTouchDevice() {
  return useMediaQuery(breakpointQueries.touchDevice)
}
