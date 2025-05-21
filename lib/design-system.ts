// Sistema de diseño unificado para la aplicación
// Contiene tokens, variables y utilidades para mantener consistencia

// Paleta de colores principal
export const colors = {
  // Colores primarios de la marca
  primary: {
    50: "hsl(var(--primary-50))",
    100: "hsl(var(--primary-100))",
    200: "hsl(var(--primary-200))",
    300: "hsl(var(--primary-300))",
    400: "hsl(var(--primary-400))",
    500: "hsl(var(--primary-500))", // Color principal
    600: "hsl(var(--primary-600))",
    700: "hsl(var(--primary-700))",
    800: "hsl(var(--primary-800))",
    900: "hsl(var(--primary-900))",
    950: "hsl(var(--primary-950))",
  },

  // Colores para estados y feedback
  success: {
    light: "hsl(var(--success-light))",
    DEFAULT: "hsl(var(--success))",
    dark: "hsl(var(--success-dark))",
  },
  warning: {
    light: "hsl(var(--warning-light))",
    DEFAULT: "hsl(var(--warning))",
    dark: "hsl(var(--warning-dark))",
  },
  error: {
    light: "hsl(var(--error-light))",
    DEFAULT: "hsl(var(--error))",
    dark: "hsl(var(--error-dark))",
  },
  info: {
    light: "hsl(var(--info-light))",
    DEFAULT: "hsl(var(--info))",
    dark: "hsl(var(--info-dark))",
  },

  // Colores para estados clínicos específicos
  clinical: {
    pending: "hsl(var(--clinical-pending))",
    active: "hsl(var(--clinical-active))",
    completed: "hsl(var(--clinical-completed))",
    cancelled: "hsl(var(--clinical-cancelled))",
    noShow: "hsl(var(--clinical-no-show))",
  },
}

// Espaciado consistente
export const spacing = {
  0: "0px",
  0.5: "0.125rem", // 2px
  1: "0.25rem", // 4px
  1.5: "0.375rem", // 6px
  2: "0.5rem", // 8px
  2.5: "0.625rem", // 10px
  3: "0.75rem", // 12px
  3.5: "0.875rem", // 14px
  4: "1rem", // 16px
  5: "1.25rem", // 20px
  6: "1.5rem", // 24px
  7: "1.75rem", // 28px
  8: "2rem", // 32px
  9: "2.25rem", // 36px
  10: "2.5rem", // 40px
  11: "2.75rem", // 44px
  12: "3rem", // 48px
  14: "3.5rem", // 56px
  16: "4rem", // 64px
  20: "5rem", // 80px
  24: "6rem", // 96px
  28: "7rem", // 112px
  32: "8rem", // 128px
  36: "9rem", // 144px
  40: "10rem", // 160px
  44: "11rem", // 176px
  48: "12rem", // 192px
  52: "13rem", // 208px
  56: "14rem", // 224px
  60: "15rem", // 240px
  64: "16rem", // 256px
  72: "18rem", // 288px
  80: "20rem", // 320px
  96: "24rem", // 384px
}

// Breakpoints para diseño responsivo
export const breakpoints = {
  xs: "320px", // Teléfonos pequeños
  sm: "640px", // Teléfonos grandes
  md: "768px", // Tablets
  lg: "1024px", // Laptops/Desktops pequeños
  xl: "1280px", // Desktops
  "2xl": "1536px", // Pantallas grandes
}

// Tipografía
export const typography = {
  fontFamily: {
    sans: 'var(--font-sans, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
    serif: 'var(--font-serif, ui-serif, Georgia, Cambria, "Times New Roman", Times, serif)',
    mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  },
  fontSizes: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "1.875rem", // 30px
    "4xl": "2.25rem", // 36px
    "5xl": "3rem", // 48px
    "6xl": "3.75rem", // 60px
    "7xl": "4.5rem", // 72px
    "8xl": "6rem", // 96px
    "9xl": "8rem", // 128px
  },
  fontWeights: {
    thin: "100",
    extralight: "200",
    light: "300",
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
    black: "900",
  },
  lineHeights: {
    none: "1",
    tight: "1.25",
    snug: "1.375",
    normal: "1.5",
    relaxed: "1.625",
    loose: "2",
  },
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0em",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
}

// Sombras
export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  none: "none",
  // Sombras elegantes adicionales
  elegant: "0 4px 14px 0 rgba(0, 0, 0, 0.08)",
  "elegant-hover": "0 6px 20px 0 rgba(0, 0, 0, 0.1)",
  "elegant-card": "0 10px 30px 0 rgba(0, 0, 0, 0.05)",
  "elegant-button": "0 2px 6px 0 rgba(0, 0, 0, 0.12)",
}

// Bordes
export const borders = {
  radius: {
    none: "0px",
    sm: "0.125rem", // 2px
    DEFAULT: "0.25rem", // 4px
    md: "0.375rem", // 6px
    lg: "0.5rem", // 8px
    xl: "0.75rem", // 12px
    "2xl": "1rem", // 16px
    "3xl": "1.5rem", // 24px
    full: "9999px",
  },
  width: {
    0: "0px",
    1: "1px",
    2: "2px",
    4: "4px",
    8: "8px",
  },
}

// Transiciones
export const transitions = {
  duration: {
    75: "75ms",
    100: "100ms",
    150: "150ms",
    200: "200ms",
    300: "300ms",
    500: "500ms",
    700: "700ms",
    1000: "1000ms",
  },
  timing: {
    DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
    linear: "linear",
    in: "cubic-bezier(0.4, 0, 1, 1)",
    out: "cubic-bezier(0, 0, 0.2, 1)",
    "in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
    // Curvas elegantes adicionales
    elegant: "cubic-bezier(0.25, 0.1, 0.25, 1)",
    bounce: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
}

// Utilidades para estados clínicos
export const getStatusColorClass = (status: string) => {
  switch (status) {
    case "presente":
    case "Presente":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-800/20 dark:text-emerald-400"
    case "cancelada":
    case "Cancelada":
    case "Cancelado":
      return "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400"
    case "completada":
    case "Completada":
    case "Completado":
    case "Operado":
      return "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400"
    case "pendiente":
    case "Pendiente":
    case "Pendiente de consulta":
      return "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400"
    case "Seguimiento":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-800/20 dark:text-indigo-400"
    case "No Operado":
      return "bg-slate-100 text-slate-800 dark:bg-slate-800/20 dark:text-slate-400"
    default:
      return ""
  }
}

// Utilidades para probabilidad de cirugía
export const getSurgeryProbabilityClass = (probability: number) => {
  if (probability >= 0.7) {
    return "bg-sky-100 text-sky-800 dark:bg-sky-800/20 dark:text-sky-400"
  } else if (probability >= 0.4) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-800/20 dark:text-amber-400"
  } else {
    return "bg-rose-100 text-rose-800 dark:bg-rose-800/20 dark:text-rose-400"
  }
}

// Utilidades para formateo de fechas
export const formatDate = (date: Date | string, format: "short" | "medium" | "long" = "medium", locale = "es-MX") => {
  if (!date) return ""

  const dateObj = typeof date === "string" ? new Date(date) : date

  if (!dateObj || isNaN(dateObj.getTime())) return ""

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
    case "medium":
      return dateObj.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })
    case "long":
      return dateObj.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    default:
      return dateObj.toLocaleDateString(locale)
  }
}

// Nuevas utilidades para estilos elegantes
export const getElevation = (level: "low" | "medium" | "high" | "floating") => {
  switch (level) {
    case "low":
      return "shadow-sm"
    case "medium":
      return "shadow-md"
    case "high":
      return "shadow-lg"
    case "floating":
      return "shadow-elegant-card"
    default:
      return "shadow-none"
  }
}
