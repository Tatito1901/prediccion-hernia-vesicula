/**
 * Estilos responsivos y de contraste para usar globalmente en la aplicación
 * Este archivo provee una serie de utilidades para mantener consistencia en
 * responsividad y contrastes entre modos claro y oscuro.
 */

import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de manera eficiente usando clsx y twMerge
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Estilos para tarjetas con contraste mejorado para modos claro y oscuro
 */
export const cardStyles = {
  // Estilos base de tarjeta con buen contraste en ambos modos
  base: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm",
  
  // Variante con fondo más suave para secciones secundarias
  soft: "bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl",
  
  // Variante con gradiente para elementos destacados
  gradient: "bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/90 border border-slate-200 dark:border-slate-800 rounded-xl",
  
  // Cabeceras de tarjeta
  header: "border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900",
  
  // Cabeceras con enfasis (ej. secciones principales)
  headerEmphasis: "border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/90",
};

/**
 * Estilos para textos con buen contraste en ambos modos
 */
export const textStyles = {
  // Texto principal (títulos, información importante)
  primary: "text-slate-900 dark:text-slate-100",
  
  // Texto secundario (descripciones, información complementaria)
  secondary: "text-slate-700 dark:text-slate-300",
  
  // Texto terciario (información adicional, notas, etc)
  tertiary: "text-slate-500 dark:text-slate-400",
  
  // Texto sutil (timestamps, metadatos, etc)
  muted: "text-slate-400 dark:text-slate-500",
  
  // Texto para errores
  error: "text-red-600 dark:text-red-400",
  
  // Texto para información de éxito
  success: "text-emerald-600 dark:text-emerald-400",
  
  // Texto para advertencias
  warning: "text-amber-600 dark:text-amber-400",
  
  // Texto para información
  info: "text-blue-600 dark:text-blue-400",
};

/**
 * Estilos para elementos de entrada con buen contraste
 */
export const inputStyles = {
  // Estilo base de input
  base: "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500",
  
  // Input con foco
  focus: "focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-700 focus:border-slate-400 dark:focus:border-slate-700",
  
  // Input deshabilitado
  disabled: "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800",
};

/**
 * Estilos para bordes con buen contraste
 */
export const borderStyles = {
  // Borde sutil
  subtle: "border-slate-200 dark:border-slate-800",
  
  // Borde estándar
  standard: "border-slate-300 dark:border-slate-700",
  
  // Borde con énfasis
  emphasis: "border-slate-400 dark:border-slate-600",
};

/**
 * Utilidades responsivas basadas en el hook use-breakpoint
 * Estas funciones devuelven clases Tailwind específicas según el breakpoint
 */
export const responsiveStyles = {
  // Padding responsivo
  padding: {
    container: "p-4 sm:p-6 lg:p-8", 
    card: "p-4 sm:p-5 lg:p-6",
    section: "py-4 sm:py-6 lg:py-8",
  },
  
  // Tamaños de fuente responsivos
  fontSize: {
    title: "text-xl sm:text-2xl lg:text-3xl",
    subtitle: "text-lg sm:text-xl lg:text-2xl",
    body: "text-sm sm:text-base lg:text-base",
    small: "text-xs sm:text-sm",
  },
  
  // Layouts responsivos comunes
  layout: {
    // Grid que adapta número de columnas según tamaño de pantalla
    grid: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6",
    
    // Grid para paneles de dashboard
    dashboardGrid: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6",
    
    // Flex para ítems en línea que se adaptan en móvil
    flexRow: "flex flex-col sm:flex-row gap-4 sm:gap-6",
    
    // Ocultar/mostrar según tamaño
    hideOnMobile: "hidden sm:block",
    showOnlyOnMobile: "block sm:hidden",
    
    // Ancho máximo adaptativo
    container: "w-full max-w-full sm:max-w-screen-sm md:max-w-screen-md lg:max-w-screen-lg xl:max-w-screen-xl mx-auto",
  },
  
  // Espaciado responsivo
  spacing: {
    section: "mb-6 sm:mb-8 lg:mb-10",
    element: "mb-4 sm:mb-5 lg:mb-6",
    compact: "mb-2 sm:mb-3 lg:mb-4",
  }
};

/**
 * Estilos para fondos con buen contraste
 */
export const backgroundStyles = {
  // Fondo principal (páginas, contenedores principales)
  primary: "bg-slate-50 dark:bg-slate-950",
  
  // Fondo secundario (tarjetas, secciones)
  secondary: "bg-white dark:bg-slate-900",
  
  // Fondo terciario (elementos dentro de tarjetas)
  tertiary: "bg-slate-100 dark:bg-slate-800",
  
  // Fondo sutil para elementos pequeños
  subtle: "bg-slate-100/50 dark:bg-slate-800/50",
  
  // Gradientes
  gradientBlue: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/50 dark:to-slate-900",
  gradientCool: "bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900 dark:to-slate-800/80",
};

/**
 * Estilos para sombras con buen contraste en ambos modos
 */
export const shadowStyles = {
  // Sombra sutil
  sm: "shadow-sm dark:shadow-slate-900/30",
  
  // Sombra estándar
  md: "shadow-md dark:shadow-slate-900/40",
  
  // Sombra pronunciada
  lg: "shadow-lg dark:shadow-slate-900/50",
  
  // Sombra interna (efecto pressed)
  inner: "shadow-inner dark:shadow-slate-900/30",
};

/**
 * Función para generar clases condicionales basadas en breakpoints
 * @param isMobile Indica si estamos en breakpoint móvil
 * @param isTablet Indica si estamos en breakpoint tablet
 * @param baseClasses Clases que se aplican siempre
 * @param mobileClasses Clases específicas para móvil
 * @param tabletClasses Clases específicas para tablet
 * @param desktopClasses Clases específicas para desktop
 */
export function responsiveClasses({
  isMobile,
  isTablet,
  baseClasses = "",
  mobileClasses = "",
  tabletClasses = "",
  desktopClasses = "",
}: {
  isMobile: boolean;
  isTablet: boolean;
  baseClasses?: string;
  mobileClasses?: string;
  tabletClasses?: string;
  desktopClasses?: string;
}): string {
  let classes = baseClasses;
  
  if (isMobile) {
    classes = `${classes} ${mobileClasses}`;
  } else if (isTablet) {
    classes = `${classes} ${tabletClasses}`;
  } else {
    classes = `${classes} ${desktopClasses}`;
  }
  
  return classes.trim();
}
