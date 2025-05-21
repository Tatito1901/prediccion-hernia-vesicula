// Breakpoints estándar para nuestra aplicación
export const breakpoints = {
  sm: 640, // Móviles grandes
  md: 768, // Tablets
  lg: 1024, // Laptops/Desktops pequeños
  xl: 1280, // Desktops
  "2xl": 1536, // Pantallas grandes
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
  withSidebar: "grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]",
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
