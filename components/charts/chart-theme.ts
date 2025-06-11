/* -------------------------------------------------------------------------- */
/*  components/chart-theme.tsx                                                */
/*  🎨 Sistema de temas mejorado para charts con mejor performance y UX       */
/* -------------------------------------------------------------------------- */

import type { CSSProperties } from 'react';

/** Mapea un nombre de CSS-var a su string HSL con cache para performance */
const varCache = new Map<string, string>();
// No hay cambios necesarios aquí, es eficiente.
const cssVar = (name: string): string => {
  if (varCache.has(name)) return varCache.get(name)!;
  // Pequeña optimización: construir el string una sola vez.
  const value = `hsl(var(${name}))`;
  varCache.set(name, value);
  return value;
};

/* ----------------------------------------------------------------------------
 * 1. VARIABLES BASE EXPANDIDAS
 * -------------------------------------------------------------------------- */
// Sin cambios, es una estructura de datos constante.
const vars = {
  primary: [
    '--primary-50','--primary-100','--primary-200','--primary-300','--primary-400',
    '--primary-500','--primary-600','--primary-700','--primary-800','--primary-900','--primary-950',
  ] as const,
  secondary: [
    '--secondary','--secondary-foreground',
    '--muted','--muted-foreground',
    '--accent','--accent-foreground',
  ] as const,
  neutral: [
    '--background','--card','--muted','--border',
    '--muted-foreground','--foreground','--card-foreground',
  ] as const,
  clinical: {
    healthy:     '--chart-green',
    attention:   '--chart-yellow',
    critical:    '--chart-red',
    stable:      '--chart-blue',
    improving:   '--chart-2',
    chronic:     '--chart-purple',
    emergency:   '--chart-orange',
    routine:     '--chart-teal',
  } as const,
  accent: {
    teal:      '--chart-2',
    lavender:  '--chart-5',
    mint:      '--chart-6',
    coral:     '--chart-4',
    navy:      '--chart-1',
    sunset:    '--chart-orange',
    ocean:     '--chart-cyan',
    forest:    '--chart-green-dark',
  } as const,
  semantic: {
    success:   '--chart-green',
    warning:   '--chart-yellow',
    error:     '--chart-red',
    info:      '--chart-blue',
    primary:   '--chart-1',
    secondary: '--chart-2',
  } as const,
} as const;

/* ----------------------------------------------------------------------------
 * 2. GENERADORES DE PALETA OPTIMIZADOS
 * -------------------------------------------------------------------------- */
const paletteCache = new Map<string, readonly string[] | Record<string, string>>(); // Tipo de valor de caché más preciso

// createPalette es eficiente. El uso de `as any` es para sortear la complejidad del tipado con `readonly [K in keyof T]: string`.
// Podríamos intentar un tipado más estricto, pero no afectaría el rendimiento.
const createPalette = <T extends readonly string[]>(
  list: T,
  cacheKey?: string
): Readonly<{ [K in keyof T]: string }> => { // Más preciso el Readonly en el tipo de retorno
  const key = cacheKey || list.join(','); // list.join es eficiente para arrays de strings pequeños.
  if (paletteCache.has(key)) {
    return paletteCache.get(key) as Readonly<{ [K in keyof T]: string }>;
  }

  // La transformación es directa.
  const result = list.map(cssVar) as unknown as Readonly<{ [K in keyof T]: string }>;
  paletteCache.set(key, result);
  return result;
};

const createRecordPalette = <T extends Record<string, string>>(
  rec: T,
  cacheKey?: string
): Readonly<{ [K in keyof T]: string }> => {
  const key = cacheKey || Object.values(rec).join(','); // Object.values().join() es razonable.
  if (paletteCache.has(key)) {
    return paletteCache.get(key) as Readonly<{ [K in keyof T]: string }>;
  }

  // Usar Object.entries para evitar múltiples búsquedas de `k in rec` si fuera una preocupación (no lo es aquí).
  // Pero la forma actual es clara y el motor JS es bueno optimizando bucles for...in en objetos.
  const out: Partial<Record<keyof T, string>> = {};
  for (const k in rec) {
    // hasOwnProperty check es buena práctica si el objeto pudiera tener propiedades heredadas,
    // pero para objetos literales como `vars.clinical`, no es estrictamente necesario para el rendimiento.
    if (Object.prototype.hasOwnProperty.call(rec, k)) {
      out[k] = cssVar(rec[k]);
    }
  }
  const result = out as Readonly<{ [K in keyof T]: string }>;
  paletteCache.set(key, result);
  return result;
};

/* ----------------------------------------------------------------------------
 * 3. PALETAS GENERALES MEJORADAS
 * -------------------------------------------------------------------------- */
// Sin cambios, es una estructura de datos constante.
export const PALETTE = {
  primary:   createPalette(vars.primary, 'primary'),
  secondary: createPalette(vars.secondary, 'secondary'),
  neutral:   createPalette(vars.neutral, 'neutral'),
  clinical:  createRecordPalette(vars.clinical, 'clinical'),
  accent:    createRecordPalette(vars.accent, 'accent'),
  semantic:  createRecordPalette(vars.semantic, 'semantic'),
} as const;

export type PaletteKey = keyof typeof PALETTE;

/* ----------------------------------------------------------------------------
 * 4. PALETAS ESPECIALIZADAS POR CONTEXTO MÉDICO
 * -------------------------------------------------------------------------- */
// Sin cambios, es una estructura de datos constante.
export const CHART_PALETTES = {
  medical:      ['--chart-1','--chart-2','--chart-green','--chart-purple','--chart-3','--chart-6','--chart-blue','--chart-4','--chart-5','--chart-yellow'] as const,
  diagnosis:    ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-4','--chart-3','--chart-red','--chart-5'] as const,
  patients:     ['--chart-blue','--chart-1','--chart-green','--chart-2','--chart-6','--chart-5','--chart-yellow','--chart-3','--chart-4','--chart-purple'] as const,
  trends:       ['--chart-1','--chart-4','--chart-purple','--chart-green','--chart-yellow','--chart-6','--chart-blue','--chart-3','--chart-2','--chart-5'] as const,
  comparison:   ['--chart-1','--chart-2','--chart-6','--chart-yellow','--chart-blue','--chart-purple','--chart-3','--chart-green'] as const,
  appointments: ['--chart-blue','--chart-green','--chart-yellow','--chart-red','--chart-purple','--chart-gray'] as const,
  surgery:      ['--chart-1','--chart-green','--chart-orange','--chart-purple','--chart-blue'] as const,
  emergency:    ['--chart-red','--chart-orange','--chart-yellow','--chart-blue','--chart-purple'] as const,
  recovery:     ['--chart-green','--chart-2','--chart-blue','--chart-teal','--chart-mint'] as const,
} as const;

export type ChartPaletteKey = keyof typeof CHART_PALETTES;
export type ChartColorSet = readonly string[]; // Ya es readonly

const chartPaletteCache = new Map<string, ChartColorSet>();

export function getChartColors(
  palette: ChartPaletteKey = 'medical',
  count = 10,
  startIndex = 0
): ChartColorSet {
  const cacheKey = `${palette}-${count}-${startIndex}`;
  if (chartPaletteCache.has(cacheKey)) {
    return chartPaletteCache.get(cacheKey)!;
  }

  // `CHART_PALETTES[palette]` ya es un array (o tupla). No es necesario `Array.from`.
  const basePalette = CHART_PALETTES[palette];
  const paletteLength = basePalette.length;

  // Asegurar que startIndex sea válido para evitar errores con slice.
  const actualStartIndex = startIndex % paletteLength;

  let selectedVars: readonly string[];

  if (count <= paletteLength) {
    // Si no necesitamos más colores que los disponibles y la rotación es simple
    if (actualStartIndex + count <= paletteLength) {
      selectedVars = basePalette.slice(actualStartIndex, actualStartIndex + count);
    } else {
      // Rotación necesaria
      selectedVars = [
        ...basePalette.slice(actualStartIndex),
        ...basePalette.slice(0, (actualStartIndex + count) % paletteLength),
      ];
    }
  } else {
    // Necesitamos más colores que los disponibles, repetimos con rotación.
    const tempSelected: string[] = [];
    for (let i = 0; i < count; i++) {
      tempSelected.push(basePalette[(actualStartIndex + i) % paletteLength]);
    }
    selectedVars = tempSelected;
  }

  const result = selectedVars.map(cssVar) as ChartColorSet; // `map` devuelve `string[]`, castear a `readonly string[]`
  chartPaletteCache.set(cacheKey, result);
  return result;
}

/* ----------------------------------------------------------------------------
 * 5. HELPERS SEMÁNTICOS MEJORADOS
 * -------------------------------------------------------------------------- */
// STATUS_COLORS ya usa createRecordPalette, que está cacheado.
export const STATUS_COLORS = createRecordPalette({
  COMPLETADA:   '--chart-green',
  CANCELADA:    '--chart-red',
  PROGRAMADA:   '--chart-yellow',
  PRESENTE:     '--chart-blue',
  REAGENDADA:   '--chart-purple',
  "NO ASISTIO": '--chart-gray',
  CONFIRMADA:   '--chart-teal',
  alta:         '--chart-green',
  internado:    '--chart-blue',
  critico:      '--chart-red',
  estable:      '--chart-teal',
  mejorando:    '--chart-2',
  programado:   '--chart-blue',
  en_proceso:   '--chart-yellow',
  completado:   '--chart-green',
  cancelado:    '--chart-red',
  diferido:     '--chart-purple',
}, 'status-colors');

// getStatusColor es una búsqueda directa en un objeto, muy rápido.
// El fallback a cssVar('--chart-gray') solo ocurre si el status no existe.
export const getStatusColor = (status: keyof typeof STATUS_COLORS): string =>
  STATUS_COLORS[status] || cssVar('--chart-gray'); // Considerar un default pre-cacheado si es común.

// Cache para getSequentialScale
const sequentialScaleCache = new Map<string, readonly string[]>();

export function getSequentialScale(
  baseColorVarName: string = '--chart-1', // Renombrado para claridad que es el nombre de la var
  steps = 6,
  direction: 'lighter' | 'darker' | 'both' = 'lighter'
): readonly string[] { // Retorno Readonly
  const cacheKey = `sequential-${baseColorVarName}-${steps}-${direction}`;
  if (sequentialScaleCache.has(cacheKey)) {
    return sequentialScaleCache.get(cacheKey)!;
  }

  const baseHslColor = cssVar(baseColorVarName); // Obtener el HSL una vez
  const variations: string[] = []; // Usar string[] para push

  // La lógica de opacidad es simple, no hay mucha optimización posible aquí
  // más que asegurar que Math.max/min se usen correctamente.
  for (let i = 0; i < steps; i++) {
    let opacity: number;
    if (direction === 'lighter') {
      opacity = 1 - (i / (steps -1)) * 0.85; // Escala de 1 a ~0.15
    } else if (direction === 'darker') {
      // Para 'darker', la opacidad no es la forma usual de oscurecer HSL.
      // Normalmente se ajustaría la Luminosidad (L de HSL).
      // Manteniendo la lógica de opacidad por consistencia con el original:
      opacity = 1; // O quizás una ligera variación si se desea, pero oscurecer por opacidad no es estándar.
                   // Si la intención es oscurecer, se debería modificar el HSL, no la opacidad.
                   // Por ahora, lo dejo como 1 para 'darker' si se usa opacidad.
                   // Si la intención era, por ejemplo, para un gradiente donde colores más oscuros tienen MENOS opacidad:
                   // opacity = 0.2 + (i / (steps -1)) * 0.8; // Escala de 0.2 a 1
    } else { // 'both'
      const midPoint = (steps - 1) / 2;
      // Ejemplo: más opaco en el centro, menos en los extremos
      opacity = 1 - (Math.abs(i - midPoint) / midPoint) * 0.8;
    }
    variations.push(`${baseHslColor}/${Math.max(0.1, Math.min(1, opacity))}`);
  }
  
  // Guardar como readonly string[]
  const result = variations as readonly string[];
  sequentialScaleCache.set(cacheKey, result);
  return result;
}

/* ----------------------------------------------------------------------------
 * 6. ESTILOS GLOBALES MEJORADOS CON ANIMACIONES
 * -------------------------------------------------------------------------- */
// CHART_STYLES es una estructura de datos constante, ya optimizada para lectura.
// El uso de `cssVar` dentro asegura que los valores HSL se cachean.
export const CHART_STYLES = {
  tooltip: {
    background: cssVar('--chart-tooltip-bg'),
    borderRadius: 12, // px no necesario para React styles numéricos
    boxShadow: '0 8px 32px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.08)',
    padding: '12px 16px', // Mantener como string si se prefiere
    fontSize: 13,
    fontWeight: 500, // fontWeight puede ser string o number
    color: cssVar('--chart-tooltip-text'),
    backdropFilter: 'blur(8px)',
    border: `1px solid ${cssVar('--border')}`,
    transition: 'all 0.2s ease-in-out', // CSSProperties acepta esto
  } as const satisfies CSSProperties, // `as const` para inmutabilidad profunda, `satisfies` para chequeo de tipo
  
  legend: {
    fontSize: 13,
    fontWeight: 500,
    color: cssVar('--muted-foreground'),
    iconSize: 12,
    padding: 8,
    lineHeight: 1.6,
  } as const satisfies CSSProperties,
  
  colors: {
    primary: cssVar('--primary'),
    secondary: cssVar('--secondary'),
    neutral: cssVar('--muted'),
    neutralText: cssVar('--muted-foreground'),
    accent: cssVar('--accent'),
    success: cssVar('--chart-green'),
    warning: cssVar('--chart-yellow'),
    error: cssVar('--chart-red'),
  } as const,
  
  axis: {
    tickColor: cssVar('--chart-grid'),
    lineColor: cssVar('--chart-grid'),
    labelColor: cssVar('--muted-foreground'),
    labelFontSize: 12,
    labelFontWeight: 500, // O '500'
  } as const,
  
  grid: {
    strokeDasharray: '2 4',
    stroke: cssVar('--chart-grid'),
    strokeOpacity: 0.6,
    vertical: false,
  } as const,
  
  animation: {
    duration: 1000,
    easing: 'easeOutCubic', // String para CSS easing
    delay: 0,
    stagger: 100,
  } as const,
  
  interactions: {
    hover: {
      scale: 1.05, // Transform scale
      transition: 'all 0.2s ease-out',
      shadowElevation: '0 8px 25px rgba(0,0,0,0.15)', // Esto sería para `boxShadow`
    },
    active: {
      scale: 0.98,
      transition: 'all 0.1s ease-in',
    },
    focus: { // Esto se aplicaría a través de :focus-visible pseudo-clase o JS
      outline: `2px solid ${cssVar('--primary')}`,
      outlineOffset: 2,
    },
  } as const,
  
  area: {
    fillOpacity: 0.7,
    strokeWidth: 2.5,
    activeDotSize: 8,
    dotSize: 5,
    gradient: true, // Booleano para indicar si se debe aplicar un gradiente
  } as const,
  
  bar: {
    radius: 6, // Para borderRadius
    barGap: 6, // Estos son más para configuración de la librería de gráficos
    barCategoryGap: 20,
    minHeight: 4,
    hoverOpacity: 0.8,
  } as const,
  
  line: {
    strokeWidth: 3,
    activeDotSize: 8,
    dotSize: 5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const,
  
  pie: {
    innerRadius: 0.55, // Como proporción del radio exterior, o en px si la librería lo soporta
    outerRadius: 0.90, // Como proporción
    paddingAngle: 3, // En grados
    labelOffset: 15, // En px
    cornerRadius: 6, // En px
    strokeWidth: 2,
    hoverOffset: 8, // En px
  } as const,
  
  radar: {
    fillOpacity: 0.4,
    strokeWidth: 2.5,
    dotSize: 6,
  } as const,
  
  scatter: {
    dotSize: { min: 4, max: 20 },
    opacity: 0.8,
    strokeWidth: 1,
  } as const,
} as const;

/* ----------------------------------------------------------------------------
 * 7. UTILIDADES PARA TEMAS Y ACCESIBILIDAD
 * -------------------------------------------------------------------------- */

// `isDarkTheme` es una lectura del DOM. Si se llama muy a menudo en un ciclo de renderizado caliente,
// podría ser un cuello de botella menor. Para temas, usualmente es aceptable.
// Si se usa en un componente React, pasar el tema como prop o desde contexto es mejor.
let currentIsDark: boolean | undefined = undefined;
let lastChecked = 0;
const CHECK_INTERVAL = 1000; // Re-chequear el DOM cada segundo como máximo si se llama repetidamente

export const isDarkTheme = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR guard

  const now = Date.now();
  if (currentIsDark === undefined || now - lastChecked > CHECK_INTERVAL) {
    currentIsDark = document.documentElement.classList.contains('dark');
    lastChecked = now;
  }
  return currentIsDark;
};


// `getContrastColor` y `getAdaptiveBackground` usan `color-mix` y `rgba`, que son eficientes.
// Su rendimiento depende de `isDarkTheme`.
// Cachear estas también podría ser una opción si los baseColor/opacity son limitados y se repiten.
const contrastColorCache = new Map<string, string>();
export const getContrastColor = (baseColorHslVar: string): string => {
  const isDark = isDarkTheme(); // Llama a la versión optimizada de isDarkTheme
  const cacheKey = `${baseColorHslVar}-${isDark}`;
  if (contrastColorCache.has(cacheKey)) return contrastColorCache.get(cacheKey)!;

  // `baseColorHslVar` ya es `hsl(var(...))`
  const result = isDark
    ? `color-mix(in srgb, ${baseColorHslVar} 80%, white)` // Usar srgb que es más común para color-mix
    : `color-mix(in srgb, ${baseColorHslVar} 80%, black)`;
  contrastColorCache.set(cacheKey, result);
  return result;
};

const adaptiveBgCache = new Map<string, string>();
export const getAdaptiveBackground = (opacity = 0.9): string => {
  const isDark = isDarkTheme();
  const cacheKey = `${opacity}-${isDark}`;
  if (adaptiveBgCache.has(cacheKey)) return adaptiveBgCache.get(cacheKey)!;

  // Usar directamente los valores HSL de las variables de Tailwind si están disponibles
  // o los valores RGB si los conoces.
  // Ejemplo con valores de Tailwind Slate (aproximados):
  const result = isDark
    ? `hsla(var(--slate-900-hsl, 222.2 84% 4.9%) / ${opacity})` // Fallback si --slate-900-hsl no está
    : `hsla(var(--slate-50-hsl, 210 40% 98%) / ${opacity})`;   // Fallback si --slate-50-hsl no está
  adaptiveBgCache.set(cacheKey, result);
  return result;
};

/* ----------------------------------------------------------------------------
 * 8. PRESETS PARA CASOS COMUNES
 * -------------------------------------------------------------------------- */
// CHART_PRESETS es una estructura constante. Las funciones dentro (getChartColors) ya están cacheadas.
export const CHART_PRESETS = {
  medical: {
    colors: getChartColors('medical', 8),
    styles: {
      ...CHART_STYLES,
      animation: { ...CHART_STYLES.animation, duration: 800 },
    },
  },
  dashboard: {
    colors: getChartColors('patients', 6),
    styles: {
      ...CHART_STYLES,
      pie: { ...CHART_STYLES.pie, innerRadius: 0.45 }, // Usar proporción si es posible
    },
  },
  comparison: {
    colors: getChartColors('comparison', 4),
    styles: {
      ...CHART_STYLES,
      bar: { ...CHART_STYLES.bar, radius: 8 },
    },
  },
} as const;

export type ChartPresetKey = keyof typeof CHART_PRESETS; // Renombrado de ChartPreset a ChartPresetKey

// getChartPreset es una búsqueda directa, muy rápida.
export const getChartPreset = (preset: ChartPresetKey) => CHART_PRESETS[preset];

// El export default está bien.
export default {
  PALETTE,
  CHART_PALETTES,
  STATUS_COLORS,
  CHART_STYLES,
  CHART_PRESETS,
  getChartColors,
  getStatusColor,
  getSequentialScale,
  getContrastColor,
  getAdaptiveBackground,
  isDarkTheme,
};