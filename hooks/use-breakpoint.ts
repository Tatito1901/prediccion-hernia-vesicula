"use client";

import { useSyncExternalStore, useState, useEffect, useMemo } from "react";

/* ---------- Tipos ---------- */
export type Breakpoint = "mobile" | "tablet" | "desktop" | "largeDesktop";

type QueryKey =
  | Breakpoint
  | "portrait"
  | "landscape"
  | "touch"
  | "mouse"
  | "dark"
  | "reducedMotion";

/* ---------- Media-queries centralizadas ---------- */
const queries: Record<QueryKey, string> = {
  // Breakpoints basados en Tailwind CSS
  mobile: "(max-width: 639px)",
  tablet: "(min-width: 640px) and (max-width: 1023px)",
  desktop: "(min-width: 1024px) and (max-width: 1535px)",
  largeDesktop: "(min-width: 1536px)",

  // Orientación
  portrait: "(orientation: portrait)",
  landscape: "(orientation: landscape)",

  // Tipo de dispositivo
  touch: "(hover: none) and (pointer: coarse)",
  mouse: "(hover: hover) and (pointer: fine)",

  // Preferencias del usuario
  dark: "(prefers-color-scheme: dark)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
};

/* ---------- Estado y listeners centralizados ---------- */
type BreakpointState = Record<QueryKey, boolean>;

// Función optimizada para calcular el estado
const computeState = (): BreakpointState => {
  if (typeof window === "undefined") {
    return Object.fromEntries(
      Object.keys(queries).map(key => [key, false])
    ) as BreakpointState;
  }

  return Object.fromEntries(
    Object.entries(queries).map(([key, query]) => [
      key,
      window.matchMedia(query).matches
    ])
  ) as BreakpointState;
};

// Estado reactivo centralizado
let state: BreakpointState = computeState();
const listeners = new Set<() => void>();

// Snapshot de servidor en caché para evitar nuevas referencias por llamada
const serverSnapshot: BreakpointState = (() => {
  const snap = Object.fromEntries(
    Object.keys(queries).map(key => [key, false])
  ) as BreakpointState;
  return snap;
})();

// Registro de listeners solo en el cliente
if (typeof window !== "undefined") {
  // Usamos un solo listener para todas las queries
  const handleChange = () => {
    const newState = computeState();
    let hasChanged = false;
    
    // Solo notificamos si realmente hubo cambios
    for (const key in newState) {
      if (newState[key as QueryKey] !== state[key as QueryKey]) {
        hasChanged = true;
        break;
      }
    }
    
    if (hasChanged) {
      state = newState;
      listeners.forEach(cb => cb());
    }
  };

  // Registrar un listener para cada media query
  Object.values(queries).forEach(queryString => {
    const mql = window.matchMedia(queryString);
    
    // Usar addEventListener moderno con fallback
    if (mql.addEventListener) {
      mql.addEventListener("change", handleChange);
    } else {
      mql.addListener(handleChange);
    }
  });
}

/* ---------- Funciones para useSyncExternalStore ---------- */
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

const getSnapshot = () => state;
// Importante: devolver SIEMPRE la misma referencia en SSR para evitar bucles
const getServerSnapshot = (): BreakpointState => serverSnapshot;

// Helper de solo pruebas para verificar estabilidad del snapshot en SSR
// No usar en código de producción. Exportado únicamente para tests unitarios.
export const __getServerSnapshotForTest = (): BreakpointState => getServerSnapshot();

/* ---------- Hooks públicos ---------- */

/**
 * Hook principal que rastrea todas las media queries predefinidas
 * @returns Objeto con todos los estados de las media queries
 */
export function useBreakpointStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Devuelve el breakpoint principal actual
 */
export function useCurrentBreakpoint(): Breakpoint {
  const s = useBreakpointStore();
  
  // Prioridad lógica: mobile > tablet > desktop > largeDesktop
  if (s.mobile) return "mobile";
  if (s.tablet) return "tablet";
  if (s.desktop) return "desktop";
  return "largeDesktop";
}

/**
 * Hook para cualquier media query personalizada
 * @param query Cadena de media query
 * @returns Estado booleano de la query
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Sincronización inicial
    setMatches(mediaQueryList.matches);

    // Registro de listener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      mediaQueryList.addListener(listener);
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  return matches;
}

/* ---------- Hooks selectores individuales ---------- */
export const useIsMobile = () => useBreakpointStore().mobile;
export const useIsTablet = () => useBreakpointStore().tablet;
export const useIsDesktop = () => useBreakpointStore().desktop;
export const useIsLargeDesktop = () => useBreakpointStore().largeDesktop;

export const useIsPortrait = () => useBreakpointStore().portrait;
export const useIsLandscape = () => useBreakpointStore().landscape;

export const useIsTouchDevice = () => useBreakpointStore().touch;
export const useIsMouseDevice = () => useBreakpointStore().mouse;

export const usePrefersDark = () => useBreakpointStore().dark;
export const usePrefersReducedMotion = () => useBreakpointStore().reducedMotion;

/* ---------- Hooks compuestos optimizados ---------- */
/**
 * Determina si es una pantalla de tamaño medio o mayor
 */
export const useIsMediumScreen = () => {
  const { tablet, desktop, largeDesktop } = useBreakpointStore();
  return tablet || desktop || largeDesktop;
};

/**
 * Determina si es una pantalla grande
 */
export const useIsLargeScreen = () => {
  const { desktop, largeDesktop } = useBreakpointStore();
  return desktop || largeDesktop;
};

/**
 * Determina si es un dispositivo móvil o táctil
 */
export const useIsMobileOrTouch = () => {
  const { mobile, touch } = useBreakpointStore();
  return mobile || touch;
};

/**
 * Determina si es un dispositivo de escritorio con mouse
 */
export const useIsDesktopWithMouse = () => {
  const { desktop, largeDesktop, mouse } = useBreakpointStore();
  return (desktop || largeDesktop) && mouse;
};

/* ---------- Hook de breakpoint con valor específico ---------- */
/**
 * Hook para verificar un breakpoint específico
 * @param breakpoint Breakpoint a verificar
 * @returns Booleano indicando si el breakpoint actual coincide
 */
export const useBreakpoint = (breakpoint: Breakpoint) => {
  const currentBreakpoint = useCurrentBreakpoint();
  return useMemo(() => currentBreakpoint === breakpoint, [currentBreakpoint, breakpoint]);
};

/* ---------- Hook para rango de breakpoints ---------- */
/**
 * Hook para verificar si el breakpoint actual está dentro de un rango
 * @param minBreakpoint Breakpoint mínimo (inclusive)
 * @param maxBreakpoint Breakpoint máximo (inclusive)
 * @returns Booleano indicando si está en el rango
 */
export const useBreakpointRange = (
  minBreakpoint: Breakpoint,
  maxBreakpoint: Breakpoint
) => {
  const breakpoints: Breakpoint[] = ["mobile", "tablet", "desktop", "largeDesktop"];
  const currentIndex = useCurrentBreakpoint();
  
  const minIndex = breakpoints.indexOf(minBreakpoint);
  const maxIndex = breakpoints.indexOf(maxBreakpoint);
  const currentIndexValue = breakpoints.indexOf(currentIndex);
  
  return useMemo(() => 
    currentIndexValue >= minIndex && currentIndexValue <= maxIndex,
    [currentIndexValue, minIndex, maxIndex]
  );
};