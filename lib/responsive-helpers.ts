// Breakpoints estándar para nuestra aplicación
export const breakpoints = {
  xs: 480, // Móviles pequeños
  sm: 640, // Móviles grandes
  md: 768, // Tablets
  lg: 1024, // Laptops/Desktops pequeños
  xl: 1280, // Desktops
  "2xl": 1536, // Pantallas grandes
}

// Función para generar media queries
export const mediaQuery = {
  up: (breakpoint: keyof typeof breakpoints) => `@media (min-width: ${breakpoints[breakpoint]}px)`,
  down: (breakpoint: keyof typeof breakpoints) => `@media (max-width: ${breakpoints[breakpoint] - 0.1}px)`,
  between: (min: keyof typeof breakpoints, max: keyof typeof breakpoints) =>
    `@media (min-width: ${breakpoints[min]}px) and (max-width: ${breakpoints[max] - 0.1}px)`,
}

// Clases de Tailwind para contenedores responsivos
export const containerClasses = {
  default: "w-full px-4 mx-auto sm:px-6 md:px-8",
  narrow: "w-full max-w-5xl px-4 mx-auto sm:px-6 md:px-8",
  wide: "w-full max-w-7xl px-4 mx-auto sm:px-6 md:px-8",
}

// Clases de grid responsivas para diferentes layouts
export const gridLayouts = {
  // 1 columna en móvil, 2 en tablet, 3 en desktop
  standard: "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3",
  // 1 columna en móvil, 2 en tablet, 4 en desktop grande
  dashboard: "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4",
  // 1 columna en móvil, 3 en desktop
  wide: "grid grid-cols-1 gap-4 lg:grid-cols-3",
  // Sidebar + contenido principal
  withSidebar: "grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]",
}

// Función para generar clases responsivas para alturas
export const responsiveHeight = (defaultHeight: string, mdHeight?: string, lgHeight?: string) => {
  let classes = defaultHeight
  if (mdHeight) classes += ` md:${mdHeight}`
  if (lgHeight) classes += ` lg:${lgHeight}`
  return classes
}

// Función para generar clases responsivas para anchos
export const responsiveWidth = (defaultWidth: string, mdWidth?: string, lgWidth?: string) => {
  let classes = defaultWidth
  if (mdWidth) classes += ` md:${mdWidth}`
  if (lgWidth) classes += ` lg:${lgWidth}`
  return classes
}

// Función para generar clases responsivas para padding
export const responsivePadding = (defaultPadding: string, mdPadding?: string, lgPadding?: string) => {
  let classes = defaultPadding
  if (mdPadding) classes += ` md:${mdPadding}`
  if (lgPadding) classes += ` lg:${lgPadding}`
  return classes
}

// Función para generar clases responsivas para margin
export const responsiveMargin = (defaultMargin: string, mdMargin?: string, lgMargin?: string) => {
  let classes = defaultMargin
  if (mdMargin) classes += ` md:${mdMargin}`
  if (lgMargin) classes += ` lg:${lgMargin}`
  return classes
}

// Función para generar clases responsivas para gap
export const responsiveGap = (defaultGap: string, mdGap?: string, lgGap?: string) => {
  let classes = defaultGap
  if (mdGap) classes += ` md:${mdGap}`
  if (lgGap) classes += ` lg:${lgGap}`
  return classes
}

// Función para generar clases responsivas para font-size
export const responsiveFontSize = (defaultSize: string, mdSize?: string, lgSize?: string) => {
  let classes = defaultSize
  if (mdSize) classes += ` md:${mdSize}`
  if (lgSize) classes += ` lg:${lgSize}`
  return classes
}
