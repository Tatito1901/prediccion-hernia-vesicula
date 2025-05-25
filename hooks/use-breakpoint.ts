"use client";

import { useSyncExternalStore, useState, useEffect } from "react";

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
// Estas queries definen los breakpoints y otras características del dispositivo/entorno.
// Están basadas en rangos comunes, similares a los de Tailwind CSS.
const queries: Record<QueryKey, string> = {
  /* Anchos ↔ Tailwind sm/md/lg/xl/2xl */
  mobile: "(max-width: 639px)", // Pantallas pequeñas, hasta el breakpoint 'sm' de Tailwind
  tablet: "(min-width: 640px) and (max-width: 1023px)", // Desde 'sm' hasta justo antes de 'lg'
  desktop: "(min-width: 1024px) and (max-width: 1535px)", // Desde 'lg' hasta justo antes de '2xl'
  largeDesktop: "(min-width: 1536px)", // Desde '2xl' en adelante

  /* Orientación */
  portrait: "(orientation: portrait)",
  landscape: "(orientation: landscape)",

  /* Tipo de puntero (ayuda a distinguir dispositivos táctiles de los que usan mouse) */
  touch: "(hover: none) and (pointer: coarse)", // Típico de pantallas táctiles
  mouse: "(hover: hover) and (pointer: fine)",   // Típico de dispositivos con mouse

  /* Preferencias de usuario */
  dark: "(prefers-color-scheme: dark)",
  reducedMotion: "(prefers-reduced-motion: reduce)",
};

/* ---------- Estado interno para useBreakpointStore ---------- */
type BreakpointState = Record<QueryKey, boolean>;

// Calcula el estado actual de todas las media-queries predefinidas.
const computeState = (): BreakpointState =>
  Object.fromEntries(
    Object.entries(queries).map(([key, query]) => [
      key,
      // Solo intentar usar window.matchMedia si estamos en el cliente.
      typeof window !== "undefined" ? window.matchMedia(query).matches : false,
    ]),
  ) as BreakpointState;

// 'state' es la fuente de verdad para useBreakpointStore, actualizada por los listeners.
let state: BreakpointState = computeState();
const listeners = new Set<() => void>();

/* ---------- Registro de listeners (solo en el cliente) para useBreakpointStore ---------- */
if (typeof window !== "undefined") {
  Object.values(queries).forEach((queryString) => {
    const mql = window.matchMedia(queryString);
    const handler = () => {
      // Cuando una media query cambia, se recalcula todo el objeto 'state'.
      // Esto es simple y efectivo ya que 'state' agrupa todos los flags.
      state = computeState();
      // Notificar a todos los suscriptores de useBreakpointStore.
      listeners.forEach((cb) => cb());
    };

    // Usar addEventListener si está disponible, con fallback a addListener para navegadores antiguos (Safari <= 13).
    if (mql.addEventListener) {
      mql.addEventListener("change", handler);
    } else {
      mql.addListener(handler);
    }
  });
}

/* ---------- Funciones para useSyncExternalStore (usado por useBreakpointStore) ---------- */
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb); // Función de limpieza para desuscribirse.
}
const getSnapshot = () => state; // Devuelve el estado actual en el cliente.

// Estado precalculado para el servidor. Es una referencia estable.
// En el servidor, todas las media queries se asumen como 'false' para consistencia en SSR.
const serverState: BreakpointState = Object.fromEntries(
  Object.keys(queries).map((k) => [k, false])
) as BreakpointState;

const getServerSnapshot = (): BreakpointState => serverState; // Devuelve el estado del servidor.

/* ---------- Hooks públicos ---------- */

/** * Hook principal que utiliza useSyncExternalStore para suscribirse a los cambios
 * del conjunto predefinido de media-queries.
 * Devuelve un objeto con todos los flags (mobile, tablet, dark, etc.).
 */
export function useBreakpointStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** * Devuelve el breakpoint principal actual ('mobile', 'tablet', 'desktop', 'largeDesktop') 
 * basado en el ancho de la pantalla.
 */
export function useCurrentBreakpoint(): Breakpoint {
  const s = useBreakpointStore();
  if (s.mobile) return "mobile";
  if (s.tablet) return "tablet";
  if (s.desktop) return "desktop";
  return "largeDesktop"; // Fallback si ninguno de los anteriores es true.
}

/* ---------- Hook genérico para cualquier media query (useMediaQuery) ---------- */
/**
 * Hook personalizado que rastrea el estado de una cadena de media query CSS arbitraria.
 * @param query La cadena de media query a observar (ej. "(min-width: 768px)").
 * @returns `true` si la media query coincide, `false` en caso contrario.
 * Este hook usa useState y useEffect, adecuado para queries dinámicas y específicas del componente.
 */
export function useMediaQuery(query: string): boolean {
  // Inicializa 'matches'. En el servidor, será 'false'.
  // En el cliente, se evalúa window.matchMedia(query).matches en la primera carga.
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    // El código dentro de useEffect solo se ejecuta en el cliente.
    const mediaQueryList = window.matchMedia(query);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Sincronizar el estado si cambió entre la inicialización de useState y la ejecución de useEffect.
    // Esto es una salvaguarda importante.
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }

    // Adjuntar el listener.
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', listener);
    } else {
      mediaQueryList.addListener(listener); // Fallback para Safari <= 13.
    }

    // Función de limpieza para remover el listener cuando el componente se desmonta o la query cambia.
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', listener);
      } else {
        mediaQueryList.removeListener(listener); // Fallback para Safari <= 13.
      }
    };
  }, [query]); // El efecto depende solo de la cadena 'query'.

  return matches;
}

/* ---------- Selectores individuales (retrocompatibilidad y conveniencia) ---------- */
// Estos hooks utilizan useBreakpointStore para acceder a flags específicos.
export const useIsMobile = () => useBreakpointStore().mobile;
export const useIsTablet = () => useBreakpointStore().tablet;
export const useIsDesktop = () => useBreakpointStore().desktop;
export const useIsLargeDesktop = () => useBreakpointStore().largeDesktop;

export const useIsPortrait = () => useBreakpointStore().portrait;
export const useIsLandscape = () => useBreakpointStore().landscape;

export const useIsTouchDevice = () => useBreakpointStore().touch;
export const useIsMouseDevice = () => useBreakpointStore().mouse;

/* ---------- Helpers compuestos (ejemplos de cómo combinar flags) ---------- */
export const useIsMediumScreen = () => {
  const s = useBreakpointStore();
  // Considera una pantalla "mediana" si es tablet, desktop o largeDesktop (es decir, no móvil).
  return s.tablet || s.desktop || s.largeDesktop; 
};
export const useIsLargeScreen = () => {
  const s = useBreakpointStore();
  // Considera una pantalla "grande" si es desktop o largeDesktop.
  return s.desktop || s.largeDesktop;
};
