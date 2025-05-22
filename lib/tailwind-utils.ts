/**
 * Utilidades de Tailwind para responsividad
 * Este archivo proporciona clases compuestas de Tailwind para facilitar
 * la implementación de interfaces responsivas consistentes.
 */

/**
 * Clases de contenedor responsivo que se adaptan a diferentes tamaños de pantalla
 */
export const containerClasses = {
  // Contenedor responsivo estándar con padding adaptativo
  responsive: "w-full px-2 sm:px-4 md:px-6 lg:px-8 mx-auto",
  // Contenedor con ancho máximo para evitar estiramiento excesivo en pantallas grandes
  constrained: "w-full max-w-7xl px-2 sm:px-4 md:px-6 lg:px-8 mx-auto",
  // Contenedor para formularios con ancho limitado
  form: "w-full max-w-2xl px-2 sm:px-4 md:px-6 mx-auto",
  // Contenedor para tarjetas en cuadrícula
  cards: "grid gap-2 sm:gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  // Contenedor para secciones de página
  section: "py-2 sm:py-3 md:py-4 lg:py-6",
};

/**
 * Clases de tipografía responsiva que escalan según el tamaño de pantalla
 */
export const typographyClasses = {
  // Títulos principales
  h1: "text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold",
  h2: "text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold",
  h3: "text-base sm:text-lg md:text-xl font-semibold",
  h4: "text-sm sm:text-base md:text-lg font-medium",
  // Párrafos
  p: "text-sm sm:text-base",
  small: "text-xs sm:text-sm",
  // Otros estilos tipográficos
  label: "text-xs sm:text-sm font-medium",
  button: "text-xs sm:text-sm font-medium",
};

/**
 * Clases de espaciado responsivo
 */
export const spacingClasses = {
  // Espaciados verticales
  sectionGap: "space-y-4 sm:space-y-6 md:space-y-8",
  itemGap: "space-y-2 sm:space-y-3 md:space-y-4",
  // Espaciados horizontales
  flexGap: "gap-2 sm:gap-3 md:gap-4",
  // Padding adaptativo
  cardPadding: "p-2 sm:p-3 md:p-4 lg:p-6",
  buttonPadding: "px-3 py-1.5 sm:px-4 sm:py-2",
};

/**
 * Clases para formularios responsivos
 */
export const formClasses = {
  // Grid para formularios
  grid: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
  // Campo que ocupa una columna
  field: "col-span-1",
  // Campo que ocupa ambas columnas
  fieldFull: "col-span-1 sm:col-span-2",
  // Grupo de botones
  buttons: "flex flex-wrap justify-end gap-2 mt-4",
};

/**
 * Clases para componentes interactivos en dispositivos táctiles
 */
export const touchClasses = {
  // Área de toque ampliada para dispositivos móviles
  touchArea: "p-2 sm:p-1", 
  // Botones más grandes para dispositivos táctiles
  touchButton: "min-h-[44px] min-w-[44px]",
};

/**
 * Mixins de Tailwind para patrones comunes
 */
export const mixins = {
  // Crea una cuadrícula responsiva con N columnas según el breakpoint
  responsiveGrid: (mobileCols = 1, tabletCols = 2, desktopCols = 3, largeCols = 4) => 
    `grid gap-3 md:gap-4 lg:gap-6 grid-cols-${mobileCols} sm:grid-cols-${tabletCols} md:grid-cols-${desktopCols} lg:grid-cols-${largeCols}`,
  
  // Crea un patrón de tarjeta responsivo
  responsiveCard: `
    bg-card border rounded-lg shadow-sm 
    p-2 sm:p-3 md:p-4 lg:p-6
    hover:shadow-md transition-all duration-300
  `,
  
  // Utilidad para esconder elementos en diferentes breakpoints
  hideOn: {
    mobile: "hidden sm:block",
    tablet: "hidden md:block",
    desktop: "hidden lg:block",
    largeScreens: "hidden xl:block",
  },
  
  // Utilidad para mostrar elementos solo en ciertos breakpoints
  showOnlyOn: {
    mobile: "block sm:hidden",
    tablet: "hidden sm:block md:hidden",
    desktop: "hidden md:block lg:hidden",
    largeScreens: "hidden lg:block",
  },
};

/**
 * Funciones utilitarias para construir clases dinámicamente
 */
export const buildClasses = {
  // Construye una clase de grid basada en el breakpoint actual
  grid: (breakpoint: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop') => {
    const columns = {
      mobile: 1,
      tablet: 2,
      desktop: 3,
      largeDesktop: 4,
    };
    
    return `grid grid-cols-${columns[breakpoint]} gap-3 md:gap-4`;
  },
  
  // Ajusta el tamaño del padding según el breakpoint
  padding: (breakpoint: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop') => {
    const sizes = {
      mobile: 'p-2',
      tablet: 'p-3',
      desktop: 'p-4',
      largeDesktop: 'p-6',
    };
    
    return sizes[breakpoint];
  },
};
